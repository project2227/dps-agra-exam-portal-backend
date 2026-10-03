'use strict';
// Shared signalling protocol. Media stays peer-to-peer; each path supplies
// server-authorised ownership/session adapters rather than client tenant IDs.
async function relay({
  event,
  data,
  ident,
  io,
  teacherRoom,
  privateStudent,
  checkStudent,
  checkOwnedStudent,
  relayWindow,
}) {
  const now = Date.now();
  while (relayWindow.length && relayWindow[0] < now - 10000)
    relayWindow.shift();
  if (relayWindow.length >= 240) return;
  relayWindow.push(now);
  const cap = event === 'webrtc:iceCandidate' ? 4096 : 65536;
  if (JSON.stringify(data || {}).length > cap) return;
  const sessionId = String(data?.sessionId || ''),
    mediaType = String(data?.mediaType || '');
  if (!['webcam', 'screen'].includes(mediaType)) return;
  if (ident.kind === 'student') {
    const s = await checkStudent();
    if (s.id !== sessionId) return;
    if (
      (mediaType === 'webcam' && !s.consent_webcam) ||
      (mediaType === 'screen' && !s.consent_screen) ||
      event === 'webrtc:answer'
    )
      return;
    io.to(teacherRoom(s.exam_id)).emit(event, {
      sessionId: s.id,
      mediaType,
      payload: data?.payload,
    });
  } else {
    const s = await checkOwnedStudent(sessionId);
    if (
      (mediaType === 'webcam' && !s.consent_webcam) ||
      (mediaType === 'screen' && !s.consent_screen) ||
      event === 'webrtc:offer'
    )
      return;
    privateStudent(s.id, event, {
      sessionId: s.id,
      mediaType,
      payload: data?.payload,
    });
  }
}
module.exports = { relay };
