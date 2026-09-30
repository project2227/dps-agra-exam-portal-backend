import { useEffect, useState } from 'react'
import { Download, NotebookPen } from 'lucide-react'
export default function StudyNotes({id,title}){
 const key=`dps.study.notes:${id}`
 const [notes,setNotes]=useState(()=>{try{return localStorage.getItem(key)||''}catch{return''}})
 useEffect(()=>{try{setNotes(localStorage.getItem(key)||'')}catch{setNotes('')}},[key])
 useEffect(()=>{const timer=setTimeout(()=>{try{localStorage.setItem(key,notes)}catch{}},350);return()=>clearTimeout(timer)},[key,notes])
 function save(){const blob=new Blob([`# ${title} — personal study notes\n\n${notes}\n`],{type:'text/plain'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`my-${String(id).replace(/[^a-z0-9-]/gi,'-')}-notes.txt`;link.click();URL.revokeObjectURL(url)}
 return <section className="glass p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex gap-2 font-semibold"><NotebookPen size={17} className="text-dps-neon"/> Your private notes</h3><button className="btn btn-ghost btn-sm" onClick={save} disabled={!notes.trim()}><Download size={13}/> Export notes</button></div><p className="mt-2 text-xs text-slate-500">Saved on this device only. Never visible to teachers or sent to any AI service.</p><textarea className="input mt-4 min-h-28" maxLength={12000} placeholder="What did you learn? What would you like to try?" value={notes} onChange={e=>setNotes(e.target.value)}/></section>
}
