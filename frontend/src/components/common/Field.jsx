import { useId } from 'react'
import { cx } from '../../utils/format'

/** Label + control + hint/error, wired up with ids for screen readers. */
export function Field({ label, hint, error, required, id: suppliedId, className = '', children }) {
  const generated = useId()
  const id = suppliedId || generated
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  const child = typeof children === 'function' ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error || undefined }) : children
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-dps-orange" aria-hidden="true"> *</span>}
        </label>
      )}
      {child}
      {error ? <p id={`${id}-err`} className="error-text" role="alert">{error}</p> : hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, icon: Icon, disabled }) {
  const id = useId()
  return (
    <div className={cx('flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5', disabled && 'opacity-60')}>
      <div className="flex gap-3">
        {Icon && <Icon size={18} className="mt-0.5 shrink-0 text-dps-neon" aria-hidden="true" />}
        <div>
          <label htmlFor={id} className="text-sm font-medium text-white">{label}</label>
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full border transition', checked ? 'border-dps-green bg-dps-green' : 'border-white/15 bg-white/10')}
      >
        <span className={cx('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
