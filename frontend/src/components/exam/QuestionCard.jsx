import * as m from 'motion/react-m'
import {useQuietMotion,motionTokens} from '../common/Motion'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import CodeEditorPanel from '../ide/CodeEditorPanel'
import UploadBox from '../common/UploadBox'
import api from '../../services/api'
import { cx, formatBytes } from '../../utils/format'

const TYPE_LABEL = { mcq: 'Multiple choice', short: 'Short answer', long: 'Long answer', code: 'Coding', upload: 'File upload' }

export default function QuestionCard({ question: q, index, total, value, onChange, exam, saveStatus, lastSavedAt }) {
  const quiet=useQuietMotion()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const restrict = !!exam?.settings?.copyPasteRestriction
  const words = typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0

  const upload = async ([file]) => {
    if (!file) return onChange(null)
    setUploading(true)
    setUploadError('')
    try {
      const res = await api.uploadAnswerFile(exam.id, q.id, file, setProgress)
      onChange({ fileId: res.fileId, fileName: file.name, size: file.size })
    } catch (e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <m.article initial={quiet?false:{opacity:.65}} animate={{opacity:1}} transition={{duration:motionTokens.fast}} aria-labelledby={`q-${q.id}-title`} className="space-y-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span id={`q-${q.id}-title`} className="font-display text-lg font-semibold text-white">Question {index + 1} <span className="text-slate-500">of {total}</span></span>
        <span className="chip">{TYPE_LABEL[q.type]}</span>
        <span className="chip border-dps-gold/30 text-dps-gold">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
        {q.optional && <span className="chip">Optional</span>}
      </header>

      <div className="glass p-5">
        {q.title && <h2 className="mb-2 text-xl font-semibold">{q.title}</h2>}
        <p className={cx('whitespace-pre-line text-[15px] leading-relaxed text-slate-200', restrict && 'no-select')}>{q.prompt}</p>
      </div>

      {q.type === 'mcq' && (
        <fieldset className="grid gap-2.5 sm:grid-cols-2">
          <legend className="sr-only">Choose one answer</legend>
          {q.options.map((o, i) => {
            const checked = value === o.id
            return (
              <label key={o.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition focus-within:outline focus-within:outline-[3px] focus-within:outline-dps-green focus-within:outline-offset-2', checked ? 'border-dps-neon/60 bg-dps-green/10 ring-1 ring-dps-neon/40' : 'border-white/10 bg-white/[0.02] hover:border-white/25')}>
                <input type="radio" name={`q-${q.id}`} value={o.id} checked={checked} onChange={() => onChange(o.id)} className="sr-only" />
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-sm font-semibold', checked ? 'border-dps-neon bg-dps-green text-white' : 'border-white/15 text-slate-300')} aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-sans text-[15px] text-slate-100">{o.text}</span>
                {checked && <CheckCircle2 size={16} className="ml-auto text-dps-neon" aria-label="Selected" />}
              </label>
            )
          })}
        </fieldset>
      )}

      {q.type === 'short' && (
        <div>
          <label htmlFor={`a-${q.id}`} className="label">Your answer</label>
          <input id={`a-${q.id}`} className="input" value={value || ''} maxLength={q.maxLength || 300} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck />
          <p className="hint text-right">{(value || '').length}/{q.maxLength || 300}</p>
        </div>
      )}

      {q.type === 'long' && (
        <div>
          <label htmlFor={`a-${q.id}`} className="label">Your answer</label>
          <textarea id={`a-${q.id}`} className="input min-h-[240px] resize-y leading-relaxed" value={value || ''} onChange={(e) => onChange(e.target.value)} spellCheck />
          <p className="hint text-right">{words} word{words === 1 ? '' : 's'}{q.minWords ? ` (aim for at least ${q.minWords})` : ''}</p>
        </div>
      )}

      {q.type === 'code' && (
        <CodeEditorPanel
          answer={value}
          onAnswerChange={onChange}
          languages={q.languages}
          starterCode={q.starterCode}
          visibleTests={q.visibleTests}
          hiddenTestCount={q.hiddenTestCount}
          allowRun={exam?.settings?.codeExecution !== false}
          allowSubmit={exam?.settings?.codeExecution !== false}
          restrictClipboard={restrict}
          runContext={{ examId: exam?.id, questionId: q.id, question: q }}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          height={400}
        />
      )}

      {q.type === 'upload' && (
        <div>
          {value?.fileName ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dps-green/40 bg-dps-green/10 p-4 text-sm">
              <span className="flex items-center gap-2 text-dps-neon"><CheckCircle2 size={16} aria-hidden="true" /> Uploaded {value.fileName} ({formatBytes(value.size)})</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Replace file</button>
            </div>
          ) : (
            <UploadBox accept={q.accept} maxSizeMB={q.maxSizeMB || 10} onFiles={upload} disabled={uploading} hint={`Allowed: ${q.accept || 'any'} | up to ${q.maxSizeMB || 10} MB`} />
          )}
          {uploading && <p className="mt-2 flex items-center gap-2 text-sm text-sky-300"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Uploading {progress}%</p>}
          {uploadError && <p className="error-text" role="alert">{uploadError}</p>}
        </div>
      )}
    </m.article>
  )
}
