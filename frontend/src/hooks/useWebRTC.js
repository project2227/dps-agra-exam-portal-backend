import { useCallback, useEffect, useRef, useState } from 'react'
import { ICE_SERVERS } from '../config'

// Backend is only a signaling relay. A student must have explicitly consented
// and started the corresponding browser stream BEFORE an offer is created.
async function addCandidate(entry, candidate) {
  if (!entry?.pc) return
  if (!entry.pc.remoteDescription) { entry.candidates.push(candidate); return }
  try { await entry.pc.addIceCandidate(candidate) } catch { /* stale candidate */ }
}
async function flush(entry) {
  while (entry.candidates.length) {
    try { await entry.pc.addIceCandidate(entry.candidates.shift()) } catch { /* stale */ }
  }
}
const keyOf = (sessionId, mediaType) => `${sessionId}:${mediaType}`

export function useStudentRTC(socket, streamsRef, enabled = true) {
  const peers = useRef(new Map())
  useEffect(() => {
    if (!socket || !enabled) return undefined
    const request = async ({ sessionId, mediaType }) => {
      if (!['webcam', 'screen'].includes(mediaType)) return
      const stream = streamsRef.current?.[mediaType]
      if (!stream?.active || !stream.getVideoTracks().some(track => track.readyState === 'live')) return
      const key = keyOf(sessionId, mediaType)
      peers.current.get(key)?.pc.close()
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const entry = { pc, candidates: [] }
      peers.current.set(key, entry)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      pc.onicecandidate = e => e.candidate && socket.emit('webrtc:iceCandidate', { sessionId, mediaType, payload: e.candidate.toJSON() })
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') peers.current.delete(key)
      }
      try {
        await pc.setLocalDescription(await pc.createOffer())
        socket.emit('webrtc:offer', { sessionId, mediaType, payload: pc.localDescription })
      } catch { pc.close(); peers.current.delete(key) }
    }
    const answer = async ({ sessionId, mediaType, payload }) => {
      const entry = peers.current.get(keyOf(sessionId, mediaType))
      if (!entry || !payload) return
      try { await entry.pc.setRemoteDescription(payload); await flush(entry) } catch { /* stale */ }
    }
    const ice = data => addCandidate(peers.current.get(keyOf(data.sessionId, data.mediaType)), data.payload)
    const end = data => { const key = keyOf(data.sessionId, data.mediaType); peers.current.get(key)?.pc.close(); peers.current.delete(key) }
    socket.on('teacher:mediaRequest', request)
    socket.on('webrtc:answer', answer)
    socket.on('webrtc:iceCandidate', ice)
    socket.on('webrtc:endStream', end)
    return () => {
      socket.off('teacher:mediaRequest', request)
      socket.off('webrtc:answer', answer)
      socket.off('webrtc:iceCandidate', ice)
      socket.off('webrtc:endStream', end)
      for (const entry of peers.current.values()) entry.pc.close()
      peers.current.clear()
    }
  }, [socket, streamsRef, enabled])
}

export function useTeacherRTC(socket) {
  const [streams, setStreams] = useState({})
  const [states, setStates] = useState({})
  const peers = useRef(new Map())
  const pending = useRef(new Map())
  const setState = (sid, state) => setStates(prev => ({ ...prev, [sid]: state }))

  const watch = useCallback((sessionId, kinds = ['webcam', 'screen']) => {
    if (!socket) return
    setState(sessionId, 'connecting')
    for (const mediaType of kinds) {
      if (['webcam', 'screen'].includes(mediaType)) socket.emit('teacher:requestMediaPreview', { sessionId, mediaType })
    }
  }, [socket])
  const stop = useCallback(sessionId => {
    for (const mediaType of ['webcam', 'screen']) {
      const key = keyOf(sessionId, mediaType)
      peers.current.get(key)?.pc.close()
      peers.current.delete(key)
      socket?.emit('webrtc:endStream', { sessionId, mediaType, payload: {} })
    }
    setStreams(prev => { const next = { ...prev }; delete next[sessionId]; return next })
    setState(sessionId, 'idle')
  }, [socket])

  useEffect(() => {
    if (!socket) return undefined
    const offer = async ({ sessionId, mediaType, payload }) => {
      if (!sessionId || !['webcam', 'screen'].includes(mediaType) || payload?.type !== 'offer') return
      const key = keyOf(sessionId, mediaType)
      peers.current.get(key)?.pc.close()
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const entry = { pc, candidates: pending.current.get(key) || [] }
      peers.current.set(key, entry)
      pending.current.delete(key)
      pc.ontrack = e => {
        if (!e.streams?.[0]) return
        setStreams(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], [mediaType]: e.streams[0] } }))
      }
      pc.onicecandidate = e => e.candidate && socket.emit('webrtc:iceCandidate', { sessionId, mediaType, payload: e.candidate.toJSON() })
      pc.onconnectionstatechange = () => setState(sessionId, pc.connectionState)
      try {
        await pc.setRemoteDescription(payload)
        await flush(entry)
        await pc.setLocalDescription(await pc.createAnswer())
        socket.emit('webrtc:answer', { sessionId, mediaType, payload: pc.localDescription })
      } catch { pc.close(); peers.current.delete(key); setState(sessionId, 'failed') }
    }
    const ice = ({ sessionId, mediaType, payload }) => {
      const key = keyOf(sessionId, mediaType)
      const entry = peers.current.get(key)
      if (entry) addCandidate(entry, payload)
      else pending.current.set(key, [...(pending.current.get(key) || []), payload].slice(-30))
    }
    const end = ({ sessionId, mediaType }) => {
      const key = keyOf(sessionId, mediaType)
      peers.current.get(key)?.pc.close(); peers.current.delete(key)
      setStreams(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], [mediaType]: null } }))
    }
    socket.on('webrtc:offer', offer)
    socket.on('webrtc:iceCandidate', ice)
    socket.on('webrtc:endStream', end)
    return () => {
      socket.off('webrtc:offer', offer);socket.off('webrtc:iceCandidate', ice);socket.off('webrtc:endStream', end)
      for (const entry of peers.current.values()) entry.pc.close()
      peers.current.clear();pending.current.clear()
    }
  }, [socket])
  return { streams, states, watch, stop }
}
export default { useStudentRTC, useTeacherRTC }
