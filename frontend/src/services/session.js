// Account credentials stay in httpOnly cookies; this module holds display data only.
const STUDENT_KEY = 'dps.student.session'
let account = { ready: false, student: null, teacher: null, csrfToken: null, progress: { courses: {}, games: {}, mocks: [], customTests: [] }, syncError: '' }
const listeners = new Set()
export const getAccountState = () => account
export const subscribeAccounts = fn => { listeners.add(fn); return () => listeners.delete(fn) }
export function updateAccount(patch) { account = { ...account, ...patch }; listeners.forEach(fn => fn()); window.dispatchEvent(new Event('account-auth-change')) }
export const getStudentAccount = () => account.student
export const getCsrfToken = () => account.csrfToken
export const getTeacherAuth = () => account.teacher ? { teacher: account.teacher } : null
export const setTeacherAuth = auth => updateAccount({ teacher: auth.teacher, student: null, csrfToken: auth.csrfToken, ready: true })
export const clearTeacherAuth = () => updateAccount({ teacher: null, csrfToken: null })
// Kept as a compatibility export for old presentation code; no teacher token is issued.
export const getTeacherToken = () => null
export const getStudentSession = () => { try { return JSON.parse(sessionStorage.getItem(STUDENT_KEY)) } catch { return null } }
export const setStudentSession = value => { try { sessionStorage.setItem(STUDENT_KEY, JSON.stringify(value)) } catch { /* storage blocked */ } }
export const clearStudentSession = () => { try { sessionStorage.removeItem(STUDENT_KEY) } catch { /* storage blocked */ } }
export function clearLegacyTeacherToken() { try { localStorage.removeItem('dps.teacher.auth') } catch { /* storage blocked */ } }
