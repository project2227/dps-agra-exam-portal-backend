import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../utils/format'

/**
 * Counts down to the exam's end time. Uses the absolute end time (plus an
 * optional server clock offset) instead of a local counter, so it never drifts.
 */
export default function useExamTimer(endsAt, { onExpire, serverOffsetMs = 0 } = {}) {
  const end = endsAt ? new Date(endsAt).getTime() : null
  const calc = () => (end ? Math.max(0, end - (Date.now() + serverOffsetMs)) : 0)
  const [remaining, setRemaining] = useState(calc)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const fired = useRef(false)

  useEffect(() => {
    if (!end) return undefined
    fired.current = false
    const tick = () => {
      const r = calc()
      setRemaining(r)
      if (r === 0 && !fired.current) {
        fired.current = true
        onExpireRef.current?.()
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, serverOffsetMs])

  return {
    remaining,
    formatted: formatDuration(remaining),
    isWarning: !!end && remaining <= 5 * 60_000,
    isCritical: !!end && remaining <= 60_000,
    expired: !!end && remaining === 0,
  }
}
