# Local exam AI and exam drafts

The existing student/teacher cookie sessions, exam tokens, autosave, proctor events, realtime monitor, submission routes and public landing are preserved. The new tools use teacher-only routes with ownership and CSRF checks.

## Windows PC setup

Use the provided `dps-exam-ai-gateway.zip` package. Install Node.js 22 or newer and Ollama, then:

1. Run `ollama pull qwen3.5:4b`. The 4B model fits the tested RTX 5060 8 GB setup with an 8,192-token context. The gateway disables thinking for structured responses.
2. Extract the gateway ZIP. In that folder run `powershell -ExecutionPolicy Bypass -File .\Start-Gateway.ps1`. Keep it running. Ollama stays on localhost; the authenticated gateway listens only on `127.0.0.1:8787`.
3. In a second terminal run `powershell -ExecutionPolicy Bypass -File .\Test-Gateway.ps1`. It tests model availability and two generated MCQs without printing the key.
4. Run `cloudflared tunnel --url http://127.0.0.1:8787`. Keep this terminal and the PC running.
5. Run `powershell -ExecutionPolicy Bypass -File .\Copy-Render-Key.ps1`. Paste its clipboard value into the **API service's private Render environment** as `DPS_AI_GATEWAY_KEY`. Never paste it into chat, a screenshot, frontend settings or a committed file.
6. Set `DPS_AI_GATEWAY_URL` to the HTTPS tunnel origin, without `/health`. Quick Tunnel URLs change on restart. Updating Render settings can trigger a deployment; do it outside an exam window.
7. Open Teacher → Create exam → Check AI connection. A successful connection shows the model name and enables question generation.

The key file is encrypted with Windows DPAPI for the current Windows user. The server-to-server key is never sent to the browser. The school PC, Ollama, gateway and tunnel must all remain running. Quick Tunnels are temporary; a stable named tunnel or an outbound job worker is the longer-term option.

## Teacher workflow

Create exam accepts manual questions and AI-assisted previews. Generate new MCQs, short/long answers or Python/Java/C++/C/JavaScript practicals from a topic, pasted text, an uploaded PDF/TXT, or an owned handout. SQL topics can be used in MCQs/written answers; the existing exam code runner's supported languages are unchanged.

PDF import reads text with Mozilla PDF.js, in a bounded worker. Files are limited to 5 MB and 40 pages. Extracted pages are labelled and divided into sections within the model's request budget. Review the text, select each section, and use **Import existing questions** for a paper containing questions/answers. The model handles at most eight questions per request; compare the final count and order against the original paper. Missing answers are not fabricated. Scans need OCR; empty/scanned pages and layout/indentation risks are reported. Uploaded source bytes are not saved by the assistant; existing handouts keep their existing retention rules.

Every preview requires a teacher review checkbox before it can be added. It never creates or publishes an exam automatically. The draft remains editable through the ordinary builder.

**Save as draft** accepts unfinished questions, options and answer keys. Metadata and questions save in a single transaction. Repeated saves update the same draft, rather than creating duplicates. Manage hosted exams has **Continue draft**, **Edit exam**, and **Postpone exam**. Scheduled edits remain scheduled and must still be complete. Optimistic version checks prevent overwriting a newer edit.

Editing/postponing is permitted only before the exam starts and before any student has checked in. Postponement preserves question IDs, password, duration and records. The teacher shares the updated date with the class; students see it on the next dashboard reload. Closed/live exams are locked.

## Optional marking

Practical/written questions do not require reference answers or test cases. MCQs can also be marked manually without an answer key; such answers remain ungraded rather than receiving an invented zero. A provided MCQ key continues to use the existing deterministic marking.

For written/practical AI suggestions, add a rubric, enable the option and explicitly approve the rubric before publishing. Changing the question, marks, language or marking notes clears the UI's approval. Reference answers remain optional. Teacher-only answer-key JSON holds these notes; no database schema migration is needed. Student serializers exclude the answer-key column and hidden tests.

In Submissions, **Suggest marks with AI** returns an advisory verdict, rubric checks and suggested marks for a submitted answer. The server uses the stored, approved rubric and checks exam ownership. Student identity is not included in the model request. It does not execute student code or update grades. **Use this suggestion** fills the review field; **Save review** is the separate teacher action that awards marks. Teachers can change or reject the suggestion. Model output is untrusted and checked for valid structure, options, source pages and score bounds.

## Deployment and verification

Node.js 22.13 or newer is required by PDF.js. Production API builds run a read-only database schedule gate before replacing the container. It checks active/scheduled exams within three hours and the exam calendar. Calendar items have no end time, so unmatched entries conservatively use the portal's six-hour maximum duration. A blocked/timed-out build leaves the previous build live. Separate frontend builds wait for the API's anonymous, counts-only `/api/deployment-window` endpoint and an open exam window. No account identifiers or exam titles are returned there.

The disposable staging launcher is `node --import ./integration/staging-db.mjs src/server.js`, with `DPS_DISPOSABLE_STAGE=true` and `DATABASE_URL=postgres://disposable-ai-stage-only`. The normal build prepares an empty database archive so startup needs only one database engine on a small free instance. It uses an isolated, in-memory PostgreSQL-compatible database and an explicitly labelled **synthetic AI protocol fixture**. It never connects to the production database and does not test real model quality. Real model connectivity/generation is separately checked through the configured private gateway.

Run `npm run check`, `npm test`, and the frontend build. Coverage includes real PDF extraction, malformed/scanned files, Unicode chunks, source/AI validation, draft save/reopen, stale edits, practicals without outputs, postponement, account/guest join, autosave, Socket.IO proctor flags, submission, ownership and advisory-only grading; browser interaction checks cover review consent, optional fields, draft updates and the postpone dialog.

With `ACCOUNT_RELEASE_SMOKE=true`, the deployed server runs the existing public HTTPS account/exam/socket checks and the new draft/edit/postpone/source checks. Synthetic records use random identifiers and are removed with ownership checks in `finally`. If the gateway is connected, a small generation request is also verified. A gateway that is not configured is reported explicitly, without preventing manual exam creation. No secrets, source text or student answers are logged.

There are no new tables, migrations or changes to existing submission foreign keys in this release. Rollback to the preceding code remains compatible with the private JSONB marking notes; existing exam records are retained.
