import { CheckCircle2, EyeOff, XCircle } from 'lucide-react'
import { cx } from '../../utils/format'

export default function TestCasePanel({ tests = [], hiddenTestCount = 0, results }) {
  const byId = Object.fromEntries((results?.results || []).map((r, i) => [String(r.id ?? i), r]))
  const hiddenResults = (results?.results || []).filter((r) => r.hidden)
  const hiddenPassed = hiddenResults.filter((r) => r.passed).length

  return (
    <div className="h-full overflow-auto p-3 text-sm">
      {results?.manualReview && (
        <div className="mb-3 rounded-lg border border-sky-400/40 bg-sky-500/10 p-3 text-sky-200" role="status">
          <strong>Code saved for teacher review.</strong>
          <p className="mt-1 text-xs">No automatic marks were assigned. Your teacher can assess this submission after the exam.</p>
        </div>
      )}
      {results && !results.manualReview && (
        <div className={cx('mb-3 flex items-center gap-2 rounded-lg border px-3 py-2', results.passed === results.total ? 'border-dps-green/40 bg-dps-green/10 text-dps-neon' : 'border-dps-orange/40 bg-dps-orange/10 text-orange-200')}>
          {results.passed === results.total ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
          <span className="font-medium">{results.passed} of {results.total} test cases passed</span>
        </div>
      )}
      {tests.length === 0 && !hiddenTestCount && <p className="text-slate-500">This question has no automatic test cases. Your teacher will check it.</p>}
      <ul className="space-y-2">
        {tests.map((t, i) => {
          const r = byId[String(t.id ?? i)]
          return (
            <li key={t.id || i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-white">Sample test {i + 1}</span>
                {r && (
                  <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', r.passed ? 'text-dps-neon' : 'text-red-300')}>
                    {r.passed ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />} {r.passed ? 'Passed' : 'Failed'}
                  </span>
                )}
              </div>
              <div className="grid gap-2 font-mono text-xs sm:grid-cols-3">
                <div><p className="mb-1 font-sans text-slate-500">Input</p><pre className="whitespace-pre-wrap rounded bg-navy-950/70 p-2 text-slate-200">{t.input || '(none)'}</pre></div>
                <div><p className="mb-1 font-sans text-slate-500">Expected</p><pre className="whitespace-pre-wrap rounded bg-navy-950/70 p-2 text-slate-200">{t.expected}</pre></div>
                <div><p className="mb-1 font-sans text-slate-500">Your output</p><pre className="whitespace-pre-wrap rounded bg-navy-950/70 p-2 text-slate-200">{r ? r.actual ?? r.stdout ?? '' : 'Not run yet'}</pre></div>
              </div>
            </li>
          )
        })}
      </ul>
      {hiddenTestCount > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <EyeOff size={13} aria-hidden="true" />
          {hiddenResults.length ? `Hidden tests: ${hiddenPassed} of ${hiddenResults.length} passed.` : `${hiddenTestCount} hidden test${hiddenTestCount > 1 ? 's' : ''} run when you press Submit code.`}
        </p>
      )}
    </div>
  )
}
