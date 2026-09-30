import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Code2, Cpu, History, Loader2, MonitorUp, Send, ShieldAlert, X } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import VideoTile from './VideoTile'
import { flagTotal } from './StudentMonitorCard'
import { DEMO_MODE, FLAG_BUCKETS, LANGUAGES, PROCTOR_EVENTS } from '../../config'
import { cx, formatDateTime, formatTime, relativeTime } from '../../utils/format'

const PRESETS = [
  'Please keep your eyes on your own screen.',
  'Return to fullscreen and stay on the exam tab.',
  'Do not use other websites or apps during the exam.',
  'Your camera is not showing your face clearly. Please adjust it.',
]

function Section({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={cx('rounded-xl border border-white/10 bg-white/[0.02] p-4', className)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Icon size={15} className="text-dps-neon" aria-hidden="true" /> {title}</h3>
      {children}
    </section>
  )
}

/**
 * Slide-in panel with the full picture for one student.
 * Opens a live WebRTC stream for webcam + screen (when the exam uses them)
 * and closes it again when the panel closes.
 */
export default function StudentDetailPanel({ student: s, exam, rtc, snapshot = {}, onClose, onWarn, now }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const closeBtn = useRef(null)
  const sessionId = s?.sessionId
  const wantsMedia = !!(s?.webcam || s?.screen) && s?.status === 'active'
  const { watch, stop } = rtc || {}

  useEffect(() => { closeBtn.current?.focus() }, [sessionId])

  useEffect(() => {
    if (!sessionId || !wantsMedia || DEMO_MODE || !watch) return undefined
    watch(sessionId, [s.webcam && 'webcam', s.screen && 'screen'].filter(Boolean))
    return () => stop?.(sessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wantsMedia, watch, stop])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!s) return null
  const live = rtc?.streams?.[sessionId] || {}
  const rtcState = rtc?.states?.[sessionId]
  const flagsTimeline = (s.timeline || []).filter((e) => PROCTOR_EVENTS[e.type]?.severity && PROCTOR_EVENTS[e.type].severity !== 'info')
  const warnings = (s.timeline || []).filter((e) => e.type === 'teacher_warning')

  const send = async (text) => {
    const msg = (text ?? message).trim()
    if (!msg) return
    setSending(true)
    try {
      await onWarn?.(s, msg)
      setMessage('')
    } finally { setSending(false) }
  }

  const mediaPlaceholder = (enabled) => {
    if (!enabled) return 'Not required for this exam'
    if (s.status !== 'active') return 'Student is not active'
    if (DEMO_MODE) return 'Live video appears here when connected to the backend'
    return rtcState === 'failed' ? 'Could not connect. Check TURN server settings.' : 'Connecting to live stream'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Details for ${s.name}`}>
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="glass-strong animate-slide-in-right relative flex h-full w-full max-w-4xl flex-col rounded-none border-y-0 border-r-0">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">{s.name}</h2>
            <p className="text-sm text-slate-400">
              Roll {s.rollNumber} | Class {s.class}-{s.section} | Joined {formatTime(s.joinedAt)} | Saved {relativeTime(s.lastSavedAt, now)}
            </p>
          </div>
          <StatusBadge status={s.status} />
          <button ref={closeBtn} type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close details"><X size={16} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <VideoTile stream={live.webcam} snapshot={snapshot.webcam} label={live.webcam ? 'Live webcam' : 'Webcam'} icon={Camera} className="aspect-video" placeholder={mediaPlaceholder(s.webcam)} />
              {rtcState === 'connecting' && <p className="mt-1 flex items-center gap-1 text-xs text-sky-300"><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Connecting</p>}
            </div>
            <VideoTile stream={live.screen} snapshot={snapshot.screen} label={live.screen ? 'Live screen' : 'Screen'} icon={MonitorUp} contain className="aspect-video" placeholder={mediaPlaceholder(s.screen)} />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.entries(FLAG_BUCKETS).map(([k, b]) => {
              const n = s.flags?.[k] || 0
              return (
                <div key={k} className={cx('rounded-xl border p-3 text-center', n ? 'border-red-400/40 bg-red-500/10' : 'border-white/10 bg-white/[0.02]')}>
                  <p className={cx('font-display text-2xl font-semibold', n ? 'text-red-200' : 'text-slate-300')}>{n}</p>
                  <p className="text-[11px] leading-tight text-slate-400">{b.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Section icon={Code2} title={`Answer progress (Q${s.currentQuestion || 1})`} className="lg:col-span-3">
              <pre className="max-h-[320px] min-h-[160px] overflow-auto rounded-lg border border-white/[0.06] bg-navy-950 p-3 font-mono text-xs leading-relaxed text-slate-200">
                <span className="text-slate-400">Student answer text is private during the exam. Review submitted answers in the submissions area.</span>
              </pre>
              <p className="mt-2 text-xs text-slate-500">{s.answered || 0} of {s.totalQuestions || '?'} questions answered. Server shares progress, not raw answer contents.</p>
            </Section>

            <Section icon={Send} title="Send a warning" className="lg:col-span-2">
              <p className="mb-2 text-xs text-slate-400">The student sees this message on screen and it is added to their record.</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p} type="button" className="rounded-lg border border-white/10 px-2 py-1 text-left text-[11px] text-slate-300 hover:border-dps-gold/40 hover:text-white" onClick={() => setMessage(p)}>{p}</button>
                ))}
              </div>
              <label htmlFor="warn-msg" className="sr-only">Warning message</label>
              <textarea id="warn-msg" className="input min-h-[70px] text-sm" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message to the student" maxLength={240} />
              <button type="button" className="btn btn-accent btn-sm mt-2 w-full" onClick={() => send()} disabled={!message.trim() || sending || s.status !== 'active'}>
                {sending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ShieldAlert size={14} aria-hidden="true" />} Send warning
              </button>
              {warnings.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-xs">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-slate-300"><span className="text-slate-500">{formatTime(w.ts)}</span> {w.details?.message || 'Warning sent'}</li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Section icon={History} title={`Activity timeline (${flagTotal(s.flags)} flags)`} className="lg:col-span-3">
              {(s.timeline || []).length === 0 ? (
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              ) : (
                <ol className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  {s.timeline.map((e, i) => {
                    const meta = PROCTOR_EVENTS[e.type] || { label: e.type, severity: 'low' }
                    return (
                      <li key={`${e.ts}-${i}`} className="flex items-start gap-3 text-sm">
                        <time className="w-16 shrink-0 font-mono text-xs text-slate-500" dateTime={e.ts}>{formatTime(e.ts)}</time>
                        <span className="min-w-0 flex-1 text-slate-200">
                          {meta.label}
                          {e.details?.message && <span className="block text-xs text-slate-400">"{e.details.message}"</span>}
                        </span>
                        <StatusBadge status={meta.severity} />
                      </li>
                    )
                  })}
                </ol>
              )}
              <p className="mt-3 text-xs text-slate-500">{flagsTimeline.length} events need review. Flags are signals, not proof. Check them with the video before deciding.</p>
            </Section>

            <Section icon={Cpu} title="Device" className="lg:col-span-2">
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
                {[['Browser', s.device?.browser], ['OS', s.device?.os], ['Screen', s.device?.screen], ['Time zone', s.device?.timezone], ['Joined', formatDateTime(s.joinedAt)], ['Session', s.sessionId]].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="truncate text-slate-200" title={v}>{v || 'Unknown'}</dd>
                  </div>
                ))}
              </dl>
              {exam && <p className="mt-3 text-xs text-slate-500">One active session per student is enforced by the server. A second login attempt is blocked and flagged.</p>}
            </Section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
