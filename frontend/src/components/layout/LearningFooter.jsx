import { SCHOOL, PLINTH } from '../../config'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import LabMark from '../common/LabMark'

export default function LearningFooter({ compact = false }) {
  return <footer className={`lab-footer ${compact?'lab-footer-compact':''}`}>
    <div className="lab-wrap">
      {!compact&&<div className="lab-footer-top"><div className="footer-about"><Link to="/" className="lab-brand" aria-label={SCHOOL.short+' home'}><LabMark size={38}/><span>{PLINTH.enabled?SCHOOL.short:<>DPS<span className="brand-lab">lab</span></>}<small>Learning Hub</small></span></Link><p>For curious minds, first experiments<br/>and ideas waiting to happen.</p><span className="footer-motto">Learn a little. Make a little. Grow a lot.</span></div><div className="footer-link-group"><span>KEEP EXPLORING</span><Link to="/learn">Courses & study guides</Link><Link to="/student/practice/python">The practice lab</Link><Link to="/learn/arcade">Logic Arcade</Link><Link to="/learn/custom-test">Practice tests</Link></div><div className="footer-link-group"><span>THE CLASSROOM</span><Link to="/student/join">Join an exam</Link><Link to="/teacher/login">Teacher workspace</Link><Link to="/teacher/request-access">Request teacher access</Link><Link to="/about">About & privacy</Link></div></div>}
      <div className="lab-footer-bottom">{PLINTH.enabled&&PLINTH.tenant?.slug!=='dps-agra'?<><p>{SCHOOL.short} · Powered by Plinth</p><Link to="/privacy">Privacy & data</Link></>:<><div><p>Independent, student-built learning project.</p><small>Not an officially affiliated DPS Agra website. <a href="https://dps.ac.in/" target="_blank" rel="noopener noreferrer">Official school website <ArrowUpRight size={11}/></a></small></div><p className="lab-maker">Made by <Link to="/about">Aryan Agarwal</Link><span>© {new Date().getFullYear()}</span></p></>}</div>
    </div>
  </footer>
}
