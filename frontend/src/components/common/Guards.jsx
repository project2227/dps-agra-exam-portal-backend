import { Navigate, useLocation } from 'react-router-dom'
import { getStudentSession, getTeacherToken } from '../../services/session'

export function TeacherGuard({ children }) {
  const location = useLocation()
  if (!getTeacherToken()) return <Navigate to="/teacher/login" replace state={{ from: location.pathname }} />
  return children
}

export function StudentGuard({ children }) {
  if (!getStudentSession()) return <Navigate to="/student/join" replace />
  return children
}
