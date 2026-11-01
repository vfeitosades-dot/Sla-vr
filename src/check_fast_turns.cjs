'use strict';
// Deterministic camera-motion tests: large per-frame shifts used to be rejected
// when the search radius was five pixels. No Android hardware is simulated.
const assert=require('node:assert/strict');
const WIDTH=128,HEIGHT=96;
let pixels,now=1000;
global.document={hidden:false,createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
global.performance={now:()=>now};
global.setTimeout=()=>1;
global.clearTimeout=()=>{};
const PocketTracker=require('./tracking.js');
let seed=7001;
const raw=new Float32Array(WIDTH*HEIGHT);
for(let i=0;i<raw.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;raw[i]=seed>>>24;}
const base=new Uint8ClampedArray(raw.length);
// Smoothed noise approximates detail in real-world surfaces (not raw sensor noise).
for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  let sum=0,total=0;
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const xx=Math.max(0,Math.min(WIDTH-1,x+ox));
    const yy=Math.max(0,Math.min(HEIGHT-1,y+oy));
    const weight=(ox===0?2:1)*(oy===0?2:1);
    sum+=raw[yy*WIDTH+xx]*weight;total+=weight;
  }
  base[y*WIDTH+x]=sum/total;
}
function shifted(dx,dy){
  const rgba=new Uint8ClampedArray(WIDTH*HEIGHT*4);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    const xx=x-dx,yy=y-dy;
    const value=xx>=0&&xx<WIDTH&&yy>=0&&yy<HEIGHT?base[yy*WIDTH+xx]:127;
    const k=(y*WIDTH+x)*4;
    rgba[k]=rgba[k+1]=rgba[k+2]=value;rgba[k+3]=255;
  }
  return rgba;
}
function exercise(dx,dy){
  let result;
  const video={readyState:4,videoWidth:960,videoHeight:720};
  const tracker=new PocketTracker(video,p=>result=p);
  pixels=shifted(0,0);now+=150;tracker.start();
  pixels=shifted(dx,dy);now+=67;tracker.tick();tracker.stop();
  assert(result, 'must emit a tracking frame');
  assert(result.confidence>=.4, 'lost motion '+dx+','+dy+': '+JSON.stringify(result));
  assert(Math.abs(result.dx-dx)<1.5,'incorrect dx '+dx+' got '+result.dx);
  assert(Math.abs(result.dy-dy)<1.5,'incorrect dy '+dy+' got '+result.dy);
  if(dx)assert.equal(Math.sign(result.yaw),Math.sign(dx),'yaw direction '+dx);
  else assert(Math.abs(result.yaw)<.012,'unexpected yaw '+result.yaw);
  if(dy)assert.equal(Math.sign(result.pitch),Math.sign(dy),'pitch direction '+dy);
  else assert(Math.abs(result.pitch)<.012,'unexpected pitch '+result.pitch);
}
for(const [dx,dy] of [[8,0],[-8,0],[12,0],[-12,0],[16,0],[-16,0],[0,9],[9,4],[-11,-3]])exercise(dx,dy);
console.log('PASS: fast horizontal optical shifts plus mixed-axis movement');
