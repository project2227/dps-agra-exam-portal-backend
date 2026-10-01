import {useCallback,useEffect,useRef,useState} from 'react'
import {Film,RefreshCw} from 'lucide-react'
import {releaseRequest} from '../../services/releaseApi'
import {formatDateTime} from '../../utils/format'
export default function IncidentClips({sessionId,socket,consented}) {
 const [clips,setClips]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[video,setVideo]=useState('')
 const alive=useRef(true),current=useRef(sessionId);current.current=sessionId
 const load=useCallback(()=>releaseRequest('/teacher/sessions/'+sessionId+'/incidents').then(r=>{if(alive.current&&current.current===sessionId){setClips(r.recordings);setError('')}}).catch(e=>{if(alive.current&&current.current===sessionId)setError(e.message)}),[sessionId])
 useEffect(()=>{alive.current=true;setClips([]);setError('');setVideo('');load();const timer=setInterval(load,8000);const changed=p=>{if(p?.sessionId===sessionId)load()};socket?.on('exam:incidentUpdate',changed);return()=>{alive.current=false;clearInterval(timer);socket?.off('exam:incidentUpdate',changed)}},[sessionId,socket,load])
 useEffect(()=>()=>{if(video)URL.revokeObjectURL(video)},[video])
 const play=async clip=>{
  setBusy(clip.id);setError('')
  try{const blob=await releaseRequest('/teacher/incidents/'+clip.id+'/video',{blob:true});if(alive.current&&current.current===sessionId)setVideo(URL.createObjectURL(blob))}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 return <section className="rounded-xl border border-orange-400/20 bg-orange-500/[.03] p-4">
  <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Film size={16}/> Screen incident clips</h3><button type="button" onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh recordings"><RefreshCw size={14}/></button></div>
  <p className="mt-2 text-xs text-slate-400">Only separately consented focus incidents are recorded. Clips expire after 7 days and require human review.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  {!clips.length?<p className="mt-3 text-sm text-slate-400">{consented===false?'This student did not opt into screen incident recording. Activity flags remain available.':'No consented screen incidents recorded for this session.'}</p>:<ul className="mt-3 space-y-2">{clips.map(c=><li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"><div><p>{c.trigger_type.replaceAll('_',' ')}</p><p className="text-xs text-slate-400">{formatDateTime(c.started_at)} · {Math.round(c.size_bytes/1024)} KB · {c.ended_at?c.finish_reason?.replaceAll('-',' '):'Recording in progress'}</p></div><button disabled={!c.ended_at||!c.size_bytes||!!busy} type="button" className="btn btn-ghost btn-sm" onClick={()=>play(c)}>{busy===c.id?'Loading…':c.ended_at?(c.size_bytes?'Review clip':'Activity only'):'Recording…'}</button></li>)}</ul>}
  {video&&<video controls src={video} className="mt-4 aspect-video w-full rounded-lg bg-black" playsInline aria-label="Recorded screen incident"/>}
 </section>
}
