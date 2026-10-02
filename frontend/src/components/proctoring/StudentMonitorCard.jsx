import { memo } from 'react'
import { Camera, Clock, MonitorUp, ShieldAlert } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import VideoTile from './VideoTile'
import { DEMO_MODE, FLAG_BUCKETS } from '../../config'
import { cx, relativeTime } from '../../utils/format'

export const flagTotal = (flags = {}) => Object.values(flags).reduce((a, b) => a + (Number(b) || 0), 0)

function StudentMonitorCard({ student: s, snapshot = {}, selected, onOpen, compact = false, now }) {
  const total = flagTotal(s.flags)
  const status = s.status === 'active' && total >= 3 ? 'flagged' : s.status
  const progress = s.totalQuestions ? Math.round(((s.answered || 0) / s.totalQuestions) * 100) : 0
  const offline = s.status === 'disconnected'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(s)}
      aria-pressed={selected}
      aria-label={`${s.name}, roll ${s.rollNumber}, ${total} flags. Open details`}
      className={cx(
        'glass group flex w-full flex-col gap-3 p-3 text-left hover:border-white/25',
        selected && 'border-dps-neon/60 ring-1 ring-dps-neon/40',
        total >= 3 && !selected && 'border-red-400/40',
        offline && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{s.name}</p>
          <p className="text-xs text-slate-400">Roll {s.rollNumber} | {s.class}-{s.section}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2">
          <VideoTile snapshot={snapshot.webcam} label="Cam" icon={Camera} className="aspect-video" placeholder={!s.webcam ? 'Not required' : DEMO_MODE ? 'Demo: no feed' : 'Open details for consented live media'} />
          <VideoTile snapshot={snapshot.screen} label="Screen" icon={MonitorUp} className="aspect-video" placeholder={!s.screen ? 'Not required' : DEMO_MODE ? 'Demo: no feed' : 'Open details for consented live media'} />
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>On Q{s.currentQuestion || 1} of {s.totalQuestions || '?'}</span>
          <span>{s.answered || 0} answered</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Answered">
          <div className="h-full rounded-full bg-dps-green" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!compact && (
        <pre className="h-[74px] overflow-hidden rounded-lg border border-white/[0.06] bg-navy-950/80 p-2 font-sans text-xs leading-[1.35] text-slate-300" aria-label="Answer progress">
          <span className="text-slate-500">Progress only. Answer text is available after submission.</span>
          
        </pre>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-400"><Clock size={11} aria-hidden="true" /> Saved {relativeTime(s.lastSavedAt, now)}</span>
        <span className="ml-auto" />
        {total === 0 ? (
          <span className="text-slate-500">No flags</span>
        ) : (
          Object.entries(s.flags || {}).filter(([, n]) => n > 0).map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 font-medium text-red-200">
              <ShieldAlert size={10} aria-hidden="true" /> {FLAG_BUCKETS[k]?.label || k}: {n}
            </span>
          ))
        )}
      </div>
    </button>
  )
}

export default memo(StudentMonitorCard)
