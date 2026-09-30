# Optional webcam still images (consented, no TURN)

This supplement is designed for a small, authorized classroom demonstration
when WebRTC cannot negotiate a smooth webcam connection across networks.

How it works:
1. An authenticated teacher joins their own exam monitor, opens ONE student
   card, and clicks **Request webcam snapshots**.
2. The student's active exam displays a clear, separate request and explains
   that compressed webcam JPEG images will pass through the DPS backend
   approximately every four seconds. Existing webcam permission alone
   **does not** turn on the snapshot feed. The student must click
   **Allow webcam snapshots**.
3. The student's browser uses the existing, already-authorized webcam stream
   to encode 320×240 JPEG still images at 0.48 quality, at most one every
   ~4.2 seconds. Images are relayed through authenticated Socket.IO to
   **only the subscribed teacher's socket**, not broadcast to all monitors.
4. The student can stop the snapshot feed separately from the normal webcam.
   It also stops when the teacher closes the selected student, when the
   subscription expires, on disconnection, and when the exam is no longer
   active.
5. A teacher can request only one student at a time via this feature. Each
   frame has a size cap and the server rate limits frames independently.
   The UI labels each frame as a **still**, never smooth or continuous video.

No TURN server is required because still images travel through the existing
Render WebSocket connection, but Render WebSocket availability is still
necessary. JPEGs are deliberately not stored in the database, files, object
storage or audit history. Authorized staff should not screenshot or retain
them without an approved retention/consent policy. This feature contains no
AI, face recognition or gaze-based misconduct prediction, and it does not
turn looking away into an accusation.

**Limits:** 25 KB JPEG every four seconds is around 6 KB/s/student before
network/protocol overhead; actual size depends on the image. Do not enable
dozens of concurrent feeds on free Render without measuring bandwidth.
Only the currently selected student is subscribed. No system can guarantee
24/7 uptime or measure deception from webcam images. Always test with
consenting participants and obtain institutional authorization and privacy
review before real school examinations.

**Test:** Run the `WebRTC signaling integration` GitHub workflow. It now
also exercises consent gates, frame relay, rate limiting and unsubscribe with
fake image data and a disposable Postgres instance. Validate the actual
browser camera experience manually on two devices before using it.
