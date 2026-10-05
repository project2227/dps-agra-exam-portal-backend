import { useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronRight, Code2, Copy, EyeOff, FileUp, ListChecks, Plus, TextCursorInput, Trash2 } from 'lucide-react'
import { CLASS_LANGUAGES, LANGUAGES, STARTER_CODE } from '../../config'
import { cx, uid } from '../../utils/format'

const TYPES = {
  mcq: { label: 'MCQ', icon: ListChecks },
  text: { label: 'Text answer', icon: TextCursorInput },
  code: { label: 'Practical', icon: Code2 },
  upload: { label: 'File upload', icon: FileUp },
}

export function newQuestion(kind, examClass = 'XII') {
  const base = { id: uid('q'), prompt: '', marks: 1, modelAnswer: '', rubric: '', aiMarking: false, rubricApproved: false }
  if (kind === 'mcq') return { ...base, type: 'mcq', options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })), correct: 'a' }
  if (kind === 'text') return { ...base, type: 'short', marks: 2, maxLength: 300, modelAnswer: '' }
  if (kind === 'upload') return { ...base, type: 'upload', marks: 2, accept: '.pdf,.png,.jpg,.jpeg,.zip', maxSizeMB: 10, optional: false }
  const lang = (CLASS_LANGUAGES[examClass] || ['python']).find(l => ['python','java','cpp','c','javascript'].includes(l)) || 'python'
  return {
    ...base, type: 'code', marks: 5, title: '', languages: [lang],
    starterCode: { [lang]: lang === 'web' ? STARTER_CODE.web : lang === 'blocks' ? [] : '' },
    visibleTests: [], hiddenTests: [],
  }
}

/** Returns { [questionId]: 'message' } for anything that would block publishing. */
export function validateQuestions(questions) {
  const errors = {}
  questions.forEach((q) => {
    if (!q.prompt.trim()) errors[q.id] = 'Write the question text.'
    else if (!(Number(q.marks) >= 0) || !Number.isFinite(Number(q.marks)) || Number(q.marks) > 10000) errors[q.id] = 'Use marks between 0 and 10,000.'
    else if (q.type === 'mcq') {
      if (q.options.length < 2 || q.options.some((o) => !o.text.trim())) errors[q.id] = 'Fill in at least two options or remove empty ones.'
      else if (new Set(q.options.map(o => o.text.trim())).size !== q.options.length) errors[q.id] = 'Use distinct options.'
      else if (q.correct && !q.options.find((o) => o.id === q.correct)) errors[q.id] = 'Choose an existing correct option, or mark manually.'
    } else if (q.type === 'code') {
      if (![...q.visibleTests, ...q.hiddenTests].every(t => !t.input.trim() || t.expected.trim())) errors[q.id] = 'Finish the optional test outputs or remove the unfinished tests.'
    }
    if (q.aiMarking && (!q.rubric?.trim() || !q.rubricApproved)) errors[q.id] = 'Write and approve the rubric before enabling AI marking suggestions.'
    if (q.aiMarking && (Number(q.marks) > 100 || q.prompt.length > 5000)) errors[q.id] = 'AI suggestions support up to 100 marks and 5,000 question characters. Use manual marking for this question.'
  })
  return errors
}

function TestList({ title, hint, tests, onChange, hidden }) {
  const set = (id, patch) => onChange(tests.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-200">{hidden && <EyeOff size={14} className="text-dps-orange" aria-hidden="true" />}{title}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...tests, { id: uid('t'), input: '', expected: '' }])}><Plus size={13} aria-hidden="true" /> Add test</button>
      </div>
      <p className="hint -mt-1 mb-2">{hint}</p>
      <div className="space-y-2">
        {tests.map((t, i) => (
          <div key={t.id} className="grid gap-2 rounded-lg border border-white/10 bg-navy-950/50 p-2 sm:grid-cols-[1fr,1fr,auto]">
            <label className="block">
              <span className="sr-only">Test {i + 1} input</span>
              <textarea className="input min-h-[52px] font-mono text-xs" placeholder={`Input ${i + 1} (stdin)`} value={t.input} onChange={(e) => set(t.id, { input: e.target.value })} />
            </label>
            <label className="block">
              <span className="sr-only">Test {i + 1} expected output</span>
              <textarea className="input min-h-[52px] font-mono text-xs" placeholder="Expected output" value={t.expected} onChange={(e) => set(t.id, { expected: e.target.value })} />
            </label>
            <button type="button" className="btn btn-ghost btn-sm self-start" aria-label={`Remove test ${i + 1}`} onClick={() => onChange(tests.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button>
          </div>
        ))}
        {tests.length === 0 && <p className="text-xs text-slate-500">No tests yet.</p>}
      </div>
    </div>
  )
}

function QuestionEditor({ q, index, total, examClass, error, onChange, onMove, onDuplicate, onRemove }) {
  const [open, setOpen] = useState(true)
  const set = (patch) => onChange({ ...q, ...patch, ...(['prompt','marks','languages','modelAnswer','rubric'].some(k => k in patch) ? { rubricApproved: false } : {}) })
  const kind = q.type === 'short' || q.type === 'long' ? 'text' : q.type
  const Icon = TYPES[kind].icon
  const classLangs = CLASS_LANGUAGES[examClass] || Object.keys(LANGUAGES)
  const langOptions = [...classLangs, ...Object.keys(LANGUAGES).filter((l) => !classLangs.includes(l))].filter(l => ['python','java','cpp','c','javascript'].includes(l))
  const lang = q.languages?.[0]

  const setLanguage = (l) => set({
    languages: [l],
    starterCode: { [l]: q.starterCode?.[l] ?? (l === 'web' ? STARTER_CODE.web : l === 'blocks' ? [] : '') },
  })

  return (
    <article className={cx('glass overflow-hidden', error && 'border-red-400/50')}>
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span className="font-display font-semibold text-white">Q{index + 1}</span>
          <span className="chip"><Icon size={12} aria-hidden="true" /> {q.type === 'long' ? 'Long answer' : q.type === 'short' ? 'Short answer' : TYPES[kind].label}</span>
          <span className="truncate text-sm text-slate-400">{q.title || q.prompt || 'Untitled question'}</span>
        </button>
        <span className="chip border-dps-gold/30 text-dps-gold">{q.marks || 0} marks</span>
        <div className="flex gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={13} /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down"><ArrowDown size={13} /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate} aria-label="Duplicate"><Copy size={13} /></button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onRemove} aria-label="Delete question"><Trash2 size={13} /></button>
        </div>
      </header>

      {open && (
        <div className="space-y-4 p-4">
          {error && <p className="error-text mt-0" role="alert">{error}</p>}
          {q.type === 'code' && (
            <div>
              <label className="label" htmlFor={`${q.id}-title`}>Short title</label>
              <input id={`${q.id}-title`} className="input" value={q.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Count the vowels" />
            </div>
          )}
          <div>
            <label className="label" htmlFor={`${q.id}-prompt`}>Question</label>
            <textarea id={`${q.id}-prompt`} className="input min-h-[84px]" value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Type the question students will see" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={`${q.id}-marks`}>Marks</label>
              <input id={`${q.id}-marks`} type="number" min="0" step="0.5" className="input" value={q.marks} onChange={(e) => set({ marks: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            {kind === 'text' && (
              <>
                <div>
                  <label className="label" htmlFor={`${q.id}-len`}>Answer length</label>
                  <select id={`${q.id}-len`} className="input" value={q.type} onChange={(e) => set({ type: e.target.value })}>
                    <option value="short">Short (one line)</option>
                    <option value="long">Long (paragraph)</option>
                  </select>
                </div>
                {q.type === 'short' ? (
                  <div>
                    <label className="label" htmlFor={`${q.id}-max`}>Max characters</label>
                    <input id={`${q.id}-max`} type="number" min="20" className="input" value={q.maxLength || 300} onChange={(e) => set({ maxLength: Number(e.target.value) })} />
                  </div>
                ) : (
                  <div>
                    <label className="label" htmlFor={`${q.id}-min`}>Suggested min words</label>
                    <input id={`${q.id}-min`} type="number" min="0" className="input" value={q.minWords || ''} onChange={(e) => set({ minWords: Number(e.target.value) || undefined })} />
                  </div>
                )}
              </>
            )}
            {q.type === 'code' && (
              <div className="sm:col-span-2">
                <label className="label" htmlFor={`${q.id}-lang`}>Programming language</label>
                <select id={`${q.id}-lang`} className="input" value={lang} onChange={(e) => setLanguage(e.target.value)}>
                  {langOptions.map((l) => <option key={l} value={l}>{LANGUAGES[l].long}{classLangs.includes(l) ? '' : ' (not usual for this class)'}</option>)}
                </select>
              </div>
            )}
            {q.type === 'upload' && (
              <>
                <div>
                  <label className="label" htmlFor={`${q.id}-accept`}>Allowed file types</label>
                  <input id={`${q.id}-accept`} className="input" value={q.accept} onChange={(e) => set({ accept: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`${q.id}-size`}>Max size (MB)</label>
                  <input id={`${q.id}-size`} type="number" min="1" max="50" className="input" value={q.maxSizeMB} onChange={(e) => set({ maxSizeMB: Number(e.target.value) })} />
                </div>
              </>
            )}
          </div>

          {q.type === 'mcq' && (
            <fieldset>
              <legend className="label">Options and answer key</legend>
              <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!q.correct} onChange={e => set({ correct: e.target.checked ? '' : q.options[0]?.id || '' })} /> Mark manually (no answer key)</label>
              <div className="space-y-2">
                {q.options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <label className={cx('flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold focus-within:ring-2 focus-within:ring-dps-neon', q.correct === o.id ? 'border-dps-neon bg-dps-green text-white' : 'border-white/15 text-slate-300')}>
                      <input aria-label={`Answer key: option ${String.fromCharCode(65 + i)}`} type="radio" name={`${q.id}-correct`} className="sr-only" checked={q.correct === o.id} onChange={() => set({ correct: o.id })} />
                      {q.correct === o.id ? <CheckCircle2 size={16} aria-label="Correct answer" /> : String.fromCharCode(65 + i)}
                    </label>
                    <label className="flex-1">
                      <span className="sr-only">Option {String.fromCharCode(65 + i)}</span>
                      <input className="input" value={o.text} placeholder={`Option ${String.fromCharCode(65 + i)}`} onChange={(e) => set({ options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={q.options.length <= 2} aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
                      onClick={() => set({ options: q.options.filter((x) => x.id !== o.id), correct: q.correct === o.id ? '' : q.correct })}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              {q.options.length < 6 && (
                <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => set({ options: [...q.options, { id: uid('o'), text: '' }] })}><Plus size={13} aria-hidden="true" /> Add option</button>
              )}
            </fieldset>
          )}

          {['short','long','code'].includes(q.type) && <details className="rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm font-medium">Marking notes and AI suggestions (optional, teachers only)</summary>
            <div className="mt-4 space-y-3">
              <label className="block" htmlFor={`${q.id}-model`}><span className="label">Reference answer (optional)</span><textarea id={`${q.id}-model`} maxLength={4000} className="input min-h-[64px]" value={q.modelAnswer || ''} onChange={e => set({ modelAnswer: e.target.value, rubricApproved: false })} /></label>
              <label className="block" htmlFor={`${q.id}-rubric`}><span className="label">Marking rubric</span><textarea id={`${q.id}-rubric`} maxLength={4000} className="input min-h-[80px]" value={q.rubric || ''} onChange={e => set({ rubric: e.target.value, rubricApproved: false })} placeholder="For example: correct function definition (1), handles the input (2), correct output (2)." /></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!q.aiMarking} onChange={e => set({ aiMarking: e.target.checked })} /> Offer AI marking suggestions for this question</label>
              {q.aiMarking && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={!q.rubric?.trim()} checked={!!q.rubricApproved} onChange={e => set({ rubricApproved: e.target.checked })} /> I checked and approve this rubric. I will review the AI suggestion before saving marks.</label>}
              <p className="hint">You can publish practical and written questions without answers. Mark manually, or approve a rubric for AI suggestions. AI does not save final marks.</p>
            </div>
          </details>}

          {q.type === 'upload' && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4 accent-dps-green" checked={!!q.optional} onChange={(e) => set({ optional: e.target.checked })} /> Optional question
            </label>
          )}

          {q.type === 'code' && (
            <>
              {lang !== 'blocks' && (
                <div>
                  <label className="label" htmlFor={`${q.id}-starter`}>Starter code {lang === 'web' && '(HTML, shown first)'}</label>
                  <textarea
                    id={`${q.id}-starter`}
                    spellCheck={false}
                    className="input min-h-[140px] font-mono text-[13px] leading-relaxed"
                    value={lang === 'web' ? q.starterCode?.web?.html || '' : q.starterCode?.[lang] || ''}
                    onKeyDown={(e) => {
                      if (e.key !== 'Tab') return
                      e.preventDefault()
                      const el = e.currentTarget
                      const { selectionStart: a, selectionEnd: b, value } = el
                      const next = `${value.slice(0, a)}    ${value.slice(b)}`
                      set({ starterCode: { [lang]: lang === 'web' ? { ...q.starterCode.web, html: next } : next } })
                      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4 })
                    }}
                    onChange={(e) => set({ starterCode: { [lang]: lang === 'web' ? { ...(q.starterCode?.web || STARTER_CODE.web), html: e.target.value } : e.target.value } })}
                    placeholder={`Optional ${LANGUAGES[lang].label} code students start with`}
                  />
                </div>
              )}
              {['web', 'blocks'].includes(lang) ? (
                <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
                  {LANGUAGES[lang].label} answers are marked manually on the Submissions page, so no test cases are needed.
                </p>
              ) : (
                <details className="rounded-xl border border-white/10 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Sample and hidden tests (optional)</summary>
                  <p className="hint mt-2">No expected answer is required. Add tests only when you want deterministic code checking.</p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <TestList title="Visible sample tests" hint="Students can see these and run them before submitting." tests={q.visibleTests} onChange={(visibleTests) => set({ visibleTests })} />
                  <TestList hidden title="Hidden tests" hint="Used for auto-checking. Students only see pass/fail counts." tests={q.hiddenTests} onChange={(hiddenTests) => set({ hiddenTests })} />
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}

export default function TeacherExamBuilder({ questions, onChange, examClass, errors = {}, allowCoding = true }) {
  const add = (kind) => onChange([...questions, newQuestion(kind, examClass)])
  const update = (i, q) => onChange(questions.map((x, j) => (j === i ? q : x)))
  const move = (i, d) => {
    const next = [...questions]
    const [q] = next.splice(i, 1)
    next.splice(i + d, 0, q)
    onChange(next)
  }
  const duplicate = (i) => {
    const copy = structuredClone(questions[i])
    copy.id = uid('q')
    const next = [...questions]
    next.splice(i + 1, 0, copy)
    onChange(next)
  }
  const total = questions.reduce((a, q) => a + (Number(q.marks) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-400">{questions.length} question{questions.length === 1 ? '' : 's'} | {total} marks total</p>
      </div>
      {questions.map((q, i) => (
        <QuestionEditor key={q.id} q={q} index={i} total={questions.length} examClass={examClass} error={errors[q.id]}
          onChange={(nq) => update(i, nq)} onMove={(d) => move(i, d)} onDuplicate={() => duplicate(i)}
          onRemove={() => onChange(questions.filter((_, j) => j !== i))} />
      ))}
      <div className="rounded-2xl border border-dashed border-white/15 p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Add a question</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPES).map(([k, { label, icon: Icon }]) => (
            <button key={k} type="button" className="btn btn-ghost" onClick={() => add(k)} disabled={k === 'code' && !allowCoding} title={k === 'code' && !allowCoding ? 'Turn on code execution to add coding questions' : undefined}>
              <Icon size={16} className="text-dps-neon" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
