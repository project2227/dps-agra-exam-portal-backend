import { createContext,useCallback,useContext,useEffect,useRef,useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { AlertTriangle,CheckCircle2,Info,X } from 'lucide-react'
import { motionTokens,useQuietMotion } from './Motion'
const ToastCtx=createContext(()=>{})
export const useToast=()=>useContext(ToastCtx)
export function ToastProvider({children}) {
  const [toasts,setToasts]=useState([]), timers=useRef(new Set()), quiet=useQuietMotion()
  useEffect(()=>()=>{timers.current.forEach(clearTimeout)},[])
  const push=useCallback((message,type='success')=>{
    const id=Math.random().toString(36).slice(2)
    setToasts(t=>[...t,{id,message,type}])
    const timer=setTimeout(()=>{setToasts(t=>t.filter(x=>x.id!==id));timers.current.delete(timer)},3800)
    timers.current.add(timer)
  },[])
  const icons={success:CheckCircle2,error:AlertTriangle,info:Info}
  return <ToastCtx.Provider value={push}>{children}<div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite" aria-relevant="additions"><AnimatePresence initial={false}>{toasts.map(t=>{
    const Icon=icons[t.type] || Info
    return <m.div key={t.id} initial={quiet?{opacity:0}:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:motionTokens.enter}} className="toast-item pointer-events-auto"><Icon size={18} className={t.type==='error'?'text-red-400':'text-dps-green'} aria-hidden="true" /><span className="min-w-0 flex-1">{t.message}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setToasts(all=>all.filter(x=>x.id!==t.id))}><X size={15}/></button></m.div>
  })}</AnimatePresence></div></ToastCtx.Provider>
}
