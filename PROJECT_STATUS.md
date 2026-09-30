# Implementation and verification status

**Implemented in code:** teacher/admin auth and class restrictions; exam/question CRUD; hashed passcodes; temporary exam-scoped student JWTs with stored token digests and uniqueness protection; answers/autosave/final submission/MCQ scoring; optional external Judge0 integration; optional private S3 storage; handouts and dates; teacher monitoring; WebSocket signaling/status; anti-cheat logging for human review; CSV exports; automated SQL migrations; GitHub CI; Render Blueprint; frontend API integration guide.

**Locally checked:** JavaScript syntax via `node scripts/check.js`; source-level tests via `node --test tests/*.test.js`.

**Not yet verified:** dependency installation in a networked runtime; PostgreSQL migrations against a freshly provisioned separate DB; full real HTTP test against a deployed Render service; S3 provider access; Judge0 execution; browser WebRTC/media consent and UI, because the separate frontend is not part of this backend package. These must be validated on dedicated staging infrastructure before real students use the system.

**Not provided:** frontend screens, automated recording, hidden webcam/screen access, a local code execution sandbox, automated student misconduct verdicts. These are intentionally excluded or depend on the separate frontend/providers.

**Deployment blocker:** this project requires a separate GitHub repository and separate database. Never deploy the exam portal into the currently connected `project2227/cyber-arena-classroom` repository or reuse its database.
