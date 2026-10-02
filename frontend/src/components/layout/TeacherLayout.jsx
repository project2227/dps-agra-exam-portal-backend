import { signOutAccount } from '../../services/accountApi'
import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { FlaskConical, LogOut, Menu, Search } from 'lucide-react'
import Breadcrumbs from '../common/Breadcrumbs'
import Sidebar from './Sidebar'
import Footer from './Footer'
import DPSLogoAnimated from '../common/DPSLogoAnimated'
import ThemeToggle from '../common/ThemeToggle'
import api from '../../services/api'
import { clearTeacherAuth, getTeacherAuth } from '../../services/session'
import { disconnectSocket } from '../../services/socket'
import { DEMO_MODE, SCHOOL } from '../../config'
import { initials } from '../../utils/format'

export default function TeacherLayout() {
  const navigate = useNavigate()
  const auth = getTeacherAuth()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dps.sidebar') === 'collapsed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liveExams, setLiveExams] = useState([])

  useEffect(() => {
    api.getTeacherExams().then((list) => setLiveExams(list.filter((e) => e.status === 'live'))).catch(() => {})
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem('dps.sidebar', c ? 'open' : 'collapsed')
      return !c
    })
  }
  const logout = async () => {
    try { await signOutAccount() } catch { return }
    clearTeacherAuth()
    disconnectSocket()
    navigate('/teacher/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 h-16 border-b border-white/[0.06] bg-navy-950/75 backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6">
          <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <Link to="/teacher/dashboard" className="flex items-center gap-3 rounded-xl">
            <DPSLogoAnimated size={44} small interactive={false} label="" />
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-[15px] font-semibold text-white">{SCHOOL.portal}</span>
              <span className="block text-xs text-slate-400">Teacher workspace</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3"><button type="button" className="command-button" aria-label="Find a page (Control or Command K)" onClick={()=>window.dispatchEvent(new Event('dps:find-tool'))}><Search size={17}/><span className="command-label">Find a page</span><kbd className="kbd">⌘K</kbd></button>
            <ThemeToggle />
            {DEMO_MODE && <span className="chip hidden border-dps-gold/30 text-dps-gold sm:inline-flex"><FlaskConical size={12} aria-hidden="true" /> Demo data</span>}
            <div className="hidden text-right leading-tight md:block">
              <p className="text-sm font-medium text-white">{auth?.teacher?.name || 'Teacher'}</p>
              <p className="text-xs text-slate-500">{auth?.teacher?.email}</p>
            </div>
            <span className="hidden h-9 w-9 place-items-center rounded-full bg-dps-green/10 text-sm font-semibold text-dps-green sm:grid" aria-hidden="true">
              {initials(auth?.teacher?.name)}
            </span>
            <button type="button" onClick={logout} className="btn btn-ghost btn-sm" aria-label="Sign out"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} liveExams={liveExams} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Breadcrumbs /><Outlet />
          </main>
          <Footer compact />
        </div>
      </div>
    </div>
  )
}
