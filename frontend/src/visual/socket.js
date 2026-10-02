// Synthetic transport for the isolated visual bundle; no network or authentication.
export function io(){
 const listeners=new Map()
 const socket={connected:true,id:'visual-only',on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);return socket},off(event,fn){listeners.get(event)?.delete(fn);return socket},emit(event){if(event==='teacher:communityJoin')queueMicrotask(()=>listeners.get('teachers:communityJoined')?.forEach(fn=>fn({})));return socket},disconnect(){socket.connected=false;return socket},connect(){socket.connected=true;return socket},removeAllListeners(){listeners.clear();return socket}}
 return socket
}
