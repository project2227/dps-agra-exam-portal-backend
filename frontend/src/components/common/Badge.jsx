import { Circle } from 'lucide-react'
import { cx } from '../../utils/format'
export default function Badge({ children, icon: Icon = Circle, tone = 'neutral', live = false, className }) {
  return <span className={cx('badge', `badge-${tone}`, className)}>{live ? <span className="live-dot" aria-hidden="true" /> : <Icon size={12} aria-hidden="true" />}{children}</span>
}
