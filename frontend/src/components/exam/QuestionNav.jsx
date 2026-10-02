import { Bookmark, Check, Circle } from 'lucide-react'
import { cx } from '../../utils/format'

export function isAnswered(q, value) {
  if (value == null) return false
  if (q.type === 'code') {
    const lang = value.language
    const draft = value.drafts?.[lang]
    if (Array.isArray(draft)) return draft.length > 0
    if (draft && typeof draft === 'object') return Object.values(draft).some((v) => v?.trim?.())
    return !!draft?.trim?.() && draft !== q.starterCode?.[lang]
  }
  if (q.type === 'upload') return !!value?.fileName
  return String(value).trim().length > 0
}

export default function QuestionNav({ questions, answers, review = {}, current, onJump }) {
  const answered = questions.filter((q) => isAnswered(q, answers[q.id])).length
  return (
    <nav aria-label="Questions" className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-white">Questions</span>
        <span className="text-slate-400">{answered}/{questions.length} answered</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label="Questions answered" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={questions.length}>
        <div className="h-full rounded-full bg-dps-green" style={{ width: `${(answered / Math.max(1, questions.length)) * 100}%` }} />
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const done = isAnswered(q, answers[q.id])
          const marked = review[q.id]
          const isCur = i === current
          return (
            <li key={q.id}>
              <button type="button" onClick={() => onJump(i)} aria-current={isCur ? 'step' : undefined}
                aria-label={`Question ${i + 1}${done ? ', answered' : ', not answered'}${marked ? ', marked for review' : ''}`}
                className={cx(
                  'relative grid h-10 w-full place-items-center rounded-lg border text-sm font-semibold transition',
                  done ? 'border-dps-green/50 bg-dps-green/20 text-dps-neon' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/30',
                  isCur && 'ring-2 ring-dps-green ring-offset-2 ring-offset-navy-950',
                )}>
                {i + 1}{done && <Check size={10} className="absolute bottom-0.5 right-0.5" aria-hidden="true" />}
                {marked && <Bookmark size={11} className="absolute -right-1 -top-1 fill-dps-gold text-dps-gold" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ol>
      <ul className="mt-5 space-y-1.5 text-xs text-slate-400">
        <li className="flex items-center gap-2"><Check size={12} aria-hidden="true"/> Answered</li>
        <li className="flex items-center gap-2"><Circle size={12} aria-hidden="true"/> Not answered</li>
        <li className="flex items-center gap-2"><Bookmark size={12} className="fill-dps-gold text-dps-gold" aria-hidden="true" /> Marked for review</li>
      </ul>
    </nav>
  )
}
