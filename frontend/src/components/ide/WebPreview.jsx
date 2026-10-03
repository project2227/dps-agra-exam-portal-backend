import { useEffect, useMemo, useState, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { buildWebPreview } from '../../services/codeRunner'
import { PLINTH, API_BASE_URL } from '../../config'

/** Live preview for HTML/CSS/JS answers. Sandboxed: scripts only, no same-origin. */
export default function WebPreview({ files, channel, refreshKey = 0 }) {
  const [debounced, setDebounced] = useState(files)
  const [manual, setManual] = useState(0)
  const frame = useRef(null)
  const isolated = PLINTH.enabled
  useEffect(() => {
    const t = setTimeout(() => setDebounced(files), 600)
    return () => clearTimeout(t)
  }, [files])
  const srcDoc = useMemo(() => buildWebPreview(debounced || {}, channel), [debounced, channel])
  const update = () => { if (isolated) frame.current?.contentWindow?.postMessage({ type: 'plinth:preview', html: srcDoc, channel }, '*') }
  useEffect(update, [srcDoc, isolated, channel])
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 text-xs text-slate-400">
        <span>Live preview</span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={() => setManual((n) => n + 1)}><RefreshCw size={12} aria-hidden="true" /> Reload</button>
      </div>
      <iframe
        ref={frame}
        key={`${refreshKey}-${manual}`}
        title="Web page preview"
        sandbox="allow-scripts allow-modals"
        src={isolated ? API_BASE_URL + '/preview-sandbox' : undefined}
        srcDoc={isolated ? undefined : srcDoc}
        onLoad={update}
        className="min-h-0 w-full flex-1 bg-white"
      />
    </div>
  )
}
