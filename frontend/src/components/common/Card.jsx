import { cx } from '../../utils/format'
export default function Card({ as: Tag = 'div', className, children, ...props }) {
  return <Tag className={cx('card', className)} {...props}>{children}</Tag>
}
