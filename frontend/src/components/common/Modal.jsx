import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { X } from 'lucide-react'
import { cx } from '../../utils/format'
import { motionTokens, useQuietMotion } from './Motion'
export default function Modal({open,onClose,title,children,footer,size='md',dismissible=true}) {
  const panel=useRef(null), onCloseRef=useRef(onClose), titleId=useId()
  const [origin,setOrigin]=useState('50% 50%')
  const quiet=useQuietMotion()
  onCloseRef.current=onClose
  useEffect(()=>{
    if(!open)return
    const previous=document.activeElement
    const trigger=previous?.getBoundingClientRect?.(), bounds=panel.current?.getBoundingClientRect()
    if(trigger && bounds)setOrigin(`${trigger.left + trigger.width/2-bounds.left}px ${trigger.top + trigger.height/2-bounds.top}px`)
    panel.current?.focus()
    const root=document.getElementById('root'), oldInert=root?.inert, oldOverflow=document.body.style.overflow
    if(root)root.inert=true
    document.body.style.overflow='hidden'
    const onKey=event=>{
      if(event.key==='Escape' && dismissible){event.preventDefault();onCloseRef.current?.()}
      if(event.key!=='Tab')return
      const controls=[...panel.current?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || []].filter(el=>!el.hidden && el.getAttribute('aria-hidden')!=='true')
      const first=controls[0],last=controls.at(-1)
      if(!first){event.preventDefault();panel.current?.focus();return}
      if(event.shiftKey && (document.activeElement===first || document.activeElement===panel.current)){event.preventDefault();last.focus()}
      else if(!event.shiftKey && (document.activeElement===last || document.activeElement===panel.current)){event.preventDefault();first.focus()}
    }
    window.addEventListener('keydown',onKey)
    return()=>{window.removeEventListener('keydown',onKey);if(root)root.inert=oldInert;document.body.style.overflow=oldOverflow;previous?.focus?.()}
  },[open,dismissible])
  const widths={sm:'max-w-md',md:'max-w-xl',lg:'max-w-3xl',xl:'max-w-5xl'}
  return createPortal(<AnimatePresence>{open && <m.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:motionTokens.fast}}>
    <div className="absolute inset-0 bg-[rgb(8_25_16_/_0.55)]" onClick={()=>dismissible && onClose?.()} aria-hidden="true" />
    <m.div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{transformOrigin:origin}} initial={quiet?{opacity:0}:{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className={cx('glass-strong modal-panel relative max-h-[90dvh] w-full overflow-y-auto p-6 focus:outline-none',widths[size])}>
      <div className="mb-5 flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-semibold">{title}</h2>{dismissible && <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>}</div>
      {children}{footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
    </m.div>
  </m.div>}</AnimatePresence>,document.body)
}
