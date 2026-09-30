import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Camera, CheckCircle2, ClipboardX, Code2, Copy, KeyRound, Loader2, MonitorPlay, MonitorUp, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import Modal from '../components/common/Modal'
import { Field, Toggle } from '../components/common/Field'
import { useToast } from '../components/common/Toast'
import TeacherExamBuilder, { newQuestion, validateQuestions } from '../components/teacher/TeacherExamBuilder'
import api from '../services/api'
import { CLASSES, EXAM_TYPES, SECTIONS } from '../config'
import { fromLocalInput, generatePasscode, toLocalInput } from '../utils/format'

function defaultTimes() {
  const s = new Date(Date.now() + 60 * 60_000)
  s.setMinutes(s.getMinutes() < 30 ? 30 : 60, 0, 0)
  const e = new Date(s.getTime() + 45 * 60_000)
  return { start: toLocalInput(s), end: toLocalInput(e) }
}

export default function CreateExam() {
  const toast = useToast()
  const times = useMemo(defaultTimes, [])
  const [form, setForm] = useState({
    title: '', class: 'XII', section: 'All', subject: 'Computers', type: 'Practical',
    startsAt: times.start, endsAt: times.end, durationMin: 45, passcode: generatePasscode(), instructions: '',
  })
  const [settings, setSettings] = useState({ requireWebcam: false, requireScreen: false, tabDetection: true, copyPasteRestriction: true, codeExecution: false })
  const [questions, setQuestions] = useState(() => [newQuestion('mcq', 'XII'), newQuestion('code', 'XII')])
  const [errors, setErrors] = useState({})
  const [qErrors, setQErrors] = useState({})
  const [busy, setBusy] = useState('')
  const [published, setPublished] = useState(null)

  const set = (k) => (e) => {
    const v = e.target.value
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'startsAt' || k === 'endsAt') {
        const mins = Math.round((new Date(next.endsAt) - new Date(next.startsAt)) / 60_000)
        if (mins > 0) next.durationMin = mins
      }
      return next
    })
    setErrors((x) => ({ ...x, [k]: '' }))
  }
  const setSetting = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }))

  const validate = () => {
    const e = {}
    if (form.title.trim().length < 4) e.title = 'Give the exam a clear title.'
    if (!form.startsAt) e.startsAt = 'Choose a start time.'
    if (!form.endsAt) e.endsAt = 'Choose an end time.'
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) e.endsAt = 'End time must be after the start time.'
    const span = (new Date(form.endsAt) - new Date(form.startsAt)) / 60_000
    if (!(Number(form.durationMin) > 0)) e.durationMin = 'Duration must be more than 0 minutes.'
    else if (span > 0 && Number(form.durationMin) > span) e.durationMin = `Duration cannot be longer than the exam window (${Math.round(span)} min).`
    if (!/^[A-Z0-9-]{8,20}$/i.test(form.passcode)) e.passcode = 'Use 8 to 20 letters, numbers or dashes.'
    if (!questions.length) e.questions = 'Add at least one question.'
    const qe = validateQuestions(questions)
    setErrors(e); setQErrors(qe)
    return Object.keys(e).length === 0 && Object.keys(qe).length === 0
  }

  const payload = (status) => {
    const codeLangs = [...new Set(questions.filter((q) => q.type === 'code').map((q) => q.languages[0]))]
    return {
      ...form,
      title: form.title.trim(),
      passcode: form.passcode.toUpperCase(),
      durationMin: Number(form.durationMin),
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      settings,
      status,
      languages: codeLangs,
      questions: questions.map((q) => ({ ...q, marks: Number(q.marks) || 0, ...(q.type === 'code' ? { hiddenTestCount: q.hiddenTests.length } : {}) })),
    }
  }

  const save = async (status) => {
    if (status === 'published' && !validate()) {
      toast('Fix the highlighted fields before publishing.', 'error')
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (status === 'draft' && !validate()) { toast('Complete the questions before saving this draft.', 'error'); return }
    setBusy(status)
    try {
      const exam = await api.createExam(payload(status))
      if (status === 'published') setPublished(exam)
      else toast('Draft saved.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally { setBusy('') }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard.', 'success')).catch(() => {})

  return (
    <div>
      <PageHeader title="Create exam" subtitle="Set the class, timing and monitoring rules, build the questions and publish. Students join with the exam password." />

      <div className="grid gap-6 xl:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="section-title mb-4">Exam details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Exam title" required error={errors.title} className="md:col-span-2">
                {(p) => <input {...p} className="input" value={form.title} onChange={set('title')} placeholder="e.g. Python Practical: Functions & File Handling" />}
              </Field>
              <Field label="Class" required>
                {(p) => (
                  <select {...p} className="input" value={form.class} onChange={set('class')}>
                    {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Section">
                {(p) => (
                  <select {...p} className="input" value={form.section} onChange={set('section')}>
                    <option value="All">All sections</option>
                    {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Subject">
                {(p) => <input {...p} className="input" value={form.subject} onChange={set('subject')} />}
              </Field>
              <Field label="Exam type">
                {(p) => (
                  <select {...p} className="input" value={form.type} onChange={set('type')}>
                    {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Starts" required error={errors.startsAt}>
                {(p) => <input {...p} type="datetime-local" className="input" value={form.startsAt} onChange={set('startsAt')} />}
              </Field>
              <Field label="Ends" required error={errors.endsAt}>
                {(p) => <input {...p} type="datetime-local" className="input" value={form.endsAt} onChange={set('endsAt')} />}
              </Field>
              <Field label="Duration (minutes)" required error={errors.durationMin} hint="Each student gets this much time from when they start, within the window above.">
                {(p) => <input {...p} type="number" min="5" max="300" className="input" value={form.durationMin} onChange={set('durationMin')} />}
              </Field>
              <Field label="Instructions for students" hint="Optional. Shown before the exam starts.">
                {(p) => <input {...p} className="input" value={form.instructions} onChange={set('instructions')} placeholder="e.g. Save your file as roll_number.py" />}
              </Field>
            </div>
          </GlassCard>

          <section aria-labelledby="qb-title">
            <h2 id="qb-title" className="section-title mb-3">Questions</h2>
            {errors.questions && <p className="error-text mb-2" role="alert">{errors.questions}</p>}
            <TeacherExamBuilder questions={questions} onChange={setQuestions} examClass={form.class} errors={qErrors} />
          </section>
        </div>

        <div className="space-y-6">
          <GlassCard glow className="p-5">
            <h2 className="section-title mb-3 flex items-center gap-2"><KeyRound size={18} className="text-dps-gold" aria-hidden="true" /> Exam password</h2>
            <Field error={errors.passcode} hint="Announce this in the lab when the exam starts.">
              {(p) => (
                <div className="flex gap-2">
                  <input {...p} aria-label="Exam password" className="input font-mono text-lg uppercase tracking-wider" value={form.passcode} onChange={set('passcode')} spellCheck={false} />
                  <button type="button" className="btn btn-ghost" onClick={() => copy(form.passcode)} aria-label="Copy password"><Copy size={16} /></button>
                </div>
              )}
            </Field>
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setForm((f) => ({ ...f, passcode: generatePasscode() }))}><RefreshCw size={14} aria-hidden="true" /> Generate exam password</button>
          </GlassCard>

          <GlassCard className="space-y-2.5 p-5">
            <h2 className="section-title mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-dps-neon" aria-hidden="true" /> Monitoring rules</h2>
            <p className="text-xs text-slate-400">Students see every enabled rule and must agree before starting.</p>
            <Toggle icon={Camera} label="Require webcam" description="Live camera view on your monitor" checked={settings.requireWebcam} onChange={setSetting('requireWebcam')} />
            <Toggle icon={MonitorUp} label="Require screen share" description="Entire screen, Chrome or Edge" checked={settings.requireScreen} onChange={setSetting('requireScreen')} />
            <Toggle icon={ShieldCheck} label="Tab-switch detection" description="Flags tab, window and fullscreen changes" checked={settings.tabDetection} onChange={setSetting('tabDetection')} />
            <Toggle icon={ClipboardX} label="Copy-paste restriction" description="Blocks and records copy, cut and paste" checked={settings.copyPasteRestriction} onChange={setSetting('copyPasteRestriction')} />
            <Toggle icon={Code2} label="Code execution and checking" description="Run code and auto-check test cases" checked={settings.codeExecution} onChange={setSetting('codeExecution')} />
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm text-slate-300">{questions.length} questions | {questions.reduce((a, q) => a + (Number(q.marks) || 0), 0)} marks | Class {form.class}{form.section !== 'All' ? `-${form.section}` : ''}</p>
            {Object.keys(qErrors).length > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300"><AlertTriangle size={13} aria-hidden="true" /> {Object.keys(qErrors).length} question(s) need attention.</p>}
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => save('published')} disabled={!!busy}>
                {busy === 'published' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />} Publish exam
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => save('draft')} disabled={!!busy}>
                {busy === 'draft' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />} Save as draft
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      <Modal open={!!published} onClose={() => setPublished(null)} title="Exam published" size="sm"
        footer={<>
          <Link to="/teacher/dashboard" className="btn btn-ghost">Back to dashboard</Link>
          {published && <Link to={`/teacher/exams/${published.id}/monitor`} className="btn btn-primary"><MonitorPlay size={16} aria-hidden="true" /> Open monitor</Link>}
        </>}>
        <p className="flex items-center gap-2 text-sm text-dps-neon"><CheckCircle2 size={16} aria-hidden="true" /> {published?.title} is scheduled for Class {published?.class}.</p>
        <p className="mt-4 text-xs text-slate-400">Exam password</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-xl border border-dps-gold/40 bg-dps-gold/10 px-4 py-2 font-mono text-2xl font-semibold tracking-wider text-dps-gold">{published?.passcode}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(published?.passcode)} aria-label="Copy password"><Copy size={14} /></button>
        </div>
        <p className="mt-4 text-sm text-slate-400">Students can join from {published && new Date(published.startsAt).toLocaleString('en-IN')} using this password.</p>
      </Modal>
    </div>
  )
}
