import { useEffect, useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import CalendarList from '../components/common/CalendarList'
import Modal from '../components/common/Modal'
import { Field } from '../components/common/Field'
import { ErrorNote, Spinner } from '../components/common/Feedback'
import { useToast } from '../components/common/Toast'
import api from '../services/api'
import { CLASSES, SECTIONS } from '../config'
import { fromLocalInput } from '../utils/format'

const TYPES = ['Practical', 'Quiz', 'Theory', 'Mixed', 'Other']
const blank = () => ({ title: '', class: 'XII', section: 'All', date: '', type: 'Practical', notes: '' })

export default function ExamDates() {
  const toast = useToast()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [filterClass, setFilterClass] = useState('')

  const load = () => { setError(''); api.getExamDates().then(setEvents).catch((e) => setError(e.message)) }
  useEffect(load, [])
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: '' })) }

  const add = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Enter what the exam is.'
    if (!form.date) errs.date = 'Choose the date and time.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const d = await api.createExamDate({ ...form, title: form.title.trim(), date: fromLocalInput(form.date) })
      setEvents((ev) => [...(ev || []), d])
      setForm((f) => ({ ...blank(), class: f.class, type: f.type }))
      toast('Exam date added. Students of this class can now see it.', 'success')
    } catch (err) { toast(err.message, 'error') } finally { setSaving(false) }
  }

  const remove = async () => {
    const d = confirm
    setConfirm(null)
    try { await api.deleteExamDate(d.id); setEvents((ev) => ev.filter((x) => x.id !== d.id)); toast('Exam date removed.', 'success') } catch (e) { toast(e.message, 'error') }
  }

  const shown = (events || []).filter((e) => !filterClass || e.class === filterClass)

  return (
    <div>
      <PageHeader title="Exam dates" subtitle="Publish the schedule for practicals, quizzes and theory papers. Students see upcoming dates for their class on their dashboard." />
      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <form onSubmit={add} noValidate>
          <GlassCard glow className="space-y-4 p-5 xl:sticky xl:top-20">
            <h2 className="section-title flex items-center gap-2"><CalendarPlus size={18} className="text-dps-gold" aria-hidden="true" /> Add exam date</h2>
            <Field label="Title" required error={errors.title}>{(p) => <input {...p} className="input" value={form.title} onChange={set('title')} placeholder="e.g. Python Practical Exam" />}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class">{(p) => <select {...p} className="input" value={form.class} onChange={set('class')}>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}</select>}</Field>
              <Field label="Section">{(p) => <select {...p} className="input" value={form.section} onChange={set('section')}><option value="All">All</option>{SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>}</Field>
            </div>
            <Field label="Date and time" required error={errors.date}>{(p) => <input {...p} type="datetime-local" className="input" value={form.date} onChange={set('date')} />}</Field>
            <Field label="Type">{(p) => <select {...p} className="input" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>}</Field>
            <Field label="Notes" hint="Syllabus, lab number or things to bring">{(p) => <textarea {...p} className="input min-h-[64px]" value={form.notes} onChange={set('notes')} />}</Field>
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CalendarPlus size={16} aria-hidden="true" />} Add to schedule</button>
          </GlassCard>
        </form>

        <GlassCard className="p-5">
          <div className="mb-2 flex justify-end">
            <label className="flex items-center gap-2 text-sm text-slate-400">Class
              <select className="input w-auto py-2" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All</option>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {error && <ErrorNote message={error} onRetry={load} />}
          {!events && !error ? <Spinner label="Loading schedule" /> : <CalendarList events={shown} defaultView="calendar" onDelete={setConfirm} />}
        </GlassCard>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Remove exam date?" size="sm"
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={remove}>Remove</button></>}>
        <p className="text-sm text-slate-300">"{confirm?.title}" for Class {confirm?.class} will be removed from the student schedule.</p>
      </Modal>
    </div>
  )
}
