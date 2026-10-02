import { useEffect, useMemo, useState } from 'react'
import { FileText, UploadCloud } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import UploadBox from '../components/common/UploadBox'
import HandoutCard from '../components/student/HandoutCard'
import Modal from '../components/common/Modal'
import { Field } from '../components/common/Field'
import { EmptyState, ErrorNote, Spinner } from '../components/common/Feedback'
import { useToast } from '../components/common/Toast'
import api from '../services/api'
import { CLASSES, SECTIONS } from '../config'
import { cx } from '../utils/format'

const ACCEPT = '.pdf,.txt,.docx,.pptx,.png,.jpg,.jpeg'

export default function Handouts() {
  const toast = useToast()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ title: '', description: '', class: 'IX', sections: ['All'] })
  const [progress, setProgress] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)

  const load = () => { setError(''); api.getHandouts().then(setList).catch((e) => setError(e.message)) }
  useEffect(load, [])

  const toggleSection = (s) => setForm(f => ({ ...f, sections:[s] }))

  const onFiles = (fs) => {
    if(fs[0]?.name.toLowerCase().endsWith('.txt') && fs[0].size>2*1024*1024){
      setErrors(e=>({...e,file:'Text files must be 2 MB or smaller.'}))
      return
    }
    setFiles(fs)
    if (fs[0] && !form.title) setForm((f) => ({ ...f, title: fs[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }))
    setErrors((e) => ({ ...e, file: '' }))
  }

  const upload = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!files[0]) errs.file = 'Choose a file to upload.'
    if (!form.title.trim()) errs.title = 'Add a title students will recognise.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setProgress(0)
    try {
      const h = await api.uploadHandout({ file: files[0], ...form, title: form.title.trim() }, setProgress)
      setList((l) => [h, ...(l || []).filter((x) => x.id !== h.id)])
      setFiles([]); setForm((f) => ({ ...f, title: '', description: '' }))
      toast('Handout uploaded and shared.', 'success')
    } catch (err) { toast(err.message, 'error') } finally { setProgress(null) }
  }

  const remove = async () => {
    const h = confirm
    setConfirm(null)
    try { await api.deleteHandout(h.id); setList((l) => l.filter((x) => x.id !== h.id)); toast('Handout deleted.', 'success') } catch (e) { toast(e.message, 'error') }
  }

  const shown = useMemo(() => (list || []).filter((h) => !filterClass || h.class === filterClass), [list, filterClass])

  return (
    <div>
      <PageHeader title="Handouts" subtitle="Share notes, PDFs, slides and sample programs. Students in the selected class and section can download them after joining an exam." />
      <div className="grid gap-6 xl:grid-cols-[400px,1fr]">
        <form onSubmit={upload} noValidate>
          <GlassCard glow className="space-y-4 p-5 xl:sticky xl:top-20">
            <p className="text-xs text-slate-400">Small-file storage uses Neon with a shared 64 MB quota. Avoid uploading personal or confidential student information.</p>
            <h2 className="section-title flex items-center gap-2"><UploadCloud size={18} className="text-dps-neon" aria-hidden="true" /> Upload a handout</h2>
            <div>
              <UploadBox accept={ACCEPT} maxSizeMB={5} files={files} onFiles={onFiles} disabled={progress !== null} hint="PDF, DOCX, PPTX, PNG or JPG up to 5 MB; TXT up to 2 MB. For large files, use private S3 storage." />
              {errors.file && <p className="error-text" role="alert">{errors.file}</p>}
            </div>
            <Field label="Title" required error={errors.title}>
              {(p) => <input {...p} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
            </Field>
            <Field label="Description" hint="Optional">
              {(p) => <textarea {...p} className="input min-h-[64px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
            </Field>
            <Field label="Class">
              {(p) => <select {...p} className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>{CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}</select>}
            </Field>
            <fieldset>
              <legend className="label">Visible to sections</legend>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...SECTIONS].map((s) => {
                  const on = form.sections.includes(s)
                  return (
                    <button key={s} type="button" aria-pressed={on} onClick={() => toggleSection(s)}
                      className={cx('rounded-lg border px-3 py-1.5 text-sm font-medium', on ? 'border-dps-green/50 bg-dps-green/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
                      {s === 'All' ? 'All sections' : s}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            {progress !== null && (
              <div aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-dps-green" style={{ width: `${progress}%` }} /></div>
                <p className="mt-1 text-xs text-slate-400">Uploading {progress}%</p>
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={progress !== null}>
              {progress !== null ? <span className="loader-code" aria-hidden="true"><i/><i/><i/></span> : <UploadCloud size={16} aria-hidden="true" />} Upload and share
            </button>
          </GlassCard>
        </form>

        <section aria-labelledby="list-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="list-title" className="section-title">Shared handouts {list && <span className="text-sm font-normal text-slate-500">({shown.length})</span>}</h2>
            <label className="flex items-center gap-2 text-sm text-slate-400">Class
              <select className="input w-auto py-2" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All</option>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {error && <ErrorNote message={error} onRetry={load} />}
          {!list && !error ? <Spinner label="Loading handouts" /> : shown.length === 0 ? (
            <EmptyState icon={FileText} title="No handouts yet">Upload the first one using the form.</EmptyState>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">{shown.map((h) => <HandoutCard key={h.id} handout={h} onDelete={setConfirm} />)}</div>
          )}
        </section>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete handout?" size="sm"
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={remove}>Delete</button></>}>
        <p className="text-sm text-slate-300">"{confirm?.title}" will be removed for all students in Class {confirm?.class}.</p>
      </Modal>
    </div>
  )
}
