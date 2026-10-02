import { getCsrfToken } from './session'
import { io } from 'socket.io-client'
import { DEMO_MODE, SOCKET_PATH, SOCKET_URL } from '../config'
import { demoMonitorTick } from './mockData'

/*
 * Socket.IO event names shared with the backend. See README > Realtime events.
 */
export const EVENTS = {
  // student -> server
  STUDENT_JOIN_ROOM: 'student:joinExamRoom',
  STUDENT_PROGRESS: 'student:questionChange',
  STUDENT_ANSWER_UPDATE: 'student:answerUpdate',
  STUDENT_CODE_UPDATE: 'student:codeUpdate',
  STUDENT_SNAPSHOT: 'unsupported:studentSnapshot',
  STUDENT_HEARTBEAT: 'student:heartbeat',
  PROCTOR_EVENT: 'student:proctorEvent',
  // server -> student
  STUDENT_WARNING: 'teacher:warningSent',
  SESSION_CONFLICT: 'teacher:lockExam',
  EXAM_FORCE_SUBMIT: 'teacher:lockExam',
  EXAM_TIME_UPDATE: 'exam:studentStatusUpdate',
  // teacher -> server
  TEACHER_JOIN_MONITOR: 'teacher:joinMonitorRoom',
  TEACHER_LEAVE_MONITOR: 'unsupported:leaveMonitor',
  TEACHER_WARN_STUDENT: 'teacher:sendWarning',
  // server -> teacher
  MONITOR_STUDENT_JOINED: 'exam:studentJoined',
  MONITOR_STUDENT_UPDATE: 'exam:studentStatusUpdate',
  MONITOR_STUDENT_LEFT: 'exam:studentDisconnected',
  MONITOR_PROCTOR_EVENT: 'exam:proctorFlag',
  MONITOR_SNAPSHOT: 'unsupported:monitorSnapshot',
  // WebRTC signalling (both directions, relayed by server)
  RTC_REQUEST: 'teacher:requestMediaPreview',
  RTC_SIGNAL: 'webrtc:offer',
  RTC_STOP: 'webrtc:endStream',
}

let socket = null
let socketRole = null
let socketToken = null

export function getSocket({ role, token }) {
  const identityKey = role === 'teacher' ? getCsrfToken() : token
  // Rejoining another exam or signing in again changes the token. Reusing a
  // socket authenticated with the old session leaves both media feeds blank.
  if (socket && socketRole === role && socketToken === identityKey) return socket
  disconnectSocket()
  socketRole = role
  socketToken = identityKey
  socket = DEMO_MODE
    ? createDemoSocket(role)
    : io(SOCKET_URL, {
        path: SOCKET_PATH,
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: { token, role },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  socketRole = null
  socketToken = null
}

/* ---------------- demo socket: in-memory event emitter ---------------- */
function createDemoSocket(role) {
  const handlers = new Map()
  const fire = (ev, payload) => handlers.get(ev)?.forEach((fn) => fn(payload))
  let monitorTimer = null

  const s = {
    id: `demo-${role}-${Math.random().toString(36).slice(2, 8)}`,
    connected: true,
    on(ev, fn) {
      if (!handlers.has(ev)) handlers.set(ev, new Set())
      handlers.get(ev).add(fn)
      if (ev === 'connect') setTimeout(() => fn(), 0)
      return s
    },
    off(ev, fn) {
      if (fn) handlers.get(ev)?.delete(fn)
      else handlers.delete(ev)
      return s
    },
    emit(ev, payload) {
      if (ev === EVENTS.TEACHER_JOIN_MONITOR) {
        clearInterval(monitorTimer)
        monitorTimer = setInterval(() => {
          const tick = demoMonitorTick(payload.examId)
          if (!tick) return
          fire(EVENTS.MONITOR_STUDENT_UPDATE, { sessionId: tick.sessionId, patch: tick.patch })
          if (tick.event) fire(EVENTS.MONITOR_PROCTOR_EVENT, { sessionId: tick.sessionId, event: tick.event })
        }, 1800)
      }
      if (ev === EVENTS.TEACHER_LEAVE_MONITOR) clearInterval(monitorTimer)
      if (ev === EVENTS.TEACHER_WARN_STUDENT) {
        setTimeout(() => fire(EVENTS.MONITOR_PROCTOR_EVENT, {
          sessionId: payload.sessionId,
          event: { type: 'teacher_warning', ts: new Date().toISOString(), details: { message: payload.message } },
        }), 200)
      }
      return s
    },
    connect() { s.connected = true; return s },
    disconnect() { clearInterval(monitorTimer); s.connected = false; handlers.clear() },
  }
  return s
}
