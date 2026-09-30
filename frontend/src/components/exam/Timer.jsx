import { Timer as TimerIcon } from 'lucide-react'
import { cx } from '../../utils/format'

export default function Timer({ formatted, isWarning, isCritical, label = 'Time left' }) {
  return (
    <div
      role="timer"
      aria-label={`${label}: ${formatted}`}
      className={cx(
        'flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums transition',
        isCritical ? 'animate-pulse border-red-400/60 bg-red-500/15 text-red-200' : isWarning ? 'border-dps-orange/50 bg-dps-orange/10 text-orange-200' : 'border-white/10 bg-white/[0.04] text-white',
      )}
    >
      <TimerIcon size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      {formatted}
    </div>
  )
}
