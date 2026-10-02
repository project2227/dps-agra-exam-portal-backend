import { saveArcadeScore } from '../../services/accountApi'
import {useEffect,useState} from 'react'
import {BrainCircuit,RefreshCcw} from 'lucide-react'
const make=n=>Array.from({length:n},()=>Math.floor(Math.random()*9))
export default function MemoryMatrix({onBack}){
 const [level,setLevel]=useState(1),[pattern,setPattern]=useState(()=>make(3)),[position,setPosition]=useState(0)
 const [show,setShow]=useState(true),[lit,setLit]=useState(-1),[mistake,setMistake]=useState(false)
 useEffect(()=>{
  if(!show||level>5)return
  let timers=[]
  pattern.forEach((tile,i)=>{
    timers.push(setTimeout(()=>setLit(tile),i*650+450))
    timers.push(setTimeout(()=>setLit(-1),i*650+980))
  })
  timers.push(setTimeout(()=>setShow(false),pattern.length*650+1050))
  return()=>timers.forEach(clearTimeout)
 },[pattern,show,level])
 function pick(tile){
  if(show||mistake)return
  if(pattern[position]!==tile){setMistake(true);return}
  if(position===pattern.length-1){
   saveArcadeScore('memory',level)
   setLevel(n=>n+1);setPattern(make(Math.min(3+level,7)));setPosition(0);setShow(true);setMistake(false)
  }else setPosition(n=>n+1)
 }
 if(level>5)return <section className="glass p-12 text-center"><BrainCircuit className="mx-auto text-dps-neon" size={54}/><h2 className="mt-6 text-3xl font-bold">Memory unlocked.</h2><p className="mt-2 text-slate-400">You recalled five increasingly long patterns.</p><button onClick={onBack} className="btn btn-primary mt-6">Back to arcade</button></section>
 return <section className="glass p-7 sm:p-10"><span className="chip">MEMORY MATRIX · LEVEL {level} / 5</span><h2 className="mt-4 text-3xl font-bold">Remember the sequence.</h2><p className="mt-2 text-slate-400">{show?'Watch the tiles light up.':mistake?'Not quite. Replay the pattern and try again.':'Your turn. Tap the tiles in the same order.'}</p>
  <div className="mx-auto mt-8 grid max-w-sm grid-cols-3 gap-3">{Array.from({length:9},(_,i)=><button type="button" key={i} aria-label={'Tile '+(i+1)} disabled={show||mistake} onClick={()=>pick(i)} className={'aspect-square rounded-2xl border transition duration-150 '+(lit===i?'scale-105 border-dps-neon bg-green-400/70 shadow-glow':'border-white/10 bg-white/5 hover:border-dps-neon/70 hover:bg-green-500/20')}><span className="sr-only">{i+1}</span></button>)}</div>
  <div className="mt-5 text-center text-sm text-slate-400">{show?'Memorize the pattern':position+' of '+pattern.length+' recalled'}</div>
  <div className="mt-6 flex justify-center gap-3">{mistake&&<button className="btn btn-primary" onClick={()=>{setMistake(false);setPosition(0);setShow(true)}}><RefreshCcw size={17}/> Replay</button>}<button className="btn btn-ghost" onClick={onBack}>Leave challenge</button></div>
 </section>
}
