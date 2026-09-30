import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BellRing, CheckCircle2, Eye, EyeOff, KeyRound, Maximize, Minimize, ShieldAlert, Users, Wifi, WifiOff } from 'lucide-react'
import StatusBadge from '../components/common/StatusBadge'
import StatCard from '../components/common/StatCard'
import GlassCard from '../components/common/GlassCard'
import Timer from '../components/exam/Timer'
import LiveStudentGrid from '../components/proctoring/LiveStudentGrid'
import StudentDetailPanel from '../components/proctoring/StudentDetailPanel'
import { flagTotal } from '../components/proctoring/StudentMonitorCard'
import { ErrorNote, Spinner } from '../components/common/Feedback'
import { useToast } from '../components/common/Toast'
import useExamTimer from '../hooks/useExamTimer'
import { useTeacherRTC } from '../hooks/useWebRTC'
import api from '../services/api'
import { EVENTS, getSocket } from '../services/socket'
import { getTeacherToken } from '../services/session'
import { bucketOf, DEMO_MODE, PROCTOR_EVENTS } from '../config'
import { cx, formatTime } from '../utils/format'

const EMPTY_FLAGS = { tab: 0, blur: 0, fullscreen: 0, copyPaste: 0, devtools: 0, other: 0 }
const SERVER_EVENT_TYPES = {
  TAB_SWITCH: 'tab_hidden', WINDOW_BLUR: 'window_blur', WINDOW_FOCUS: 'window_focus',
  FULLSCREEN_EXIT: 'fullscreen_exit', COPY: 'copy', PASTE: 'paste', RIGHT_CLICK: 'right_click',
  MULTIPLE_SESSION_ATTEMPT: 'multiple_tabs', BROWSER_CHANGED: 'devtools_suspected',
  SCREEN_SHARE_STOPPED: 'screen_share_stopped', WEBCAM_STOPPED: 'webcam_stopped',
  NETWORK_DISCONNECT: 'window_blur', DEVTOOLS_SUSPECTED: 'devtools_suspected',
}

export default function ExamMonitor() {
  const { examId } = useParams()
  const toast = useToast()
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState({})
  const [snapshots, setSnapshots] = useState({})
  const [feed, setFeed] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [now, setNow] = useState(Date.now())
  const socket = useMemo(() => getSocket({ role: 'teacher', token: getTeacherToken() }), [])
  const rtc = useTeacherRTC(socket)
  const studentsRef = useRef(students)
  studentsRef.current = students

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t) }, [])
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const load = useCallback(() => {
    setError('')
    api.getMonitor(examId)
      .then((res) => {
        setExam(res.exam)
        setStudents(Object.fromEntries(res.students.map((s) => [s.sessionId, { flags: { ...EMPTY_FLAGS }, timeline: [], ...s }])))
      })
      .catch((e) => setError(e.message))
  }, [examId])
  useEffect(load, [load])

  /* ---------- realtime ---------- */
  useEffect(() => {
    if (!socket) return undefined
    const join = () => { setConnected(true); socket.emit(EVENTS.TEACHER_JOIN_MONITOR, { examId }) }
    const onDisconnect = () => setConnected(false)
    const upsert = (sessionId, patch) => setStudents((all) => ({ ...all, [sessionId]: { flags: { ...EMPTY_FLAGS }, timeline: [], ...all[sessionId], ...patch } }))

    const onJoined = (s) => s?.sessionId && upsert(s.sessionId, { name: s.studentName || 'Student', rollNumber: s.rollNumber, status: 'active', ...s })
    const onUpdate = ({ sessionId, ...patch }) => sessionId && upsert(sessionId, patch)
    const onLeft = ({ sessionId, status }) => sessionId && upsert(sessionId, { status: status || 'disconnected' })
    const onSnapshot = ({ sessionId, webcam, screen, ts }) => sessionId && setSnapshots((m) => ({ ...m, [sessionId]: { webcam: webcam || m[sessionId]?.webcam, screen: screen || m[sessionId]?.screen, ts } }))
    const onEvent = ({ sessionId, event }) => {
      if (!sessionId || !event) return
      const normalized = { ...event, type: SERVER_EVENT_TYPES[event.eventType] || event.type || 'unknown', ts: event.createdAt || event.ts || new Date().toISOString() }
      setStudents((all) => {
        const s = all[sessionId]
        if (!s) return all
        const bucket = bucketOf(normalized.type)
        const flags = bucket ? { ...s.flags, [bucket]: (s.flags?.[bucket] || 0) + 1 } : s.flags
        const status = normalized.type === 'exam_submitted' ? 'submitted' : s.status
        return { ...all, [sessionId]: { ...s, flags, status, timeline: [normalized, ...(s.timeline || [])].slice(0, 300) } }
      })
      const meta = PROCTOR_EVENTS[normalized.type]
      if (meta && meta.severity !== 'info' && meta.severity !== 'low') {
        const name = studentsRef.current[sessionId]?.name || 'A student'
        setFeed((f) => [{ id: `${sessionId}-${normalized.ts}-${normalized.type}`, sessionId, name, ...normalized }, ...f].slice(0, 60))
      }
    }

    if (socket.connected) join()
    socket.on('connect', join)
    socket.on('disconnect', onDisconnect)
    socket.on(EVENTS.MONITOR_STUDENT_JOINED, onJoined)
    socket.on(EVENTS.MONITOR_STUDENT_UPDATE, onUpdate)
    socket.on(EVENTS.MONITOR_STUDENT_LEFT, onLeft)
    socket.on(EVENTS.MONITOR_SNAPSHOT, onSnapshot)
    socket.on(EVENTS.MONITOR_PROCTOR_EVENT, onEvent)
    return () => {
      socket.emit(EVENTS.TEACHER_LEAVE_MONITOR, { examId })
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off(EVENTS.MONITOR_STUDENT_JOINED, onJoined)
      socket.off(EVENTS.MONITOR_STUDENT_UPDATE, onUpdate)
      socket.off(EVENTS.MONITOR_STUDENT_LEFT, onLeft)
      socket.off(EVENTS.MONITOR_SNAPSHOT, onSnapshot)
      socket.off(EVENTS.MONITOR_PROCTOR_EVENT, onEvent)
    }
  }, [socket, examId])

  const warn = useCallback(async (student, message) => {
    socket.emit(EVENTS.TEACHER_WARN_STUDENT, { examId, sessionId: student.sessionId, message })
    toast(`Warning requested for ${student.name}. Delivery is not guaranteed if disconnected.`, 'info')
  }, [socket, examId, toast])

  const timer = useExamTimer(exam?.endsAt)
  const list = useMemo(() => Object.values(students), [students])
  const counts = useMemo(() => ({
    joined: list.length,
    active: list.filter((s) => s.status === 'active').length,
    submitted: list.filter((s) => s.status === 'submitted').length,
    flagged: list.filter((s) => flagTotal(s.flags) > 0).length,
    flags: list.reduce((a, s) => a + flagTotal(s.flags), 0),
  }), [list])
  const selected = selectedId ? students[selectedId] : null

  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  if (error) return <ErrorNote message={error} onRetry={load} />
  if (!exam) return <Spinner label="Opening monitor" />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center">
        <div className="min-w-0 flex-1">
          <Link to="/teacher/dashboard" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft size={12} aria-hidden="true" /> Dashboard</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold">{exam.title}</h1>
            <StatusBadge status={exam.status} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Class {exam.class}{exam.section !== 'All' ? `-${exam.section}` : ', all sections'} | {exam.type} | {formatTime(exam.startsAt)} to {formatTime(exam.endsAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx('chip', connected ? 'border-dps-green/40 text-dps-neon' : 'border-dps-orange/40 text-orange-200')}>
            {connected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />} {connected ? 'Live updates on' : 'Reconnecting'}
          </span>
          {DEMO_MODE && <span className="chip border-dps-gold/30 text-dps-gold">Simulated students</span>}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">
            <KeyRound size={14} className="text-dps-gold" aria-hidden="true" />
            <span className="font-mono text-sm tracking-wider">{showPass ? exam.passcode || 'hidden' : '••••••••'}</span>
            <button type="button" className="rounded p-1 text-slate-400 hover:text-white" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Hide exam password' : 'Show exam password'}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {exam.status === 'live' && <Timer formatted={timer.formatted} isWarning={timer.isWarning} isCritical={timer.isCritical} label="Exam ends in" />}
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleFs} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen monitor'}>
            {isFs ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Joined" value={counts.joined} accent="sky" />
        <StatCard icon={Eye} label="Writing now" value={counts.active} accent="green" />
        <StatCard icon={CheckCircle2} label="Submitted" value={counts.submitted} accent="gold" />
        <StatCard icon={ShieldAlert} label="Students flagged" value={counts.flagged} accent="red" hint={`${counts.flags} flags in total`} />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr,320px]">
        <LiveStudentGrid students={list} snapshots={snapshots} selectedId={selectedId} onSelect={(s) => setSelectedId(s.sessionId)} now={now} />

        <GlassCard className="h-fit p-4 2xl:sticky 2xl:top-20" aria-labelledby="feed-title">
          <h2 id="feed-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><BellRing size={15} className="text-dps-orange" aria-hidden="true" /> Live alerts</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-slate-500">New flags appear here as they happen.</p>
          ) : (
            <ol className="max-h-[60vh] space-y-2 overflow-y-auto pr-1" aria-live="polite">
              {feed.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setSelectedId(e.sessionId)} className="flex w-full items-start gap-2 rounded-lg border border-white/[0.06] p-2 text-left text-sm hover:border-white/20">
                    <ShieldAlert size={14} className={cx('mt-0.5 shrink-0', PROCTOR_EVENTS[e.type]?.severity === 'high' ? 'text-red-300' : 'text-orange-300')} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">{e.name}</span>
                      <span className="block text-xs text-slate-400">{PROCTOR_EVENTS[e.type]?.label || e.type}</span>
                    </span>
                    <time className="shrink-0 font-mono text-[11px] text-slate-500" dateTime={e.ts}>{formatTime(e.ts)}</time>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-500">Students can see that they are being monitored. Open a card to watch live video and review the full timeline.</p>
        </GlassCard>
      </div>

      {selected && (
        <StudentDetailPanel student={selected} exam={exam} rtc={rtc} snapshot={snapshots[selected.sessionId]} onClose={() => setSelectedId(null)} onWarn={warn} now={now} />
      )}
    </div>
  )
}
