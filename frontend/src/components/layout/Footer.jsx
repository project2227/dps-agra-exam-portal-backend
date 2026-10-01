import { Code2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LOGO_SRC, SCHOOL } from '../../config'

export function LegacyFooter({ compact = false }) {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-navy-950/40">
      <div className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center md:flex-row md:text-left ${compact ? 'py-4' : 'py-8'}`}>
        <div className="flex items-center gap-3">
          <img src={LOGO_SRC} alt="" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-display text-sm font-semibold text-white">{SCHOOL.portal}</p>
            <p className="text-xs text-slate-500">Independent student-built learning platform • Not an official school portal</p>
          </div>
        </div>
        <p className="credit">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-dps-neon">
            <Code2 size={14} aria-hidden="true" />
          </span>
          Made by <span className="credit-name text-gradient">Aryan Agarwal</span>
        </p>
        <p className="text-xs text-slate-500"><a className="text-dps-neon hover:underline" target="_blank" rel="noopener noreferrer" href="https://dps.ac.in/">Official DPS Agra ↗</a> · <Link className="text-amber-300 hover:underline" to="/learn/arcade">Logic Arcade ↗</Link> · <Link to="/about" className="hover:underline">About & privacy</Link> · Independent project © {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}

export { default } from './LearningFooter'
