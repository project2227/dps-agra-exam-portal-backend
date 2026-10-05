export const MAX_AI_QUESTIONS = 5
export const AI_TYPE_LABELS = { mcq: 'MCQ', short: 'short answer', long: 'long answer', code: 'practical' }

export function planAiBatches(types, count) {
  const selected = [...new Set(types)]
  if (!selected.length || selected.some(type => !AI_TYPE_LABELS[type])) throw new Error('Choose at least one question type.')
  if (!Number.isInteger(count) || count < selected.length || count > MAX_AI_QUESTIONS) {
    throw new Error('Choose 1 to 5 questions, with at least one per selected type.')
  }
  return selected.map((type, i) => ({ type, count: Math.floor(count / selected.length) + (i < count % selected.length ? 1 : 0) }))
}
