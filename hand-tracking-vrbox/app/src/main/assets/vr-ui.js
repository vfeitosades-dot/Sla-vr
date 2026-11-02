/* Pocket Space: original immersive launcher inspired by modern VR app libraries. */
(function(){
'use strict';
const ui={
  page:'home',world:'passthrough',handsEnabled:true,hud:true,detail:'',hover:null,
  hitZones:[],lastActionAt:0,lowPower:false,
  worldTitle(){return ({passthrough:'Câmera real',aurora:'Ilhas do céu',neon:'Cidade neon',lunar:'Base lunar'})[this.world]||'Câmera real'}
};
const pages={
  home:[
    {id:'worlds',name:'Mundos',symbol:'◈',color:'#168c9f'},
    {id:'browser',name:'Navegador',symbol:'◎',color:'#3782d4'},
    {id:'youtube',name:'YouTube',symbol:'▶',color:'#d9476d'},
    {id:'google',name:'Pesquisar',symbol:'⌕',color:'#c68b34'},
    {id:'clock',name:'Relógio',symbol:'◷',color:'#8669d1'},
    {id:'settings',name:'Ajustes',symbol:'⚙',color:'#328d79'}
  ],
  worlds:[
    {id:'world:passthrough',name:'Câmera real',symbol:'◉',color:'#408fcd'},
    {id:'world:aurora',name:'Ilhas do céu',symbol:'☁',color:'#4ba985'},
    {id:'world:neon',name:'Cidade neon',symbol:'◆',color:'#a350ca'},
    {id:'world:lunar',name:'Base lunar',symbol:'☾',color:'#617ac2'}
  ]
};
function pointInPoly(point,corners){
  let inside=false;const x=point[0],y=point[1];
  for(let i=0,j=corners.length-1;i<corners.length;j=i++){
    const a=corners[i],b=corners[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1]+1e-6)+a[0])inside=!inside;
  }
  return inside;
}
function drawQuad(g,project,x,y,w,h,fill,stroke,radius){
  const c=[
    project(x-w/2,y-h/2,0),project(x+w/2,y-h/2,0),
    project(x+w/2,y+h/2,0),project(x-w/2,y+h/2,0)
  ];
  if(c.some(p=>!p||!Number.isFinite(p[0])||!Number.isFinite(p[1])))return [];
  const r=Math.max(0,Math.min(.25,radius===undefined?.12:radius));
  const between=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  g.beginPath();
  for(let i=0;i<4;i++){
    const cur=c[i],prev=c[(i+3)%4],next=c[(i+1)%4],p0=between(cur,prev,r),p1=between(cur,next,r);
    if(i===0)g.moveTo(p0[0],p0[1]);else g.lineTo(p0[0],p0[1]);
    g.quadraticCurveTo(cur[0],cur[1],p1[0],p1[1]);
  }
  g.closePath();g.fillStyle=fill;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}
  return c;
}
function gradient(g,c,color,active){
  if(ui.lowPower||typeof g.createLinearGradient!=='function')return active?'rgba(62,112,158,.92)':'rgba(29,45,75,.92)';
  const fill=g.createLinearGradient(c[0][0],c[0][1],c[2][0],c[2][1]);
  fill.addColorStop(0,color);fill.addColorStop(.55,color);
  fill.addColorStop(1,active?'#20436f':'#152742');
  return fill;
}
function label(g,project,x,y,str,size,color,bold,maxWidth){
  const p=project(x,y,.4);if(!p)return;
  g.save();g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';
  g.font=(bold?'700 ':'500 ')+Math.round(size)+'px system-ui, sans-serif';
  g.fillText(str,p[0],p[1],maxWidth||400);g.restore();
}
function lineText(g,project,x,y,str,size,color){
  label(g,project,x,y,str,size,color||'#bfd3e9',false,650);
}
function hitDraw(g,project,x,y,w,h,id,text,symbol,color,selected){
  const hovered=ui.hover===id,active=!!selected||hovered;
  const outer=drawQuad(g,project,x,y,w,h,'rgba(10,20,37,.94)',
    active?'rgba(216,243,255,.93)':'rgba(167,205,243,.22)',.16);
  if(outer.length===4)ui.hitZones.push({id,corners:outer});
  drawQuad(g,project,x,y-h*.035,w*.93,h*.84,gradient(g,outer,color,active),
    active?'rgba(255,255,255,.65)':'rgba(255,255,255,.14)',.17);
  label(g,project,x,y-h*.11,symbol,Math.max(21,Math.min(34,h*.37)),'#f9fcff',true);
  label(g,project,x,y+h*.31,text,Math.max(9,Math.min(13,h*.18)),'#f7fbff',true,w*.99);
  if(selected)label(g,project,x+w*.40,y-h*.31,'•',Math.max(13,w*.10),'#c9fff2',true);
}
function header(g,project,panel){
  const w=panel.w,h=panel.h;
  const title=({home:'BIBLIOTECA',worlds:'MUNDOS',settings:'CONTROLES',clock:'RELÓGIO',about:'AJUDA'})[ui.page]||'BIBLIOTECA';
  label(g,project,0,-h*.408,'POCKET SPACE',Math.max(9,w*.022),'#b2c6df',true,w*.8);
  label(g,project,0,-h*.356,title,Math.max(14,Math.min(19,w*.042)),'#f6faff',true,w*.75);
  if(ui.page!=='home'){
    const corners=drawQuad(g,project,-w*.4,-h*.365,w*.12,h*.14,'rgba(42,68,100,.92)','rgba(194,231,255,.45)',.2);
    if(corners.length)ui.hitZones.push({id:'back',corners});
    label(g,project,-w*.4,-h*.365,'‹',Math.min(26,h*.13),'#f4f9ff',true);
  }
  const search=drawQuad(g,project,0,-h*.265,w*.79,h*.095,'rgba(33,48,69,.93)','rgba(175,208,246,.20)',.18);
  if(ui.page==='home'&&search.length)ui.hitZones.push({id:'google',corners:search});
  lineText(g,project,0,-h*.265,
    ui.page==='home'?'⌕  Pesquisar na web':ui.page==='worlds'?'Escolha um ambiente leve':ui.page==='settings'?'Mãos, desempenho e direção':ui.worldTitle(),
    Math.max(10,Math.min(12,w*.024)),'#c1d5ec');
}
function dock(g,project,panel){
  const w=panel.w,h=panel.h;
  drawQuad(g,project,0,h*.442,w*.62,h*.085,'rgba(14,27,46,.95)','rgba(174,218,255,.35)',.25);
  const buttons=[['home','⌂'],['worlds','◈'],['browser','◎'],['settings','⚙'],['clock','◷']];
  for(let i=0;i<buttons.length;i++){
    const [id,sym]=buttons[i],x=(i-2)*w*.112;
    const active=ui.page===id,hovered=ui.hover===id;
    const c=drawQuad(g,project,x,h*.442,w*.086,h*.070,
      active?'rgba(83,144,211,.44)':hovered?'rgba(111,190,241,.34)':'rgba(22,40,66,.26)',null,.25);
    if(c.length)ui.hitZones.push({id,corners:c});
    label(g,project,x,h*.442,sym,Math.max(13,Math.min(21,w*.043)),active?'#ffffff':'#c0d6ef',true);
  }
}
function draw(g,panel,project,now,stats){
  ui.hitZones.length=0;
  // Degrade softly to flat colors when frame pacing is struggling.
  ui.lowPower=!!(stats&&stats.drawFPS>0&&stats.drawFPS<53);
  if(!panel||!panel.w||!panel.h)return;
  const w=panel.w,h=panel.h;
  g.save();g.lineJoin='round';g.textBaseline='middle';
  drawQuad(g,project,0,0,w*.984,h*.99,'rgba(9,17,31,.88)','rgba(197,224,250,.34)',.09);
  header(g,project,panel);
  if(ui.page==='home'){
    for(let i=0;i<pages.home.length;i++){
      const tile=pages.home[i],x=(i%3-1)*w*.295,y=(Math.floor(i/3)-.5)*h*.30+h*.05;
      hitDraw(g,project,x,y,w*.272,h*.27,tile.id,tile.name,tile.symbol,tile.color,false);
    }
    lineText(g,project,0,h*.367,'Pinça para abrir · borda para mover',Math.max(8,w*.019));
  }else if(ui.page==='worlds'){
    for(let i=0;i<pages.worlds.length;i++){
      const tile=pages.worlds[i],x=(i%2-.5)*w*.48,y=(Math.floor(i/2)-.5)*h*.29+h*.09;
      const selected=ui.world===tile.id.slice(6);
      hitDraw(g,project,x,y,w*.43,h*.255,tile.id,(selected?'✓ ':'')+tile.name,tile.symbol,tile.color,selected);
    }
    lineText(g,project,0,h*.36,'Ambientes panorâmicos econômicos',Math.max(8,w*.02));
  }else if(ui.page==='settings'){
    const opt=[
      {id:'hands-toggle',text:'Mãos: '+(ui.handsEnabled?'ON':'OFF'),symbol:'✋',color:'#36a783'},
      {id:'hands-reset',text:'Reconectar IA',symbol:'⟳',color:'#427cc1'},
      {id:'hands-compat',text:'IA compatível',symbol:'◌',color:'#ab783b'},
      {id:'hud-toggle',text:'FPS: '+(ui.hud?'ON':'OFF'),symbol:'◷',color:'#8152b7'},
      {id:'recenter',text:'Recentrar',symbol:'⊕',color:'#438bb6'},
      {id:'worlds',text:'Ambientes',symbol:'✧',color:'#2e9997'}
    ];
    for(let i=0;i<opt.length;i++){
      const tile=opt[i],x=(i%3-1)*w*.295,y=(Math.floor(i/3)-.5)*h*.30+h*.05;
      hitDraw(g,project,x,y,w*.272,h*.27,tile.id,tile.text,tile.symbol,tile.color,false);
    }
  }else if(ui.page==='clock'){
    const date=new Date();
    const time=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const d=date.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    lineText(g,project,0,-h*.02,time,Math.min(48,w*.13),'#edf7ff');
    lineText(g,project,0,h*.19,d,Math.min(13,w*.034));
    const box=drawQuad(g,project,0,h*.34,w*.44,h*.11,'rgba(45,93,124,.75)','#7fb9e5',.2);
    if(box.length)ui.hitZones.push({id:'home',corners:box});
    label(g,project,0,h*.34,'Biblioteca',Math.min(12,w*.032),'#fff',true);
  }else{
    const rows=['Use o gesto de pinça para escolher um aplicativo.','Segure a borda para mover a janela.','Toque duas vezes na tela para sair do VR.'];
    rows.forEach((t,i)=>lineText(g,project,0,-h*.06+i*h*.19,t,Math.min(11,w*.030)));
  }
  dock(g,project,panel);
  drawQuad(g,project,0,h*.498,w*.21,h*.012,'rgba(216,238,255,.78)',null,.25);
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
ui.setHover=(x,y)=>{ui.hover=ui.hitTest(x,y);return ui.hover};
ui.getPages=()=>pages;
window.VRUI=ui;
})();
