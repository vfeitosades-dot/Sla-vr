'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const main=path.join(__dirname,'../app/src/main');
const html=fs.readFileSync(path.join(main,'assets/index.html'),'utf8');
const native=fs.readFileSync(path.join(main,'java/com/handtracking/vrbox/MainActivity.java'),'utf8');
const start=html.indexOf('const clampVR=');
const end=html.indexOf('function updateVRCalibration(){',start);
assert(start>=0&&end>start,'physical VR calibration functions missing');
const ctx={Math,innerWidth:800,innerHeight:400};
vm.createContext(ctx);
new vm.Script(html.slice(start,end),{filename:'vr-calibration.js'}).runInContext(ctx);
const phys={ipdMm:64,screenMm:156,shift:0,vertical:0,zoom:1.16};
const expected=(50-100*64/156);
const x=ctx.lensCenterShiftPercent(phys);
assert(Math.abs(x-expected)<1e-8,'lens distance must be computed from real screen width');
const left=ctx.vrTransforms(0,phys),right=ctx.vrTransforms(1,phys);
assert(Math.abs(left.x-expected)<.001);
assert(Math.abs(right.x+expected)<.001,'eyes must move symmetrically inward');
assert.equal(left.y,right.y);
assert.equal(left.scale,right.scale);
const mmInEye=156/2;
const centerSeparation=mmInEye-(left.x/100*mmInEye+Math.abs(right.x)/100*mmInEye);
assert(Math.abs(centerSeparation-64)<1e-8,'screen optical centers must be 64 mm apart');
const far={...phys,ipdMm:72};
assert(ctx.vrTransforms(0,far).x<left.x,'increased IPD must move images apart');
const near={...phys,ipdMm:58};
assert(ctx.vrTransforms(0,near).x>left.x,'smaller IPD must move images closer');
const fine={...phys,shift:3};
assert(ctx.vrTransforms(0,fine).x>left.x,'fine calibration should move lenses symmetrically');
const high={...phys,vertical:4},up=ctx.vrTransforms(0,high);
assert(up.y>0,'vertical offset in mm should be converted to CSS screen percentage');
const bounds=ctx.vrTransforms(0,{ipdMm:100,screenMm:100,shift:100,vertical:100,zoom:100});
assert(Number.isFinite(bounds.x)&&Number.isFinite(bounds.y));
assert(bounds.scale<=1.65);
for(const fragment of [
 'pocketspace.vr.optics.v2','function detectPhysicalScreen(){',
 "VRNative.getDisplayInfo()","VRNative.setVrMode(on)",
 "function setCalibrationSession(on){","window.onVRVolumeAdjust=delta=>",
 "VRNative.setVrCalibrationActive(vrCalibrationSession)",
 "scene.append(vid,overlay,target)","scene.style.transform='translate3d(",
 "defaultVRCalibration={ipdMm:64,screenMm:156,shift:0,zoom:1.16,vertical:0,guides:false,eyeMode:'both'}",
 "if(vr){if(fastStereo)drawFastVR();else drawVR();}",
 "function drawFastVR()","function onLandmarks(L)","function drawWin(W)"
])assert(html.includes(fragment),'feature missing: '+fragment);
for(const fragment of [
 '@JavascriptInterface public String getDisplayInfo()',
 'getRealMetrics(metrics)',
 '@JavascriptInterface public void setVrCalibrationActive(boolean active)',
 '@JavascriptInterface public void setVrMode(boolean on)',
 'SCREEN_ORIENTATION_LANDSCAPE',
 'vrCalibrationActive',
 'KeyEvent.KEYCODE_VOLUME_UP',
 'KeyEvent.KEYCODE_VOLUME_DOWN'
])assert(native.includes(fragment),'native VR configuration missing: '+fragment);
console.log('PASS: optical centers in mm, IPD control direction, symmetric shift, safe bounds, native landscape and volume calibration');
