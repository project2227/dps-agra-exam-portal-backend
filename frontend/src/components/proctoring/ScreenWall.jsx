import {compareAttention} from '../../utils/monitorAttention'
import {useMemo} from 'react'
import {Clock3,Eye,LayoutGrid,MonitorUp,ShieldCheck,WifiOff} from 'lucide-react'
import GlassCard from '../common/GlassCard'
import {isRunningExamStatus} from '../../utils/monitoringState'
import {flagTotal} from './StudentMonitorCard'

const FRESH_MS=7000
function stateOf(student,packet,connection,now){
 if(student.kicked)return 'Removed by teacher'
 if(student.status==='joined')return 'Checked in · Waiting for exam start'
 if(!isRunningExamStatus(student.status))return 'Exam finished'
 if(student.connected===false)return 'Student offline'
 if(!student.screen)return 'Student has not enabled screen sharing. They can open Monitoring → Share my entire screen.'
 if(student.stillsConsent===false)return 'This older exam session did not include still-image permission. Open student details for direct video.'
 if(connection==='student-stopped')return 'Student stopped snapshot sharing'
 if(connection==='student-offline')return 'Student disconnected'
 const ts=packet?.ts?Date.parse(packet.ts):0
 if(packet&&Number.isFinite(ts)&&now-ts<=FRESH_MS)return 'Updated '+Math.max(0,Math.round((now-ts)/1000))+'s ago'
 if(packet)return 'Feed stale — waiting for a fresh snapshot'
 return "Waiting for the participant's already-granted screen stream or next still image"
}
export default function ScreenWall({students=[],frames={},statuses={},state='off',now=Date.now(),onSelect}){
 const sorted=useMemo(()=>[...students].sort(compareAttention),[students])
 const shared=sorted.filter(s=>{
  const frame=frames[s.sessionId],ts=frame?.ts?Date.parse(frame.ts):0
  return isRunningExamStatus(s.status)&&s.screen&&s.connected!==false&&
    statuses[s.sessionId]==='sharing'&&Number.isFinite(ts)&&now-ts<FRESH_MS
 }).length
 const waiting=sorted.filter(s=>isRunningExamStatus(s.status)&&s.screen&&s.connected!==false).length
 return <section aria-label="All participating student screens" className="space-y-4">
  <GlassCard className="flex flex-wrap items-start justify-between gap-3 border-sky-400/20 p-4">
   <div><h2 className="flex items-center gap-2 text-xl font-semibold"><LayoutGrid size={21} className="text-sky-300"/> Student screen wall</h2>
    <p className="mt-1 max-w-2xl text-sm text-slate-300">Students needing attention appear first. Consented screen previews refresh about every 1.5 seconds. Open a tile for direct video, incident clips and participant controls.</p>
    <p className="mt-2 text-xs text-amber-200">Wall previews are temporary. Separately consented screen incident clips are available in student details for 7 days. Interrupted and stale feeds are marked.</p>
   </div>
   <div className="flex flex-wrap gap-2"><span className="chip border-sky-400/40 text-sky-200"><MonitorUp size={14}/> {shared}/{waiting} fresh feeds</span>
    <span className="chip"><ShieldCheck size={14}/> {sorted.length} student tiles</span>
   </div>
   {state!=='watching'&&<p role="status" className="w-full rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
    {state==='limit'?'This wall currently supports up to 48 eligible students. Split larger classes into separate exams.':
     state==='busy'?'Two authorized viewers are already using this exam screen wall.':
     state==='reconnecting'?'The teacher connection dropped. Reconnecting; existing images have been cleared.':
     'Opening a secure screen wall…'}
   </p>}
  </GlassCard>
  {!sorted.length?<GlassCard className="grid min-h-48 place-items-center p-8 text-center"><div><MonitorUp className="mx-auto text-slate-400" size={36}/><h3 className="mt-3 text-lg font-semibold">Waiting for students to join</h3><p className="mt-2 text-sm text-slate-400">New participants appear automatically while the teacher's monitor is connected.</p></div></GlassCard>:
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-6">
   {sorted.map(s=>{
    const frame=frames[s.sessionId],ts=frame?.ts?Date.parse(frame.ts):0
    const fresh=isRunningExamStatus(s.status)&&s.screen&&s.connected!==false&&
      statuses[s.sessionId]==='sharing'&&Number.isFinite(ts)&&now-ts<FRESH_MS
    const label=stateOf(s,frame,statuses[s.sessionId],now)
    return <button key={s.sessionId} type="button" onClick={()=>onSelect?.(s)}
     aria-label={s.name+', roll '+s.rollNumber+'. '+label+'. Open student details.'}
     className={'group overflow-hidden rounded-xl border text-left transition hover:border-sky-300/70 '+(fresh?'border-sky-400/40':'border-white/10')}>
      <div className="relative aspect-video bg-navy-950/85">
       {fresh?<img src={frame.jpeg} alt={'Latest consented screen snapshot for '+s.name} className="h-full w-full object-contain" />:
        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-400"><MonitorUp size={26}/><span className="text-xs">{label}</span></div>}
       {fresh&&<span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-navy-950/85 px-2 py-1 text-[11px] text-sky-100"><Eye size={12}/> Snapshot · {Math.max(0,Math.round((now-ts)/1000))}s old</span>}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 bg-navy-900/90 px-3 py-2.5">
       <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="text-xs text-slate-400">Roll {s.rollNumber} · {s.status} · {s.answered||0}/{s.totalQuestions||'?'} answered</p></div>
       {s.connected===false?<WifiOff size={15} className="shrink-0 text-amber-300"/>:flagTotal(s.flags)>0?<span className="rounded-md border border-orange-300/30 px-1.5 py-0.5 text-xs text-orange-300">{flagTotal(s.flags)} flags</span>:<Clock3 size={15} className="shrink-0 text-slate-400"/>}
      </div>
     </button>
   })}
  </div>}
 </section>
}
