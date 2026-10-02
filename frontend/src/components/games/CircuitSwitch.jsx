import { saveArcadeScore } from '../../services/accountApi'
import {useState} from 'react'
import {ArrowRight,RefreshCcw,Zap} from 'lucide-react'
const rounds=[['AND',1],['OR',1],['XOR',0],['AND',0],['XOR',1],['OR',0]]
function gate(name,a,b){return name==='AND'?a&b:name==='OR'?a|b:a^b}
export default function CircuitSwitch({onBack}){
 const [round,setRound]=useState(0),[inputs,setInputs]=useState([0,0]),[result,setResult]=useState(null)
 const [wins,setWins]=useState(0)
 const finished=round>=rounds.length,task=rounds[Math.min(round,rounds.length-1)]
 function advance(){if(result==='correct'){setRound(r=>r+1);setInputs([0,0]);setResult(null);return}
  const ok=gate(task[0],...inputs)===task[1];setResult(ok?'correct':'try again')
  if(ok){setWins(s=>s+1);saveArcadeScore('circuit',wins+1)}
 }
 if(finished)return <div className="glass p-12 text-center"><Zap className="mx-auto text-dps-gold" size={50}/><h2 className="mt-5 text-3xl font-bold">Circuit champion!</h2><p className="mt-3">You solved all {wins} logic challenges.</p><button className="btn btn-primary mt-6" onClick={onBack}>Back to arcade</button></div>
 const output=gate(task[0],...inputs)
 return <section className="glass p-7 sm:p-10"><span className="chip">CIRCUIT SWITCH · {round+1}/{rounds.length}</span><h2 className="mt-4 text-3xl font-bold">Make the signal match.</h2><p className="mt-2 text-slate-400">Flip input switches to reach output <strong className="text-dps-gold">{task[1]}</strong> through a {task[0]} gate.</p>
  <div className="mt-9 grid items-center gap-5 sm:grid-cols-[1fr,auto,1fr]">
   <div className="space-y-3">{inputs.map((n,i)=><button key={i} className={'motion-surface w-full rounded-xl border p-5 text-left font-mono '+(n?'border-dps-neon bg-green-500/15':'border-white/10')} aria-pressed={!!n} onClick={()=>{setInputs(prev=>prev.map((x,j)=>i===j?1-x:x));setResult(null)}}>INPUT {i?'B':'A'} <b className="float-right">{n?'ON':'OFF'}</b></button>)}</div>
   <div className="rounded-3xl border border-dps-gold/40 bg-amber-400/5 p-7 text-center font-mono"><Zap className="mx-auto mb-2 text-dps-gold"/>{task[0]}</div>
   <div className="text-center"><span className="text-xs tracking-widest text-slate-400">LIVE OUTPUT</span><div className={'mx-auto mt-2 grid h-28 w-28 place-items-center rounded-3xl border text-6xl font-extrabold transition-all '+(output?'border-dps-neon bg-green-500/15 text-dps-neon shadow-glow':'border-white/10')}>{output}</div></div>
  </div>
  {result&&<p role="status" className={'mt-6 rounded-xl border p-4 '+(result==='correct'?'border-dps-neon/50 text-dps-neon':'border-amber-400/30 text-amber-300')}>{result==='correct'?'Perfect circuit. You have mastered this stage!':'Try a different combination and watch the live output.'}</p>}
  <div className="mt-7 flex flex-wrap gap-3"><button className="btn btn-primary" onClick={advance}>{result==='correct'?'Next circuit':'Check output'} <ArrowRight size={16}/></button><button className="btn btn-ghost" onClick={()=>{setInputs([0,0]);setResult(null)}}><RefreshCcw size={15}/> Reset inputs</button><button className="btn btn-ghost" onClick={onBack}>Exit</button></div>
 </section>
}
