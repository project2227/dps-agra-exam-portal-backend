import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Maximize, MonitorUp, Camera,
  PanelLeftClose, PanelLeftOpen, Send, ShieldX, WifiOff,
} from 'lucide-react'
import DPSLogoAnimated from '../components/common/DPSLogoAnimated'
import Modal from '../components/common/Modal'
import { Spinner } from '../components/common/Feedback'
import Footer from '../components/layout/Footer'
import QuestionCard from '../components/exam/QuestionCard'
import QuestionNav, { isAnswered } from '../components/exam/QuestionNav'
import Timer from '../components/exam/Timer'
import AutoSaveIndicator from '../components/exam/AutoSaveIndicator'
import AntiCheatWarningBanner from '../components/proctoring/AntiCheatWarningBanner'
import ProctoringConsentModal from '../components/proctoring/ProctoringConsentModal'
import MonitoringIndicator from '../components/proctoring/MonitoringIndicator'
import useAntiCheat from '../hooks/useAntiCheat'
import useExamTimer from '../hooks/useExamTimer'
import useAutoSave, { clearBackup, loadBackup } from '../hooks/useAutoSave'
import { useStudentRTC } from '../hooks/useWebRTC'
import api from '../services/api'
import { EVENTS, getSocket } from '../services/socket'
import { createProctorReporter, getDeviceMetadata, isFullScreenShare, requestScreen, requestWebcam, stopStream } from '../services/proctoring'
import { getStudentSession, setStudentSession } from '../services/session'
import { PROCTOR_EVENTS } from '../config'
import { cx, examStatus, formatDateTime, formatTime } from '../utils/format'

const FLAGGED = (type) => ['high', 'medium'].includes(PROCTOR_EVENTS[type]?.severity)

function previewOf(q, value) {
  if (value == null) return ''
  if (q.type === 'code') {
    const draft = value.drafts?.[value.language]
    if (Array.isArray(draft)) return draft.map((b) => `${b.label || b.kind} ${b.arg ?? ''}`.trim()).join('\n')
    if (draft && typeof draft === 'object') return [draft.html, draft.css, draft.js].filter(Boolean).join('\n')
    return draft || ''
  }
  if (q.type === 'mcq') return `Selected option: ${q.options.find((o) => o.id === value)?.text ?? value}`
  if (q.type === 'upload') return value?.fileName ? `Uploaded ${value.fileName}` : ''
  return String(value)
}

function CenterCard({ icon: Icon, tone = 'green', title, children, actions }) {
  const tones = { green: 'text-dps-neon border-dps-green/40 bg-dps-green/10', red: 'text-red-300 border-red-400/40 bg-red-500/10', gold: 'text-dps-gold border-dps-gold/40 bg-dps-gold/10' }
  return (
    <div className="flex min-h-screen flex-col">
      <main className="grid flex-1 place-items-center p-6">
        <div className="glass-strong w-full max-w-lg p-8 text-center animate-fade-up">
          <span className={cx('mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border', tones[tone])}><Icon size={26} aria-hidden="true" /></span>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="mt-2 text-slate-300">{children}</div>
          {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
        </div>
      </main>
      <Footer compact />
    </div>
  )
}

export default function ExamRoom() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const session = getStudentSession()
  const sessionId = session?.sessionId
  const backupKey = `dps-exam-backup:${examId}:${sessionId}`

  const [phase, setPhase] = useState('loading') // loading | waiting | consent | active | submitting | submitted | error
  const [error, setError] = useState(null)
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [serverOffset, setServerOffset] = useState(0)
  const [answers, setAnswers] = useState({})
  const [review, setReview] = useState({})
  const [current, setCurrent] = useState(0)
  const [navOpen, setNavOpen] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [warning, setWarning] = useState(null)
  const [flagCount, setFlagCount] = useState(0)
  const [fsLost, setFsLost] = useState(false)
  const [mediaLost, setMediaLost] = useState(null) // 'webcam' | 'screen' | null
  const [streams, setStreams] = useState({ webcam: null, screen: null })
  const [connected, setConnected] = useState(true)
  const [startedAt, setStartedAt] = useState(() => session?.startedAt?.[examId] || null)

  const streamsRef = useRef({})
  streamsRef.current = streams
  const socket = useMemo(() => (session?.token ? getSocket({ role: 'student', token: session.token }) : null), [session?.token])
  const reporter = useMemo(() => createProctorReporter({ examId, sessionId, socket }), [examId, sessionId, socket])
  const submittingRef = useRef(false)

  /* ---------- load exam ---------- */
  useEffect(() => {
    if (!session) { navigate('/student/join', { replace: true }); return }
    if (session.submittedExamIds?.includes(examId)) { setPhase('submitted'); return }
    let alive = true
    api.getExamQuestions(examId)
      .then((res) => {
        if (!alive) return
        const offset = res.serverTime ? new Date(res.serverTime).getTime() - Date.now() : 0
        setServerOffset(Math.abs(offset) > 2000 ? offset : 0)
        setExam(res.exam)
        setQuestions(res.questions || [])
        const backup = loadBackup(backupKey)
        const saved = res.savedAnswers
        setAnswers(backup?.answers || saved?.answers || saved || {})
        setReview(backup?.review || {})
        if (Number.isInteger(backup?.current)) setCurrent(Math.min(backup.current, (res.questions?.length || 1) - 1))
        const status = examStatus(res.exam, Date.now() + offset)
        if (status === 'upcoming') setPhase('waiting')
        else if (status === 'ended') { setError({ title: 'This exam has ended', message: `It closed at ${formatDateTime(res.exam.endsAt)}. Contact your teacher if you could not submit.` }); setPhase('error') }
        else setPhase('consent')
      })
      .catch((e) => {
        if (!alive) return
        setError({ title: e.status === 409 ? 'Exam open elsewhere' : 'Could not open the exam', message: e.message, retry: e.status !== 409 })
        setPhase('error')
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // Waiting room: re-check every 10 s until the exam opens.
  useEffect(() => {
    if (phase !== 'waiting' || !exam) return undefined
    const t = setInterval(() => { if (examStatus(exam, Date.now() + serverOffset) === 'live') setPhase('consent') }, 10_000)
    return () => clearInterval(t)
  }, [phase, exam, serverOffset])

  /* ---------- timing ---------- */
  const effectiveEnd = useMemo(() => {
    if (!exam) return null
    const end = new Date(exam.endsAt).getTime()
    const byDuration = startedAt && exam.durationMin ? new Date(startedAt).getTime() + exam.durationMin * 60_000 : Infinity
    return new Date(Math.min(end, byDuration)).toISOString()
  }, [exam, startedAt])

  /* ---------- autosave ---------- */
  const autosaveData = useMemo(() => ({ answers, review, current }), [answers, review, current])
  const { status: saveStatus, lastSavedAt, saveNow } = useAutoSave({
    data: autosaveData,
    enabled: phase === 'active',
    storageKey: backupKey,
    delay: 1500,
    save: (d) => api.saveAnswers(examId, { sessionId, answers: d.answers, review: d.review, currentQuestion: d.current + 1, clientTime: new Date().toISOString() }),
  })

  /* ---------- submit ---------- */
  const stopAllMedia = useCallback(() => {
    stopStream(streamsRef.current.webcam)
    stopStream(streamsRef.current.screen)
    setStreams({ webcam: null, screen: null })
  }, [])

  const submit = useCallback(async (reason = 'student') => {
    if (submittingRef.current) return
    submittingRef.current = true
    setConfirmOpen(false)
    setSubmitError('')
    setPhase('submitting')
    const payload = { sessionId, answers, review, reason, flagsCount: flagCount, clientTime: new Date().toISOString() }
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await api.submitExam(examId, payload)
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
    if (lastErr) {
      submittingRef.current = false
      setSubmitError(lastErr.message)
      setPhase('active')
      return
    }
    reporter.report('exam_submitted', { reason })
    stopAllMedia()
    clearBackup(backupKey)
    const s = getStudentSession()
    if (s) setStudentSession({ ...s, submittedExamIds: [...new Set([...(s.submittedExamIds || []), examId])] })
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    setPhase('submitted')
  }, [sessionId, answers, review, flagCount, examId, reporter, stopAllMedia, backupKey])

  const submitRef = useRef(submit)
  submitRef.current = submit

  const timer = useExamTimer(phase === 'active' ? effectiveEnd : null, {
    serverOffsetMs: serverOffset,
    onExpire: () => submitRef.current('time_up'),
  })

  /* ---------- anti-cheat ---------- */
  const onProctorEvent = useCallback((type, details) => {
    reporter.report(type, details)
    if (type === 'fullscreen_exit' && document.fullscreenEnabled) setFsLost(true)
    if (type === 'fullscreen_enter') setFsLost(false)
    if (FLAGGED(type)) setFlagCount((n) => n + 1)
    const warn = PROCTOR_EVENTS[type]?.warn
    if (warn) setWarning({ type, message: warn, ts: new Date().toISOString(), source: 'system' })
  }, [reporter])

  useAntiCheat({ active: phase === 'active', examId, settings: exam?.settings || {}, onEvent: onProctorEvent })

  /* ---------- live connection ---------- */
  useEffect(() => {
    if (!socket || !['consent', 'active'].includes(phase)) return undefined
    const join = () => {
      setConnected(true)
      socket.emit(EVENTS.STUDENT_JOIN_ROOM, { examId, sessionId, student: session.student, device: getDeviceMetadata() })
    }
    const onDisconnect = () => setConnected(false)
    const onWarning = (p) => {
      setWarning({ type: 'teacher_warning', message: p?.message || 'Please follow the exam rules.', ts: new Date().toISOString(), source: 'teacher' })
      reporter.report('teacher_warning', { message: p?.message })
    }
    const onConflict = (p) => {
      stopAllMedia()
      setError({ title: 'Exam opened on another device', message: p?.message || 'This exam session was opened in another browser or computer, so it has been locked here. Tell your teacher immediately.' })
      setPhase('error')
    }
    const onForce = (p) => { stopAllMedia(); setError({title:'Session closed by teacher',message:p?.reason || 'Contact your teacher to rejoin.'}); setPhase('error') }
    const onTime = (p) => p?.endsAt && setExam((e) => ({ ...e, endsAt: p.endsAt }))
    if (socket.connected) join()
    socket.on('connect', join)
    socket.on('disconnect', onDisconnect)
    socket.on(EVENTS.STUDENT_WARNING, onWarning)
    socket.on(EVENTS.SESSION_CONFLICT, onConflict)
    socket.on(EVENTS.EXAM_TIME_UPDATE, onTime)
    return () => {
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off(EVENTS.STUDENT_WARNING, onWarning)
      socket.off(EVENTS.SESSION_CONFLICT, onConflict)
      socket.off(EVENTS.EXAM_TIME_UPDATE, onTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, phase === 'active' || phase === 'consent', examId, sessionId])

  useStudentRTC(socket, streamsRef, phase === 'active')

  // A student may grant permissions before their Socket.IO connection is ready.
  // Resend media readiness after the session joins the room and on reconnect;
  // the browser prompts still happen ONLY when the student clicks Allow.
  useEffect(()=>{
    if(!socket||phase!=='active')return
    const publishReady=()=>{
      if(!socket.connected)return
      const live=streamsRef.current
      if(live.webcam?.getVideoTracks().some(t=>t.readyState==='live'))
        socket.emit('student:webcamStatus',{active:true})
      if(live.screen?.getVideoTracks().some(t=>t.readyState==='live'))
        socket.emit('student:screenStatus',{active:true})
    }
    socket.on('exam:joined',publishReady)
    socket.on('connect',publishReady)
    if(socket.connected)publishReady()
    return()=>{socket.off('exam:joined',publishReady);socket.off('connect',publishReady)}
  },[socket,phase,streams])

  // Heartbeat + progress
  const answeredCount = useMemo(() => questions.filter((q) => isAnswered(q, answers[q.id])).length, [questions, answers])
  useEffect(() => {
    if (phase !== 'active' || !socket) return undefined
    socket.emit(EVENTS.STUDENT_PROGRESS, { questionId: questions[current]?.id })
    return undefined
  }, [phase, socket, examId, sessionId, current, answeredCount, questions.length])

  useEffect(() => {
    if (phase !== 'active' || !socket) return undefined
    const t = setInterval(() => socket.emit(EVENTS.STUDENT_HEARTBEAT, { examId, sessionId, ts: new Date().toISOString(), visible: document.visibilityState === 'visible', fullscreen: !!document.fullscreenElement }), 15_000)
    return () => clearInterval(t)
  }, [phase, socket, examId, sessionId])

  // Live typing preview (throttled)
  const lastEmit = useRef(0)
  const emitTimer = useRef(null)
  useEffect(() => {
    if (phase !== 'active' || !socket || !questions[current]) return undefined
    const q = questions[current]
    const send = () => {
      lastEmit.current = Date.now()
      const value = answers[q.id]
      const ev = q.type === 'code' ? EVENTS.STUDENT_CODE_UPDATE : EVENTS.STUDENT_ANSWER_UPDATE
      socket.emit(ev, { examId, sessionId, questionId: q.id, questionNumber: current + 1, language: value?.language, ts: new Date().toISOString() })
    }
    const wait = Math.max(0, 800 - (Date.now() - lastEmit.current))
    clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(send, wait)
    return () => clearTimeout(emitTimer.current)
  }, [answers, current, phase, socket, questions, examId, sessionId])

  // No JPEG snapshots are transmitted. Consented media uses direct WebRTC only.

  // Detect webcam / screen share being stopped
  useEffect(() => {
    if (phase !== 'active') return undefined
    const offs = []
    ;[['webcam', 'webcam_stopped'], ['screen', 'screen_share_stopped']].forEach(([kind, type]) => {
      const track = streams[kind]?.getVideoTracks()[0]
      if (!track) return
      const onEnded = () => {
        if(socket?.connected)socket.emit(kind==='webcam'?'student:webcamStatus':'student:screenStatus',{active:false})
        onProctorEvent(type)
        setMediaLost(kind)
      }
      track.addEventListener('ended', onEnded)
      offs.push(() => track.removeEventListener('ended', onEnded))
    })
    return () => offs.forEach((f) => f())
  }, [phase, streams, onProctorEvent, socket])

  // Warn before closing the tab mid-exam
  useEffect(() => {
    if (phase !== 'active') return undefined
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [phase])

  // Release media on unmount
  useEffect(() => () => stopAllMedia(), [stopAllMedia])

  /* ---------- actions ---------- */
  const onConsentReady = ({ webcam, screen }) => {
    setStreams({ webcam, screen })
    const started = startedAt || new Date().toISOString()
    setStartedAt(started)
    const s = getStudentSession()
    if (s) setStudentSession({ ...s, startedAt: { ...(s.startedAt || {}), [examId]: started } })
    if (!document.fullscreenElement && document.fullscreenEnabled) setFsLost(true)
    if (webcam) socket?.emit('student:webcamStatus', { active:true })
    if (screen) socket?.emit('student:screenStatus', { active:true })
    reporter.report('exam_started', { webcam: !!webcam, screen: !!screen })
    setPhase('active')
  }

  const restoreMedia = async () => {
    try {
      if (mediaLost === 'webcam') {
        const s = await requestWebcam()
        setStreams((x) => ({ ...x, webcam: s }))
      } else if (mediaLost === 'screen') {
        const s = await requestScreen()
        if (!isFullScreenShare(s)) { stopStream(s); throw new Error('Share your entire screen, not a window or tab.') }
        setStreams((x) => ({ ...x, screen: s }))
      }
      setMediaLost(null)
    } catch (e) {
      setWarning({ type: 'media', message: e.message || 'Permission was not granted. Try again.', ts: new Date().toISOString(), source: 'system' })
    }
  }

  const setAnswer = (qid) => (value) => setAnswers((a) => ({ ...a, [qid]: value }))
  const dismissWarning = useCallback(() => setWarning(null), [])

  /* ---------- render ---------- */
  if (phase === 'loading') return <div className="grid min-h-screen place-items-center"><Spinner label="Opening exam room" /></div>

  if (phase === 'error') {
    return (
      <CenterCard icon={ShieldX} tone="red" title={error?.title || 'Something went wrong'}
        actions={<>
          {error?.retry && <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>}
          <Link to="/student/dashboard" className="btn btn-ghost">Go to dashboard</Link>
        </>}>
        <p>{error?.message}</p>
      </CenterCard>
    )
  }

  if (phase === 'waiting') {
    return (
      <CenterCard icon={Clock} tone="gold" title="The exam has not started yet" actions={<Link to="/student/dashboard" className="btn btn-ghost">Go to dashboard</Link>}>
        <p>{exam?.title} opens at <strong className="text-white">{formatTime(exam?.startsAt)}</strong>. This page will open it automatically. Keep it open.</p>
      </CenterCard>
    )
  }

  if (phase === 'submitted') {
    return (
      <CenterCard icon={CheckCircle2} title="Exam submitted" actions={<Link to="/student/dashboard" className="btn btn-primary">Go to dashboard</Link>}>
        <p>Your answers have been received. Webcam and screen sharing have stopped. You can now close this window or return to the dashboard.</p>
      </CenterCard>
    )
  }

  const q = questions[current]
  const unanswered = questions.length - answeredCount
  const reviewCount = Object.values(review).filter(Boolean).length
  const s = exam?.settings || {}

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-navy-950/40">
      {/* top bar */}
      <header className="z-30 flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-navy-950/85 px-3 py-2 backdrop-blur-xl sm:px-5">
        <DPSLogoAnimated size={40} small interactive={false} label="" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">{exam?.title}</h1>
          <p className="truncate text-xs text-slate-400">{session.student?.name} | Roll {session.student?.rollNumber} | Class {session.student?.class}-{session.student?.section}</p>
        </div>
        {!connected && <span className="chip border-dps-orange/40 text-orange-200"><WifiOff size={12} aria-hidden="true" /> Offline</span>}
        <span className="hidden md:inline-flex"><AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} /></span>
        {phase !== 'consent' && <Timer formatted={timer.formatted} isWarning={timer.isWarning} isCritical={timer.isCritical} />}
        <button type="button" className="btn btn-accent btn-sm" onClick={() => { saveNow(); setConfirmOpen(true) }} disabled={phase !== 'active'}>
          <Send size={14} aria-hidden="true" /> Submit exam
        </button>
      </header>

      <AntiCheatWarningBanner warning={warning} flagCount={flagCount} onDismiss={dismissWarning} />
      {submitError && (
        <div className="flex items-center gap-3 border-b border-red-400/40 bg-red-500/15 px-5 py-2 text-sm text-red-100" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> Submission failed: {submitError}. Your answers are safe on this computer.
          <button type="button" className="btn btn-danger btn-sm ml-auto" onClick={() => submit('student_retry')}>Retry submit</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* question nav */}
        <aside className={cx('shrink-0 overflow-y-auto border-r border-white/[0.06] bg-navy-950/50 p-4 transition-all', navOpen ? 'w-64' : 'w-0 overflow-hidden p-0')} aria-hidden={!navOpen}>
          {navOpen && (
            <>
              <QuestionNav questions={questions} answers={answers} review={review} current={current} onJump={setCurrent} />
              <div className="mt-6 space-y-2 rounded-xl border border-white/10 p-3 text-xs text-slate-400">
                <p className="font-medium text-slate-300">This exam</p>
                <p>{exam?.type} | {exam?.durationMin} min | {questions.reduce((a, x) => a + (x.marks || 0), 0)} marks</p>
                {s.copyPasteRestriction && <p>Copy and paste are disabled.</p>}
                {s.tabDetection && <p>Tab switches are recorded.</p>}
              </div>
            </>
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-5 pb-40 sm:px-6">
            <div className="mb-4 flex items-center gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-label={navOpen ? 'Hide question list' : 'Show question list'}>
                {navOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
              <span className="text-xs text-slate-500 md:hidden"><AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} /></span>
              {q && (
                <button type="button" onClick={() => setReview((r) => ({ ...r, [q.id]: !r[q.id] }))} aria-pressed={!!review[q.id]}
                  className={cx('btn btn-sm ml-auto', review[q.id] ? 'border border-dps-gold/50 bg-dps-gold/15 text-dps-gold' : 'btn-ghost')}>
                  <Bookmark size={14} className={review[q.id] ? 'fill-dps-gold' : ''} aria-hidden="true" /> {review[q.id] ? 'Marked for review' : 'Mark for review'}
                </button>
              )}
            </div>

            {q && phase !== 'consent' && (
              <QuestionCard key={q.id} question={q} index={current} total={questions.length} value={answers[q.id]} onChange={setAnswer(q.id)} exam={exam} saveStatus={saveStatus} lastSavedAt={lastSavedAt} />
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}><ChevronLeft size={16} aria-hidden="true" /> Previous</button>
              <span className="text-sm text-slate-500">{current + 1} / {questions.length}</span>
              {current < questions.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>Next <ChevronRight size={16} aria-hidden="true" /></button>
              ) : (
                <button type="button" className="btn btn-accent" onClick={() => { saveNow(); setConfirmOpen(true) }} disabled={phase !== 'active'}><Send size={16} aria-hidden="true" /> Review and submit</button>
              )}
            </div>
          </div>
        </main>
      </div>

      {phase !== 'consent' && (
        <MonitoringIndicator webcamStream={streams.webcam} screenStream={streams.screen} activityMonitoring={s.tabDetection !== false} connected={connected} />
      )}

      <ProctoringConsentModal open={phase === 'consent'} exam={exam} onReady={onConsentReady} onDecline={() => navigate('/student/dashboard')} />

      {/* fullscreen lost */}
      {phase === 'active' && fsLost && !mediaLost && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/90 p-6 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-labelledby="fs-title">
          <div className="glass-strong max-w-md p-8 text-center">
            <Maximize size={28} className="mx-auto mb-3 text-dps-orange" aria-hidden="true" />
            <h2 id="fs-title" className="text-xl font-semibold">Return to fullscreen</h2>
            <p className="mt-2 text-sm text-slate-300">The exam must stay in fullscreen. Leaving fullscreen has been recorded. Your timer is still running.</p>
            <button type="button" className="btn btn-primary mt-5" autoFocus onClick={() => document.documentElement.requestFullscreen?.().then(() => setFsLost(false)).catch(() => setFsLost(false))}>
              <Maximize size={16} aria-hidden="true" /> Go fullscreen and continue
            </button>
          </div>
        </div>
      )}

      {/* webcam / screen stopped */}
      {phase === 'active' && mediaLost && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/90 p-6 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-labelledby="media-title">
          <div className="glass-strong max-w-md p-8 text-center">
            {mediaLost === 'screen' ? <MonitorUp size={28} className="mx-auto mb-3 text-dps-orange" aria-hidden="true" /> : <Camera size={28} className="mx-auto mb-3 text-dps-orange" aria-hidden="true" />}
            <h2 id="media-title" className="text-xl font-semibold">{mediaLost === 'screen' ? 'Screen sharing stopped' : 'Webcam stopped'}</h2>
            <p className="mt-2 text-sm text-slate-300">This exam requires {mediaLost === 'screen' ? 'your entire screen to be shared' : 'your webcam'}. The interruption has been recorded. Turn it back on to continue.</p>
            <button type="button" className="btn btn-primary mt-5" autoFocus onClick={restoreMedia}>
              {mediaLost === 'screen' ? 'Share entire screen again' : 'Turn webcam back on'}
            </button>
          </div>
        </div>
      )}

      {/* submitting */}
      {phase === 'submitting' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/90 backdrop-blur-md" role="status">
          <p className="flex items-center gap-3 text-lg"><Loader2 className="animate-spin text-dps-neon" aria-hidden="true" /> Submitting your answers</p>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit your exam?" size="sm"
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>Keep working</button>
          <button type="button" className="btn btn-accent" onClick={() => submit('student')}><Send size={16} aria-hidden="true" /> Submit now</button>
        </>}>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[['Answered', answeredCount, 'text-dps-neon'], ['Unanswered', unanswered, unanswered ? 'text-orange-300' : 'text-slate-300'], ['For review', reviewCount, reviewCount ? 'text-dps-gold' : 'text-slate-300']].map(([k, v, c]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <dd className={cx('font-display text-2xl font-semibold', c)}>{v}</dd>
              <dt className="text-xs text-slate-400">{k}</dt>
            </div>
          ))}
        </dl>
        {unanswered > 0 && <p className="mt-4 text-sm text-orange-200">You have {unanswered} unanswered question{unanswered === 1 ? '' : 's'}.</p>}
        <p className="mt-3 text-sm text-slate-400">After submitting you cannot change your answers. Time left: {timer.formatted}.</p>
      </Modal>
    </div>
  )
}
