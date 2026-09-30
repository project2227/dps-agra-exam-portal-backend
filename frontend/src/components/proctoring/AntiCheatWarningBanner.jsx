import { useEffect } from 'react'
import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { cx, formatTime } from '../../utils/format'

/**
 * Shown to the student whenever an exam-integrity event is recorded, or when the
 * teacher sends a warning. Warnings auto-dismiss; teacher messages stay until closed.
 */
export default function AntiCheatWarningBanner({ warning, flagCount = 0, onDismiss, autoHideMs = 9000 }) {
  const fromTeacher = warning?.source === 'teacher'

  useEffect(() => {
    if (!warning || fromTeacher || !autoHideMs) return undefined
    const t = setTimeout(() => onDismiss?.(), autoHideMs)
    return () => clearTimeout(t)
  }, [warning, fromTeacher, autoHideMs, onDismiss])

  if (!warning) return null
  const Icon = fromTeacher ? ShieldAlert : AlertTriangle

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cx(
        'animate-warn flex items-start gap-3 border-b px-4 py-3 text-sm sm:px-6',
        fromTeacher ? 'border-dps-gold/40 bg-dps-gold/15 text-yellow-50' : 'border-red-400/40 bg-red-500/15 text-red-50',
      )}
    >
      <Icon size={20} className={cx('mt-0.5 shrink-0', fromTeacher ? 'text-dps-gold' : 'text-red-300')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{fromTeacher ? 'Message from your teacher' : 'Exam rule warning'}</p>
        <p className="text-[13px] opacity-90">{warning.message}</p>
        <p className="mt-0.5 text-xs opacity-70">
          Recorded at {formatTime(warning.ts)}
          {flagCount > 0 && ` | ${flagCount} flag${flagCount === 1 ? '' : 's'} so far in this exam`}
        </p>
      </div>
      <button type="button" onClick={onDismiss} className="btn btn-ghost btn-sm shrink-0" aria-label="Dismiss warning">
        <X size={14} />
      </button>
    </div>
  )
}
