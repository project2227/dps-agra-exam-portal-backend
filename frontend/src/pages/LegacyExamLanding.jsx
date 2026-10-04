import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, Camera, Check, ChevronDown, ClipboardCheck, Clock3, FileCheck2, FilePlus2, FileText, GraduationCap, KeyRound, LayoutDashboard, ListChecks, Loader2, Monitor, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ExamCrest from '../components/common/LegacyExamCrest'
import '../styles/legacy-exam-landing.css'
import useLearningMotion from '../hooks/useLearningMotion'
import api from '../services/api'
import { formatDateTime } from '../utils/format'

const chapters = [
  { label: 'A clear starting point', title: <>One portal.<br />Every <em>exam.</em></>, text: 'A focused space for classroom assessments. Students check in, teachers conduct exams, and every submission has a clear path to review.' },
  { label: 'A focused exam room', title: <>Less confusion.<br />More <em>focus.</em></>, text: 'Clear instructions. A visible timer. Answers that save as you work. Give the assessment your attention, with your teacher connected throughout.' },
  { label: 'A thoughtful final review', title: <>Every answer.<br />A clearer <em>picture.</em></>, text: 'Bring submissions, feedback and draft grades together. Teachers review the work, interpret activity signals and make the final decisions.' },
]

const features = {
  student: [
    { icon: KeyRound, name: 'Student sign in', tag: 'YOUR SCHOOL ACCOUNT', text: 'Sign in with the admission number and password your teacher provides. On your first sign in, set your own password.', to: '/student/login', action: 'Sign in' },
    { icon: Users, name: 'Your account & progress', tag: 'PROFILE AND RESULTS', text: 'Manage your nickname, preset avatar and theme. See released results, learning progress and signed-in devices in your profile.', to: '/student/profile', action: 'Open your profile' },
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
  ['How do student accounts work?', 'Your teacher creates your school account. Sign in with your admission number and temporary password, then choose a new password. Your class details are filled in when you join an exam. Ask your teacher to reset your password if you forget it. Guest check-in is available only when the teacher allows it.'],
  ['What does local eye and head tracking do?', 'When your teacher enables it and you agree, the browser estimates sustained head turns or gaze changes on your device. Camera frames are not uploaded for this analysis. Lighting and positioning affect estimates; a signal is for teacher review and does not prove misconduct.'],
  ['How do students join an exam?', 'Use Student access or Join an exam. Sign in to fill your class details automatically, select your exam and enter the passcode your teacher provides. If your teacher allows guest check-in, you can enter your details without an account. Acknowledge the rules and any required sharing permissions before entering.'],
  ['When does exam check-in open?', 'Early check-in opens 30 minutes before the scheduled start. The exam room follows the timing set by your teacher. If your exam is not listed yet, confirm the schedule and passcode with your teacher.'],
  ['How are answers saved?', 'The exam room saves answers automatically. If the connection drops, keep the exam open; pending answers are sent again when the connection returns. Check the save status before you submit.'],
  ['Does every exam need a camera or screen share?', 'Your teacher sets the requirements for each exam. The check-in page explains them and asks for explicit consent. Camera and screen access also require your browser’s permission. Activity flags need teacher review and are not automatic proof of misconduct.'],
  ['How do teachers access the workspace?', 'Teachers sign in using their authorised account. The workspace includes exam creation, class management, live monitoring, submissions, handouts and draft grade analysis. New teachers can request access from the sign-in page.'],
  ['Is this an official DPS Agra portal?', 'This is an independent, student-built educational project by Aryan Agarwal. It is not an officially affiliated DPS Agra website or an approved school grading system. Use the official school website for school news, admissions and verified policies.'],
]

function ExamWalkthrough({ chapter }) {
  const [chosen, setChosen] = useState(null)
  useEffect(() => setChosen(null), [chapter])
  const view = chosen ?? chapter
  return <div className="exam-scene" aria-label="Illustrated introduction to the exam portal">
    <div className="exam-scene-orbit" aria-hidden="true" /><div className="exam-scene-orbit orbit-inner" aria-hidden="true" />
    <div className="exam-scene-crest"><ExamCrest size={76} animated /></div>
    <div className="exam-scene-label"><span className="exam-live-dot" aria-hidden="true" /> ASSESSMENT, ORGANISED</div>
    <div className="exam-preview-window">
      <div className="exam-preview-top"><span className="exam-window-dots" aria-hidden="true"><i /><i /><i /></span><span>DPS AGRA · EXAM PORTAL</span><ShieldCheck size={15} /></div>
      <div className="exam-preview-tabs" aria-label="Choose a portal introduction">{['Check in', 'Take the exam', 'Review'].map((name, index) => <button key={name} type="button" aria-pressed={view === index} className={view === index ? 'active' : ''} onClick={() => setChosen(index)}>{name}</button>)}</div>
      <div className="exam-preview-content" key={view}>
        {view === 0 && <><span className="exam-preview-kicker">01 / STUDENT CHECK-IN</span><h3>A calm start.</h3><p>Everything you need before your assessment.</p><div className="exam-demo-checklist">{[[Users, 'Your name, class & roll number', 'The right student, the right exam.'], [KeyRound, 'The passcode from your teacher', 'Access to your scheduled assessment.'], [ListChecks, 'Instructions & sharing consent', 'Know what is expected before you begin.']].map(([Icon, title, text]) => <div key={title}><Icon size={18} /><span><b>{title}</b><small>{text}</small></span><Check size={14} /></div>)}</div><div className="exam-preview-bottom"><Clock3 size={14} /><span>Check-in opens 30 minutes before the start.</span></div></>}
        {view === 1 && <><span className="exam-preview-kicker">02 / THE EXAM ROOM</span><h3>One question at a time.</h3><p>Stay focused. Your progress has a place.</p><div className="exam-demo-status"><span><Clock3 size={16} /> A visible exam timer</span><span><Check size={14} /> Autosave status</span></div><div className="exam-demo-questions" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i < 3 ? 'answered' : i === 3 ? 'current' : ''}>{i < 3 ? <Check size={12} /> : String(i + 1).padStart(2, '0')}</span>)}</div><div className="exam-demo-answer"><span>ANSWER WORKSPACE</span><i /><i /><i /><small><FileCheck2 size={13} /> Answer navigation & review markers</small></div><div className="exam-preview-bottom"><ShieldCheck size={14} /><span>Teacher-set rules. Clear submission steps.</span></div></>}
        {view === 2 && <><span className="exam-preview-kicker">03 / TEACHER REVIEW</span><h3>See the whole picture.</h3><p>Submitted work, brought together for review.</p><div className="exam-demo-review">{[[FileCheck2, 'Submissions', 'Read the answers. Review the practical.'], [ClipboardCheck, 'Feedback & marking', 'Keep the teacher in the decision.'], [BarChart3, 'Draft grade analysis', 'Understand progress across the class.']].map(([Icon, title, text]) => <div key={title}><Icon size={18} /><span><b>{title}</b><small>{text}</small></span><ArrowUpRight size={13} /></div>)}</div><div className="exam-preview-bottom"><Users size={14} /><span>Grades and activity flags need teacher review.</span></div></>}
      </div>
      <span className="exam-preview-disclaimer">ILLUSTRATED WALKTHROUGH · NO LIVE EXAM DATA</span>
    </div>
    <div className="exam-scene-note"><span><Check size={16} /></span><div><b>{['Ready. Informed. Prepared.', 'Focus on your assessment.', 'Review with care.'][view]}</b><small>{['Start with the instructions.', 'Let each answer count.', 'The teacher makes the decision.'][view]}</small></div></div>
    <div className="exam-scene-symbol" aria-hidden="true">{view === 2 ? <BarChart3 size={30} strokeWidth={1.4} /> : view === 1 ? <Clock3 size={30} strokeWidth={1.4} /> : <ClipboardCheck size={30} strokeWidth={1.4} />}</div>
  </div>
}

function ExamAvailability() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ loading: true, exams: [], error: '' })
  useEffect(() => {
    let active = true
    setState(previous => ({ ...previous, loading: true, error: '' }))
    api.getActiveExams().then(exams => { if (active) setState({ loading: false, exams: exams.filter(exam => ['live', 'upcoming'].includes(exam.status)), error: '' }) }).catch(error => { if (active) setState({ loading: false, exams: [], error: error.message || 'Could not load the exam list.' }) })
    return () => { active = false }
  }, [attempt])
  return <div className="exam-availability"><div className="exam-availability-heading"><span><CalendarDays size={17} /> Exam availability</span><button type="button" aria-label="Refresh exam availability" disabled={state.loading} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} /></button></div>
    {state.loading ? <p className="exam-availability-message" role="status"><Loader2 size={15} className="animate-spin" /> Checking the current exam list…</p> : state.error ? <div className="exam-availability-message" role="status"><span>Exam availability couldn’t load. You can retry here or use student check-in.</span><Link to="/student/join">Open check-in <ArrowRight size={14} /></Link></div> : state.exams.length ? <div className="exam-availability-list">{state.exams.slice(0, 3).map(exam => <Link to={`/student/join?exam=${encodeURIComponent(exam.id)}`} key={exam.id}><span><b>{exam.title}</b><small>Class {exam.class} · {exam.startsAt ? formatDateTime(exam.startsAt) : 'See exam details'}</small></span><span className={exam.status === 'live' ? 'exam-state is-live' : 'exam-state'}>{exam.status === 'live' ? 'In progress' : 'Scheduled'}</span><ArrowUpRight size={15} /></Link>)}{state.exams.length > 3 && <Link to="/student/join" className="exam-list-more">See all available exams <ArrowRight size={14} /></Link>}</div> : <p className="exam-availability-message"><span><b>No active exams listed.</b><small>Check your teacher’s schedule. Early check-in opens 30 minutes before the start.</small></span><Link to="/student/join">Open student check-in <ArrowRight size={14} /></Link></p>}
  </div>
}

export default function LegacyExamLanding() {
  const root = useRef(null), story = useRef(null), roleTabs = useRef([])
  const chapter = useLearningMotion(root, story)
  const [role, setRole] = useState('student')
  const location = useLocation()
  const intro = chapters[chapter]
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  useEffect(() => {
    if (location.state?.section !== 'portal-functions') return
    const frame = requestAnimationFrame(() => scrollTo('portal-functions'))
    return () => cancelAnimationFrame(frame)
  }, [location.state])
  const selectRole = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
    setRole(next === 0 ? 'student' : 'teacher'); roleTabs.current[next]?.focus()
  }
  return <div className="learning-site exam-site legacy-exam-landing" ref={root}>
    <Navbar />
    <main>
      <section className="lab-story exam-story" ref={story} aria-label="Introduction to the exam portal" data-chapter={chapter}>
        <div className="lab-story-sticky"><div className="lab-wrap hero-grid exam-hero-grid"><div className="hero-copy"><p className="lab-eyebrow"><span className="eyebrow-dot" /> DPS AGRA EXAM PORTAL</p><div className="hero-chapter" key={chapter}><span className="chapter-caption">0{chapter + 1} / {intro.label}</span><h1>{intro.title}</h1><p className="hero-description">{intro.text}</p></div><div className="hero-actions"><Link to="/student/join" className="lab-button lab-button-dark" data-tour="join">Join an exam <ArrowUpRight size={18} /></Link><Link to="/student/login" className="lab-text-link">Student sign in <ArrowRight size={16} /></Link><Link to="/teacher/login" className="lab-text-link" data-tour="teachers">Teacher workspace <ArrowRight size={16} /></Link></div><p className="hero-note"><ShieldCheck size={13} /> Clear instructions. Visible consent. Teacher-led review.</p></div><ExamWalkthrough chapter={chapter} /></div>
          <div className="lab-wrap story-bottom"><button type="button" className="scroll-invitation" onClick={() => scrollTo('portal-access')}><span className="scroll-icon"><ArrowDown size={14} /></span><span>SCROLL THROUGH THE EXAM JOURNEY<small>or go straight to portal access</small></span></button><ol className="story-steps" aria-label="Exam journey">{['Check in', 'Take the exam', 'Review'].map((label, index) => <li key={label} className={chapter === index ? 'active' : ''} aria-current={chapter === index ? 'step' : undefined}><span>0{index + 1}</span>{label}</li>)}</ol><span className="story-signature">From check-in to clarity.</span></div><div className="story-progress" aria-hidden="true"><span /></div>
        </div>
      </section>

      <div className="exam-capability-strip"><div className="lab-wrap"><span>BUILT AROUND YOUR ASSESSMENT</span><div>{[[CalendarDays, 'Scheduled exams'], [Clock3, 'Timed assessments'], [Monitor, 'Live progress'], [ClipboardCheck, 'Submission review']].map(([Icon, text]) => <span key={text}><Icon size={16} strokeWidth={1.6} />{text}</span>)}</div></div></div>

      <section className="lab-section lab-wrap exam-access" id="portal-access" aria-labelledby="access-title"><div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">01 — ENTER YOUR WORKSPACE</p><h2 id="access-title">Your exam starts <em>here.</em></h2></div><p>Two clear entrances.<br />One connected assessment.</p></div><div className="exam-access-grid" data-reveal><Link to="/student/join" className="exam-access-card"><span className="exam-access-icon"><GraduationCap size={29} strokeWidth={1.5} /></span><span className="exam-access-role">FOR STUDENTS</span><h3>Ready for your exam?</h3><p>Sign in with your school account, check the details and use your teacher’s exam passcode. Guest check-in remains available when allowed.</p><span className="exam-access-action">Student check-in <ArrowUpRight size={19} /></span><span className="exam-access-watermark" aria-hidden="true">01</span></Link><Link to="/teacher/login" className="exam-access-card access-teacher"><span className="exam-access-icon"><Users size={29} strokeWidth={1.5} /></span><span className="exam-access-role">FOR TEACHERS</span><h3>Your class. Your assessment.</h3><p>Set up the exam, follow your students’ progress and bring their submissions together.</p><span className="exam-access-action">Teacher sign-in <ArrowUpRight size={19} /></span><span className="exam-access-watermark" aria-hidden="true">02</span></Link></div><div data-reveal><ExamAvailability /></div></section>

      <section className="exam-functions-section" id="portal-functions" aria-labelledby="functions-title"><div className="lab-wrap"><div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">02 — GET TO KNOW THE PORTAL</p><h2 id="functions-title">Every function.<br /><em>A clear purpose.</em></h2></div><p>Understand where to go<br />and what each workspace does.</p></div><div className="exam-role-tabs" role="tablist" aria-label="Portal functions by role" data-reveal>{[['student', 'For students', GraduationCap], ['teacher', 'For teachers', Users]].map(([value, label, Icon], index) => <button key={value} ref={node => { roleTabs.current[index] = node }} id={`functions-${value}-tab`} role="tab" type="button" aria-selected={role === value} aria-controls={`functions-${value}-panel`} tabIndex={role === value ? 0 : -1} onClick={() => setRole(value)} onKeyDown={event => selectRole(event, index)}><Icon size={17} />{label}</button>)}<span>Choose your role to explore the tools.</span></div><div data-reveal><div className="exam-function-grid" role="tabpanel" id={`functions-${role}-panel`} aria-labelledby={`functions-${role}-tab`} key={role}>{features[role].map(({ icon: Icon, name, tag, text, to, action }, index) => <article className="exam-function-card" key={name} style={{ '--card-delay': `${index * 50}ms` }}><div className="exam-function-top"><span><Icon size={23} strokeWidth={1.6} /></span><small>0{index + 1}</small></div><p className="exam-function-tag">{tag}</p><h3>{name}</h3><p>{text}</p><Link to={to}>{action}<ArrowUpRight size={16} /></Link></article>)}</div><p className="exam-function-note"><KeyRound size={14} />{role === 'teacher' ? 'Teacher tools require an authorised teacher account.' : 'Your dashboard and class handouts become available through your exam session.'}</p></div></div></section>

      <section className="lab-section lab-wrap exam-journey-section" aria-labelledby="journey-title"><div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">03 — BEFORE, DURING & AFTER</p><h2 id="journey-title">A better exam day.<br /><em>Step by step.</em></h2></div><p>A shared flow for students and teachers.<br />Know what happens next.</p></div><ol className="exam-journey" data-reveal>{[{ number: '01', title: 'Prepare the assessment', icon: FilePlus2, teacher: 'Create the questions, set the time window and share the exam passcode.', student: 'Confirm your exam date and keep your class details ready.' }, { number: '02', title: 'Check in & read the rules', icon: KeyRound, teacher: 'Make the expectations and any monitoring requirements clear.', student: 'Choose your exam, enter your details and review the consent settings.' }, { number: '03', title: 'Focus on the questions', icon: Clock3, teacher: 'Follow progress in the exam’s live monitor and review activity signals.', student: 'Work through the questions, use review markers and watch the save status.' }, { number: '04', title: 'Submit, then review', icon: ClipboardCheck, teacher: 'Review submitted answers, provide feedback and check draft grades.', student: 'Check your answers and save status, then confirm your final submission.' }].map(({ number, title, icon: Icon, teacher, student }) => <li key={number}><span className="exam-journey-number">{number}</span><div className="exam-journey-title"><Icon size={21} strokeWidth={1.5} /><h3>{title}</h3></div><div><small>TEACHER</small><p>{teacher}</p></div><div><small>STUDENT</small><p>{student}</p></div></li>)}</ol></section>

      <section className="exam-monitoring-section" aria-labelledby="monitoring-title"><div className="lab-wrap exam-monitoring-grid"><div data-reveal><p className="lab-eyebrow">04 — CLEAR EXPECTATIONS, HUMAN JUDGEMENT</p><h2 id="monitoring-title">Visible monitoring.<br /><em>Thoughtful review.</em></h2><p>Students know the requirements before the exam starts. Teachers see progress and interpret the context behind every signal.</p><Link to="/student/join" className="lab-button lab-button-light">Read the exam rules <ArrowUpRight size={17} /></Link><Link to="/about" className="exam-monitoring-about">About this project & privacy <ArrowRight size={15} /></Link></div><div className="exam-monitoring-cards" data-reveal>{[[Camera, 'Permissions are explicit', 'Camera and screen sharing follow the exam settings, student consent and browser permission.'], [Monitor, 'Activity has context', 'Progress and activity flags help a teacher review an exam. A flag is not automatic proof of misconduct.'], [ShieldCheck, 'People make the decisions', 'Submitted answers and draft grades are reviewed by the teacher. Sharing ends when the exam ends.']].map(([Icon, title, text]) => <div key={title}><span><Icon size={21} strokeWidth={1.6} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

      <section className="lab-section lab-wrap exam-preparation" aria-labelledby="preparation-title"><div className="lab-section-head" data-reveal><div><p className="lab-eyebrow">05 — A LITTLE PREPARATION GOES A LONG WAY</p><h2 id="preparation-title">Arrive <em>prepared.</em></h2></div><p>Supporting resources for the work<br />before your assessment.</p></div><div className="exam-preparation-grid" data-reveal>{[[ClipboardCheck, 'Mock & practice tests', 'Get familiar with a timed assessment, or choose a topic and make a practice test.', '/learn/mock-exam', 'Try the Class IX mock exam'], [BookOpen, 'Study guides & revision', 'Revisit the fundamentals with courses and original downloadable PDF guides.', '/learn', 'Browse the study library'], [GraduationCap, 'Practical preparation', 'Use the practice workspace for computer practical tasks before the real exam.', '/student/practice', 'Open the practice workspace']].map(([Icon, title, text, to, action]) => <Link key={title} to={to} className="exam-preparation-card"><Icon size={25} strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p><span>{action}<ArrowUpRight size={16} /></span></Link>)}</div><Link to="/learn/custom-test" className="lab-text-link exam-custom-test">Want a test on a specific topic? Build a practice test <ArrowRight size={16} /></Link></section>

      <section className="lab-section lab-wrap faq-grid exam-faq" aria-labelledby="faq-title"><div data-reveal><p className="lab-eyebrow">BEFORE YOU ENTER</p><h2 id="faq-title">A few answers<br /><em>before your exam.</em></h2><p className="faq-intro">Clear access. Clear rules. A confident start.</p><Link to="/teacher/request-access" className="lab-text-link">Request teacher access <ArrowUpRight size={16} /></Link></div><div className="lab-faq" data-reveal>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>

      <section className="exam-final-cta lab-wrap" data-reveal><div><p className="lab-eyebrow">YOUR NEXT ASSESSMENT, ALL IN ONE PLACE</p><h2>Ready for <em>exam day?</em></h2><p>Choose your workspace. We’ll take it from there.</p></div><div><Link to="/student/join" className="lab-button lab-button-dark">Join an exam <ArrowUpRight size={18} /></Link><Link to="/teacher/login" className="lab-text-link">Teacher sign-in <ArrowRight size={16} /></Link></div></section>
    </main><Footer />
  </div>
}
