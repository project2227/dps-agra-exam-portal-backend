import { cx } from '../../utils/format'

export default function GlassCard({ as: Tag = 'div', glow = false, hoverGlow = false, className = '', children, ...rest }) {
  return (
    <Tag className={cx('glass', glow && 'gradient-border', hoverGlow && 'gradient-border gradient-border-hover', className)} {...rest}>
      {children}
    </Tag>
  )
}
