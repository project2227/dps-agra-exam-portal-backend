# Plinth Workplace bridge

This shell grants screen access to the authenticated tenant page after a fresh server consent/work-hours check. The page uses the same `requestScreen`, `requestWebcam`, `useStudentRTC`, and `IncidentCapture` code as Institute. Electron never streams, records, uploads or flags an employee itself.

`npm ci && npm start` runs development. The first run asks for the organisation HTTPS home address and locks navigation there. The app stores only that address; authentication stays in Chromium httpOnly cookies. Choose “keep me signed in” to allow reconnection after reboot within the session expiry. A paused session never resumes automatically.

`npm test` checks navigation, consent gating and badge state. `npm run release` requires signing secrets and an HTTPS update feed. Production release must also run on Windows: accept notice, share, see the manager stream, trigger a flag, play its clip, pause from the badge, revoke consent, change policy, reboot, and confirm work-hour restrictions. Unit tests do not establish that those device flows passed.

Set `CSC_LINK`, `CSC_KEY_PASSWORD`, `PLINTH_PUBLISHER_NAME` and `PLINTH_UPDATE_URL` in a CI secret store. Never commit certificates or keys. Configure the signed installer URL on the web service only after Windows testing and signature verification. The site keeps downloads unavailable until `WORKPLACE_INSTALLER_SIGNED=true`. The updater accepts the publisher signature; the installed app must match the signed publisher configured by the build.
