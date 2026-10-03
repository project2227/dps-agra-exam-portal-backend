# Plinth release status — 3 October 2026

The web application is deployed to staging at https://plinth-stage-20261003.onrender.com/. It is not released to DPS production. Source is preserved on `feature/plinth` in `project2227/dps-agra-exam-portal-backend`.

## What changed

- Tenant-isolated Institute and Workplace sites, branding, ten light/dark themes, an accessible guided tour and a new Plinth landing page.
- Existing DPS exams, student accounts, learning, IDEs, teacher tools and proctoring retained; Institute attendance, timetable, announcements and fee records added.
- Workplace teams, tasks, attendance, explicit monitoring consent, policy/work-hour checks, shared WebRTC signalling, flag clips, membership-controlled chat and files.
- A thin Electron bridge with an always-visible sharing badge, pause, restricted IPC/navigation and a signing-required Windows release configuration.
- Brevo HTTPS transactional email and TLS SMTP support shared by organisation verification and student password resets. Server credentials never enter the frontend or repository.
- Migration and storage-quota enforcement, export/deletion controls, feature settings and tenant isolation tests. Printed student slips use the organisation's name and current site address.

## Verified

| Check | Result |
| --- | --- |
| Server tests | 47 passed |
| Existing student-account integration tests | 26 passed |
| Frontend tests | 56 passed |
| Platform/tenant integration tests | 15 passed |
| Desktop bridge policy tests | 3 passed |
| Total automated tests | 147 passed, zero failures |
| JavaScript checks | Passed |
| Optimised frontend and separate staging visual builds | Passed |
| Deployed HTTPS/socket/storage smoke | 46 checks passed |
| Real Institute IDE preview | HTML rendered and JavaScript console output confirmed in the browser |
| Responsive Institute route matrix | 684 checks completed; one timed-out fixture passed on recheck |

The deployed smoke exercises student login and first password change, guest and account exam join, answer autosave, monitor Socket.IO events, proctor flags and submission. It also exercises synthetic Workplace provisioning, organisation login, roles, consent, hours, relay signalling, severity, valid WebM storage and authorised downloads, chat/files, pause and logout. The Workplace verification token is explicitly a staging fixture; this is not proof of email delivery. The uploaded WebM is a valid encoded test file; this is not proof of browser screen capture or real RTP playback.

The browser matrix covers 54 Institute route variants at 360/768/1440px, in light/dark mode and normal/reduced motion (648 populated checks), plus 18 empty and 18 error states. It uses synthetic records and transport, without real capture or credentials. No overflow above 2px, unlabelled visible form controls, measured text-contrast failures or page errors were found. One teacher-login fixture at 768px/light/reduced timed out and then passed when rerun. This is a DOM/layout check, not a complete screen-reader, manual contrast or Lighthouse audit. New Workplace screens and actual media still need the release checks above.

## Production protection

Production stays at `d62579178142e9d70c790a63f5dc2fe1c7c0b39a`. No production environment variables or database migrations have been applied. A retained Neon branch backup was created and verified ready before staging migrations. The active-exam/next-three-hours SQL gate returned no exams during this session. Recheck the public schedules for every class and the SQL gate immediately before any production migration/deploy.

The cloned staging database applied migrations 010 and 011 successfully. Earlier staging build and smoke-harness problems were fixed before the successful deployment. There have been **no production rollbacks** and no production database restore.

## Unresolved release gates

1. **Real email delivery.** This session exposes no Brevo tool/connection and has no private Brevo credential or verified sender. Public site creation remains disabled with a clear message; it does not issue a fake verification link. Configure `MAIL_PROVIDER=brevo`, `BREVO_API_KEY` and `MAIL_FROM` only in the private Render service environment, using a sender verified in Brevo. The Brevo API key is different from an SMTP key. Then verify inbox delivery, one-time verification/provisioning and a real school-email password reset. Standard SMTP ports are blocked on Render's free plan; HTTPS avoids that restriction.
2. **Actual browser media.** Run the Institute and Workplace flows with real `getDisplayMedia`/`MediaRecorder`, teacher/manager stream playback and review of a browser-produced flag clip. The current relay and storage checks do not replace this test. Validate TURN across different networks.
3. **Windows release.** No Windows runtime, trusted signing certificate or update-feed credentials are available. Test reboot, pickerless consent-gated capture, active-window sensing, webcam-off behaviour, persistent badge and pause on Windows; publish only a genuinely signed installer. The download endpoint remains unavailable until that artifact exists.
4. **Tenant subdomains.** No owned wildcard domain or DNS credentials are available. Staging uses functional `/t/:slug` addresses. No unregistered subdomain is represented as live.

Production deployment remains conditional on the user's specified release gates. Once they pass: recheck exams, retain a fresh backup, deploy the tested build and migrate, run the production smoke, and automatically revert the build and restore the backup if the smoke fails.

See DESIGN.md, ARCHITECTURE.md, COMPLIANCE.md and docs/DPS_DESIGN.md for the design, preservation baseline and operational details.
