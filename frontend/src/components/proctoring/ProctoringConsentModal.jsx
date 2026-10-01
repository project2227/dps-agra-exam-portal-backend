import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, Camera, CheckCircle2, Loader2, Maximize, MonitorUp, ShieldCheck } from 'lucide-react'
import Modal from '../common/Modal'
import VideoTile from './VideoTile'
import { isFullScreenShare, mediaSupport, requestScreen, requestWebcam, stopStream } from '../../services/proctoring'
import { cx } from '../../utils/format'

function permissionMessage(err, what) {
  if (err?.name === 'NotAllowedError') return `Permission for the ${what} was denied. Click "Allow" when the browser asks, or reset the site permission from the address bar and try again.`
  if (err?.name === 'NotFoundError') return `No ${what} was found on this computer. Ask the lab in-charge for help.`
  if (err?.name === 'NotReadableError') return `The ${what} is being used by another application. Close it and try again.`
  return err?.message || `Could not start the ${what}.`
}

function Step({ done, required, icon: Icon, title, children }) {
  return (
    <div className={cx('rounded-xl border p-4', done ? 'border-dps-green/40 bg-dps-green/[0.06]' : 'border-white/10 bg-white/[0.02]')}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={18} className={done ? 'text-dps-neon' : 'text-slate-300'} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="ml-auto">
          {done ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-dps-neon"><CheckCircle2 size={14} aria-hidden="true" /> Ready</span>
          ) : (
            <span className="text-xs text-slate-400">{required ? 'Required' : 'Not required'}</span>
          )}
        </span>
      </div>
      {children}
    </div>
  )
}

/**
 * Explains what will be shared and asks for each permission explicitly.
 * Nothing starts until the student clicks the buttons here.
 * onReady({ webcam, screen }) is called after fullscreen is entered.
 */
export default function ProctoringConsentModal({ open, exam, allowOptionalScreen = false, onReady, onDecline }) {
  const settings = exam?.settings || {}
  const needCam = !!settings.requireWebcam
  const needScreen = !!settings.requireScreen
  const canStartScreen = needScreen || allowOptionalScreen
  const [webcam, setWebcam] = useState(null)
  const [screen, setScreen] = useState(null)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState({})
  const handedOver = useRef(false)
  const streams = useRef({})
  streams.current = { webcam, screen }

  // Stop anything we started if the modal closes without starting the exam.
  useEffect(() => () => {
    if (!handedOver.current) {
      stopStream(streams.current.webcam)
      stopStream(streams.current.screen)
    }
  }, [])

  const startCam = async () => {
    setBusy('webcam'); setErrors((e) => ({ ...e, webcam: '' }))
    try {
      stopStream(webcam)
      setWebcam(await requestWebcam())
    } catch (err) {
      setErrors((e) => ({ ...e, webcam: permissionMessage(err, 'webcam') }))
    } finally { setBusy('') }
  }

  const startScreen = async () => {
    setBusy('screen'); setErrors((e) => ({ ...e, screen: '' }))
    try {
      const s = await requestScreen()
      if (!isFullScreenShare(s)) {
        stopStream(s)
        throw new Error('Please share your entire screen, not a single window or tab. Choose "Entire screen" in the browser dialog.')
      }
      stopStream(screen)
      s.getVideoTracks()[0].addEventListener('ended', () => setScreen(null))
      setScreen(s)
    } catch (err) {
      setErrors((e) => ({ ...e, screen: permissionMessage(err, 'screen share') }))
    } finally { setBusy('') }
  }

  // If a participant selected optional screen sharing on the join form,
  // capture must actually be granted before starting; don't claim it is live based on a checkbox.
  const ready = (!needCam || webcam) && (!canStartScreen || screen)

  const start = async () => {
    setBusy('start')
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
    } catch { /* the exam room will ask again */ }
    handedOver.current = true
    setBusy('')
    onReady?.({ webcam, screen })
  }

  const decline = () => {
    stopStream(webcam); stopStream(screen)
    onDecline?.()
  }

  return (
    <Modal open={open} title="Before you start: exam monitoring" size="lg" dismissible={false}>
      <p className="text-sm text-slate-300">
        This exam uses the webcam and screen permissions you agreed to when joining. Grant the browser permissions here once, before the exam starts. Your teacher may open these already-authorized feeds during the exam without additional prompts. Here is what will be shared
        with your teacher, <strong className="text-white">only while the exam is open</strong>. A monitoring indicator stays on screen the whole time.
      </p>

      {!mediaSupport.secure && (needCam || needScreen) && (
        <p className="mt-3 flex gap-2 rounded-xl border border-dps-orange/40 bg-dps-orange/10 p-3 text-sm text-orange-100" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          This page is not on HTTPS, so the browser will block the webcam and screen share. Open the portal using https:// and try again.
        </p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Step done={!!webcam} required={needCam} icon={Camera} title="Webcam">
          <p className="mb-3 text-xs text-slate-300">If you separately opted into screen incident recording when joining, switching tabs, leaving fullscreen or minimising starts a clip of your approved screen. Return to this exam in fullscreen with the window focused to stop recording. Only your exam teacher can review clips for 7 days. No audio or webcam is recorded.</p>
          <p className="text-xs text-slate-400">An authorized teacher may view your camera during this exam. If direct video fails, temporary compressed camera stills can be forwarded through the exam server. No audio is shared and the website does not record webcam frames.</p>
          {needCam && (
            <>
              {webcam && <VideoTile stream={webcam} label="Preview" icon={Camera} mirror className="mt-3 aspect-video" />}
              <button type="button" className={cx('btn btn-sm mt-3', webcam ? 'btn-ghost' : 'btn-primary')} onClick={startCam} disabled={!!busy || !mediaSupport.webcam}>
                {busy === 'webcam' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
                {webcam ? 'Restart webcam' : 'Allow webcam'}
              </button>
              {errors.webcam && <p className="error-text" role="alert">{errors.webcam}</p>}
            </>
          )}
        </Step>

        <Step done={!!screen} required={needScreen} icon={MonitorUp} title="Screen share">
          <p className="text-xs text-slate-400">An authorized teacher may view your entire screen and low-resolution temporary screen stills during this exam. This can show other open windows. Choose "Entire screen" in the browser prompt.</p>
          {canStartScreen && (
            <>
              {screen && <VideoTile stream={screen} label="Preview" icon={MonitorUp} contain className="mt-3 aspect-video" />}
              <button type="button" className={cx('btn btn-sm mt-3', screen ? 'btn-ghost' : 'btn-primary')} onClick={startScreen} disabled={!!busy || !mediaSupport.screen}>
                {busy === 'screen' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <MonitorUp size={14} aria-hidden="true" />}
                {screen ? 'Share again' : 'Share entire screen'}
              </button>
              {!mediaSupport.screen && <p className="error-text">This browser cannot share the screen. Use Chrome or Edge on a lab computer.</p>}
              {errors.screen && <p className="error-text" role="alert">{errors.screen}</p>}
            </>
          )}
        </Step>

        <Step done required icon={Activity} title="Activity monitoring">
          <p className="text-xs text-slate-400">
            Switching tabs, leaving the window, exiting fullscreen{settings.copyPasteRestriction ? ', copy and paste' : ''} and developer tools shortcuts are recorded with the time,
            and you will see a warning each time. Your browser, OS, screen size and time zone are also noted.
          </p>
        </Step>

        <Step done required icon={Maximize} title="Fullscreen">
          <p className="text-xs text-slate-400">The exam opens in fullscreen when you press Start. Leaving fullscreen is recorded. You can return to it at any time.</p>
        </Step>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-400">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-dps-neon" aria-hidden="true" />
        After you start, the teacher can view already-consented feeds without asking again; an on-screen indicator stays visible. Sharing stops when you submit or leave. Browser permissions must be granted separately, and you can stop a track using the browser's controls. A flag alone does not prove cheating.
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn btn-ghost" onClick={decline} disabled={busy === 'start'}>Go back</button>
        <button type="button" className="btn btn-primary" onClick={start} disabled={!ready || !!busy}>
          {busy === 'start' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
          Start exam with approved sharing
        </button>
      </div>
      {!ready && <p className="mt-2 text-right text-xs text-slate-500">Complete the required steps above to continue.</p>}
    </Modal>
  )
}
