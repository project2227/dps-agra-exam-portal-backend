import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, UserPlus, ArrowLeft, Send } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { API_BASE_URL } from '../config'

const classChoices = ['VI','VII','VIII','IX','X','XI','XII']
const empty = { name:'', email:'', subject:'Computers', requestedClasses:[], message:'', authorized:false }

export default function TeacherAccessRequest() {
 const [form,setForm]=useState(empty)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
 const set=(key,value)=>setForm(current=>({...current,[key]:value}))
 async function submit(event) {
  event.preventDefault();setBusy(true);setError('')
  try {
   if (!form.authorized) throw Error('Only actual staff should request teacher access.')
   const response = await fetch(`${API_BASE_URL}/api/staff-access/request`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     name:form.name,email:form.email,subject:form.subject,
     requestedClasses:form.requestedClasses,message:form.message
    }),signal:AbortSignal.timeout(20000)
   })
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(response.status===429?'Too many attempts. Please wait and try again.':payload.error||'Could not submit your request.')
   setDone(true)
  } catch(err){setError(err.message)} finally{setBusy(false)}
 }
 return <div className="flex min-h-screen flex-col"><Navbar/>
 <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-12">
  <Link className="inline-flex items-center gap-2 text-sm text-dps-neon hover:underline" to="/teacher/login"><ArrowLeft size={16}/> Teacher login</Link>
  <div className="glass-strong rounded-2xl p-6 sm:p-9">
   <span className="chip"><ShieldCheck size={14}/> Administrator-reviewed</span>
   <h1 className="mt-4 text-3xl font-bold">Request teacher access</h1>
   <p className="mt-2 text-slate-400">For teachers invited to test this independent student-built learning platform. Submitting this form never creates a teacher account. The portal owner must verify you and approve your request.</p>
   {done?<div className="mt-7 space-y-4 rounded-xl border border-dps-green/40 bg-dps-green/10 p-6" role="status">
    <h2 className="text-xl font-semibold">Request received</h2>
    <p>Thank you. If eligible, an authorized administrator can review your request. You cannot sign in until they approve it and give you a temporary password privately.</p>
    <Link to="/teacher/login" className="btn btn-primary">Return to teacher login</Link>
   </div>:
   <form onSubmit={submit} className="mt-7 space-y-4">
    <label className="block text-sm">Full name<input className="input mt-1" required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={e=>set('name',e.target.value)}/></label>
    <label className="block text-sm">Email<input className="input mt-1" type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={e=>set('email',e.target.value)}/></label>
    <label className="block text-sm">Subject<input className="input mt-1" required minLength={2} maxLength={90} value={form.subject} onChange={e=>set('subject',e.target.value)}/></label>
    <fieldset><legend className="text-sm">Classes requested (optional)</legend><div className="mt-3 flex flex-wrap gap-3">
     {classChoices.map(c=><label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requestedClasses.includes(c)} onChange={e=>set('requestedClasses',e.target.checked?[...form.requestedClasses,c]:form.requestedClasses.filter(x=>x!==c))}/>{c}</label>)}
    </div></fieldset>
    <label className="block text-sm">Additional context (optional)<textarea className="input mt-1 min-h-24" maxLength={400} value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Which subject or classes are you authorized to teach?"/></label>
    <label className="flex items-start gap-3 text-sm text-slate-300"><input type="checkbox" className="mt-1" required checked={form.authorized} onChange={e=>set('authorized',e.target.checked)}/><span>I am requesting access as a genuine teacher or invited test participant. I understand the portal is an independent educational platform and this form does not establish school affiliation.</span></label>
    {error&&<p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-300">{error}</p>}
    <button disabled={busy||!form.authorized} className="btn btn-primary w-full"><Send size={16}/>{busy?'Sending request...':'Submit for administrator review'}</button>
   </form>}
  </div>
  <p className="text-center text-sm text-slate-400"><UserPlus size={16} className="mr-1 inline"/> Student? Use the <Link className="text-dps-neon underline" to="/learn">Learning Hub</Link> instead.</p>
 </main><Footer/></div>
}
