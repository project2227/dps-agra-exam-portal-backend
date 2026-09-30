import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import DPSLogoAnimated from '../common/DPSLogoAnimated'
import { clearStudentSession, getStudentSession } from '../../services/session'
import { disconnectSocket } from '../../services/socket'

export default function StudentHeader({ title = 'Student dashboard' }) {
  const navigate = useNavigate()
  const s = getStudentSession()
  const leave = () => {
    clearStudentSession()
    disconnectSocket()
    navigate('/')
  }
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-navy-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 rounded-xl">
          <DPSLogoAnimated size={44} small interactive={false} label="" />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold text-white">DPS Agra Exam Portal</span>
            <span className="block text-xs text-slate-400">{title}</span>
          </span>
        </Link>
        {s && (
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-white">{s.student?.name}</p>
              <p className="text-xs text-slate-400">Class {s.student?.class}-{s.student?.section}, Roll {s.student?.rollNumber}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={leave}><LogOut size={15} aria-hidden="true" /> Leave</button>
          </div>
        )}
      </div>
    </header>
  )
}
