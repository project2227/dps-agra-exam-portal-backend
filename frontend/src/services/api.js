import { createLiveApi } from './liveApi'
import axios from 'axios'
import { API_BASE_URL, DEMO_MODE } from '../config'
import { getStudentSession, getTeacherToken, getCsrfToken } from './session'
import { examStatus, uid } from '../utils/format'
import * as mock from './mockData'

/* ------------------------------------------------------------------ *
 * HTTP client for the Render backend.
 * Teacher calls send the teacher JWT; student calls send the exam
 * session token issued by POST /api/exams/join.
 * ------------------------------------------------------------------ */
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 25000, withCredentials: true })

http.interceptors.request.use((cfg) => {
  const teacherToken = null
  if (getCsrfToken()) cfg.headers['X-CSRF-Token'] = getCsrfToken()
  const student = getStudentSession()
  const url = cfg.url || ''
  const teacherRoute = url.startsWith('/api/teacher') || url.startsWith('/api/auth') || url.startsWith('/api/staff-access/admin')
  const token = teacherRoute ? teacherToken : student?.token || teacherToken
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  if (student?.sessionId && !teacherRoute) cfg.headers['X-Exam-Session'] = student.sessionId
  return cfg
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const serverMsg = err.response?.data?.message || err.response?.data?.error
    let message = serverMsg || err.message
    if (!err.response) message = 'Cannot reach the exam server. Check the internet connection and try again. (The server may take up to a minute to wake up.)'
    else if (status === 401 && !serverMsg) message = 'Your session has expired. Sign in again.'
    else if (status === 409 && !serverMsg) message = 'This exam is already open in another browser or device.'
    const e = new Error(message)
    e.status = status
    const retryAfter = Number(err.response?.headers?.['retry-after'])
    if (Number.isFinite(retryAfter) && retryAfter > 0) e.retryAfter = Math.min(retryAfter, 120)
    e.data = err.response?.data
    return Promise.reject(e)
  },
)

const data = (p) => p.then((r) => r.data)

/* ------------------------------ demo ------------------------------ */
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms + Math.random() * 250))
async function demo(fn, ms) {
  await wait(ms)
  const out = fn()
  return out === undefined ? out : structuredClone(out)
}
const demoError = (message, status = 400) => Object.assign(new Error(message), { status })
const withStatus = (e) => ({ ...e, status: examStatus(e) })
const publicExam = ({ passcode, ...rest }) => withStatus(rest)

/* ------------------------------ API ------------------------------- */
export const api = {
  setVisionConsent: consent => DEMO_MODE ? Promise.resolve({consent}) : data(http.post('/api/student/vision-consent',{consent})),
  // Student-initiated consent only: never called in response to a teacher's request.
  setScreenMediaConsent: screenShare => DEMO_MODE
    ? Promise.resolve({screenShare})
    : data(http.post('/api/student/media-consent',{screenShare})),
  // ---------- auth ----------
  teacherLogin: (creds) =>
    DEMO_MODE
      ? demo(() => {
          const ok = creds.email?.trim().toLowerCase() === mock.DEMO_TEACHER.email && creds.password === mock.DEMO_TEACHER.password
          if (!ok) throw demoError('Email or password is incorrect. In demo mode use the credentials shown below the form.', 401)
          return { token: 'demo-teacher-token', teacher: { id: 't1', name: 'Mr. Sanjay Gupta', email: creds.email, classes: ['XI', 'XII'] } }
        })
      : data(http.post('/api/auth/teacher/login', creds)),

  requestPasswordReset: (email) =>
    DEMO_MODE ? demo(() => ({ ok: true })) : data(http.post('/api/auth/teacher/forgot-password', { email })),

  // ---------- student ----------
  getActiveExams: () =>
    DEMO_MODE
      ? demo(() => mock.db.exams.map(publicExam).filter((e) => e.status === 'live' || e.status === 'upcoming'))
      : data(http.get('/api/exams/active')),

  joinExam: (payload) =>
    DEMO_MODE
      ? demo(() => {
          const exam = mock.db.exams.find((e) => e.id === payload.examId)
          if (!exam) throw demoError('That exam no longer exists. Pick another exam from the list.', 404)
          if (payload.passcode.trim().toUpperCase() !== exam.passcode) throw demoError('The exam password is incorrect. Check it with your teacher.', 403)
          if (exam.class !== payload.class) throw demoError(`This exam is for Class ${exam.class}. Check the class you selected.`, 403)
          const sessionId = uid('s')
          return {
            token: `demo-student-${sessionId}`,
            sessionId,
            student: { name: payload.name, rollNumber: payload.rollNumber, class: payload.class, section: payload.section },
            exam: publicExam(exam),
          }
        }, 600)
      : data(http.post('/api/exams/join', payload)),

  getStudentDashboard: () =>
    DEMO_MODE
      ? demo(() => {
          const s = getStudentSession()
          const cls = s?.student?.class
          const exams = mock.db.exams.filter((e) => e.class === cls).map(publicExam)
          return {
            student: s?.student,
            currentExam: exams.find((e) => e.id === s?.exam?.id) || s?.exam || null,
            upcomingExams: exams.filter((e) => e.status === 'upcoming'),
            handouts: mock.db.handouts.filter((h) => h.class === cls && (h.sections.includes('All') || h.sections.includes(s?.student?.section))),
            examDates: mock.db.examDates.filter((d) => d.class === cls),
          }
        })
      : data(http.get('/api/student/dashboard')),

  getExamQuestions: (examId) =>
    DEMO_MODE
      ? demo(() => {
          const exam = mock.db.exams.find((e) => e.id === examId)
          if (!exam) throw demoError('Exam not found.', 404)
          return { exam: publicExam(exam), questions: mock.demoQuestions(exam), savedAnswers: null, serverTime: new Date().toISOString() }
        })
      : data(http.get(`/api/exams/${examId}/questions`)),

  saveAnswers: (examId, payload) =>
    DEMO_MODE ? demo(() => ({ ok: true, savedAt: new Date().toISOString() }), 200) : data(http.post(`/api/exams/${examId}/answers/save`, payload)),

  uploadAnswerFile: (examId, questionId, file, onProgress) => {
    if (DEMO_MODE) return demo(() => ({ fileId: uid('f'), fileName: file.name, size: file.size }), 800)
    const form = new FormData()
    form.append('file', file)
    form.append('questionId', questionId)
    return data(http.post(`/api/exams/${examId}/answers/upload`, form, {
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }))
  },

  submitExam: (examId, payload) =>
    DEMO_MODE ? demo(() => ({ ok: true, submittedAt: new Date().toISOString() }), 700) : data(http.post(`/api/exams/${examId}/submit`, payload)),

  sendProctorEvent: (event) =>
    DEMO_MODE ? Promise.resolve({ ok: true }) : data(http.post('/api/proctor/event', event)),

  // ---------- code runner ----------
  runCode: (payload) => (DEMO_MODE ? demo(() => mock.demoCodeRun(payload), 500) : data(http.post('/api/code/run', payload))),
  submitCode: (payload) => (DEMO_MODE ? demo(() => mock.demoCodeSubmit(payload), 900) : data(http.post('/api/code/submit', payload))),

  // ---------- teacher ----------
  getTeacherOverview: () =>
    DEMO_MODE
      ? demo(() => {
          const exams = mock.db.exams.map(withStatus)
          return {
            stats: {
              activeExams: exams.filter((e) => e.status === 'live').length,
              upcomingExams: exams.filter((e) => e.status === 'upcoming').length,
              totalSubmissions: mock.db.submissions.length,
              cheatingFlags: mock.db.participants.reduce((a, p) => a + Object.values(p.flags).reduce((x, y) => x + y, 0), 0),
              handouts: mock.db.handouts.length,
            },
            activeExams: exams.filter((e) => e.status === 'live').map((e) => ({ ...e, joined: mock.db.participants.filter((p) => p.examId === e.id).length })),
            upcomingExams: exams.filter((e) => e.status === 'upcoming').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
            classes: mock.classSummaries(),
          }
        })
      : data(http.get('/api/teacher/overview')),

  getTeacherExams: () => (DEMO_MODE ? demo(() => mock.db.exams.map(withStatus)) : data(http.get('/api/teacher/exams'))),

  createExam: (payload) =>
    DEMO_MODE
      ? demo(() => {
          const exam = { ...payload, id: uid('exam'), questionCount: payload.questions.length, totalMarks: payload.questions.reduce((a, q) => a + Number(q.marks || 0), 0) }
          mock.db.exams.push(exam)
          return withStatus(exam)
        }, 700)
      : data(http.post('/api/teacher/exams', payload)),

  getMonitor: (examId) =>
    DEMO_MODE
      ? demo(() => {
          const exam = mock.db.exams.find((e) => e.id === examId)
          if (!exam) throw demoError('Exam not found.', 404)
          return { exam: withStatus(exam), students: mock.db.participants.filter((p) => p.examId === examId) }
        })
      : data(http.get(`/api/teacher/exams/${examId}/monitor`)),
  getExamPasscode: id => DEMO_MODE
    ? demo(() => ({available:!!mock.db.exams.find(e=>e.id===id)?.passcode,passcode:mock.db.exams.find(e=>e.id===id)?.passcode||null}))
    : data(http.get(`/api/teacher/exams/${encodeURIComponent(id)}/passcode`)),
  generateExamPasscode: id => DEMO_MODE
    ? demo(() => { const exam=mock.db.exams.find(e=>e.id===id); if(!exam) throw demoError('Exam not found.',404); exam.passcode=uid('NEW').toUpperCase(); return {passcode:exam.passcode}; })
    : data(http.post(`/api/teacher/exams/${encodeURIComponent(id)}/generate-passcode`,{})),

  getClasses: () => (DEMO_MODE ? demo(() => mock.classSummaries()) : data(http.get('/api/teacher/classes'))),

  getParticipants: (params = {}) =>
    DEMO_MODE
      ? demo(() =>
          mock.db.participants.filter((p) =>
            (!params.class || p.class === params.class) &&
            (!params.section || p.section === params.section) &&
            (!params.examId || p.examId === params.examId)))
      : data(http.get('/api/teacher/participants', { params })),

  getSubmissions: (params = {}) =>
    DEMO_MODE
      ? demo(() =>
          mock.db.submissions.filter((s) =>
            (!params.class || s.student.class === params.class) &&
            (!params.section || s.student.section === params.section) &&
            (!params.examId || s.examId === params.examId) &&
            (!params.roll || s.student.rollNumber.includes(params.roll))))
      : data(http.get('/api/teacher/submissions', { params })),

  saveSubmissionReview: (id, payload) =>
    DEMO_MODE
      ? demo(() => {
          const s = mock.db.submissions.find((x) => x.id === id)
          Object.assign(s, payload, { status: 'reviewed' })
          return s
        })
      : data(http.patch(`/api/teacher/submissions/${id}`, payload)),

  // ---------- handouts ----------
  getHandouts: (params = {}) =>
    DEMO_MODE
      ? demo(() => mock.db.handouts.filter((h) => !params.class || h.class === params.class).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)))
      : data(http.get('/api/handouts', { params })),

  uploadHandout: ({ file, title, description, class: cls, sections }, onProgress) => {
    if (DEMO_MODE) {
      return new Promise((resolve) => {
        let p = 0
        const t = setInterval(() => {
          p = Math.min(100, p + 20)
          onProgress?.(p)
          if (p === 100) {
            clearInterval(t)
            const ext = file.name.split('.').pop().toLowerCase()
            const type = ext === 'pdf' ? 'pdf' : ['doc', 'docx'].includes(ext) ? 'doc' : ['ppt', 'pptx'].includes(ext) ? 'ppt' : ext === 'zip' ? 'zip' : 'image'
            const h = { id: uid('h'), title, description, fileName: file.name, type, size: file.size, class: cls, sections, uploadedAt: new Date().toISOString(), url: URL.createObjectURL(file) }
            mock.db.handouts.unshift(h)
            resolve(h)
          }
        }, 180)
      })
    }
    const form = new FormData()
    form.append('file', file)
    form.append('title', title)
    form.append('description', description || '')
    form.append('class', cls)
    form.append('sections', JSON.stringify(sections))
    return data(http.post('/api/teacher/handouts/upload', form, {
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }))
  },

  deleteHandout: (id) =>
    DEMO_MODE
      ? demo(() => { mock.db.handouts = mock.db.handouts.filter((h) => h.id !== id); return { ok: true } })
      : data(http.delete(`/api/teacher/handouts/${id}`)),

  // ---------- exam dates ----------
  getExamDates: (params = {}) =>
    DEMO_MODE
      ? demo(() => mock.db.examDates.filter((d) => !params.class || d.class === params.class).sort((a, b) => new Date(a.date) - new Date(b.date)))
      : data(http.get('/api/exam-dates', { params })),

  createExamDate: (payload) =>
    DEMO_MODE
      ? demo(() => { const d = { ...payload, id: uid('d') }; mock.db.examDates.push(d); return d })
      : data(http.post('/api/teacher/exam-dates', payload)),

  deleteExamDate: (id) =>
    DEMO_MODE
      ? demo(() => { mock.db.examDates = mock.db.examDates.filter((d) => d.id !== id); return { ok: true } })
      : data(http.delete(`/api/teacher/exam-dates/${id}`)),
}

// Override the original demo-contract calls only when using the real Render backend.
if (!DEMO_MODE) Object.assign(api, createLiveApi(http))

export default api
