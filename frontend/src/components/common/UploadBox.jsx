import { useId, useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { cx, formatBytes } from '../../utils/format'

export default function UploadBox({ accept, maxSizeMB = 25, multiple = false, files = [], onFiles, label = 'Drop a file here or browse', hint, disabled }) {
  const input = useRef(null)
  const id = useId()
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  const allowed = accept ? accept.split(',').map((s) => s.trim().toLowerCase()) : null
  const handle = (list) => {
    const arr = Array.from(list || [])
    const bad = arr.find((f) => f.size > maxSizeMB * 1024 * 1024)
    if (bad) return setError(`${bad.name} is larger than ${maxSizeMB} MB.`)
    const wrong = allowed && arr.find((f) => !allowed.some((a) => f.name.toLowerCase().endsWith(a)))
    if (wrong) return setError(`${wrong.name} is not an allowed file type (${accept}).`)
    setError('')
    onFiles?.(multiple ? arr : arr.slice(0, 1))
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) handle(e.dataTransfer.files) }}
        className={cx(
          'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          drag ? 'border-dps-neon bg-dps-green/10' : 'border-white/15 bg-white/[0.02] hover:border-white/30',
          disabled && 'opacity-60',
        )}
      >
        <FileUp size={26} className="text-dps-neon" aria-hidden="true" />
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
        <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => input.current?.click()} disabled={disabled} aria-describedby={`${id}-hint`}>
          Browse files
        </button>
        <span id={`${id}-hint`} className="sr-only">Accepted: {accept || 'any file'}. Max {maxSizeMB} MB.</span>
        <input ref={input} type="file" className="sr-only" accept={accept} multiple={multiple} onChange={(e) => { handle(e.target.files); e.target.value = '' }} tabIndex={-1} />
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <span className="truncate text-slate-200">{f.name}</span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                {formatBytes(f.size)}
                <button type="button" className="text-slate-400 hover:text-white" onClick={() => onFiles?.(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
