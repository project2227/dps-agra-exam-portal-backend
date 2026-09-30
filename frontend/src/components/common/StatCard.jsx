import { cx } from '../../utils/format'

const ACCENTS = {
  green: 'text-dps-neon bg-dps-green/15 ring-dps-green/30',
  orange: 'text-orange-300 bg-dps-orange/15 ring-dps-orange/30',
  gold: 'text-dps-gold bg-dps-gold/10 ring-dps-gold/25',
  red: 'text-red-300 bg-red-500/15 ring-red-400/30',
  sky: 'text-sky-300 bg-sky-500/15 ring-sky-400/30',
}

export default function StatCard({ icon: Icon, label, value, hint, accent = 'green', loading = false }) {
  return (
    <div className="glass p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        {Icon && (
          <span className={cx('grid h-9 w-9 place-items-center rounded-xl ring-1', ACCENTS[accent])}>
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-white tabular-nums">
        {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-white/10" /> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
