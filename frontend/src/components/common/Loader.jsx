import { useEffect, useState } from 'react'
import ExamCrest from './ExamCrest'
import Skeleton from './Skeleton'
export default function Loader({ label = 'Loading your workspace…', server = false, compact = false, className = '' }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { setSlow(false); const timer = setTimeout(() => setSlow(true), 7000); return () => clearTimeout(timer) }, [label])
  return <div className={`${compact ? 'flex flex-col items-center gap-3 py-8 text-center text-sm text-muted' : 'portal-loader'} ${className}`} role="status" aria-live="polite">
    {!compact && <ExamCrest size={52} decorative />}
    <Skeleton className="h-1 w-28" aria-hidden="true" />
    <p>{label}</p>
    {(server || slow) && <p className="text-xs text-muted">Waking up the server — this can take up to a minute on first visit.</p>}
  </div>
}
