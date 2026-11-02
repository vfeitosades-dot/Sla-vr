'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../app/src/main');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const ui=read('assets/vr-ui.js'),worlds=read('assets/worlds.js');
const html=read('assets/index.html'),java=read('java/com/handtracking/vrbox/MainActivity.java');
new vm.Script(ui);new vm.Script(worlds);
const paths=['/assets/worlds.js','/assets/vr-ui.js','/assets/hand-worker.js'];
for(const p of paths)assert(java.includes('"'+p+'"'),'local file not served: '+p);
assert(java.includes('@JavascriptInterface public void openBrowser'),'native internal browser bridge');
assert(java.includes('browser.loadUrl(value)'),'native browser website loader');
assert(java.includes('if(!"https".equalsIgnoreCase(uri.getScheme())'),'navigation must reject dangerous schemes');
assert(java.includes('browser.setWebViewClient('),'browser must navigate internally');
assert(html.includes('VRUI.draw(xp,panel,')&&html.includes('VRUI.hitTest('),'launcher not hooked to 3D panel');
assert(html.includes('activateVRApp(hit)'),'pinch activation missing');
assert(html.includes("case 'hands-compat'"),'hand detection recovery option missing');
assert(html.includes("if(fastVRActive)renderFastStereo();else drawVR();"),'performance pathway must be retained');

const mock={window:{},Math,Date};
vm.createContext(mock);vm.runInContext(ui,mock);
const launcher=mock.window.VRUI;
const brush={beginPath(){},closePath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},
  fill(){},stroke(){},save(){},restore(){},fillText(){},};
const panel={w:340,h:240};
const projection=(x,y)=>[x+320,y+240,4];
launcher.draw(brush,panel,projection,1000,{drawFPS:60,handsFPS:15});
assert.equal(launcher.hitTest(320-340*.295,240-240*.15+240*.05),'worlds');
assert.equal(launcher.hitTest(320,240-240*.15+240*.05),'browser');
assert.equal(launcher.hitTest(320+340*.295,240-240*.15+240*.05),'youtube');
launcher.page='worlds';
launcher.draw(brush,panel,projection,1000,{drawFPS:60,handsFPS:15});
assert.equal(launcher.hitTest(320-340*.24,240-240*.145+240*.09),'world:passthrough');
assert.equal(launcher.hitTest(320+340*.24,240-240*.145+240*.09),'world:aurora');

const g={beginPath(){},closePath(){},moveTo(){},lineTo(){},stroke(){},fill(){},
  fillRect(){},arc(){},ellipse(){},createLinearGradient(){return{addColorStop(){}}},
  createRadialGradient(){return{addColorStop(){}}}};
const env={window:{},document:{createElement:()=>({width:0,height:0,getContext:()=>g})},Math,Date};
vm.createContext(env);vm.runInContext(worlds,env);
const api=env.window.VRWorlds;
assert.equal(api.list.length,4);
assert.equal(api.render('passthrough',1000,0,0),null);
for(const scene of ['aurora','neon','lunar']){
  assert.equal(api.render(scene,1000,0,0),api.canvas);
  assert.equal(api.render(scene,1100,45,12),api.canvas);
}
console.log('PASS: native HTTPS browser, apps, swipe/pinch hit zones, 3 lightweight perspective worlds');
