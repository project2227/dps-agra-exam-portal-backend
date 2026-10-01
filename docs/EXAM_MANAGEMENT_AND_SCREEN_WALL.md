# Hosted exams and consent-based one-page screen wall

## Remove a hosted exam

An authenticated teacher opens **Teacher → Manage hosted exams**. Under **Current & completed**, choose **Remove**, type the exact exam title and confirm. The backend checks teacher ownership and refuses to remove a currently active exam with students still taking it. Finished submissions, grading and audit records remain intact because removal is a *recoverable archive*, not physical deletion. Use **Recently removed → Restore** to recover a closed exam. Restoring does not silently restart an exam or reuse its passcode.

## One-page screen wall

Open an authorized live exam's monitor and select **Open screen wall**, or use the dashboard's **Screen wall** shortcut. Every participant has a tile on the same monitor page; each screen is a consented *still image* refreshed roughly every 9 seconds, not continuous streaming video. A student must permit screen sharing through the browser **and separately click Allow screen wall snapshots** in the always-visible monitoring indicator. They may withdraw screen-wall snapshot permission anytime without stopping the rest of their exam.

When a student refuses, disconnects, stops sharing, submits or the feed is older than 24 seconds, their tile reports the missing or stale status rather than presenting a frozen frame as live. Click a tile to open individual monitoring details. Fullscreen mode is available on the monitor toolbar.

**Security and capacity:** The backend verifies exam ownership and that the teacher joined the exam's monitor room, verifies active student sessions and the independent opt-in, relays bounded JPEGs only to one or two active authorized wall viewers, and stores no frames or media recordings in the database or disk. A wall allows up to 48 consenting participants; splitting very large classes is recommended. Sessions are subject to a 48-second renewable viewing lease; leaving or disconnecting the teacher clears the wall. Browser client memory holds only recent frames.

**Important:** This is NOT proof of cheating, does not infer gaze or what a student is thinking, and does not guarantee coverage if screen capture is disallowed, consent is withdrawn, a participant is offline or free hosting temporarily sleeps. You must have school authorization, appropriate student/guardian permission and a clear retention/privacy policy before any real classroom use.
