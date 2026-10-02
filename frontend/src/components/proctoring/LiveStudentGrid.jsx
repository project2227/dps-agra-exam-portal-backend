import { useMemo, useState } from 'react'
import { LayoutGrid, Rows3, Search, Users } from 'lucide-react'
import StudentMonitorCard, { flagTotal } from './StudentMonitorCard'
import { EmptyState } from '../common/Feedback'
import { compareAttention } from '../../utils/monitorAttention'
import { cx } from '../../utils/format'

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['flagged', 'Flagged'],
  ['submitted', 'Submitted'],
  ['disconnected', 'Offline'],
]
const SORTS = {
  attention: { label: 'Attention needed', fn: compareAttention },
  roll: { label: 'Roll number', fn: (a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }) },
  flags: { label: 'Most flags', fn: (a, b) => flagTotal(b.flags) - flagTotal(a.flags) },
  name: { label: 'Name', fn: (a, b) => a.name.localeCompare(b.name) },
  saved: { label: 'Least recently saved', fn: (a, b) => new Date(a.lastSavedAt) - new Date(b.lastSavedAt) },
}

export default function LiveStudentGrid({ students = [], snapshots = {}, selectedId, onSelect, now }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('attention')
  const [compact, setCompact] = useState(false)

  const counts = useMemo(() => ({
    all: students.length,
    active: students.filter((s) => s.status === 'active').length,
    flagged: students.filter((s) => flagTotal(s.flags) > 0).length,
    submitted: students.filter((s) => s.status === 'submitted').length,
    disconnected: students.filter((s) => s.status === 'disconnected').length,
  }), [students])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students
      .filter((s) => (filter === 'all' ? true : filter === 'flagged' ? flagTotal(s.flags) > 0 : s.status === filter))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.rollNumber.includes(q))
      .sort(SORTS[sort].fn)
  }, [students, filter, query, sort])

  return (
    <section aria-label="Students in this exam">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter students">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
              className={cx('rounded-lg border px-3 py-1.5 text-sm transition', filter === key ? 'border-dps-green/50 bg-dps-green/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
              {label} <span className="ml-1 text-xs opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
          <label className="relative min-w-[200px] flex-1 xl:max-w-xs">
            <span className="sr-only">Search by name or roll number</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input className="input py-2 pl-9" placeholder="Search name or roll" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Sort
            <select className="input w-auto py-2" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="inline-flex rounded-xl border border-white/10 p-1" role="group" aria-label="Card size">
            <button type="button" onClick={() => setCompact(false)} aria-pressed={!compact} className={cx('rounded-lg p-1.5', !compact ? 'bg-white/10 text-white' : 'text-slate-400')} title="Detailed cards"><LayoutGrid size={16} aria-hidden="true" /><span className="sr-only">Detailed cards</span></button>
            <button type="button" onClick={() => setCompact(true)} aria-pressed={compact} className={cx('rounded-lg p-1.5', compact ? 'bg-white/10 text-white' : 'text-slate-400')} title="Compact cards"><Rows3 size={16} aria-hidden="true" /><span className="sr-only">Compact cards</span></button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Users} title={students.length ? 'No students match' : 'Waiting for students'}>
          {students.length ? 'Try another filter or search.' : 'Students appear here as soon as they join with the exam password.'}
        </EmptyState>
      ) : (
        <div className={cx('grid gap-3', compact ? 'grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6' : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5')}>
          {visible.map((s) => (
            <StudentMonitorCard key={s.sessionId} student={s} snapshot={snapshots[s.sessionId]} selected={selectedId === s.sessionId} onOpen={onSelect} compact={compact} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}
