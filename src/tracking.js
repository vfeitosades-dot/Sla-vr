/* Horizon Pocket visual motion tracker.
 * Offline feature matching, NOT a trained AI model, SLAM, or absolute head pose.
 * dx/dy are measured image motion in a 128x96 processing frame. yaw/pitch are
 * approximate camera rotation deltas (radians) based on the configured field of
 * view. Translation, moving objects, blur, low light, and lens distortion can
 * invalidate that approximation. Never silently substitute for a gyroscope.
 */
(function (root) {
  'use strict';
  const median = values => {
    const a = values.slice().sort((x, y) => x - y), n = a.length;
    return n ? (a[(n - 1) >> 1] + a[n >> 1]) / 2 : 0;
  };
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

  // Spatially distributed Shi–Tomasi corners; avoids spending all feature
  // matches on one detailed foreground object or one edge of the frame.
  function corners(gray, width, height) {
    const result = [], margin = 12, cols = 7, rows = 5;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = Math.floor(margin + col * (width - 2 * margin) / cols);
        const x1 = Math.floor(margin + (col + 1) * (width - 2 * margin) / cols);
        const y0 = Math.floor(margin + row * (height - 2 * margin) / rows);
        const y1 = Math.floor(margin + (row + 1) * (height - 2 * margin) / rows);
        let best = null;
        for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
          let xx = 0, xy = 0, yy = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const k = (y + j) * width + x + i;
            const gx = (gray[k + 1] - gray[k - 1]) / 2;
            const gy = (gray[k + width] - gray[k - width]) / 2;
            xx += gx * gx; xy += gx * gy; yy += gy * gy;
          }
          const score = (xx + yy - Math.sqrt((xx - yy) ** 2 + 4 * xy * xy)) / 18;
          if (score > 35 && (!best || score > best.score)) best = { x, y, score, col, row };
        }
        if (best) result.push(best);
      }
    }
    return result;
  }

  function patchError(a, b, width, x, y, dx, dy) {
    // Subtract the local mean to tolerate modest automatic exposure changes.
    let diff = 0, diff2 = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const k = (y + j) * width + x + i;
      const d = a[k] - b[k + dy * width + dx];
      diff += d; diff2 += d * d;
    }
    return Math.max(0, diff2 / 25 - (diff / 25) ** 2);
  }

  // Coarse-to-fine tracking: find the rough motion on a half-size frame,
  // then refine it around that motion on the full 128x96 image.
  // Prevents losing horizontal motion when head turns exceed 5 px per sample.
  function match(a,b,w,h,x,y,radius,centerX=0,centerY=0,checkUnique=true) {
    let best=Infinity, bx=0, by=0, found=false;
    const span=2*radius+1, errors=checkUnique?new Float32Array(span*span):null;
    if(errors)errors.fill(Infinity);
    if(x<3||y<3||x>=w-3||y>=h-3)
      return {dx:0,dy:0,bx:0,by:0,error:Infinity,unique:0};
    for(let iy=-radius;iy<=radius;iy++)for(let ix=-radius;ix<=radius;ix++){
      const dx=centerX+ix,dy=centerY+iy,xx=x+dx,yy=y+dy;
      if(xx<3||yy<3||xx>=w-3||yy>=h-3)continue;
      const error=patchError(a,b,w,x,y,dx,dy);
      if(errors)errors[(iy+radius)*span+(ix+radius)]=error;
      if(error<best){best=error;bx=dx;by=dy;found=true}
    }
    if(!found)return {dx:0,dy:0,bx:0,by:0,error:Infinity,unique:0};
    let unique=1;
    if(errors){
      let alternative=Infinity;
      for(let iy=-radius;iy<=radius;iy++)for(let ix=-radius;ix<=radius;ix++){
        if(Math.abs(centerX+ix-bx)<=1&&Math.abs(centerY+iy-by)<=1)continue;
        alternative=Math.min(alternative,errors[(iy+radius)*span+(ix+radius)]);
      }
      unique=(alternative-best)/Math.max(25,alternative);
    }
    const refine=(e1,e0,e2)=>{
      const den=e1-2*e0+e2;
      return den>1?clamp((e1-e2)/(2*den),-.5,.5):0;
    };
    let sx=0,sy=0;
    if(x+bx>=4&&x+bx<w-4&&Math.abs(bx-centerX)<radius)
      sx=refine(patchError(a,b,w,x,y,bx-1,by),best,patchError(a,b,w,x,y,bx+1,by));
    if(y+by>=4&&y+by<h-4&&Math.abs(by-centerY)<radius)
      sy=refine(patchError(a,b,w,x,y,bx,by-1),best,patchError(a,b,w,x,y,bx,by+1));
    return {dx:bx+sx,dy:by+sy,bx,by,error:best,unique};
  }

  function halfSize(gray,w,h){
    const out=new Float32Array((w>>1)*(h>>1)),halfW=w>>1;
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
      const k=y*w+x;
      out[(y>>1)*halfW+(x>>1)]=(gray[k]+gray[k+1]+gray[k+w]+gray[k+w+1])*.25;
    }
    return out;
  }

  function estimate(previous,current,width=128,height=96){
    const points=corners(previous,width,height), valid=[];
    if(points.length<8)return {dx:0,dy:0,confidence:0,features:0,state:'low-texture'};

    const w2=width>>1,h2=height>>1;
    const a2=halfSize(previous,width,height),b2=halfSize(current,width,height);
    const rough=[];
    // Use only a subset for the expensive wide search; refine all 35 points.
    const candidates=points.filter((_,i)=>i%3===0);
    for(const p of candidates){
      const m=match(a2,b2,w2,h2,Math.round(p.x*.5),Math.round(p.y*.5),10);
      if(m.error>900||m.unique<.085||Math.abs(m.bx)>=10||Math.abs(m.by)>=10)continue;
      rough.push({...m,col:p.col,row:p.row});
    }
    let predictX=0,predictY=0,radius=5,coarseReliable=false;
    if(rough.length>=4){
      const mx=median(rough.map(p=>p.dx)),my=median(rough.map(p=>p.dy));
      const inliers=rough.filter(p=>Math.hypot(p.dx-mx,p.dy-my)<1.7);
      const cols=new Set(inliers.map(p=>p.col)).size, rows=new Set(inliers.map(p=>p.row)).size;
      if(inliers.length>=4&&cols>=3&&rows>=2&&inliers.length/rough.length>=.55){
        predictX=Math.round(median(inliers.map(p=>p.dx))*2);
        predictY=Math.round(median(inliers.map(p=>p.dy))*2);
        radius=3;coarseReliable=true;
      }
    }
    for(const p of points){
      const m=match(previous,current,width,height,p.x,p.y,radius,predictX,predictY);
      if(m.error>650||m.unique<.10)continue;
      // Reverse check around the observed displacement, not just around zero.
      // This is essential for large but valid head turns.
      const rx=p.x+m.bx,ry=p.y+m.by;
      const back=match(current,previous,width,height,rx,ry,2,-m.bx,-m.by,false);
      if(!Number.isFinite(back.error)||Math.hypot(m.dx+back.dx,m.dy+back.dy)>1.5)continue;
      valid.push({...m,col:p.col,row:p.row});
    }
    if(valid.length<7)return {dx:0,dy:0,confidence:0,features:valid.length,state:coarseReliable?'lost':'fast-or-blurred'};
    const mx=median(valid.map(p=>p.dx)),my=median(valid.map(p=>p.dy));
    const inliers=valid.filter(p=>Math.hypot(p.dx-mx,p.dy-my)<1.5);
    const columns=new Set(inliers.map(p=>p.col)).size,rows=new Set(inliers.map(p=>p.row)).size;
    const agreement=inliers.length/valid.length;
    if(inliers.length<7||columns<4||rows<3||agreement<.6)
      return {dx:0,dy:0,confidence:0,features:inliers.length,state:'inconsistent'};
    const scatter=median(inliers.map(p=>Math.hypot(p.dx-mx,p.dy-my)));
    const confidence=clamp(agreement*Math.min(1,inliers.length/18)*Math.max(0,1-scatter/1.7),0,1);
    return {dx:median(inliers.map(p=>p.dx)),dy:median(inliers.map(p=>p.dy)),confidence,
      features:inliers.length,state:confidence>=.4?'tracking':'uncertain',coarse:coarseReliable};
  }

  class PocketTracker {
    constructor(video, onPose, options = {}) {
      this.video = video;
      this.onPose = onPose;
      this.width = 128; this.height = 96;
      this.interval = 65; this.running = false; this.timer = null; this.lastVideoFrame=-1;
      this.previous = null; this.lastTime = 0;
      this.focalLength = (this.width / 2) / Math.tan((options.horizontalFovDegrees || 60) * Math.PI / 360);
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width; this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.tick = this.tick.bind(this);
    }
    start() {
      if (this.running) return;
      this.running = true; this.previous = null; this.lastTime = 0; this.lastVideoFrame=-1;
      this.tick();
    }
    stop() {
      this.running = false; clearTimeout(this.timer); this.timer = null;
      this.previous = null; this.lastTime = 0; this.lastVideoFrame=-1;
      // The caller owns the video stream; stopping tracking does not stop camera.
    }
    tick() {
      if (!this.running) return;
      const started = performance.now();
      if (this.shouldTrack && !this.shouldTrack()) { this.previous=null; this.timer=setTimeout(this.tick,200); return; }
      if (document.hidden || this.video.readyState < 2 || !this.video.videoWidth) {
        this.previous = null;
      } else if (Number.isFinite(this.video.currentTime) && this.video.currentTime===this.lastVideoFrame) {
        this.timer=setTimeout(this.tick,25); return;
      } else {
        try {
          if(Number.isFinite(this.video.currentTime))this.lastVideoFrame=this.video.currentTime;
          // Center-crop to 4:3 rather than stretch a widescreen camera image.
          const vw = this.video.videoWidth, vh = this.video.videoHeight;
          const sw = Math.min(vw, vh * this.width / this.height), sh = sw * this.height / this.width;
          this.ctx.drawImage(this.video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, this.width, this.height);
          const rgba = this.ctx.getImageData(0, 0, this.width, this.height).data;
          const gray = new Float32Array(this.width * this.height);
          for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) / 256;
          if (this.previous && started - this.lastTime < 400) {
            const p = estimate(this.previous, gray, this.width, this.height);
            // Three.js YXZ: image motion right means camera yaw left (+Y); down means pitch up (+X).
            p.yaw = Math.atan(p.dx / this.focalLength);
            p.pitch = Math.atan(p.dy / this.focalLength);
            p.timestamp = started; p.dt = started - this.lastTime;
            p.units = 'processing-pixels';
            this.onPose(p);
          }
          this.previous = gray; this.lastTime = started;
        } catch (e) {
          this.previous = null;
          this.onPose({ dx: 0, dy: 0, yaw: 0, pitch: 0, confidence: 0, features: 0, state: 'camera-error', units: 'processing-pixels' });
        }
      }
      if (this.running) {const cost=performance.now()-started;this.timer=setTimeout(this.tick,Math.max(25,cost*.65,this.interval-cost));}
    }
  }
  PocketTracker.estimate = estimate;
  root.PocketTracker = PocketTracker;
  if (typeof module === 'object' && module.exports) module.exports = PocketTracker;
})(typeof window !== 'undefined' ? window : globalThis);
