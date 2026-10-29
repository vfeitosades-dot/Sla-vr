'use strict';
const assert = require('node:assert/strict');
const THREE = require('./three.min.js');
const WIDTH=128, HEIGHT=96;
let pixels, now=1000;
global.document={hidden:false,createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
global.performance={now:()=>now};
global.setTimeout=()=>1;
global.clearTimeout=()=>{};
const PocketTracker=require('./tracking.js');
let seed=1337;const base=new Uint8ClampedArray(WIDTH*HEIGHT);
for(let i=0;i<base.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;base[i]=seed>>>24;}
function image(dx,dy){const rgba=new Uint8ClampedArray(WIDTH*HEIGHT*4);for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){let xx=x-dx,yy=y-dy;const value=xx>=0&&xx<WIDTH&&yy>=0&&yy<HEIGHT?base[yy*WIDTH+xx]:127;let k=(y*WIDTH+x)*4;rgba[k]=rgba[k+1]=rgba[k+2]=value;rgba[k+3]=255;}return rgba;}
function cameraImageMotion(yaw,pitch){const camera=new THREE.PerspectiveCamera(2*Math.atan(.75*Math.tan(Math.PI/6))*180/Math.PI,WIDTH/HEIGHT,.1,100);camera.rotation.order='YXZ';const point=new THREE.Vector3(0,0,-3);camera.updateMatrixWorld(true);let before=point.clone().project(camera);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld(true);let after=point.clone().project(camera);let direction=new THREE.Vector3();camera.getWorldDirection(direction);return {dx:(after.x-before.x)*WIDTH/2,dy:-(after.y-before.y)*HEIGHT/2,direction};}
for(const [name,yaw,pitch,signX,signY] of [['look left',.02,0,1,0],['look right',-.02,0,-1,0],['look up',0,.02,0,1],['look down',0,-.02,0,-1]]){
 const projected=cameraImageMotion(yaw,pitch);
 assert.equal(Math.sign(projected.dx)||0,signX,name+' physical x image displacement');
 assert.equal(Math.sign(projected.dy)||0,signY,name+' physical y image displacement');
 // Get actual tick() conversion, not just the pixel-only estimator.
 const dx=Math.round(projected.dx),dy=Math.round(projected.dy);let result=null;
 const tracker=new PocketTracker({readyState:4,videoWidth:640,videoHeight:480},p=>result=p);
 pixels=image(0,0);now+=100;tracker.start();pixels=image(dx,dy);now+=67;tracker.tick();tracker.stop();
 assert(result && result.confidence>=.4,name+' reliable estimate');
 if(yaw){assert.equal(Math.sign(result.yaw),Math.sign(yaw),name+' yaw sign');assert.equal(Math.sign(projected.direction.x),-Math.sign(yaw),name+' Three forward X');}
 if(pitch){assert.equal(Math.sign(result.pitch),Math.sign(pitch),name+' pitch sign');assert.equal(Math.sign(projected.direction.y),Math.sign(pitch),name+' Three forward Y');}
 assert(Math.abs(result.yaw-Math.atan(dx/tracker.focalLength))<.002,name+' yaw scale');
 assert(Math.abs(result.pitch-Math.atan(dy/tracker.focalLength))<.002,name+' pitch scale');
}
console.log('PASS: actual optical tick signs agree with Three.js camera projection for left/right/up/down');
