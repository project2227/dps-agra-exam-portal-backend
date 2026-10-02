import { useEffect,useState } from 'react'
import { Clock } from 'lucide-react'
import { checkInCountdown } from '../../utils/ui'
export default function CheckInCountdown({startsAt,className=''}) {
  const [now,setNow]=useState(Date.now)
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[startsAt])
  return <p className={`flex items-start gap-2 text-sm text-muted ${className}`}><Clock size={15} className="mt-1 shrink-0" aria-hidden="true"/><span aria-live="off">{checkInCountdown(startsAt,now)}</span></p>
}
