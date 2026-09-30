import { Code2 } from 'lucide-react'
import { LOGO_SRC, SCHOOL } from '../../config'

export default function Footer({ compact = false }) {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-navy-950/40">
      <div className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center md:flex-row md:text-left ${compact ? 'py-4' : 'py-8'}`}>
        <div className="flex items-center gap-3">
          <img src={LOGO_SRC} alt="" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-display text-sm font-semibold text-white">{SCHOOL.portal}</p>
            <p className="text-xs text-slate-500">{SCHOOL.name}, {SCHOOL.department}</p>
          </div>
        </div>
        <p className="credit">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-dps-neon">
            <Code2 size={14} aria-hidden="true" />
          </span>
          Made by <span className="credit-name text-gradient">Aryan Agarwal</span>
        </p>
        <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} {SCHOOL.name}</p>
      </div>
    </footer>
  )
}
