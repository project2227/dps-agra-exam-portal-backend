import { Camera, Clock, Code2, MonitorUp, ShieldCheck } from 'lucide-react'
import CheckInCountdown from './CheckInCountdown'
import StatusBadge from '../common/StatusBadge'
import { cx, examStatus, formatDateTime, formatTime } from '../../utils/format'

export default function ExamCard({ exam, selected, onSelect, actions, className = '' }) {
  const status = exam.status || examStatus(exam)
  const s = exam.settings || {}
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? () => onSelect(exam) : undefined}
      aria-pressed={onSelect ? !!selected : undefined}
      className={cx(
        'glass block w-full p-4 text-left transition',
        onSelect && 'hover:border-white/25',
        selected && 'border-dps-neon/60 bg-dps-green/[0.08] ring-1 ring-dps-neon/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Class {exam.class}{exam.section && exam.section !== 'All' ? `-${exam.section}` : ', all sections'} | {exam.type}</p>
          <h3 className="mt-0.5 text-base font-semibold leading-snug">{exam.title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
        <Clock size={14} className="text-slate-500" aria-hidden="true" />
        {formatDateTime(exam.startsAt)} to {formatTime(exam.endsAt)} ({exam.durationMin} min)
      </p>
      {status === 'upcoming' && <CheckInCountdown startsAt={exam.startsAt} className="mt-3" />}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.requireWebcam && <span className="chip"><Camera size={12} aria-hidden="true" /> Webcam</span>}
        {s.requireScreen && <span className="chip"><MonitorUp size={12} aria-hidden="true" /> Screen share</span>}
        {s.tabDetection && <span className="chip"><ShieldCheck size={12} aria-hidden="true" /> Tab monitoring</span>}
        {s.codeExecution && <span className="chip"><Code2 size={12} aria-hidden="true" /> Code checking</span>}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </Tag>
  )
}
