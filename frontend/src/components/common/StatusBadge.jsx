import { AlertTriangle, CheckCircle2, Circle, Clock, FileEdit, WifiOff, XCircle, Radio, ShieldAlert, Info } from 'lucide-react'
import { cx } from '../../utils/format'

// Every status has an icon + text, so meaning never depends on colour alone.
const MAP = {
  live: { label: 'Live', cls: 'text-dps-neon bg-dps-green/15 border-dps-green/40', dot: true },
  active: { label: 'Active', cls: 'text-dps-neon bg-dps-green/15 border-dps-green/40', dot: true },
  upcoming: { label: 'Upcoming', cls: 'text-sky-200 bg-sky-500/10 border-sky-400/30', icon: Clock },
  ended: { label: 'Ended', cls: 'text-slate-300 bg-white/5 border-white/15', icon: Circle },
  draft: { label: 'Draft', cls: 'text-slate-300 bg-white/5 border-white/15', icon: FileEdit },
  submitted: { label: 'Submitted', cls: 'text-dps-gold bg-dps-gold/10 border-dps-gold/30', icon: CheckCircle2 },
  reviewed: { label: 'Reviewed', cls: 'text-dps-neon bg-dps-green/10 border-dps-green/30', icon: CheckCircle2 },
  'auto-checked': { label: 'Auto-checked', cls: 'text-sky-200 bg-sky-500/10 border-sky-400/30', icon: CheckCircle2 },
  idle: { label: 'Idle', cls: 'text-slate-300 bg-white/5 border-white/15', icon: Clock },
  disconnected: { label: 'Offline', cls: 'text-orange-200 bg-dps-orange/10 border-dps-orange/30', icon: WifiOff },
  flagged: { label: 'Flagged', cls: 'text-red-200 bg-red-500/15 border-red-400/40', icon: ShieldAlert },
  high: { label: 'High', cls: 'text-red-200 bg-red-500/15 border-red-400/40', icon: AlertTriangle },
  medium: { label: 'Medium', cls: 'text-orange-200 bg-dps-orange/10 border-dps-orange/30', icon: AlertTriangle },
  low: { label: 'Low', cls: 'text-slate-300 bg-white/5 border-white/15', icon: Info },
  info: { label: 'Info', cls: 'text-slate-300 bg-white/5 border-white/15', icon: Info },
  passed: { label: 'Passed', cls: 'text-dps-neon bg-dps-green/15 border-dps-green/40', icon: CheckCircle2 },
  failed: { label: 'Failed', cls: 'text-red-200 bg-red-500/15 border-red-400/40', icon: XCircle },
  connecting: { label: 'Connecting', cls: 'text-sky-200 bg-sky-500/10 border-sky-400/30', icon: Radio },
}

export default function StatusBadge({ status, label, className = '' }) {
  const s = MAP[status] || { label: status, cls: 'text-slate-300 bg-white/5 border-white/15', icon: Circle }
  const Icon = s.icon
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold', s.cls, className)}>
      {s.dot ? <span className="live-dot" aria-hidden="true" /> : Icon && <Icon size={12} aria-hidden="true" />}
      {label || s.label}
    </span>
  )
}
