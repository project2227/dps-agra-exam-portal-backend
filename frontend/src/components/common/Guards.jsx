import { Navigate, useLocation } from 'react-router-dom'
import { getStudentSession, getTeacherAuth } from '../../services/session'

import { useAccount } from './AccountBootstrap'
import { Spinner } from './Feedback'

export function TeacherGuard({ children }) {
  const account = useAccount()
  if (!account.ready) return <Spinner label="Checking your session" />
  const location = useLocation()
  if (!getTeacherAuth()) return <Navigate to="/teacher/login" replace state={{ from: location.pathname }} />
  return children
}

export function StudentGuard({ children }) {
  if (!getStudentSession()) return <Navigate to="/student/join" replace />
  return children
}

export function StudentAccountGuard({ children }) { const a=useAccount(); if(!a.ready)return <Spinner label="Checking your session"/>; if(!a.student)return <Navigate to="/student/login" replace/>; return children }
