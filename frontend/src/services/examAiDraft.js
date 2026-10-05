import { uid } from '../utils/format'

export function aiQuestionToEditor(q) {
  const options = q.options.map((text, index) => ({ id: String(index), text }))
  const language = q.language || 'python'
  return {
    id: uid('ai-q'), type: q.type, prompt: q.prompt, marks: q.marks,
    title: q.type === 'code' ? q.prompt.slice(0, 100) : '', options,
    correct: q.correctAnswer === null ? '' : String(q.correctAnswer),
    modelAnswer: q.modelAnswer, rubric: q.rubric,
    aiMarking: false, rubricApproved: false,
    languages: [language], starterCode: { [language]: q.starterCode },
    visibleTests: [], hiddenTests: [], sourcePages: q.sourcePages,
  }
}

export function canEditExam(exam, now = Date.now()) {
  return !exam.archived_at && (exam.status === 'draft' || (exam.status === 'upcoming' && Date.parse(exam.startsAt) > now))
}
