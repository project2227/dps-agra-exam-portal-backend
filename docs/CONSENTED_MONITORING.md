# Consented live webcam and screen troubleshooting (staging)

This is a student-built prototype, **not** an official school examination system.

For an authorized demonstration, use two separate devices/browsers and explicit participant consent:
1. A verified administrator creates an exam and enables **Require webcam** and **Require screen** only with approval from everyone involved.
2. On the student device, join and click **Allow webcam** and **Share entire screen** when prompted. Mobile/iOS browsers may not support full screen sharing.
3. Keep the exam open. The exam page shows a monitoring indicator. The teacher opens the exam's **Monitor**, selects that student and can retry each stream separately.
4. The panel now distinguishes student offline, not shared, negotiating and ICE/TURN failures; a flagged or online student no longer loses preview solely because of their status.
5. If both peers are online but video reports an ICE failure on different networks, the free default **STUN-only** setup may not traverse the NAT/firewall. A properly operated TURN relay with time-limited credentials is needed for reliable cross-network viewing. Render static hosting does **not** run a TURN server. Do not embed long-lived TURN secrets as `VITE_*` public variables.

Live streaming is peer-to-peer WebRTC between consenting browsers; neither the backend nor a CDN stores or analyzes student camera frames. Browser tab visibility, window focus and fullscreen changes can be logged as review signals. Looking away or 'peeking' cannot be accurately inferred from these browser signals, and no automated misconduct verdict is made from someone's appearance or gaze. An authorized teacher can send an explicit warning and the system records an **informational human observation**, not an automatic cheating score.

**Limitations:** live P2P video is not verifiable through GitHub source tests or a generic HTTP health check. Rehearse using separate devices and approved participants before any real school use. Obtain school authorization, parental/guardian permission where required, agree on storage and retention policies, and avoid unsupported claims of automated cheating detection.
