import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CalendarClock, ClipboardCheck, FilePlus2, FileText, MonitorPlay, ShieldAlert, Users, UserPlus, Archive, LayoutGrid } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import ClassCard from '../components/teacher/ClassCard'
import ExamCard from '../components/student/ExamCard'
import GlassCard from '../components/common/GlassCard'
import { EmptyState, ErrorNote } from '../components/common/Feedback'
import api from '../services/api'
import { getTeacherAuth } from '../services/session'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function TeacherDashboard() {
  const teacher = getTeacherAuth()?.teacher
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = () => { setError(''); api.getTeacherOverview().then(setData).catch((e) => setError(e.message)) }
  useEffect(load, [])
  const st = data?.stats || {}
  const loading = !data && !error

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${teacher?.name?.split(' ').slice(0, 2).join(' ') || 'Teacher'}`}
        subtitle="Here is what is happening across the computer labs today."
        actions={<>
          <Link to="/teacher/exams/create" className="btn btn-primary"><FilePlus2 size={16} aria-hidden="true" /> Create exam</Link>
          <Link to="/teacher/handouts" className="btn btn-ghost"><FileText size={16} aria-hidden="true" /> Upload handout</Link>
          <Link to="/teacher/exams/manage" className="btn btn-ghost"><Archive size={16} aria-hidden="true" /> Manage hosted exams</Link>
          {teacher?.role==='admin' && <Link to="/teacher/manage-teachers" className="btn btn-ghost"><UserPlus size={16} aria-hidden="true" /> Enroll teachers</Link>}
        </>}
      />
      {error && <ErrorNote message={error} onRetry={load} />}
      {data && teacher?.role==='admin' && data.activeExams.length===0 && data.upcomingExams.length===0 && Number(st.totalSubmissions||0)===0 && (
        <section className="glass motion-surface border-dps-neon/30 p-6" aria-label="Your new classroom checklist">
          <p className="text-sm text-dps-neon">Your new classroom</p>
          <h2 className="mt-3 text-2xl font-bold">Set up your classroom</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Your classroom is empty and ready. Create a small exam first, add study resources, then invite educators whose access you have verified.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn btn-primary btn-sm" to="/teacher/exams/create"><FilePlus2 size={15}/> Create your first exam</Link>
            <Link className="btn btn-ghost btn-sm" to="/teacher/courses"><FileText size={15}/> Publish a course</Link>
            <Link className="btn btn-ghost btn-sm" to="/teacher/manage-teachers"><UserPlus size={15}/> Enroll educators</Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Overview">
        <StatCard icon={Activity} label="Active exams" value={st.activeExams} accent="green" loading={loading} hint="Live right now" />
        <StatCard icon={CalendarClock} label="Upcoming exams" value={st.upcomingExams} accent="sky" loading={loading} hint="Scheduled" />
        <StatCard icon={ClipboardCheck} label="Total submissions" value={st.totalSubmissions} accent="gold" loading={loading} hint="All exams" />
        <StatCard icon={ShieldAlert} label="Activity flags" value={st.cheatingFlags} accent="red" loading={loading} hint="Need review" />
        <StatCard icon={FileText} label="Uploaded handouts" value={st.handouts} accent="orange" loading={loading} hint="Shared with classes" />
      </section>

      {data && (
        <div className="grid gap-6 xl:grid-cols-5">
          <section className="xl:col-span-3" aria-labelledby="live-title">
            <h2 id="live-title" className="section-title mb-3 flex items-center gap-2"><MonitorPlay size={18} className="text-dps-neon" aria-hidden="true" /> Live exams</h2>
            {data.activeExams.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.activeExams.map((e) => (
                  <ExamCard key={e.id} exam={e} actions={<>
                    <Link to={`/teacher/exams/${e.id}/monitor`} className="btn btn-primary btn-sm"><MonitorPlay size={14} aria-hidden="true" /> Open monitor</Link>
                    <Link to={`/teacher/exams/${e.id}/monitor?view=wall`} className="btn btn-ghost btn-sm"><LayoutGrid size={14} aria-hidden="true" /> Screen wall</Link>
                    {e.joined != null && <span className="chip"><Users size={12} aria-hidden="true" /> {e.joined} joined</span>}
                  </>} />
                ))}
              </div>
            ) : (
              <EmptyState icon={MonitorPlay} title="No exam is live" action={<Link to="/teacher/exams/create" className="btn btn-primary btn-sm">Create exam</Link>}>Published exams go live automatically at their start time.</EmptyState>
            )}
          </section>
          <section className="xl:col-span-2" aria-labelledby="up-title">
            <h2 id="up-title" className="section-title mb-3 flex items-center gap-2"><CalendarClock size={18} className="text-sky-300" aria-hidden="true" /> Upcoming</h2>
            <GlassCard className="divide-y divide-white/[0.06]">
              {data.upcomingExams.length ? data.upcomingExams.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] font-display text-sm font-semibold">{e.class}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{e.title}</p>
                    <p className="text-xs text-slate-400">{new Date(e.startsAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} | {e.type}</p>
                  </div>
                  <span className="kbd">{e.passcode || 'passcode set'}</span>
                </div>
              )) : <p className="p-4 text-sm text-slate-400">Nothing scheduled.</p>}
            </GlassCard>
          </section>
        </div>
      )}

      {data && (
        <section aria-labelledby="classes-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="classes-title" className="section-title">Classes</h2>
            <Link to="/teacher/classes" className="text-sm text-dps-neon hover:underline">Manage classes</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {data.classes.length===0 && <EmptyState icon={Users} title="No classes yet" action={<Link to="/teacher/classes" className="btn btn-ghost btn-sm">Manage classes</Link>}>Add your class and its student roster.</EmptyState>}
            {data.classes.map((c) => <ClassCard key={c.id} cls={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}
