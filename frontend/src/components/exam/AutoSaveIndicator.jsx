import { AlertTriangle, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { formatTime } from '../../utils/format'

export default function AutoSaveIndicator({ status, lastSavedAt }) {
  const map = {
    saved: { icon: CheckCircle2, text: lastSavedAt ? `Saved ${formatTime(lastSavedAt)}` : 'All changes saved', cls: 'text-dps-neon' },
    unsaved: { icon: CircleDashed, text: 'Unsaved changes', cls: 'text-slate-400' },
    saving: { icon: Loader2, text: 'Saving', cls: 'text-sky-300', spin: true },
    error: { icon: AlertTriangle, text: 'Save failed, retrying', cls: 'text-orange-300' },
  }
  const s = map[status] || map.saved
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${s.cls}`} role="status" aria-live="polite">
      <Icon size={13} className={s.spin ? 'animate-spin' : ''} aria-hidden="true" /> {s.text}
    </span>
  )
}
