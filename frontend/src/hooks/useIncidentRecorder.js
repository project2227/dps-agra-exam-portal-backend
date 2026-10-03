import { useCallback, useEffect, useRef, useState } from 'react';
import { releaseRequest } from '../services/releaseApi';
import { IncidentCapture } from '../services/incidentCapture';
const TRIGGERS = {
  tab_hidden: 'TAB_SWITCH',
  window_blur: 'WINDOW_BLUR',
  fullscreen_exit: 'FULLSCREEN_EXIT',
};
const upload = {
  open: (body) =>
    releaseRequest('/student/incidents', {
      role: 'student',
      method: 'POST',
      body,
    }),
  chunk: (id, sequence, part) => {
    const body = new FormData();
    body.append('chunk', part, 'screen.webm');
    return releaseRequest('/student/incidents/' + id + '/chunks/' + sequence, {
      role: 'student',
      method: 'POST',
      body,
    });
  },
  finish: (id, reason) =>
    releaseRequest('/student/incidents/' + id + '/finish', {
      role: 'student',
      method: 'POST',
      body: { reason },
    }),
};
export function useIncidentRecorder(screen, active, consented) {
  const [state, setState] = useState({ status: 'idle', message: '' }),
    engine = useRef(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (
      active &&
      consented &&
      screen?.getVideoTracks().some((t) => t.readyState === 'live')
    )
      engine.current = new IncidentCapture({
        screen,
        upload,
        notify: (next) => {
          if (mounted.current) setState(next);
        },
      });
    return () => {
      mounted.current = false;
      engine.current?.close(active ? 'screen-sharing-stopped' : 'exam-ended');
      engine.current = null;
    };
  }, [screen, active, consented]);
  const finish = useCallback(
    (reason) => engine.current?.finish(reason) || Promise.resolve(),
    [],
  );
  const report = useCallback(
    (type) => {
      if (['fullscreen_enter', 'window_focus', 'tab_visible'].includes(type)) {
        if (
          document.fullscreenElement &&
          document.visibilityState === 'visible' &&
          document.hasFocus()
        )
          finish();
        return;
      }
      const trigger = TRIGGERS[type];
      if (!trigger || !active) return;
      if (!engine.current) {
        setState({
          status: 'unavailable',
          message:
            'Screen incident logged. Recording requires your screen-sharing and incident-recording consent.',
        });
        return;
      }
      engine.current.begin({ triggerType: trigger });
    },
    [active, finish],
  );
  return { ...state, report, finish };
}
