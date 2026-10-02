import { useAccount } from '../common/AccountBootstrap'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, Compass, Menu, Search, X } from 'lucide-react'
import ExamCrest from '../common/ExamCrest'
import ThemeToggle from '../common/ThemeToggle'

const resources = [
  ['/learn/mock-exam', 'Mock exam'], ['/learn/custom-test', 'Build a practice test'],
  ['/learn', 'Study guides & courses'], ['/student/practice', 'Practical preparation'],
  ['/learn/games', 'Revision quizzes'], ['/learn/arcade', 'Logic Arcade'],
  ['/student/profile', 'Student profile'], ['/learn/profile', 'Practice profile'], ['/about', 'About & privacy'],
]
export default function ExamNavbar() {
  const account = useAccount()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const more = useRef(null)
  useEffect(() => { setOpen(false); if (more.current) more.current.open = false }, [pathname])
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') { setOpen(false); if (more.current) more.current.open = false } }
    const outside = event => { if (more.current && !more.current.contains(event.target)) more.current.open = false }
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside) }
  }, [])
  const tour = () => { setOpen(false); if (more.current) more.current.open = false; window.dispatchEvent(new CustomEvent('dps:tour-replay')) }
  const functions = event => {
    if (pathname === '/') {
      event.preventDefault()
      document.getElementById('portal-functions')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }
  return <header className="lab-header exam-header"><nav className="lab-wrap lab-navigation" aria-label="Main">
    <Link to="/" className="exam-brand" aria-label="DPS Agra Exam Portal home" data-tour="home"><ExamCrest size={44} decorative /><span>DPS Agra<small>EXAM PORTAL</small></span></Link>
    <div className="lab-desktop-links exam-desktop-links">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to={account.student?"/student/profile":"/student/login"} data-tour="join">{account.student?"My profile":"Student sign in"}</NavLink>
      <Link to="/" state={{ section: 'portal-functions' }} onClick={functions}>Portal functions</Link>
      <NavLink to="/teacher/login" data-tour="teachers">Teacher access</NavLink>
      <details className="lab-more" ref={more}><summary>Resources <ChevronDown size={12} /></summary><div className="lab-more-menu">{resources.map(([to, label]) => <Link to={to} key={to}>{label}<ArrowUpRight size={13} /></Link>)}<button type="button" onClick={tour}><Compass size={14} /> Original intro & guided tour</button></div></details>
    </div>
    <div className="lab-nav-actions"><button type="button" className="lab-icon-button" aria-label="Find a portal function" title="Find a function (Ctrl/Cmd + K)" onClick={() => window.dispatchEvent(new Event('dps:find-tool'))}><Search size={18} /></button><ThemeToggle /><Link to="/student/join" className="lab-button lab-button-dark nav-exam">Join an exam <ArrowUpRight size={15} /></Link><button type="button" className="lab-menu-toggle lab-icon-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="exam-mobile-navigation" onClick={() => setOpen(value => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
    {open && <div id="exam-mobile-navigation" className="lab-mobile-menu"><span className="lab-eyebrow">YOUR EXAM WORKSPACE</span><Link to="/" state={{ section: 'portal-functions' }} onClick={event => { functions(event); setOpen(false) }}>Portal functions<ArrowUpRight size={16} /></Link><Link to="/student/join">Student check-in<ArrowUpRight size={16} /></Link><Link to="/teacher/login">Teacher workspace<ArrowUpRight size={16} /></Link>{resources.map(([to, label]) => <Link to={to} key={to}>{label}<ArrowUpRight size={16} /></Link>)}<button type="button" onClick={tour}><Compass size={16} /> Original intro & guided tour</button><Link to="/student/join" className="lab-button lab-button-dark">Join an exam <ArrowUpRight size={16} /></Link></div>}
  </nav></header>
}
