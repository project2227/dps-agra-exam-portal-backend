# Contract for the separately built InfinityFree frontend

Set `const API_BASE='https://YOUR-NEW-DPS-API.onrender.com';`, never use the Cyber Arena backend URL.

## Token separation

Teacher login returns `{token,teacher}` at `POST /api/auth/teacher/login`; use as `Authorization: Bearer TOKEN` for teacher-only APIs. Students have **no permanent account**: list active exams, enter name/roll/class/section/passcode and explicit optional media consent. `POST /api/exams/:examId/join` returns an exam-specific token stored for that exam session only. Never pass teacher tokens to student routes or vice versa. Clear student token on final submission; on reload reconnect with its still-valid session token if unfinished.

```js
async function api(path, token, options={}) {
 const res=await fetch(API_BASE+path,{
  ...options,
  headers:{...(options.headers||{}),
   ...(token?{Authorization:`Bearer ${token}`}:{}) ,
   ...((options.body && !(options.body instanceof FormData))?{'Content-Type':'application/json'}:{})}
 });
 const data=await res.json();
 if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
 return data;
}
// Student autosave example:
// await api(`/api/student/exams/${examId}/answers/save`, studentToken,
//   {method:'POST',body:JSON.stringify({questionId,answerText:'A'})});
```

## Exam flow

Teacher: login → create exam (draft) → add questions → generate passcode (shown once) → publish → monitor → review → export. Exam start/end timestamps are ISO UTC, while the frontend may display them in Asia/Kolkata. Teacher can close an exam early. Question editing is intentionally disabled once published; create a new draft for major edits.

Student: `GET /api/exams/active?className=IX&section=A` → join using exam passcode → questions → autosave → code Run/Submit only when configured → final submit. Student cannot get canonical answers or hidden tests. Show exam deadline and time remaining based on **serverTime** and the returned exam duration, not only browser clock; server independently enforces both. Code Run can return 503 if no Judge0 service is configured; handle that gracefully and let teacher use manual grading.

## Socket.IO

Connect using `io(API_BASE,{auth:{token},transports:['websocket','polling']})`; for a teacher emit `teacher:joinMonitorRoom` with `{examId}`; for a student emit `student:joinExamRoom` after joining the exam. Student emits:

- `student:heartbeat` every 15–30 s.
- `student:questionChange`, `student:answerUpdate`, `student:codeUpdate` with `{questionId}` to indicate activity; **HTTP autosave** is the authoritative answer save. Socket events do not persist raw answers.
- `student:proctorEvent` with `{eventType, metadata}` from explicit UI listeners, plus `student:webcamStatus` or `student:screenStatus` with `{active:boolean}`. The student should always have clear visual monitoring feedback and a way to stop media; logging stop events is not a presumption of cheating.

Teacher emits:

- `teacher:joinMonitorRoom` `{examId}`
- `teacher:requestStudentDetail` `{sessionId}`
- `teacher:sendWarning` `{sessionId,message}`
- `teacher:lockStudentExam` `{sessionId}` **only after teacher verification**.

Server emits to authorized teacher monitor room:

- `exam:studentJoined`
- `exam:studentDisconnected`
- `exam:answerLiveUpdate`
- `exam:codeLiveUpdate`
- `exam:proctorFlag`
- `exam:studentStatusUpdate`

Server emits to student: `exam:joined`, `teacher:warningSent`, `teacher:lockExam`. Connection failures: `exam:error`.

## Consent-only WebRTC signaling

Only the **student** may initiate an offer. This signaling protocol never captures media itself; the frontend must call browser `getUserMedia()` or `getDisplayMedia()` ONLY after student explicitly chooses to share. With active consent for the **specific media type**, relay:

```js
socket.emit('webrtc:offer', {sessionId,mediaType:'webcam',payload:offer});
// Teacher replies:
socket.emit('webrtc:answer', {sessionId,mediaType:'webcam',payload:answer});
// Either peer:
socket.emit('webrtc:iceCandidate', {sessionId,mediaType:'webcam',payload:candidate});
// To end:
socket.emit('webrtc:endStream', {sessionId,mediaType:'webcam',payload:{}});
```

Use `mediaType:'screen'` for screenshare. Backend verifies the stored **media-specific** consent per signaling event. Students should see a permanently visible monitoring banner whenever sharing, and know who can view it. Use direct peer-to-peer only unless school approves TURN relay and infrastructure. This project intentionally contains no media recording or permanent media storage.

## Reporting flags responsibly

Available event names: `TAB_SWITCH`, `WINDOW_BLUR`, `WINDOW_FOCUS`, `FULLSCREEN_EXIT`, `COPY`, `PASTE`, `RIGHT_CLICK`, `MULTIPLE_SESSION_ATTEMPT` (server-generated), `BROWSER_CHANGED` (server-generated), `SCREEN_SHARE_STOPPED`, `WEBCAM_STOPPED`, `NETWORK_DISCONNECT`, `DEVTOOLS_SUSPECTED`. The teacher sees timestamps and *review-required* indicators. Browser heuristics are inherently unreliable: never show a claim such as “student cheated” without human verification. Do not continuously log keystrokes, record arbitrary text, send browsing history, or collect media without specific approval.
