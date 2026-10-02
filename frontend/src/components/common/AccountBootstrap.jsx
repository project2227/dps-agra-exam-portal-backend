import { useEffect, useSyncExternalStore } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { getAccountState, subscribeAccounts } from '../../services/session'
import { refreshAccount } from '../../services/accountApi'
export const useAccount = () => useSyncExternalStore(subscribeAccounts, getAccountState)
export default function AccountBootstrap() { const account = useAccount(), location = useLocation(); useEffect(() => { refreshAccount() }, []); if (account.student?.mustChangePassword && !['/student/set-password', '/student/login'].includes(location.pathname)) return <Navigate to="/student/set-password" replace />; return null }

export function LearningSessionGate({children}){const a=useAccount();return a.ready?children:<div className="grid min-h-[60vh] place-items-center">Checking your learning profile…</div>}
