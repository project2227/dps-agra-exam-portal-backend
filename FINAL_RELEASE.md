# DPS Lab final release

Live frontend: https://dpslab.onrender.com
API: https://dps-agra-exam-api.onrender.com

## Exam management

Published exams open for check-in 30 minutes before their scheduled start. The waiting room follows the server clock, checks for schedule changes and reveals no questions before the start. Early arrival does not consume the exam duration. Reconnecting preserves the start time; late arrivals receive their duration within the exam's overall closing time. Final submission has the existing 60-second delivery grace period and can save the last draft atomically if normal autosave has closed. Very large final payloads retain the earlier server saves and local backup and show a clear error.

On the teacher monitor, use the name/roll search and status filter. Open a student to remove them with a reason, review screen incidents or allow rejoining. Removing a student invalidates their token and blocks that roll/class/section from the same exam until the host explicitly readmits them. It preserves their answers and does not assign a failing grade.

Administrators have a separate **Test data management** page. Review the counts, then type the displayed confirmation to permanently remove selected draft, closed or expired tests, including linked questions, sessions, answers, code runs, flags, incident recordings, relevant audit entries and database answer files. These exams are absent from both current and Recently removed lists. Teacher accounts, handouts and learning content remain. Live and future scheduled exams are protected. This release does not automatically select or delete existing tests.

## Screen previews and recordings

The screen wall sends the newest temporary JPEG about every 1.5 seconds rather than every 8 seconds. It uses volatile delivery so old frames are not queued on a dropped connection, and marks feeds stale after 7 seconds. The server transport accepts bounded frames up to 160 KB. Open a student for direct WebRTC video. Capture is 10–15 fps; actual latency depends on browser throttling, network and TURN connectivity. Existing consent checks, ownership checks, 48-student wall capacity and two-viewer limit remain.

A student must explicitly agree to screen sharing and optional incident recording on the join form, then grant the browser's entire-screen permission. Tab switches, window blur/minimising and fullscreen exits start a MediaRecorder clip from that approved video track. Returning to this exam, focusing the window and entering fullscreen stops it. Screen/audio permissions cannot be obtained silently. The portal records neither webcam nor audio. Unsupported WebM browsers and failed uploads show a clear recording state; activity flags still remain available for review.

Clips are private to the hosting teacher, expire after seven days and are removed by the server's retention task. Uploads are ordered and idempotent, with a 12 MB per-clip and 128 MB total recording budget. Sharing being stopped, exam submission, teacher removal, browser errors and storage/connection limits can interrupt capture. Stored clips identify their finish reason and require human review. Browser flags alone are not proof of misconduct.

## Intro and navigation

The welcome screen embeds the original offline Aryan.Code interactive vector drawing animation from the logo design, including its eye lighting and pointer response. Skip, replay, reduced motion and the existing guided tour remain available. Exam deep links go directly to check-in. **Find a tool**, or Ctrl/Cmd + K, searches the main learning and exam tools; administrator results are role filtered.

## Build and validation

Backend: `npm ci`, `npm run check`, `npm test`.
Frontend: `cd frontend && npm ci && npm test && npm run build`.
Integration: migrate a disposable PostgreSQL database, then run `npm run test:signaling`. Never use production for these synthetic tests. GitHub Actions runs the integration suite against PostgreSQL 16.

The frontend is static. Its public Vite configuration points to the Render API. Database credentials and private backend keys never belong in frontend files.
