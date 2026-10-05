import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Camera, CheckCircle2, ClipboardX, Code2, Copy, KeyRound, Loader2, MonitorPlay, MonitorUp, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import Modal from '../components/common/Modal'
import { Field, Toggle } from '../components/common/Field'
import { useToast } from '../components/common/Toast'
import TeacherExamBuilder, { newQuestion, validateQuestions } from '../components/teacher/TeacherExamBuilder'
import ExamAiAssistant from '../components/teacher/ExamAiAssistant'
import { ErrorNote, Spinner } from '../components/common/Feedback'
import { canEditExam } from '../services/examAiDraft'
import { moveExamWorkspace, readExamWorkspace, teacherWorkspaceKey, writeExamWorkspace } from '../services/teacherExamWorkspace'
import api from '../services/api'
import { CLASSES, EXAM_TYPES, SECTIONS } from '../config'
import { formatDateTime, fromLocalInput, generatePasscode, toLocalInput } from '../utils/format'
import DateTime12HourInput from '../components/common/DateTime12HourInput'

function defaultTimes() {
  const s = new Date(Date.now() + 60 * 60_000)
  s.setMinutes(s.getMinutes() < 30 ? 30 : 60, 0, 0)
  const e = new Date(s.getTime() + 45 * 60_000)
  return { start: toLocalInput(s), end: toLocalInput(e) }
}

export default function CreateExam() {
  const toast = useToast()
  const [search, setSearch] = useSearchParams()
  const editId = search.get('edit') || ''
  const workspaceKey = teacherWorkspaceKey('builder', editId), assistantWorkspaceKey = teacherWorkspaceKey('assistant', editId)
  const initialWorkspace = useMemo(() => !editId ? readExamWorkspace(workspaceKey) : null, [])
  const loadedId = useRef(''), savedPasscode = useRef('')
  const [existing, setExisting] = useState(null), [loading, setLoading] = useState(!!editId), [loadError, setLoadError] = useState('')
  const times = useMemo(defaultTimes, [])
  const [form, setForm] = useState({
    title: '', class: 'IX', section: 'All', subject: 'Computers', type: 'Practical',
    startsAt: times.start, endsAt: times.end, durationMin: 45, instructions: '', ...(initialWorkspace?.form || {}), passcode: generatePasscode(),
  })
  const [settings, setSettings] = useState(initialWorkspace?.settings || { requireWebcam: true, requireScreen: true, tabDetection: true, copyPasteRestriction: true, codeExecution: true })
  const [questions, setQuestions] = useState(initialWorkspace?.questions || [])
  const [storageError, setStorageError] = useState(false)
  const [errors, setErrors] = useState({})
  const [qErrors, setQErrors] = useState({})
  const [busy, setBusy] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [published, setPublished] = useState(null)
  const loadExam = async () => {
    if (!editId || loadedId.current === editId) return
    setLoading(true); setLoadError('')
    try {
      const r = await api.getExamBuilder(editId)
      if (!canEditExam(r.exam)) throw new Error('This exam is already active, closed or removed. Its questions and timing are locked.')
      const pass = await api.getExamPasscode(editId)
      const cached = readExamWorkspace(workspaceKey), resume = cached?.updatedAt === r.exam.updated_at ? cached : null
      setExisting(r.exam); loadedId.current = editId
      savedPasscode.current = pass.passcode || ''
      setForm({ title: r.exam.title, class: r.exam.class, section: r.exam.section, subject: r.exam.subject,
        type: r.exam.type, startsAt: toLocalInput(r.exam.startsAt), endsAt: toLocalInput(r.exam.endsAt),
        durationMin: r.exam.durationMin, instructions: r.exam.instructions || '', ...(resume?.form || {}), passcode: pass.passcode || '' })
      setSettings(resume?.settings || r.exam.settings); setQuestions(resume?.questions || r.questions)
    } catch (e) { setLoadError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadExam() }, [editId])
  useEffect(() => {
    if (loading || loadError) return
    const { passcode, ...editableForm } = form
    setStorageError(!writeExamWorkspace(workspaceKey, { form: editableForm, settings, questions, updatedAt: existing?.updated_at || null }))
  }, [workspaceKey, form, settings, questions, existing, loading, loadError])

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

  const validate = (draft = false) => {
    const e = {}
    if (!draft && form.title.trim().length < 4) e.title = 'Give the exam a clear title.'
    if (!form.startsAt) e.startsAt = 'Choose a start time.'
    if (!form.endsAt) e.endsAt = 'Choose an end time.'
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) e.endsAt = 'End time must be after the start time.'
    const span = (new Date(form.endsAt) - new Date(form.startsAt)) / 60_000
    if (!(Number(form.durationMin) > 0)) e.durationMin = 'Duration must be more than 0 minutes.'
    else if (span > 0 && Number(form.durationMin) > span) e.durationMin = `Duration cannot be longer than the exam window (${Math.round(span)} min).`
    if (!draft && !/^[A-Z0-9-]{8,20}$/i.test(form.passcode)) e.passcode = 'Use 8 to 20 letters, numbers or dashes.'
    if (!draft && !questions.length) e.questions = 'Add at least one question.'
    const qe = draft ? {} : validateQuestions(questions)
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
    const publishing = status === 'published'
    if (!validate(!publishing)) {
      toast(publishing ? 'Fix the highlighted fields before publishing.' : 'Check the highlighted exam times before saving.', 'error')
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(status)
    let savedId = existing?.id
    try {
      const exam = await api.saveExamDraft({ ...payload(status), expectedUpdatedAt: existing?.updated_at }, existing?.id)
      savedId = exam.id; loadedId.current = exam.id; setExisting(exam); setQuestions(exam.questions)
      if (!form.title.trim()) setForm(f => ({ ...f, title: exam.title }))
      moveExamWorkspace(assistantWorkspaceKey, teacherWorkspaceKey('assistant', exam.id))
      if (!editId && workspaceKey) { try { localStorage.removeItem(workspaceKey) } catch { /* the saved draft is available on the server */ } }
      setSearch({ edit: exam.id }, { replace: true })
      // An unfinished password does not prevent draft saving. Valid passwords
      // are saved encrypted through the existing password endpoint.
      if (/^[A-Z0-9-]{8,20}$/i.test(form.passcode) && form.passcode !== savedPasscode.current) {
        await api.generateExamPasscode(exam.id, form.passcode)
        savedPasscode.current = form.passcode
      }
      const result = publishing && exam.status === 'draft' ? await api.publishExam(exam.id) : exam
      const refreshed = await api.getExamBuilder(exam.id)
      setExisting(refreshed.exam)
      if (publishing && exam.status === 'draft') setPublished({ ...result, passcode: form.passcode })
      else toast(exam.status === 'upcoming' ? 'Exam changes saved.' : 'Draft saved. You can finish the questions later.', 'success')
    } catch (e) {
      if (savedId) {
        try { const r = await api.getExamBuilder(savedId); setExisting(r.exam) } catch {}
      }
      toast(e.message, 'error')
    } finally { setBusy('') }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard.', 'success')).catch(() => {})

  if (loading) return <Spinner label="Loading exam draft" />
  if (loadError) return <ErrorNote message={loadError} onRetry={loadExam} />
  const scheduled = existing?.status === 'upcoming'

  return (
    <div>
      <PageHeader title={existing ? (scheduled ? 'Edit scheduled exam' : 'Edit exam draft') : 'Create exam'} subtitle="Add questions yourself or with the exam assistant. Save unfinished work as a draft, then publish when ready." actions={<Link className="btn btn-ghost btn-sm" to="/teacher/exams/manage">Manage hosted exams</Link>} />
      {existing && <p className="mb-4 text-sm text-slate-400">{scheduled ? 'Changes keep this exam scheduled. Students must not have checked in yet.' : 'Drafts are private and cannot be joined by students.'}</p>}

      <fieldset disabled={!!busy} className="grid min-w-0 gap-6 xl:grid-cols-[1fr,380px]">
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
                {(p) => <DateTime12HourInput {...p} label="Exam start" value={form.startsAt} onChange={value=>set('startsAt')({target:{value}})} />}
              </Field>
              <Field label="Ends" required error={errors.endsAt}>
                {(p) => <DateTime12HourInput {...p} label="Exam end" value={form.endsAt} onChange={value=>set('endsAt')({target:{value}})} />}
              </Field>
              <Field label="Duration (minutes)" required error={errors.durationMin} hint="Each student gets this much time from when they start, within the window above.">
                {(p) => <input {...p} type="number" min="5" max="300" className="input" value={form.durationMin} onChange={set('durationMin')} />}
              </Field>
              <Field label="Instructions for students" hint="Optional. Shown before the exam starts.">
                {(p) => <input {...p} className="input" value={form.instructions} onChange={set('instructions')} placeholder="e.g. Save your file as roll_number.py" />}
              </Field>
            </div>
          </GlassCard>

          {storageError && <p role="alert" className="text-sm text-amber-300">This browser could not keep unsaved edits. Save a draft before leaving.</p>}
          <ExamAiAssistant workspaceKey={assistantWorkspaceKey} examClass={form.class} subject={form.subject} disabled={!!busy} onBusy={setAiBusy} onApply={(items, title) => {
            setQuestions(q => [...q, ...items]); setForm(f => ({ ...f, title: f.title.trim() ? f.title : title })); setQErrors({})
            toast('Reviewed questions added. You can edit them below.', 'success')
          }} />

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
                  <input {...p} aria-label="Exam password" className="input font-sans text-lg uppercase tracking-wider" value={form.passcode} onChange={set('passcode')} spellCheck={false} />
                  <button type="button" className="btn btn-ghost" onClick={() => copy(form.passcode)} aria-label="Copy password"><Copy size={16} /></button>
                </div>
              )}
            </Field>
            <button type="button" disabled={!!busy} className="btn btn-ghost btn-sm mt-3" onClick={() => setForm((f) => ({ ...f, passcode: generatePasscode() }))}><RefreshCw size={14} aria-hidden="true" /> Generate exam password</button>
          </GlassCard>

          <GlassCard className="space-y-2.5 p-5">
            <h2 className="section-title mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-dps-neon" aria-hidden="true" /> Monitoring rules</h2>
            <p className="text-xs text-slate-400">Students see every enabled rule and must agree before starting.</p>
            <Toggle icon={Camera} label="Require webcam" description="Live camera view on your monitor" checked={settings.requireWebcam} onChange={setSetting('requireWebcam')} />
            <Toggle icon={Camera} label="AI-assisted peek review" description="Local face and iris estimates flag sustained head and eye movement together. Optional student consent, webcam required, off by default. Teacher review only." checked={settings.visionTracking === true} onChange={value => { setSetting('visionTracking')(value); if(value) setSetting('requireWebcam')(true) }} />
            <Toggle icon={MonitorUp} label="Require screen share" description="Entire screen, Chrome or Edge" checked={settings.requireScreen} onChange={setSetting('requireScreen')} />
            <Toggle icon={ShieldCheck} label="Tab-switch detection" description="Flags tab, window and fullscreen changes" checked={settings.tabDetection} onChange={setSetting('tabDetection')} />
            <Toggle icon={ClipboardX} label="Copy-paste restriction" description="Blocks and records copy, cut and paste" checked={settings.copyPasteRestriction} onChange={setSetting('copyPasteRestriction')} />
            <Toggle icon={Code2} label="Code execution and checking" description="Free browser Python preview; optional isolated auto-grading or secure teacher review" checked={settings.codeExecution} onChange={setSetting('codeExecution')} />
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm text-slate-300">{questions.length} questions | {questions.reduce((a, q) => a + (Number(q.marks) || 0), 0)} marks | Class {form.class}{form.section !== 'All' ? `-${form.section}` : ''}</p>
            {Object.keys(qErrors).length > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300"><AlertTriangle size={13} aria-hidden="true" /> {Object.keys(qErrors).length} question(s) need attention.</p>}
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => save('published')} disabled={!!busy || aiBusy}>
                {busy === 'published' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />} {scheduled ? 'Save exam changes' : 'Publish exam'}
              </button>
              {!scheduled && <button type="button" className="btn btn-ghost" onClick={() => save('draft')} disabled={!!busy || aiBusy}>
                {busy === 'draft' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />} Save as draft
              </button>}
            </div>
          </GlassCard>
        </div>
      </fieldset>

      <Modal open={!!published} onClose={() => setPublished(null)} title="Exam published" size="sm"
        footer={<>
          <Link to="/teacher/dashboard" className="btn btn-ghost">Back to dashboard</Link>
          {published && <Link to={`/teacher/exams/${published.id}/monitor`} className="btn btn-primary"><MonitorPlay size={16} aria-hidden="true" /> Open monitor</Link>}
        </>}>
        <p className="flex items-center gap-2 text-sm text-dps-neon"><CheckCircle2 size={16} aria-hidden="true" /> {published?.title} is scheduled for Class {published?.class}.</p>
        <p className="mt-4 text-xs text-slate-400">Exam password</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-xl border border-dps-gold/40 bg-dps-gold/10 px-4 py-2 font-sans text-2xl font-semibold tracking-wider text-dps-gold">{published?.passcode}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(published?.passcode)} aria-label="Copy password"><Copy size={14} /></button>
        </div>
        <p className="mt-4 text-sm text-slate-400">Students can join from {published && formatDateTime(published.startsAt)} using this password.</p>
        {published && <div className="mt-4 rounded-lg border border-white/10 p-3 text-sm">
          <p className="font-semibold">Send the correct exam link to every device</p>
          <p className="mt-1 text-xs text-slate-400">The link selects this specific exam. Share its password separately; do not include it in the URL.</p>
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => copy(`${window.location.origin}/#/student/join?exam=${encodeURIComponent(published.id)}`)}><Copy size={14}/> Copy exam link</button>
        </div>}
      </Modal>
    </div>
  )
}
