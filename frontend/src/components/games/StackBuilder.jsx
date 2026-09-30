import {useState} from 'react'
import {ArrowDown,ArrowRight,ArrowUp,Code2} from 'lucide-react'
const tasks=[
 {title:'Greet the world',language:'Python',lines:['greet()','    print("Hello")','def greet():'],correct:[2,1,0],explain:'Define the function before calling it.'},
 {title:'A squared number',language:'Python',lines:['print(x*x)','x = int(input())'],correct:[1,0],explain:'Read and convert the input before using it in arithmetic.'},
 {title:'An accessible page',language:'HTML',lines:['</main></body></html>','<main><h1>Welcome</h1>','<html><body>'],correct:[2,1,0],explain:'HTML content belongs inside its opening and closing tags.'},
 {title:'Query the best scores',language:'SQL',lines:['ORDER BY score DESC;','SELECT name,score','FROM students WHERE score>=80'],correct:[1,2,0],explain:'SELECT identifies columns, FROM the table, and ORDER BY sorts the results.'},
 {title:'Use a JavaScript function',language:'JavaScript',lines:['console.log(double(5));','function double(n){return n*2;}'],correct:[1,0],explain:'Define the function, then call it with 5.'}
]
export default function StackBuilder({onBack}){
 const [level,setLevel]=useState(0),[sequence,setSequence]=useState([0,1,2]),[state,setState]=useState('')
 const task=tasks[Math.min(level,tasks.length-1)]
 function shift(at,dir){if(state==='pass'||at+dir<0||at+dir>=sequence.length)return
  const copy=[...sequence];[copy[at],copy[at+dir]]=[copy[at+dir],copy[at]];setSequence(copy);setState('')}
 function verify(){
  if(state==='pass'){
   const n=level+1;setLevel(n);setState('')
   if(n<tasks.length)setSequence(tasks[n].lines.map((_,i)=>i))
   try{localStorage.setItem('dps.arcade.stack',String(n))}catch{}
   return
  }
  setState(sequence.every((x,i)=>x===task.correct[i])?'pass':'retry')
 }
 if(level===tasks.length)return <section className="glass p-12 text-center"><Code2 className="mx-auto text-dps-neon" size={54}/><h2 className="mt-5 text-3xl font-bold">Code architect!</h2><p className="mt-2">Five programs assembled, zero coding environment required.</p><button className="btn btn-primary mt-6" onClick={onBack}>Back to arcade</button></section>
 return <section className="glass p-7 sm:p-10"><span className="chip">STACK BUILDER · MISSION {level+1} / {tasks.length}</span><h2 className="mt-4 text-3xl font-bold">{task.title}</h2><p className="mt-2 text-slate-400">Reorder these {task.language} blocks into an executable sequence using the arrow buttons.</p>
  <div className="mt-7 space-y-3">{sequence.map((block,i)=><div className="motion-surface flex items-center gap-3 rounded-xl border border-white/15 bg-navy-950/40 p-4" key={block}><span className="w-6 font-mono text-xs text-dps-gold">{i+1}</span><code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-sm text-dps-neon">{task.lines[block]}</code><div className="flex flex-col gap-1 sm:flex-row"><button type="button" disabled={i===0||state==='pass'} onClick={()=>shift(i,-1)} className="btn btn-ghost btn-sm" aria-label={'Move block '+(i+1)+' up'}><ArrowUp size={16}/></button><button type="button" disabled={i===sequence.length-1||state==='pass'} onClick={()=>shift(i,1)} className="btn btn-ghost btn-sm" aria-label={'Move block '+(i+1)+' down'}><ArrowDown size={16}/></button></div></div>)}</div>
  {state&&<div role="status" className={'mt-6 rounded-xl border p-4 text-sm '+(state==='pass'?'border-dps-neon/40 text-dps-neon':'border-dps-gold/30 text-amber-300')}>{state==='pass'?task.explain:'Not quite yet. Think about which code has to run first, and rearrange your stack.'}</div>}
  <div className="mt-6 flex flex-wrap gap-3"><button className="btn btn-primary" onClick={verify}>{state==='pass'?'Next mission':'Run the sequence'} <ArrowRight size={16}/></button><button className="btn btn-ghost" onClick={onBack}>Other games</button></div>
 </section>
}
