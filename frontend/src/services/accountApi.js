import { API_BASE_URL } from '../config.js'
import { getAccountState, getCsrfToken, updateAccount, clearLegacyTeacherToken } from './session.js'
export async function accountApi(path, { method = 'GET', body, download = false } = {}) {
 const response = await fetch(API_BASE_URL + '/api/accounts' + path, { method, credentials: 'include', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw Object.assign(new Error(result.details?.map(x => x.message).join(' ') || result.error || 'Please try again.'), { status: response.status, details: result })
 if (download) { const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'my-dps-data.json'; a.click(); URL.revokeObjectURL(url) }
 return result
}
export async function refreshAccount() {
 clearLegacyTeacherToken()
 try { const result = await accountApi('/session'); let progress={courses:{},games:{},mocks:[],customTests:[]}; if(result.student&&!result.student.mustChangePassword){const p=await accountApi('/student/learning');progress=p.progress} updateAccount({...result,progress,ready:true}) }
 catch { updateAccount({ ready: true, teacher: null, student: null }) }
}
export async function signOutAccount() { await accountApi('/logout', { method: 'POST' }); updateAccount({ student: null, teacher: null, csrfToken: null, progress: { courses: {}, games: {}, mocks: [], customTests: [] } }) }
let pending = false, timer
async function flushProgress() { if (!pending || !getAccountState().student) return; pending = false; try { const result = await accountApi('/student/learning', { method: 'PUT', body: getAccountState().progress }); updateAccount({ progress: mergeProgress(result.progress, getAccountState().progress), syncError: '' }) } catch { pending = true; updateAccount({ syncError: 'Progress is waiting to sync. Check your connection.' }); clearTimeout(timer); timer = setTimeout(flushProgress, 10000) } }
function mergeProgress(a, b) { const out = { courses: { ...a.courses }, games: { ...a.games }, mocks: [], customTests: [] }; for (const [id, value] of Object.entries(b.courses || {})) { const old = out.courses[id] || {}; out.courses[id] = { ...old, ...value, completed: [...new Set([...(old.completed || []), ...(value.completed || [])])], ...(old.score != null || value.score != null ? { score: Math.max(old.score || 0, value.score || 0) } : {}) } } for (const [id, score] of Object.entries(b.games || {})) out.games[id] = Math.max(score, out.games[id] || 0); for (const key of ['mocks', 'customTests']) { const seen = new Set(); out[key] = [...(b[key] || []), ...(a[key] || [])].filter(x => { const id = x.id || JSON.stringify(x); if (seen.has(id)) return false; seen.add(id); return true }).slice(0, 50) } return out }
export function syncLearning(delta) { if (!getAccountState().student || getAccountState().student.mustChangePassword) return false; updateAccount({ progress: mergeProgress(getAccountState().progress, delta) }); pending = true; clearTimeout(timer); timer = setTimeout(flushProgress, 500); return true }
if(typeof window !== 'undefined') window.addEventListener('online', flushProgress)
const read = key => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }
const normalizeResult = r => ({ id: String(r.id || r.at || r.date || '').slice(0, 80), score: Math.min(100, Math.max(0, Number(r.score) || 0)), date: String(r.date || r.at || '').slice(0, 40), ...(r.language ? { language: String(r.language).slice(0, 20) } : {}) })
export function deviceLearningProgress() {
 const courses = {}; for (const [id, p] of Object.entries(read('dps.selfstudy.progress.v2') || {})) if (/^[a-z0-9_-]{1,40}$/.test(id)) courses[id] = { completed: (p.completed || []).filter(Number.isInteger).filter(n => n >= 0 && n <= 100).slice(0, 100), ...(Number.isFinite(p.score ?? p.bestScore) ? { score: Math.min(100, Math.max(0, p.score ?? p.bestScore)) } : {}) }
 const games = {}; for (const [id, value] of Object.entries(read('dps.game.bests') || {})) if (/^[a-z0-9_-]{1,40}$/.test(id) && Number.isFinite(value)) games[id] = Math.min(100000, Math.max(0, value))
 for (const id of ['circuit', 'memory', 'stack']) { const value = Number(read('dps.arcade.' + id)); if (value) games[id] = Math.min(100000, Math.max(0, value)) }
 return { courses, games, mocks: (read('dps.mock.history') || []).slice(0, 50).map(normalizeResult), customTests: (read('dps.test.custom.v1') || []).slice(0, 50).map(normalizeResult) }
}
export const getGameBest = id => getAccountState().student ? getAccountState().progress.games[id] || 0 : Number(read('dps.arcade.' + id) || 0)
export function saveArcadeScore(id, score) { if (!syncLearning({ games: { [id]: score } })) { try { localStorage.setItem('dps.arcade.' + id, String(score)) } catch { /* blocked */ } } }
