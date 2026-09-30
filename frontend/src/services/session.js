// Teacher auth lives in localStorage (stays signed in on the staff laptop).
// Student exam sessions live in sessionStorage so they vanish when the lab tab closes.
const TEACHER_KEY = 'dps.teacher.auth'
const STUDENT_KEY = 'dps.student.session'

const read = (store, key) => {
  try { return JSON.parse(store.getItem(key)) } catch { return null }
}
const write = (store, key, value) => {
  try { value == null ? store.removeItem(key) : store.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
}

export const getTeacherAuth = () => read(localStorage, TEACHER_KEY)
export const setTeacherAuth = (auth) => write(localStorage, TEACHER_KEY, auth)
export const clearTeacherAuth = () => write(localStorage, TEACHER_KEY, null)
export const getTeacherToken = () => getTeacherAuth()?.token || null

export const getStudentSession = () => read(sessionStorage, STUDENT_KEY)
export const setStudentSession = (session) => write(sessionStorage, STUDENT_KEY, session)
export const clearStudentSession = () => write(sessionStorage, STUDENT_KEY, null)
