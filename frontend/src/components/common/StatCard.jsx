import { useEffect,useRef,useState } from 'react'
import { cx } from '../../utils/format'
import Skeleton from './Skeleton'
import { useQuietMotion } from './Motion'
const ACCENTS={green:'text-dps-green',orange:'text-dps-orange',gold:'text-dps-gold',red:'text-red-400',sky:'text-sky-400'}
export default function StatCard({icon:Icon,label,value,hint,accent='green',loading=false,animate=true}) {
  const [count,setCount]=useState(value), started=useRef(false), quiet=useQuietMotion()
  useEffect(()=>{
    if(loading)return
    if(started.current || quiet || !animate || document.body.dataset.labPage==='monitor' || typeof value!=='number'){setCount(value);return}
    started.current=true
    let frame,start
    const tick=time=>{if(!start)start=time;const p=Math.min(1,(time-start)/400);setCount(Math.round(value*(1-(1-p)**3)));if(p<1)frame=requestAnimationFrame(tick)}
    frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[value,loading,quiet,animate])
  return <div className="glass p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm text-muted">{label}</p>{Icon && <span className={cx('grid h-9 w-9 place-items-center rounded-xl bg-ink/5',ACCENTS[accent])}><Icon size={18} aria-hidden="true" /></span>}</div><p className="mt-2 text-3xl font-semibold text-ink tabular-nums">{loading?<Skeleton className="h-9 w-14" />:<><span aria-hidden="true">{count ?? value}</span><span className="sr-only">{value}</span></>}</p>{hint && <p className="mt-2 text-xs text-muted">{hint}</p>}</div>
}
