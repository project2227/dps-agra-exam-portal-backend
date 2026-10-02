import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Code2, Download, EyeOff, FileDown, Loader2, Printer, Search, ShieldAlert, XCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import StatusBadge from '../components/common/StatusBadge'
import Modal from '../components/common/Modal'
import { EmptyState, ErrorNote, Spinner } from '../components/common/Feedback'
import { useToast } from '../components/common/Toast'
import api from '../services/api'
import { CLASSES, LANGUAGES, PROCTOR_EVENTS, SECTIONS } from '../config'
import { cx, downloadCSV, formatDateTime, formatTime } from '../utils/format'

function AnswerReview({ a, index, awarded, onAward }) {
  const manual = a.type !== 'mcq'
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-2 flex flex-wrap items-start gap-2">
        <span className="font-display font-semibold text-white">Q{index + 1}</span>
        <p className="min-w-0 flex-1 text-sm text-slate-300">{a.prompt}</p>
        {a.type === 'mcq' && (a.correct ? <StatusBadge status="passed" label="Correct" /> : <StatusBadge status="failed" label="Incorrect" />)}
      </header>

      {a.type === 'code' ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-slate-400"><Code2 size={12} aria-hidden="true" /> {LANGUAGES[a.language]?.long || a.language}</p>
          <pre className="max-h-64 overflow-auto rounded-lg border border-white/[0.06] bg-navy-950 p-3 font-mono text-xs leading-relaxed text-slate-200">{a.code || 'No code submitted'}</pre>
          {a.output && <pre className="rounded-lg border border-white/[0.06] bg-navy-950/70 p-2 font-mono text-xs text-dps-neon">Output: {a.output}</pre>}
          {a.testResults?.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {a.testResults.map((t, i) => (
                <li key={t.id || i} className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium', t.passed ? 'border-dps-green/40 text-dps-neon' : 'border-red-400/40 text-red-200')}>
                  {t.hidden && <EyeOff size={10} aria-hidden="true" />}
                  {t.passed ? <CheckCircle2 size={11} aria-hidden="true" /> : <XCircle size={11} aria-hidden="true" />}
                  {t.hidden ? `Hidden ${i + 1}` : `Sample ${i + 1}`}: {t.passed ? 'passed' : 'failed'}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : a.type === 'upload' ? (
        <p className="text-sm">{a.answer ? <span className="inline-flex items-center gap-1.5 text-sky-300"><FileDown size={14} aria-hidden="true" /> {a.answer}</span> : <span className="text-slate-500">No file uploaded</span>}</p>
      ) : (
        <p className="whitespace-pre-line rounded-lg bg-navy-950/60 p-3 text-sm text-slate-100">{a.answer || <span className="text-slate-500">Not answered</span>}</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <label htmlFor={`award-${a.questionId}`} className="text-slate-400">{manual ? 'Marks awarded' : 'Auto marks'}</label>
        <input id={`award-${a.questionId}`} type="number" min="0" max={a.marks} step="0.5" className="input w-20 py-1.5 text-center" value={awarded ?? ''} onChange={(e) => onAward(e.target.value === '' ? null : Math.min(a.marks, Math.max(0, Number(e.target.value))))} placeholder="-" />
        <span className="text-slate-500">/ {a.marks}</span>
      </div>
    </article>
  )
}

export default function Submissions() {
  const [search] = useSearchParams()
  const toast = useToast()
  const [exams, setExams] = useState([])
  const [filters, setFilters] = useState({ class: '', section: '', examId: search.get('examId')||'', roll: search.get('roll')||'' })
  const [rollInput, setRollInput] = useState(search.get('roll')||'')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [awards, setAwards] = useState({})
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [printMode, setPrintMode] = useState('list')

  useEffect(() => { api.getTeacherExams().then(setExams).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(() => setFilters((f) => ({ ...f, roll: rollInput.trim() })), 350); return () => clearTimeout(t) }, [rollInput])
  useEffect(() => {
    setRows(null); setError('')
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.getSubmissions(params).then(setRows).catch((e) => setError(e.message))
  }, [filters])
  useEffect(() => {
    const after = () => setPrintMode('list')
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [])

  const examOptions = useMemo(() => exams.filter((e) => !filters.class || e.class === filters.class), [exams, filters.class])
  const sorted = useMemo(() => (rows || []).slice().sort((a, b) => a.examTitle.localeCompare(b.examTitle) || a.student.rollNumber.localeCompare(b.student.rollNumber, undefined, { numeric: true })), [rows])
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'class' ? { examId: '' } : {}) }))

  const openReview = (s) => {
    setOpen(s)
    setAwards(Object.fromEntries(s.answers.map((a) => [a.questionId, a.awarded])))
    setRemarks(s.remarks || '')
  }
  const total = open ? Object.values(awards).reduce((a, v) => a + (Number(v) || 0), 0) : 0

  const saveReview = async () => {
    setSaving(true)
    try {
      const answers = open.answers.map((a) => ({ ...a, awarded: awards[a.questionId] }))
      const updated = await api.saveSubmissionReview(open.id, { answers, remarks, score: total })
      setRows((r) => r.map((x) => (x.id === open.id ? { ...x, ...updated, answers, remarks, score: total, status: 'reviewed' } : x)))
      toast('Review saved.', 'success')
      setOpen(null)
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const exportCSV = () => {
    if (!sorted.length) return toast('Nothing to export for these filters.', 'info')
    const header = ['Exam', 'Roll number', 'Name', 'Class', 'Section', 'Submitted at', 'Score', 'Total', 'Flags', 'Status', 'Remarks']
    downloadCSV(`dps-agra-submissions-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...sorted.map((s) => [s.examTitle, s.student.rollNumber, s.student.name, s.student.class, s.student.section, formatDateTime(s.submittedAt), s.score, s.totalMarks, s.flagsCount, s.status, s.remarks || '']),
    ])
  }
  const printList = () => { setPrintMode('list'); setTimeout(() => window.print(), 50) }
  const printSingle = () => { setPrintMode('single'); setTimeout(() => window.print(), 50) }

  return (
    <div>
      <PageHeader title="Submissions & results" subtitle="Review answers, code output and test results, check integrity flags, add remarks and export."
        actions={<>
          <button type="button" className="btn btn-ghost" onClick={exportCSV}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="btn btn-ghost" onClick={printList}><Printer size={16} aria-hidden="true" /> Export PDF</button>
        </>} />

      <GlassCard className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span className="label">Class</span>
          <select className="input" value={filters.class} onChange={setF('class')}><option value="">All classes</option>{CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}</select>
        </label>
        <label className="block"><span className="label">Section</span>
          <select className="input" value={filters.section} onChange={setF('section')}><option value="">All sections</option>{SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}</select>
        </label>
        <label className="block"><span className="label">Exam</span>
          <select className="input" value={filters.examId} onChange={setF('examId')}><option value="">All exams</option>{examOptions.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.class})</option>)}</select>
        </label>
        <label className="block"><span className="label">Roll number</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input className="input pl-9" value={rollInput} onChange={(e) => setRollInput(e.target.value)} placeholder="e.g. 07" inputMode="numeric" />
          </span>
        </label>
      </GlassCard>

      {error && <ErrorNote message={error} />}
      {!rows && !error ? <Spinner label="Loading submissions" /> : rows && sorted.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No submissions found">Change the filters, or wait for students to submit.</EmptyState>
      ) : rows && (
        <GlassCard className={cx('overflow-hidden', printMode === 'list' && 'print-area')}>
          <div className="print-only p-4">
            <h2 className="text-xl font-semibold">DPS Agra Exam Portal: Results</h2>
            <p className="text-sm">Generated {formatDateTime(new Date())}{filters.class && ` | Class ${filters.class}`}{filters.section && `-${filters.section}`}</p>
          </div>
          <div className="relative max-w-full overflow-x-auto" role="region" aria-label="Exam submissions" tabIndex={0}>
            <table className="table-base">
              <thead>
                <tr><th>Roll</th><th>Name</th><th>Class</th><th>Exam</th><th>Submitted</th><th>Score</th><th>Flags</th><th>Status</th><th className="no-print"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular-nums">{s.student.rollNumber}</td>
                    <td className="font-medium text-white">{s.student.name}</td>
                    <td>{s.student.class}-{s.student.section}</td>
                    <td className="max-w-[240px] truncate" title={s.examTitle}>{s.examTitle}</td>
                    <td className="whitespace-nowrap">{formatDateTime(s.submittedAt)}</td>
                    <td className="font-semibold text-white">{s.score}<span className="text-slate-500">/{s.totalMarks}</span></td>
                    <td>{s.flagsCount ? <StatusBadge status="flagged" label={`${s.flagsCount}`} /> : <span className="text-slate-500">0</span>}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="no-print text-right"><button type="button" className="btn btn-ghost btn-sm" onClick={() => openReview(s)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500">{sorted.length} submission{sorted.length === 1 ? '' : 's'}</p>
        </GlassCard>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} size="xl" title={open ? `${open.student.name} | Roll ${open.student.rollNumber}` : ''}
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={printSingle}><Printer size={16} aria-hidden="true" /> Print</button>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={saveReview} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save review</button>
        </>}>
        {open && (
          <div className={cx('space-y-4', printMode === 'single' && 'print-area')}>
            <div className="print-only"><h2 className="text-xl font-semibold">{open.student.name} (Roll {open.student.rollNumber})</h2></div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="chip">Class {open.student.class}-{open.student.section}</span>
              <span className="chip">{open.examTitle}</span>
              <span className="chip">Submitted {formatDateTime(open.submittedAt)}</span>
              <span className="chip border-dps-gold/30 text-dps-gold">Score {total} / {open.totalMarks}</span>
              <StatusBadge status={open.status} />
            </div>

            <section className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={15} className="text-red-300" aria-hidden="true" /> Integrity flags ({open.flags?.length || 0})</h3>
              {open.flags?.length ? (
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {open.flags.map((f, i) => (
                    <li key={i} className="flex items-center gap-2"><span className="w-16 tabular-nums text-xs text-slate-500">{formatTime(f.ts)}</span> {PROCTOR_EVENTS[f.type]?.label || f.type}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400">No flags recorded.</p>}
              {open.device && <p className="mt-2 text-xs text-slate-500">{open.device.browser} | {open.device.os} | {open.device.screen} | {open.device.timezone}</p>}
            </section>

            {open.answers.map((a, i) => (
              <AnswerReview key={a.questionId} a={a} index={i} awarded={awards[a.questionId]} onAward={(v) => setAwards((x) => ({ ...x, [a.questionId]: v }))} />
            ))}

            <div>
              <label htmlFor="remarks" className="label">Teacher remarks</label>
              <textarea id="remarks" className="input min-h-[90px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Feedback for the student or notes on flags reviewed" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
