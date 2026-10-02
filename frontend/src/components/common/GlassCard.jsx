import { cx } from '../../utils/format'
import Card from './Card'

export default function GlassCard({ as: Tag = 'div', glow = false, hoverGlow = false, className = '', children, ...rest }) {
  return (
    <Card as={Tag} className={cx('glass', glow && 'gradient-border', hoverGlow && 'gradient-border gradient-border-hover', className)} {...rest}>
      {children}
    </Card>
  )
}
