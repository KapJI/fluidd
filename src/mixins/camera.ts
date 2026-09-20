import Vue, { markRaw } from 'vue'
import { Component, Emit, Prop, Ref, Watch } from 'vue-property-decorator'
import { consola } from 'consola'
import type { CameraConnectionStatus, CameraNameMenuItem } from '@/types'

@Component
export default class CameraMixin extends Vue {
  @Prop({ type: Object, required: true })
  readonly camera!: Moonraker.Webcam.Entry

  @Prop({ type: String })
  readonly crossorigin?: 'anonymous' | 'use-credentials' | ''

  @Ref('streamingElement')
  readonly streamingElement!: HTMLImageElement | HTMLIFrameElement | HTMLVideoElement

  cameraTransformStyle = ''
  animating = false
  resizeObserver: ResizeObserver | null = null
  status: CameraConnectionStatus = 'disconnected'
  cameraName = ''
  cameraNameMenuItems: CameraNameMenuItem[] = []
  framesPerSecond = -1
  rawCameraUrl = ''

  @Watch('camera')
  onCamera () {
    this.stopPlayback()
    this.checkPlayback()
  }

  // Rotation and flip only change when the user changes a setting.
  @Watch('camera', { deep: true })
  onCameraTransform () {
    this.updateCameraTransformStyle()
  }

  get apiUrl (): string {
    return this.$typedState.config.apiUrl
  }

  get cameraStyle () {
    return {
      transform: this.cameraTransformStyle || undefined
    }
  }

  get autoRaiseFrameEvent () {
    return true
  }

  createTransform (): string {
    const element = this.streamingElement
    const { rotation, flip_horizontal, flip_vertical } = this.camera
    const transformsArray: string[] = []

    const { clientWidth, clientHeight } = element

    const scale = (
      rotation === 0 ||
      rotation === 180 ||
      clientHeight === 0 ||
      clientWidth === 0
    )
      ? 1
      : clientHeight < clientWidth
        ? clientHeight / clientWidth
        : clientWidth / clientHeight

    if (scale !== 1 || flip_horizontal) {
      transformsArray.push(`scaleX(${flip_horizontal ? -scale : scale})`)
    }

    if (scale !== 1 || flip_vertical) {
      transformsArray.push(`scaleY(${flip_vertical ? -scale : scale})`)
    }

    if (rotation !== 0) {
      transformsArray.push(`rotate(${rotation}deg`)
    }

    return transformsArray.join(' ')
  }

  updateCameraTransformStyle () {
    if (this.streamingElement) {
      this.cameraTransformStyle = this.createTransform()
    }
  }

  // Only the frame event needs a per-frame loop; the transform is watched.
  raiseFrameEvents () {
    requestAnimationFrame(() => {
      if (!this.animating) {
        return
      }

      if (this.streamingElement) {
        this.$emit('frame', this.streamingElement)
      }

      this.raiseFrameEvents()
    })
  }

  created () {
    if (this.autoRaiseFrameEvent) {
      this.animating = true
      this.raiseFrameEvents()
    }
  }

  mounted () {
    document.addEventListener('visibilitychange', this.checkPlayback, false)
    this.checkPlayback()

    // The scale depends on the element's own size, which the stream decides.
    if (typeof ResizeObserver !== 'undefined' && this.streamingElement) {
      this.resizeObserver = markRaw(new ResizeObserver(this.updateCameraTransformStyle))

      this.resizeObserver.observe(this.streamingElement)
    } else {
      this.updateCameraTransformStyle()
    }
  }

  beforeDestroy () {
    this.animating = false
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    document.removeEventListener('visibilitychange', this.checkPlayback)
    this.stopPlayback()
  }

  checkPlayback () {
    if (!document.hidden) {
      this.startPlayback()
    } else {
      this.stopPlayback()
    }
  }

  buildAbsoluteUrl (url: string) {
    const { origin } = new URL(document.URL)

    return new URL(url, origin)
  }

  @Emit('update:status')
  updateStatus (status: CameraConnectionStatus) {
    this.status = status
  }

  @Emit('update:camera-name')
  updateCameraName (cameraName: string) {
    this.cameraName = cameraName
  }

  @Emit('update:camera-name-menu-items')
  updateCameraNameMenuItems (cameraNameMenuItems: CameraNameMenuItem[]) {
    this.cameraNameMenuItems = cameraNameMenuItems
  }

  @Emit('update:frames-per-second')
  updateFramesPerSecond (framesPerSecond: number) {
    this.framesPerSecond = framesPerSecond
  }

  @Emit('update:raw-camera-url')
  updateRawCameraUrl (rawCameraUrl: string) {
    this.rawCameraUrl = rawCameraUrl
  }

  startPlayback () {
    // noop
  }

  stopPlayback () {
    // noop
  }

  menuItemClick (item: CameraNameMenuItem) {
    consola.debug('Menu item click', item)
  }
}
