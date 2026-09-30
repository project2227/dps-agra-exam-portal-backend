import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Ban, Camera, Eye, KeyRound, Loader2, LogIn, MonitorX, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GlassCard from '../components/common/GlassCard'
import ExamCard from '../components/student/ExamCard'
import { Field } from '../components/common/Field'
import { EmptyState, ErrorNote, Spinner } from '../components/common/Feedback'
import api from '../services/api'
import { getDeviceMetadata } from '../services/proctoring'
import { setStudentSession } from '../services/session'
import { CLASSES, DEMO_MODE, SECTIONS } from '../config'
import { DEMO_PASSCODE } from '../services/mockData'
import { formatDateTime } from '../utils/format'

const RULES = [
  { icon: Ban, text: 'Do not switch tabs or minimise the exam window.' },
  { icon: MonitorX, text: 'Do not open another browser, window or app.' },
  { icon: Camera, text: 'Webcam and screen sharing may be required for this exam.' },
  { icon: Eye, text: 'Your teacher can view your live progress during the exam.' },
  { icon: ShieldCheck, text: 'Cheating flags are recorded and reviewed by your teacher.' },
]

export default function StudentJoinPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ name: '', rollNumber: '', class: '', section: '', passcode: '' })
  const [examId, setExamId] = useState('')
  const [consent, setConsent] = useState(false)
  const [mediaConsent, setMediaConsent] = useState({ webcam: false, screenShare: false })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const load = () => {
    setLoading(true); setLoadError('')
    api.getActiveExams()
      .then((list) => setExams(list))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const live = useMemo(() => exams.filter((e) => e.status === 'live' && (!form.class || e.class === form.class)), [exams, form.class])
  const upcoming = useMemo(() => exams.filter((e) => e.status === 'upcoming' && (!form.class || e.class === form.class)), [exams, form.class])
  const selected = exams.find((e) => e.id === examId)

  const set = (k) => (e) => {
    const v = e.target.value
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((x) => ({ ...x, [k]: '' }))
  }

  const selectExam = (exam) => {
    setExamId(exam.id)
    setErrors((x) => ({ ...x, examId: '' }))
    setForm((f) => ({ ...f, class: exam.class, section: exam.section !== 'All' ? exam.section : f.section }))
  }

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 3) e.name = 'Enter your full name as in school records.'
    if (!/^[A-Za-z0-9-]{1,12}$/.test(form.rollNumber.trim())) e.rollNumber = 'Enter your roll number (letters and numbers only).'
    if (!form.class) e.class = 'Choose your class.'
    if (!form.section) e.section = 'Choose your section.'
    if (!form.passcode.trim()) e.passcode = 'Enter the exam password your teacher gave you.'
    if (!examId) e.examId = 'Select the exam you are taking.'
    else if (selected && selected.section !== 'All' && form.section && selected.section !== form.section) e.section = `This exam is only for section ${selected.section}.`
    if (!consent) e.consent = 'You must acknowledge the exam rules to join.'
    if (selected?.settings?.requireWebcam && !mediaConsent.webcam) e.webcam = 'You must explicitly consent to webcam sharing to join this exam.'
    if (selected?.settings?.requireScreen && !mediaConsent.screenShare) e.screen = 'You must explicitly consent to screen sharing to join this exam.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await api.joinExam({
        examId,
        name: form.name.trim().replace(/\s+/g, ' '),
        rollNumber: form.rollNumber.trim(),
        class: form.class,
        section: form.section,
        passcode: form.passcode.trim(),
        consent: true,
        mediaConsent,
        device: getDeviceMetadata(),
      })
      setStudentSession({ ...res, joinedAt: new Date().toISOString() })
      navigate(`/student/exam/${res.exam?.id || examId}`, { replace: true })
    } catch (e) {
      setServerError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-2xl animate-fade-up">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Join an exam</h1>
          <p className="mt-2 text-slate-400">No account needed. Fill in your details, choose today&apos;s exam and enter the password your teacher announces in the lab.</p>
        </div>

        <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="section-title mb-4">Your details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name} className="sm:col-span-2">
                  {(p) => <input {...p} className="input" value={form.name} onChange={set('name')} autoComplete="name" placeholder="e.g. Ananya Gupta" />}
                </Field>
                <Field label="Roll number" required error={errors.rollNumber}>
                  {(p) => <input {...p} className="input" value={form.rollNumber} onChange={set('rollNumber')} inputMode="numeric" placeholder="e.g. 14" />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Class" required error={errors.class}>
                    {(p) => (
                      <select {...p} className="input" value={form.class} onChange={(e) => { set('class')(e); if (selected && selected.class !== e.target.value) setExamId('') }}>
                        <option value="">Select</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </Field>
                  <Field label="Section" required error={errors.section}>
                    {(p) => (
                      <select {...p} className="input" value={form.section} onChange={set('section')}>
                        <option value="">Select</option>
                        {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </Field>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="section-title">Select your exam</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh</button>
              </div>
              {loading ? <Spinner label="Loading exams" /> : loadError ? <ErrorNote message={loadError} onRetry={load} /> : (
                <>
                  {live.length === 0 ? (
                    <EmptyState icon={Users} title={form.class ? `No live exam for Class ${form.class} right now` : 'No exam is live right now'}>
                      When your teacher starts the exam it will appear here. Press Refresh.
                    </EmptyState>
                  ) : (
                    <div className="grid gap-3" role="list">
                      {live.map((e) => <div role="listitem" key={e.id}><ExamCard exam={e} selected={examId === e.id} onSelect={selectExam} /></div>)}
                    </div>
                  )}
                  {errors.examId && <p className="error-text" role="alert">{errors.examId}</p>}
                  {upcoming.length > 0 && (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="mb-2 text-sm font-medium text-slate-300">Coming up</p>
                      <ul className="space-y-1.5 text-sm text-slate-400">
                        {upcoming.slice(0, 4).map((e) => <li key={e.id}>Class {e.class}: {e.title} <span className="text-slate-500">({formatDateTime(e.startsAt)})</span></li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="section-title mb-4">Exam rules</h2>
              <ul className="space-y-3">
                {RULES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm text-slate-300"><Icon size={17} className="mt-0.5 shrink-0 text-dps-orange" aria-hidden="true" /> {text}</li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard glow className="p-6">
              <Field label="Exam password" required error={errors.passcode} hint={DEMO_MODE ? `Demo mode: use ${DEMO_PASSCODE}` : 'Given by your teacher at the start of the exam.'}>
                {(p) => (
                  <div className="relative">
                    <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input {...p} className="input pl-9 font-mono uppercase tracking-wider" value={form.passcode} onChange={set('passcode')} autoComplete="off" spellCheck={false} placeholder="DPS-XXXX-XXXX" />
                  </div>
                )}
              </Field>

              <label className="mt-5 flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-200">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-dps-green" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((x) => ({ ...x, consent: '' })) }} aria-describedby="consent-err" />
                I understand this exam may use webcam, screen sharing, tab-switch detection, and activity monitoring as per school exam rules.
              </label>
              {errors.consent && <p id="consent-err" className="error-text" role="alert">{errors.consent}</p>}
              {(selected?.settings?.requireWebcam || selected?.settings?.requireScreen) && (
                <div className="mt-4 space-y-3 rounded-xl border border-dps-gold/40 bg-dps-gold/5 p-4 text-sm">
                  <p className="font-semibold text-white">Explicit media consent for this exam</p>
                  <p className="text-slate-300">Your browser will separately ask permission when you start the exam. Nothing is captured on this page. You may refuse and ask your teacher for another arrangement.</p>
                  {selected?.settings?.requireWebcam && <label className="flex gap-3"><input type="checkbox" className="accent-dps-green" checked={mediaConsent.webcam} onChange={e => setMediaConsent(v => ({...v,webcam:e.target.checked}))} /> I agree to share my webcam live with the authorized exam teacher while taking this exam.</label>}
                  {selected?.settings?.requireScreen && <label className="flex gap-3"><input type="checkbox" className="accent-dps-green" checked={mediaConsent.screenShare} onChange={e => setMediaConsent(v => ({...v,screenShare:e.target.checked}))} /> I agree to share my screen live with the authorized exam teacher while taking this exam.</label>}
                  {errors.webcam && <p className="error-text" role="alert">{errors.webcam}</p>}
                  {errors.screen && <p className="error-text" role="alert">{errors.screen}</p>}
                </div>
              )}

              {serverError && (
                <p className="mt-4 flex gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {serverError}
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={submitting}>
                {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
                {submitting ? 'Checking password' : 'Join exam'}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Teacher? <Link to="/teacher/login" className="text-dps-neon hover:underline">Sign in here</Link>
              </p>
            </GlassCard>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  )
}
