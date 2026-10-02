import * as m from 'motion/react-m'
import {useQuietMotion,motionTokens} from './Motion'
import {useEffect,useRef,useState} from 'react'
import {useLocation,useNavigate} from 'react-router-dom'
import {ArrowUpRight,Search,X} from 'lucide-react'
import {getTeacherAuth} from '../../services/session'
const tools=[['Join an exam','Student check-in and waiting room','/student/join'],['Practice coding','Python, SQL and web IDE','/student/practice'],['Courses & study PDFs','Seven learning paths','/learn'],['Build a practice test','Topic, difficulty and question count','/learn/custom-test'],['Logic arcade','Three interactive coding games','/learn/arcade'],['My learning profile','Saved progress and achievements','/learn/profile'],['Teacher dashboard','Host, monitor and review exams','/teacher/dashboard'],['Manage hosted exams','Published tests and archives','/teacher/exams/manage'],['Admin data management','Permanently delete old tests','/teacher/test-data','admin']]
export default function ToolFinder() {
 const quiet=useQuietMotion()
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(0)
 const input=useRef(null),previous=useRef(null),nav=useNavigate(),loc=useLocation()
 const inExam=loc.pathname.startsWith('/student/exam/')
 const results=tools.filter(t=>(!t[3]||getTeacherAuth()?.teacher?.role===t[3])&&(t[0]+' '+t[1]).toLowerCase().includes(query.toLowerCase()))
 const close=()=>{setOpen(false);previous.current?.focus?.()}
 useEffect(()=>{const show=()=>{if(inExam)return;previous.current=document.activeElement;setQuery('');setSelected(0);setOpen(true)};const keys=e=>{if(inExam)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();show()}};window.addEventListener('dps:find-tool',show);window.addEventListener('keydown',keys);return()=>{window.removeEventListener('dps:find-tool',show);window.removeEventListener('keydown',keys)}},[inExam])
 useEffect(()=>{if(open)input.current?.focus()},[open])
 useEffect(()=>setOpen(false),[loc.pathname])
 const go=t=>{close();nav(t[2])}
 if(!open||inExam)return null
 return <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-sm" onClick={close} role="dialog" aria-modal="true" aria-label="Find a page" onKeyDown={e=>{if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll('input,button')].filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}if(e.key==='Escape')close();if(e.key==='ArrowDown'){e.preventDefault();setSelected(i=>Math.min(results.length-1,i+1))}if(e.key==='ArrowUp'){e.preventDefault();setSelected(i=>Math.max(0,i-1))}if(e.key==='Enter'&&e.target===input.current&&results[selected])go(results[selected])}}>
  <m.div initial={quiet?false:{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} transition={{duration:motionTokens.enter,ease:motionTokens.ease}} className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/10 p-4"><Search size={20} className="text-dps-neon"/><input ref={input} className="min-w-0 flex-1 bg-transparent text-lg outline-none" aria-label="Search tools" placeholder="What would you like to do?" value={query} onChange={e=>{setQuery(e.target.value);setSelected(0)}}/><button type="button" className="btn btn-ghost btn-sm" aria-label="Close tool finder" onClick={close}><X size={16}/></button></div><div className="max-h-[50vh] overflow-y-auto p-2">{results.map((t,i)=><button type="button" className={'flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/5 '+(selected===i?'bg-dps-green/10 ring-1 ring-dps-green/30':'')} key={t[2]} onClick={()=>go(t)}><span><span className="block text-sm font-semibold">{t[0]}</span><span className="text-xs text-slate-400">{t[1]}</span></span><ArrowUpRight size={16}/></button>)}{!results.length&&<p className="p-6 text-center text-slate-400">No tools found. Try “exam”, “coding” or “practice”.</p>}</div><p className="border-t border-white/10 p-3 text-xs text-slate-400">↑ ↓ to choose · Enter to open · Esc to close · Ctrl / ⌘ K to search</p></m.div>
 </div>
}
