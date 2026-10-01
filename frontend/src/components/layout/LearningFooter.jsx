import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import LabMark from '../common/LabMark'

export default function LearningFooter({ compact = false }) {
  return <footer className={`lab-footer ${compact?'lab-footer-compact':''}`}>
    <div className="lab-wrap">
      {!compact&&<div className="lab-footer-top"><div className="footer-about"><Link to="/" className="lab-brand" aria-label="DPS Lab home"><LabMark size={38}/><span>DPS<span className="brand-lab">lab</span><small>A LITTLE ROOM TO GROW</small></span></Link><p>For curious minds, first experiments<br/>and ideas waiting to happen.</p><span className="footer-motto">Learn a little. Make a little. Grow a lot.</span></div><div className="footer-link-group"><span>KEEP EXPLORING</span><Link to="/learn">Courses & study guides</Link><Link to="/student/practice/python">The practice lab</Link><Link to="/learn/arcade">Logic Arcade</Link><Link to="/learn/custom-test">Practice tests</Link></div><div className="footer-link-group"><span>THE CLASSROOM</span><Link to="/student/join">Join an exam</Link><Link to="/teacher/login">Teacher workspace</Link><Link to="/teacher/request-access">Request teacher access</Link><Link to="/about">About & privacy</Link></div></div>}
      <div className="lab-footer-bottom"><div><p>Independent, student-built learning project.</p><small>Not an officially affiliated DPS Agra website. <a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer">Official school website <ArrowUpRight size={11}/></a></small></div><p className="lab-maker"><img src={import.meta.env.BASE_URL+'brand/aryan-code-logo.svg'} alt="" width="27" height="27" loading="lazy"/>Made by <Link to="/about">Aryan Agarwal</Link><span>© {new Date().getFullYear()}</span></p></div>
    </div>
  </footer>
}
