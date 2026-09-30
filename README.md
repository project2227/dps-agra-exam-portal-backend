# DPS Agra Exam Portal — backend

Separate backend for an institution-operated computer-practical / quiz website. **Not related to the Cyber Arena code or database.** Node 20+, Express, Socket.IO and PostgreSQL. Static HTML/CSS/JS frontend can live at InfinityFree; CORS accepts the explicitly configured origin only. No permanent student registration or student password accounts are created.

## Included

- Admin-provisioned teacher accounts; teacher JWT login; class groups.
- Teacher-owned draft/scheduled/active/closed exams; passcodes are bcrypt hashes; questions: MCQ, short, long, code, file.
- Time-limited passcode-based student participation with one live session per roll/exam/class/section; browser metadata is limited and IP storage defaults **off**. Teachers can revoke a session to let a student rejoin.
- Autosave and final submissions, MCQ scoring, manual marking, code-test grading through a separately configured Judge0-compatible isolated execution service.
- Handouts / file answers through private S3-compatible object storage; 5-minute download links; exam-date CRUD.
- Live teacher monitoring, browser-reported activity flags for human review, teacher warnings, optional manually revoked sessions.
- Consent-gated **WebRTC signaling only** (teacher never receives media via server). No capture or recording backend. Frontend must display monitoring status, request browser-level webcam/screen permission, and implement WebRTC peers itself.
- CSV reporting, rate limits, strict CORS, SQL parameterization, transactional database migrations and submission locking.

## Before using with actual students

This is a deployable backend foundation, **not a certified school proctoring system**. Independently review school policy, parental/guardian requirements where applicable, technical security, hosting agreements, access control, data retention, accessibility and consent UX. Browser-reported activity is not proof of cheating and never triggers automatic failure. No webcam/screenshare is started by this backend. Add institutional media/privacy review and fail-safe network handling before a supervised exam. The code runner and file storage deliberately fail closed until configured. Perform end-to-end integration tests with the separate frontend and real managed infrastructure.

**Do not rely on Render Free for live examinations.** Render Free web services sleep and Free Postgres expires after 30 days. Use a persistent, backed-up database and paid/always-on web service for production. Avoid any shared database with Cyber Arena. See `docs/DEPLOY.md`.

## Local setup

```bash
node --version # >=20
npm install
cp .env.example .env
# Create your own isolated PostgreSQL database; fill DATABASE_URL, separate auth secrets, FRONTEND_URL.
npm run check
npm test
npm run migrate
npm start
```

Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12+ chars) and optionally name for the **first start only**, before any teacher account exists. The initial administrator is created once. **Remove the bootstrap password from environment after first success**, then restart. Public teacher registration is intentionally disabled. Admins create teachers with `POST /api/auth/teacher/register` using the admin JWT.

Health check: `GET http://localhost:5000/api/health`. The server refuses to start if migration or DB connection fails. `node --test` unit/contract checks don't require live database; this is not a substitute for staging database/integration tests.

## Authentication

**Teacher:** `POST /api/auth/teacher/login` with `{ "email": "...", "password": "..." }`. Use returned JWT as `Authorization: Bearer <token>`. Only admin users may register teachers.

**Student:** `GET /api/exams/active?className=IX&section=A`, then `POST /api/exams/:id/join` with:

```json
{
  "name": "Student Test", "rollNumber": "17", "className": "IX", "section": "A",
  "passcode": "TEACHER_PROVIDED_PASSCODE",
  "browserMetadata": { "browser": "Chrome", "os": "Windows", "screenSize": "1366x768", "timezone": "Asia/Kolkata" },
  "consent": { "webcam": false, "screenShare": false }
}
```

Returns a JWT restricted to **that one exam session**. Store it in client memory / session storage only while needed; don't reuse teacher token for student routes. For webcam or screen-required exams, the browser should show a clear choice and must obtain independent browser media permission after consent. If permission is refused, do not claim streaming is active. A student can't bypass a required consent flag to join, but the server cannot prove media is streaming; teacher dashboard reports status received from the student's browser. Don't silently start media or automatically fail because of missing media.

A duplicate active roll/class/section is rejected with 409 and a review flag; teacher may explicitly reset using `POST /api/teacher/sessions/:id/reset` (after verifying identity). The previous token then becomes invalid. The server also enforces each student's duration relative to their join time.

## REST API

**Public**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | DB-ready health check |
| GET | `/api/exams/active?className=&section=` | Active exams (no passcodes) |
| POST | `/api/exams/:examId/join` | Exam-scoped participation token |
| GET | `/api/handouts?className=&section=` | Public handout metadata, no files |
| GET | `/api/exam-dates?className=&section=` | Public exam schedule |

**Teacher (Bearer token)**

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/teacher/login` | Teacher login (unauthenticated) |
| GET | `/api/auth/teacher/me` | Teacher identity |
| POST | `/api/auth/teacher/register` | Admin creates teacher |
| GET, POST, PUT | `/api/teacher/classes` (`PUT .../:id`) | Class groups; edits admin only |
| GET | `/api/teacher/dashboard` | Summary |
| GET, POST | `/api/teacher/exams` | Teacher exams |
| GET, PUT, DELETE | `/api/teacher/exams/:examId` | Exam detail/edit/delete (draft only deletion) |
| POST | `/api/teacher/exams/:examId/generate-passcode` | Set or generate passcode (shown once) |
| POST | `/api/teacher/exams/:examId/publish` | Publish draft/scheduled exam |
| POST | `/api/teacher/exams/:examId/close` | Close exam |
| GET, POST | `/api/teacher/exams/:examId/questions` | Questions incl. answers for owner |
| PUT, DELETE | `/api/teacher/questions/:questionId` | Draft questions |
| POST | `/api/teacher/handouts/upload` | `multipart/form-data` field `file` + metadata |
| GET | `/api/teacher/handouts` | Teacher's handouts |
| DELETE | `/api/teacher/handouts/:id` | Delete handout |
| GET | `/api/teacher/handouts/:id/download` | 5-minute signed link |
| GET, POST | `/api/teacher/exam-dates` | Teacher's exam dates |
| PUT, DELETE | `/api/teacher/exam-dates/:id` | Update/delete own date |
| GET | `/api/teacher/exams/:examId/monitor` | Student status and flags |
| GET | `/api/teacher/exams/:examId/proctor-events` | Human-review timeline |
| GET | `/api/teacher/sessions/:sessionId/proctor-events` | Student event timeline |
| POST | `/api/teacher/sessions/:sessionId/reset` | Revoke an interrupted session |
| GET | `/api/teacher/exams/:examId/submissions` | Submissions/aggregate marks |
| GET | `/api/teacher/submissions/:sessionId` | Answers, manual review, signed files |
| PUT | `/api/teacher/answers/:answerId/marks` | Manually award marks <= maximum |
| GET | `/api/teacher/exams/:examId/export.csv` | Spreadsheet-safe report |

**Student (exam-scoped Bearer token)**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/student/session` | Current session metadata (no token hash) |
| GET | `/api/student/exams/:examId/questions` | Visible questions; never answers or hidden tests |
| POST | `/api/student/exams/:examId/answers/save` | Autosave answer text / code |
| POST | `/api/student/exams/:examId/submit` | Finalize; MCQ auto-score |
| POST | `/api/code/run` | Visible tests via external sandbox |
| POST | `/api/code/submit` | Hidden tests via external sandbox, no hidden input/output disclosure |
| POST | `/api/student/answers/:questionId/file` | Upload answer file, 8 MB max |
| GET | `/api/student/handouts/:id/download` | 5-minute signed link, scoped to class |
| POST | `/api/proctor/event` | Browser-reported event for teacher review |

See `docs/FRONTEND_CONTRACT.md` for request examples, Socket.IO events, onboarding and UI responsibilities, and `docs/DEPLOY.md` for Render settings.

## Exam creation payload

```json
{
 "title":"Class IX Practical 1", "subject":"Computers", "className":"IX", "section":"A",
 "examType":"mixed", "startTime":"2026-11-01T03:30:00.000Z", "endTime":"2026-11-01T05:30:00.000Z",
 "durationMinutes":90,
 "settings":{"requireWebcam":false,"requireScreenShare":false,"enableTabSwitchDetection":true,
 "enableCopyPasteDetection":true,"enableFullscreenMode":false,"enableCodeRunner":false,
 "allowLateJoin":true,"monitorAnswerText":false}
}
```

`POST /api/teacher/exams/:id/questions` payload example:

```json
{"type":"mcq","title":"What does RAM stand for?","description":"Pick one option.",
 "options":["Random Access Memory","Read All Memory","Remote Array Machine"],
 "correctAnswer":"Random Access Memory","marks":2,"order":1}
```

For code questions: `type:"code"`, `language:"python"`, `starterCode`, `visibleTestCases` and `hiddenTestCases` arrays of `{stdin,expectedOutput}`; don't accidentally store the hidden case in visible. `GET` student questions strips both canonical MCQ answers and hidden cases. If code runner is not configured it responds 503 and can be manually graded; it never executes submissions inside the main Node process.

## Safety and scaling notes

- Socket.IO uses authenticated teacher/exam-scoped student connections; state is in PostgreSQL. **Do not horizontally scale** this single-instance Socket.IO service without adding a Redis adapter, pub/sub and presence management. Lost WebSocket connections are not graded as cheating.
- HTML/JS frontend must implement a visible consent and sharing status panel, `getUserMedia()` / `getDisplayMedia()` after explicit interaction, secure stop buttons, and peer connection using scoped WebRTC signaling. No monitoring can be silent.
- `DEVTOOLS_SUSPECTED`, blur, paste or similar browser signals are inherently noisy and forgeable. Teacher reviews event timelines; no server-side automatic fail.
- File uploads deliberately accept only PDF, PNG, JPG, small UTF-8 text; for institutional use add antivirus/content disarm, secure object retention and administrator deletion workflows before permitting arbitrary student files.
- Run paid persistent PostgreSQL with backups for real school exams; configure appropriate school-approved retention and administrator access reviews. A separate staging deployment/database is strongly recommended.

## Dependency lockfile

The source distribution does not include `package-lock.json`; run `npm install` in an environment with npm registry access and commit its generated lockfile. Switch the GitHub Actions and Render build commands to `npm ci` afterward so future builds are reproducible. Never copy dependency locks from a different project.
