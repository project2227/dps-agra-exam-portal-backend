import { getTeacherAuth } from './session'

// This is editable teacher work, never a session credential or exam password.
export function teacherWorkspaceKey(kind, examId = '') {
  const teacherId = getTeacherAuth()?.teacher?.id
  return teacherId ? `dps.teacher.exam-workspace.v1.${teacherId}.${kind}.${examId || 'new'}` : null
}
export function readExamWorkspace(key) {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw.length > 2_000_000) return null
    const value = JSON.parse(raw)
    return value?.version === 1 && value.data && typeof value.data === 'object' ? value.data : null
  } catch { return null }
}
export function writeExamWorkspace(key, data) {
  if (!key) return true
  try {
    const raw = JSON.stringify({ version: 1, data })
    if (raw.length > 2_000_000) return false
    localStorage.setItem(key, raw)
    return true
  } catch { return false }
}
export function moveExamWorkspace(from, to) {
  const data = readExamWorkspace(from)
  if (data && writeExamWorkspace(to, data)) {
    try { if (from !== to) localStorage.removeItem(from) } catch { /* saved copy remains */ }
  }
}
