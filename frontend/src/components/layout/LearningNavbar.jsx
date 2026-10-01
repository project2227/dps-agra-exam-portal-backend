import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, Compass, Menu, Search, X } from 'lucide-react'
import LabMark from '../common/LabMark'
import ThemeToggle from '../common/ThemeToggle'

const extraLinks = [
  ['/learn/games', 'Coding quizzes'], ['/learn/custom-test', 'Create a practice test'],
  ['/learn/mock-exam', 'Class IX mock exam'], ['/learn/profile', 'Learning profile'], ['/about', 'About DPS Lab'],
]
export default function LearningNavbar() {
  const [open,setOpen] = useState(false)
  const { pathname } = useLocation()
  const more = useRef(null)
  useEffect(() => { setOpen(false); if(more.current) more.current.open=false }, [pathname])
  useEffect(() => {
    const close = e => { if(e.key==='Escape') { setOpen(false); if(more.current) more.current.open=false } }
    const outside = e => { if(more.current&&!more.current.contains(e.target)) more.current.open=false }
    document.addEventListener('keydown',close); document.addEventListener('pointerdown',outside)
    return () => { document.removeEventListener('keydown',close); document.removeEventListener('pointerdown',outside) }
  }, [])
  const tour = () => { setOpen(false); window.dispatchEvent(new CustomEvent('dps:tour-replay')) }
  return <header className="lab-header"><nav className="lab-wrap lab-navigation" aria-label="Main">
    <Link to="/" className="lab-brand" aria-label="DPS Lab home" data-tour="home"><LabMark size={38}/><span>DPS<span className="brand-lab">lab</span><small>A LITTLE ROOM TO GROW</small></span></Link>
    <div className="lab-desktop-links">
      <NavLink to="/learn" data-tour="courses">Explore</NavLink>
      <NavLink to="/student/practice/python" data-tour="ide">Practice</NavLink>
      <NavLink to="/learn/arcade" data-tour="games">Play</NavLink>
      <NavLink to="/teacher/login" data-tour="teachers">For teachers</NavLink>
      <details className="lab-more" ref={more}><summary>More <ChevronDown size={12}/></summary><div className="lab-more-menu">{extraLinks.map(([to,label])=><Link to={to} key={to}>{label}<ArrowUpRight size={13}/></Link>)}<button type="button" onClick={tour}><Compass size={14}/> Original intro & guided tour</button></div></details>
    </div>
    <div className="lab-nav-actions"><button type="button" className="lab-icon-button" aria-label="Find a tool" title="Find a tool (Ctrl/Cmd + K)" onClick={()=>window.dispatchEvent(new Event('dps:find-tool'))}><Search size={18}/></button><ThemeToggle/><Link to="/student/join" data-tour="join" className="lab-button lab-button-dark nav-exam">Join an exam <ArrowUpRight size={15}/></Link><button type="button" className="lab-menu-toggle lab-icon-button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} aria-controls="lab-mobile-navigation" onClick={()=>setOpen(x=>!x)}>{open?<X size={21}/>:<Menu size={21}/>}</button></div>
    {open&&<div id="lab-mobile-navigation" className="lab-mobile-menu"><span className="lab-eyebrow">FIND YOUR NEXT STEP</span><Link to="/learn">Explore courses & PDFs<ArrowUpRight size={16}/></Link><Link to="/student/practice/python">Open the practice lab<ArrowUpRight size={16}/></Link><Link to="/learn/arcade">Logic Arcade<ArrowUpRight size={16}/></Link><Link to="/teacher/login">Teacher workspace<ArrowUpRight size={16}/></Link>{extraLinks.map(([to,label])=><Link to={to} key={to}>{label}<ArrowUpRight size={16}/></Link>)}<button type="button" onClick={tour}><Compass size={16}/> Original intro & guided tour</button><Link to="/student/join" className="lab-button lab-button-dark">Join an exam <ArrowUpRight size={16}/></Link></div>}
  </nav></header>
}
