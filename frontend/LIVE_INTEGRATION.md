# Live Render + Neon integration

Only the Node/Render API connects to Neon, never the browser. Frontend is compiled with the public Render API origin from `.env.production` and uses hash navigation for simple static hosting. `VITE_DEMO_MODE=false` prevents sample data being mistaken for real student results.

Teacher login, admin class initialization, exam/question/passcode/publish, student exam joining, autosave, submission, teacher monitoring, proctoring event flags and handout link authorization call the real backend. Code running and file uploads require Judge0 and private S3 respectively on the backend and show errors when not configured. No live JPEG screenshots are uploaded to the backend. Optional consented video is supported by WebRTC signaling, not server-side recording.

For an InfinityFree deployment, run `npm ci && npm run build` and upload **only `dist/`** to `/htdocs/`; replace `.env.production` with the proper *public* API URL before compiling if you rename the Render service. Never add `DATABASE_URL`, JWT signing secrets, Neon tokens, or S3 keys to frontend env.

The school must verify informed consent, data processing policy, and end-to-end flows on staging before exams. Review `docs/FRONTEND_CONTRACT.md` in the backend repository.
