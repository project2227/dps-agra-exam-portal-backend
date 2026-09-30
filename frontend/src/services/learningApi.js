import { API_BASE_URL } from '../config'
const KEY = 'dps.learning.profile'
export const getLearningAuth = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null } }
export const saveLearningAuth = data => { sessionStorage.setItem(KEY, JSON.stringify(data)); window.dispatchEvent(new Event('learning-auth-change')) }
export const clearLearningAuth = () => { sessionStorage.removeItem(KEY); window.dispatchEvent(new Event('learning-auth-change')) }

export async function learningApi(path, { method = 'GET', body, teacher = false } = {}) {
  const token = teacher
    ? (() => { try { return JSON.parse(localStorage.getItem('dps.teacher.auth'))?.token } catch { return null } })()
    : getLearningAuth()?.token
  const response = await fetch(`${API_BASE_URL}/api/learning${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(26000),
  })
  let result = {}
  try { result = await response.json() } catch { /* empty response */ }
  if (!response.ok) {
    const details = result.details?.map(d => `${d.path}: ${d.message}`).join('; ')
    const error = new Error(details || result.error || `Server returned ${response.status}`)
    error.status = response.status
    throw error
  }
  return result
}
