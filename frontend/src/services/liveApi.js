// Production adapter for the independent Render/Neon exam backend.
// Only the Render API handles database credentials. No database SDK runs in a browser.
import { getStudentSession, getTeacherToken } from './session'

const unwrap = (request) => request.then((response) => response.data)
const teacher = (http) => ({
  get: (path, options) => unwrap(http.get(path, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${getTeacherToken()}` } })),
  post: (path, payload) => unwrap(http.post(path, payload, { headers: { Authorization: `Bearer ${getTeacherToken()}` } })),
  put: (path, payload) => unwrap(http.put(path, payload, { headers: { Authorization: `Bearer ${getTeacherToken()}` } })),
  delete: (path,payload) => unwrap(http.delete(path, { data:payload, headers: { Authorization: `Bearer ${getTeacherToken()}` } })),
})
const studentHeaders = () => ({ Authorization: `Bearer ${getStudentSession()?.token || ''}` })
const student = (http) => ({
  get: (path, options) => unwrap(http.get(path, { ...options, headers: { ...options?.headers, ...studentHeaders() } })),
  post: (path, payload, options) => unwrap(http.post(path, payload, { ...options, headers: { ...options?.headers, ...studentHeaders() } })),
})

export function normalizeExam(e = {}) {
  const status = { active: 'live', scheduled: 'upcoming', closed: 'ended' }[e.status] || e.status || 'upcoming'
  const start = e.startTime || e.start_time || e.startsAt
  const end = e.endTime || e.end_time || e.endsAt
  const raw = e.settings || {}
  return {
    ...e,
    id: e.id,
    class: e.className || e.class_name || e.class,
    type: (e.examType || e.exam_type || e.type || 'quiz').replace(/^./, c => c.toUpperCase()),
    startsAt: start,
    endsAt: end,
    durationMin: e.durationMinutes || e.duration_minutes || e.durationMin,
    section: e.section || 'All',
    status,
    settings: {
      ...raw,
      requireWebcam: raw.requireWebcam ?? e.webcam_required === 'true',
      requireScreen: raw.requireScreenShare ?? e.screen_required === 'true',
      tabDetection: raw.enableTabSwitchDetection ?? true,
      copyPasteRestriction: raw.enableCopyPasteDetection ?? true,
      fullscreen: raw.enableFullscreenMode ?? false,
      codeExecution: raw.enableCodeRunner ?? false,
    },
  }
}

// Teacher-only fields never appear in student APIs. For MCQ, the option text
// is the stored answer key; display IDs are identical to their text.
export function normalizeQuestion(q = {}) {
  const lang = q.language || 'python'
  return {
    ...q,
    id: q.id,
    type: q.type === 'file' ? 'upload' : q.type,
    title: q.type === 'code' ? q.title : '',
    prompt: q.description || q.title,
    options: (q.options || []).map(x => typeof x === 'string' ? ({ id: x, text: x }) : x),
    languages: [lang],
    starterCode: { [lang]: q.starterCode || q.starter_code || '' },
    visibleTests: (q.visibleTestCases || q.visible_tests || []).map((t, i) => ({ id: String(i), input: t.stdin || '', expected: t.expectedOutput || '' })),
    hiddenTestCount: undefined, // Never infer or expose private hidden tests.
    accept: '.pdf,.png,.jpg,.jpeg',
    maxSizeMB: 8,
  }
}

const ALLOWED_RUN_LANGUAGES = new Set(['python', 'java', 'cpp', 'c', 'javascript'])
export function toBackendQuestion(q, order = 0) {
  if (q.type === 'code' && !ALLOWED_RUN_LANGUAGES.has(q.languages?.[0])) {
    throw new Error(`The exam backend cannot grade ${q.languages?.[0] || 'this'} as a code question yet. Choose Python, Java, C or C++.`)
  }
  const lang = q.type === 'code' ? q.languages[0] : null
  const trimTests = arr => (arr || []).filter(x => x.expected?.trim()).map(x => ({ stdin: String(x.input || ''), expectedOutput: String(x.expected) }))
  return {
    type: q.type === 'upload' ? 'file' : q.type,
    title: String((q.type === 'code' ? (q.title || q.prompt) : q.prompt) || '').slice(0, 240),
    description: String(q.prompt || ''),
    options: q.type === 'mcq' ? q.options.map(x => x.text) : [],
    correctAnswer: q.type === 'mcq' ? (q.options.find(x => x.id === q.correct)?.text ?? null) : null,
    marks: Number(q.marks) || 0,
    language: lang,
    starterCode: lang ? String(q.starterCode?.[lang] || '') : '',
    visibleTestCases: q.type === 'code' ? trimTests(q.visibleTests) : [],
    hiddenTestCases: q.type === 'code' ? trimTests(q.hiddenTests) : [],
    order,
  }
}

function toBackendExam(p) {
  const s = p.settings || {}
  return {
    title: p.title,
    subject: p.subject || 'Computers',
    className: p.class,
    section: p.section || 'All',
    examType: String(p.type || 'quiz').toLowerCase(),
    startTime: p.startsAt,
    endTime: p.endsAt,
    durationMinutes: Number(p.durationMin),
    settings: {
      requireWebcam: Boolean(s.requireWebcam),
      requireScreenShare: Boolean(s.requireScreen),
      enableTabSwitchDetection: Boolean(s.tabDetection),
      enableCopyPasteDetection: Boolean(s.copyPasteRestriction),
      enableFullscreenMode: true,
      enableCodeRunner: Boolean(s.codeExecution),
      allowLateJoin: true,
      monitorAnswerText: false,
    },
  }
}

const normalizeSession = (s, examId, examTitle = '') => ({
  id: s.id, sessionId: s.id, examId, examTitle,
  name: s.student_name, rollNumber: s.roll_number, class: s.class_name, section: s.section,
  status: s.status, joinedAt: s.joined_at, submittedAt: s.submitted_at,
  flagsCount: s.flags_count || 0,
  flags: { tab: 0, blur: 0, fullscreen: 0, copyPaste: 0, devtools: 0, other: s.flags_count || 0 },
  webcam: s.consent_webcam, screen: s.consent_screen, connected: s.connected,
  totalQuestions: Number(s.total_questions||0), answered: Number(s.answered||0),
  device: {browser:s.browser||null, os:s.os||null, screen:s.screen_size||null, timezone:s.timezone||null},
  score: s.awarded_marks === undefined ? null : Number(s.awarded_marks),
})

const normalizeHandout = h => ({
  ...h,
  id: h.id,
  class: h.class_name,
  sections: [h.section || 'All'],
  uploadedAt: h.created_at,
  type: /pdf/i.test(h.file_type) ? 'pdf' : /image|png|jpeg/i.test(h.file_type) ? 'image' : 'doc',
  fileName: h.title,
  size: 0,
})
const normalizeDate = d => ({ ...d, class: d.class_name, notes: d.description, type: 'Exam', date: d.date })

const questionTypes = new Map()
const lastSaved = new Map()
let saveQueue = Promise.resolve()
const asSave = (questionId, value) => {
  const q = questionTypes.get(questionId)
  if (!q) return null
  if (q.type === 'upload') return null // File upload has its own authenticated endpoint.
  if (q.type !== 'code') return { questionId, answerText: value == null ? null : String(value) }
  const language = value?.language || q.languages?.[0] || 'python'
  const draft = value?.drafts?.[language] ?? q.starterCode?.[language] ?? ''
  return { questionId, code: typeof draft === 'string' ? draft : JSON.stringify(draft), language }
}

export function createLiveApi(http) {
  const t = teacher(http), s = student(http)
  async function saveAnswers(examId, payload, { force = false } = {}) {
    const work = async () => {
      let newest = null
      for (const [qid, value] of Object.entries(payload.answers || {})) {
        const entry = asSave(qid, value)
        if (!entry) continue
        const key = `${examId}:${qid}`
        const serialized = JSON.stringify(entry)
        if (!force && serialized === lastSaved.get(key)) continue
        const response = await s.post(`/api/student/exams/${encodeURIComponent(examId)}/answers/save`, entry)
        lastSaved.set(key, serialized)
        newest = response.autoSavedAt
      }
      return { ok: true, savedAt: newest || new Date().toISOString() }
    }
    const run = saveQueue.then(work, work)
    saveQueue = run.catch(() => {})
    return run
  }
  async function monitor(examId) {
    const response = await t.get(`/api/teacher/exams/${encodeURIComponent(examId)}/monitor`)
    return { exam: normalizeExam(response.exam), students: response.students.map(x => normalizeSession(x, examId, response.exam.title)) }
  }
  const getTeacherExams = async (options = {}) => (
    await t.get('/api/teacher/exams',options.archived?{params:{archived:'true'}}:undefined)
   ).exams.map(normalizeExam)
  const getClasses = async () => {
    const { classes } = await t.get('/api/teacher/classes')
    return classes.map(c => ({ id: c.id, name: c.class_name, sections: c.sections || [], teacher: c.computer_teacher_id || 'School teacher', handoutCount: 0 }))
  }
  return {
    teacherLogin: async creds => t.post('/api/auth/teacher/login', creds),
    requestPasswordReset: async () => { throw new Error('Automated password reset is not enabled. Contact the school administrator.') },
    getActiveExams: async () => (await unwrap(http.get('/api/exams/active'))).exams.map(normalizeExam),
    joinExam: async p => {
      const dev = p.device || {}
      const joined = await unwrap(http.post(`/api/exams/${encodeURIComponent(p.examId)}/join`, {
        name: p.name, rollNumber: p.rollNumber, className: p.class, section: p.section,
        passcode: p.passcode,
        consent: p.mediaConsent || { webcam: false, screenShare: false },
        browserMetadata: { userAgent: dev.userAgent, browser: dev.browser, os: dev.os, screenSize: dev.screen, timezone: dev.timezone },
      }))
      const publicExam = normalizeExam({ ...joined.exam, className: p.class, section: p.section, status: 'active' })
      return {
        token: joined.token, sessionId: joined.session.id,
        monitoring: joined.monitoring,
        student: { name: p.name, rollNumber: p.rollNumber, class: p.class, section: p.section },
        exam: publicExam,
        joinedAt: joined.session.joined_at,
      }
    },
    getStudentDashboard: async () => {
      const session = getStudentSession()
      if (!session?.token) throw new Error('Please join an exam first.')
      const cls = session.student.class, section = session.student.section
      const [active, handouts, dates] = await Promise.all([
        unwrap(http.get('/api/exams/active', { params: { className: cls, section } })).then(x => x.exams.map(normalizeExam)),
        s.get('/api/handouts', { params: { className: cls, section } }).then(x => x.handouts.map(normalizeHandout)),
        s.get('/api/exam-dates', { params: { className: cls, section } }).then(x => x.examDates.map(normalizeDate)),
      ])
      return { student: session.student, currentExam: session.exam, upcomingExams: active.filter(e => e.status === 'upcoming'), handouts, examDates: dates }
    },
    getExamQuestions: async examId => {
      const [response, autosaved] = await Promise.all([
        s.get(`/api/student/exams/${encodeURIComponent(examId)}/questions`),
        s.get(`/api/student/exams/${encodeURIComponent(examId)}/answers`),
      ])
      const questions = response.questions.map(normalizeQuestion)
      questions.forEach(q => questionTypes.set(q.id, q))
      const savedAnswers = Object.fromEntries((autosaved.answers || []).map(a => [a.question_id,
        a.code != null
          ? { language: a.language, drafts: { [a.language]: a.code } }
          : (a.answer_text ?? '')
      ]))
      const sess = getStudentSession()
      const exam = sess?.exam?.id === examId ? sess.exam : null
      return { exam: exam || normalizeExam({ id: examId, endTime: response.endTime, status: 'active' }), questions, savedAnswers, serverTime: response.serverTime }
    },
    saveAnswers,
    uploadAnswerFile: async (examId, questionId, file, onProgress) => {
      const form = new FormData()
      form.append('file', file)
      const r = await s.post(`/api/student/answers/${encodeURIComponent(questionId)}/file`, form, { onUploadProgress: e => onProgress?.(e.total ? Math.round(e.loaded / e.total * 100) : 0) })
      return { fileId: questionId, fileName: file.name, size: file.size, saved: r.saved }
    },
    submitExam: async (examId, payload) => {
      await saveAnswers(examId, payload)
      const r = await s.post(`/api/student/exams/${encodeURIComponent(examId)}/submit`, {})
      return { ok: r.submitted, submittedAt: new Date().toISOString() }
    },
    sendProctorEvent: async e => {
      const types = {
        tab_hidden: 'TAB_SWITCH', window_blur: 'WINDOW_BLUR', window_focus: 'WINDOW_FOCUS',
        fullscreen_exit: 'FULLSCREEN_EXIT', copy: 'COPY', cut: 'COPY', paste: 'PASTE',
        right_click: 'RIGHT_CLICK', devtools_shortcut: 'DEVTOOLS_SUSPECTED',
        devtools_suspected: 'DEVTOOLS_SUSPECTED', screen_share_stopped: 'SCREEN_SHARE_STOPPED',
        webcam_stopped: 'WEBCAM_STOPPED',
      }
      if (!types[e.type]) return { ignored: true } // No invented or unsupported proctor flags.
      return s.post('/api/proctor/event', { eventType: types[e.type], metadata: { source: 'browser', ...(typeof e.details === 'object' && e.details ? Object.fromEntries(Object.entries(e.details).filter(([,v]) => ['string','number','boolean'].includes(typeof v)).slice(0,5)) : {}) } })
    },
    runCode: async p => {
      if (!p.questionId) throw new Error('Practice compilation is unavailable until an isolated practice runner is configured. Exam code questions can use Run when your teacher enables it.')
      const out = await s.post('/api/code/run', { questionId: p.questionId, code: p.code, language: p.language })
      return { ...out, stdout: out.results?.map(x => x.stdout || '').join('\n') || '', stderr: out.results?.map(x => x.stderr || '').join('\n') || '', exitCode: out.results?.some(x => !x.passed) ? 1 : 0 }
    },
    submitCode: async p => {
      if (!p.questionId) throw new Error('Code submission is available only inside an exam.')
      return s.post('/api/code/submit', { questionId: p.questionId, code: p.code, language: p.language })
    },
    getTeacherOverview: async () => {
      const [dashboard, classes, handouts] = await Promise.all([t.get('/api/teacher/dashboard'), getClasses(), t.get('/api/teacher/handouts')])
      const exams = dashboard.exams.map(normalizeExam)
      return {
        stats: { activeExams: exams.filter(e => e.status === 'live').length, upcomingExams: exams.filter(e => e.status === 'upcoming').length, totalSubmissions: dashboard.exams.reduce((a,e) => a + Number(e.submissions || 0),0), cheatingFlags: '—', handouts: (handouts.handouts || []).length },
        activeExams: exams.filter(e => e.status === 'live').map(e => ({ ...e, joined: dashboard.exams.find(x => x.id === e.id)?.participants || 0 })),
        upcomingExams: exams.filter(e => e.status === 'upcoming'), classes,
      }
    },
    getTeacherExams,
    removeExam: (id,title) => t.delete(`/api/teacher/exams/${encodeURIComponent(id)}`,{confirmation:title}),
    restoreExam: id => t.post(`/api/teacher/exams/${encodeURIComponent(id)}/restore`,{}),
    createExam: async p => {
      // Exam creation is an explicit sequence, not a pretend single request.
      const created = (await t.post('/api/teacher/exams', toBackendExam(p))).exam
      const examId = created.id
      try {
        for (const [i, q] of (p.questions || []).entries()) {
          if (q.prompt?.trim()) await t.post(`/api/teacher/exams/${examId}/questions`, toBackendQuestion(q, i))
        }
        // Teacher-provided passcode is sent only over TLS, immediately hashed by backend.
        await t.post(`/api/teacher/exams/${examId}/generate-passcode`, { passcode: p.passcode })
        const result = p.status === 'published'
          ? (await t.post(`/api/teacher/exams/${examId}/publish`, {})).exam
          : created
        return { ...normalizeExam(result), passcode: p.passcode }
      } catch (e) {
        throw new Error(`A draft exam was created (ID ${examId}), but setup could not finish: ${e.message}. Contact your administrator before trying again.`)
      }
    },
    getMonitor: monitor,
    getExamPasscode: async id => t.get('/api/teacher/exams/'+encodeURIComponent(id)+'/passcode'),
    generateExamPasscode: async id => t.post('/api/teacher/exams/'+encodeURIComponent(id)+'/generate-passcode',{}),
    getClasses,
    initializeClasses: async () => {
      const created = []
      for (const cls of ['VI','VII','VIII','IX','X','XI','XII']) {
        const r = await t.post('/api/teacher/classes', { className: cls, sections: ['A','B','C','D','E','F'] })
        created.push(r.classGroup)
      }
      return created
    },
    getParticipants: async p => {
      const exams = (await getTeacherExams()).filter(e => !p.class || e.class === p.class)
      const response = await Promise.all(exams.map(e => monitor(e.id)))
      return response.flatMap(x => x.students).filter(s => (!p.section || s.section === p.section) && (!p.examId || s.examId === p.examId))
    },
    getSubmissions: async p => {
      const exams = (await getTeacherExams()).filter(e => (!p.class || e.class === p.class) && (!p.examId || e.id === p.examId))
      const groups = await Promise.all(exams.map(async e => ({ exam: e, list: (await t.get(`/api/teacher/exams/${e.id}/submissions`)).submissions })))
      const rows = groups.flatMap(g => g.list.filter(x => x.status === 'submitted').map(x => ({ exam: g.exam, session: x })))
      const out = []
      for (const { exam, session } of rows.slice(0, 200)) {
        if (p.section && p.section !== session.section) continue
        if (p.roll && !String(session.roll_number).includes(p.roll)) continue
        const detail = await t.get(`/api/teacher/submissions/${session.id}`)
        out.push({
          id: session.id, examId: exam.id, examTitle: exam.title,
          student: { name: session.student_name, rollNumber: session.roll_number, class: session.class_name, section: session.section },
          submittedAt: session.submitted_at, score: Number(session.awarded_marks || 0), totalMarks: detail.answers.reduce((a,x)=>a+Number(x.max_marks),0),
          status: session.status, flagsCount: session.flags_count, flags: [], remarks: detail.answers[0]?.teacher_remarks || '',
          answers: detail.answers.map(a => ({ answerId: a.id, questionId:a.question_id, prompt:a.title, type:a.type==='file'?'upload':a.type, marks:Number(a.max_marks), awarded:a.marks_awarded==null?null:Number(a.marks_awarded), answer:a.answer_text || (a.fileUrl ? 'File attached' : ''), code:a.code, language:a.language, correct:a.type==='mcq' ? Number(a.marks_awarded)>0 : undefined })),
        })
      }
      return out
    },
    saveSubmissionReview: async (sessionId, p) => {
      for (const a of p.answers || []) {
        if (!a.answerId || a.awarded == null) continue
        await t.put(`/api/teacher/answers/${a.answerId}/marks`, { marksAwarded:Number(a.awarded), teacherRemarks:String(p.remarks || '') })
      }
      return { id:sessionId, score:p.score, remarks:p.remarks, status:'reviewed' }
    },
    getHandouts: async (p = {}) => {
      const studentSession = getStudentSession()
      const path = getTeacherToken() ? '/api/teacher/handouts' : '/api/handouts'
      const response = getTeacherToken() ? await t.get(path) : await s.get(path, { params:{ className:p.class || studentSession?.student?.class || '', section:p.section || studentSession?.student?.section || '' } })
      return response.handouts.map(normalizeHandout)
    },
    downloadHandout: async id => {
      const response = getTeacherToken()
        ? await t.get(`/api/teacher/handouts/${id}/download`)
        : await s.get(`/api/student/handouts/${id}/download`)
      return response.url
    },
    uploadHandout: async ({file,title,description,class:cls,sections},onProgress) => {
      if ((sections || []).filter(x => x !== 'All').length > 1) throw new Error('Choose All or a single section. Each backend handout has one section.')
      const form = new FormData()
      form.append('file',file);form.append('title',title);form.append('description',description || '')
      form.append('className',cls);form.append('section',(sections || [])[0] || 'All')
      const response = await unwrap(http.post('/api/teacher/handouts/upload',form,{headers:{Authorization:`Bearer ${getTeacherToken()}`},onUploadProgress:e=>onProgress?.(e.total?Math.round(e.loaded/e.total*100):0)}))
      return normalizeHandout(response.handout)
    },
    deleteHandout: id => t.delete(`/api/teacher/handouts/${id}`),
    getExamDates: async (p = {}) => {
      const sess = getStudentSession()
      const response = getTeacherToken() ? await t.get('/api/teacher/exam-dates') : await s.get('/api/exam-dates',{params:{className:p.class || sess?.student?.class || '',section:p.section || sess?.student?.section || ''}})
      return response.examDates.map(normalizeDate)
    },
    createExamDate: async p => normalizeDate((await t.post('/api/teacher/exam-dates',{title:p.title,className:p.class,section:p.section,date:p.date,description:p.notes || ''})).examDate),
    deleteExamDate: id => t.delete(`/api/teacher/exam-dates/${id}`),
  }
}
