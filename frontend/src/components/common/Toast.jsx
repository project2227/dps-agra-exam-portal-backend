import { createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info }
  const colors = { success: 'border-dps-green/40 text-dps-neon', error: 'border-red-400/40 text-red-300', info: 'border-sky-400/40 text-sky-300' }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`glass-strong pointer-events-auto flex items-center gap-2.5 border px-4 py-3 text-sm text-white shadow-2xl animate-fade-up ${colors[t.type]}`}>
              <Icon size={16} aria-hidden="true" />
              <span className="text-slate-100">{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
