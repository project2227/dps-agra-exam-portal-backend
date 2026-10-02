import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAnimationControls } from 'motion/react'
import * as m from 'motion/react-m'
import { motionTokens, useQuietMotion } from './Motion'
export default function PageTransition({ children }) {
  const { pathname } = useLocation()
  const controls = useAnimationControls()
  const quiet = useQuietMotion()
  const calm = /\/student\/exam\/|\/monitor$/.test(pathname)
  useEffect(() => {
    controls.stop()
    if (calm || quiet) { controls.set({ opacity: 1, y: 0 }); return }
    controls.set({ opacity: .7, y: 6 })
    controls.start({ opacity: 1, y: 0, transition: { duration: motionTokens.enter, ease: motionTokens.ease } })
  }, [pathname, quiet, calm, controls])
  // No key or exit unmount: keep exam, editor, media and realtime state alive.
  return <m.div className="page-transition" animate={controls} initial={false}>{children}</m.div>
}
