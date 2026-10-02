import { useRef } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { BellRing,ShieldAlert } from 'lucide-react'
import GlassCard from '../common/GlassCard'
import StatusBadge from '../common/StatusBadge'
import { PROCTOR_EVENTS } from '../../config'
import { formatTime } from '../../utils/format'
import { motionTokens,useQuietMotion } from '../common/Motion'
export default function MonitorAlerts({feed=[],onSelect,compact=false}) {
  const quiet=useQuietMotion(), seen=useRef(new Set(feed.map(e=>e.id)))
  return <GlassCard className={compact?'p-4':'h-fit p-4 2xl:sticky 2xl:top-20'} aria-labelledby="feed-title"><h2 id="feed-title" className="flex items-center gap-2 text-base font-semibold"><BellRing size={17} aria-hidden="true"/> Activity needing review</h2><p className="mt-2 text-xs text-muted">Higher-priority flags appear first. A flag alone does not prove misconduct.</p>
   {feed.length===0?<p className="mt-4 text-sm text-muted">No new alerts. New activity flags appear here while the monitor is connected.</p>:<div className={compact?'mt-4 grid gap-4 md:grid-cols-2':'mt-4 max-h-[55dvh] space-y-4 overflow-y-auto'}>{['high','medium','low'].map(severity=>{
    const events=feed.filter(e=>(e.severity || PROCTOR_EVENTS[e.type]?.severity)===severity)
    if(!events.length)return null
    return <section key={severity} aria-label={`${severity} severity flags`}><div className="mb-2 flex items-center gap-2"><StatusBadge status={severity} label={severity==='high'?'High priority':severity==='medium'?'Review soon':'Low priority'}/><span className="text-xs text-muted">{events.length}</span></div><ol className="space-y-2" aria-live="polite" aria-relevant="additions"><AnimatePresence initial={false}>{events.map(event=>{
      const fresh=!seen.current.has(event.id);seen.current.add(event.id)
      return <m.li key={event.id} initial={quiet?{opacity:0}:{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:motionTokens.enter}}><button type="button" onClick={()=>onSelect(event.sessionId)} className="relative flex w-full items-start gap-2 overflow-hidden rounded-lg border border-line p-3 text-left text-sm"><ShieldAlert size={15} className={severity==='high'?'mt-0.5 shrink-0 text-red-400':'mt-0.5 shrink-0 text-orange-400'} aria-hidden="true"/><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{event.name}</span><span className="block text-xs text-muted">{PROCTOR_EVENTS[event.type]?.label || event.type}</span></span><time className="shrink-0 text-[11px] text-muted tabular-nums" dateTime={event.ts}>{formatTime(event.ts)}</time>{fresh && !quiet && <m.span className="pointer-events-none absolute inset-0 bg-dps-green/10" initial={{opacity:1}} animate={{opacity:0}} transition={{duration:motionTokens.signature}} aria-hidden="true"/>}</button></m.li>
    })}</AnimatePresence></ol></section>
   })}</div>}
  </GlassCard>
}
