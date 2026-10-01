import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BellRing, CheckCircle2, Copy, Eye, EyeOff, KeyRound, LayoutGrid, Maximize, Minimize, RefreshCcw, ShieldAlert, Users, Wifi, WifiOff } from 'lucide-react'
import StatusBadge from '../components/common/StatusBadge'
import StatCard from '../components/common/StatCard'
import GlassCard from '../components/common/GlassCard'
import Timer from '../components/exam/Timer'
import LiveStudentGrid from '../components/proctoring/LiveStudentGrid'
import ScreenWall from '../components/proctoring/ScreenWall'
import StudentDetailPanel from '../components/proctoring/StudentDetailPanel'
import { flagTotal } from '../components/proctoring/StudentMonitorCard'
import { ErrorNote, Spinner } from '../components/common/Feedback'
import { useToast } from '../components/common/Toast'
import useExamTimer from '../hooks/useExamTimer'
import { useTeacherRTC } from '../hooks/useWebRTC'
import { useTeacherSnapshots } from '../hooks/useTeacherSnapshots'
import { useTeacherScreenWall } from '../hooks/useTeacherScreenWall'
import api from '../services/api'
import { EVENTS, getSocket } from '../services/socket'
import { getTeacherToken } from '../services/session'
import { bucketOf, DEMO_MODE, PROCTOR_EVENTS } from '../config'
import { cx, formatTime } from '../utils/format'
import { mergeMonitorStatus, isRunningExamStatus } from '../utils/monitoringState'

const EMPTY_FLAGS = { tab: 0, blur: 0, fullscreen: 0, copyPaste: 0, devtools: 0, other: 0 }
const SERVER_EVENT_TYPES = {
  TAB_SWITCH: 'tab_hidden', WINDOW_BLUR: 'window_blur', WINDOW_FOCUS: 'window_focus',
  FULLSCREEN_EXIT: 'fullscreen_exit', COPY: 'copy', PASTE: 'paste', RIGHT_CLICK: 'right_click',
  MULTIPLE_SESSION_ATTEMPT: 'multiple_tabs', BROWSER_CHANGED: 'devtools_suspected',
  SCREEN_SHARE_STOPPED: 'screen_share_stopped', WEBCAM_STOPPED: 'webcam_stopped',
  NETWORK_DISCONNECT: 'window_blur', DEVTOOLS_SUSPECTED: 'devtools_suspected',
  TEACHER_OBSERVATION: 'teacher_observation',
}

export default function ExamMonitor() {
  const { examId } = useParams()
  const [params] = useSearchParams()
  const [wallMode,setWallMode] = useState(()=>params.get('view')!=='cards')
  const toast = useToast()
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState({})
  const [snapshots, setSnapshots] = useState({})
  const [feed, setFeed] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [recoveredPass,setRecoveredPass] = useState('')
  const [passNotice,setPassNotice] = useState('')
  const [passBusy,setPassBusy] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [now, setNow] = useState(Date.now())
  const socket = useMemo(() => getSocket({ role: 'teacher', token: getTeacherToken() }), [])
  const rtc = useTeacherRTC(socket)
  const cameraStills = useTeacherSnapshots(socket)
  const wall = useTeacherScreenWall(socket,examId,wallMode&&!DEMO_MODE)
  const studentsRef = useRef(students)
  const progressTimer = useRef(null)
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
    const upsert = (sessionId, patch) => setStudents(all => ({ ...all, [sessionId]: mergeMonitorStatus({ flags: { ...EMPTY_FLAGS }, timeline: [], ...all[sessionId] },patch) }))

    const onJoined = (s) => s?.sessionId && upsert(s.sessionId, { name: s.studentName || 'Student', rollNumber: s.rollNumber, status: 'active', connected:true, ...s, class:s.className||s.class, section:s.section, webcam:s.consentWebcam===true, screen:s.consentScreen===true, stillsConsent:s.consentStills===true, device:s.device||{} })
    const onUpdate = ({ sessionId, ...patch }) => sessionId && upsert(sessionId, patch)
    const onLeft = ({ sessionId, status }) => sessionId && upsert(sessionId, { status: status || 'disconnected', connected:false, webcamActive:false, screenActive:false })
    const onSnapshot = ({ sessionId, webcam, screen, ts }) => sessionId && setSnapshots((m) => ({ ...m, [sessionId]: { webcam: webcam || m[sessionId]?.webcam, screen: screen || m[sessionId]?.screen, ts } }))
    const syncSavedProgress = () => {
      clearTimeout(progressTimer.current)
      progressTimer.current=setTimeout(()=>{
        api.getMonitor(examId).then(res=>{
          setStudents(all=>{
            const next={...all};
            for(const row of res.students) {
              if(all[row.sessionId]){
                next[row.sessionId]={...all[row.sessionId],
                  answered:row.answered,totalQuestions:row.totalQuestions,
                  device:row.device||all[row.sessionId].device,
                  connected:row.connected
                };
              }
            }
            return next;
          })
        }).catch(()=>{}) // A missed refresh never ends a student's session.
      },1750);
    }
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
    socket.on('exam:answerLiveUpdate',syncSavedProgress)
    return () => {
      socket.emit(EVENTS.TEACHER_LEAVE_MONITOR, { examId })
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off(EVENTS.MONITOR_STUDENT_JOINED, onJoined)
      socket.off(EVENTS.MONITOR_STUDENT_UPDATE, onUpdate)
      socket.off(EVENTS.MONITOR_STUDENT_LEFT, onLeft)
      socket.off(EVENTS.MONITOR_SNAPSHOT, onSnapshot)
      socket.off(EVENTS.MONITOR_PROCTOR_EVENT, onEvent)
      socket.off('exam:answerLiveUpdate',syncSavedProgress)
      clearTimeout(progressTimer.current)
    }
  }, [socket, examId])

  const warn = useCallback(async (student, message) => {
    socket.emit(EVENTS.TEACHER_WARN_STUDENT, { examId, sessionId: student.sessionId, message })
    toast(`Warning requested for ${student.name}. Delivery is not guaranteed if disconnected.`, 'info')
  }, [socket, examId, toast])

  const revealPasscode=async()=>{
    if(showPass){setRecoveredPass('');setShowPass(false);return}
    setPassBusy(true);setPassNotice('')
    try{
      const result=await api.getExamPasscode(examId)
      setRecoveredPass(result.available?result.passcode:'')
      setPassNotice(result.notice||'')
      setShowPass(true)
    }catch(e){setPassNotice(e.message);toast(e.message,'error')}
    finally{setPassBusy(false)}
  }
  const regeneratePasscode=async()=>{
    if(!window.confirm('Generate a new password for '+exam.title+'? The old password will stop working for anyone who has not joined. You must send all students the replacement.'))return
    setPassBusy(true);setPassNotice('')
    try{
      const result=await api.generateExamPasscode(examId)
      setRecoveredPass(result.passcode)
      setShowPass(true)
      setPassNotice('New password saved securely. Share it with students; their old password will no longer work.')
      toast('New exam password generated. Copy it before sharing.','success')
    }catch(e){setPassNotice(e.message);toast(e.message,'error')}
    finally{setPassBusy(false)}
  }
  const copyText=async(value,label)=>{
    try{await navigator.clipboard.writeText(value);toast(label+' copied to clipboard.','success')}
    catch{toast('Could not copy. Select the displayed text manually.','error')}
  }
  const timer = useExamTimer(exam?.endsAt)
  const list = useMemo(() => Object.values(students), [students])
  const counts = useMemo(() => ({
    joined: list.length,
    active: list.filter((s) => isRunningExamStatus(s.status) && s.connected!==false).length,
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
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dps-gold/30 bg-dps-gold/5 px-3 py-2">
            <KeyRound size={16} className="text-dps-gold" aria-hidden="true" />
            <span aria-live="polite" className="font-mono text-sm tracking-wider text-dps-gold" data-testid="exam-passcode-display">{showPass?(recoveredPass||'Unrecoverable old password'):'Exam password ••••••••'}</span>
            <button disabled={passBusy} type="button" className="btn btn-ghost btn-sm" onClick={revealPasscode} aria-label={showPass?'Hide exam password':'Reveal exam password'}>
              {showPass?<EyeOff size={14}/>:<Eye size={14}/>} {showPass?'Hide':'Reveal'}
            </button>
            {showPass&&recoveredPass&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>copyText(recoveredPass,'Exam password')} aria-label="Copy exam password"><Copy size={14}/> Copy</button>}
            {['upcoming','draft'].includes(exam.status)&&<button disabled={passBusy} type="button" className="btn btn-ghost btn-sm" onClick={regeneratePasscode} title="Replace an unrecoverable old exam password" aria-label="Generate a replacement exam password"><RefreshCcw size={14}/> {recoveredPass?'Replace':'Generate new'}</button>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={()=>copyText(window.location.origin+'/#/student/join?exam='+encodeURIComponent(examId),'Student exam link')}><Copy size={14}/> Join link</button>
          {exam.status === 'live' && <Timer formatted={timer.formatted} isWarning={timer.isWarning} isCritical={timer.isCritical} label="Exam ends in" />}
          <button type="button" className={wallMode?'btn btn-primary btn-sm':'btn btn-ghost btn-sm'} onClick={()=>setWallMode(p=>!p)} aria-pressed={wallMode} title="Show all consented screen snapshots on one page">
            <LayoutGrid size={15}/> {wallMode?'Show student cards':'Open screen wall'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleFs} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen monitor'}>
            {isFs ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {passNotice&&<p role="status" className="rounded-xl border border-dps-gold/30 bg-dps-gold/5 px-4 py-3 text-sm text-slate-200">{passNotice}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Joined" value={counts.joined} accent="sky" />
        <StatCard icon={Eye} label="Writing now" value={counts.active} accent="green" />
        <StatCard icon={CheckCircle2} label="Submitted" value={counts.submitted} accent="gold" />
        <StatCard icon={ShieldAlert} label="Students flagged" value={counts.flagged} accent="red" hint={`${counts.flags} flags in total`} />
      </div>

      {wallMode ? (
        <ScreenWall students={list} frames={wall.frames} statuses={wall.statuses} state={wall.state} now={now}
          onSelect={s=>setSelectedId(s.sessionId)} />
      ) : (
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
          <p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-500">Students consent before starting the exam. Open a card to watch that student's webcam and screen without another student approval.</p>
        </GlassCard>
      </div>)}

      {selected && (
        <StudentDetailPanel student={selected} exam={exam} rtc={rtc} cameraStills={cameraStills} snapshot={{...snapshots[selected.sessionId],screen:wall.frames[selected.sessionId]?.jpeg || snapshots[selected.sessionId]?.screen}} onClose={() => { cameraStills.stop(selected.sessionId); setSelectedId(null) }} onWarn={warn} now={now} />
      )}
    </div>
  )
}
