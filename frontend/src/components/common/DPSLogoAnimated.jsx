import { useRef } from 'react'
import { LOGO_SRC } from '../../config'
import { cx } from '../../utils/format'

/**
 * DPS Agra crest with a slow 3D sway, a spinning green/gold/orange ring,
 * a dashed orbit and a soft halo. On hover or focus the motion slows down,
 * the crest scales up and the glow brightens.
 *
 * Replace the image by dropping a new file at /public/dps-logo.png.
 */
export default function DPSLogoAnimated({ size = 280, small = false, className = '', label = 'Delhi Public School, Agra crest', interactive = true }) {
  const ref = useRef(null)
  const setRate = (rate) => {
    ref.current?.getAnimations?.({ subtree: true }).forEach((a) => {
      if (a instanceof CSSAnimation) a.playbackRate = rate
    })
  }
  const ringWidth = small ? '2px' : typeof size === 'number' && size < 140 ? '2px' : '3px'

  return (
    <div
      ref={ref}
      className={cx('logo-stage', small && 'logo-stage--small', className)}
      style={{ width: size, height: size, '--ring': ringWidth }}
      onMouseEnter={() => setRate(0.3)}
      onMouseLeave={() => setRate(1)}
      onFocus={() => setRate(0.3)}
      onBlur={() => setRate(1)}
      tabIndex={interactive ? 0 : undefined}
      role="img"
      aria-label={label}
    >
      <span className="logo-halo" aria-hidden="true" />
      <span className="logo-orbit" aria-hidden="true" />
      <span className="logo-ring" aria-hidden="true" />
      <span className="logo-ring logo-ring--inner" aria-hidden="true" />
      <span className="logo-img-wrap" aria-hidden="true">
        <img src={LOGO_SRC} alt="" className="logo-img" draggable="false" />
        <span
          className="logo-sheen"
          style={{ WebkitMaskImage: `url(${LOGO_SRC})`, maskImage: `url(${LOGO_SRC})` }}
        />
      </span>
    </div>
  )
}
