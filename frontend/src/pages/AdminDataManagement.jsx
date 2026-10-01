import {useEffect,useMemo,useState} from 'react'
import {Database,RefreshCw,Search,ShieldCheck,Trash2} from 'lucide-react'
import {getTeacherAuth} from '../services/session'
import {releaseRequest} from '../services/releaseApi'
import {formatDateTime} from '../utils/format'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
export default function AdminDataManagement() {
 const admin=getTeacherAuth()?.teacher?.role==='admin'
 const [tests,setTests]=useState([]),[selected,setSelected]=useState([]),[query,setQuery]=useState('')
 const [preview,setPreview]=useState(null),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const load=async()=>{try{const r=await releaseRequest('/admin/data/tests');setTests(r.tests);setSelected([])}catch(e){setError(e.message)}}
 useEffect(()=>{if(admin)load()},[admin])
 const visible=useMemo(()=>tests.filter(t=>(t.title+' '+t.class_name+' '+t.teacher_name).toLowerCase().includes(query.toLowerCase())),[tests,query])
 if(!admin)return <p className="glass p-8 text-red-300" role="alert">Data management is available only to the administrator.</p>
 const review=async()=>{setBusy(true);setError('');try{setPreview(await releaseRequest('/admin/data/preview',{method:'POST',body:{examIds:selected}}));setTyped('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 const purge=async()=>{setBusy(true);setError('');try{const r=await releaseRequest('/admin/data/tests',{method:'DELETE',body:{examIds:selected,confirmation:typed}});setPreview(null);setNotice(r.notice);await load();window.dispatchEvent(new CustomEvent('dps:exam-data-changed'))}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="mx-auto max-w-6xl space-y-6">
  <PageHeader title="Test data management" subtitle="Permanently remove old tests and their linked data. Deleted tests do not appear in Recently removed." actions={<button type="button" className="btn btn-ghost" onClick={load}><RefreshCw size={16}/> Refresh</button>}/>
  <div className="grid gap-3 sm:grid-cols-3">{[[Database,tests.length,'Total tests'],[ShieldCheck,tests.filter(t=>t.deletable).length,'Eligible for cleanup'],[Trash2,selected.length,'Selected']].map(([Icon,n,label])=><div key={label} className="glass flex items-center gap-3 p-5"><Icon className="text-dps-neon" size={22}/><div><p className="text-2xl font-semibold">{n}</p><p className="text-xs text-slate-400">{label}</p></div></div>)}</div>
  {error&&<p className="rounded-xl border border-red-400/30 p-4 text-red-200" role="alert">{error}</p>}
  {notice&&<p className="rounded-xl border border-emerald-400/30 p-4 text-emerald-200" role="status">{notice}</p>}
  <section className="glass space-y-4 p-4 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><label className="relative w-full max-w-md"><Search className="absolute left-3 top-3 text-slate-500" size={16}/><span className="sr-only">Search tests</span><input value={query} onChange={e=>setQuery(e.target.value)} className="input pl-10" placeholder="Search test, class or teacher"/></label><button type="button" className="btn btn-danger" disabled={!selected.length||busy} onClick={review}><Trash2 size={16}/> Review deletion ({selected.length})</button></div>
   <p className="text-xs text-slate-400">Only drafts, closed tests and expired tests can be selected. Live and scheduled exams are protected. Select up to 50 at a time.</p>
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-white/10 text-xs text-slate-400"><th className="p-3">Select</th><th className="p-3">Test / teacher</th><th className="p-3">Class</th><th className="p-3">Ends</th><th className="p-3">Sessions</th><th className="p-3">Status</th></tr></thead><tbody>{visible.map(t=><tr key={t.id} className="border-b border-white/[.05]"><td className="p-3"><input type="checkbox" className="h-4 w-4 accent-dps-green" aria-label={'Select '+t.title} checked={selected.includes(t.id)} disabled={busy||!t.deletable||(!selected.includes(t.id)&&selected.length>=50)} onChange={e=>setSelected(s=>e.target.checked?[...s,t.id]:s.filter(x=>x!==t.id))}/></td><td className="p-3"><p className="font-medium">{t.title}</p><p className="text-xs text-slate-400">{t.teacher_name}</p></td><td className="p-3">{t.class_name} · {t.section}</td><td className="whitespace-nowrap p-3 text-xs">{formatDateTime(t.end_time)}</td><td className="p-3">{t.sessions}</td><td className="p-3"><span className="chip">{t.archived_at?'Archived':t.status}</span></td></tr>)}</tbody></table>{!visible.length&&<p className="py-12 text-center text-slate-400">No matching test records.</p>}</div>
  </section>
  <Modal open={!!preview} title="Permanently delete test data" onClose={()=>!busy&&setPreview(null)} dismissible={!busy} size="md" footer={<><button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>setPreview(null)}>Keep data</button><button type="button" className="btn btn-danger" disabled={busy||typed!==preview?.confirmation} onClick={purge}>{busy?'Deleting…':'Delete permanently'}</button></>}>
   <p className="text-sm text-slate-300">This permanently deletes the selected tests and their questions, sessions, answers, code runs, flags and incident clips. They cannot be restored from the app and will not appear in Recently removed. Teacher accounts, courses and handouts stay available.</p>
   <div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(preview?.counts||{}).map(([k,n])=><div key={k} className="rounded-lg border border-white/10 p-3 text-sm"><strong>{n}</strong> {k}</div>)}</div>
   <label className="mt-5 block text-sm">Type <strong className="font-mono text-red-200">{preview?.confirmation}</strong><input autoComplete="off" className="input mt-2 font-mono" value={typed} onChange={e=>setTyped(e.target.value)}/></label>
  </Modal>
 </div>
}
