import { LazyMotion, MotionConfig, useReducedMotion } from 'motion/react'
export const motionTokens = { fast: .15, enter: .25, signature: .4, ease: [.2, 0, 0, 1], exit: [.4, 0, 1, 1] }
const features = () => import('./motionFeatures').then(module => module.default)
export function useQuietMotion() {
  const reduced = useReducedMotion()
  return reduced || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}
export default function MotionProvider({ children }) {
  return <LazyMotion features={features} strict><MotionConfig reducedMotion="user" transition={{ duration: motionTokens.enter, ease: motionTokens.ease }}>{children}</MotionConfig></LazyMotion>
}
