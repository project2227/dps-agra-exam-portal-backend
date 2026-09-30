import { useEffect, useState } from 'react'
import { Activity, Camera, ChevronDown, ChevronUp, Eye, MonitorUp, Wifi, WifiOff } from 'lucide-react'
import VideoTile from './VideoTile'
import { cx } from '../../utils/format'

/**
 * Always-visible indicator that tells the student exactly what is being shared.
 * Includes an optional self-view so the student can see their own camera feed.
 */
export default function MonitoringIndicator({ webcamStream, screenStream, activityMonitoring = true, connected = true, snapshotRequested = false, snapshotAllowed = false, snapshotStatus = 'off', onSnapshotChange }) {
  const [open, setOpen] = useState(true)
  useEffect(()=>{if(snapshotRequested)setOpen(true)},[snapshotRequested])
  const items = [
    webcamStream && { icon: Camera, text: 'Webcam' },
    screenStream && { icon: MonitorUp, text: 'Screen' },
    activityMonitoring && { icon: Activity, text: 'Tab & activity' },
  ].filter(Boolean)

  return (
    <aside
      aria-label="Monitoring status"
      className="fixed bottom-4 left-4 z-40 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-dps-green/40 bg-navy-900/95 shadow-glow backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white"
      >
        <span className="live-dot" aria-hidden="true" />
        <Eye size={14} className="text-dps-neon" aria-hidden="true" />
        {snapshotRequested && !snapshotAllowed ? 'Camera stills requested' : snapshotAllowed ? 'Camera stills ON' : 'Exam activity monitoring'}
        <span className="ml-auto text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/10 p-3">
          <ul className="flex flex-wrap gap-1.5">
            {items.map(({ icon: Icon, text }) => (
              <li key={text} className="chip border-dps-green/30 px-2 py-0.5 text-[11px] text-dps-neon"><Icon size={11} aria-hidden="true" /> {text}</li>
            ))}
          </ul>
          {webcamStream && <VideoTile stream={webcamStream} label="Your local camera preview" icon={Camera} mirror className="aspect-video" />}
          {snapshotRequested && webcamStream && (
            <section className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3" aria-label="Optional camera snapshot sharing">
              <p className="text-xs font-semibold text-emerald-200">
                {snapshotAllowed?'You enabled webcam still images':'Teacher requested optional camera still images'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                If you allow, a compressed webcam image goes through the exam server to the authorized teacher about every 4 seconds.
                Images are not saved by the website. This is separate from direct video, and you can stop anytime.
              </p>
              <p className="mt-1 text-[11px] text-emerald-200" role="status">
                {snapshotAllowed?({sharing:'Still images are being sent.',starting:'Starting camera snapshots…',reconnecting:'Reconnecting—sharing paused.', 'image-too-large':'Snapshot too large; no image sent.','webcam-unavailable':'Camera unavailable; sharing paused.'}[snapshotStatus]||'Snapshot sharing enabled'):'Off until you explicitly allow'}
              </p>
              <button type="button" onClick={()=>onSnapshotChange?.(!snapshotAllowed)}
                className={snapshotAllowed?'btn btn-ghost btn-sm mt-2 w-full':'btn btn-primary btn-sm mt-2 w-full'}>
                {snapshotAllowed?'Stop sharing snapshots':'Allow webcam snapshots'}
              </button>
            </section>
          )}
          <p className="text-[11px] text-slate-400">
            Direct video and optional server-relayed still images require separate consent. A local preview does not mean the teacher is receiving your video.
          </p>
          <p className={cx('flex items-center gap-1.5 text-[11px]', connected ? 'text-slate-400' : 'text-orange-300')}>
            {connected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
            {connected ? 'Exam connection online. Webcam/screen previews connect separately when requested by an authorized teacher.' : 'Reconnecting. Your answers are saved on this computer.'}
          </p>
        </div>
      )}
    </aside>
  )
}
