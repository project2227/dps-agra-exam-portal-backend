import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, List, Trash2 } from 'lucide-react'
import { cx, formatDate, formatDay, formatTime } from '../../utils/format'

const TYPE_STYLE = {
  Practical: 'bg-dps-green/20 text-dps-neon border-dps-green/40',
  Quiz: 'bg-sky-500/15 text-sky-200 border-sky-400/40',
  Theory: 'bg-dps-orange/15 text-orange-200 border-dps-orange/40',
  Mixed: 'bg-dps-gold/10 text-dps-gold border-dps-gold/30',
  Other: 'bg-white/5 text-slate-300 border-white/15',
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export default function CalendarList({ events = [], defaultView = 'list', onDelete, compact = false }) {
  const [view, setView] = useState(defaultView)
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selected, setSelected] = useState(null)
  const sorted = useMemo(() => [...events].sort((a, b) => new Date(a.date) - new Date(b.date)), [events])

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay() + 6) % 7)) // weeks start Monday
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [cursor])

  const eventsOn = (d) => sorted.filter((e) => sameDay(new Date(e.date), d))
  const today = new Date()
  const listItems = selected ? eventsOn(selected) : sorted.filter((e) => new Date(e.date) >= new Date(today.toDateString()))

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist" aria-label="View">
            {[['list', 'List', List], ['calendar', 'Calendar', CalendarDays]].map(([key, label, Icon]) => (
              <button key={key} role="tab" aria-selected={view === key} type="button" onClick={() => { setView(key); setSelected(null) }}
                className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition', view === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          {view === 'calendar' && (
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <span className="min-w-[9rem] text-center font-display font-medium text-white">
                {cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}

      {view === 'calendar' && !compact && (
        <div className="mb-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const evs = eventsOn(d)
              const inMonth = d.getMonth() === cursor.getMonth()
              const isToday = sameDay(d, today)
              const isSel = selected && sameDay(d, selected)
              return (
                <button key={d.toISOString()} type="button" onClick={() => setSelected(isSel ? null : d)}
                  aria-label={`${formatDay(d)}${evs.length ? `, ${evs.length} exam${evs.length > 1 ? 's' : ''}` : ''}`}
                  aria-pressed={!!isSel}
                  className={cx('flex min-h-[4.25rem] flex-col items-start rounded-lg border p-1.5 text-left text-xs transition',
                    inMonth ? 'border-white/10 bg-white/[0.02]' : 'border-transparent opacity-40',
                    isSel && 'border-dps-neon/60 bg-dps-green/10', !isSel && 'hover:border-white/25')}>
                  <span className={cx('grid h-6 w-6 place-items-center rounded-full', isToday ? 'bg-dps-orange font-semibold text-white' : 'text-slate-300')}>{d.getDate()}</span>
                  <span className="mt-1 flex w-full flex-col gap-0.5">
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} className={cx('truncate rounded border px-1 text-[10px] leading-4', TYPE_STYLE[e.type] || TYPE_STYLE.Other)}>{e.class} {e.title}</span>
                    ))}
                    {evs.length > 2 && <span className="text-[10px] text-slate-400">+{evs.length - 2} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {(view === 'list' || selected || compact) && (
        <>
          {selected && <p className="mb-2 text-sm text-slate-400">Exams on {formatDate(selected)}</p>}
          {listItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">No upcoming exam dates.</p>
          ) : (
            <ul className="space-y-2">
              {listItems.map((e) => {
                const d = new Date(e.date)
                return (
                  <li key={e.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="grid w-14 shrink-0 place-items-center rounded-lg border border-white/10 bg-navy-950/60 py-1.5 text-center">
                      <span className="text-[11px] text-dps-orange">{d.toLocaleString('en-IN', { month: 'short' })}</span>
                      <span className="font-display text-xl font-semibold leading-none text-white">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{e.title}</p>
                      <p className="text-xs text-slate-400">
                        Class {e.class}{e.section && e.section !== 'All' ? `-${e.section}` : ', all sections'} | {formatDay(d)}{d.getHours() || d.getMinutes() ? `, ${formatTime(d)}` : ''}
                        {e.notes ? ` | ${e.notes}` : ''}
                      </p>
                    </div>
                    <span className={cx('hidden rounded-full border px-2 py-0.5 text-xs font-medium sm:inline', TYPE_STYLE[e.type] || TYPE_STYLE.Other)}>{e.type}</span>
                    {onDelete && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(e)} aria-label={`Delete ${e.title}`}><Trash2 size={14} /></button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
