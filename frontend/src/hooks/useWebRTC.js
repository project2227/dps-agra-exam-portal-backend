import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL, ICE_SERVERS } from '../config'
import { requestIceServers } from '../services/turnIce'

// WebRTC is strictly opt-in: the student initiates offers from streams that
// the student has already explicitly enabled in the browser. No frames or
// audio are uploaded to Render. A TURN relay (if configured) relays encrypted
// WebRTC traffic; STUN-only may fail between school and home networks.
const keyOf = (id,kind) => id + ':' + kind
const TYPES = ['webcam','screen']
async function candidate(entry,value) {
  if (!entry?.pc || !value) return
  if (!entry.pc.remoteDescription) { entry.candidates.push(value);return }
  try { await entry.pc.addIceCandidate(value) } catch { /* stale/reordered */ }
}
async function flush(entry) {
  while (entry?.candidates.length) {
    const next=entry.candidates.shift()
    try { await entry.pc.addIceCandidate(next) } catch { /* stale */ }
  }
}
const hasLiveVideo=stream=>stream?.getVideoTracks().some(t=>t.readyState==='live')

export function useStudentRTC(socket, streamsRef, enabled=true) {
  const peers=useRef(new Map())
  useEffect(()=>{
    if (!socket || !enabled) return
    const request=async ({sessionId,mediaType})=>{
      if(!sessionId||!TYPES.includes(mediaType))return
      const stream=streamsRef.current?.[mediaType]
      if(!hasLiveVideo(stream)){
        socket.emit('student:mediaUnavailable',{sessionId,mediaType})
        return
      }
      const key=keyOf(sessionId,mediaType)
      peers.current.get(key)?.pc.close()
      const pc=new RTCPeerConnection({iceServers:await requestIceServers(socket,API_BASE_URL,ICE_SERVERS)})
      const entry={pc,candidates:[]}
      peers.current.set(key,entry)
      stream.getTracks().filter(t=>t.readyState==='live').forEach(t=>{
        if(mediaType==='screen'&&t.kind==='video')t.contentHint='motion'
        pc.addTrack(t,stream)
      })
      if(mediaType==='screen')for(const sender of pc.getSenders()){
        if(sender.track?.kind!=='video')continue
        const parameters=sender.getParameters()
        parameters.encodings=parameters.encodings?.length?parameters.encodings:[{}]
        parameters.encodings[0].maxBitrate=900000
        parameters.degradationPreference='balanced'
        sender.setParameters(parameters).catch(()=>{})
      }
      pc.onicecandidate=e=>{
        if(e.candidate&&socket.connected)
          socket.emit('webrtc:iceCandidate',{sessionId,mediaType,payload:e.candidate.toJSON()})
      }
      pc.onconnectionstatechange=()=>{
        if(['failed','closed'].includes(pc.connectionState)){
          if(peers.current.get(key)===entry)peers.current.delete(key)
          pc.close()
        }
      }
      try{
        await pc.setLocalDescription(await pc.createOffer())
        if(!socket.connected)throw Error('Signaling socket disconnected')
        socket.emit('webrtc:offer',{sessionId,mediaType,payload:pc.localDescription})
      }catch{
        pc.close()
        if(peers.current.get(key)===entry)peers.current.delete(key)
        socket.emit('student:mediaUnavailable',{sessionId,mediaType})
      }
    }
    const answer=async ({sessionId,mediaType,payload})=>{
      if(payload?.type!=='answer')return
      const entry=peers.current.get(keyOf(sessionId,mediaType))
      if(!entry)return
      try{await entry.pc.setRemoteDescription(payload);await flush(entry)}catch{/* stale remote answer */}
    }
    const ice=({sessionId,mediaType,payload})=>
      candidate(peers.current.get(keyOf(sessionId,mediaType)),payload)
    const stop=({sessionId,mediaType})=>{
      const key=keyOf(sessionId,mediaType)
      peers.current.get(key)?.pc.close()
      peers.current.delete(key)
    }
    socket.on('teacher:mediaRequest',request)
    socket.on('webrtc:answer',answer)
    socket.on('webrtc:iceCandidate',ice)
    socket.on('webrtc:endStream',stop)
    return()=>{
      socket.off('teacher:mediaRequest',request)
      socket.off('webrtc:answer',answer)
      socket.off('webrtc:iceCandidate',ice)
      socket.off('webrtc:endStream',stop)
      for(const entry of peers.current.values())entry.pc.close()
      peers.current.clear()
    }
  },[socket,streamsRef,enabled])
}

export function useTeacherRTC(socket) {
  const [streams,setStreams]=useState({})
  const [states,setStates]=useState({})
  const [mediaStates,setMediaStates]=useState({})
  const [relayAvailable,setRelayAvailable]=useState(false)
  const peers=useRef(new Map())
  const pending=useRef(new Map())
  const desired=useRef(new Map())
  const attempts=useRef(new Map())
  const retries=useRef(new Map())

  const status=useCallback((sessionId,kind,next)=>{
    setMediaStates(prev=>({...prev,[sessionId]:{...(prev[sessionId]||{}),[kind]:next}}))
    setStates(prev=>({...prev,[sessionId]:
      next==='connected'?'connected':
      ['ice-failed','no-response'].includes(next)?'failed':
      next==='stopped'?'idle':'connecting'}))
  },[])
  const clearTimer=key=>{
    clearTimeout(retries.current.get(key))
    retries.current.delete(key)
  }
  const sendRequest=useCallback((sessionId,kind,reset=false)=>{
    if(!desired.current.get(sessionId)?.has(kind))return
    const key=keyOf(sessionId,kind)
    if(reset)attempts.current.set(key,0)
    clearTimeout(retries.current.get(key))
    if(peers.current.get(key)?.pc?.connectionState==='connected')return
    if(!socket?.connected){status(sessionId,kind,'socket-offline');return}
    const count=(attempts.current.get(key)||0)+1
    attempts.current.set(key,count)
    status(sessionId,kind,'requesting')
    socket.emit('teacher:requestMediaPreview',{sessionId,mediaType:kind})
    if(count<=3){
      retries.current.set(key,setTimeout(()=>{
        // Delayed retries handle consent screens and temporary signaling races.
        if(desired.current.get(sessionId)?.has(kind) &&
           peers.current.get(key)?.pc?.connectionState!=='connected'){
          sendRequest(sessionId,kind)
        }
      },5500))
    }else{
      retries.current.set(key,setTimeout(()=>{
        if(desired.current.get(sessionId)?.has(kind)&&
           peers.current.get(key)?.pc?.connectionState!=='connected'){
          status(sessionId,kind,'no-response')
        }
      },5500))
    }
  },[socket,status])
  const watch=useCallback((sessionId,kinds=TYPES)=>{
    if(!sessionId)return
    const valid=kinds.filter(k=>TYPES.includes(k))
    if(!valid.length)return
    const existing=desired.current.get(sessionId)||new Set()
    desired.current.set(sessionId,new Set([...existing,...valid]))
    valid.forEach(k=>sendRequest(sessionId,k,true))
  },[sendRequest])
  const stop=useCallback(sessionId=>{
    desired.current.delete(sessionId)
    TYPES.forEach(kind=>{
      const key=keyOf(sessionId,kind)
      clearTimeout(retries.current.get(key))
      retries.current.delete(key)
      attempts.current.delete(key)
      peers.current.get(key)?.pc.close()
      peers.current.delete(key)
      pending.current.delete(key)
      if(socket?.connected)socket.emit('webrtc:endStream',{sessionId,mediaType:kind,payload:{}})
    })
    setStreams(prev=>{const next={...prev};delete next[sessionId];return next})
    setMediaStates(prev=>{const next={...prev};delete next[sessionId];return next})
    setStates(prev=>({...prev,[sessionId]:'idle'}))
  },[socket])

  useEffect(()=>{
    if(!socket)return
    const onReconnect=()=>{
      for(const [sessionId,kinds] of desired.current.entries())
        for(const kind of kinds)sendRequest(sessionId,kind,true)
    }
    const ack=({sessionId,mediaType,status:result})=>{
      if(!desired.current.get(sessionId)?.has(mediaType))return
      if(['not-sharing','not-consented','student-offline','session-ended'].includes(result)){
        status(sessionId,mediaType,result)
        if(result!=='not-sharing')clearTimeout(retries.current.get(keyOf(sessionId,mediaType)))
      }else if(result==='requested')status(sessionId,mediaType,'connecting')
    }
    const offer=async ({sessionId,mediaType,payload})=>{
      if(!desired.current.get(sessionId)?.has(mediaType)||payload?.type!=='offer')return
      const key=keyOf(sessionId,mediaType)
      clearTimeout(retries.current.get(key))
      retries.current.delete(key)
      peers.current.get(key)?.pc.close()
      const servers=await requestIceServers(socket,API_BASE_URL,ICE_SERVERS)
      setRelayAvailable(servers.some(x=>[x.urls].flat().some(url=>/^turns?:/i.test(url))))
      const pc=new RTCPeerConnection({iceServers:servers})
      const entry={pc,candidates:pending.current.get(key)||[]}
      peers.current.set(key,entry)
      pending.current.delete(key)
      status(sessionId,mediaType,'negotiating')
      pc.ontrack=e=>{
        const media=e.streams?.[0]||new MediaStream([e.track])
        if(peers.current.get(key)!==entry)return
        setStreams(prev=>({...prev,[sessionId]:{...prev[sessionId],[mediaType]:media}}))
      }
      pc.onicecandidate=e=>{
        if(e.candidate&&socket.connected)
          socket.emit('webrtc:iceCandidate',{sessionId,mediaType,payload:e.candidate.toJSON()})
      }
      pc.onconnectionstatechange=()=>{
        if(peers.current.get(key)!==entry)return
        if(pc.connectionState==='connected'){
          clearTimeout(retries.current.get(key))
          retries.current.delete(key)
          status(sessionId,mediaType,'connected')
        }else if(['failed','closed'].includes(pc.connectionState)){
          status(sessionId,mediaType,'ice-failed')
          peers.current.delete(key)
          pc.close()
          setStreams(prev=>({...prev,[sessionId]:{...prev[sessionId],[mediaType]:null}}))
        }else if(pc.connectionState==='disconnected'){
          status(sessionId,mediaType,'disconnected')
        }
      }
      try{
        await pc.setRemoteDescription(payload)
        await flush(entry)
        await pc.setLocalDescription(await pc.createAnswer())
        socket.emit('webrtc:answer',{sessionId,mediaType,payload:pc.localDescription})
        // ICE may stall across two NATs without TURN. This explicit state is
        // visible to the teacher instead of an endless blank video tile.
        retries.current.set(key,setTimeout(()=>{
          if(peers.current.get(key)===entry&&pc.connectionState!=='connected')
            status(sessionId,mediaType,'ice-failed')
        },12000))
      }catch{
        if(peers.current.get(key)===entry)peers.current.delete(key)
        pc.close()
        status(sessionId,mediaType,'ice-failed')
      }
    }
    const ice=({sessionId,mediaType,payload})=>{
      if(!desired.current.get(sessionId)?.has(mediaType))return
      const key=keyOf(sessionId,mediaType)
      const entry=peers.current.get(key)
      if(entry)candidate(entry,payload)
      else pending.current.set(key,[...(pending.current.get(key)||[]),payload].slice(-100))
    }
    const end=({sessionId,mediaType})=>{
      const key=keyOf(sessionId,mediaType)
      peers.current.get(key)?.pc.close()
      peers.current.delete(key)
      status(sessionId,mediaType,'stopped')
      setStreams(prev=>({...prev,[sessionId]:{...prev[sessionId],[mediaType]:null}}))
    }
    socket.on('teacher:mediaStatus',ack)
    socket.on('webrtc:offer',offer)
    socket.on('webrtc:iceCandidate',ice)
    socket.on('webrtc:endStream',end)
    socket.on('connect',onReconnect)
    socket.on('teacher:monitorJoined',onReconnect)
    return()=>{
      socket.off('teacher:mediaStatus',ack)
      socket.off('webrtc:offer',offer)
      socket.off('webrtc:iceCandidate',ice)
      socket.off('webrtc:endStream',end)
      socket.off('connect',onReconnect)
      socket.off('teacher:monitorJoined',onReconnect)
      for(const timer of retries.current.values())clearTimeout(timer)
      retries.current.clear()
      attempts.current.clear()
      for(const entry of peers.current.values())entry.pc.close()
      peers.current.clear()
      pending.current.clear()
    }
  },[socket,sendRequest,status])
  return {streams,states,mediaStates,relayAvailable,watch,stop}
}
