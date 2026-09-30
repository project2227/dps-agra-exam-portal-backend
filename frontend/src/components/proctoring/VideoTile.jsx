import { useEffect, useRef } from 'react'
import { cx } from '../../utils/format'

/** Renders a MediaStream (live) or a JPEG snapshot, with a clear label. */
export default function VideoTile({ stream, snapshot, label, icon: Icon, placeholder = 'No feed', className = '', mirror = false, contain = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null
  }, [stream])

  return (
    <figure className={cx('relative overflow-hidden rounded-xl border border-white/10 bg-navy-950', className)}>
      {stream ? (
        <video ref={ref} autoPlay muted playsInline className={cx('h-full w-full', contain ? 'object-contain' : 'object-cover', mirror && '-scale-x-100')} />
      ) : snapshot ? (
        <img src={snapshot} alt={label ? `${label} snapshot` : ''} className={cx('h-full w-full', contain ? 'object-contain' : 'object-cover')} />
      ) : (
        <div className="grid h-full w-full place-items-center p-2 text-center text-[11px] leading-tight text-slate-500">
          <span className="flex flex-col items-center gap-1">
            {Icon && <Icon size={16} aria-hidden="true" />}
            {placeholder}
          </span>
        </div>
      )}
      {label && (
        <figcaption className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-navy-950/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
          {Icon && <Icon size={10} aria-hidden="true" />} {label}
          {stream && <span className="live-dot ml-0.5 scale-75" aria-label="live" />}
        </figcaption>
      )}
    </figure>
  )
}
