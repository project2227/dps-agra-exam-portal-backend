# DPS Agra Exam Portal — staging deployment status

Last checked: 2026-09-30.

## Live staging infrastructure

- **Frontend:** https://dps-agra-exam-frontend.onrender.com — Render static site, auto-deploy from this repository.
- **Backend:** https://dps-agra-exam-api.onrender.com — separate Render Node web service, auto-deploy from this repository.
- **Database:** separate Neon project `bold-sun-23296322` / database `neondb` / direct TLS-verified connection. Cyber Arena and its database were not modified.
- **Migration:** `001_initial.sql` applied successfully on Neon; `schema_migrations`, `exams`, and `teachers` exist.
- **Automated verification:** repository backend CI succeeded on commit `167eef5bf99c1f0beadf17c1efda2504041bf079`. Independent GitHub-hosted live smoke run `36718459027` succeeded, checking API `GET /api/health` (HTTP 200 and database connected), frontend CORS header, and frontend HTML (HTTP 200).
- **No initial administrator yet:** the teachers table contained 0 accounts at the last check. An authorized adult administrator needs to set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` privately in the new Render backend's Environment tab, deploy once, confirm first sign-in, then remove both bootstrap variables. Never paste the password in GitHub or chat.
- **Not configured:** private S3 upload storage and an isolated Judge0-compatible programming runner. These features are intentionally disabled until their own providers are configured.
- **Not end-to-end verified:** authenticated teacher exam creation, a student's timed test lifecycle, Socket.IO monitoring and browser consent/WebRTC. Do not conduct actual school exams until these tests and privacy/security review are complete.

This setup is on **free-tier staging services**. A production school examination needs dependable compute, retention, backups, monitoring, and an approved data-handling process.

For API integration, see `docs/FRONTEND_CONTRACT.md`. For deployment details, see `docs/DEPLOY.md` and `docs/NEON_FREE_SETUP.md`.
