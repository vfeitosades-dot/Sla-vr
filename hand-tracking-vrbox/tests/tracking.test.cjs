'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/index.html'),'utf8');
const section=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert(a>=0&&b>a,'source section missing: '+start);
  return html.slice(a,b);
};
const W=96,H=72;
let seed=8130;
const texture=new Uint8Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  texture[y*W+x]=Math.max(0,Math.min(255,Math.round(118+58*Math.sin(x*.57)+52*Math.cos(y*.41)+(seed>>>24)*.22-28)));
}
let pixels;
const gyro={sw:W,sh:H,hw:W>>1,hh:H>>1,prev:new Uint8Array(W*H),cur:new Uint8Array(W*H),smallPrev:new Uint8Array((W>>1)*(H>>1)),smallCur:new Uint8Array((W>>1)*(H>>1)),has:false,ptx:0,pty:0,ok:false,n:0,tot:0,f:(W/2)/Math.tan(70*Math.PI/360),sc:640/W,yaw:0,pitch:0,roll:0,quality:0};
const context={Uint8Array,Set,Math,CW:640,CH:480,tracks:[],gy:gyro,sg2:{drawImage(){},getImageData(){return{data:pixels}}}};
vm.createContext(context);
vm.runInContext(section('function fitSim(', '// o painel fica'),context);
function shifted(dx,dy){
  const data=new Uint8Array(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const xx=x-dx,yy=y-dy,value=xx>=0&&xx<W&&yy>=0&&yy<H?texture[yy*W+xx]:120,k=(y*W+x)*4;
    data[k]=data[k+1]=data[k+2]=value;data[k+3]=255;
  }
  return data;
}
for(const [dx,dy] of [[0,0],[3,0],[-3,0],[8,0],[-8,0],[13,0],[-13,0],[0,7],[5,5],[14,-4]]){
  gyro.has=false;gyro.ptx=gyro.pty=0;
  pixels=shifted(0,0);context.gyroStep({});pixels=shifted(dx,dy);
  const motion=context.gyroStep({});
  assert(motion,'motion not detected: '+dx+','+dy);
  assert(Math.abs(gyro.ptx-dx)<1.6,'wrong yaw on '+dx+','+dy+': '+gyro.ptx);
  assert(Math.abs(gyro.pty-dy)<1.6,'wrong pitch on '+dx+','+dy+': '+gyro.pty);
}
let time=1000;
const handed={CW:640,CH:480,Math,Set,performance:{now:()=>time},VRUI:{handsEnabled:true}};
vm.createContext(handed);
vm.runInContext(section('class OE{','function shape(')+'\nglobalThis.handTest={tracks,onLandmarks};',handed);
const {tracks,onLandmarks}=handed.handTest;
const hand=(x)=>Array.from({length:21},(_,i)=>({x:x+(i%4)*.002,y:.3+(i%5)*.012,z:-.04+(i%3)*.002}));
onLandmarks([hand(.2),hand(.7)]);
assert.equal(tracks.length,2,'two hands should be tracked');
const first=tracks[0],second=tracks[1];
time+=65;
onLandmarks([hand(.72),hand(.22)]);
assert.equal(tracks[0],first,'first hand track must persist');
assert.equal(tracks[1],second,'second hand track must persist');
assert(first.f[0][0]<second.f[0][0],'hand identities swapped');
onLandmarks([[{x:NaN,y:0,z:0}]]);
assert.equal(tracks.length,2,'invalid landmarks must be ignored');
console.log('PASS: 10 motion cases including +/-13 px horizontal, two-hand association and invalid landmarks');
