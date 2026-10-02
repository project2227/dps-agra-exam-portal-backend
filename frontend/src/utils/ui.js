export function formatSaveAge(lastSavedAt, now = Date.now()) {
  const time = new Date(lastSavedAt).getTime()
  if (!Number.isFinite(time)) return 'All changes saved'
  const seconds = Math.max(0, Math.floor((now - time) / 1000))
  if (seconds < 2) return 'Saved just now'
  if (seconds < 60) return `Saved ${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  return `Saved ${minutes} min ago`
}
export function checkInCountdown(startsAt, now = Date.now()) {
  const start = new Date(startsAt).getTime()
  if (!Number.isFinite(start)) return 'Ask your teacher for the check-in time.'
  const opening = start - 30 * 60 * 1000
  const seconds = Math.max(0, Math.ceil((opening - now) / 1000))
  if (!seconds) return now < start ? 'Check-in is open. Questions unlock at the scheduled start.' : 'The scheduled start time has arrived.'
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remaining = seconds % 60
  return `Check-in opens in ${hours ? `${hours}h ` : ''}${minutes}m ${remaining}s`
}
