Student accounts are school-managed. Teachers use Classes → Student accounts to add students, validate CSV rows and print one-time credentials. The admission number is the username. Temporary passwords expire after seven days; first sign-in requires a new password. Guest entry defaults to enabled per exam. Manage hosted exams controls guest entry and result release.

Accounts use opaque, hashed server sessions with Secure, httpOnly, SameSite=None, partitioned cookies, allowlisted origins and CSRF tokens. Normal sessions expire after two hours; remembered sessions after seven days. The same-origin API-hosted portal provides a direct sign-in option for browsers that block cross-site cookies. Teacher bearer tokens are no longer accepted. Exam session tokens remain separate to preserve the existing room, autosave and proctoring contract.

Database migration 009 is additive. Test it on an isolated Neon branch. Before production migration, retain a Neon snapshot and previous Git commit. `npm test` runs unit, frontend and PostgreSQL-backed HTTP/Socket.IO account/regression tests. `npm run check` verifies syntax. Root installation also builds the frontend for the API's same-origin portal.

Legacy linking defaults to dry-run: `node scripts/link-guest-students.js`. Review skipped and candidate entries, then pass `--apply --reviewed-digest=<digest>`. Matching requires roll number, class and section plus an identical normalized name. Ambiguous and mismatched records are left untouched for a teacher to review. A changed candidate set aborts application. The script preserves all exam records.

Email resets require SMTP_URL and MAIL_FROM in the backend environment. SMTP credentials never enter the frontend or repository. Reset links expire in 30 minutes, are hashed at rest and single-use. Teacher-issued password resets always work without email. Do not claim an email was sent if delivery is unavailable.

Account deletion requests are teacher-reviewed. Approval disables sign-in, removes optional profile details and preserves school exam records. It does not silently purge official records.

Set ACCOUNT_RELEASE_SMOKE=true for the rollout. The server tests the public HTTPS endpoint using random synthetic teacher/student/exam records, then removes only those fixtures. Watch for `[release smoke] PASS` before accepting a release. On failure, redeploy the previous Git build and restore the pre-release Neon snapshot, then fix and retry.
