/* Original lightweight VR home launcher, rendered inside the draggable floating panel. */
(function(){
  'use strict';
  const ui={
    page:'home',world:'passthrough',handsEnabled:true,hud:true,detail:'',hover:null,
    hitZones:[],lastActionAt:0,
    worldTitle(){return ({passthrough:'Câmera real',aurora:'Ilhas do céu',neon:'Cidade neon',lunar:'Base lunar'})[this.world]||'Câmera real';}
  };
  const pages={
    home:[
      {id:'worlds',name:'Mundos',symbol:'◈',color:'#82f6bf'},
      {id:'browser',name:'Navegador',symbol:'◎',color:'#8ebcff'},
      {id:'youtube',name:'YouTube',symbol:'▶',color:'#f78b9d'},
      {id:'google',name:'Pesquisar',symbol:'⌕',color:'#f8dc9b'},
      {id:'clock',name:'Relógio',symbol:'◷',color:'#c3a7ff'},
      {id:'settings',name:'Ajustes',symbol:'⚙',color:'#b2e2e3'}
    ],
    worlds:[
      {id:'world:passthrough',name:'Câmera real',symbol:'◉',color:'#87c5ff'},
      {id:'world:aurora',name:'Ilhas do céu',symbol:'☁',color:'#a5f5be'},
      {id:'world:neon',name:'Cidade neon',symbol:'◆',color:'#ef87e6'},
      {id:'world:lunar',name:'Base lunar',symbol:'☾',color:'#d5def8'}
    ]
  };
  function pointInPoly(point,corners){
    let inside=false;const x=point[0],y=point[1];
    for(let i=0,j=corners.length-1;i<corners.length;j=i++){
      const a=corners[i],b=corners[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1]+1e-6)+a[0])inside=!inside;
    }
    return inside;
  }
  function roundRect2d(g,x,y,w,h,r){
    r=Math.max(0,Math.min(r,w/2,h/2));
    g.beginPath();
    g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
    g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
    g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
  }
  function drawQuad(g,project,x,y,w,h,fill,stroke,radius){
    // Perspective quad, compatible with the panel's hand-controlled quaternion.
    const corners=[
      project(x-w/2,y-h/2,0),project(x+w/2,y-h/2,0),
      project(x+w/2,y+h/2,0),project(x-w/2,y+h/2,0)
    ];
    if(corners.some(p=>!p||!Number.isFinite(p[0])||!Number.isFinite(p[1])))return [];
    g.beginPath();g.moveTo(corners[0][0],corners[0][1]);
    for(let i=1;i<4;i++)g.lineTo(corners[i][0],corners[i][1]);
    g.closePath();g.fillStyle=fill;g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke();}
    return corners;
  }
  function label(g,project,x,y,str,size,color,bold=false,maxWidth){
    const p=project(x,y,.4);if(!p)return;
    g.save();g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';
    g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=2;
    g.font=(bold?'700 ':'500 ')+Math.round(size)+'px system-ui, sans-serif';
    g.fillText(str,p[0],p[1],maxWidth||400);
    g.restore();
  }
  function hitDraw(g,project,x,y,w,h,id,text,symbol,color){
    const corners=drawQuad(g,project,x,y,w,h,
      ui.hover===id?'rgba(112,202,255,.46)':'rgba(11,21,44,.73)',
      ui.hover===id?'#d7efff':'rgba(214,240,255,.26)');
    if(corners.length===4)ui.hitZones.push({id,corners});
    label(g,project,x,y-h*.14,symbol,Math.max(20,Math.min(29,h*.40)),color,true);
    label(g,project,x,y+h*.29,text,Math.max(9,Math.min(13,h*.18)),'#eef6ff',true,w*.98);
  }
  function lineText(g,project,x,y,text,size,color='#d3e0f4'){
    label(g,project,x,y,text,size,color,false,650);
  }
  function header(g,project,panel){
    const w=panel.w,h=panel.h;
    const pageNames={home:'POCKET SPACE',worlds:'MUNDOS VIRTUAIS',settings:'AJUSTES',clock:'RELÓGIO',about:'AJUDA'};
    const title=pageNames[ui.page]||'POCKET SPACE';
    label(g,project,0,-h*.375,title,Math.max(13,Math.min(19,w*.043)),'#f0f9ff',true,w*.9);
    const info=ui.page==='home'?'Ambiente: '+ui.worldTitle():ui.page==='worlds'?'Escolha seu cenário':'';
    if(info)lineText(g,project,0,-h*.275,info,Math.max(10,w*.025),'#a7d5ed');
    if(ui.page!=='home'){
      const box=drawQuad(g,project,-w*.385,-h*.374,w*.135,h*.16,'rgba(20,40,68,.95)','#88bfe6');
      if(box.length)ui.hitZones.push({id:'back',corners:box});
      label(g,project,-w*.385,-h*.374,'‹',Math.min(24,h*.12),'#e5f8ff',true);
    }
  }
  function draw(g,panel,project,now,stats){
    ui.hitZones.length=0;
    if(!panel||!panel.w||!panel.h)return;
    const w=panel.w,h=panel.h;
    g.save();g.lineJoin='round';g.textBaseline='middle';
    header(g,project,panel);
    if(ui.page==='home'){
      const items=pages.home;
      for(let i=0;i<items.length;i++){
        const x=(i%3-1)*w*.295,y=(Math.floor(i/3)-.5)*h*.30+h*.05;
        const tile=items[i];
        hitDraw(g,project,x,y,w*.272,h*.27,tile.id,tile.name,tile.symbol,tile.color);
      }
      lineText(g,project,0,h*.397,'Segure na barra inferior para mover a janela',Math.max(8,w*.021));
    }else if(ui.page==='worlds'){
      const items=pages.worlds;
      for(let i=0;i<items.length;i++){
        const x=(i%2-.5)*w*.48,y=(Math.floor(i/2)-.5)*h*.29+h*.09;
        const tile=items[i],selected=ui.world===tile.id.split(':')[1];
        hitDraw(g,project,x,y,w*.43,h*.255,tile.id,(selected?'✓ ':'')+tile.name,tile.symbol,tile.color);
      }
      lineText(g,project,0,h*.44,'Cenários originais e leves, com perspectiva 3D',Math.max(8,w*.02));
    }else if(ui.page==='settings'){
      const options=[
        {id:'hands-toggle',text:'Mãos: '+(ui.handsEnabled?'ligadas':'desligadas'),symbol:'✋',color:'#b5facd'},
        {id:'hands-reset',text:'Reconectar IA',symbol:'⟳',color:'#a8cbff'},
        {id:'hands-compat',text:'IA compatível',symbol:'◌',color:'#ffd599'},
        {id:'hud-toggle',text:'FPS: '+(ui.hud?'visível':'oculto'),symbol:'◷',color:'#d5aeff'},
        {id:'recenter',text:'Recentrar',symbol:'⊕',color:'#d3e5ff'},
        {id:'worlds',text:'Mundos',symbol:'✧',color:'#8ef8d4'}
      ];
      for(let i=0;i<options.length;i++){
        const x=(i%3-1)*w*.295,y=(Math.floor(i/3)-.5)*h*.30+h*.05;
        const tile=options[i];hitDraw(g,project,x,y,w*.272,h*.27,tile.id,tile.text,tile.symbol,tile.color);
      }
    }else if(ui.page==='clock'){
      const date=new Date();
      const t=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const d=date.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
      lineText(g,project,0,-h*.03,t,Math.min(48,w*.125),'#dff6ff');
      lineText(g,project,0,h*.2,d,Math.min(14,w*.035));
      const box=drawQuad(g,project,0,h*.40,w*.46,h*.13,'rgba(19,52,74,.9)','#83d0ed');
      if(box.length)ui.hitZones.push({id:'home',corners:box});
      label(g,project,0,h*.40,'Voltar à central',Math.min(12,w*.036),'#fff',true);
    }else{
      const detail=['Use o gesto de pinça para escolher um aplicativo.',
        'Segure a barra inferior para mover a janela.',
        'Toque duas vezes na tela para sair do VR.'];
      detail.forEach((t,i)=>lineText(g,project,0,-h*.1+i*h*.21,t,Math.min(12,w*.031)));
    }
    // Highlight an always-available handle. Pinching here moves the floating panel.
    drawQuad(g,project,0,h*.465,w*.29,h*.032,'rgba(235,248,255,.83)');
    g.restore();
  }
  ui.draw=draw;
  ui.hitTest=(x,y)=>{
    for(let i=ui.hitZones.length-1;i>=0;i--){
      const item=ui.hitZones[i];
      if(pointInPoly([x,y],item.corners))return item.id;
    }
    return null;
  };
  ui.setHover=(x,y)=>{ui.hover=ui.hitTest(x,y);return ui.hover;};
  ui.getPages=()=>pages;
  window.VRUI=ui;
})();
