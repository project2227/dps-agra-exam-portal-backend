import {useState} from 'react'
import {DoorOpen,UserX} from 'lucide-react'
import Modal from '../common/Modal'
import {releaseRequest} from '../../services/releaseApi'
export default function ParticipantControls({student,onChanged}) {
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const live=['joined','active','flagged','disconnected'].includes(student.status)
 const act=async readmit=>{setBusy(true);setError('');try{await releaseRequest('/teacher/sessions/'+student.sessionId+(readmit?'/readmit':'/kick'),{method:'POST',body:readmit?{}:{reason:reason.trim()}});setOpen(false);onChanged?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><div className="rounded-xl border border-red-400/20 p-4"><h3 className="text-sm font-semibold">Participant management</h3><p className="mt-2 text-xs text-slate-400">Removing a student ends this session and blocks rejoining until you readmit them. It does not automatically fail or grade their work.</p><div className="mt-3 flex gap-2">{live&&<button type="button" className="btn btn-danger btn-sm" onClick={()=>{setReason('');setError('');setOpen(true)}}><UserX size={15}/> Remove from exam</button>}{student.kicked&&<button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>act(true)}><DoorOpen size={15}/> Allow rejoining</button>}</div>{error&&!open&&<p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}</div>
  <Modal open={open} title={'Remove '+student.name+' from this exam?'} onClose={()=>!busy&&setOpen(false)} dismissible={!busy} size="md" footer={<><button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>setOpen(false)}>Keep student</button><button type="button" className="btn btn-danger" disabled={busy||reason.trim().length<3} onClick={()=>act(false)}>{busy?'Removing…':'Remove student'}</button></>}><p className="text-sm text-slate-300">Their answers remain available for review. The student will see your reason and cannot reuse the old token.</p><label className="mt-4 block text-sm">Reason shown to student<textarea maxLength={260} className="input mt-2" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain the reason and how to contact you."/></label>{error&&<p className="mt-3 text-red-300" role="alert">{error}</p>}</Modal>
 </>
}
