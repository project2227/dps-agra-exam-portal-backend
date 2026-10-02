import { getGameBest } from '../services/accountApi'
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {ArrowLeft,ArrowRight,BrainCircuit,Code2,Gamepad2,Grid2X2,Sparkles,Zap} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import CircuitSwitch from '../components/games/CircuitSwitch'
import MemoryMatrix from '../components/games/MemoryMatrix'
import StackBuilder from '../components/games/StackBuilder'
const missions=[
 {id:'circuit',name:'Circuit Switch',icon:Zap,tag:'LOGIC ENGINE',description:'Flip real input switches to master AND, OR and XOR gates.',total:6},
 {id:'memory',name:'Memory Matrix',icon:Grid2X2,tag:'VISUAL MEMORY',description:'Watch the pattern, then reproduce longer sequences as you level up.',total:5},
 {id:'stack',name:'Stack Builder',icon:Code2,tag:'PROGRAM ARCHITECT',description:'Reorder actual Python, HTML, SQL and JavaScript blocks into runnable programs.',total:5}
]
const best=getGameBest
export default function ArcadeLabs(){
 const [active,setActive]=useState(null)
 const back=()=>setActive(null)
 return <div className="flex min-h-screen flex-col"><Navbar/><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
  {active?<><button className="btn btn-ghost btn-sm mb-6" onClick={back}><ArrowLeft size={16}/> Arcade lobby</button>
   {active==='circuit'?<CircuitSwitch key={active} onBack={back}/>:active==='memory'?<MemoryMatrix key={active} onBack={back}/>:<StackBuilder key={active} onBack={back}/>}
  </>:<><span className="chip border-dps-neon/30 text-dps-neon"><Gamepad2 size={15}/> THE EXPERIMENTAL ARCADE</span>
   <h1 className="mt-4 text-4xl font-extrabold sm:text-6xl">Play to <span className="text-gradient">understand.</span></h1><p className="mt-4 max-w-3xl text-lg text-slate-300">Leave endless multiple-choice tapping behind. Flip logic gates, reconstruct program flow and train your memory with hands-on mini games.</p>
   <div className="mt-9 grid gap-5 md:grid-cols-3">{missions.map((g,i)=>{const Icon=g.icon;return <article key={g.id} className="glass motion-surface group flex min-h-80 flex-col p-7 transition duration-300 hover:-translate-y-2 hover:border-dps-neon/40" style={{animationDelay:i*.09+'s'}}>
    <div className="mb-7 grid h-16 w-16 place-items-center rounded-2xl border border-dps-neon/30 bg-gradient-to-br from-dps-green/15 to-dps-orange/15 text-dps-neon"><Icon size={32}/></div>
    <p className="font-sans text-xs tracking-[.19em] text-dps-gold">{g.tag}</p><h2 className="mt-3 text-2xl font-bold">{g.name}</h2><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{g.description}</p>
    <div className="my-5 flex items-center justify-between text-xs text-slate-400"><span>{g.total} levels</span><span>Completed on this device: {best(g.id)}/{g.total}</span></div>
    <button onClick={()=>setActive(g.id)} className="btn btn-primary">Start mission <ArrowRight size={16}/></button>
   </article>})}</div>
   <div className="mt-8 flex flex-wrap gap-3"><Link to="/learn/games" className="btn btn-ghost"><BrainCircuit size={16}/> Classic quiz arcade</Link><Link to="/learn/custom-test" className="btn btn-ghost"><Sparkles size={16}/> Forge a personal test</Link></div>
   <p className="mt-6 text-xs text-slate-500">Play scores stay on this device; they are separate from actual course or exam grades.</p>
  </>}
 </main><Footer/></div>
}
