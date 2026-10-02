import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function RoutePresentation() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.body.dataset.labPage = pathname === '/' ? 'home' : pathname.endsWith('/monitor') ? 'monitor' : pathname.includes('/student/exam/') ? 'exam' : pathname === '/learn' ? 'library' : 'workspace'
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
