import { forwardRef } from 'react'
import * as m from 'motion/react-m'
import { useQuietMotion, motionTokens } from './Motion'
import { cx } from '../../utils/format'
const Button = forwardRef(function Button({ variant = 'primary', size, type = 'button', className, children, ...props }, ref) {
  const quiet = useQuietMotion()
  return <m.button ref={ref} type={type} className={cx('btn', `btn-${variant}`, size && `btn-${size}`, className)} whileTap={quiet ? undefined : { scale: .98 }} transition={{ duration: motionTokens.fast }} {...props}>{children}</m.button>
})
export default Button
