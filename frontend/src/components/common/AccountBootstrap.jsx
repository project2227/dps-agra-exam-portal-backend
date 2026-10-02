import { useEffect, useSyncExternalStore } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { getAccountState, subscribeAccounts } from '../../services/session'
import { refreshAccount } from '../../services/accountApi'
import Loader from './Loader'
export const useAccount = () => useSyncExternalStore(subscribeAccounts, getAccountState)
export default function AccountBootstrap() { const account = useAccount(), location = useLocation(); useEffect(() => { refreshAccount() }, []); if (account.student?.mustChangePassword && !['/student/set-password', '/student/login'].includes(location.pathname)) return <Navigate to="/student/set-password" replace />; return null }

export function LearningSessionGate({children}){const a=useAccount();return a.ready?children:<Loader label="Checking your learning profile…" />}
