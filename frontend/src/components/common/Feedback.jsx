import { AlertTriangle, Inbox } from 'lucide-react'

export function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-400 ${className}`} role="status">
      <span className="loader-code" aria-hidden="true"><i/><i/><i/></span>
      {label}
    </div>
  )
}

export function ErrorNote({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <Icon size={28} className="text-slate-500" aria-hidden="true" />
      <p className="mt-3 font-medium text-white">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
