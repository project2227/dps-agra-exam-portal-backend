import {useEffect,useState} from 'react'
import {useLocation,useNavigate} from 'react-router-dom'
import {ArrowRight,ArrowUpRight,Compass,MousePointer2,X} from 'lucide-react'
const KEY='dps.tour.done.v4'
const tours=[
 ['home','Your launchpad','One home for fair exams, creative coding and learning.','/'],
 ['join','Enter exam mode','Select the correct exam and use the teacher-issued passcode.','/student/join'],
 ['ide','Make ideas executable','Explore browser-based Python, SQL, HTML and more.','/student/practice/python'],
 ['courses','Explore your next skill','Work through free lessons, downloads and class courses.','/learn'],
 ['games','Play, debug, conquer','Challenges reward your understanding, not just speed.','/learn/arcade'],
 ['test','Design your own challenge','Choose topic, level, question count and test length.','/learn/custom-test'],
 ['teachers','Tools for real educators','Authorized teachers manage courses, exams and results.','/teacher/login']
]
const modes=[
 ['THE FUTURE IS BOOTING','Learn. Create. Level up.','</>','terminal'],
 ['CURIOSITY UNLOCKED','Build something extraordinary.','✧','constellation'],
 ['IDEAS IN ORBIT','Your next discovery awaits.','◇','orbit']
]
function hasSeen(){try{return localStorage.getItem(KEY)==='1'}catch{return false}}
export default function ExperienceLayer(){
 const nav=useNavigate(),loc=useLocation()
 const [phase,setPhase]=useState(()=>hasSeen()?'off':'welcome')
 const [mode]=useState(()=>modes[Math.floor(Math.random()*modes.length)])
 const [index,setIndex]=useState(0),[box,setBox]=useState(null)
 const close=()=>{try{localStorage.setItem(KEY,'1')}catch{}setPhase('off')}
 useEffect(()=>{
  const replay=()=>{setIndex(0);nav('/');setPhase('welcome')}
  window.addEventListener('dps:tour-replay',replay)
  return()=>window.removeEventListener('dps:tour-replay',replay)
 },[nav])
 useEffect(()=>{
  if(phase!=='tour')return
  let frame=0
  const update=()=>{
   const el=document.querySelector('[data-tour="'+tours[index][0]+'"]')
   const b=el?.getBoundingClientRect()
   if(b&&b.width>0&&b.height>0&&b.top>=0&&b.top<innerHeight)
    setBox({top:Math.max(5,b.top-6),left:Math.max(5,b.left-6),width:b.width+12,height:b.height+12})
   else setBox(null)
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
  schedule();window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true)
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true)}
 },[phase,index,loc.pathname])
 useEffect(()=>{
  if(phase!=='tour')return
  const key=e=>{if(e.key==='Escape')close();if(e.key==='ArrowRight')setIndex(i=>Math.min(tours.length-1,i+1));if(e.key==='ArrowLeft')setIndex(i=>Math.max(0,i-1))}
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
 },[phase])
 if(phase==='off')return null
 if(phase==='welcome')return <div role="dialog" aria-modal="true" aria-label="Welcome to the learning hub" className={"experience-entry experience-"+mode[3]}>
  <div className="experience-grid" aria-hidden="true"/>
  <button type="button" className="experience-skip" onClick={close}>Skip intro <X size={15}/></button>
  <div className="experience-center">
   <div className="experience-symbol" aria-hidden="true"><span>{mode[2]}</span><i/><i/></div>
   <p className="experience-eyebrow">{mode[0]}</p>
   <h2 className="experience-title">{mode[1]}</h2>
   <p className="experience-tagline">To stop cheats for a brighter future</p>
   <div className="mt-10 flex flex-wrap justify-center gap-3">
    <button className="btn btn-primary btn-lg" type="button" onClick={()=>{nav('/');setPhase('tour')}}><Compass size={18}/> Show me around <ArrowRight size={17}/></button>
    <button className="btn btn-ghost btn-lg" type="button" onClick={close}>Explore independently <ArrowUpRight size={16}/></button>
   </div>
   <p className="mt-6 text-xs text-slate-400">An independent, student-built learning experience · Skip anytime</p>
  </div>
 </div>
 const entry=tours[index]
 const left=box?Math.min(Math.max(12,box.left),Math.max(12,innerWidth-365)):Math.max(12,(innerWidth-342)/2)
 const top=box?Math.min(innerHeight-325,Math.max(92,box.top+box.height+17)):Math.max(92,(innerHeight-300)/2)
 return <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Guided site tour">
  {box?<div className="tour-spotlight" style={box} aria-hidden="true"/>:<div className="tour-shade" aria-hidden="true"/>}
  <button type="button" className="experience-skip" onClick={close}><X size={15}/> Skip tour</button>
  <div className="tour-pointer" aria-hidden="true" style={box?{top:box.top+box.height+4,left:box.left+14}:undefined}><MousePointer2 size={22}/></div>
  <section key={index} className="tour-dialog" style={{left,top}}>
   <p className="font-mono text-xs tracking-[.22em] text-dps-neon">DISCOVERY {index+1} / {tours.length}</p>
   <h3 className="mt-3 text-2xl font-bold">{entry[1]}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{entry[2]}</p>
   <div className="mt-5 flex gap-1.5">{tours.map((s,i)=><button key={s[0]} type="button" aria-label={'Step '+(i+1)} className={'tour-dot '+(i===index?'selected':'')} onClick={()=>setIndex(i)}/>)}</div>
   <div className="mt-6 flex flex-wrap gap-2">
    {index>0&&<button className="btn btn-ghost btn-sm" type="button" onClick={()=>setIndex(i=>i-1)}>Back</button>}
    <button type="button" className="btn btn-primary btn-sm" onClick={()=>index===tours.length-1?close():setIndex(i=>i+1)}>{index===tours.length-1?'Finish':'Next'} <ArrowRight size={15}/></button>
    <button className="btn btn-ghost btn-sm" type="button" onClick={()=>{close();nav(entry[3])}}>Try it <ArrowUpRight size={15}/></button>
   </div>
  </section>
 </div>
}
