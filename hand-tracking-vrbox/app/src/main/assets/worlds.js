/* Lightweight procedural VR environments. Pure Canvas 2D, no downloads or large 3D assets. */
(function(){
  'use strict';
  const WORLD_LIST=[
    {id:'passthrough',name:'Câmera real',detail:'Veja o ambiente ao redor',icon:'◉'},
    {id:'aurora',name:'Ilhas do céu',detail:'Ilhas suspensas e aurora',icon:'☁'},
    {id:'neon',name:'Cidade neon',detail:'Uma cidade futurista',icon:'◇'},
    {id:'lunar',name:'Base lunar',detail:'Exploração no espaço',icon:'☾'}
  ];
  const palettes={
    aurora:{sky0:'#101e44',sky1:'#7e6097',floor:'#324b6a',grid:'#7992b1',accent:'#adf6d8',glow:'#f7d499'},
    neon:{sky0:'#080a23',sky1:'#2f1f62',floor:'#111a32',grid:'#5246a2',accent:'#6df8fa',glow:'#fe65d1'},
    lunar:{sky0:'#070d22',sky1:'#1e3154',floor:'#26334c',grid:'#657799',accent:'#c5e9ff',glow:'#ffdca4'}
  };
  const canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=240;
  const g=canvas.getContext('2d',{alpha:false});
  let lastFrame=-Infinity,lastKey='';
  function project(x,y,z,yaw,pitch){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const X=x*cy-z*sy,Z=x*sy+z*cy;
    const Y=y*cp-Z*sp,D=y*sp+Z*cp;
    if(D<.45)return null;
    const f=canvas.width*.9;
    return [canvas.width*.5+X*f/D,canvas.height*.53-Y*f/D,D];
  }
  function line(a,b,color,width=1){
    if(!a||!b)return;
    g.strokeStyle=color;g.lineWidth=width;
    g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
  }
  function polygon(points,fill,stroke){
    if(points.some(p=>!p))return;
    g.fillStyle=fill;
    g.beginPath();g.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
    g.closePath();g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}
  }
  function quad(x1,x2,y1,y2,z1,z2,yaw,pitch,color,rim){
    // Upright face of a stylized building/pillar at fixed depth.
    const points=[[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]]
      .map(p=>project(p[0],p[1],p[2],yaw,pitch));
    polygon(points,color,rim);
    line(project(x2,y1,z1,yaw,pitch),project(x2,y1,z2,yaw,pitch),rim);
    line(project(x2,y2,z1,yaw,pitch),project(x2,y2,z2,yaw,pitch),rim);
    polygon([[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]]
      .map(p=>project(p[0],p[1],p[2],yaw,pitch)),color,rim);
  }
  function ring(x,y,z,r,yaw,pitch,color){
    const p=project(x,y,z,yaw,pitch);if(!p)return;
    const radius=Math.max(1.5,canvas.width*.9*r/p[2]);
    if(radius>1200)return;
    g.fillStyle=color;g.beginPath();g.arc(p[0],p[1],radius,0,Math.PI*2);g.fill();
  }
  function render(id,now,heading,elevation){
    if(!palettes[id])return null;
    const yaw=(((heading||0)%360)*Math.PI/180);
    const pitch=Math.max(-35,Math.min(35,elevation||0))*Math.PI/180;
    const bucket=Math.floor(now/105);
    const key=id+'|'+bucket+'|'+Math.round(yaw*120)+'|'+Math.round(pitch*120);
    if(key===lastKey)return canvas;
    lastKey=key;lastFrame=now;
    const p=palettes[id],w=canvas.width,h=canvas.height;
    const background=g.createLinearGradient(0,0,0,h);
    background.addColorStop(0,p.sky0);background.addColorStop(.6,p.sky1);background.addColorStop(1,p.floor);
    g.fillStyle=background;g.fillRect(0,0,w,h);
    // Distant glowing lights and simple celestial body; not complex particle systems.
    const cx=w*.77-Math.sin(yaw)*38,cy=h*.23+Math.sin(pitch)*40;
    const glow=g.createRadialGradient(cx,cy,0,cx,cy,72);
    glow.addColorStop(0,id==='neon'?'#fc79d944':'#e0fcff55');glow.addColorStop(1,'#00000000');
    g.fillStyle=glow;g.fillRect(cx-73,cy-73,146,146);
    if(id==='lunar')ring(17,11,72,6,yaw,pitch,'#dfedff');
    if(id==='aurora'){
      g.strokeStyle='#75f4d353';g.lineWidth=9;
      for(let k=0;k<3;k++){
        g.beginPath();
        for(let t=0;t<=w;t+=12){
          const py=72+k*9+Math.sin(t*.015+now*.00018+k)*11+pitch*80;
          if(!t)g.moveTo(t,py);else g.lineTo(t,py);
        }
        g.stroke();
      }
    }
    if(id==='lunar'||id==='neon'){
      for(let i=0;i<28;i++){
        const sx=(i*101+39)%w,sy=(i*41+7)%Math.round(h*.52);
        g.fillStyle=i%3===0?'#e3faff':'#91b7ff66';g.fillRect(sx,sy,1.4,1.4);
      }
    }
    // True perspective-projected floor grid rotates with camera look direction.
    for(let x=-18;x<=18;x+=3){
      line(project(x,-1.65,1.5,yaw,pitch),project(x,-1.65,38,yaw,pitch),p.grid+'88',.7);
    }
    for(const z of [2,3,4,5.5,7.5,10,14,19,27,37]){
      line(project(-21,-1.65,z,yaw,pitch),project(21,-1.65,z,yaw,pitch),p.grid+'88',.7);
    }
    const objs=[];
    for(let side=-1;side<=1;side+=2)for(let i=0;i<6;i++){
      const zz=7+i*5+(side===-1?2:0);
      objs.push({x:side*(4.5+(i%2)*2),z:zz,h:3+i%3*1.2});
    }
    objs.sort((a,b)=>b.z-a.z);
    for(const o of objs){
      if(id==='neon'){
        quad(o.x-1,o.x+1,-1.65,o.h,o.z,o.z+1.5,yaw,pitch,'#18223c','#60deef');
        for(let y=0;y<o.h;y+=1)
          line(project(o.x-.7,y,o.z-.03,yaw,pitch),project(o.x+.7,y,o.z-.03,yaw,pitch),'#dd6af195',.8);
      }else if(id==='aurora'){
        // Miniature floating island clusters.
        const pos=project(o.x,o.h*.4,o.z,yaw,pitch);
        if(pos){ring(o.x,o.h*.4,o.z,.8,yaw,pitch,'#c7edca');
          line(project(o.x,o.h*.4,o.z,yaw,pitch),project(o.x,o.h*.4-2,o.z,yaw,pitch),'#6e8fa0',3);
          ring(o.x,o.h*.4+1,o.z,.38,yaw,pitch,'#8be3b9');
        }
      }else{
        quad(o.x-.9,o.x+.9,-1.65,o.h*.45,o.z,o.z+1,yaw,pitch,'#3b577a','#a9e6ff');
        ring(o.x,o.h*.7,o.z,.5,yaw,pitch,'#c7e6fb');
      }
    }
    // Distant hover element for sense of depth.
    const wave=.3*Math.sin(now*.0009);
    ring(0,1.7+wave,13,1.0,yaw,pitch,p.glow);
    ring(0,1.7+wave,13,.65,yaw,pitch,p.accent);
    const center=project(0,-1.4,7,yaw,pitch);
    if(center){g.fillStyle=p.accent;g.globalAlpha=.18;g.beginPath();g.ellipse(center[0],center[1],20,5,0,0,Math.PI*2);g.fill();g.globalAlpha=1;}
    return canvas;
  }
  window.VRWorlds={list:WORLD_LIST,render,canvas};
})();
