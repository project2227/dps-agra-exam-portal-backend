import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { FlaskConical, Menu, X } from 'lucide-react'
import DPSLogoAnimated from '../common/DPSLogoAnimated'
import { DEMO_MODE, SCHOOL } from '../../config'
import { cx } from '../../utils/format'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/student/join', label: 'Join exam' },
  { to: '/student/practice', label: 'Practice IDE' },
  { to: '/teacher/login', label: 'Teachers' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-navy-950/70 backdrop-blur-xl" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 rounded-xl" aria-label={`${SCHOOL.portal} home`}>
          <DPSLogoAnimated size={40} small interactive={false} label="" />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold text-white">{SCHOOL.short}</span>
            <span className="block text-xs text-slate-400">Exam Portal</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
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
        <button type="button" className="btn btn-ghost btn-sm md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-4 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
              className={({ isActive }) => cx('block rounded-lg px-3 py-2.5 text-sm', isActive ? 'bg-white/[0.07] text-white' : 'text-slate-300')}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
