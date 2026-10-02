import { forwardRef, useId } from 'react'
import { Field } from './Field'
import { cx } from '../../utils/format'
const Input = forwardRef(function Input({ label, hint, error, required, className, id: suppliedId, ...props }, ref) {
  const generated = useId()
  const id = suppliedId || generated
  if (!label) return <input ref={ref} id={id} required={required} className={cx('input', className)} {...props} />
  return <Field id={id} label={label} hint={hint} error={error} required={required}>{a => <input {...a} ref={ref} required={required} className={cx('input', className)} {...props} />}</Field>
})
export default Input
