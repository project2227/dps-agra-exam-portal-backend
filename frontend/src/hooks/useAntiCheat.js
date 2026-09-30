import { useEffect, useRef } from 'react'

/**
 * Listens for exam-integrity events and reports them through onEvent(type, details).
 * Nothing here is hidden from the student: the exam room shows a monitoring
 * indicator and a warning banner for every flagged event.
 *
 * settings: { tabDetection, copyPasteRestriction }
 */
export default function useAntiCheat({ active, examId, settings = {}, onEvent }) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const { tabDetection = true, copyPasteRestriction = false } = settings

  useEffect(() => {
    if (!active) return undefined
    const emit = (type, details = {}) => onEventRef.current?.(type, details)
    const cleanups = []
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts)
      cleanups.push(() => target.removeEventListener(type, fn, opts))
    }

    // 1. Tab switch + window focus
    if (tabDetection) {
      on(document, 'visibilitychange', () => emit(document.visibilityState === 'hidden' ? 'tab_hidden' : 'tab_visible'))
      on(window, 'blur', () => {
        // Clicking into the IDE's preview iframe also blurs the window; ignore that case.
        setTimeout(() => {
          if (document.activeElement?.tagName === 'IFRAME') return
          if (!document.hasFocus()) emit('window_blur')
        }, 0)
      })
      on(window, 'focus', () => emit('window_focus'))
    }

    // 2. Fullscreen exit
    on(document, 'fullscreenchange', () => emit(document.fullscreenElement ? 'fullscreen_enter' : 'fullscreen_exit'))

    // 3. Copy / cut / paste (capture phase so the code editor never receives blocked pastes)
    ;['copy', 'cut', 'paste'].forEach((type) =>
      on(window, type, (e) => {
        if (copyPasteRestriction) {
          e.preventDefault()
          e.stopImmediatePropagation()
        }
        emit(type, { blocked: copyPasteRestriction })
      }, true),
    )

    // 4. Right-click inside the exam room
    on(window, 'contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      emit('right_click')
    }, true)

    // 5. DevTools / view-source shortcuts and Print Screen (flag only)
    on(window, 'keydown', (e) => {
      const k = e.key?.toLowerCase()
      const combo = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) || ((e.ctrlKey || e.metaKey) && k === 'u')
      if (combo) {
        e.preventDefault()
        emit('devtools_shortcut', { key: `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}` })
      }
    }, true)
    on(window, 'keyup', (e) => {
      if (e.key === 'PrintScreen') emit('print_screen')
    })

    // 6. DevTools heuristic: docked devtools shrink the viewport. Flags only on change.
    let devtoolsOpen = false
    const devtoolsTimer = setInterval(() => {
      const open = window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 240
      if (open && !devtoolsOpen) emit('devtools_suspected', { outer: `${window.outerWidth}x${window.outerHeight}`, inner: `${window.innerWidth}x${window.innerHeight}` })
      devtoolsOpen = open
    }, 2500)
    cleanups.push(() => clearInterval(devtoolsTimer))

    // 7. Same exam open in another tab of this browser (backend also locks sessions)
    if ('BroadcastChannel' in window && examId) {
      const tabId = Math.random().toString(36).slice(2)
      const bc = new BroadcastChannel(`dps-exam-${examId}`)
      bc.onmessage = (m) => {
        if (m.data?.tabId === tabId) return
        if (m.data?.type === 'hello') bc.postMessage({ type: 'here', tabId })
        emit('multiple_tabs')
      }
      bc.postMessage({ type: 'hello', tabId })
      cleanups.push(() => bc.close())
    }

    return () => cleanups.forEach((fn) => fn())
  }, [active, examId, tabDetection, copyPasteRestriction])
}
