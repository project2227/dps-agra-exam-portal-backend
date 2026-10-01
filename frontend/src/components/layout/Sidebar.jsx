import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, FilePlus2, FileText, Archive, LayoutDashboard, PanelLeftClose, PanelLeftOpen, School, X, BookOpen, MessageCircle, BarChart3, UserPlus, KeyRound } from 'lucide-react'
import { cx } from '../../utils/format'
import { getTeacherAuth } from '../../services/session'

export const TEACHER_NAV = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/classes', label: 'Classes', icon: School },
  { to: '/teacher/exams/create', label: 'Create exam', icon: FilePlus2 },
  { to: '/teacher/exams/manage', label: 'Manage hosted exams', icon: Archive },
  { to: '/teacher/submissions', label: 'Submissions', icon: ClipboardCheck },
  { to: '/teacher/handouts', label: 'Handouts', icon: FileText },
  { to: '/teacher/exam-dates', label: 'Exam dates', icon: CalendarDays },
  { to: '/teacher/courses', label: 'Course studio', icon: BookOpen },
  { to: '/teacher/community', label: 'Staff discussion', icon: MessageCircle },
  { to: '/teacher/grades', label: 'Grade analysis', icon: BarChart3 },
  { to: '/teacher/manage-teachers', label: 'Manage teachers', icon: UserPlus, adminOnly: true },
  { to: '/teacher/account', label: 'My account', icon: KeyRound },
]

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, liveExams = [] }) {
  const content = (isMobile) => (
    <div className="flex h-full flex-col gap-1 p-3">
      {isMobile && (
        <div className="mb-2 flex justify-end">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCloseMobile} aria-label="Close menu"><X size={16} /></button>
        </div>
      )}
      {TEACHER_NAV.filter(x => !x.adminOnly || getTeacherAuth()?.teacher?.role==='admin').map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={isMobile ? onCloseMobile : undefined} title={collapsed && !isMobile ? label : undefined}
          className={({ isActive }) => cx(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive ? 'bg-dps-green/15 text-white ring-1 ring-dps-green/40' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
          )}>
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          <span className={cx(collapsed && !isMobile && 'sr-only')}>{label}</span>
        </NavLink>
      ))}

      {liveExams.length > 0 && (
        <div className={cx('mt-5', collapsed && !isMobile && 'hidden')}>
          <p className="px-3 pb-2 text-xs font-semibold text-slate-500">Live now</p>
          {liveExams.map((e) => (
            <NavLink key={e.id} to={`/teacher/exams/${e.id}/monitor`} onClick={isMobile ? onCloseMobile : undefined}
              className={({ isActive }) => cx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition', isActive ? 'bg-white/[0.07] text-white' : 'text-slate-300 hover:bg-white/[0.05]')}>
              <span className="live-dot text-dps-neon" aria-hidden="true" />
              <span className="truncate">Class {e.class}: {e.title}</span>
            </NavLink>
          ))}
        </div>
      )}

      {!isMobile && (
        <button type="button" onClick={onToggleCollapse} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/[0.05] hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className={cx(collapsed && 'sr-only')}>Collapse</span>
        </button>
      )}
    </div>
  )

  return (
    <>
      <aside className={cx('sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-white/[0.06] bg-navy-950/40 backdrop-blur-xl transition-[width] lg:block', collapsed ? 'w-[72px]' : 'w-64')} aria-label="Teacher navigation">
        {content(false)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/80" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="glass-strong absolute inset-y-0 left-0 w-72 rounded-none animate-fade-up" aria-label="Teacher navigation">{content(true)}</aside>
        </div>
      )}
    </>
  )
}
