import { Link } from 'react-router-dom'
import { ArrowUpRight, ClipboardCheck, LockKeyhole, ShieldCheck, Users } from 'lucide-react'
import Breadcrumbs from '../components/common/Breadcrumbs'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ExamCrest from '../components/common/ExamCrest'

export default function ExamAboutPortal() {
  return <div className="learning-site exam-site"><Navbar /><main className="lab-wrap exam-about">
    <Breadcrumbs/><div className="exam-about-heading"><ExamCrest size={70} animated /><p className="lab-eyebrow">About the project</p><h1>Built for classroom assessments</h1><p>The DPS Agra Exam Portal brings student check-in, timed assessments, live progress and submission review into one workspace. It is an independent, student-built educational project by Aryan Agarwal.</p></div>
    <div className="exam-about-notice"><ShieldCheck size={21} /><p>This is not an officially affiliated DPS Agra website, official student portal or approved school grading system. Draft marksheets require teacher and school approval before official use.</p></div>
    <div className="exam-function-grid">{[[ClipboardCheck, 'Assessment is the centre', 'Students join scheduled exams with a teacher-issued passcode. Teachers create assessments, follow progress and review submitted work.'], [LockKeyhole, 'Clear access & consent', 'Student exam sessions and authorised teacher accounts have separate access flows. Camera and screen sharing require explicit consent and browser permission.'], [Users, 'Teacher-led decisions', 'Activity flags support review; they are not automatic proof of misconduct. Teachers review answers, feedback and draft grades.']].map(([Icon, title, text]) => <section className="exam-function-card card" key={title}><div className="exam-function-top"><span><Icon size={23} strokeWidth={1.6} /></span></div><h2 className="exam-about-card-title">{title}</h2><p>{text}</p></section>)}</div>
    <div className="exam-about-links"><Link to="/student/join" className="lab-button lab-button-dark">Student check-in <ArrowUpRight size={16} /></Link><Link to="/teacher/login" className="lab-button">Teacher workspace <ArrowUpRight size={16} /></Link><a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer" className="lab-text-link">Official school website <ArrowUpRight size={16} /></a></div>
  </main><Footer /></div>
}
