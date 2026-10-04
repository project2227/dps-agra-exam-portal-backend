import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { VisionSignals } from './visionSignals';
let landmarker, signals = new VisionSignals();
self.onmessage=async ({data})=>{
  try{
    if(data.type==='init'){
      const files=await FilesetResolver.forVisionTasks(data.wasm);
      landmarker=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:data.model,delegate:'CPU'},runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:0.65,minFacePresenceConfidence:0.65,minTrackingConfidence:0.65});
      self.postMessage({type:'ready'});
    }else if(data.type==='frame'&&landmarker){
      try{const result=landmarker.detectForVideo(data.frame,data.at);self.postMessage({type:'result',...signals.update(result.faceLandmarks||[],data.at)});}
      finally{data.frame.close();}
    }else if(data.type==='calibrate'){signals=new VisionSignals();}
  }catch{data.frame?.close();self.postMessage({type:'error'});}
};
