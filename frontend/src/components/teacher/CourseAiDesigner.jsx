import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Sparkles, Square } from 'lucide-react'
import api from '../../services/api'
import { generateOneByOne } from '../../services/examAiBatches'
import { ErrorNote } from '../common/Feedback'

export default function CourseAiDesigner({ examClass, language, sourceText, lessons, quiz, disabled, onLesson, onQuiz, onBusy }) {
  const [status, setStatus] = useState(null), [mode, setMode] = useState('lesson'), [topic, setTopic] = useState('')
  const [count, setCount] = useState(3), [section, setSection] = useState(0), [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(''), [error, setError] = useState(''), [stopping, setStopping] = useState(false)
  const controller = useRef(null), mounted = useRef(true)
  const check = async () => { try { setStatus(await api.getExamAiStatus()) } catch (e) { setStatus({ ready: false, message: e.message }) } }
  useEffect(() => { mounted.current = true; check(); return () => { mounted.current = false; controller.current?.abort() } }, [])
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false) }, [busy, onBusy])
  const sections = Math.max(1, Math.ceil(sourceText.length / 10000))
  const selectedSection = Math.min(section, sections - 1)
  const generate = async () => {
    if (controller.current || disabled || busy) return
    setError('')
    if (!topic.trim() && !sourceText.trim()) return setError('Describe the course or add a handout first.')
    if (!Number.isSafeInteger(Number(count)) || Number(count) < 1) return setError('Enter a whole number of items, starting at 1.')
    const run = new AbortController(); controller.current = run; setBusy(true); setStopping(false)
    try {
      const result = await generateOneByOne({ mode: 'generate', types: [mode === 'lesson' ? 'long' : 'mcq'], count: Number(count), signal: run.signal,
        payload: { purpose: mode === 'lesson' ? 'lesson' : 'course-quiz', className: examClass, subject: language, topic,
          sourceText: sourceText.slice(selectedSection * 10000, (selectedSection + 1) * 10000) },
        existingQuestions: mode === 'lesson' ? lessons.filter(l => l.body.trim()).map(l => ({ prompt: l.title })) : quiz.filter(q => q.prompt.trim()),
        request: p => api.generateExamDraft(p), onProgress: p => { if (mounted.current) setProgress(p.replace('question', mode === 'lesson' ? 'lesson' : 'quiz item')) },
        onQuestion: (q, response) => {
          if (!mounted.current) return
          if (mode === 'lesson') onLesson({ title: q.prompt.slice(0, 140), body: q.modelAnswer }, response.title)
          else onQuiz({ prompt: q.prompt, options: q.options, answerIndex: q.correctAnswer }, response.title)
        } })
      if (mounted.current) setProgress(`${result.stopped ? 'Stopped.' : 'Finished.'} ${result.completed} ${mode === 'lesson' ? 'lesson' : 'quiz item'}${result.completed === 1 ? '' : 's'} added to your editable course.`)
    } catch (e) { if (mounted.current) setError(e.message) }
    finally { controller.current = null; if (mounted.current) { setBusy(false); setStopping(false) } }
  }
  return <section className="mt-5 space-y-4 rounded-xl border border-dps-green/30 p-4" aria-label="AI course designer">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><Sparkles size={18} aria-hidden="true" /> AI course designer</h3><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={check}><RefreshCw size={14} aria-hidden="true" /> Check AI connection</button></div>
    <p className="text-sm text-slate-400">Your PC model drafts one lesson or quiz item at a time. Lessons include an explanation, a worked example and a practice task. Edit and check every item before publishing.</p>
    <p role="status" className="text-sm">{status?.message || 'Checking the local AI…'}</p>
    <fieldset disabled={disabled || busy} className="space-y-3"><legend className="sr-only">Course design options</legend>
      <label className="block"><span className="label">Create</span><select className="input" value={mode} onChange={e => setMode(e.target.value)}><option value="lesson">Lessons</option><option value="quiz">Course quiz questions</option></select></label>
      <label className="block"><span className="label">Course design brief</span><textarea className="input min-h-[90px]" maxLength={1200} value={topic} onChange={e => setTopic(e.target.value)} placeholder="For example: Class IX Python functions, from first principles to writing a reusable function. Include examples and practice." /></label>
      <label className="block"><span className="label">Number of items</span><input className="input" type="number" min="1" step="1" value={count} onChange={e => setCount(e.target.value)} /></label>
      {sections > 1 && <label className="block"><span className="label">Handout section for AI</span><select className="input" value={selectedSection} onChange={e => setSection(Number(e.target.value))}>{Array.from({ length: sections }, (_, i) => <option key={i} value={i}>Section {i + 1} of {sections}</option>)}</select></label>}
      <p className="hint">Uses the handout text above. Completed items stay in the course editor as they arrive, including after a failed request or refresh. Save a private draft to keep them on the server.</p>
      <button type="button" className="btn btn-primary" disabled={!status?.ready} onClick={generate}><Sparkles size={16} aria-hidden="true" /> {mode === 'lesson' ? 'Design lessons' : 'Generate course quiz'}</button>
    </fieldset>
    {progress && <p role="status" className="flex items-center gap-2 text-sm">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{progress}</p>}
    {busy && <button type="button" className="btn btn-ghost btn-sm" disabled={stopping} onClick={() => { controller.current?.abort(); setStopping(true) }}><Square size={14} aria-hidden="true" />{stopping ? 'Stopping after the current item…' : 'Stop course design'}</button>}
    {error && <ErrorNote message={error} />}
  </section>
}
