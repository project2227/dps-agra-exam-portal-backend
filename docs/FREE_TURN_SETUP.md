# Free managed TURN relay — DPS Learning Hub

The normal frontend and API already work **without** TURN, but STUN alone cannot establish a peer-to-peer connection across every school, home, VPN or mobile network. TURN is a separate service and the current Render plugin cannot provision a public UDP relay. The backend is now prewired for Cloudflare's managed TURN product and mints *short-lived credentials* for properly authenticated users.

**Cloudflare's published allowance:** first 1,000 GB of Cloudflare Realtime egress per month is free across its realtime products; usage beyond that can be billed. Set provider usage alerts/limits and read the current terms before running continuous webcam/screen streaming.

1. Open https://dash.cloudflare.com/sign-up and create a free Cloudflare account. Do not send credentials to the project author or this chat.
2. Go to Cloudflare dashboard → Realtime → TURN and create a TURN key for this project. Record the **TURN key ID** and the **key's API token**. The API token is a long-term credential; do NOT add it to GitHub, Vite variables, or frontend code.
3. Open your existing **DPS backend** in Render: https://dashboard.render.com/web/srv-daug9kp7lnhs73b8ndo0 → Environment. Add `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` there as secret server-side variables. Save and redeploy the backend.
4. Run an authorized mock exam with webcam and screen sharing explicitly consented to by every participant. Both teacher and student browsers now request ephemeral ICE credentials from `GET /api/rtc/ice`, authenticated with their existing JWTs. Each response carries short-lived WebRTC URLs and credentials; no Cloudflare long-term secret is sent to browsers.
5. Test between **two different networks** (for example school Wi-Fi versus a home hotspot). Check `chrome://webrtc-internals` for selected candidate type `relay` if network traversal otherwise fails. If no TURN configured, the API returns STUN-only with `relay:false`; the teacher monitor can warn about potential cross-network connection failures.

Credential TTL is eight hours, matching the backend's longest existing authentication duration. TURN credentials are minted when a student is in an authorized exam session or an authorized teacher opens the monitor. The relay forwards encrypted WebRTC media; it does not secretly capture, store or analyze student video. A participant can stop sharing at any time.

Provider docs: https://developers.cloudflare.com/realtime/turn/generate-credentials/ and https://developers.cloudflare.com/realtime/turn/faq/ .

If Cloudflare is unavailable, the application retains its existing STUN fallback and shows diagnostics rather than pretending a teacher has successfully received video. Do not run real school exams on free Render web services without independent uptime, consent, privacy, security and data-retention review.
