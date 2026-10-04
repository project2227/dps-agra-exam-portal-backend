import api from './api'
import { EVENTS } from './socket'
import { PROCTOR_EVENTS } from '../config'
import { uid } from '../utils/format'

/* ---------------- device metadata ---------------- */
function detectBrowser(ua) {
  const tests = [
    ['Edge', /Edg\/([\d.]+)/], ['Opera', /OPR\/([\d.]+)/], ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Chrome', /Chrome\/([\d.]+)/], ['Firefox', /Firefox\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/],
  ]
  for (const [name, re] of tests) {
    const m = ua.match(re)
    if (m) return `${name} ${m[1].split('.')[0]}`
  }
  return 'Unknown browser'
}
function detectOS(ua) {
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11'
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS / iPadOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown OS'
}

export function getDeviceMetadata() {
  const ua = navigator.userAgent
  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.userAgentData?.platform || navigator.platform || '',
    cores: navigator.hardwareConcurrency || null,
    touch: 'ontouchstart' in window,
    userAgent: ua,
  }
}

/* ---------------- media permissions (always user-initiated) ---------------- */
export const mediaSupport = {
  webcam: !!navigator.mediaDevices?.getUserMedia,
  screen: !!navigator.mediaDevices?.getDisplayMedia,
  secure: window.isSecureContext,
}

export function requestWebcam() {
  return navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } },
    audio: false,
  })
}

export function requestScreen() {
  return navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'monitor', frameRate: { ideal: 10, max: 15 } },
    audio: false,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'include',
  })
}

export const isFullScreenShare = (stream) =>
  stream?.getVideoTracks()[0]?.getSettings?.().displaySurface ? stream.getVideoTracks()[0].getSettings().displaySurface === 'monitor' : true

export function stopStream(stream) {
  stream?.getTracks().forEach((t) => t.stop())
}

// Grabs small JPEG thumbnails from a live stream for the teacher grid.
export function createFrameGrabber(stream) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  video.play().catch(() => {})
  const canvas = document.createElement('canvas')
  return {
    grab(width = 240, quality = 0.55) {
      if (!video.videoWidth) return null
      canvas.width = width
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * width)
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', quality)
    },
    stop() { video.srcObject = null },
  }
}

/* ---------------- event reporter ----------------
 * Sends each proctoring event over the socket when connected (server stores it
 * and relays it to the teacher). Falls back to POST /api/proctor/event with a
 * retry queue when the socket is down.
 */
export function createProctorReporter({ examId, sessionId, socket }) {
  const queue = []
  let flushing = false

  async function flush() {
    if (flushing) return
    flushing = true
    while (queue.length) {
      try {
        await api.sendProctorEvent(queue[0])
        queue.shift()
      } catch (error) {
        // Revoked optional vision consent must not block the original integrity-event queue.
        if (queue[0]?.type?.startsWith('vision_') && (error.status === 403 || error.response?.status === 403)) { queue.shift(); continue }
        setTimeout(flush, 5000)
        break
      }
    }
    flushing = false
  }

  return {
    report(type, details = {}) {
      const evt = {
        id: uid('ev'),
        examId,
        sessionId,
        type,
        severity: PROCTOR_EVENTS[type]?.severity || 'low',
        details,
        ts: new Date().toISOString(),
      }
      const remoteType = {
        vision_head_turn:'VISION_HEAD_TURN', vision_gaze_away:'VISION_GAZE_AWAY', vision_face_missing:'VISION_FACE_MISSING', vision_multiple_faces:'VISION_MULTIPLE_FACES',
        tab_hidden:'TAB_SWITCH', window_blur:'WINDOW_BLUR', window_focus:'WINDOW_FOCUS',
        fullscreen_exit:'FULLSCREEN_EXIT', copy:'COPY', cut:'COPY', paste:'PASTE', right_click:'RIGHT_CLICK',
        devtools_suspected:'DEVTOOLS_SUSPECTED', devtools_shortcut:'DEVTOOLS_SUSPECTED',
        screen_share_stopped:'SCREEN_SHARE_STOPPED', webcam_stopped:'WEBCAM_STOPPED',
      }[type]
      if (socket?.connected && remoteType) socket.emit(EVENTS.PROCTOR_EVENT, { eventType: remoteType, metadata: { source:'browser' } })
      else if (remoteType) {
        queue.push(evt)
        flush()
      }
      return evt
    },
  }
}
