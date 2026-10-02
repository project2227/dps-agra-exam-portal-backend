import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, CheckCircle2, Code2, FileText, Info, PlayCircle, TerminalSquare } from 'lucide-react'
import Breadcrumbs from '../components/common/Breadcrumbs'
import StudentHeader from '../components/layout/StudentHeader'
import Footer from '../components/layout/Footer'
import GlassCard from '../components/common/GlassCard'
import ExamCard from '../components/student/ExamCard'
import HandoutCard from '../components/student/HandoutCard'
import CalendarList from '../components/common/CalendarList'
import { EmptyState, ErrorNote, Spinner } from '../components/common/Feedback'
import api from '../services/api'
import { getStudentSession } from '../services/session'
import { CLASS_LANGUAGES, LANGUAGES } from '../config'
import { examStatus, initials } from '../utils/format'

const INSTRUCTIONS = [
  'Sit at the computer allotted to you and keep your ID card on the desk.',
  'Keep the exam in fullscreen. Do not switch tabs, windows or apps until you submit.',
  'Answers save automatically. If the internet drops, keep working; they save again when it returns.',
  'For programs, press Run to test with your own input, then Submit code to check against test cases.',
  'Review your answers, then press Submit answers when you have finished. You cannot reopen the exam afterwards.',
  'If something goes wrong, raise your hand. Do not close the browser.',
]

export default function StudentDashboard() {
  const session = getStudentSession()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    api.getStudentDashboard().then(setData).catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const student = data?.student || session?.student
  const current = data?.currentExam
  const currentStatus = current ? current.status || examStatus(current) : null
  const submitted = session?.submittedExamIds?.includes(current?.id)
  const ides = CLASS_LANGUAGES[student?.class] || ['python']

  return (
    <div className="flex min-h-screen flex-col">
      <StudentHeader title="Student dashboard" />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <Breadcrumbs/><GlassCard glow className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-dps-green font-display text-2xl font-bold text-white" aria-hidden="true">
            {initials(student?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-400">Welcome</p>
            <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">{student?.name}</h1>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[['Roll no.', student?.rollNumber], ['Class', student?.class], ['Section', student?.section]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-display text-lg font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>

        {error && <ErrorNote message={error} onRetry={load} />}
        {!data && !error && <Spinner label="Loading your dashboard" />}

        {data && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section aria-labelledby="current-title">
                <h2 id="current-title" className="section-title mb-3 flex items-center gap-2"><PlayCircle size={18} className="text-dps-neon" aria-hidden="true" /> Current exam</h2>
                {current ? (
                  <ExamCard
                    exam={current}
                    actions={
                      submitted ? (
                        <span className="inline-flex items-center gap-2 text-sm text-dps-gold"><CheckCircle2 size={16} aria-hidden="true" /> You have submitted this exam.</span>
                      ) : currentStatus === 'live' ? (
                        <Link to={`/student/exam/${current.id}`} className="btn btn-primary"><PlayCircle size={16} aria-hidden="true" /> Enter exam room</Link>
                      ) : (
                        <span className="text-sm text-slate-400">{currentStatus === 'upcoming' ? 'The exam room opens at the start time.' : 'This exam has ended.'}</span>
                      )
                    }
                  />
                ) : (
                  <EmptyState icon={PlayCircle} title="No current exam">Join an exam with the password from your teacher.</EmptyState>
                )}
              </section>

              <section aria-labelledby="upcoming-title">
                <h2 id="upcoming-title" className="section-title mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-dps-gold" aria-hidden="true" /> Upcoming exams</h2>
                {data.upcomingExams?.length ? (
                  <div className="grid gap-3 md:grid-cols-2">{data.upcomingExams.map((e) => <ExamCard key={e.id} exam={e} />)}</div>
                ) : (
                  <EmptyState icon={CalendarDays} title="Nothing scheduled">New exams for your class will appear here.</EmptyState>
                )}
              </section>

              <section aria-labelledby="handouts-title">
                <h2 id="handouts-title" className="section-title mb-3 flex items-center gap-2"><FileText size={18} className="text-dps-orange" aria-hidden="true" /> Handouts from your teacher</h2>
                {data.handouts?.length ? (
                  <div className="grid gap-3 md:grid-cols-2">{data.handouts.map((h) => <HandoutCard key={h.id} handout={h} />)}</div>
                ) : (
                  <EmptyState icon={FileText} title="No handouts yet">Notes and practical file formats shared for your class show up here.</EmptyState>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <GlassCard className="p-5">
                <h2 className="section-title mb-1 flex items-center gap-2"><TerminalSquare size={18} className="text-dps-neon" aria-hidden="true" /> Practice IDEs</h2>
                <p className="mb-4 text-sm text-slate-400">Languages for Class {student?.class}. Your IDE drafts stay on this computer. Course and practice-test progress syncs when you sign in.</p>
                <div className="grid gap-2">
                  {ides.map((l) => (
                    <Link key={l} to={`/student/practice/${l}`} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-dps-green/40 hover:bg-dps-green/[0.06]">
                      <Code2 size={18} className="text-dps-neon" aria-hidden="true" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-white">{LANGUAGES[l].label}</span>
                        <span className="block text-xs text-slate-500">{LANGUAGES[l].long}</span>
                      </span>
                      <span className="text-xs text-slate-500 group-hover:text-dps-neon">Open</span>
                    </Link>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h2 className="section-title mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-dps-gold" aria-hidden="true" /> Exam dates</h2>
                <CalendarList events={data.examDates || []} compact />
              </GlassCard>

              <GlassCard className="p-5">
                <h2 className="section-title mb-3 flex items-center gap-2"><BookOpen size={18} className="text-sky-300" aria-hidden="true" /> Exam instructions</h2>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 marker:text-slate-500">
                  {INSTRUCTIONS.map((t) => <li key={t}>{t}</li>)}
                </ol>
                <p className="mt-4 flex gap-2 text-xs text-slate-500"><Info size={14} className="shrink-0" aria-hidden="true" /> Your details are used only for this exam&apos;s records.</p>
              </GlassCard>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
