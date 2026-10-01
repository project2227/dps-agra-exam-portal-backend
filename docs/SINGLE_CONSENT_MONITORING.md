# One-time consent for the DPS Lab exam monitor

A participant is never monitored without advance disclosure and their own browser permission. This is an independent student-built platform; the school must authorize real deployments, particularly when minors are involved.

## Student
1. On the exam join form, read the monitoring disclosures and explicitly select webcam and/or entire-screen sharing. New teacher-created exams default to both required; teachers can turn either off before publishing. Refusing a required stream means you cannot start that exam in this platform.
2. On the **single pre-exam permission screen**, click Allow webcam and Share entire screen. Your browser presents its own mandatory device/screen permissions. The screen capture must be initiated by the participant: a website cannot silently bypass browser permission dialogs.
3. Click **I agree, start the exam**. The previously approved video tracks are used for teacher preview while you remain in the exam. Temporary, low-resolution JPEG webcam/screen stills can be relayed through the existing authenticated exam server if direct WebRTC cannot connect or the teacher opens the wall. There are no additional per-viewer consent prompts.
4. A clearly visible expandable sharing indicator stays on the exam page. Participants can stop sharing using the browser's native control. Optional screens can be stopped in-app. If a required feed stops, the exam interface shows an interruption and asks the participant to restart it with their own browser permission.
5. All media stops on submission. No media is written to exam answers or the SQL database. Temporary still frames exist in process/browser memory only while the authorized teacher watches.

## Teacher
1. Create an exam with webcam/screen requirements that match school approval.
2. Open **Monitor**. The one-page screen wall now opens by default and requests already-consented screen stills. These are images about every 8 seconds, **not uninterrupted live video**.
3. Select a student tile. Their already-approved webcam and screen are requested automatically over WebRTC. For a selected student only, consented webcam stills travel via the existing server to provide a more reliable fallback on restrictive networks.
4. If the selected student's direct feeds don't connect, inspect the status text. Cross-network high-frame-rate WebRTC may still require TURN. The server-relayed stills can function without a TURN provider.
5. Close the selected student to stop the webcam stills subscription; leave the monitor to end wall subscriptions. Refreshing or reconnecting never bypasses browser permissions or grants a student more monitoring permissions.

The site does **not** detect peeking or make automated accusations. Tab/focus signals may be recorded for review but are not proof of misconduct.
