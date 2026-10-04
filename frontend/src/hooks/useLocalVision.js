import { useCallback, useEffect, useRef, useState } from 'react';
export default function useLocalVision({enabled,stream,onEvent}) {
  const [status,setStatus]=useState('off'), [quality,setQuality]=useState('');
  const workerRef=useRef(null), callback=useRef(onEvent);
  callback.current=onEvent;
  useEffect(()=>{
    if(!enabled || !stream){setStatus('off');return;}
    if(!window.Worker || !window.createImageBitmap || !window.OffscreenCanvas){setStatus('unavailable');return;}
    let disposed=false, busy=false, ready=false;
    setStatus('loading');
    // MediaPipe loads its WASM factory with importScripts; use Vite's bundled classic worker.
    const worker=new Worker(new URL('../services/vision.worker.js',import.meta.url),{type:'classic'});
    workerRef.current=worker;
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
    video.play().catch(()=>setStatus('unavailable'));
    worker.onmessage=({data})=>{
      if(disposed)return;
      if(data.type==='ready'){ready=true;setStatus('calibrating');}
      if(data.type==='error'){ready=false;busy=false;setStatus('unavailable');}
      if(data.type==='result'){busy=false;setStatus(data.status);setQuality(data.quality);for(const type of data.events)callback.current?.(type,{reason:'Sustained browser-local estimate; human review required'});}
    };
    worker.onerror=()=>{ready=false;busy=false;setStatus('unavailable');};
    const assets=new URL('/ai/',window.location.origin);
    worker.postMessage({type:'init',wasm:new URL('wasm/',assets).href,model:new URL('face_landmarker.task',assets).href});
    const timer=setInterval(async()=>{
      if(disposed||!ready||busy||video.readyState<2||document.hidden)return;
      if(!stream.getVideoTracks().some(t=>t.readyState==='live')){ready=false;setStatus('unavailable');return;}
      busy=true;
      try{
        const frame=await createImageBitmap(video,{resizeWidth:480,resizeHeight:360});
        if(disposed){frame.close();return;}
        worker.postMessage({type:'frame',frame,at:performance.now()},[frame]);
      }catch{busy=false;setStatus('unavailable');}
    },350);
    return()=>{disposed=true;clearInterval(timer);worker.terminate();workerRef.current=null;video.pause();video.srcObject=null;};
  },[enabled,stream]);
  const recalibrate=useCallback(()=>{workerRef.current?.postMessage({type:'calibrate'});setStatus('calibrating');},[]);
  return {status,quality,recalibrate};
}
