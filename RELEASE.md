# Plinth and DPS release status — 4 October 2026

Plinth is live at https://plinth-pk84.onrender.com/. Render assigned this hostname; the requested `plinth.onrender.com` was not allocated. DPS remains at https://dpslab.onrender.com/ with its pre-Plinth school design. The services have separate production database branches and release branches: `feature/plinth` for Plinth and `main` for DPS.

## Deployed changes

- Plinth retains its Institute and Workplace sites, branding, themes, guided tour, tenant isolation, teams, tasks, attendance, chat, files and consented sharing.
- Work progress now combines assigned-task summaries with observed activity estimates. Employee CSV reports include editing, interaction, reading, meeting, idle and unknown time, estimated engagement hours, task outcomes, repetition counts, review flags and explicit limitations. Reports are restricted to the employee, their team manager or administrator.
- Writing mode can raise an idle review signal after five minutes and a sustained repetition signal. Reading and meeting modes do not trigger idle-input flags. Browser observation covers the Plinth page; it does not measure work in other applications. The Windows source adds device-idle sensing without a keyboard hook, but a new signed Windows installer has not been produced or tested.
- Optional exam head/gaze analysis is deployed on both sites. A teacher must enable it and a student must separately consent. The CPU model runs locally in a browser worker; its pinned model and WASM are hosted by the app. Head turn, approximate gaze deviation, missing face and multiple faces generate review events only after sustained changes. These events carry zero cheating-score points. No microphone or whisper classifier is included.
- Consent withdrawal and camera shutdown stop local analysis. A rejected optional vision event cannot block the existing tab-switch/fullscreen event queue. Existing account/guest join, autosave, Socket.IO monitoring and submission routes remain in place.
- Server-side SMTP supports Brevo relay settings with required STARTTLS. Relay host, port 2525, username and the active sender are configured privately on Plinth and the DPS API. The SMTP key is missing; email authorization and delivery are not operational yet. The connector cannot export or generate that key. Public organisation provisioning continues to show an actionable unavailable message rather than pretend a verification email was sent.
- An authenticated HTTPS gateway for optional local Ollama task-summary review is supplied. It has not been installed or connected to an organisation PC. See AI_SETUP.md for exact configuration and limits.

## Post-deployment verification

| Check | Result |
| --- | --- |
| Server tests | 52 passed |
| Student-account integration tests | 26 passed |
| Frontend tests | 62 passed |
| Platform/tenant integration tests | 17 passed |
| Desktop policy tests | 3 passed |
| Total automated tests | 160 passed, zero failures |
| Plinth production HTTPS/socket/storage/work-report smoke | 63 checks passed |
| DPS production account/guest exam flow and vision consent smoke | 16 checks passed |
| Staging Institute responsive fixtures | 684 completed; one timeout passed on exact recheck |
| Deployed browser vision model initialization | CPU worker and WASM initialized successfully, without a camera |
| Plinth landing | Public page rendered; horizontal overflow fixed and verified |

The 684 fixture checks cover 54 Institute route variants at 360/768/1440px, light/dark themes and normal/reduced motion, plus eighteen empty and eighteen error states. The `/teacher/grades` 360px/dark/normal populated fixture timed out once and passed when rerun. Completed checks found no measured overflow, unlabelled visible form controls, measured text-contrast failures or page errors. Synthetic transport and data are used. This is not a complete manual accessibility or Lighthouse audit and does not cover every new Workplace screen.

Production exam checks exercise HTTPS cookie login, account and guest check-in, answers, autosave, teacher Socket.IO events, vision permission boundaries, submission and logout. Workplace checks cover tenant access, current consent, work hours, replay prevention, scoped reports and CSV, assigned summaries, shared relay signalling, valid encoded WebM storage, authorised downloads, chat/files, pause and logout. Verification tokens and users are synthetic fixtures, and cleanup is limited to those fixtures. These checks do not establish real email delivery, browser screen capture, camera accuracy or real RTP playback.

The final deployed application revisions are `6c7b7866d5691d51098d8507c77e66c138471c05` for Plinth and `243ec82a239135c21c1517a5304bedd6ff6bbff4` for DPS. This report can be updated without a runtime change.

## Production protection and remaining setup

The public exam-date endpoint and the production SQL gate were checked before deployment; no exam was live or due to start within three hours. A fresh DPS Neon branch backup was verified ready before the additive vision-consent migration. Plinth was provisioned on a separate clone of staging; workplace progress and consent migrations were applied there. A later, additional Plinth snapshot attempt hit the Neon branch quota and did not create a new backup. Existing backup/source branches were retained. No production rollback or database restore occurred.

1. Put the Brevo SMTP key into private Render `SMTP_PASSWORD` and redeploy both configured server services. Never commit it or put it in frontend variables. Then verify controlled delivery and one-time organisation verification/student reset links. Email is currently blocked on this credential.
2. Install Ollama and Node.js 22 on the organisation PC, pull `qwen3:4b`, configure the supplied HTTPS gateway behind an organisation-controlled authenticated tunnel, and set private Render `LOCAL_AI_GATEWAY_URL` and `LOCAL_AI_GATEWAY_KEY`. AI review remains disabled until connected.
3. Validate actual cameras in a supervised pilot. Gaze/head changes and input counts are fallible observations, not proof of cheating or productive/irrelevant work. They do not make grade or employment decisions.
4. Test real browser screen capture, manager/teacher playback, recorded flag clips and TURN across networks. Build, sign and test the Windows companion on Windows before publishing an installer.

See AI_SETUP.md, DESIGN.md, ARCHITECTURE.md and docs/DPS_DESIGN.md for setup, design and preservation details.
