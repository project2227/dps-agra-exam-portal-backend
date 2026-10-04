import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../components/common/Button';
import { usePlatform } from './Context';
import { request } from './api';
import { useQuery, FetchState } from './Shell';
export default function WorkProgress(){
 const {user}=usePlatform();const [from,setFrom]=useState(new Date(Date.now()-6*86400000).toISOString().slice(0,10)),[to,setTo]=useState(new Date().toISOString().slice(0,10));
 const q=useQuery('/api/productivity/report?from='+from+'&to='+to),tasks=useQuery('/api/workplace/tasks');
 const [taskId,setTaskId]=useState(''),[summary,setSummary]=useState(''),[aiConsent,setAiConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const rows=q.data?.rows||[];const hours=rows.reduce((a,r)=>a+r.estimated_engaged_hours,0);
 const save=async e=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await request('/api/productivity/summaries',{method:'POST',body:{taskId,summary,aiConsent}});setSummary('');setMessage(r.review?.explanation||'Work summary saved.');q.refresh();}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return <>
  <div className="p-page-heading"><div><p className="p-caption">Tasks, activity and outcomes</p><h1>Work progress</h1><p>Make completed work visible. Activity estimates support a conversation; they do not measure an employee’s value.</p></div>
   <Button variant="secondary" onClick={async()=>{try{const file=await request('/api/productivity/export.csv?from='+from+'&to='+to,{blob:true});const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='plinth-work-progress.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setMessage(e.message);}}}><Download size={16}/> Download employee report</Button></div>
  <div className="p-grid-two"><section className="p-card"><h2>Report period</h2><label>From (UTC)<input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To (UTC)<input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><p><strong>{hours.toFixed(2)} hours</strong> of estimated observed engagement.</p><p>Includes editing, observed device interaction and declared reading or meetings. Idle and unknown time are separate. Unobserved time is excluded. Native device input does not establish relevance or quality.</p></section>
  <form className="p-card" onSubmit={save}><h2>What did you move forward?</h2><FetchState query={tasks}><label>Your assigned task<select className="input" required value={taskId} onChange={e=>setTaskId(e.target.value)}><option value="">Choose a task</option>{tasks.data?.tasks.filter(t=>t.assignee_id===user.id).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></FetchState>
   <label>Work summary<textarea className="input" minLength={10} maxLength={3000} rows={4} required value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Describe the result, evidence and next step."/></label>
   <label className="p-checkbox"><input type="checkbox" checked={aiConsent} disabled={!q.data?.aiConnected} onChange={e=>setAiConsent(e.target.checked)}/> Ask the organisation’s local AI to compare this summary with the task.</label>
   <p>Only this submitted summary and task description are sent. Suggestions require human review.{!q.data?.aiConnected?' Local AI is not connected yet.':''}</p><Button type="submit" disabled={busy}>{busy?'Saving…':'Save work summary'}</Button></form></div>
  {message&&<p role="status" className="p-card">{message}</p>}
  <FetchState query={q}>{rows.length?<div className="p-table-wrap"><table><caption className="sr-only">Employee activity estimates and work summaries</caption><thead><tr><th>Employee / date</th><th>Estimated hours</th><th>Idle / unknown</th><th>Tasks / summaries</th><th>Observation</th></tr></thead><tbody>{rows.map(r=><tr key={r.employee_id+String(r.day)}><td>{r.name}<small>{r.day?new Date(r.day).toISOString().slice(0,10):'No observations'}</small></td><td>{r.estimated_engaged_hours.toFixed(2)}</td><td>{(r.idle_seconds/60).toFixed(0)}m / {(r.unknown_seconds/60).toFixed(0)}m</td><td>{r.tasks} / {r.summaries}</td><td>{r.confidence}</td></tr>)}</tbody></table></div>:<div className="p-empty">No observed work yet. Accept the activity notice and start a sharing session, then add a summary of an assigned task.</div>}</FetchState>
 </>;
}
