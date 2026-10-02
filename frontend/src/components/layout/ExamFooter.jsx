import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ExamCrest from '../common/ExamCrest'

export default function ExamFooter({ compact = false }) {
  return <footer className={`lab-footer exam-footer ${compact ? 'lab-footer-compact' : ''}`}><div className="lab-wrap">
    {!compact && <div className="lab-footer-top"><div className="footer-about"><Link to="/" className="exam-brand" aria-label="DPS Agra Exam Portal home"><ExamCrest size={44} decorative /><span>DPS Agra<small>Exam portal</small></span></Link><p>Exams, preparation and class resources.</p><span className="footer-motto">Clear assessments. Thoughtful review.</span></div><div className="footer-link-group"><span>Exam portal</span><Link to="/student/join">Student check-in</Link><Link to="/teacher/login">Teacher workspace</Link><Link to="/teacher/request-access">Request teacher access</Link><Link to="/about">About & privacy</Link></div><div className="footer-link-group"><span>Prepare for your exam</span><Link to="/learn/mock-exam">Class IX mock exam</Link><Link to="/learn/custom-test">Practice tests</Link><Link to="/learn">Study guides & courses</Link><Link to="/student/practice">Practical preparation</Link></div></div>}
    <div className="lab-footer-bottom"><div><p>Independent, student-built educational project.</p><small>Not an officially affiliated DPS Agra website. <a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer">Official school website <ArrowUpRight size={11} /></a></small></div><p className="lab-maker"><img src={import.meta.env.BASE_URL + 'brand/aryan-code-logo.svg'} alt="" width="27" height="27" loading="lazy" />Made by <Link to="/about">Aryan Agarwal</Link><span>© {new Date().getFullYear()}</span></p></div>
  </div></footer>
}
