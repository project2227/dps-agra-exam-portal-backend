import { Timer as TimerIcon } from 'lucide-react'
import * as m from 'motion/react-m'
import { cx } from '../../utils/format'
import { motionTokens,useQuietMotion } from '../common/Motion'
export default function Timer({formatted,isWarning,isCritical,label='Time left'}) {
  const quiet=useQuietMotion()
  return <m.div role="timer" aria-label={`${label}: ${formatted}`} animate={isCritical && !quiet?{opacity:[1,.65,1]}:{opacity:1}} transition={{duration:motionTokens.signature,repeat:isCritical && !quiet?1:0}} className={cx('flex items-center gap-2 rounded-xl border px-3 py-1.5 text-lg font-semibold tabular-nums',isCritical?'border-red-400/50 bg-red-500/10 text-red-400':isWarning?'border-dps-orange/40 bg-dps-orange/10 text-orange-400':'border-line bg-surface text-ink')}><TimerIcon size={16} aria-hidden="true"/><span className="sr-only">{label}</span>{formatted}</m.div>
}
