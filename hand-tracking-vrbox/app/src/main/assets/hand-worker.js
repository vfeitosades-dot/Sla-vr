// MediaPipe hand inference on a dedicated worker thread, to keep VR rendering
// responsive when on-device inference takes longer than a display frame.
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/';
const MODEL='https://cdn.jsdelivr.net/npm/expo-vision-camera-v4-mediapipe@1.4.0/hand_landmarker.task';
let model=null,canvas=null,ctx=null,lastTs=0;
async function init(){
  if(typeof OffscreenCanvas==='undefined')throw Error('OffscreenCanvas indisponível');
  const {FilesetResolver,HandLandmarker}=await import(CDN+'vision_bundle.mjs');
  const fs=await FilesetResolver.forVisionTasks(CDN+'wasm');
  model=await HandLandmarker.createFromOptions(fs,{
    baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},
    runningMode:'VIDEO',numHands:2,
    minHandDetectionConfidence:.46,
    minHandPresenceConfidence:.45,
    minTrackingConfidence:.56
  });
  canvas=new OffscreenCanvas(320,240);
  ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  if(!ctx)throw Error('Canvas do detector indisponível');
  self.postMessage({type:'ready'});
}
self.onmessage=async e=>{
  const data=e.data||{};
  if(data.type!=='frame'||!model)return;
  const bitmap=data.bitmap;
  try{
    const width=Math.max(1,bitmap.width||320),height=Math.max(1,bitmap.height||240);
    const targetHeight=Math.max(120,Math.round(320*height/width));
    if(canvas.height!==targetHeight)canvas.height=targetHeight;
    ctx.drawImage(bitmap,0,0,320,targetHeight);
    const now=Math.max(lastTs+1,Number(data.timestamp)||performance.now());
    lastTs=now;
    const result=model.detectForVideo(canvas,now);
    self.postMessage({type:'result',landmarks:result.landmarks||[]});
  }catch(err){
    self.postMessage({type:'frame-error',message:String(err?.message||err)});
  }finally{
    if(bitmap&&typeof bitmap.close==='function')bitmap.close();
  }
};
init().catch(err=>self.postMessage({type:'init-error',message:String(err?.message||err)}));
