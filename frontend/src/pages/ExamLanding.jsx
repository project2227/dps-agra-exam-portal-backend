import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as m from 'motion/react-m'
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, Check, ChevronDown, ClipboardCheck, Clock3, FileCheck2, FilePlus2, FileText, GraduationCap, KeyRound, LayoutDashboard, ListChecks, Monitor, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ExamCrest from '../components/common/ExamCrest'
import Loader from '../components/common/Loader'
import StatusBadge from '../components/common/StatusBadge'
import { motionTokens, useQuietMotion } from '../components/common/Motion'
import api from '../services/api'
import { formatDateTime } from '../utils/format'
const features = {
  student: [
    { icon: KeyRound, name: 'Join an exam', tag: 'START HERE', text: 'Choose your assessment, enter your class details and use the passcode from your teacher. Read the rules before checking in.', to: '/student/join', action: 'Open student check-in' },
    { icon: Clock3, name: 'Take the assessment', tag: 'THE EXAM ROOM', text: 'Move between questions, mark answers for review and watch the remaining time. Your answers save as you work.', to: '/student/join', action: 'Join to enter the exam room' },
    { icon: LayoutDashboard, name: 'Your student dashboard', tag: 'YOUR CLASS, TOGETHER', text: 'See your current exam, upcoming assessments and the resources your teacher has shared with your class.', to: '/student/dashboard', action: 'Open your dashboard' },
    { icon: FileText, name: 'Class handouts', tag: 'KNOW WHAT TO PREPARE', text: 'Find teacher-shared notes, practical formats and instructions in your exam session’s student dashboard.', to: '/student/dashboard', action: 'View class resources' },
    { icon: ClipboardCheck, name: 'Try a mock exam', tag: 'BEFORE EXAM DAY', text: 'Get familiar with a timed Class IX practice assessment. Use it to check your preparation before the real exam.', to: '/learn/mock-exam', action: 'Start a mock exam' },
    { icon: BookOpen, name: 'Revise at your pace', tag: 'SUPPORTING YOUR PREPARATION', text: 'Use the study guides and practice tests to revisit a topic. Practical preparation stays available when you need it.', to: '/learn', action: 'Browse study resources' },
  ],
  teacher: [
    { icon: FilePlus2, name: 'Create & schedule', tag: 'PLAN THE ASSESSMENT', text: 'Set the class, questions, marks, timing and monitoring rules. Save a draft or publish an exam with a student passcode.', to: '/teacher/exams/create', action: 'Create an exam' },
    { icon: CalendarDays, name: 'Manage hosted exams', tag: 'KEEP EVERYTHING ORGANISED', text: 'Find your published exams, check their schedule and manage the assessment lifecycle from your teacher workspace.', to: '/teacher/exams/manage', action: 'Manage your exams' },
    { icon: Monitor, name: 'Monitor progress', tag: 'DURING THE EXAM', text: 'Open an exam’s live monitor to follow student progress and review activity signals. Media sharing follows that exam’s consent settings.', to: '/teacher/dashboard', action: 'Open the teacher dashboard' },
    { icon: ClipboardCheck, name: 'Review submissions', tag: 'AFTER THE EXAM', text: 'Read submitted answers, review practical work and provide grades and feedback. Keep the assessment decision with the teacher.', to: '/teacher/submissions', action: 'Review submitted work' },
    { icon: BarChart3, name: 'Analyse draft grades', tag: 'UNDERSTAND THE RESULTS', text: 'See class averages, identify ungraded work and print draft marksheets. Teacher approval comes before official use.', to: '/teacher/grades', action: 'Open grade analysis' },
    { icon: Users, name: 'Classes & handouts', tag: 'PREPARE YOUR CLASS', text: 'Organise classes, share handouts and keep exam dates in one place, so students know what to prepare and when.', to: '/teacher/classes', action: 'Manage your classes' },
  ],
}

const faqs = [
  ['How do students join an exam?', 'Use Student access or Join an exam. Select your exam, enter your full name, class, section and roll number, then use the passcode your teacher provides. Acknowledge the rules and any required sharing permissions before entering.'],
  ['When does exam check-in open?', 'Early check-in opens 30 minutes before the scheduled start. The exam room follows the timing set by your teacher. If your exam is not listed yet, confirm the schedule and passcode with your teacher.'],
  ['How are answers saved?', 'The exam room saves answers automatically. If the connection drops, keep the exam open; pending answers are sent again when the connection returns. Check the save status before you submit.'],
  ['Does every exam need a camera or screen share?', 'Your teacher sets the requirements for each exam. The check-in page explains them and asks for explicit consent. Camera and screen access also require your browser’s permission. Activity flags need teacher review and are not automatic proof of misconduct.'],
  ['How do teachers access the workspace?', 'Teachers sign in using their authorised account. The workspace includes exam creation, class management, live monitoring, submissions, handouts and draft grade analysis. New teachers can request access from the sign-in page.'],
  ['Is this an official DPS Agra portal?', 'This is an independent, student-built educational project by Aryan Agarwal. It is not an officially affiliated DPS Agra website or an approved school grading system. Use the official school website for school news, admissions and verified policies.'],
]

const INTRO_KEY = 'dps.portal.intro.seen.v1'
function IntroCrest() {
  const quiet = useQuietMotion()
  const [playing,setPlaying] = useState(()=>{try{return !localStorage.getItem(INTRO_KEY)}catch{return true}})
  const finish = () => { setPlaying(false); try {localStorage.setItem(INTRO_KEY,'1')} catch {} }
  useEffect(()=>{if(!playing)return;if(quiet){finish();return}const timer=setTimeout(finish,650);return()=>clearTimeout(timer)},[playing,quiet])
  return <div className="intro-crest">
    {playing && !quiet ? <span className="crest-assembly" role="img" aria-label="Delhi Public School, Agra crest">{[0,1,2].map(i=><m.span key={i} style={{clipPath:`inset(${i*33.333}% 0 ${100-(i+1)*33.333}% 0)`}} initial={{opacity:0,x:i===1?18:-18,y:i===1?0:8}} animate={{opacity:1,x:0,y:0}} transition={{duration:motionTokens.signature,delay:i*.05,ease:motionTokens.ease}}><img src={import.meta.env.BASE_URL+'brand/dps-agra-crest.jpeg'} alt="" width="96" height="96" /></m.span>)}</span> : <ExamCrest size={96} decorative />}
    {playing && <button type="button" className="intro-skip" onClick={finish}>Skip intro</button>}
  </div>
}
function ExamWalkthrough() {
  const [view,setView]=useState(0), quiet=useQuietMotion()
  const steps=[['Check in','Choose your exam and enter your teacher’s passcode. Read the rules before you start.'],['Answer','Work on one question at a time. Your answers save automatically.'],['Review','Check your answers, then submit. Your teacher reviews the work and releases results.']]
  return <div className="portal-preview card">
    <div className="portal-preview-heading"><div><p className="text-sm text-muted">Your exam day</p><h2>A clear path from start to finish</h2></div><IntroCrest /></div>
    <div className="portal-step-tabs" aria-label="Exam steps">{steps.map(([name],i)=><button key={name} type="button" aria-pressed={view===i} onClick={()=>setView(i)}><span>{i+1}</span>{name}</button>)}</div>
    <m.div key={view} initial={quiet?false:{opacity:.65,y:4}} animate={{opacity:1,y:0}} className="portal-preview-body"><div className="preview-step-icon">{view===0?<KeyRound size={24}/>:view===1?<ListChecks size={24}/>:<ClipboardCheck size={24}/>}</div><h3>{steps[view][0]}</h3><p>{steps[view][1]}</p>
      {view===1 && <><div className="preview-question-row" aria-label="Example question progress">{[1,2,3,4,5,6].map(n=><span key={n} className={n<3?'answered':n===3?'current':''}>{n<3?<Check size={14}/>:n}</span>)}</div><span className="badge badge-success"><Check size={12}/> Answers saved</span></>}
      {view===0 && <p className="preview-note"><Clock3 size={15}/> Check-in opens 30 minutes before the start.</p>}
      {view===2 && <p className="preview-note"><ShieldCheck size={15}/> Activity flags always need teacher review.</p>}
    </m.div><p className="preview-caption">A walkthrough, using example content.</p>
  </div>
}
function ExamAvailability() {
  const [attempt,setAttempt]=useState(0), [state,setState]=useState({loading:true,exams:[],error:''})
  useEffect(()=>{
    let active=true
    setState(previous=>({...previous,loading:true,error:''}))
    api.getActiveExams().then(exams=>{if(active)setState({loading:false,exams:exams.filter(exam=>['live','upcoming'].includes(exam.status)),error:''})}).catch(error=>{if(active)setState({loading:false,exams:[],error:error.message||'Could not load the exam list.'})})
    return()=>{active=false}
  },[attempt])
  return <section className="exam-availability card" aria-labelledby="availability-title"><div className="exam-availability-heading"><h2 id="availability-title"><CalendarDays size={18}/> Available exams</h2><button type="button" className="btn btn-ghost btn-sm" aria-label="Refresh exam availability" disabled={state.loading} onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={15}/><span>Refresh</span></button></div>
    {state.loading?<Loader compact label="Checking the exam list…"/>:state.error?<div className="availability-empty" role="status"><p>We couldn’t load the exam list. Refresh to try again, or open check-in.</p><Link to="/student/join" className="btn btn-ghost">Open check-in <ArrowRight size={15}/></Link></div>:state.exams.length?<div className="exam-availability-list">{state.exams.slice(0,3).map(exam=><Link to={`/student/join?exam=${encodeURIComponent(exam.id)}`} key={exam.id}><span><b>{exam.title}</b><small>Class {exam.class} · {exam.startsAt?formatDateTime(exam.startsAt):'See exam details'}</small></span><StatusBadge status={exam.status}/><ArrowRight size={16}/></Link>)}{state.exams.length>3 && <Link to="/student/join">See all available exams <ArrowRight size={15}/></Link>}</div>:<div className="availability-empty"><div><p className="font-semibold">No exams open for check-in yet</p><p className="text-sm text-muted">Check your teacher’s schedule. You can still sign in or prepare for your next assessment.</p></div><Link to="/student/join" className="btn btn-ghost">Open check-in <ArrowRight size={15}/></Link></div>}
  </section>
}
export default function ExamLanding() {
  const [role,setRole]=useState('student'), roleTabs=useRef([]), location=useLocation()
  useEffect(()=>{if(location.state?.section!=='portal-functions')return;const frame=requestAnimationFrame(()=>document.getElementById('portal-functions')?.scrollIntoView({behavior:'auto',block:'start'}));return()=>cancelAnimationFrame(frame)},[location.state])
  const selectRole=(event,index)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;setRole(next===0?'student':'teacher');roleTabs.current[next]?.focus()}
  return <div className="learning-site exam-site"><Navbar/><main>
    <section className="lab-wrap portal-hero" aria-labelledby="hero-title"><div className="portal-hero-copy"><span className="badge"><GraduationCap size={14}/> Computer science · Classes IX–XII</span><h1 id="hero-title">Ready for your<br className="hidden sm:block"/> next exam?</h1><p>Check in to your assessment, find your class resources, and prepare with confidence. Everything starts here.</p><Link to="/student/join" className="btn btn-primary btn-lg" data-tour="join">Join an exam <ArrowRight size={18}/></Link>
      <div className="role-entrances"><Link to="/student/login"><GraduationCap size={22}/><span><strong>I’m a student</strong><small>Sign in to my account</small></span><ArrowUpRight size={17}/></Link><Link to="/teacher/login" data-tour="teachers"><Users size={22}/><span><strong>I’m a teacher</strong><small>Open my workspace</small></span><ArrowUpRight size={17}/></Link></div><p className="portal-hero-note"><ShieldCheck size={15}/> Know the rules before you begin.</p>
    </div><ExamWalkthrough/></section>
    <div className="lab-wrap portal-exam-section"><ExamAvailability/></div>
    <section className="portal-functions" id="portal-functions" aria-labelledby="functions-title"><div className="lab-wrap"><div className="portal-section-heading"><div><p className="lab-eyebrow">Explore the portal</p><h2 id="functions-title">The tools for your school day</h2></div><p>Exams come first. Practice and class resources are here when you need them.</p></div>
      <div className="exam-role-tabs" role="tablist" aria-label="Portal functions by role">{[['student','For students',GraduationCap],['teacher','For teachers',Users]].map(([value,label,Icon],index)=><button key={value} ref={node=>{roleTabs.current[index]=node}} id={`functions-${value}-tab`} role="tab" type="button" aria-selected={role===value} aria-controls={`functions-${value}-panel`} tabIndex={role===value?0:-1} onClick={()=>setRole(value)} onKeyDown={event=>selectRole(event,index)}><Icon size={17}/>{label}</button>)}</div>
      <div className="exam-function-grid" role="tabpanel" id={`functions-${role}-panel`} aria-labelledby={`functions-${role}-tab`}>{features[role].map(({icon:Icon,name,text,to,action})=><article className="exam-function-card card" key={name}><span className="function-icon"><Icon size={22}/></span><h3>{name.replace(' & ',' and ')}</h3><p>{text}</p><Link to={to}>{action}<ArrowRight size={16}/></Link></article>)}</div>
      <p className="exam-function-note"><KeyRound size={14}/>{role==='teacher'?'Teacher tools require an authorised teacher account.':'Sign in for your profile. Class handouts and your dashboard are available through your exam session.'}</p>
    </div></section>
    <section className="lab-wrap portal-preparation" aria-labelledby="prepare-title"><div><p className="lab-eyebrow">Before exam day</p><h2 id="prepare-title">A little practice goes a long way</h2><p>Revise a topic, try a mock assessment, or work through a program in the IDE.</p></div><div className="preparation-links"><Link to="/learn"><BookOpen size={20}/><span>Courses and study guides</span><ArrowUpRight size={16}/></Link><Link to="/learn/mock-exam"><ClipboardCheck size={20}/><span>Try a mock exam</span><ArrowUpRight size={16}/></Link><Link to="/student/practice"><Monitor size={20}/><span>Open the practice IDE</span><ArrowUpRight size={16}/></Link><Link to="/learn/custom-test"><ListChecks size={20}/><span>Build a practice test</span><ArrowUpRight size={16}/></Link></div></section>
    <section className="lab-wrap portal-faq" aria-labelledby="faq-title"><div><p className="lab-eyebrow">A little help</p><h2 id="faq-title">Before you get started</h2><p>Clear instructions, visible consent, and teacher-led review.</p><Link to="/about" className="lab-text-link">About the portal and privacy <ArrowRight size={15}/></Link></div><div className="lab-faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={16}/></summary><p>{answer}</p></details>)}</div></section>
  </main><Footer/></div>
}
