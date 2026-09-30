import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { cx, uid } from '../../utils/format'

/*
 * Scratch-style block coding placeholder for junior classes (VI-VII).
 * Students click blocks to build a program; a turtle draws the result.
 * The program is stored as JSON so the backend can check it.
 * Swap this for Google Blockly later without changing the answer format much.
 */
const PALETTE = [
  { kind: 'move', label: 'move', arg: 60, unit: 'steps', cat: 'motion' },
  { kind: 'turn', label: 'turn right', arg: 90, unit: 'degrees', cat: 'motion' },
  { kind: 'turnLeft', label: 'turn left', arg: 90, unit: 'degrees', cat: 'motion' },
  { kind: 'penDown', label: 'pen down', cat: 'pen' },
  { kind: 'penUp', label: 'pen up', cat: 'pen' },
  { kind: 'color', label: 'set pen colour', arg: '#4ade80', cat: 'pen' },
  { kind: 'say', label: 'say', arg: 'Hello!', cat: 'looks' },
  { kind: 'repeat', label: 'repeat', arg: 4, unit: 'times', cat: 'control' },
  { kind: 'end', label: 'end repeat', cat: 'control' },
]
const CAT = {
  motion: 'bg-sky-500/20 border-sky-400/50 text-sky-100',
  pen: 'bg-dps-green/20 border-dps-green/50 text-green-100',
  looks: 'bg-violet-500/20 border-violet-400/50 text-violet-100',
  control: 'bg-dps-orange/20 border-dps-orange/50 text-orange-100',
}
const PEN_COLOURS = ['#4ade80', '#f97316', '#facc15', '#38bdf8', '#f472b6', '#ffffff']

function execute(program) {
  const root = []
  const stack = [root]
  for (const b of program) {
    if (b.kind === 'repeat') { const node = { ...b, body: [] }; stack.at(-1).push(node); stack.push(node.body) }
    else if (b.kind === 'end') { if (stack.length > 1) stack.pop() }
    else stack.at(-1).push(b)
  }
  const st = { x: 150, y: 150, angle: -90, pen: true, color: '#4ade80', segs: [], say: '', steps: 0 }
  const exec = (list) => {
    for (const b of list) {
      if (st.steps++ > 3000) return
      if (b.kind === 'move') {
        const r = (st.angle * Math.PI) / 180
        const d = Number(b.arg) || 0
        const nx = st.x + Math.cos(r) * d
        const ny = st.y + Math.sin(r) * d
        if (st.pen) st.segs.push({ x1: st.x, y1: st.y, x2: nx, y2: ny, color: st.color })
        st.x = nx; st.y = ny
      } else if (b.kind === 'turn') st.angle += Number(b.arg) || 0
      else if (b.kind === 'turnLeft') st.angle -= Number(b.arg) || 0
      else if (b.kind === 'penUp') st.pen = false
      else if (b.kind === 'penDown') st.pen = true
      else if (b.kind === 'color') st.color = b.arg
      else if (b.kind === 'say') st.say = String(b.arg)
      else if (b.kind === 'repeat') for (let i = 0; i < Math.min(60, Number(b.arg) || 0); i++) exec(b.body)
    }
  }
  exec(root)
  return st
}

export default function BlockWorkspace({ value = [], onChange, readOnly = false }) {
  const program = Array.isArray(value) ? value : []
  const result = useMemo(() => execute(program), [program])
  const depths = useMemo(() => {
    let d = 0
    return program.map((b) => { if (b.kind === 'end') d = Math.max(0, d - 1); const cur = d; if (b.kind === 'repeat') d += 1; return cur })
  }, [program])

  const set = (next) => !readOnly && onChange?.(next)
  const add = (tpl) => set([...program, { id: uid('b'), kind: tpl.kind, arg: tpl.arg }])
  const update = (i, arg) => set(program.map((b, j) => (j === i ? { ...b, arg } : b)))
  const move = (i, dir) => { const n = [...program]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; set(n) }
  const remove = (i) => set(program.filter((_, j) => j !== i))
  const tplOf = (kind) => PALETTE.find((p) => p.kind === kind)

  const arrowRad = (result.angle * Math.PI) / 180
  return (
    <div className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[200px_1fr_300px]">
      <div className="space-y-1.5" aria-label="Block palette">
        <p className="text-xs text-slate-400">Click a block to add it</p>
        {PALETTE.map((p) => (
          <button key={p.kind} type="button" disabled={readOnly} onClick={() => add(p)}
            className={cx('flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm font-medium transition hover:brightness-125', CAT[p.cat])}>
            <Plus size={13} aria-hidden="true" /> {p.label}{p.unit ? ` ( ) ${p.unit}` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-[220px] overflow-auto rounded-xl border border-white/10 bg-navy-950/50 p-3" aria-label="Your program">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>when green flag clicked</span>
          {!readOnly && program.length > 0 && <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={() => set([])}><RotateCcw size={12} aria-hidden="true" /> Clear</button>}
        </div>
        {program.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">Your program is empty. Add blocks from the palette.</p>}
        <ol className="space-y-1.5">
          {program.map((b, i) => {
            const tpl = tplOf(b.kind)
            return (
              <li key={b.id} style={{ marginLeft: depths[i] * 22 }} className={cx('flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm', CAT[tpl?.cat])}>
                <span className="font-medium">{tpl?.label}</span>
                {b.kind === 'color' ? (
                  <select className="rounded bg-navy-950/70 px-1 py-0.5 text-xs" value={b.arg} onChange={(e) => update(i, e.target.value)} disabled={readOnly} aria-label="Pen colour">
                    {PEN_COLOURS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : tpl?.arg !== undefined && (
                  <input className="w-20 rounded bg-navy-950/70 px-1.5 py-0.5 text-xs text-white" value={b.arg} disabled={readOnly}
                    onChange={(e) => update(i, typeof tpl.arg === 'number' ? e.target.value.replace(/[^\d-]/g, '') : e.target.value)} aria-label={`${tpl.label} value`} />
                )}
                {tpl?.unit && <span className="text-xs opacity-80">{tpl.unit}</span>}
                {!readOnly && (
                  <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} aria-label="Move block up"><ArrowUp size={13} /></button>
                    <button type="button" onClick={() => move(i, 1)} aria-label="Move block down"><ArrowDown size={13} /></button>
                    <button type="button" onClick={() => remove(i)} aria-label="Delete block"><Trash2 size={13} /></button>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#050d1a] p-2">
        <p className="px-1 pb-1 text-xs text-slate-400">Stage</p>
        <svg viewBox="0 0 300 300" className="aspect-square w-full rounded-lg bg-navy-950" role="img" aria-label={`Drawing with ${result.segs.length} lines`}>
          <defs><pattern id="stage-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="rgba(148,163,184,.08)" /></pattern></defs>
          <rect width="300" height="300" fill="url(#stage-grid)" />
          {result.segs.map((s, i) => <line key={i} {...s} stroke={s.color} strokeWidth="3" strokeLinecap="round" />)}
          <g transform={`translate(${result.x} ${result.y}) rotate(${result.angle})`}>
            <polygon points="12,0 -8,-7 -4,0 -8,7" fill="#f97316" stroke="#fff" strokeWidth="1" />
          </g>
          {result.say && (
            <g transform={`translate(${Math.min(250, Math.max(10, result.x + 12 + Math.cos(arrowRad)))} ${Math.max(20, result.y - 22)})`}>
              <rect x="-4" y="-14" width={Math.min(140, result.say.length * 7 + 12)} height="20" rx="6" fill="#fff" />
              <text x="2" y="0" fontSize="11" fill="#0b1b30">{result.say.slice(0, 18)}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
