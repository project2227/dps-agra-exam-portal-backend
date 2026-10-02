import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
const names = { student: 'Student', teacher: 'Teacher', learn: 'Learning Hub', dashboard: 'Dashboard', profile: 'Profile', join: 'Check-in', practice: 'Practice IDE', classes: 'Classes', students: 'Student details', exams: 'Exams', create: 'Create exam', manage: 'Manage exams', submissions: 'Submissions', grades: 'Grade analysis', handouts: 'Handouts', 'exam-dates': 'Exam dates', courses: 'Courses', community: 'Staff discussion', account: 'Account', 'manage-teachers': 'Manage teachers', 'test-data': 'Test data', course: 'Course', 'teacher-course': 'Assigned course', 'mock-exam': 'Mock exam', 'custom-test': 'Practice test', games: 'Revision games', arcade: 'Logic Arcade', login: 'Sign in', 'forgot-password': 'Password help', 'set-password': 'New password', 'reset-password': 'Reset password', about: 'About the portal' }
export default function Breadcrumbs() {
  const { pathname } = useLocation()
  if (pathname === '/' || /\/student\/exam\/|\/monitor$/.test(pathname)) return null
  const parts = pathname.split('/').filter(Boolean)
  const roleHome = parts[0] === 'teacher' ? '/teacher/dashboard' : parts[0] === 'learn' ? '/learn' : '/student/join'
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Portal</Link><ChevronRight size={12} aria-hidden="true" />{parts.length > 1 && <><Link to={roleHome}>{names[parts[0]] || parts[0]}</Link><ChevronRight size={12} aria-hidden="true" /></>}<span aria-current="page">{names[parts.at(-1)] || names[parts.at(-2)] || 'Details'}</span></nav>
}
