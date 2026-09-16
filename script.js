(() => {
"use strict";

const W=1000,H=750,G=25,ARENA=H-130;
const C={bg:"#18202f",arena:"#202c42",grid:"#2a3a56",text:"#e6f0ff",
blue:"#64b4ff",cyan:"#50dcdc",pink:"#ff78a0",yellow:"#ffd264",panel:"#141c2a",border:"#3c5578"};

const palettes=[
 {head:"#64dc82",body:"#328c50",glow:"#96ffb4"},
 {head:"#64b4ff",body:"#3264a0",glow:"#a0d2ff"},
 {head:"#ff78a0",body:"#a03c5a",glow:"#ffb4c8"},
 {head:"#ffd264",body:"#a07828",glow:"#ffeba0"},
 {head:"#c882ff",body:"#6e3ca0",glow:"#e6b4ff"}
];
const FOOD=[
 {name:"Apple",shape:"apple",color:"#ff5a6e",points:10},
 {name:"Banana",shape:"banana",color:"#ffdc50",points:15},
 {name:"Donut",shape:"donut",color:"#ff82be",points:20},
 {name:"Pizza",shape:"pizza",color:"#ffa03c",points:25},
 {name:"Burger",shape:"burger",color:"#d2a064",points:35},
 {name:"Cake",shape:"cake",color:"#c882ff",points:50},
 {name:"Energy",shape:"energy",color:"#64dcff",points:75}
];

const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
let state="LOGIN",name="Player1",snake=[],dir="RIGHT",nextDir="RIGHT";
let score=0,high=Number(localStorage.getItem("cyberSnakeHighScore")||0),speed=160;
let food=[],particles=[],floating=[],lastMove=0,lastFrame=performance.now(),drag=false;

const joy={cx:500,cy:685,r:48,kr:22,x:500,y:685};

function reset(){
 snake=[{x:250,y:250},{x:225,y:250},{x:200,y:250}];
 dir=nextDir="RIGHT";score=0;speed=160;food=[];particles=[];floating=[];
 joy.x=joy.cx;joy.y=joy.cy;
 for(let i=0;i<18;i++)food.push(spawn());
 lastMove=performance.now();
}
function spawn(){
 for(let tries=0;tries<3000;tries++){
  const x=Math.floor(Math.random()*(W/G))*G,y=Math.floor(Math.random()*(ARENA/G))*G;
  if(!snake.some(s=>s.x===x&&s.y===y)&&!food.some(f=>f.x===x&&f.y===y))
   return {x,y,type:FOOD[Math.floor(Math.random()*FOOD.length)]};
 }
 return {x:0,y:0,type:FOOD[0]};
}
function setDir(d){
 const opp={LEFT:"RIGHT",RIGHT:"LEFT",UP:"DOWN",DOWN:"UP"};
 if(opp[d]!==dir)nextDir=d;
}
function move(){
 dir=nextDir;let x=snake[0].x,y=snake[0].y;
 if(dir==="LEFT")x-=G;if(dir==="RIGHT")x+=G;if(dir==="UP")y-=G;if(dir==="DOWN")y+=G;
 const bad=x<0||x>=W||y<0||y>=ARENA||snake.slice(1).some(s=>s.x===x&&s.y===y);
 if(bad){high=Math.max(high,score);localStorage.setItem("cyberSnakeHighScore",high);state="GAMEOVER";drag=false;return}
 snake.unshift({x,y});
 const eaten=food.filter(f=>f.x===x&&f.y===y);
 if(eaten.length){
  eaten.forEach(f=>{
   score+=f.type.points;
   for(let i=0;i<18;i++)particles.push({x:f.x+12,y:f.y+12,vx:Math.random()*8-4,vy:Math.random()*8-4,life:40,size:2+Math.random()*2,c:f.type.color});
   floating.push({x:f.x,y:f.y+18,t:"+"+f.type.points,life:40,c:f.type.color});
   food=food.filter(q=>q!==f);food.push(spawn());
  });
  speed=Math.max(55,speed-1);
 }else snake.pop();
}

function rr(x,y,w,h,r,fill,stroke=null,lw=1){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
}
function txt(s,x,y,size,col,align="left",weight="bold"){
 ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=col;ctx.textAlign=align;ctx.fillText(s,x,y);
}
function foodDraw(f){
 const x=f.x,y=f.y,t=f.type,cx=x+12.5,cy=y+12.5;
 ctx.globalAlpha=.18;ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(cx,cy,21,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 if(t.shape==="apple"){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(cx,cy+2,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#78c864";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx+4,cy-12);ctx.stroke()}
 else if(t.shape==="banana"){ctx.strokeStyle=t.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx,cy,9,-.2,Math.PI+.2);ctx.stroke()}
 else if(t.shape==="donut"){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.arena;ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill()}
 else if(t.shape==="pizza"){ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(x+2,y+23);ctx.lineTo(x+23,y+23);ctx.closePath();ctx.fill()}
 else if(t.shape==="burger"){ctx.strokeStyle=t.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy+2,10,Math.PI,0);ctx.stroke();ctx.fillStyle="#8c5028";ctx.fillRect(x+4,cy,17,4);ctx.fillStyle=t.color;ctx.fillRect(x+2,cy+5,21,4)}
 else if(t.shape==="cake"){rr(x+3,y+4,19,19,4,t.color);ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+4,cy);ctx.lineTo(x+21,cy);ctx.stroke()}
 else {ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(cx+5,cy-3);ctx.lineTo(x+23,cy);ctx.lineTo(cx+5,cy+3);ctx.lineTo(cx,y+23);ctx.lineTo(cx-5,cy+3);ctx.lineTo(x+2,cy);ctx.lineTo(cx-5,cy-3);ctx.closePath();ctx.fill()}
}
function background(){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=C.arena;ctx.fillRect(0,0,W,ARENA);
 ctx.strokeStyle=C.grid;ctx.lineWidth=1;
 for(let x=0;x<=W;x+=G){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ARENA);ctx.stroke()}
 for(let y=0;y<=ARENA;y+=G){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.strokeStyle=C.border;ctx.lineWidth=3;ctx.strokeRect(1,1,W-2,ARENA-2);
}
function snakeDraw(){
 const p=palettes[Math.floor(score/10)%palettes.length];
 snake.forEach((s,i)=>{
  rr(s.x,s.y,25,25,8,null,p.glow);rr(s.x+1,s.y+1,23,23,6,i?p.body:p.head);
  if(!i){ctx.fillStyle="#fff";let e=dir==="RIGHT"?[[17,8],[17,17]]:dir==="LEFT"?[[8,8],[8,17]]:dir==="UP"?[[8,8],[17,8]]:[[8,17],[17,17]];e.forEach(a=>{ctx.beginPath();ctx.arc(s.x+a[0],s.y+a[1],2,0,Math.PI*2);ctx.fill()})}
 });
}
function joystick(){
 ctx.fillStyle=C.arena;ctx.beginPath();ctx.arc(joy.cx,joy.cy,joy.r,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle=C.blue;ctx.beginPath();ctx.arc(joy.x,joy.y,joy.kr,0,Math.PI*2);ctx.fill();
 txt("Geser Joystick • WASD / Tombol Panah",500,738,15,"#a0b9d7","center","normal");
}
function login(){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
 const bw=640,bh=560,bx=180,by=95;
 rr(bx,by,bw,bh,20,C.arena,C.blue,2);txt("CARA BERMAIN & LOGIN",500,by+58,42,C.cyan,"center");
 ["1. Gunakan Tombol WASD / Tombol Panah untuk menggerakkan Ular.",
  "2. Atau geser Joystick virtual di bagian bawah layar permainan.",
  "3. Makan berbagai makanan lezat untuk menambah skor & panjang ular.",
  "4. Jangan menabrak dinding atau tubuh ular sendiri!"].forEach((s,i)=>txt(s,bx+40,by+110+i*28,15,"#c8dcf5","left","normal"));
 ctx.strokeStyle=C.border;ctx.beginPath();ctx.moveTo(bx+40,by+235);ctx.lineTo(bx+bw-40,by+235);ctx.stroke();
 txt("Masukkan Nama Kapten / Pemain:",bx+40,by+275,15,"#b4cdeb","left","normal");
 rr(bx+40,by+292,bw-80,48,12,C.bg,C.blue,2);txt(name, bx+55,by+323,20,C.text);
 rr(360,by+442,280,48,12,C.blue);txt("MULAI BERMAIN",500,by+474,20,C.bg,"center");
}
function gameover(){
 ctx.fillStyle="rgba(15,20,30,.92)";ctx.fillRect(0,0,W,H);
 const x=260,y=205,w=480,h=300;rr(x,y,w,h,20,C.arena,C.pink,2);
 txt("GAME OVER",500,y+66,42,C.pink,"center");
 txt(`SKOR AKHIR (${name})`,500,y+125,15,"#b4cdeb","center","normal");txt(String(score),500,y+180,42,C.yellow,"center");
 rr(x+45,y+215,w-90,48,12,C.blue);txt("MAIN LAGI [R]",500,y+247,20,C.bg,"center");
}
function render(){
 const cw=canvas.clientWidth,ch=canvas.clientHeight,scale=Math.min(cw/W,ch/H),ox=(cw-W*scale)/2,oy=(ch-H*scale)/2;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.scale(devicePixelRatio,devicePixelRatio);ctx.translate(ox,oy);ctx.scale(scale,scale);
 if(state==="LOGIN")login();else{
  background();food.forEach(foodDraw);
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/40);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,p.size),0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
  snakeDraw();floating.forEach(f=>txt(f.t,f.x,f.y,20,f.c));txt(`Pemain: ${name}`,30,30,15,C.cyan);txt(`SKOR: ${score}`,30,52,20,C.text);txt(`TERBAIK: ${high}`,30,78,15,"#b4cdeb");joystick();
  if(state==="GAMEOVER")gameover();
 }
 ctx.restore();
}
function update(dt){
 particles.forEach(p=>{p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.life-=dt*60;p.size-=.08*dt*60});particles=particles.filter(p=>p.life>0);
 floating.forEach(f=>{f.y-=dt*60;f.life-=dt*60});floating=floating.filter(f=>f.life>0);
 if(state==="PLAYING"&&performance.now()-lastMove>=speed){lastMove=performance.now();move()}
}
function loop(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;update(dt);render();requestAnimationFrame(loop)}
function pointer(e){
 const r=canvas.getBoundingClientRect(),cw=r.width,ch=r.height,scale=Math.min(cw/W,ch/H),ox=(cw-W*scale)/2,oy=(ch-H*scale)/2;
 return {x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale};
}
function joyInput(p){
 let dx=p.x-joy.cx,dy=p.y-joy.cy,d=Math.hypot(dx,dy);
 if(d>joy.r){dx=dx/d*joy.r;dy=dy/d*joy.r}
 joy.x=joy.cx+dx;joy.y=joy.cy+dy;
 if(d>8){const a=Math.atan2(p.y-joy.cy,p.x-joy.cx)*180/Math.PI;if(a>=-45&&a<=45)setDir("RIGHT");else if(a<135&&a>45)setDir("DOWN");else if(a>=135||a<=-135)setDir("LEFT");else setDir("UP")}
}
canvas.addEventListener("pointerdown",e=>{
 const p=pointer(e);
 if(state==="LOGIN"){
  if(p.x>=360&&p.x<=640&&p.y>=537&&p.y<=585){if(name.trim()){state="PLAYING";reset()}}
  else if(p.x>=220&&p.x<=780&&p.y>=387&&p.y<=435){const n=prompt("Masukkan Nama Pemain:",name);if(n&&n.trim())name=n.trim().slice(0,12)}
 }else if(state==="GAMEOVER"){
  if(p.x>=305&&p.x<=695&&p.y>=420&&p.y<=468){state="PLAYING";reset()}
 }else{
  if(Math.hypot(p.x-joy.cx,p.y-joy.cy)<=joy.r+35){drag=true;joyInput(p)}
 }
});
canvas.addEventListener("pointermove",e=>{if(state==="PLAYING"&&drag)joyInput(pointer(e))});
function endPointer(){drag=false;joy.x=joy.cx;joy.y=joy.cy}
canvas.addEventListener("pointerup",endPointer);canvas.addEventListener("pointercancel",endPointer);

addEventListener("keydown",e=>{
 if(state==="LOGIN"){
  if(e.key==="Enter"){if(name.trim()){state="PLAYING";reset()}}
  else if(e.key==="Backspace")name=name.slice(0,-1);
  else if(e.key.length===1&&name.length<12)name+=e.key;
 }else if(state==="PLAYING"){
  const m={ArrowLeft:"LEFT",a:"LEFT",A:"LEFT",ArrowRight:"RIGHT",d:"RIGHT",D:"RIGHT",ArrowUp:"UP",w:"UP",W:"UP",ArrowDown:"DOWN",s:"DOWN",S:"DOWN"};
  if(m[e.key]){e.preventDefault();setDir(m[e.key])}
 }else if(state==="GAMEOVER"&&(e.key==="r"||e.key==="R"||e.key==="Enter")){state="PLAYING";reset()}
});
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio}
addEventListener("resize",resize);resize();reset();state="LOGIN";requestAnimationFrame(loop);
})();