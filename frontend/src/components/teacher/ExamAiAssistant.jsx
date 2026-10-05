import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import GlassCard from '../common/GlassCard'
import { ErrorNote } from '../common/Feedback'
import api from '../../services/api'
import { aiQuestionToEditor } from '../../services/examAiDraft'

const questionTypes = [['mcq', 'MCQ'], ['short', 'Short answer'], ['long', 'Long answer'], ['code', 'Practical']]
export default function ExamAiAssistant({ examClass, subject, onApply, onBusy, disabled }) {
  const [status, setStatus] = useState(null), [checking, setChecking] = useState(false)
  const [mode, setMode] = useState('generate'), [topic, setTopic] = useState('')
  const [types, setTypes] = useState(['mcq']), [count, setCount] = useState(4), [language, setLanguage] = useState('python')
  const [source, setSource] = useState(''), [sourceInfo, setSourceInfo] = useState(null), [chunk, setChunk] = useState(0)
  const [handouts, setHandouts] = useState([]), [handoutId, setHandoutId] = useState(''), [file, setFile] = useState(null)
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [handoutError, setHandoutError] = useState('')
  const [preview, setPreview] = useState(null), [reviewed, setReviewed] = useState(false)
  useEffect(() => { onBusy?.(!!busy); return () => onBusy?.(false) }, [busy, onBusy])
  const check = async () => {
    setChecking(true)
    try { setStatus(await api.getExamAiStatus()) }
    catch (e) { setStatus({ ready: false, message: e.message }) }
    finally { setChecking(false) }
  }
  useEffect(() => {
    check()
    api.getHandouts().then(setHandouts).catch(e => setHandoutError(e.message))
  }, [])
  const extract = async () => {
    setError(''); setBusy('extract')
    try {
      let p = { handoutId }
      if (file) { p = new FormData(); p.append('file', file) }
      else if (!handoutId) throw new Error('Choose a PDF/TXT file or one of your handouts first.')
      const r = await api.extractExamSource(p)
      setSourceInfo(r); setChunk(0); setSource(r.chunks[0].text); setPreview(null); setReviewed(false)
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }
  const generate = async () => {
    setError(''); setPreview(null); setReviewed(false)
    if (!types.length) return setError('Choose at least one question type.')
    if (mode === 'generate' && (!Number.isInteger(Number(count)) || count < types.length || count > 8)) return setError('Choose 1 to 8 questions, with at least one per selected type.')
    if (mode === 'generate' && !topic.trim() && !source.trim()) return setError('Describe the exam or add source text first.')
    if (mode === 'import' && !source.trim()) return setError('Extract or paste the question paper text first.')
    if (source.length > 12000) return setError('Select a smaller source section: the limit is 12,000 characters.')
    setBusy('generate')
    try {
      setPreview(await api.generateExamDraft({ mode, className: examClass, subject, topic,
        ...(mode === 'generate' ? { questionCount: Number(count) } : {}), questionTypes: types,
        ...(types.includes('code') ? { language } : {}), sourceText: source }))
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }
  return <GlassCard className="space-y-4 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="section-title flex items-center gap-2"><Sparkles size={18} aria-hidden="true" /> Exam assistant</h2>
        <p className="mt-1 text-sm text-slate-400">Describe the exam, use a handout, or import a paper with its answer key. Review everything before adding it.</p></div>
      <button className="btn btn-ghost btn-sm" type="button" disabled={checking || !!busy} onClick={check}><RefreshCw size={14} aria-hidden="true" /> Check AI connection</button>
    </div>
    <p role="status" className="text-sm text-slate-400">{checking ? 'Checking the local AI…' : status?.message || 'Checking the local AI…'}</p>
    <fieldset disabled={disabled || !!busy} className="space-y-4">
      <legend className="sr-only">Generate or import questions</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" name="ai-mode" checked={mode === 'generate'} onChange={() => { setMode('generate'); setPreview(null) }} /> Generate new questions</label>
        <label className="flex items-center gap-2"><input type="radio" name="ai-mode" checked={mode === 'import'} onChange={() => { setMode('import'); setPreview(null) }} /> Import existing questions</label>
      </div>
      <label className="block"><span className="label">What is the exam about?</span><textarea className="input min-h-[80px]" maxLength={1200} value={topic} onChange={e => setTopic(e.target.value)} placeholder="For example: Class XI Python functions. Include two MCQs and two practical questions at medium difficulty." /></label>
      <details className="rounded-xl border border-white/10 p-3" open={mode === 'import' || undefined}>
        <summary className="cursor-pointer text-sm font-medium">Use a handout or PDF question paper</summary>
        <div className="mt-4 space-y-3">
          <label className="block"><span className="label">PDF or TXT file (up to 5 MB)</span><input type="file" accept=".pdf,.txt" className="input" onChange={e => { setFile(e.target.files?.[0] || null); setHandoutId('') }} /></label>
          <label className="block"><span className="label">Or choose one of your handouts</span><select className="input" value={handoutId} onChange={e => { setHandoutId(e.target.value); setFile(null) }}><option value="">Choose a handout</option>{handouts.filter(h => h.class === examClass && (/pdf|text\/plain/i.test(h.file_type) || /\.(pdf|txt)$/i.test(h.fileName))).map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
          {handoutError && <p className="text-sm text-slate-400">Handouts could not load: {handoutError} You can still upload a file or paste text.</p>}
          <button className="btn btn-ghost btn-sm" type="button" onClick={extract}><FileText size={14} aria-hidden="true" /> Read source text</button>
          <p className="hint">Files are read for this request. This tool does not save a new handout. Scanned PDFs need OCR first.</p>
        </div>
      </details>
      {sourceInfo?.chunks.length > 1 && <label className="block"><span className="label">Source section</span><select className="input" value={chunk} onChange={e => { const n = Number(e.target.value); setChunk(n); setSource(sourceInfo.chunks[n].text); setPreview(null); setReviewed(false) }}>{sourceInfo.chunks.map((s, i) => <option key={i} value={i}>Section {i + 1} of {sourceInfo.chunks.length} · Pages {s.pages.join(', ')}</option>)}</select></label>}
      {sourceInfo?.warnings.length > 0 && <ul className="list-disc space-y-1 pl-5 text-xs text-slate-400">{sourceInfo.warnings.map((s, i) => <li key={i}>{s}</li>)}</ul>}
      <label className="block"><span className="label">Source text {mode === 'generate' ? '(optional)' : '(required)'}</span><textarea className="input min-h-[140px]" value={source} onChange={e => { setSource(e.target.value); setPreview(null); setReviewed(false) }} placeholder="Paste handout text, or a question paper and its answers. Keep [Page 1] labels if you want page references." /><span className="hint">{source.length.toLocaleString()} / 12,000 characters. Check columns, equations and code indentation.</span></label>
      <fieldset><legend className="label">Question types</legend><div className="flex flex-wrap gap-4 text-sm">{questionTypes.map(([type, label]) => <label className="flex items-center gap-2" key={type}><input type="checkbox" checked={types.includes(type)} onChange={e => setTypes(e.target.checked ? [...types, type] : types.filter(x => x !== type))} />{label}</label>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === 'generate' && <label className="block"><span className="label">Number of questions</span><input className="input" type="number" min={Math.max(1, types.length)} max="8" value={count} onChange={e => setCount(e.target.value)} /></label>}
        {types.includes('code') && <label className="block"><span className="label">Practical language</span><select className="input" value={language} onChange={e => setLanguage(e.target.value)}>{[['python','Python'],['java','Java'],['cpp','C++'],['c','C'],['javascript','JavaScript']].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
      </div>
      <p className="hint">The local model handles up to 8 questions per request. For longer papers, import each section separately and compare the total against the original.</p>
      <button type="button" className="btn btn-primary" disabled={!status?.ready} onClick={generate}><Sparkles size={16} aria-hidden="true" /> {mode === 'import' ? 'Preview imported questions' : 'Generate question preview'}</button>
    </fieldset>
    {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" aria-hidden="true" />{busy === 'extract' ? 'Reading the source…' : 'Generating the preview. The local model can take up to two minutes…'}</p>}
    {error && <ErrorNote message={error} />}
    {preview && <section aria-label="AI question preview" className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="font-semibold">{preview.title}</h3>
      {preview.warnings.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      {preview.questions.map((q, i) => <article className="rounded-xl border border-white/10 p-3" key={i}>
        <p className="text-xs text-slate-400">Question {i + 1} · {questionTypes.find(([t]) => t === q.type)?.[1]} · {q.marks} marks{q.sourcePages.length ? ' · Pages ' + q.sourcePages.join(', ') : ''}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{q.prompt}</p>
        {q.options.length > 0 && <ol className="mt-2 list-[upper-alpha] space-y-1 pl-5 text-sm">{q.options.map((o, n) => <li key={n}>{o}{n === q.correctAnswer && <span className="ml-2 text-xs font-semibold">Answer key</span>}</li>)}</ol>}
        {q.type === 'mcq' && q.correctAnswer === null && <p className="mt-2 text-xs text-slate-400">No answer key supplied. Choose a key or mark manually.</p>}
        {(q.modelAnswer || q.rubric) && <details className="mt-2 text-sm"><summary className="cursor-pointer">Teacher marking notes</summary><p className="mt-2 whitespace-pre-wrap">{q.modelAnswer}</p><p className="mt-2 whitespace-pre-wrap">{q.rubric}</p></details>}
      </article>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I checked these questions and answer keys against the source.</label>
      <button type="button" className="btn btn-primary" disabled={!reviewed || disabled} onClick={() => { onApply(preview.questions.map(aiQuestionToEditor), preview.title); setPreview(null); setReviewed(false) }}><CheckCircle2 size={16} aria-hidden="true" /> Add reviewed questions</button>
      <p className="hint">This adds editable questions to the builder. Save a draft or publish it when ready. AI marking stays off until you approve each question’s rubric.</p>
    </section>}
  </GlassCard>
}
