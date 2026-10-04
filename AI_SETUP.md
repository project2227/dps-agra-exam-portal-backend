# Local AI and email setup

Plinth production: https://plinth-pk84.onrender.com. Render assigned this hostname; `plinth.onrender.com` was not allocated. DPS continues at https://dpslab.onrender.com with its pre-Plinth design.

## Exam head and gaze signals

No GPU server is needed. MediaPipe Face Landmarker 0.10.32 runs in a browser worker using CPU at about three frames per second. The pinned model and WASM are served by the website; the build verifies model SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`. Google describes Face Landmarker and recommends workers for video inference: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js.

Teachers enable **Local head and gaze signals** in an exam's monitoring rules. It is off by default. The student sees a separate optional checkbox before Start exam; declining never prevents starting. With consent, look straight at the screen for four seconds to establish a neutral position. Pause and Recalibrate remain visible in the exam room. Approximate gaze deviation, head turn, missing face and multiple faces must persist for eight seconds; alerts have a sixty-second cooldown per type. New flags appear in the existing monitor and carry zero cheating-score points. Existing screen/webcam permissions and exam integrity checks remain intact.

No frames, face landmarks, biometric identity or embeddings are uploaded by this analysis. Existing separately consented live webcam sharing remains independent. Glasses, camera angle, skin visibility, lighting and disability can affect results. These are experimental review signals, not calibrated eye tracking and not evidence of peeking or misconduct. No microphone is enabled. Whisper detection is not implemented; voice activity alone would not establish whispering or cheating.

Use Chrome or Edge on a secure HTTPS page with a webcam and Web Worker/OffscreenCanvas support. If model loading or camera analysis fails, an explicit status is shown and the exam continues. Actual-camera accuracy and low-end device performance must be assessed in a supervised pilot; synthetic/API checks cannot establish accuracy.

## Work progress and reports

Employees accept an updated notice before aggregate observation. During an active sharing session only, the website sends input-event counts, edit sizes, repeated-key counts and idle seconds every thirty seconds. Password/private inputs are excluded; no typed text or clipboard is uploaded. Browser observation covers the Plinth page only. The Windows companion uses GetLastInputInfo for device idle without a keyboard hook; other applications' text is never read. The companion must be rebuilt and installed to get the new idle field.

Use Writing/editing, Reading/research or Meeting/discussion modes. Writing mode generates a human-review idle signal after five minutes, and sustained held-key activity may generate a repetition signal. Reading and meetings do not generate idle-input flags. None of these establishes productive or irrelevant work. Device activity can be spoofed; task outcomes and human review remain necessary.

**Work progress** puts task summaries alongside estimated observed engagement. Download the employee CSV for a date range of up to one year. The report includes observed/editing/device-interaction/reading/meeting/idle/unknown seconds, estimated hours, input/repetition counts, task/summary counts, voluntarily submitted summaries, AI-review counts, source and limitations. No observations means no claimed productive hours. Reports use UTC and are restricted to the employee, their team manager or organisation admin. Cross-tenant access is enforced with database row-level security. Activity and summaries expire with the organisation's retention policy.

## Optional local task-summary AI

Suggested starting model: **qwen3:4b** in Ollama, listed as a 2.5 GB Q4_K_M download: https://ollama.com/library/qwen3:4b. A 4B model with a 4096-token context is a conservative starting choice for an 8 GB GPU; actual speed and memory use need measurement. It is used only to compare a voluntarily submitted work summary to its assigned task, never to analyze hidden keystrokes, grade exams or make employment decisions. Ollama's structured outputs support a JSON schema: https://docs.ollama.com/capabilities/structured-outputs.

1. Install Node.js 22, current NVIDIA drivers and Ollama on the organisation's PC.
2. Keep Ollama listening on loopback, then run `ollama pull qwen3:4b`. Use `ollama ps` after a request to check GPU use. Do not expose port 11434 publicly.
3. Obtain a trusted TLS certificate for your own gateway hostname and place certificate/private-key files outside the repo. Route that hostname to the PC via an authenticated, organisation-controlled tunnel or VPN gateway. Render must be able to reach its HTTPS review endpoint. This workspace cannot configure your PC or DNS.
4. Generate a private gateway key using `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"`. Store it in a protected environment file outside the repository; never put it in frontend variables.
5. On the PC, set `LOCAL_AI_GATEWAY_KEY`, `AI_TLS_KEY_FILE`, `AI_TLS_CERT_FILE`, `AI_GATEWAY_HOST` (default 127.0.0.1), `AI_GATEWAY_PORT` (default 9443), and optionally `OLLAMA_MODEL=qwen3:4b`. Run `node local-ai/gateway.mjs`. The gateway accepts one request at a time, uses HTTPS and bearer authentication, limits body/context/output size and writes no task/request logs. Ensure your tunnel/reverse proxy also disables request-body logging. Make this a supervised OS service for restart after reboot.
6. In Plinth's private Render environment set `LOCAL_AI_GATEWAY_URL=https://your-owned-gateway.example/review` and the same `LOCAL_AI_GATEWAY_KEY`. Redeploy. The summary checkbox becomes available. With explicit consent, task description and summary leave Render for this PC; no student camera data goes there.
7. When the PC is offline or the model times out, the summary remains saved and goes to human review. Review prompt-injection resistance and relevance errors with representative, non-personal examples before institutional use. Model confidence is uncalibrated.

The integration and gateway are supplied; a local model has not been installed or connected because this environment cannot access the organisation's PC.

## Brevo SMTP / email authorization

Brevo reports an enabled free SMTP relay and an active Plinth sender. The Render server has its relay host, username, sender and port 2525 configured. Render free services block ports 25/465/587, so use 2525 with required STARTTLS: https://render.com/docs/free and https://developers.brevo.com/docs/smtp-integration.

The connector exposes relay settings but does not expose the private SMTP password or a transactional API key. Therefore authenticated email is **not operational yet**. Put the Brevo SMTP key in **SMTP_PASSWORD** in the private Render environment for Plinth (and the DPS API if the same verified sender is approved), then redeploy. This credential must be the SMTP key, not the Brevo API key. Do not paste it into chat or commit it. `SMTP_URL` remains supported for existing deployments. Server-side `MAIL_PROVIDER=brevo` plus `BREVO_API_KEY` can use HTTPS transactional email as an alternative.

Organization verification/invitation links and optional student email password resets use the shared server-only transport. Teacher reset remains available for students without school email. Until credentials are supplied, email flows show an actionable unavailable error; they never pretend mail was sent. Verify a controlled delivery after configuration and check Brevo delivery logs without publishing addresses or tokens.
