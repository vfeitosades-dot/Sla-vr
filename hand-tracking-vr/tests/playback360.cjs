const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const html = fs.readFileSync(process.argv[2]);
  const server = http.createServer((req,res) => {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  try {
    const page = await browser.newPage({viewport:{width:960,height:540}});
    page.on('requestfailed',r=>console.log('NETWORK',r.url(),r.failure()));
    page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url())});
    page.on('console',m=>console.log('BROWSER',m.type(),m.text()));
    const errors = [];
    page.on('pageerror',e => errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(() => {
      window.Android={setVR(){},setImmersive360(){},positionYouTube(){},pauseYouTube(){}};
    });
    const entries = await page.evaluate(() => CATALOG360.map(x=>x.title));
    for(let i=0;i<entries.length;i++){
      await page.evaluate(() => setVR(true));
      await page.evaluate(index => {select360(index)}, i);
      await page.waitForFunction(() => vv.readyState>=2 || v360.error, {timeout:90000});
      await page.waitForFunction(() => vv.currentTime > .1 || v360.error, {timeout:30000});
      const result = await page.evaluate(() => {
        draw360();
        const pixels=new Uint8Array(g360.width*g360.height*4);
        gl3.readPixels(0,0,g360.width,g360.height,gl3.RGBA,gl3.UNSIGNED_BYTE,pixels);
        let left=0,right=0;
        for(let y=0;y<g360.height;y+=8)for(let x=0;x<g360.width;x+=8){
          const k=(y*g360.width+x)*4;
          if(pixels[k]+pixels[k+1]+pixels[k+2]>30){if(x<g360.width/2)left++;else right++}
        }
        const before=Array.from(pixels);
        update360Pose(1,0,0,0,90);
        update360Pose(Math.cos(.6),0,Math.sin(.6),0,90);
        draw360();
        gl3.readPixels(0,0,g360.width,g360.height,gl3.RGBA,gl3.UNSIGNED_BYTE,pixels);
        let changed=0;for(let k=0;k<pixels.length;k+=64)if(Math.abs(pixels[k]-before[k])>20)changed++;
        return {mediaError:vv.error&&{code:vv.error.code,message:vv.error.message},error:v360.error,left,right,changed,glError:gl3.getError(),stereo:v360.stereo,
          exitButtons:bar360.querySelectorAll('button').length,exitVisible:getComputedStyle(bar360).display,
          width:vv.videoWidth,height:vv.videoHeight,on:v360.on,vr};
      });
      assert.equal(result.error,'',JSON.stringify(result));
      assert.equal(result.on,true);assert.equal(result.stereo,true);assert.equal(result.vr,true);
      assert.equal(result.exitButtons,1);assert.notEqual(result.exitVisible,'none');
      assert.equal(result.glError,0);assert(result.left>100 && result.right>100,JSON.stringify(result));
      assert(result.changed>100,JSON.stringify(result));
      console.log(entries[i],JSON.stringify(result));
      await page.getByRole('button',{name:'Sair do vídeo 360'}).click();
      assert.equal(await page.evaluate(()=>v360.on),false);
      assert.equal(await page.evaluate(()=>vv.paused),true);
      assert.equal(await page.evaluate(()=>vr),true);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: decoded panoramas, both VR eyes, head movement, single exit and VR restoration.');
  } finally {
    await browser.close();await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
