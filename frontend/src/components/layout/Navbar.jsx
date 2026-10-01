import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Compass, FlaskConical, Menu, X, Gamepad2, Search } from 'lucide-react'
import DPSLogoAnimated from '../common/DPSLogoAnimated'
import ThemeToggle from '../common/ThemeToggle'
import { DEMO_MODE, SCHOOL } from '../../config'
import { cx } from '../../utils/format'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/student/join', label: 'Join exam' },
  { to: '/student/practice', label: 'Practice IDE' },
  { to: '/learn', label: 'Courses & PDFs' },
  { to: '/learn/games', label: 'Mini games' },
  { to: '/learn/custom-test', label: 'Make a test' },
  { to: '/learn/mock-exam', label: 'Mock exam' },
  { to: '/learn/profile', label: 'Profile' },
  { to: '/teacher/login', label: 'Teachers' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-navy-950/70 backdrop-blur-xl" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" data-tour="home" className="flex items-center gap-3 rounded-xl" aria-label={`${SCHOOL.portal} home`}>
          <DPSLogoAnimated size={40} small interactive={false} label="" />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold text-white">{SCHOOL.short}</span>
            <span className="block text-xs text-slate-400">Exam Portal</span>
          </span>
        </Link>
        <div className="hidden items-center gap-0.5 lg:flex">
          {LINKS.filter(l=>!['/learn/mock-exam','/learn/profile'].includes(l.to)).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} data-tour={{"/":"home-nav","/student/join":"join","/student/practice":"ide","/learn":"courses","/learn/games":"games","/learn/custom-test":"test","/teacher/login":"teachers"}[l.to]}
              className={({ isActive }) => cx('rounded-lg px-3 py-2 text-sm transition', isActive ? 'bg-white/[0.07] text-white' : 'text-slate-300 hover:text-white')}>
              {l.label}
            </NavLink>
          ))}
          {DEMO_MODE && (
            <span className="chip ml-2 border-dps-gold/30 text-dps-gold" title="Running on sample data. Set VITE_API_BASE_URL to connect the backend.">
              <FlaskConical size={12} aria-hidden="true" /> Demo data
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-2"><Link to="/learn/arcade" className="hidden items-center gap-1.5 rounded-lg border border-amber-400/20 px-2.5 py-1.5 text-xs text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-400/10 xl:flex" title="Play coding challenges in DPS Lab">Logic Arcade <Gamepad2 size={12} aria-hidden="true" /></Link><button type="button" className="btn btn-ghost btn-sm hidden sm:inline-flex" aria-label="Replay interactive website tour" title="Explore site features" onClick={()=>window.dispatchEvent(new CustomEvent("dps:tour-replay"))}><Compass size={16}/><span className="hidden xl:inline">Tour</span></button><button type="button" className="btn btn-ghost btn-sm" aria-label="Find a tool" title="Find a tool (Ctrl/Cmd + K)" onClick={()=>window.dispatchEvent(new Event('dps:find-tool'))}><Search size={16}/></button><ThemeToggle />
        <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button></div>
      </div>
      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-4 lg:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
              className={({ isActive }) => cx('block rounded-lg px-3 py-2.5 text-sm', isActive ? 'bg-white/[0.07] text-white' : 'text-slate-300')}>
              {l.label}
            </NavLink>
          ))}
          <button type="button" className="btn btn-ghost btn-sm mt-2 w-full justify-start" onClick={()=>{setOpen(false);window.dispatchEvent(new Event('dps:tour-replay'))}}><Compass size={16}/> Replay website tour</button>
          <Link to="/learn/arcade" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2.5 text-sm text-amber-200">Logic Arcade <Gamepad2 size={14} aria-hidden="true" /><span className="ml-auto text-[11px] text-slate-400">Play here</span></Link>
        </div>
      )}
    </nav>
  )
}
