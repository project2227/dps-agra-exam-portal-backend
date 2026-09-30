export const cx = (...parts) => parts.filter(Boolean).join(' ')

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

const toDate = (v) => (v instanceof Date ? v : new Date(v))
export const formatDate = (v) => (v ? dateFmt.format(toDate(v)) : '')
export const formatTime = (v) => (v ? timeFmt.format(toDate(v)).replace(/\b(am|pm)\b/gi, x => x.toUpperCase()) : '')
export const formatDay = (v) => (v ? dayFmt.format(toDate(v)) : '')
export const formatDateTime = (v) => (v ? `${formatDate(v)}, ${formatTime(v)}` : '')

export function relativeTime(v, now = Date.now()) {
  if (!v) return 'never'
  const diff = Math.round((now - toDate(v).getTime()) / 1000)
  const abs = Math.abs(diff)
  const suffix = diff >= 0 ? 'ago' : 'from now'
  if (abs < 10) return diff >= 0 ? 'just now' : 'in a moment'
  if (abs < 60) return `${abs}s ${suffix}`
  if (abs < 3600) return `${Math.round(abs / 60)} min ${suffix}`
  if (abs < 86400) return `${Math.round(abs / 3600)} h ${suffix}`
  return `${Math.round(abs / 86400)} d ${suffix}`
}

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function examStatus(exam, now = Date.now()) {
  if (!exam) return 'unknown'
  if (exam.status === 'draft') return 'draft'
  const start = new Date(exam.startsAt).getTime()
  const end = new Date(exam.endsAt).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'live'
}

export const initials = (name = '') =>
  name.replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

export function uid(prefix = 'id') {
  const rand = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${rand}`
}

// Readable passcode without look-alike characters (no 0/O, 1/I/L).
export function generatePasscode(prefix = 'DPS') {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4)}`
}

// datetime-local <-> ISO helpers (local time)
export function toLocalInput(v) {
  if (!v) return ''
  const d = toDate(v)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}
export const fromLocalInput = (s) => (s ? new Date(s).toISOString() : null)

export function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
