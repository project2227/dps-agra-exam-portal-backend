# Deploy DPS Agra Exam Portal (SEPARATE from Cyber Arena)

## 1. GitHub

Create **a new empty repository** named `dps-agra-exam-portal-backend`; DO NOT overwrite `cyber-arena-classroom`. Push this project root (with `src`, `db`, `docs`, `render.yaml`, etc.) to `main`. Never commit `.env`, tokens, S3 keys, passwords, student records or live passcodes.

## 2. PostgreSQL

Create an independent, **persistent and backed-up** managed PostgreSQL database. Render Postgres is one option. Keep it isolated from the Cyber Arena database. The production database connection URL goes into the Render service's `DATABASE_URL` variable, never in GitHub. If needed set `DATABASE_SSL=true` (TLS termination depends on the chosen database provider and connection URL). Migration files under `db/migrations` apply automatically at startup with an advisory lock and a schema migrations journal; never modify an applied migration; add `002_...sql`, `003_...sql` instead. Backup data before applying a migration.

## 3. Render web service

Create **a new** Node web service connected to the new GitHub repo. `render.yaml` contains a staging web-service Blueprint; you can alternatively use manual creation. Settings:

- Root directory: repository root (`.`)
- Runtime: Node (Node 20+)
- Build: `npm install && npm run check && npm test`
- Start: `npm start`
- Health path: `/api/health`
- Auto-deploy from `main` after the GitHub Actions test checks pass.

Set (in Render environment, NOT GitHub):

```text
NODE_ENV=production
FRONTEND_URL=https://YOUR-INFINITYFREE-DOMAIN
DATABASE_URL=<the NEW independent database URL>
DATABASE_SSL=true
JWT_SECRET=<unique long random secret >=32 chars>
STUDENT_SESSION_SECRET=<DIFFERENT long random secret >=32 chars>
FINGERPRINT_PEPPER=<different secret >=16 chars>
STORE_IP=false
UPLOAD_PROVIDER=disabled
BOOTSTRAP_ADMIN_EMAIL=<initial administrator email, first startup only>
BOOTSTRAP_ADMIN_PASSWORD=<unique 12+ char password, first startup only>
```

First startup applies SQL migration and creates the first admin if and only if **there are zero existing teachers**. Verify `/api/health` returns `ok: true` and `database: connected`, then **remove `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_ADMIN_EMAIL` from Render variables** and restart. Sign in with `/api/auth/teacher/login`, create additional teachers using the admin-only endpoint.

For small non-sensitive PDFs and classroom handouts, a bounded Neon-backed file store can be enabled with `UPLOAD_PROVIDER=postgres` and `API_PUBLIC_URL=https://YOUR-BACKEND.onrender.com` (64 MB shared app quota, maximum 5 MB per file, or 2 MB for TXT). This stores files in the same Neon database as your application, so database storage usage and backups will increase. Never use this for video, large uploads, or confidential student records. Five-minute download links are generated only after the appropriate session or teacher authorization. For substantial production file uploads, enable `UPLOAD_PROVIDER=s3` and add `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and (only for non-AWS S3-compatible providers) `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE`. Keep bucket PRIVATE, use restricted IAM credentials. Uploads are disabled until these are set; Render's ephemeral disk is not used.

For programming questions, provision your own Judge0-compatible isolated runner and set `JUDGE0_API_URL` (HTTPS), plus `JUDGE0_API_KEY`, `JUDGE0_API_HOST` or `JUDGE0_AUTH_TOKEN` as needed for that provider. Verify the provider's language IDs and limits before a live exam. Do not use untrusted student code on the Render main service. A code question with hidden tests needs them populated to award automatic marks.

**School deployment:** a Free Render web service spins down on inactivity, and Render Free Postgres expires after 30 days; neither is appropriate for an important live school exam. Select a reliable always-on plan, separate persisted database, backups, monitoring, and rehearse reconnect behavior before scheduling any exam. See Render documentation: https://render.com/docs/free.

## 4. InfinityFree frontend

Build frontend separately as vanilla HTML/CSS/JS or your preferred static build output; upload its static artifacts to `htdocs`. Set its API base URL to your NEW DPS exam Render service, not the Cyber Arena endpoint. Configure `FRONTEND_URL` to match the exact address-bar origin (scheme, domain, no path) and redeploy if that origin changes. Use HTTPS for media permissions and bearer tokens.

Frontend needs explicit student consent UX for webcam/screen, browser permissions, visible ongoing status, a stop-sharing control, and a direct WebRTC PeerConnection between student and teacher. Backend provides Socket.IO signaling only. No media recording feature is present.

## 5. Verification

1. `npm run check && npm test` locally or as part of Render Build.
2. `GET /api/health` → database connected.
3. `npm run smoke` with `EXAM_API_URL=https://YOUR-DPS-API.onrender.com`: checks health and 401 auth boundaries WITHOUT creating student data.
4. Login as admin; create a teacher; teacher creates an exam and multiple question types.
5. Generate passcode and publish. Verify hidden correct answers and hidden code tests are absent from student questions API.
6. Join with a test student and valid passcode; test incorrect passcode and duplicate session rejection.
7. Autosave, final submit, verify no edits after submitting, teacher report and manual marks.
8. Verify Socket.IO teacher monitor events; simulate tab-switch flag and verify it requires human review.
9. Test S3 upload/download with short-lived URLs only **after** configuring S3.
10. Run coding submissions with benign hello-world code only after configuring the isolated runner.
11. Independently test consent-based WebRTC in the separate frontend. No webcam/screen capture should start before explicit student action.

Initial code-unit tests do not prove all 11 staging end-to-end tests; don't conduct a real exam until those pass.

## 6. Initial school setup

Admin creates class groups (`POST /api/teacher/classes`) before publishing exams and provisions teachers with `assignedClasses` entries matching class group names, such as `["IX","X"]`. Non-admin teachers are restricted to their assigned classes for exam/handout/date creation. If the class is not configured or a teacher is unassigned, the service returns a controlled 400/403 rather than silently granting access.

### Dependency reproducibility

The delivered source contains `package.json` but no generated `package-lock.json`. On your first network-enabled developer/CI machine, run `npm install` and commit the generated `package-lock.json`; then change CI/Render build command from `npm install` to `npm ci` to keep deployments deterministic. Do not generate a fake lock file or copy one from the Cyber Arena project.
