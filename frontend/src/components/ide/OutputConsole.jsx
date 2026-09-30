import { useEffect, useRef } from 'react'
import { Eraser, Terminal } from 'lucide-react'
import { cx } from '../../utils/format'

const COLORS = { stdout: 'text-slate-100', stderr: 'text-red-300', error: 'text-red-300', warn: 'text-dps-gold', info: 'text-sky-300', success: 'text-dps-neon', muted: 'text-slate-500' }

export default function OutputConsole({ lines = [], onClear, running = false, className = '' }) {
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [lines.length])
  return (
    <div className={cx('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5"><Terminal size={13} aria-hidden="true" /> Console</span>
        {onClear && <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={onClear}><Eraser size={12} aria-hidden="true" /> Clear</button>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#050d1a] p-3 font-mono text-[13px] leading-relaxed" role="log" aria-live="polite" aria-label="Program output">
        {lines.length === 0 && !running && <p className="text-slate-600">Run your program to see output here.</p>}
        {lines.map((l, i) => (
          <pre key={i} className={cx('whitespace-pre-wrap break-words', COLORS[l.type] || COLORS.stdout)}>{l.text}</pre>
        ))}
        {running && <p className="type-caret text-slate-400">Running</p>}
        <div ref={end} />
      </div>
    </div>
  )
}
