// Sample data used when VITE_DEMO_MODE=true. Nothing here is real student data.
import { STARTER_CODE } from '../config'

const MIN = 60_000
const DAY = 86_400_000
const t0 = Date.now()
const iso = (ms) => new Date(ms).toISOString()

let seed = 20260930
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

export const DEMO_PASSCODE = 'DPS-2026'
export const DEMO_TEACHER = { email: 'teacher@dpsagra.demo', password: 'demo1234' }

const TEACHERS = {
  VI: 'Ms. Pooja Sharma', VII: 'Ms. Pooja Sharma', VIII: 'Mr. Rohit Verma', IX: 'Mr. Rohit Verma',
  X: 'Ms. Neha Agarwal', XI: 'Mr. Sanjay Gupta', XII: 'Mr. Sanjay Gupta',
}

const NAMES = [
  'Aarav Sharma', 'Ananya Gupta', 'Vivaan Agarwal', 'Diya Jain', 'Arjun Singh', 'Ishita Verma',
  'Kabir Chauhan', 'Myra Bansal', 'Reyansh Goyal', 'Saanvi Mittal', 'Advait Khandelwal', 'Kavya Saxena',
  'Aditya Yadav', 'Navya Tyagi', 'Krishna Rawat', 'Pari Maheshwari', 'Ayaan Khan', 'Tanvi Sharma',
  'Rudra Garg', 'Aadhya Kushwaha', 'Shaurya Tomar', 'Riya Mehra', 'Atharv Dixit', 'Siya Bhardwaj',
]

const CODE_SNIPPETS = [
  `def count_vowels(s):\n    count = 0\n    for ch in s.lower():\n        if ch in "aeiou":\n            count += 1\n    return count\n\ntext = input()\nprint(count_vowels(text))`,
  `def count_vowels(s):\n    return sum(1 for c in s if c.lower() in 'aeiou')\n\nline = input().strip()\nprint(count_vowels(line))`,
  `vowels = "aeiouAEIOU"\ns = input()\nc = 0\nfor i in s:\n    if i in vowels:\n        c = c + 1\nprint(c)`,
  `def count_vowels(s):\n    # TODO handle uppercase\n    total = 0\n    for letter in s:\n        if letter in ['a','e','i','o','u']:\n            total += 1\n    return total`,
  `f = open("notes.txt", "a")\nf.write("Practical file\\n")\nf.close()\n\nwith open("notes.txt") as f:\n    print(f.read())`,
]

const baseSettings = { requireWebcam: true, requireScreen: true, tabDetection: true, copyPasteRestriction: true, codeExecution: true }

const store = {
  exams: [
    { id: 'xii-python-practical', title: 'Python Practical: Functions & File Handling', class: 'XII', section: 'All', subject: 'Computers', type: 'Practical', startsAt: iso(t0 - 20 * MIN), endsAt: iso(t0 + 70 * MIN), durationMin: 90, passcode: DEMO_PASSCODE, settings: { ...baseSettings }, languages: ['python'], totalMarks: 25, questionCount: 6 },
    { id: 'viii-web-quiz', title: 'Web Design Quiz: HTML & CSS', class: 'VIII', section: 'A', subject: 'Computers', type: 'Mixed', startsAt: iso(t0 - 5 * MIN), endsAt: iso(t0 + 40 * MIN), durationMin: 45, passcode: DEMO_PASSCODE, settings: { ...baseSettings, requireWebcam: false, requireScreen: false }, languages: ['web'], totalMarks: 25, questionCount: 6 },
    { id: 'x-python-quiz', title: 'Python Basics Quiz', class: 'X', section: 'All', subject: 'Computers', type: 'Quiz', startsAt: iso(t0 + 2 * DAY), endsAt: iso(t0 + 2 * DAY + 40 * MIN), durationMin: 40, passcode: DEMO_PASSCODE, settings: { ...baseSettings, requireScreen: false }, languages: ['python'], totalMarks: 20, questionCount: 10 },
    { id: 'vi-blocks-practical', title: 'Block Coding Practical', class: 'VI', section: 'B', subject: 'Computers', type: 'Practical', startsAt: iso(t0 + 4 * DAY), endsAt: iso(t0 + 4 * DAY + 35 * MIN), durationMin: 35, passcode: DEMO_PASSCODE, settings: { ...baseSettings, requireWebcam: false, requireScreen: false }, languages: ['blocks'], totalMarks: 15, questionCount: 4 },
    { id: 'xi-sql-practical', title: 'SQL Basics Practical', class: 'XI', section: 'All', subject: 'Computers', type: 'Practical', startsAt: iso(t0 + 6 * DAY), endsAt: iso(t0 + 6 * DAY + 60 * MIN), durationMin: 60, passcode: DEMO_PASSCODE, settings: { ...baseSettings }, languages: ['sql'], totalMarks: 20, questionCount: 5 },
    { id: 'ix-periodic-test', title: 'Periodic Test 1: Computer Applications', class: 'IX', section: 'All', subject: 'Computers', type: 'Mixed', startsAt: iso(t0 - 3 * DAY), endsAt: iso(t0 - 3 * DAY + 60 * MIN), durationMin: 60, passcode: DEMO_PASSCODE, settings: { ...baseSettings }, languages: ['python'], totalMarks: 30, questionCount: 8 },
  ],
  handouts: [
    { id: 'h1', title: 'Python File Handling Notes', fileName: 'file-handling-notes.pdf', type: 'pdf', size: 842_000, class: 'XII', sections: ['All'], uploadedAt: iso(t0 - 2 * DAY), url: '#' },
    { id: 'h2', title: 'Practical File Format 2026', fileName: 'practical-file-format.docx', type: 'doc', size: 126_000, class: 'XII', sections: ['All'], uploadedAt: iso(t0 - 5 * DAY), url: '#' },
    { id: 'h3', title: 'HTML Tags Cheat Sheet', fileName: 'html-cheatsheet.pdf', type: 'pdf', size: 402_000, class: 'VIII', sections: ['A', 'B'], uploadedAt: iso(t0 - DAY), url: '#' },
    { id: 'h4', title: 'SQL Joins Presentation', fileName: 'sql-joins.pptx', type: 'ppt', size: 2_300_000, class: 'XI', sections: ['All'], uploadedAt: iso(t0 - 3 * DAY), url: '#' },
    { id: 'h5', title: 'Sample Programs Pack', fileName: 'sample-programs.zip', type: 'zip', size: 58_000, class: 'XII', sections: ['A'], uploadedAt: iso(t0 - 8 * DAY), url: '#' },
    { id: 'h6', title: 'Block Coding Activity Sheet', fileName: 'activity-sheet.png', type: 'image', size: 310_000, class: 'VI', sections: ['All'], uploadedAt: iso(t0 - 4 * DAY), url: '#' },
  ],
  examDates: [
    { id: 'd1', title: 'Python Basics Quiz', class: 'X', section: 'All', date: iso(t0 + 2 * DAY), type: 'Quiz', notes: 'Chapters 1 to 4' },
    { id: 'd2', title: 'Block Coding Practical', class: 'VI', section: 'B', date: iso(t0 + 4 * DAY), type: 'Practical', notes: 'Computer Lab 2' },
    { id: 'd3', title: 'SQL Basics Practical', class: 'XI', section: 'All', date: iso(t0 + 6 * DAY), type: 'Practical', notes: 'Bring practical file' },
    { id: 'd4', title: 'Board Practical Viva', class: 'XII', section: 'All', date: iso(t0 + 18 * DAY), type: 'Practical', notes: 'External examiner' },
    { id: 'd5', title: 'Half-Yearly Theory Exam', class: 'IX', section: 'All', date: iso(t0 + 11 * DAY), type: 'Theory', notes: '' },
  ],
  participants: [],
  submissions: [],
}

// ---------- questions ----------
function codeQuestion(lang) {
  if (lang === 'web') {
    return { id: 'q5', type: 'code', marks: 8, languages: ['web'], title: 'Build a profile card',
      prompt: 'Create a profile card with your name in an <h2>, your class in a <p>, and a button. When the button is clicked, print "Hello from DPS Agra" to the console. Style the card with a border radius and a shadow.',
      starterCode: { web: STARTER_CODE.web }, visibleTests: [], hiddenTestCount: 0 }
  }
  if (lang === 'blocks') {
    return { id: 'q5', type: 'code', marks: 8, languages: ['blocks'], title: 'Draw a square',
      prompt: 'Use blocks to make the sprite draw a square. Hint: use a repeat block with move and turn.',
      starterCode: { blocks: [] }, visibleTests: [], hiddenTestCount: 0 }
  }
  if (lang === 'sql') {
    return { id: 'q5', type: 'code', marks: 8, languages: ['sql'], title: 'Top scorers',
      prompt: 'Table RESULT(roll, name, marks) is already created. Write a query that shows the names of students who scored more than 90, sorted by marks in descending order.',
      starterCode: { sql: '-- RESULT(roll, name, marks) exists\nSELECT ' }, visibleTests: [{ id: 't1', input: '(sample table)', expected: 'Diya\nAnanya' }], hiddenTestCount: 2 }
  }
  return {
    id: 'q5', type: 'code', marks: 8, languages: [lang], title: 'Count the vowels',
    prompt: 'Write a function count_vowels(s) that returns the number of vowels (a, e, i, o, u, in either case) in the string s. Read one line of input and print the count.',
    starterCode: { python: 'def count_vowels(s):\n    # write your code here\n    pass\n\n\ntext = input()\nprint(count_vowels(text))\n' },
    visibleTests: [
      { id: 't1', input: 'Hello World', expected: '3' },
      { id: 't2', input: 'DPS Agra', expected: '2' },
    ],
    hiddenTestCount: 3,
  }
}

export function demoQuestions(exam) {
  const lang = exam?.languages?.[0] || 'python'
  const web = lang === 'web' || lang === 'blocks'
  return [
    web
      ? { id: 'q1', type: 'mcq', marks: 1, prompt: 'Which HTML tag creates the largest heading?', options: [{ id: 'a', text: '<head>' }, { id: 'b', text: '<h6>' }, { id: 'c', text: '<h1>' }, { id: 'd', text: '<heading>' }] }
      : { id: 'q1', type: 'mcq', marks: 1, prompt: 'Which of these Python data types is immutable?', options: [{ id: 'a', text: 'list' }, { id: 'b', text: 'tuple' }, { id: 'c', text: 'dict' }, { id: 'd', text: 'set' }] },
    web
      ? { id: 'q2', type: 'mcq', marks: 1, prompt: 'Which CSS property changes the text colour?', options: [{ id: 'a', text: 'font-color' }, { id: 'b', text: 'text-color' }, { id: 'c', text: 'color' }, { id: 'd', text: 'foreground' }] }
      : { id: 'q2', type: 'mcq', marks: 1, prompt: 'Which file mode adds data to the end of an existing file without erasing it?', options: [{ id: 'a', text: "'r'" }, { id: 'b', text: "'w'" }, { id: 'c', text: "'a'" }, { id: 'd', text: "'x'" }] },
    { id: 'q3', type: 'short', marks: 2, prompt: web ? 'What does the <a> tag\'s href attribute specify?' : 'What does len("DPS Agra") return, and why?', maxLength: 200 },
    { id: 'q4', type: 'long', marks: 4, prompt: web ? 'Explain the difference between inline, internal and external CSS. Give one example of each.' : 'Differentiate between text files and binary files. Give one real-life use of each.', minWords: 60 },
    codeQuestion(lang),
    { id: 'q6', type: 'upload', marks: 2, optional: true, prompt: 'Optional: upload a screenshot of your program output (PNG or JPG, up to 5 MB).', accept: '.png,.jpg,.jpeg', maxSizeMB: 5 },
  ]
}

// ---------- participants (monitor + class management) ----------
function makeTimeline(flags, joinedAt) {
  const events = [{ type: 'exam_started', ts: joinedAt }]
  const start = new Date(joinedAt).getTime()
  const push = (type, n) => { for (let i = 0; i < n; i++) events.push({ type, ts: iso(start + rnd() * (t0 - start)) }) }
  push('tab_hidden', flags.tab); push('window_blur', flags.blur); push('fullscreen_exit', flags.fullscreen)
  push('paste', flags.copyPaste); push('devtools_shortcut', flags.devtools); push('multiple_tabs', flags.other)
  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts))
}

function makeParticipants(exam, count) {
  const qCount = demoQuestions(exam).length
  return NAMES.slice(0, count).map((name, i) => {
    const risky = rnd()
    const flags = {
      tab: risky > 0.8 ? 1 + Math.floor(rnd() * 3) : 0,
      blur: risky > 0.6 ? 1 + Math.floor(rnd() * 2) : 0,
      fullscreen: risky > 0.88 ? 1 : 0,
      copyPaste: risky > 0.92 ? 1 : 0,
      devtools: risky > 0.96 ? 1 : 0,
      other: 0,
    }
    const joinedAt = iso(t0 - (12 + Math.floor(rnd() * 8)) * MIN)
    const status = i === 6 ? 'submitted' : i === 13 ? 'disconnected' : 'active'
    const snippet = CODE_SNIPPETS[i % CODE_SNIPPETS.length]
    return {
      sessionId: `s-${exam.id}-${i + 1}`,
      examId: exam.id,
      examTitle: exam.title,
      name,
      rollNumber: String(i + 1).padStart(2, '0'),
      class: exam.class,
      section: exam.section === 'All' ? 'ABC'[i % 3] : exam.section,
      joinedAt,
      status,
      currentQuestion: 1 + Math.floor(rnd() * qCount),
      totalQuestions: qCount,
      answered: Math.floor(rnd() * qCount),
      lastSavedAt: iso(t0 - rnd() * 120_000),
      webcam: !!exam.settings.requireWebcam,
      screen: !!exam.settings.requireScreen,
      preview: snippet.slice(0, 40 + Math.floor(rnd() * (snippet.length - 40))),
      previewLanguage: exam.languages?.[0] || 'python',
      flags,
      timeline: makeTimeline(flags, joinedAt),
      warnings: [],
      device: { browser: pick(['Chrome 129', 'Edge 129', 'Chrome 128']), os: 'Windows 10/11', screen: '1366x768', timezone: 'Asia/Kolkata' },
      score: status === 'submitted' ? 18 : null,
    }
  })
}

store.participants = [
  ...makeParticipants(store.exams[0], 24),
  ...makeParticipants(store.exams[1], 14),
  ...makeParticipants(store.exams[5], 18).map((p) => ({ ...p, status: 'submitted', score: 12 + Math.floor(rnd() * 18) })),
]

// ---------- submissions ----------
function makeSubmission(p) {
  const exam = store.exams.find((e) => e.id === p.examId)
  const qs = demoQuestions(exam)
  const answers = qs.map((q) => {
    if (q.type === 'mcq') {
      const chosen = pick(q.options).id
      const correct = q.id === 'q1' ? (exam.languages[0] === 'python' ? 'b' : 'c') : 'c'
      return { questionId: q.id, prompt: q.prompt, type: q.type, marks: q.marks, answer: q.options.find((o) => o.id === chosen)?.text, correct: chosen === correct, awarded: chosen === correct ? q.marks : 0 }
    }
    if (q.type === 'code') {
      const results = [...q.visibleTests.map((t) => ({ ...t, hidden: false })), ...Array.from({ length: q.hiddenTestCount }, (_, k) => ({ id: `h${k}`, hidden: true }))]
        .map((t) => ({ ...t, passed: rnd() > 0.25, actual: t.hidden ? undefined : t.expected }))
      const passed = results.filter((r) => r.passed).length
      return { questionId: q.id, prompt: q.prompt, type: 'code', marks: q.marks, language: q.languages[0], code: pick(CODE_SNIPPETS), output: '3\n', testResults: results, awarded: Math.round((passed / Math.max(1, results.length)) * q.marks) }
    }
    if (q.type === 'upload') return { questionId: q.id, prompt: q.prompt, type: 'upload', marks: q.marks, answer: rnd() > 0.5 ? 'output-screenshot.png' : null, awarded: null }
    return { questionId: q.id, prompt: q.prompt, type: q.type, marks: q.marks, answer: q.type === 'short' ? 'It returns 8 because the space is also counted as a character.' : 'Text files store data as readable characters, for example a .txt or .csv file used for notes. Binary files store data in the same format as memory, for example images or .dat files written with pickle. Binary files are faster to process but cannot be read in a text editor.', awarded: null }
  })
  const flagCount = Object.values(p.flags).reduce((a, b) => a + b, 0)
  return {
    id: `sub-${p.sessionId}`,
    examId: p.examId,
    examTitle: exam.title,
    student: { name: p.name, rollNumber: p.rollNumber, class: p.class, section: p.section },
    submittedAt: iso(new Date(exam.endsAt).getTime() - rnd() * 20 * MIN),
    totalMarks: qs.reduce((a, q) => a + q.marks, 0),
    score: answers.reduce((a, x) => a + (x.awarded || 0), 0),
    status: rnd() > 0.5 ? 'reviewed' : 'auto-checked',
    flagsCount: flagCount,
    flags: p.timeline.filter((e) => e.type !== 'exam_started'),
    device: p.device,
    answers,
    remarks: '',
  }
}
store.submissions = store.participants.filter((p) => p.status === 'submitted').map(makeSubmission)

// ---------- helpers used by api.js demo branch ----------
export const db = store

export function classSummaries() {
  return ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((c) => {
    const exams = store.exams.filter((e) => e.class === c)
    const now = Date.now()
    const live = exams.find((e) => new Date(e.startsAt) <= now && new Date(e.endsAt) >= now)
    const upcoming = exams.filter((e) => new Date(e.startsAt) > now).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0]
    const nextDate = store.examDates.filter((d) => d.class === c && new Date(d.date) > now).sort((a, b) => new Date(a.date) - new Date(b.date))[0]
    return {
      id: `class-${c}`,
      name: c,
      teacher: TEACHERS[c],
      sections: ['VI', 'VII', 'VIII'].includes(c) ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'],
      activeExam: live ? { id: live.id, title: live.title } : null,
      handoutCount: store.handouts.filter((h) => h.class === c).length,
      nextExamDate: upcoming?.startsAt || nextDate?.date || null,
      participantCount: store.participants.filter((p) => p.class === c).length,
    }
  })
}

export function demoCodeRun({ language, code = '', stdin = '' }) {
  const lines = []
  if (language === 'python') {
    const m = code.match(/print\((["'])(.*?)\1\)/)
    if (m) lines.push(m[2])
  }
  return {
    stdout: lines.join('\n') || `(demo) Program received input: ${JSON.stringify(stdin || '')}`,
    stderr: '',
    exitCode: 0,
    timeMs: 40 + Math.round(Math.random() * 120),
    note: 'Demo mode: code runs on the backend when VITE_API_BASE_URL is set.',
  }
}

export function demoCodeSubmit({ code = '', question }) {
  const effort = code.replace(/\s+/g, '').length
  const tests = [
    ...(question?.visibleTests || []).map((t) => ({ ...t, hidden: false })),
    ...Array.from({ length: question?.hiddenTestCount ?? 3 }, (_, i) => ({ id: `hidden-${i + 1}`, hidden: true })),
  ]
  const results = tests.map((t, i) => {
    const passed = effort > 90 && (i === 0 || Math.random() > 0.2)
    return { ...t, passed, actual: t.hidden ? undefined : passed ? t.expected : '0', timeMs: 20 + Math.round(Math.random() * 60) }
  })
  return { results, passed: results.filter((r) => r.passed).length, total: results.length }
}

// Monitor simulation: returns a patch for a random active student.
export function demoMonitorTick(examId) {
  const active = store.participants.filter((p) => p.examId === examId && p.status === 'active')
  if (!active.length) return null
  const p = pick(active)
  const snippet = CODE_SNIPPETS[Number(p.rollNumber) % CODE_SNIPPETS.length]
  p.preview = p.preview.length >= snippet.length ? snippet.slice(0, 30) : snippet.slice(0, p.preview.length + 6 + Math.floor(rnd() * 20))
  p.lastSavedAt = new Date().toISOString()
  if (rnd() > 0.7) p.currentQuestion = 1 + Math.floor(rnd() * p.totalQuestions)
  let event = null
  if (rnd() > 0.9) {
    const type = pick(['window_blur', 'tab_hidden', 'window_blur', 'fullscreen_exit', 'paste'])
    event = { type, ts: new Date().toISOString() }
  }
  return { sessionId: p.sessionId, patch: { preview: p.preview, lastSavedAt: p.lastSavedAt, currentQuestion: p.currentQuestion }, event }
}
