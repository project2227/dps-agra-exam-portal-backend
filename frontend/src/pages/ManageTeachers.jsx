import { useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, UserX, Users, ClipboardCopy, CheckCircle, RefreshCcw } from 'lucide-react'
import { getTeacherAuth } from '../services/session'
import { http } from '../services/api'
import { learningApi } from '../services/learningApi'
import { formatDateTime } from '../utils/format'

const classes=['VI','VII','VIII','IX','X','XI','XII']
const blank=()=>({name:'',email:'',subject:'Computers',assignedClasses:[],password:''})
const problem=e=>e.response?.data?.error||e.message||'Request failed'
const securePassword=()=>{
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#'
 if(!window.crypto?.getRandomValues)throw Error('Secure password generation requires HTTPS.')
 const bytes=new Uint32Array(24);window.crypto.getRandomValues(bytes)
 return Array.from(bytes,n=>alphabet[n%alphabet.length]).join('')
}
export default function ManageTeachers(){
 const auth=getTeacherAuth()
 const [teachers,setTeachers]=useState([]),[requests,setRequests]=useState([])
 const [form,setForm]=useState(blank),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [busy,setBusy]=useState(''),[issued,setIssued]=useState(null)
 const authorized=auth?.teacher?.role==='admin'
 const staff=(method,path,data)=>http({method,url:`/api/staff-access${path}`,data,headers:{Authorization:`Bearer ${auth.token}`}}).then(r=>r.data)
 const reload=async()=>{
  try {
   const [staffList,pending]=await Promise.all([
    learningApi('/teacher/admin/teachers',{teacher:true}),
    staff('GET','/admin/requests')
   ])
   setTeachers(staffList.teachers||[]);setRequests(pending.requests||[])
  }catch(e){setError(problem(e))}
 }
 useEffect(()=>{if(authorized)reload()},[authorized])
 if(!authorized)return <div className="glass rounded-xl p-8 text-red-300" role="alert">Administrator-only. Request teacher access from the public login page; student and ordinary teacher accounts cannot enroll staff.</div>
 const resetMessages=()=>{setError('');setNotice('');setIssued(null)}
 async function create(e){
  e.preventDefault();resetMessages();setBusy('create')
  try {
   const pass=form.password||securePassword()
   const response=await http.post('/api/auth/teacher/register',{
    ...form, password:pass,role:'teacher'
   },{headers:{Authorization:`Bearer ${auth.token}`}})
   setIssued({name:response.data.teacher.name,email:response.data.teacher.email,password:pass})
   setNotice('Teacher enrolled. Credentials appear once below; share them securely and ask the teacher to change the temporary password immediately.')
   setForm(blank());await reload()
  }catch(e){setError(problem(e))}finally{setBusy('')}
 }
 async function review(req,approve){
  resetMessages();setBusy(req.id)
  try {
   if(approve){
    if(!window.confirm(`I verified ${req.name} (${req.email}) is eligible to join as a teacher. Continue?`))return
    const response=await staff('POST',`/admin/requests/${req.id}/approve`,{assignedClasses:req.requested_classes||[]})
    setIssued({name:response.teacher.name,email:response.teacher.email,password:response.temporaryPassword})
    setNotice('Verified request approved. Share the one-time temporary password through a private channel.')
   }else{
    if(!window.confirm(`Decline the unverified request from ${req.email}?`))return
    await staff('POST',`/admin/requests/${req.id}/decline`,{})
    setNotice('Request declined. No account was created.')
   }
   await reload()
  }catch(e){setError(problem(e))}finally{setBusy('')}
 }
 async function toggle(t){
  resetMessages()
  if(!window.confirm(`${t.active?'Deactivate':'Reactivate'} ${t.name}?`))return
  try{await learningApi(`/teacher/admin/teachers/${t.id}`,{teacher:true,method:'PATCH',body:{active:!t.active}});await reload()}
  catch(e){setError(problem(e))}
 }
 async function copyIssued(){
  try{await navigator.clipboard.writeText(`Name: ${issued.name}\nLogin: ${issued.email}\nTemporary password: ${issued.password}\nSign in: ${location.origin}/teacher/login\nChange the password immediately from My Account.`);setNotice('Copied. Send privately; never paste staff credentials into public chats.')}
  catch{setError('Clipboard unavailable. Select and copy the credentials manually.')}
 }
 return <div className="mx-auto max-w-6xl space-y-7">
  <span className="chip"><ShieldCheck size={14}/> Administrator only</span>
  <h1 className="text-3xl font-bold">Teacher enrollment</h1>
  <p className="text-slate-400">Teachers can request access from the login page. Verify identity yourself, approve a request, then share the one-time password securely. Only verified teachers should receive a real account.</p>
  {error&&<p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-dps-green/30 bg-dps-green/10 p-4 text-dps-neon">{notice}</p>}
  {issued&&<section className="glass border border-amber-400/40 p-5" aria-label="One-time staff credentials">
   <h2 className="text-lg font-bold">One-time teacher credentials</h2>
   <p className="mt-2 text-sm text-amber-100">This password will disappear when you dismiss this panel or leave the page. Do not send it through a public chat.</p>
   <dl className="mt-4 space-y-2 text-sm"><div><dt>Name</dt><dd className="font-semibold">{issued.name}</dd></div><div><dt>Email</dt><dd className="font-semibold">{issued.email}</dd></div><div><dt>Temporary password</dt><dd className="break-all rounded-lg border border-white/10 p-3 font-mono select-all">{issued.password}</dd></div></dl>
   <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="btn btn-primary" onClick={copyIssued}><ClipboardCopy size={16}/> Copy credentials</button><button type="button" className="btn btn-ghost" onClick={()=>setIssued(null)}>Dismiss credentials</button></div>
  </section>}
  <section className="glass space-y-4 p-6">
   <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><UserPlus size={20}/> Awaiting verification <span className="chip">{requests.length}</span></h2><p className="mt-1 text-sm text-slate-400">Email addresses on this list are self-declared, not verified. Confirm identity independently.</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={reload}><RefreshCcw size={16}/> Refresh</button></div>
   {!requests.length?<p className="rounded-lg border border-white/10 p-4 text-sm text-slate-400">No pending requests. Share the public Teacher Login → Request access link with legitimate staff.</p>:requests.map(q=><div key={q.id} className="rounded-xl border border-white/10 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{q.name}</p><p className="text-sm text-slate-400">{q.email} · {q.subject}</p><p className="mt-1 text-xs text-slate-400">Requested classes: {(q.requested_classes||[]).join(', ')||'None'} · {formatDateTime(q.created_at)}</p>{q.message&&<p className="mt-2 text-sm text-slate-300">{q.message}</p>}</div><div className="flex gap-2"><button disabled={!!busy} type="button" className="btn btn-primary btn-sm" onClick={()=>review(q,true)}><CheckCircle size={14}/> Verify & approve</button><button disabled={!!busy} type="button" className="btn btn-ghost btn-sm" onClick={()=>review(q,false)}>Decline</button></div></div>
   </div>)}
  </section>
  <div className="grid gap-6 lg:grid-cols-2">
   <form onSubmit={create} className="glass space-y-4 p-6">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><UserPlus size={20}/> Direct enrollment</h2>
    <p className="text-sm text-slate-400">For staff you have already verified. You can leave the password blank to generate a secure temporary password.</p>
    <label className="block text-sm">Full name<input required minLength={2} maxLength={120} className="input mt-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label className="block text-sm">Staff email<input required type="email" maxLength={200} className="input mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="block text-sm">Subject<input required className="input mt-1" maxLength={90} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
    <label className="block text-sm">Password (optional)<input className="input mt-1" type="password" minLength={12} maxLength={128} autoComplete="new-password" placeholder="Leave blank to generate securely" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <fieldset><legend className="text-sm">Assigned classes</legend><div className="mt-2 flex flex-wrap gap-3">{classes.map(c=><label key={c} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.assignedClasses.includes(c)} onChange={e=>setForm(f=>({...f,assignedClasses:e.target.checked?[...f.assignedClasses,c]:f.assignedClasses.filter(x=>x!==c)}))}/>{c}</label>)}</div></fieldset>
    <button disabled={!!busy} className="btn btn-primary w-full">{busy?'Please wait...':'Create verified teacher account'}</button>
   </form>
   <section className="glass p-6"><h2 className="flex gap-2 text-xl font-semibold"><Users size={20}/> Existing staff</h2><p className="mt-1 text-sm text-slate-400">{teachers.length} enrolled accounts. Your own admin account cannot be disabled.</p>
    {teachers.length===0?<p className="mt-5 text-sm text-slate-400">No teacher accounts yet.</p>:teachers.map(t=><div key={t.id} className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><b>{t.name}</b><p className="text-xs text-slate-400">{t.email} · {t.role}</p><p className="mt-1 text-xs text-slate-400">{t.assigned_classes?.join(', ')||'No assigned classes'}</p></div><button disabled={!!busy||t.id===auth.teacher.id} type="button" className="btn btn-ghost btn-sm" onClick={()=>toggle(t)}>{t.active?<><UserX size={14}/> Disable</>:'Reactivate'}</button></div>)}
   </section>
  </div>
 </div>
}
