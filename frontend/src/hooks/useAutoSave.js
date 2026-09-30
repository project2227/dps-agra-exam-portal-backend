import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Debounced autosave with a local backup.
 * status: 'saved' | 'unsaved' | 'saving' | 'error'
 */
export default function useAutoSave({ data, save, delay = 1500, storageKey, enabled = true }) {
  const [status, setStatus] = useState('saved')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const latest = useRef(data)
  latest.current = data
  const saveRef = useRef(save)
  saveRef.current = save
  const inflight = useRef(false)
  const pending = useRef(false)
  const first = useRef(true)

  const saveNow = useCallback(async () => {
    if (inflight.current) {
      pending.current = true
      return
    }
    inflight.current = true
    setStatus('saving')
    try {
      await saveRef.current?.(latest.current)
      setStatus('saved')
      setLastSavedAt(new Date())
    } catch {
      setStatus('error')
    } finally {
      inflight.current = false
      if (pending.current) {
        pending.current = false
        saveNow()
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* quota */ }
    }
    if (first.current) {
      first.current = false
      return undefined
    }
    setStatus('unsaved')
    const t = setTimeout(saveNow, delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled])

  // Retry automatically after a failed save.
  useEffect(() => {
    if (status !== 'error') return undefined
    const t = setTimeout(saveNow, 5000)
    return () => clearTimeout(t)
  }, [status, saveNow])

  return { status, lastSavedAt, saveNow }
}

export function loadBackup(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
export function clearBackup(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}
