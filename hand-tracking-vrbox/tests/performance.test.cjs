'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/index.html'),'utf8');
function section(a,b){
  const from=html.indexOf(a),to=html.indexOf(b,from);
  assert(from>=0&&to>from,'source section not found: '+a);
  return html.slice(from,to);
}
// The UI still renders at requestAnimationFrame cadence, unlike the old 26ms limiter.
assert(html.includes('if(vr){lastVRDraw=now;drawVR();}'),'VR render must not use an artificial ~30 FPS cap');
assert(!html.includes('now-lastVRDraw>26'));
assert(html.includes('const vrMaxHeight=480,vrMinHeight=400'),'dynamic render scaling absent');
assert(html.includes('R=on?.86:1')||html.includes('R=on?.9:1'),'VR panel overlays must use fewer pixels');
assert(html.includes('xp.globalAlpha=.10;xp.drawImage(cf,0,0)')&&html.includes('xp.globalAlpha=.95;xp.drawImage(co,0,0)'),'VR must compose original hand silhouettes and outlines');
assert(html.includes('const FOVL=70')&&html.includes('const float K1=.20,K2=.08,SC=.88;'),'orientation/lens constants lost');
assert(html.includes('onLandmarks(await det(v))'),'live hand tracking lost');
assert(!html.includes('const vrc=document.createElement'),'intermediate stereo canvas must be eliminated');

// Render resolution: cap at 480px, dynamically downscale to 400px.
// Lower DPI and shorter phone dimensions must not allocate larger textures.
const sizer={devicePixelRatio:3,innerWidth:854,innerHeight:393,glc:{width:0,height:0},
  vrQualityHeight:480,vrMaxHeight:480,gl:null,perfInfo:{renderScale:0},msg:{textContent:''},vr:true,
  Math,addEventListener(){}};
vm.createContext(sizer);
vm.runInContext(section('function sizeVR(){',"addEventListener('resize'"),sizer);
sizer.sizeVR();
assert.equal(sizer.glc.height,480);
assert.equal(sizer.glc.width,Math.round(480*854/393/2)*2);
const initialWidth=sizer.glc.width;
sizer.sizeVR();
assert.equal(sizer.glc.width,initialWidth);
sizer.vrQualityHeight=400;
sizer.sizeVR();
assert.equal(sizer.glc.height,400);
sizer.innerHeight=240;
sizer.sizeVR();
assert.equal(sizer.glc.height,324,'DPR capped at 1.35');

// Video to GPU: a camera frame is uploaded ONCE, even when the visual
// overlay is rendered repeatedly at the display refresh rate.
const transfers=[];
const mockGL={
  TEXTURE0:33984,TEXTURE1:33985,TEXTURE_2D:3553,RGBA:6408,UNSIGNED_BYTE:5121,TRIANGLE_STRIP:5,
  activeTexture(unit){transfers.push(['active',unit])},
  bindTexture(){},
  texImage2D(...args){transfers.push(['image',args[args.length-1]])},
  texSubImage2D(...args){transfers.push(['sub',args[args.length-1]])},
  uniform1f(){},
  drawArrays(){transfers.push(['draw'])}
};
const v={readyState:4,videoWidth:576,videoHeight:432,currentTime:3};
const cp={width:494,height:371};
const upload={gl:mockGL,v,cp,glVideoTime:-1,glVideoTex:{},glOverlayTex:{},
  glVideoW:0,glVideoH:0,glOverlayW:0,glOverlayH:0,glCamAspect:{},glOverlayAspect:{},Math};
vm.createContext(upload);
vm.runInContext(section('function drawVR(){','async function setVR('),upload);
upload.drawVR();
assert.equal(transfers.filter(x=>x[0]==='image').length,2,'camera and overlay should each be uploaded once');
assert.equal(transfers.filter(x=>x[0]==='draw').length,1);
transfers.length=0;
upload.drawVR();
assert.equal(transfers.filter(x=>x[0]==='sub'&&x[1]===v).length,0,'duplicate camera frame must not reupload');
assert.equal(transfers.filter(x=>x[0]==='sub'&&x[1]===cp).length,1,'overlay still refreshes smoothly');
v.currentTime=3.033;
transfers.length=0;upload.drawVR();
assert.equal(transfers.filter(x=>x[0]==='sub'&&x[1]===v).length,1,'new camera frame must upload');
assert.equal(transfers.filter(x=>x[0]==='draw').length,1);

console.log('PASS: 60Hz-capable render loop; 400-480px adaptive VR; single direct GPU pass; camera uploaded only on frame changes.');
