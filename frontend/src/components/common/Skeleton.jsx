import { cx } from '../../utils/format'
export default function Skeleton({ className = '', label = 'Loading', ...props }) {
  return <span className={cx('skeleton', className)} role="status" aria-label={label} {...props} />
}
