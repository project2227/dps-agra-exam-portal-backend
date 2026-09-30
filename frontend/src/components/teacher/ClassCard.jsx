import { Link } from 'react-router-dom'
import { CalendarDays, FileText, UserRound, Users } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/format'

export default function ClassCard({ cls }) {
  return (
    <div className="glass gradient-border gradient-border-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">Class</p>
          <p className="font-display text-3xl font-semibold text-white">{cls.name}</p>
        </div>
        {cls.activeExam ? <StatusBadge status="live" label="Exam live" /> : <StatusBadge status="idle" label="No live exam" />}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300"><UserRound size={14} className="text-slate-500" aria-hidden="true" /><dt className="sr-only">Computer teacher</dt><dd>{cls.teacher || 'Teacher not assigned'}</dd></div>
        <div className="flex items-center gap-2 text-slate-300"><Users size={14} className="text-slate-500" aria-hidden="true" /><dt className="sr-only">Sections</dt><dd>Sections {cls.sections.join(', ')}</dd></div>
        <div className="flex items-center gap-2 text-slate-300"><FileText size={14} className="text-slate-500" aria-hidden="true" /><dt className="sr-only">Handouts</dt><dd>{cls.handoutCount} handout{cls.handoutCount === 1 ? '' : 's'}</dd></div>
        <div className="flex items-center gap-2 text-slate-300"><CalendarDays size={14} className="text-slate-500" aria-hidden="true" /><dt className="sr-only">Next exam</dt><dd>{cls.nextExamDate ? `Next exam ${formatDate(cls.nextExamDate)}` : 'No exam scheduled'}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2 pt-1">
        {cls.activeExam && <Link to={`/teacher/exams/${cls.activeExam.id}/monitor`} className="btn btn-primary btn-sm">Monitor</Link>}
        <Link to={`/teacher/classes?class=${cls.name}`} className="btn btn-ghost btn-sm">View class</Link>
      </div>
    </div>
  )
}
