'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.join(__dirname,'../app/src/main');
const html=fs.readFileSync(path.join(dir,'assets/index.html'),'utf8');
const native=fs.readFileSync(path.join(dir,'java/com/handtracking/vrbox/MainActivity.java'),'utf8');
const worker=fs.readFileSync(path.join(dir,'assets/hand-worker.js'),'utf8');
const section=(a,b)=>{
 const start=html.indexOf(a),end=html.indexOf(b,start);
 assert(start>=0&&end>start,'source section missing: '+a);
 return html.slice(start,end);
};
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
new vm.Script(script);
new vm.Script(worker,{filename:'hand-worker.js'});

// Main bottleneck: old VR path uploaded the camera to WebGL on every camera frame,
// then copied 3 other canvases to WebGL. The fast path must bypass that compositor.
assert(html.includes('id="fastvr"'),'direct video VR container missing');
assert(html.includes("if(fastVRActive)renderFastStereo();else drawVR();"),'fast VR not selected');
assert(html.includes("if(fastVRActive){paintVRHand(xp,T);continue}"),'extra hand canvases rendered in fast mode');
assert(html.includes('cf.width=co.width=1'),'hidden canvases must shrink in fast mode');
assert(html.includes('R=on?.70:1'),'VR overlay must be low resolution');
assert(html.includes('R=Math.max(.54'),'adaptive reduction missing');
assert(html.includes("const FOVL=70"),'camera tracking lost');
assert(html.includes('const float K1=.20,K2=.08,SC=.88;'),'lens fallback lost');
assert(html.includes('onLandmarks(await det(v))'),'compatibility hand detector lost');
assert(!html.includes('now-lastVRDraw>26'),'30 Hz artificial render throttle');
assert(native.includes('"/assets/hand-worker.js"'),'Android needs to serve same-origin worker');
assert(worker.includes("delegate:'CPU'"),'inference worker should avoid competing for VR GPU');
assert(worker.includes('detectForVideo(canvas,now)'),'hand inference missing');

// Verify stereo creates two actual video compositing surfaces sharing ONE stream,
// with matching overlays, and entering and exiting does not open a new camera.
const stats=[];
const stream={id:'one camera stream'};
const canvases=[];
function el(tag){
  const element={tagName:tag,style:{},children:[],width:1,height:1,srcObject:null,
    append(...children){this.children.push(...children)},
    appendChild(child){this.children.push(child)},
    setAttribute(){},
    play(){this.playing=true;return Promise.resolve()},
    pause(){this.playing=false}};
  if(tag==='canvas'){
    const draws=[];
    element.getContext=()=>({draws,clearRect(){},drawImage(source){draws.push(source)}});
    canvases.push(element);
  }
  return element;
}
const layout={
  document:{createElement:el},fastvr:el('div'),stage:el('div'),glc:el('canvas'),
  cp:{width:400,height:300},v:{srcObject:stream},perfInfo:{drawFPS:59,handsFPS:14},
  console,Math
};
vm.createContext(layout);
vm.runInContext(section('let fastVRActive=false,fastVREyes=[];','function makeTexture('),layout);
layout.setFastStereo(true);
const eyes=vm.runInContext('fastVREyes',layout);
assert.equal(eyes.length,2);
assert.equal(eyes[0].video.srcObject,stream);
assert.equal(eyes[1].video.srcObject,stream);
assert.equal(layout.fastvr.style.display,'flex');
assert.equal(layout.stage.style.visibility,'hidden');
layout.renderFastStereo();
assert.equal(eyes[0].ctx.draws.length,1);
assert.equal(eyes[1].ctx.draws.length,1);
assert.equal(eyes[0].ctx.draws[0],layout.cp);
assert.equal(eyes[0].overlay.width,400);
assert.equal(eyes[1].overlay.height,300);
layout.showVRStats();
assert.match(eyes[0].stats.textContent,/59 FPS/);
layout.setFastStereo(false);
assert.equal(eyes[0].video.srcObject,null);
assert.equal(layout.fastvr.style.display,'none');
assert.equal(layout.stage.style.visibility,'');

// Ensure video snapshots are transferred to the worker and inference never
// executes on the main thread when background mode is available.
let currentWorker;
class FakeWorker{
  constructor(url,options){assert.equal(url,'/assets/hand-worker.js');assert.equal(options.type,'module');currentWorker=this}
  postMessage(value,transfers){this.data=value;this.transfers=transfers}
  terminate(){this.terminated=true}
  emit(value){this.onmessage({data:value})}
}
let foundHands,handCount=0,bitmap={closed:false,close(){this.closed=true}};
const hands={Worker:FakeWorker,createImageBitmap:async()=>bitmap,
  setTimeout:()=>3,clearTimeout(){},performance:{now:()=>123},mode:'',
  onLandmarks:points=>{foundHands=points},handCount:0,
  console,Promise,Error};
vm.createContext(hands);
vm.runInContext(section('async function initWorkerHands(){','async function initTasks(){'),hands);
(async()=>{
 const promise=hands.initWorkerHands();
 currentWorker.emit({type:'ready'});
 const detect=await promise;
 assert.equal(detect.worker,true);
 await detect({readyState:4});
 assert.equal(currentWorker.data.type,'frame');
 assert.equal(currentWorker.transfers[0],bitmap);
 currentWorker.emit({type:'result',landmarks:[[{x:.2,y:.3,z:.1}]]});
 assert.equal(foundHands.length,1);
 assert.equal(hands.handCount,1);
 console.log('PASS: native dual-video stereo, one camera stream, single overlay, 60Hz renderer, worker hand inference, clean VR teardown');
})().catch(e=>{console.error(e);process.exitCode=1});
