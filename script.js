(() => {
"use strict";

const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 750;
const GRID_SIZE = 25;
const ARENA_HEIGHT = VIRTUAL_HEIGHT - 130;

const C = {
  bg: "#18202f",
  arena: "#202c42",
  grid: "#2a3a56",
  text: "#e6f0ff",
  blue: "#64b4ff",
  cyan: "#50dcdc",
  pink: "#ff78a0",
  green: "#64dc82",
  yellow: "#ffd264",
  panel: "#141c2a",
  border: "#3c5578"
};

const palettes = [
  { head:"#64dc82", body:"#328c50", glow:"#96ffb4" },
  { head:"#64b4ff", body:"#3264a0", glow:"#a0d2ff" },
  { head:"#ff78a0", body:"#a03c5a", glow:"#ffb4c8" },
  { head:"#ffd264", body:"#a07828", glow:"#ffeba0" },
  { head:"#c882ff", body:"#6e3ca0", glow:"#e6b4ff" }
];

const foods = [
  {name:"Apple", shape:"apple", color:"#ff5a6e", points:10},
  {name:"Banana", shape:"banana", color:"#ffdc50", points:15},
  {name:"Donut", shape:"donut", color:"#ff82be", points:20},
  {name:"Pizza", shape:"pizza", color:"#ffa03c", points:25},
  {name:"Burger", shape:"burger", color:"#d2a064", points:35},
  {name:"Cake", shape:"cake", color:"#c882ff", points:50},
  {name:"Energy", shape:"energy", color:"#64dcff", points:75}
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let state = "LOGIN";
let playerName = "Player1";
let snake = [{x:250,y:250},{x:230,y:250},{x:210,y:250}];
let direction = "RIGHT";
let nextDirection = "RIGHT";
let score = 0;
let highScore = Number(localStorage.getItem("cyberSnakeHighScore") || 0);
let speed = 160;
let food = [];
let particles = [];
let floating = [];
let lastMove = 0;
let lastFrame = performance.now();
let dragging = false;

const joystick = { cx:500, cy:VIRTUAL_HEIGHT-65, radius:48, knob:22, x:500, y:VIRTUAL_HEIGHT-65 };

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
}
window.addEventListener("resize", resize);
resize();

function fitTransform() {
  const w = canvas.width / dpr, h = canvas.height / dpr;
  const scale = Math.min(w / VIRTUAL_WIDTH, h / VIRTUAL_HEIGHT);
  const ox = (w - VIRTUAL_WIDTH * scale) / 2;
  const oy = (h - VIRTUAL_HEIGHT * scale) / 2;
  return {w,h,scale,ox,oy};
}

function pointerToVirtual(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * dpr / dpr;
  const y = (e.clientY - r.top) * dpr / dpr;
  const t = fitTransform();
  return {x:(x-t.ox)/t.scale, y:(y-t.oy)/t.scale};
}

function roundedRect(x,y,w,h,r,fill,stroke=null,lw=1) {
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  if (fill) { ctx.fillStyle=fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth=lw; ctx.strokeStyle=stroke; ctx.stroke(); }
}

function text(txt,x,y,size,color,align="left",weight="bold") {
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(txt,x,y);
}

function resetGame() {
  snake = [{x:250,y:250},{x:230,y:250},{x:210,y:250}];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  speed = 160;
  food = [];
  particles = [];
  floating = [];
  joystick.x = joystick.cx;
  joystick.y = joystick.cy;
  for (let i=0;i<18;i++) food.push(spawnFood());
  lastMove = performance.now();
}

function spawnFood() {
  let tries = 0;
  while (tries++ < 5000) {
    const x = Math.floor(Math.random() * (VIRTUAL_WIDTH/GRID_SIZE)) * GRID_SIZE;
    const y = Math.floor(Math.random() * (ARENA_HEIGHT/GRID_SIZE)) * GRID_SIZE;
    const hitSnake = snake.some(s => s.x === x && s.y === y);
    const hitFood = food.some(f => f.x === x && f.y === y);
    if (!hitSnake && !hitFood) {
      const type = foods[Math.floor(Math.random()*foods.length)];
      return {x,y,type};
    }
  }
  return {x:0,y:0,type:foods[0]};
}

function setDirection(d) {
  const opposite = {LEFT:"RIGHT", RIGHT:"LEFT", UP:"DOWN", DOWN:"UP"};
  if (opposite[d] !== direction) nextDirection = d;
}

function move() {
  direction = nextDirection;
  let {x,y} = snake[0];
  if (direction==="LEFT") x-=GRID_SIZE;
  if (direction==="RIGHT") x+=GRID_SIZE;
  if (direction==="UP") y-=GRID_SIZE;
  if (direction==="DOWN") y+=GRID_SIZE;

  const head = {x,y};
  const wall = x<0 || x>=VIRTUAL_WIDTH || y<0 || y>=ARENA_HEIGHT;
  const self = snake.some((s,i) => i>0 && s.x===x && s.y===y);
  if (wall || self) {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("cyberSnakeHighScore", highScore);
    }
    state = "GAMEOVER";
    dragging = false;
    return;
  }

  snake.unshift(head);
  let eaten = [];
  food.forEach((f,i) => {
    if (f.x===x && f.y===y) eaten.push(i);
  });

  if (eaten.length) {
    eaten.reverse().forEach(i => {
      const f = food[i];
      score += f.type.points;
      for (let n=0;n<18;n++) particles.push({
        x:f.x+GRID_SIZE/2, y:f.y+GRID_SIZE/2,
        vx:(Math.random()*8-4), vy:(Math.random()*8-4),
        life:30+Math.random()*15, size:2+Math.random()*2, color:f.type.color
      });
      floating.push({x:f.x+3,y:f.y+18,text:`+${f.type.points}`,life:40,color:f.type.color});
      food.splice(i,1);
      food.push(spawnFood());
    });
    if (speed > 55) speed--;
  } else {
    snake.pop();
  }
}

function drawFood(f) {
  const {x,y,type} = f, cx=x+12.5, cy=y+12.5, col=type.color;
  ctx.save();
  ctx.globalAlpha=.18;
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(cx,cy,21,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  if(type.shape==="apple"){
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(cx,cy+2,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffb4be"; ctx.beginPath(); ctx.arc(cx-3,cy,3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#78c864"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx,cy-7);ctx.lineTo(cx+4,cy-12);ctx.stroke();
  } else if(type.shape==="banana"){
    ctx.strokeStyle=col;ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx,cy,9,-.2,Math.PI+.2);ctx.stroke();
  } else if(type.shape==="donut"){
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.arena;ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cx+3,cy-3,2,0,Math.PI*2);ctx.fill();
  } else if(type.shape==="pizza"){
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(x+2,y+23);ctx.lineTo(x+23,y+23);ctx.closePath();ctx.fill();
    ctx.fillStyle="#dc3c3c";ctx.beginPath();ctx.arc(cx,cy+2,3,0,Math.PI*2);ctx.fill();
  } else if(type.shape==="burger"){
    ctx.strokeStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy+2,10,Math.PI,0);ctx.stroke();
    ctx.fillStyle="#8c5028";ctx.fillRect(x+4,cy,17,4);
    ctx.fillStyle=col;ctx.fillRect(x+2,cy+5,21,4);
  } else if(type.shape==="cake"){
    roundedRect(x+3,y+4,19,19,4,col);
    ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+4,cy);ctx.lineTo(x+21,cy);ctx.stroke();
    ctx.fillStyle="#ff5a5a";ctx.beginPath();ctx.arc(cx,y+5,3,0,Math.PI*2);ctx.fill();
  } else {
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(cx+5,cy-3);ctx.lineTo(x+23,cy);ctx.lineTo(cx+5,cy+3);ctx.lineTo(cx,y+23);ctx.lineTo(cx-5,cy+3);ctx.lineTo(x+2,cy);ctx.lineTo(cx-5,cy-3);ctx.closePath();ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);
  ctx.fillStyle=C.arena;ctx.fillRect(0,0,VIRTUAL_WIDTH,ARENA_HEIGHT);
  ctx.strokeStyle=C.grid;ctx.lineWidth=1;
  for(let x=0;x<=VIRTUAL_WIDTH;x+=GRID_SIZE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ARENA_HEIGHT);ctx.stroke();}
  for(let y=0;y<=ARENA_HEIGHT;y+=GRID_SIZE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(VIRTUAL_WIDTH,y);ctx.stroke();}
  ctx.strokeStyle=C.border;ctx.lineWidth=3;ctx.strokeRect(1,1,VIRTUAL_WIDTH-2,ARENA_HEIGHT-2);
}

function drawSnake() {
  const p=palettes[Math.floor(score/10)%palettes.length];
  snake.forEach((s,i)=>{
    ctx.strokeStyle=p.glow;ctx.lineWidth=1;roundedRect(s.x,s.y,25,25,8,null,p.glow);
    roundedRect(s.x+1,s.y+1,23,23,6,i===0?p.head:p.body);
    if(i===0){
      ctx.fillStyle="#fff";
      let eyes = direction==="RIGHT"?[[17,8],[17,17]]:
                 direction==="LEFT"?[[8,8],[8,17]]:
                 direction==="UP"?[[8,8],[17,8]]:[[8,17],[17,17]];
      eyes.forEach(([ex,ey])=>{ctx.beginPath();ctx.arc(s.x+ex,s.y+ey,2,0,Math.PI*2);ctx.fill();});
    }
  });
}

function drawJoystick() {
  ctx.fillStyle="#202c42";ctx.beginPath();ctx.arc(joystick.cx,joystick.cy,joystick.radius,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=C.blue;ctx.beginPath();ctx.arc(joystick.x,joystick.y,joystick.knob,0,Math.PI*2);ctx.fill();
  text("Sentuh & Geser Joystick untuk Mengontrol Ular",500,VIRTUAL_HEIGHT-122,15,"#a0b9d7","center","normal");
}

function drawLogin() {
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);
  const boxW=640,boxH=560,boxX=180,boxY=95;
  roundedRect(boxX,boxY,boxW,boxH,20,C.arena,C.blue,2);
  text("CARA BERMAIN & LOGIN",500,boxY+58,42,C.cyan,"center");
  const lines=[
    "1. Sentuh / geser Joystick virtual di bawah layar (atau WASD di PC).",
    "2. Makan berbagai makanan unik untuk menambah skor & panjang ular.",
    "3. Jangan menabrak dinding batas atau tubuh ular sendiri!",
    "4. Sentuh tombol Mulai Bermain untuk masuk ke arena."
  ];
  lines.forEach((s,i)=>text(s,boxX+40,boxY+110+i*28,15,"#c8dcf5","left","normal"));
  ctx.strokeStyle=C.border;ctx.beginPath();ctx.moveTo(boxX+40,boxY+235);ctx.lineTo(boxX+boxW-40,boxY+235);ctx.stroke();
  text("Masukkan Nama Pemain:",boxX+40,boxY+275,15,"#b4cdeb","left","normal");
  roundedRect(boxX+40,boxY+292,boxW-80,48,12,C.bg,C.blue,2);
  text(playerName + (Math.floor(performance.now()/500)%2?"_":""),boxX+55,boxY+323,20,C.text);
  roundedRect(360,boxY+442,280,48,12,C.blue);
  text("MULAI BERMAIN",500,boxY+474,20,C.bg,"center");
}

function drawHUD() {
  text(`Pemain: ${playerName}`,30,30,15,C.cyan);
  text(`SKOR: ${score}`,30,52,20,C.text);
  text(`TERBAIK: ${highScore}`,30,78,15,"#b4cdeb");
}

function drawGameOver() {
  ctx.fillStyle="rgba(15,20,30,.92)";ctx.fillRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT);
  const w=480,h=300,x=260,y=205;
  roundedRect(x,y,w,h,20,C.arena,C.pink,2);
  text("GAME OVER",500,y+66,42,C.pink,"center");
  ctx.strokeStyle=C.border;ctx.beginPath();ctx.moveTo(x+40,y+85);ctx.lineTo(x+w-40,y+85);ctx.stroke();
  text(`SKOR AKHIR (${playerName})`,500,y+125,15,"#b4cdeb","center","normal");
  text(String(score),500,y+180,42,C.yellow,"center");
  roundedRect(x+45,y+215,w-90,48,12,C.blue);
  text("MAIN LAGI",500,y+247,20,C.bg,"center");
}

function render() {
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const t=fitTransform();
  ctx.clearRect(0,0,t.w,t.h);
  ctx.save();
  ctx.translate(t.ox,t.oy);
  ctx.scale(t.scale,t.scale);

  if(state==="LOGIN") drawLogin();
  else {
    drawBackground();
    food.forEach(drawFood);
    particles.forEach(p=>{
      ctx.globalAlpha=Math.max(0,p.life/45);
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,p.size),0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
    drawSnake();
    floating.forEach(f=>text(f.text,f.x,f.y,20,f.color));
    drawHUD();
    drawJoystick();
    if(state==="GAMEOVER") drawGameOver();
  }
  ctx.restore();
}

function update(dt) {
  particles.forEach(p=>{p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=.03;p.life-=dt*60;p.size-=.08*dt*60;});
  particles=particles.filter(p=>p.life>0);
  floating.forEach(f=>{f.y-=dt*60;f.life-=dt*60;});
  floating=floating.filter(f=>f.life>0);

  if(state==="PLAYING" && performance.now()-lastMove >= speed){
    lastMove=performance.now();
    move();
  }
}

function loop(now) {
  const dt=Math.min(.05,(now-lastFrame)/1000);
  lastFrame=now;update(dt);render();requestAnimationFrame(loop);
}

function start() {
  if(playerName.trim()) { state="PLAYING";resetGame(); }
}

function restart() { state="PLAYING";resetGame(); }

window.addEventListener("keydown",e=>{
  if(state==="LOGIN"){
    if(e.key==="Enter") start();
    else if(e.key==="Backspace") playerName=playerName.slice(0,-1);
    else if(e.key.length===1 && playerName.length<12) playerName+=e.key;
    return;
  }
  if(state==="PLAYING"){
    const map={ArrowLeft:"LEFT",a:"LEFT",A:"LEFT",ArrowRight:"RIGHT",d:"RIGHT",D:"RIGHT",
               ArrowUp:"UP",w:"UP",W:"UP",ArrowDown:"DOWN",s:"DOWN",S:"DOWN"};
    if(map[e.key]){e.preventDefault();setDirection(map[e.key]);}
  } else if(state==="GAMEOVER" && (e.key==="r"||e.key==="R"||e.key==="Enter")) restart();
});

function handlePointer(e, isDown=false) {
  const p=pointerToVirtual(e);
  if(state==="LOGIN"){
    if(isDown){
      if(p.x>=360&&p.x<=640&&p.y>=537&&p.y<=585) start();
      // Input area: keyboard entry is handled above; on mobile use prompt for a simple name entry.
      if(p.x>=220&&p.x<=780&&p.y>=387&&p.y<=435){
        const n=prompt("Masukkan Nama Pemain:",playerName);
        if(n!==null && n.trim()) playerName=n.trim().slice(0,12);
      }
    }
    return;
  }
  if(state==="GAMEOVER"){
    if(isDown && p.x>=305&&p.x<=695&&p.y>=420&&p.y<=468) restart();
    return;
  }
  const dist=Math.hypot(p.x-joystick.cx,p.y-joystick.cy);
  if(isDown && dist<=joystick.radius+35){dragging=true; joystickInput(p.x,p.y);}
  else if(!isDown && dragging){dragging=false;joystick.x=joystick.cx;joystick.y=joystick.cy;}
  else if(dragging) joystickInput(p.x,p.y);
}

function joystickInput(x,y){
  let dx=x-joystick.cx,dy=y-joystick.cy,dist=Math.hypot(dx,dy);
  if(dist>joystick.radius){dx=dx/dist*joystick.radius;dy=dy/dist*joystick.radius;}
  joystick.x=joystick.cx+dx;joystick.y=joystick.cy+dy;
  if(dist>8){
    const a=Math.atan2(y-joystick.cy,x-joystick.cx)*180/Math.PI;
    if(a>=-45&&a<=45) setDirection("RIGHT");
    else if(a>45&&a<135) setDirection("DOWN");
    else if(a>=135||a<=-135) setDirection("LEFT");
    else setDirection("UP");
  }
}

canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture?.(e.pointerId);handlePointer(e,true);});
canvas.addEventListener("pointermove",e=>handlePointer(e,false));
canvas.addEventListener("pointerup",e=>handlePointer(e,false));
canvas.addEventListener("pointercancel",e=>{dragging=false;joystick.x=joystick.cx;joystick.y=joystick.cy;});

resetGame();
state="LOGIN";
requestAnimationFrame(loop);
})();
