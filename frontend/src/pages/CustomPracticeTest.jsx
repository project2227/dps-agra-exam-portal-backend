import { syncLearning } from '../services/accountApi'
import { getAccountState } from '../services/session'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle,Clock3,Download,Flag,RefreshCcw,SlidersHorizontal,Sparkles,Trophy,Zap} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import {TOPICS,generatePracticeTest,QUESTION_BANK} from '../services/practiceTestGenerator'
const readHistory=()=>{if(getAccountState().student)return getAccountState().progress.customTests;try{return JSON.parse(localStorage.getItem('dps.test.custom.v1')||'[]')}catch{return[]}}
const store=result=>{if(syncLearning({customTests:[{id:result.id,date:result.date,score:result.score}]}))return;try{localStorage.setItem('dps.test.custom.v1',JSON.stringify([result,...readHistory()].slice(0,15)))}catch{}}
export default function CustomPracticeTest(){
 const [topic,setTopic]=useState('mixed'),[difficulty,setDifficulty]=useState(0)
 const [requested,setRequested]=useState(10),[duration,setDuration]=useState(10)
 const [test,setTest]=useState(null),[answers,setAnswers]=useState({})
 const [current,setCurrent]=useState(0),[marked,setMarked]=useState([])
 const [seconds,setSeconds]=useState(0),[finished,setFinished]=useState(false)
 const [history,setHistory]=useState(readHistory)
 const available=QUESTION_BANK.filter(x=>topic==='mixed'||x.topic===topic).length
 const selection=useMemo(()=>TOPICS.find(t=>t.id===topic),[topic])
 const done=test?test.questions.reduce((n,q)=>n+(answers[q.id]!==undefined?1:0),0):0
 const correct=test?test.questions.reduce((n,q)=>n+(answers[q.id]===q.correct?1:0),0):0
 const score=test?Math.round(correct/test.questions.length*100):0
 function finish(){
  if(finished||!test)return
  const total=test.questions.length
  const right=test.questions.reduce((n,q)=>n+(answers[q.id]===q.correct?1:0),0)
  const record={id:String(test.seed),date:new Date().toISOString(),topic,level:difficulty,total,correct:right,score:Math.round(right/total*100),duration}
  store(record);setHistory(readHistory());setFinished(true)
 }
 useEffect(()=>{
  if(!test||finished||duration===0)return
  if(seconds<=0){finish();return}
  const timer=setTimeout(()=>setSeconds(n=>Math.max(n-1,0)),1000)
  return()=>clearTimeout(timer)
 // finishing uses the latest questions and answers when time expires.
 },[seconds,test,finished,duration])
 function start(){
  const generated=generatePracticeTest({topic,difficulty,count:requested,seed:Date.now()+Math.floor(Math.random()*100000)})
  setTest(generated);setAnswers({});setCurrent(0);setMarked([]);setSeconds(duration*60);setFinished(false)
 }
 function restart(){setTest(null);setAnswers({});setFinished(false)}
 const question=test?.questions[current]
 return <div className="flex min-h-screen flex-col"><Navbar/><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
  <div className="flex flex-wrap items-start justify-between gap-5">
   <div><span className="chip border-dps-neon/30 text-dps-neon"><Sparkles size={13}/> MADE BY YOU · POWERED OFFLINE</span>
    <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">The <span className="text-gradient">Test Forge.</span></h1>
    <p className="mt-3 max-w-2xl text-slate-300">One test never fits everyone. Build a fresh challenge around what you want to learn, then understand every answer.</p>
   </div><Link to="/learn" className="btn btn-ghost"><ArrowLeft size={15}/> Learning hub</Link>
  </div>
  {!test?<div className="mt-9 grid gap-7 lg:grid-cols-[1.4fr,.8fr]">
   <section className="glass motion-surface space-y-7 p-6 sm:p-8">
    <div><h2 className="flex items-center gap-3 text-2xl font-bold"><SlidersHorizontal size={23} className="text-dps-neon"/> Design your challenge</h2><p className="mt-2 text-sm text-slate-400">Each session shuffles questions and answer order. No login, camera or API key is required.</p></div>
    <fieldset><legend className="mb-3 font-semibold">Choose a focus</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
     {TOPICS.map(t=><button type="button" key={t.id} aria-pressed={topic===t.id} onClick={()=>setTopic(t.id)} className={'rounded-xl border px-3 py-3 text-left transition duration-300 '+(topic===t.id?'border-dps-neon bg-dps-green/20 shadow-glow':'border-white/10 hover:-translate-y-1 hover:border-dps-green/50')}><span className="mb-1 block text-xl">{t.icon}</span><span className="text-sm font-semibold">{t.label}</span></button>)}
    </div></fieldset>
    <fieldset><legend className="mb-3 font-semibold">Difficulty preference</legend><div className="grid gap-2 sm:grid-cols-4">
     {[[0,'Surprise me'],[1,'Foundation'],[2,'Intermediate'],[3,'Challenge']].map(([n,label])=><button type="button" key={n} onClick={()=>setDifficulty(n)} aria-pressed={difficulty===n} className={'rounded-xl border px-3 py-3 text-sm '+(difficulty===n?'border-dps-neon bg-dps-green/20':'border-white/10 hover:border-white/40')}>{label}</button>)}
    </div><p className="mt-2 text-xs text-slate-400">We prioritize your chosen level, then include other levels when needed.</p></fieldset>
    <div className="grid gap-5 sm:grid-cols-2">
     <label className="text-sm font-semibold">Questions <span className="mt-1 block text-xs font-normal text-slate-400">{available} unique questions available for {selection.label}.</span>
      <select className="input mt-2" value={requested} onChange={e=>setRequested(Number(e.target.value))}>{[5,8,12,20,30].map(n=><option key={n} value={n}>{n} requested {n>available?'(limited by available bank)':''}</option>)}</select>
     </label>
     <label className="text-sm font-semibold">Time limit <span className="mt-1 block text-xs font-normal text-slate-400">Or remove the clock and learn at your own pace.</span>
      <select className="input mt-2" value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[[0,'No timer'],[5,'5 minutes'],[10,'10 minutes'],[20,'20 minutes'],[30,'30 minutes']].map(([n,title])=><option key={n} value={n}>{title}</option>)}</select>
     </label>
    </div>
    <button type="button" className="btn btn-primary btn-lg w-full" onClick={start}><Zap size={19}/> Generate my test <ArrowRight size={16}/></button>
   </section>
   <aside className="space-y-4">
    <section className="glass p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><Trophy className="text-dps-gold"/> Your previous attempts</h2>
     {!history.length?<p className="mt-4 text-sm text-slate-400">Your first challenge is waiting. Results stay on this device; they are not official exam grades.</p>:<div className="mt-4 space-y-3">{history.slice(0,6).map((h,i)=><div className="rounded-xl border border-white/10 p-3" key={h.id+i}><div className="flex items-center justify-between gap-2"><strong className="capitalize">{h.topic}</strong><span className="text-lg font-bold text-dps-neon">{h.score}%</span></div><p className="mt-1 text-xs text-slate-400">{h.correct}/{h.total} right · {new Date(h.date).toLocaleDateString('en-IN')}</p></div>)}</div>}
    </section>
    <section className="glass border-dps-neon/20 bg-dps-green/5 p-5"><BookOpen className="text-dps-neon"/><h3 className="mt-2 text-lg font-semibold">Why it's different</h3><p className="mt-2 text-sm text-slate-300">Personalize the subject and intensity. Mark tricky questions for review, learn from detailed explanations and print your practice report.</p></section>
   </aside>
  </div>:<div className="mt-9 grid gap-5 lg:grid-cols-[1fr,250px]">
   <section className="glass overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><span className="text-xs font-sans tracking-widest text-dps-neon">{finished?'Practice complete':'Practice in progress'}</span><h2 className="mt-1 text-xl font-bold">{selection.label} · {test.questions.length} questions</h2></div><span className={'chip '+(seconds<60&&duration?'border-red-400 text-red-300':'text-dps-neon')}><Clock3 size={15}/> {duration?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'Untimed'}</span></div>
    <div className="p-5 sm:p-8">
     {finished?<div className="text-center"><div className="report-spark" aria-hidden="true">✦</div><h3 className="mt-4 text-3xl font-bold">You've earned every answer.</h3><p className="mt-4 text-6xl font-black text-dps-neon">{score}%</p><p className="mt-2 text-slate-400">{correct} right out of {test.questions.length}. {score>=80?'Excellent work.': 'Keep going—your next attempt can be stronger.'}</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button className="btn btn-primary" onClick={restart}><RefreshCcw size={16}/> Forge another</button><button type="button" className="btn btn-ghost" onClick={()=>window.print()}><Download size={16}/> Print result</button></div></div>:
     <><div className="flex flex-wrap items-center justify-between gap-2"><span className="chip">Question {current+1} / {test.questions.length}</span><button type="button" onClick={()=>setMarked(m=>m.includes(question.id)?m.filter(i=>i!==question.id):[...m,question.id])} className={'btn btn-sm '+(marked.includes(question.id)?'btn-primary':'btn-ghost')}><Flag size={14}/> {marked.includes(question.id)?'Marked':'Review later'}</button></div><h3 className="mt-6 whitespace-pre-wrap font-sans text-xl leading-relaxed">{question.prompt}</h3><div className="mt-6 grid gap-3">{question.options.map((opt,i)=><button key={i} type="button" aria-pressed={answers[question.id]===i} onClick={()=>setAnswers(a=>({...a,[question.id]:i}))} className={'group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 '+(answers[question.id]===i?'border-dps-neon bg-dps-green/15':'border-white/10 hover:border-white/40')}><span className="font-sans font-bold text-dps-neon">{String.fromCharCode(65+i)}</span><span>{opt}</span></button>)}</div><div className="mt-7 flex items-center justify-between gap-2"><button className="btn btn-ghost" disabled={current===0} onClick={()=>setCurrent(i=>i-1)}><ArrowLeft size={16}/> Previous</button>{current===test.questions.length-1?<button className="btn btn-primary" onClick={finish}>Finish & review</button>:<button className="btn btn-primary" onClick={()=>setCurrent(i=>i+1)}>Next <ArrowRight size={16}/></button>}</div></>}
     {finished&&<div className="print-area mt-8 space-y-4 text-left"><h3 className="text-2xl font-bold">Your answer review</h3>{test.questions.map((q,i)=><div className="rounded-xl border border-white/10 p-4" key={q.id}><b>{i+1}. {q.prompt}</b><p className="mt-2 text-sm">Your answer: {answers[q.id]===undefined?'Skipped':q.options[answers[q.id]]} {answers[q.id]===q.correct?'✓':'✗'}</p><p className="mt-1 text-sm text-dps-neon">Correct: {q.options[q.correct]}</p><p className="mt-1 text-sm text-slate-400">{q.explanation}</p></div>)}</div>}
    </div>
   </section>
   <aside className="glass h-fit p-5"><h3 className="text-lg font-semibold">Question map</h3><p className="mt-2 text-sm text-slate-400">{done}/{test.questions.length} answered</p><div className="mt-4 grid grid-cols-5 gap-2">{test.questions.map((q,i)=><button key={q.id} disabled={finished} onClick={()=>setCurrent(i)} aria-label={'Go to question '+(i+1)} className={'h-10 rounded-xl border font-sans text-sm '+(i===current&&!finished?'border-dps-neon text-dps-neon':marked.includes(q.id)?'border-dps-gold text-dps-gold':answers[q.id]!==undefined?'border-green-500/50 bg-green-500/10':'border-white/10')} type="button">{i+1}</button>)}</div>{!finished&&<button type="button" className="btn btn-ghost mt-6 w-full" onClick={finish}>Submit early</button>}</aside>
  </div>}
 </main><Footer/></div>
}
