import { AlertTriangle, Inbox } from 'lucide-react'
import Loader from './Loader'
export function Spinner({ label = 'Loading…', className = '' }) { return <Loader compact label={label} className={className} /> }
export function ErrorNote({ message, onRetry }) {
  if (!message) return null
  return <div className="notice-error" role="alert"><AlertTriangle size={18} aria-hidden="true" /><span className="min-w-0 flex-1">{message}</span>{onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}</div>
}
export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center"><Icon size={28} className="text-muted" aria-hidden="true" /><p className="mt-3 font-semibold text-ink">{title}</p>{children && <p className="mt-2 max-w-sm text-sm text-muted">{children}</p>}{action && <div className="mt-4">{action}</div>}</div>
}
