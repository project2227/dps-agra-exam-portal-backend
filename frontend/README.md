# DPS Agra Exam Portal (Frontend)

Computer practical exams, quizzes, IDE practice, handouts and exam scheduling for **Delhi Public School, Agra**.

Made by **Aryan Agarwal**.

This repository is the **frontend only**. It builds to plain static files (HTML, CSS, JS) that run on InfinityFree. The backend (API, database, Socket.IO, code runner) is a separate project hosted on Render.

Without a backend the portal runs in **demo mode** on built-in sample data, so every page can be tried straight away.

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Folder structure](#folder-structure)
4. [Run it locally](#run-it-locally)
5. [Environment variables](#environment-variables)
6. [Demo mode](#demo-mode)
7. [Logo placement](#logo-placement)
8. [Deploy to InfinityFree](#deploy-to-infinityfree)
9. [Push to GitHub](#push-to-github)
10. [Automatic deploys with GitHub Actions](#automatic-deploys-with-github-actions-optional)
11. [Backend API contract](#backend-api-contract)
12. [Realtime events (Socket.IO)](#realtime-events-socketio)
13. [Live video (WebRTC)](#live-video-webrtc)
14. [What the backend must do](#what-the-backend-must-do)
15. [Monitoring and student privacy](#monitoring-and-student-privacy)
16. [Customising](#customising)
17. [Troubleshooting](#troubleshooting)

---

## Features

### Students

| Feature | Details |
| --- | --- |
| Joining | No accounts or enrollment. Students enter name, roll number, class, section and the exam password. |
| Consent | A screen explains exactly what is shared, then asks for webcam and screen permission one at a time. |
| Exam room | Fullscreen, timer, question navigation and mark-for-review. |
| Question types | MCQ, short answer, long answer, coding and file upload. |
| Built-in IDE | Monaco editor with Python, Java, C, C++, SQL, HTML/CSS/JS (live preview) and block coding for junior classes. |
| Checking code | Run code with custom input; submit it to be checked against sample and hidden test cases. |
| Saving | Autosaves to the server with a local backup, so answers survive a dropped connection or a refresh. |
| Monitoring visibility | An indicator (with self-view) is always on screen, and a warning appears for every recorded event. |
| Dashboard | Current and upcoming exams, handouts, exam dates and practice IDEs for the student's class. |
| Practice IDE | Available without signing in. Work is saved in the browser. |

### Teachers

| Feature | Details |
| --- | --- |
| Dashboard | Active exams, upcoming exams, submissions, cheating flags, handouts, and cards for Classes VI to XII. |
| Class management | One computer teacher per class, sections, and participation records built from exam joins. |
| Exam builder | Class or section, timing and duration, password generator, and monitoring toggles. |
| Question builder | MCQ, text, coding (language, starter code, visible and hidden tests) and upload questions. |
| Live monitor | Grid of every student: progress, live typing preview, webcam and screen thumbnails, and flags. |
| Student detail panel | Live webcam and screen (WebRTC), activity timeline, flag counters, device info, and a send-warning box. |
| Submissions | Filter by class, section, exam or roll number. Review answers and test results, award marks, add remarks. |
| Exports | CSV export and PDF export (through the browser's print dialog). |
| Handouts | PDF, DOC/DOCX, PPT/PPTX, images and ZIP uploads, shown to chosen class sections. |
| Exam dates | Schedule with list and calendar views. |

---

## Tech stack

| Package | Used for |
| --- | --- |
| React 18 + Vite 5 | App and build |
| Tailwind CSS 3 | Styling (custom navy / green / orange / gold theme) |
| React Router 6 | Browser router, or hash router for zero-config hosting |
| Axios | REST calls |
| socket.io-client | Realtime monitoring |
| @monaco-editor/react | Code editor (loaded from the jsDelivr CDN at runtime) |
| lucide-react | Icons |

Fonts are Space Grotesk (headings), Inter (body) and JetBrains Mono (code), loaded from Google Fonts.

---

## Folder structure

```
dps-agra-exam-portal-frontend/
├─ public/
│  ├─ dps-logo.png            # School crest (see "Logo placement")
│  └─ .htaccess               # HTTPS redirect + SPA fallback for InfinityFree
├─ src/
│  ├─ App.jsx                 # Routes
│  ├─ main.jsx
│  ├─ config.js               # Env values, classes, sections, languages, proctor event labels
│  ├─ components/
│  │  ├─ common/              # DPSLogoAnimated, GlassCard, StatCard, StatusBadge, Modal, Toast,
│  │  │                       # UploadBox, CalendarList, Field/Toggle, Feedback, Guards, PageHeader
│  │  ├─ layout/              # Navbar, Sidebar, Footer, TeacherLayout, StudentHeader
│  │  ├─ exam/                # QuestionCard, QuestionNav, Timer, AutoSaveIndicator
│  │  ├─ ide/                 # CodeEditorPanel, OutputConsole, TestCasePanel, WebPreview, BlockWorkspace
│  │  ├─ proctoring/          # ProctoringConsentModal, AntiCheatWarningBanner, MonitoringIndicator,
│  │  │                       # StudentMonitorCard, LiveStudentGrid, StudentDetailPanel, VideoTile
│  │  ├─ student/             # ExamCard, HandoutCard
│  │  └─ teacher/             # ClassCard, TeacherExamBuilder
│  ├─ hooks/                  # useAntiCheat, useAutoSave, useExamTimer, useWebRTC
│  ├─ pages/                  # One file per route
│  ├─ services/               # api (REST + demo), socket, proctoring, codeRunner, session, mockData
│  ├─ styles/                 # globals.css, animations.css
│  └─ utils/format.js
├─ .env.example
├─ .github/workflows/deploy-infinityfree.yml
├─ index.html
├─ package.json
├─ tailwind.config.js
└─ vite.config.js
```

### Routes

| Path | Page |
| --- | --- |
| `/` | Landing page (with the About section) |
| `/student/join` | Join an exam |
| `/student/dashboard` | Student dashboard (after joining) |
| `/student/exam/:examId` | Exam room |
| `/student/practice`, `/student/practice/:lang` | Practice IDE (no sign-in needed) |
| `/teacher/login` | Teacher sign in |
| `/teacher/dashboard` | Teacher dashboard |
| `/teacher/classes` | Classes and participation records (`?class=XII` selects a class) |
| `/teacher/exams/create` | Exam builder |
| `/teacher/exams/:examId/monitor` | Live monitor |
| `/teacher/submissions` | Submissions and results |
| `/teacher/handouts` | Handouts |
| `/teacher/exam-dates` | Exam dates |

---

## Run it locally

You need **Node.js 18 or newer** (20 LTS recommended).

```bash
npm install
npm run dev            # http://localhost:5173
```

With no `.env` file the app starts in demo mode.

To connect to your backend:

```bash
cp .env.example .env   # then set VITE_API_BASE_URL
npm run dev
```

To build and preview the production files:

```bash
npm run build          # outputs dist/
npm run preview        # http://localhost:4173
```

Webcam and screen sharing only work on `localhost` or on an `https://` site.

---

## Environment variables

Vite writes these into the build, so **rebuild after changing any of them**.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty | Render backend URL, e.g. `https://dps-exam-api.onrender.com` (no trailing slash). |
| `VITE_SOCKET_URL` | same as API | Socket.IO server, if different from the API. |
| `VITE_SOCKET_PATH` | `/socket.io` | Socket.IO path. |
| `VITE_DEMO_MODE` | auto | `true` forces sample data; `false` forces the backend. If unset, demo mode is on only when `VITE_API_BASE_URL` is empty. |
| `VITE_ROUTER_MODE` | `browser` | `browser` gives clean URLs (needs the bundled `.htaccess`). `hash` gives `/#/...` URLs that work on any static host. |
| `VITE_BASE_PATH` | `/` | Set to e.g. `/exam/` when hosting in a sub-folder. |
| `VITE_SNAPSHOT_INTERVAL_MS` | `10000` | How often students send webcam and screen thumbnails to the monitor grid. |
| `VITE_ICE_SERVERS` | Google STUN | JSON array of ICE servers. Add a TURN server for school networks (see [Live video](#live-video-webrtc)). |

---

## Demo mode

Demo mode uses in-memory sample data, so nothing is saved after a page refresh. Code "runs" return a placeholder, and the monitor shows simulated students.

| What | Value |
| --- | --- |
| Exam password | `DPS-2026` |
| Live exams | Class XII *Python Practical*, Class VIII-A *Web Design Quiz* |
| Teacher login | `teacher@dpsagra.demo` / `demo1234` |

A **Demo data** badge appears in the navbar whenever demo mode is on.

---

## Logo placement

The crest lives at **`public/dps-logo.png`**. It is already included, with the white background removed.

It appears in:

- the landing page hero (large and animated),
- the navbar, the teacher header and the exam room header (small),
- the footer,
- the browser tab (favicon).

The animated version is `src/components/common/DPSLogoAnimated.jsx`. It has a 3D sway, a spinning green/gold/orange ring, an orbit with dots and a glow. On hover it slows down, grows slightly and glows brighter. If the operating system has "reduce motion" turned on, the animation stops.

To replace the logo, overwrite `public/dps-logo.png` with the same file name. A square PNG with a transparent background, at least 400×400 px, looks best.

---

## Deploy to InfinityFree

InfinityFree serves static files from the `htdocs` folder over Apache, so it runs the built `dist/` folder directly.

1. **Create the site.**
   - Create an InfinityFree account and add a hosting account with your domain or a free subdomain.
2. **Turn on HTTPS. This step is required.**
   - Go to Control Panel → *Free SSL Certificates*.
   - Issue a certificate for your domain and install it.
   - Wait until `https://your-domain` opens without a warning.
   - Browsers only allow webcam and screen sharing on HTTPS.
   - The bundled `.htaccess` redirects `http` to `https`. If you need to test before SSL is active, comment out the three `RewriteCond`/`RewriteRule` lines under *Force HTTPS*.
3. **Build with your backend URL.**
   ```bash
   # .env
   VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
   VITE_DEMO_MODE=false
   VITE_ROUTER_MODE=browser
   ```
   ```bash
   npm run build
   ```
4. **Upload.**
   - Open the File Manager (or FTP: host `ftpupload.net`, with your InfinityFree FTP username and password).
   - Go into `htdocs/`.
   - Delete InfinityFree's default `index2.html`, if present.
   - Upload **everything inside `dist/`**: `index.html`, `assets/`, `dps-logo.png` and `.htaccess`.
   - Upload the *contents* of `dist/`, not the `dist` folder itself.
   - `.htaccess` is a hidden file. Enable "show hidden files" in your FTP client (in FileZilla: *Server → Force showing hidden files*).
5. **Check it.**
   - Open `https://your-domain/teacher/login` directly.
   - If it shows the login page, the SPA fallback works.
   - If you get a 404, the `.htaccess` did not upload. Either upload it, or rebuild with `VITE_ROUTER_MODE=hash`.

**Sub-folder hosting** (e.g. `https://your-domain/exam/`):

- Build with `VITE_BASE_PATH=/exam/`.
- Upload into `htdocs/exam/`.
- In `.htaccess`, change the last rule to `RewriteRule ^ /exam/index.html [QSA,L]`.

**Note:** InfinityFree only hosts the frontend. It cannot run Node.js, databases for this app, WebSockets or the code runner. All of those live on Render.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "DPS Agra Exam Portal frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/dps-agra-exam-portal-frontend.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `dist/` and `.env`. Never commit `.env` or any passwords.

---

## Automatic deploys with GitHub Actions (optional)

`.github/workflows/deploy-infinityfree.yml` builds the site and uploads `dist/` to `htdocs/` over FTP on every push to `main`.

1. In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**.
2. Add these four secrets:
   - `FTP_SERVER` = `ftpupload.net`
   - `FTP_USERNAME` = your InfinityFree FTP username (e.g. `if0_12345678`)
   - `FTP_PASSWORD` = your InfinityFree account password (from the control panel)
   - `VITE_API_BASE_URL` = your Render backend URL
3. Push to `main`, or run the workflow from the **Actions** tab.

InfinityFree sometimes limits FTP connections. If a deploy fails, re-run it or upload manually.

---

## Backend API contract

- Base URL: `VITE_API_BASE_URL`.
- All bodies are JSON unless marked *multipart*.
- **Teacher routes** send `Authorization: Bearer <teacherToken>`.
- **Student routes** send `Authorization: Bearer <studentToken>` and `X-Exam-Session: <sessionId>`. Both come from the join response.
- Errors should return `{ "message": "Human readable text" }` with a suitable status code. The UI shows that message directly.
- Return **409** when a student session is already active on another device.

### Endpoints from the original specification

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/auth/teacher/login` | `{ email, password, remember }` | `{ token, teacher: { id, name, email, classes } }` |
| GET | `/api/exams/active` | none | `Exam[]` with status `live` or `upcoming` (never include `passcode`) |
| POST | `/api/exams/join` | `{ examId, name, rollNumber, class, section, passcode, consent, device }` | `{ token, sessionId, student, exam }` |
| GET | `/api/student/dashboard` | none | `{ student, currentExam, upcomingExams, handouts, examDates }` |
| GET | `/api/exams/:id/questions` | none | `{ exam, questions, savedAnswers, serverTime }` (hidden tests and correct answers removed) |
| POST | `/api/exams/:id/answers/save` | `{ sessionId, answers, review, currentQuestion, clientTime }` | `{ ok, savedAt }` |
| POST | `/api/exams/:id/submit` | `{ sessionId, answers, review, reason, flagsCount, clientTime }` | `{ ok, submittedAt }` |
| POST | `/api/proctor/event` | `{ id, examId, sessionId, type, severity, details, ts }` | `{ ok }` (used only when the socket is down) |
| POST | `/api/code/run` | `{ language, code, stdin, examId?, questionId? }` | `{ stdout, stderr, exitCode, timeMs }` |
| POST | `/api/code/submit` | `{ language, code, examId, questionId }` | `{ results: [{ id, hidden, passed, input?, expected?, actual?, timeMs }], passed, total }` |
| POST | `/api/teacher/exams` | exam payload (below) | created `Exam` |
| GET | `/api/teacher/exams/:id/monitor` | none | `{ exam, students: Participant[] }` |
| POST | `/api/teacher/handouts/upload` | *multipart*: `file`, `title`, `description`, `class`, `sections` (JSON array) | `Handout` |
| GET | `/api/handouts` | `?class=` | `Handout[]` |
| GET | `/api/exam-dates` | `?class=` | `ExamDate[]` |

### Additional endpoints the frontend uses

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/teacher/forgot-password` | `{ email }`. Sends a reset link. Always respond `{ ok: true }` so accounts can't be probed. |
| POST | `/api/exams/:id/answers/upload` | *multipart*: `file`, `questionId`. Returns `{ fileId, fileName, size }`. |
| GET | `/api/teacher/overview` | `{ stats: { activeExams, upcomingExams, totalSubmissions, cheatingFlags, handouts }, activeExams, upcomingExams, classes }` |
| GET | `/api/teacher/exams` | `Exam[]` for this teacher (including `passcode`). |
| GET | `/api/teacher/classes` | `ClassSummary[]` |
| GET | `/api/teacher/participants` | `?class=&section=&examId=`, returns `Participant[]` |
| GET | `/api/teacher/submissions` | `?class=&section=&examId=&roll=`, returns `Submission[]` |
| PATCH | `/api/teacher/submissions/:id` | `{ answers, remarks, score }`. Marks the submission `reviewed`. |
| DELETE | `/api/teacher/handouts/:id` | Delete a handout. |
| POST | `/api/teacher/exam-dates` | `{ title, class, section, date, type, notes }` |
| DELETE | `/api/teacher/exam-dates/:id` | Delete an exam date. |

### Main data shapes

```jsonc
// Exam
{ "id": "xii-python-practical", "title": "...", "class": "XII", "section": "All" /* or "A".."F" */,
  "subject": "Computers", "type": "Quiz|Practical|Mixed", "status": "live|upcoming|ended|draft",
  "startsAt": "ISO", "endsAt": "ISO", "durationMin": 90, "passcode": "DPS-ABCD-EFGH" /* teacher routes only */,
  "settings": { "requireWebcam": true, "requireScreen": true, "tabDetection": true,
                "copyPasteRestriction": true, "codeExecution": true },
  "languages": ["python"], "totalMarks": 25, "questionCount": 6 }

// Question as sent to students
{ "id": "q1", "type": "mcq|short|long|code|upload", "marks": 2, "prompt": "...",
  "options": [{ "id": "a", "text": "..." }],                        // mcq
  "maxLength": 300, "minWords": 60,                                  // short / long
  "title": "...", "languages": ["python"], "starterCode": { "python": "..." },
  "visibleTests": [{ "id": "t1", "input": "...", "expected": "..." }],
  "hiddenTestCount": 3,                                              // code
  "accept": ".png,.jpg", "maxSizeMB": 5, "optional": true }          // upload

// Answer values (answers[questionId])
// mcq: "b"   short/long: "text"   upload: { fileId, fileName, size }
// code: { language, drafts: { python: "..." }, lastResult: { python: { results, passed, total } } }
//   web drafts are { html, css, js }; blocks drafts are an array of blocks

// Participant (monitor grid)
{ "sessionId": "...", "name": "...", "rollNumber": "07", "class": "XII", "section": "A",
  "status": "active|submitted|disconnected", "joinedAt": "ISO", "lastSavedAt": "ISO",
  "currentQuestion": 3, "totalQuestions": 6, "answered": 2, "webcam": true, "screen": true,
  "preview": "code being typed", "previewLanguage": "python",
  "flags": { "tab": 0, "blur": 1, "fullscreen": 0, "copyPaste": 0, "devtools": 0, "other": 0 },
  "timeline": [{ "type": "window_blur", "ts": "ISO", "details": {} }], "device": { ... } }
```

The **exam create payload** has everything in `Exam`, plus `instructions` and `questions`.

- Teacher-side questions also include `correct` (for MCQs), `modelAnswer` and `hiddenTests: [{ input, expected }]`.
- **Store these on the server. Never return them to students.**

---

## Realtime events (Socket.IO)

The client connects with `auth: { token, role: "student" | "teacher" }`. Event names are in `src/services/socket.js`.

| Direction | Event | Payload |
| --- | --- | --- |
| student → server | `student:join-room` | `{ examId, sessionId, student, device }` |
| student → server | `student:progress` | `{ examId, sessionId, currentQuestion, answered, total }` |
| student → server | `student:answer-update` / `student:code-update` | `{ examId, sessionId, questionId, questionNumber, language, preview, ts }` (throttled to 800 ms) |
| student → server | `student:snapshot` | `{ examId, sessionId, webcam, screen, ts }`: small JPEG data URLs, every `VITE_SNAPSHOT_INTERVAL_MS` |
| student → server | `student:heartbeat` | `{ examId, sessionId, ts, visible, fullscreen }` every 15 s |
| student → server | `proctor:event` | same shape as `POST /api/proctor/event` |
| server → student | `student:warning` | `{ message }` |
| server → student | `session:conflict` | `{ message }` (locks the exam on this device) |
| server → student | `exam:force-submit` | none |
| server → student | `exam:time-update` | `{ endsAt }` (extra time) |
| teacher → server | `teacher:join-monitor` / `teacher:leave-monitor` | `{ examId }` |
| teacher → server | `teacher:warn-student` | `{ examId, sessionId, message }` |
| server → teacher | `monitor:student-joined` | `Participant` |
| server → teacher | `monitor:student-update` | `{ sessionId, patch }`, where `patch` is any Participant fields (e.g. `preview`, `currentQuestion`, `answered`, `lastSavedAt`) |
| server → teacher | `monitor:student-left` | `{ sessionId, status? }` |
| server → teacher | `monitor:proctor-event` | `{ sessionId, event: { type, ts, details } }` |
| server → teacher | `monitor:snapshot` | `{ sessionId, webcam, screen, ts }` |

Two requirements for the server:

- **Warnings must be echoed.** When the server receives `teacher:warn-student`, it should send `student:warning` to that student **and** `monitor:proctor-event` back to the monitor with `type: "teacher_warning"`. That echo is what adds the warning to the student's timeline.
- **Rooms must be separated.** Keep one room per exam for teachers (e.g. `monitor:<examId>`) and one room per student session. Only teachers of that exam may join its monitor room.

### Proctoring event types

| Type | Meaning |
| --- | --- |
| `tab_hidden`, `tab_visible` | Student left or returned to the exam tab |
| `window_blur`, `window_focus` | Exam window lost or regained focus |
| `fullscreen_exit`, `fullscreen_enter` | Fullscreen left or entered |
| `copy`, `cut`, `paste` | Clipboard attempt |
| `right_click` | Right-click blocked |
| `devtools_shortcut`, `devtools_suspected` | Developer tools shortcut pressed, or tools possibly open |
| `print_screen` | Print Screen pressed |
| `multiple_tabs` | Exam open in another tab |
| `screen_share_stopped`, `webcam_stopped` | Media stopped mid-exam |
| `exam_started`, `exam_submitted` | Session start and end |
| `teacher_warning` | Warning sent by the teacher |

Labels and severities are in `src/config.js`.

---

## Live video (WebRTC)

The design keeps bandwidth low in a busy lab:

- **Grid view:** each student sends a small JPEG of webcam and screen every 10 seconds (`student:snapshot`). This is cheap even with 40 students.
- **Detail panel:** a real-time WebRTC stream opens only while the panel is open, and closes when it closes.

The signalling runs over the same socket:

1. Teacher sends `rtc:request { sessionId, kinds }` to the server, which forwards it to that student.
2. Student sends `rtc:signal { to, description (offer), labels }`.
3. Teacher replies with `rtc:signal { to, description (answer) }`.
4. Both sides exchange `rtc:signal { to, candidate }`.
5. Teacher sends `rtc:stop { sessionId }` when the panel closes.

The server only relays these messages. On every relayed message it must add `from` (the sender's socket id) and `sessionId` (the student's exam session).

**TURN server:** school networks often block direct peer-to-peer connections. For reliable live video, add a TURN server in `VITE_ICE_SERVERS`, for example a hosted TURN service or your own coturn. Without one, live video may fail, but snapshots, typing preview and flags keep working.

---

## What the backend must do

The frontend reports events and enforces the rules on screen, but the **server is the source of truth**. The backend should:

- **CORS:** allow your InfinityFree origin (e.g. `https://exam.dpsagra.example`) for REST and Socket.IO.
- **Session locking:** allow one active session per `(examId, rollNumber, class, section)`. A second join should return 409, or emit `session:conflict` to the old session, and log a `multiple_tabs`-style flag.
- **Time limits:**
  - Enforce `startsAt`/`endsAt` and each student's `durationMin` on the server.
  - Reject saves and submissions after the deadline plus a small grace period.
  - Send `serverTime` so client timers stay aligned with the server.
- **Sandboxed code runner:**
  - Run code only in isolated containers (e.g. a Judge0 instance or Piston).
  - Set CPU, memory, time and output limits, and disable network access.
  - Grade with the tests stored on the server, never with tests sent from the browser.
- **Never expose answers:** strip `correct`, `modelAnswer` and `hiddenTests` before sending questions to students.
- **Passwords:** hash teacher passwords (bcrypt or argon2), rate-limit login and join attempts, and compare exam passwords without regard to case.
- **Uploads:** check file type and size on the server, and store files outside the web root or in object storage.
- **Render cold starts:** the free Render plan sleeps after inactivity, so the first request can take up to about a minute. Open the portal once before the exam starts, or use a paid instance during exams. The frontend already shows a friendly "server may take up to a minute to wake up" message.

---

## Monitoring and student privacy

The portal is built for **transparent** proctoring:

- Students see the rules and give consent before joining.
- A consent screen explains each item before anything is shared.
- The browser asks for every permission, and each permission starts only when the student clicks a button.
- A monitoring indicator with self-view is visible for the whole exam.
- Every flagged event shows the student a warning at the time it happens.
- Webcam and screen sharing stop the moment the exam is submitted, and nothing runs afterwards.
- No audio is captured.
- Flags are signals for a teacher to review, not automatic penalties. The UI says so in both the monitor and the student consent screen.

Before using the portal with real students, please:

- follow the school's exam and data-protection policies,
- tell students and parents that monitoring is used,
- decide how long snapshots, flags and recordings are kept, and delete them after results are final.

---

## Customising

| What | Where |
| --- | --- |
| Classes, sections, languages per class, starter code | `src/config.js` |
| School name, department, motto | `SCHOOL` in `src/config.js` |
| Colours, shadows, fonts | `tailwind.config.js`, `src/styles/globals.css` |
| Logo animation | `src/components/common/DPSLogoAnimated.jsx`, `src/styles/animations.css` |
| Proctor event labels and warning text | `PROCTOR_EVENTS` in `src/config.js` |
| Demo data | `src/services/mockData.js` |
| Footer credit | `src/components/layout/Footer.jsx` (the landing page About section also credits Aryan Agarwal) |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Webcam or screen share buttons do nothing | The site must be on `https://`. Check SSL on InfinityFree. Screen sharing needs desktop Chrome or Edge. |
| 404 when refreshing `/teacher/...` | `.htaccess` is missing from `htdocs`. Upload it, or rebuild with `VITE_ROUTER_MODE=hash`. |
| "Cannot reach the exam server" | Check `VITE_API_BASE_URL`, CORS on the backend, and whether Render is waking up. Rebuild after changing `.env`. |
| Editor stuck on "Loading editor" | Monaco loads from `cdn.jsdelivr.net`. Make sure the school firewall allows it. |
| Live video never connects | Add a TURN server to `VITE_ICE_SERVERS`. |
| Changes to `.env` don't apply | Vite values are baked in at build time. Run `npm run build` again and re-upload. |

---

© Delhi Public School, Agra. Made by Aryan Agarwal.
