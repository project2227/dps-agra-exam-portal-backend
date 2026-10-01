import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {Archive,ArrowLeft,ClipboardList,MonitorPlay,RotateCcw,Search,ShieldAlert,Trash2} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import GlassCard from '../components/common/GlassCard'
import Modal from '../components/common/Modal'
import {EmptyState,ErrorNote,Spinner} from '../components/common/Feedback'
import {useToast} from '../components/common/Toast'
import api from '../services/api'
import {formatDateTime} from '../utils/format'

/** Staff-only exam removal. Archive preserves submitted work and never silently
 * interrupts an exam with participating students. */
export default function ManageHostedExams(){
 const toast=useToast()
 const [tab,setTab]=useState('current'),[items,setItems]=useState(null)
 const [query,setQuery]=useState(''),[pending,setPending]=useState(null)
 const [typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=async type=>{
  setItems(null);setError('')
  try{setItems(await api.getTeacherExams({archived:type==='removed'}))}
  catch(e){setError(e.message)}
 }
 useEffect(()=>{load(tab)},[tab])
 const list=useMemo(()=>items?.filter(e=>{
  const text=(e.title+' '+e.class+' '+e.subject).toLowerCase()
  return text.includes(query.trim().toLowerCase())
 })||[],[items,query])
 const dismiss=()=>{setPending(null);setTyped('')}
 const remove=async()=>{
  if(!pending||typed.trim()!==pending.title)return
  setBusy(true)
  try{
   await api.removeExam(pending.id,typed.trim())
   toast('Exam removed from active lists. Records remain recoverable.','success')
   dismiss();await load(tab)
  }catch(e){setError(e.message);toast(e.message,'error')}
  finally{setBusy(false)}
 }
 const restore=async exam=>{
  if(!window.confirm('Restore "'+exam.title+'" to your exam list as a closed exam?'))return
  setBusy(true);setError('')
  try{await api.restoreExam(exam.id);toast('Restored as a closed exam.','success');await load(tab)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className="space-y-6">
  <PageHeader title="Manage hosted exams" subtitle="Manage published exams, remove old sessions from your active lists and recover archived records." actions={<Link to="/teacher/exams/create" className="btn btn-primary"><ClipboardList size={16}/> Create exam</Link>}/>
  <GlassCard className="p-4 sm:p-6">
   <div className="flex flex-wrap gap-2" role="tablist" aria-label="Exam archive">
    {['current','removed'].map(value=><button role="tab" aria-selected={tab===value} key={value} type="button" className={'btn btn-sm '+(tab===value?'btn-primary':'btn-ghost')} onClick={()=>setTab(value)}>{value==='current'?'Current & completed':'Recently removed'}</button>)}
   </div>
   <label className="relative mt-5 block max-w-md"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><span className="sr-only">Find an exam</span><input className="input pl-10" placeholder="Search title, class or subject" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {error&&<div className="mt-4"><ErrorNote message={error} onRetry={()=>load(tab)}/></div>}
   {!items&&!error?<div className="mt-6"><Spinner label="Loading exams"/></div>:items&&list.length===0?<div className="mt-8"><EmptyState icon={Archive} title={tab==='removed'?'No removed exams':'No matching exams'}>Your hosted exams will appear here when created.</EmptyState></div>:
   <div className="mt-5 grid gap-3">
    {list.map(exam=><article key={exam.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 p-4 transition-colors hover:border-dps-neon/30">
     <div className="min-w-0 flex-1">
      <h2 className="truncate text-lg font-semibold">{exam.title}</h2>
      <p className="mt-1 text-xs text-slate-400">Class {exam.class}{exam.section!=='All'?'-'+exam.section:''} · {exam.subject} · {exam.status} </p>
      <p className="mt-1 text-xs text-slate-400">Starts {formatDateTime(exam.startsAt)} · Ends {formatDateTime(exam.endsAt)}</p>
     </div>
     <div className="flex flex-wrap gap-2">
      {tab==='current'&&<><Link className="btn btn-ghost btn-sm" to={'/teacher/exams/'+exam.id+'/monitor'}><MonitorPlay size={16}/> Monitor / review</Link>
       <button className="btn btn-danger btn-sm" type="button" onClick={()=>{setPending(exam);setTyped('');setError('')}}><Trash2 size={16}/> Remove</button></>}
      {tab==='removed'&&<button type="button" disabled={busy} onClick={()=>restore(exam)} className="btn btn-primary btn-sm"><RotateCcw size={16}/> Restore</button>}
     </div>
    </article>)}
   </div>}
  </GlassCard>
  <p className="text-sm text-slate-400">Removal is a recoverable archive, not a deletion of student grades. You cannot remove a live exam while students are still taking it.</p>
  <Modal open={!!pending} onClose={dismiss} title="Remove hosted exam?" dismissible={!busy} size="md"
   footer={<><button disabled={busy} type="button" className="btn btn-ghost" onClick={dismiss}>Keep exam</button>
     <button disabled={busy||typed.trim()!==pending?.title} type="button" className="btn btn-danger" onClick={remove}><Archive size={16}/> {busy?'Removing…':'Remove exam'}</button></>}>
   <p className="text-sm text-slate-300">Remove <strong>{pending?.title}</strong> from current exams? Existing submitted work will be preserved. A live exam with students still taking it cannot be removed.</p>
   <p className="mt-3 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100"><ShieldAlert size={16} className="shrink-0"/> Archiving hides the exam from students. To prevent disruption, wait for all active students to submit before removing an ongoing exam.</p>
   <label className="mt-5 block text-sm">Type the exact exam title to confirm<input autoComplete="off" value={typed} onChange={e=>setTyped(e.target.value)} className="input mt-2" placeholder={pending?.title}/></label>
  </Modal>
 </div>
}
