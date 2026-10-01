import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Download, ExternalLink, GraduationCap, Gamepad2, PencilRuler, School2, Sparkles } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { BOOKS, readProgress, STARTER_LESSONS } from '../services/starterCourses'
import { learningApi, getLearningAuth } from '../services/learningApi'

export default function LearningHome() {
 const [published,setPublished]=useState([]),[err,setErr]=useState('')
 const [progress,setProgress]=useState(readProgress())
 useEffect(()=>{ const on=()=>setProgress(readProgress());window.addEventListener('selfstudy-progress',on);return()=>window.removeEventListener('selfstudy-progress',on) },[])
 useEffect(()=>{learningApi('/courses').then(x=>setPublished(x.courses)).catch(()=>setErr('Teacher-created courses are temporarily unavailable. Free study guides below still work.'))},[])
 const cards=Object.entries(BOOKS)
 return <div className="flex min-h-screen flex-col"><Navbar/>
 <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6">
  <div className="relative overflow-hidden rounded-3xl border border-dps-green/20 bg-gradient-to-r from-emerald-950/70 via-navy-850 to-navy-900 p-7 sm:p-11 animate-fade-up">
   <div className="absolute -right-12 -top-16 h-72 w-72 rounded-full bg-dps-green/10 blur-3xl" aria-hidden="true" />
   <span className="chip border-emerald-400/30 text-emerald-200"><Sparkles size={14}/> Your independent learning zone</span>
   <h1 className="mt-5 font-display text-3xl font-bold sm:text-5xl">Learn to code. <span className="text-gradient">Build something real.</span></h1>
   <p className="mt-4 max-w-2xl text-slate-300">Free bite-size programming lessons, downloadable study PDFs, browser coding, practice exams and mini games. Start right now, even without an account.</p>
   <div className="mt-7 flex flex-wrap gap-3"><Link to="/student/practice/python" className="btn btn-primary"><PencilRuler size={17}/> Open Practice IDE</Link><Link to="/learn/mock-exam" className="btn btn-ghost"><GraduationCap size={17}/> Take a practice exam</Link><Link to="/learn/games" className="btn btn-ghost"><Gamepad2 size={17}/> Play coding games</Link><Link to="/learn/custom-test" className="btn btn-ghost"><Sparkles size={17}/> Forge a custom test</Link></div>
   <p className="mt-5 text-xs text-slate-400">Independent student-built learning platform, not an official school system or report card. Teachers must be independently authorized to use teacher features.</p>
  </div>
  <section className="mt-8 grid gap-4 sm:grid-cols-2">
    <Link to="/learn/arcade" className="glass motion-surface group flex items-center gap-5 p-6 transition-all hover:-translate-y-1 hover:border-emerald-400/40"><Gamepad2 size={38} className="text-dps-gold"/><div><h2 className="text-xl font-bold">The interactive arcade</h2><p className="mt-1 text-sm text-slate-400">Build code stacks, flip logic gates and train your memory.</p><span className="mt-3 inline-flex items-center gap-1 text-sm text-dps-neon">Enter the arcade <ArrowRight size={15}/></span></div></Link>
    <Link to="/learn/custom-test" className="glass motion-surface group flex items-center gap-5 p-6 transition-all hover:-translate-y-1 hover:border-emerald-400/40"><Sparkles size={38} className="text-dps-neon"/><div><h2 className="text-xl font-bold">Create your own test</h2><p className="mt-1 text-sm text-slate-400">Pick your language, level and timer. Generate your challenge.</p><span className="mt-3 inline-flex items-center gap-1 text-sm text-dps-neon">Open Test Forge <ArrowRight size={15}/></span></div></Link>
  </section>

  <section className="motion-surface relative isolate mt-8 overflow-hidden rounded-3xl border border-dps-green/25 bg-navy-900">
    <img src="/ai-learning-hero.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[75%_55%] opacity-75" />
    <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-950/30" aria-hidden="true" />
    <div className="relative max-w-xl p-6 sm:p-9">
      <span className="font-mono text-xs tracking-[.2em] text-dps-neon">DISCOVER YOUR LAB</span>
      <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Curiosity looks good on you.</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">Pick a new programming language, then put your skills to work in the Logic Arcade or Test Forge.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Link className="btn btn-primary btn-sm" to="/learn/arcade">Enter arcade <ArrowRight size={15}/></Link><a className="btn btn-ghost btn-sm" href="https://amongus.free.page/" target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" aria-label="Fun break opens an unverified external game site">Fun break ↗</a></div>
      <p className="mt-3 text-[11px] text-slate-400">AI-generated artwork · Fun break opens an external, unverified site.</p>
    </div>
  </section>

  <div className="mb-6 mt-14 flex flex-wrap items-end justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-widest text-dps-neon">Open study library</span><h2 className="mt-2 text-2xl font-bold">Choose your next skill</h2><p className="mt-2 text-slate-400">Original PDF study sheets plus links to trusted public documentation.</p></div><Link to="/learn/profile" className="btn btn-ghost"><GraduationCap size={16}/> {getLearningAuth()?'My practice profile':'Create optional profile'}</Link></div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([key,b],i)=>{
   const done=(progress[key]?.completed||[]).length,total=STARTER_LESSONS[key].length
   return <article key={key} className="glass group p-5 transition-all duration-300 hover:-translate-y-1 hover:border-dps-green/40 hover:shadow-glow animate-fade-up" style={{animationDelay:`${i*60}ms`}}>
     <div className="flex items-center justify-between gap-3"><span className="rounded-xl border border-dps-neon/25 bg-emerald-500/10 p-3 text-dps-neon"><BookOpen size={23}/></span><span className="chip">{b.tag}</span></div>
     <h3 className="mt-5 text-xl font-semibold">{b.name}</h3><p className="mt-2 min-h-12 text-sm text-slate-400">{total} self-paced lessons • Quick quiz • Downloadable PDF</p>
     <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-dps-neon transition-all" style={{width:`${Math.round(done/total*100)}%`}}/></div><p className="mt-1 text-xs text-slate-500">{done}/{total} lessons finished on this device</p>
     <div className="mt-5 flex flex-wrap gap-2"><Link className="btn btn-primary btn-sm" to={`/learn/course/${key}`}>Start lessons <ArrowRight size={14}/></Link><a className="btn btn-ghost btn-sm" href={b.pdf} download><Download size={14}/> PDF</a><a className="btn btn-ghost btn-sm" href={b.official} target="_blank" rel="noopener noreferrer" aria-label={`Official ${b.name} documentation`}>Docs <ExternalLink size={13}/></a></div>
   </article>
  })}</div>
  <div className="mt-16 flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs uppercase tracking-widest text-dps-gold">Classroom courses</span><h2 className="mt-2 text-2xl font-bold">Courses shared by authorized teachers</h2></div><Link to="/learn/profile" className="btn btn-ghost">Profile & course enrollment</Link></div>
  {err&&<p className="mt-4 text-sm text-amber-300" role="status">{err}</p>}
  {published.length===0?<div className="glass mt-5 rounded-2xl p-7"><School2 className="text-dps-gold"/><h3 className="mt-3 text-lg font-semibold">Courses will appear here</h3><p className="mt-2 text-sm text-slate-400">While teachers prepare lessons, use the free study library above. A teacher-issued enrollment code is required for course quizzes to appear in teacher reports.</p></div>:<div className="mt-5 grid gap-4 md:grid-cols-2">{published.map(c=><div key={c.id} className="glass p-5"><span className="chip">Class {c.className} • {c.language}</span><h3 className="mt-3 text-lg font-semibold">{c.title}</h3><p className="my-3 text-sm text-slate-400">{c.summary}</p><span className="text-xs text-slate-500">{c.lessonCount} lessons</span><div className="mt-4"><Link to={`/learn/teacher-course/${c.id}`} className="btn btn-primary btn-sm">Join / Continue</Link></div></div>)}</div>}
 </main><Footer/></div>
}
