// Socket-scoped cache avoids requesting multiple paid relay credentials for
// separate webcam and screen previews. The static ICE fallback contains STUN
// only; a backend /api/rtc/ice route mints time-limited TURN credentials.
const cache=new WeakMap()
export async function requestIceServers(socket,apiUrl,fallback){
 if(!socket?.auth?.token||!apiUrl)return fallback
 if(cache.has(socket))return cache.get(socket)
 const next=fetch(apiUrl+'/api/rtc/ice',{
  headers:{Authorization:'Bearer '+socket.auth.token},cache:'no-store',
  signal:AbortSignal.timeout(8500)
 }).then(async res=>{
  if(!res.ok)throw Error('TURN unavailable')
  const data=await res.json()
  if(!Array.isArray(data.iceServers)||!data.iceServers.length)throw Error('Invalid ICE configuration')
  return data.iceServers
 }).catch(()=>fallback)
 cache.set(socket,next)
 return next
}
