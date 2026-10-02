import StudentRoster from '../components/teacher/StudentRoster'
import { getTeacherAuth } from '../services/session'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Info, MonitorPlay, Search, UserRound, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import StatusBadge from '../components/common/StatusBadge'
import { EmptyState, ErrorNote, Spinner } from '../components/common/Feedback'
import { flagTotal } from '../components/proctoring/StudentMonitorCard'
import api from '../services/api'
import { cx, formatDate, formatDateTime } from '../utils/format'

export default function ClassManagement() {
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [exams, setExams] = useState([])
  const [participants, setParticipants] = useState(null)
  const [error, setError] = useState('')
  const [section, setSection] = useState('')
  const [examId, setExamId] = useState('')
  const [query, setQuery] = useState('')
  const active = params.get('class') || classes[0]?.name

  useEffect(() => {
    Promise.all([api.getClasses(), api.getTeacherExams()])
      .then(([c, e]) => { setClasses(c); setExams(e) })
      .catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!active) return
    setParticipants(null); setSection(''); setExamId('')
    api.getParticipants({ class: active }).then(setParticipants).catch((e) => setError(e.message))
  }, [active])

  const cls = classes.find((c) => c.name === active)
  const classExams = exams.filter((e) => e.class === active)
  const rows = useMemo(() => (participants || [])
    .filter((p) => (!section || p.section === section) && (!examId || p.examId === examId))
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.rollNumber.includes(query))
    .sort((a, b) => a.section.localeCompare(b.section) || a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })), [participants, section, examId, query])

  return (
    <div>
      <PageHeader title="Classes" subtitle="Manage school-issued student accounts, class details and exam participation. Students still need the exam passcode to join." />
      {getTeacherAuth()?.teacher?.role === 'admin' && !loading && !classes.length && !error && (
        <div className="mb-5 rounded-xl border border-dps-gold/40 p-4">
          <p className="mb-2 text-sm">Initialize VI–XII and sections A–F before creating exams. This creates class groups only, not student enrollment.</p>
          <button className="btn btn-primary" type="button" onClick={async () => {
            try { await api.initializeClasses(); setClasses(await api.getClasses()) }
            catch (err) { setError(err.message) }
          }}>Initialize school classes</button>
        </div>
      )}
      {error && <ErrorNote message={error} />}

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Class">
        {classes.map((c) => (
          <button key={c.name} role="tab" aria-selected={c.name === active} type="button" onClick={() => setParams({ class: c.name })}
            className={cx('min-w-[64px] rounded-xl border px-4 py-2 font-display font-semibold transition', c.name === active ? 'border-dps-green/50 bg-dps-green/15 text-white shadow-glow' : 'border-white/10 text-slate-400 hover:text-white')}>
            {c.name}
            {c.activeExam && <span className="live-dot ml-2 inline-block align-middle" aria-label="exam live" />}
          </button>
        ))}
      </div>

      {cls && <StudentRoster className={active} sections={cls.sections} />}
      {!cls ? loading ? <Spinner label="Loading classes" /> : !error ? <EmptyState icon={Users} title="No classes available">Ask your administrator to assign your teaching classes.</EmptyState> : null : (
        <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
          <div className="space-y-4">
            <GlassCard glow className="p-5">
              <p className="text-xs text-slate-400">Class</p>
              <p className="font-display text-4xl font-bold">{cls.name}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Computer teacher</dt><dd className="flex items-center gap-2 text-white"><UserRound size={14} aria-hidden="true" /> {cls.teacher || 'Not assigned'}</dd></div>
                <div>
                  <dt className="text-xs text-slate-500">Sections</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {cls.sections.map((s) => (
                      <button key={s} type="button" onClick={() => setSection(section === s ? '' : s)} aria-pressed={section === s}
                        className={cx('rounded-lg border px-2.5 py-1 text-xs font-semibold', section === s ? 'border-dps-gold/50 bg-dps-gold/15 text-dps-gold' : 'border-white/10 text-slate-300')}>
                        {cls.name}-{s}
                      </button>
                    ))}
                  </dd>
                </div>
                <div><dt className="text-xs text-slate-500">Handouts</dt><dd className="flex items-center gap-2"><FileText size={14} aria-hidden="true" /> {cls.handoutCount} shared <Link className="text-dps-neon hover:underline" to="/teacher/handouts">Manage</Link></dd></div>
                <div><dt className="text-xs text-slate-500">Next exam</dt><dd>{cls.nextExamDate ? formatDate(cls.nextExamDate) : 'None scheduled'}</dd></div>
              </dl>
            </GlassCard>

            <GlassCard className="p-5">
              <h2 className="mb-3 font-semibold">Exams for Class {cls.name}</h2>
              {classExams.length ? (
                <ul className="space-y-2">
                  {classExams.map((e) => (
                    <li key={e.id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{e.title}</p>
                        <StatusBadge status={e.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(e.startsAt)} | Section {e.section}</p>
                      {e.status === 'live' && <Link to={`/teacher/exams/${e.id}/monitor`} className="btn btn-primary btn-sm mt-2"><MonitorPlay size={13} aria-hidden="true" /> Monitor</Link>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400">No exams yet. <Link to="/teacher/exams/create" className="text-dps-neon hover:underline">Create one</Link>.</p>}
            </GlassCard>
          </div>

          <GlassCard className="min-w-0 p-5">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="mr-auto">
                <h2 className="font-semibold">Exam participation records</h2>
                <p className="text-xs text-slate-400">{rows.length} record{rows.length === 1 ? '' : 's'}{section ? ` in section ${section}` : ''}</p>
              </div>
              <label className="text-sm text-slate-400">
                <span className="sr-only">Filter by exam</span>
                <select className="input py-2" value={examId} onChange={(e) => setExamId(e.target.value)}>
                  <option value="">All exams</option>
                  {classExams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </label>
              <label className="relative">
                <span className="sr-only">Search students</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input className="input py-2 pl-9" placeholder="Name or roll" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>
            {!participants ? <Spinner label="Loading records" /> : rows.length === 0 ? (
              <EmptyState icon={Users} title="No students yet">Students appear here after they join an exam for this class.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>Roll</th><th>Name</th><th>Section</th><th>Exam</th><th>Joined</th><th>Status</th><th>Flags</th><th>Score</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const f = flagTotal(p.flags)
                      return (
                        <tr key={p.sessionId}>
                          <td className="font-sans">{p.rollNumber}</td>
                          <td className="font-medium text-white">{p.name}</td>
                          <td>{p.class}-{p.section}</td>
                          <td className="max-w-[220px] truncate" title={p.examTitle}>{p.examTitle}</td>
                          <td className="whitespace-nowrap">{formatDateTime(p.joinedAt)}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td>{f ? <StatusBadge status="flagged" label={`${f} flag${f === 1 ? '' : 's'}`} /> : <span className="text-slate-500">None</span>}</td>
                          <td>{p.score ?? <span className="text-slate-500">-</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Info size={13} aria-hidden="true" /> Records are created per exam session. The same student may appear once per exam.</p>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
