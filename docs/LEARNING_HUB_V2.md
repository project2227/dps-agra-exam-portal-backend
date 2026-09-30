# Learning Hub v2 — deployment notes

This project is an **independent student-built teaching and practice prototype**, not an official Delhi Public School Agra system. Official school website: https://dps.ac.in/. Do **not** import real student lists or launch live proctored examinations without written school authorization, a privacy review and production-grade hosting.

## Student features (free staging)

- Seven original downloadable beginner PDFs with curated documentation references.
- Standalone Python (Pyodide in a browser Worker), SQL (SQLite WASM in a browser Worker), HTML/CSS/JS isolated preview, and block coding; no exam token and no private API key required. Java/C/C++ are editor + teaching content only until a separate isolated compiler is configured. First Python/SQL run requires a browser download from public CDN; browser workers have execution timeouts and are discarded after use, but this is for learning, not a hostile-code secure sandbox. Never paste private credentials into the practice editor.
- Practice arcade (three question games), self-contained Class IX 15-minute mock exam, course checklists, private device-local lesson notes and light/dark theme. Mock scores are **unofficial**.
- Optional **nickname-only** practice profile, separate from temporary school exam sessions. Practice profiles deliberately do not ask for student email or roll number; logins have 7-day tokens stored in sessionStorage and offer account deletion. Informal game scores can be reported by browsers and therefore are **not** official verified marks.

## Teacher features (school-authorized accounts only)

- Authenticated staff create courses with lesson text, verified quiz questions and HTTPS resource links. Private join codes are stored using a keyed HMAC and shown only at course creation. A student must actively join with that code for pseudonymous quiz scores to become visible to that specific course teacher. Student questions never include answer indexes; final scores are verified on the backend.
- Free browser-side handout assistant: locally extracts **selectable text** from a teacher-selected PDF (max 12 MB, up to 30 pages). Deterministic keyword drafting works without an AI model; experimental Chrome local LanguageModel support is available when the browser/hardware supports it. **No hosted generative AI API is included or claimed free.** Automatic output is a *draft* and **requires teacher verification** before publishing. Scanned PDFs need separate OCR; no file is uploaded automatically.
- Teacher-only persistent group chat (plain text and HTTPS resource links), role-checked Socket.IO live delivery with REST fallback. Do not post private student data in chat.
- Administrator-only staff enrollment and deactivation; self-service teacher password change. Never make staff registration public or bootstrap an administrator on behalf of an unapproved school project.
- Teacher-owned grade aggregates, missing-mark indicators and **draft** printable marksheets (browser Print → Save as PDF). Marks are not official until a school-approved reviewer certifies them; proctor flags are review-only.

## Database and API

- Versioned additive migration: `db/migrations/002_learning_hub.sql`, adding `practice_users`, `courses`, `course_enrollments`, `course_attempts`, `practice_game_results`, and `teacher_community_messages` only. Existing guest exam participation remains unmodified; Cyber Arena remains untouched.
- Practice/profile APIs under `/api/learning/`; teacher course/community/staff APIs under `/api/learning/teacher/` and grade summary under `/api/teacher/exams/:id/grade-summary`.
- Backend health response includes version `2.0.0-learning-staging` when the updated backend is actually running.

## Still required before real school rollout

- Written school authorization, privacy/guardian consents, HTTPS-only frontend, a dedicated reliable database and always-on backend with approved backups and deletion policies.
- Authenticate an **adult** school administrator (currently zero teachers). Do not publish sample credentials or grant student accounts staff privileges.
- Configure private object storage for actual uploaded PDFs, scanning/retention controls for all handouts, and a separate Judge0-compatible sandbox to grade Java/C/C++ and other compiled code.
- Add e2e browser regression tests for the free CDN-loaded Python/SQL runners, classroom traffic tests, teacher administration, image-PDF OCR handling and post-deployment smoke verification before accepting real classes or grades.
