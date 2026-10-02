import { useEffect,useState } from 'react'
import { AlertTriangle,CheckCircle2,CircleDashed,Loader2 } from 'lucide-react'
import * as m from 'motion/react-m'
import { formatSaveAge } from '../../utils/ui'
import { useQuietMotion,motionTokens } from '../common/Motion'
export default function AutoSaveIndicator({status,lastSavedAt}) {
  const [now,setNow]=useState(Date.now), quiet=useQuietMotion()
  useEffect(()=>{if(status!=='saved' || !lastSavedAt)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[status,lastSavedAt])
  const map={saved:{icon:CheckCircle2,text:lastSavedAt?formatSaveAge(lastSavedAt,now):'All changes saved',cls:'text-dps-green'},unsaved:{icon:CircleDashed,text:'Unsaved changes',cls:'text-muted'},saving:{icon:Loader2,text:'Saving…',cls:'text-sky-400'},error:{icon:AlertTriangle,text:'Save failed. Retrying…',cls:'text-orange-400'}}
  const s=map[status] || map.saved, Icon=s.icon
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${s.cls}`}><m.span key={status} initial={quiet?false:{opacity:.5}} animate={{opacity:1}} transition={{duration:motionTokens.fast}}><Icon size={13} aria-hidden="true"/></m.span><span aria-live="off">{s.text}</span><span className="sr-only" role="status" aria-live="polite">{status==='saved'?'Answers saved':s.text}</span></span>
}
