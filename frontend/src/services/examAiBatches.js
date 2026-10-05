export const AI_TYPE_LABELS = { mcq: 'MCQ', short: 'short answer', long: 'long answer', code: 'practical' }

// A lazy queue has no batch quota and never allocates an array of the requested size.
export function* planAiBatches(types, count) {
  const selected = [...new Set(types)]
  if (!selected.length || selected.some(type => !AI_TYPE_LABELS[type])) throw new Error('Choose at least one question type.')
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Enter a whole number of questions, starting at 1.')
  for (let index = 0; index < count; index++) yield { type: selected[index % selected.length], count: 1, index }
}

const stopped = () => new DOMException('Generation stopped', 'AbortError')
export function waitForAi(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(stopped())
    const finish = () => { signal?.removeEventListener('abort', cancel); resolve() }
    const timer = setTimeout(finish, ms)
    const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(stopped()) }
    signal?.addEventListener('abort', cancel, { once: true })
  })
}
export function sourceFingerprint(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return `${text.length}:${hash >>> 0}`
}
const normalize = prompt => prompt.trim().replace(/\s+/g, ' ').toLowerCase()

export async function generateOneByOne({ types, count, mode, payload, existingQuestions = [], request, onQuestion, onProgress, signal, wait = waitForAi }) {
  const questions = [...existingQuestions], sourceKey = mode === 'import' ? sourceFingerprint(payload.sourceText) : null
  let position = mode === 'import'
    ? questions.reduce((last, q) => q.importSourceKey === sourceKey ? Math.max(last, q.sourceQuestionNumber || 0) : last, 0) + 1
    : questions.length + 1
  let completed = 0
  for (const job of planAiBatches(types, count)) {
    if (signal?.aborted) break
    const label = `${mode === 'import' ? 'Importing' : 'Generating'} question ${job.index + 1} of ${count}${mode === 'generate' ? ' · ' + AI_TYPE_LABELS[job.type] : ''}`
    let duplicates = 0, waits = 0
    for (;;) {
      if (signal?.aborted) return { completed, stopped: true }
      onProgress(label)
      try {
        const result = await request({ ...payload, mode, questionCount: 1,
          questionTypes: mode === 'import' ? [...new Set(types)] : [job.type],
          sequence: { position, previousPrompts: questions.slice(-6).map(q => q.prompt.slice(0, 500)) } })
        if (!Array.isArray(result.questions) || result.questions.length !== 1) throw new Error('The AI did not return one question. Your earlier questions are still here; try again.')
        const question = result.questions[0]
        if (questions.some(q => normalize(q.prompt) === normalize(question.prompt))) {
          if (++duplicates >= 3) throw new Error('The AI repeated an earlier question. Change the topic or source section and try again. Your earlier questions are still here.')
          continue
        }
        const item = mode === 'import' ? { ...question, importSourceKey: sourceKey, sourceQuestionNumber: position } : question
        questions.push(item); onQuestion(item, result); completed++; position++
        break
      } catch (error) {
        if (error.status !== 429 || ++waits > 5) throw error
        onProgress(`${label} · Waiting for the AI to be available. Your questions are saved; you can stop at any time.`)
        try { await wait((error.retryAfter || 60) * 1000, signal) }
        catch (e) { if (e.name === 'AbortError') return { completed, stopped: true }; throw e }
      }
    }
  }
  return { completed, stopped: !!signal?.aborted }
}
