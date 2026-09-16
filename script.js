const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = 800;
const H = 700;
const GRID = 20;
const ARENA_H = H - 130;

const BG = "#0e0e16";
const ARENA = "#141420";
const GRID_COLOR = "#1c1c2c";
const WHITE = "#ffffff";
const BLUE = "#00e6ff";
const PINK = "#ff2d6e";
const GREEN = "#00ff64";
const YELLOW = "#ffc800";

const palettes = [
  { head: "#00ff64", body: "#00963c", glow: "#50ff8c" },
  { head: "#00e6ff", body: "#006e96", glow: "#50e6ff" },
  { head: "#ff2d6e", body: "#961446", glow: "#ff6ea0" },
  { head: "#ffc800", body: "#966e00", glow: "#ffe664" }
];

let snake, direction, nextDirection, score, highScore = 0;
let colorIndex, speedMs, food;
let gameOver, particles, floatingTexts;
let lastMove = 0;
let foodPulse = 0;

const joystick = {
  centerX: W / 2,
  centerY: H - 65,
  radius: 48,
  knobRadius: 22,
  x: W / 2,
  y: H - 65,
  dragging: false
};

function resetGame() {
  snake = [
    {x: 200, y: 200},
    {x: 180, y: 200},
    {x: 160, y: 200}
  ];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  colorIndex = 0;
  speedMs = 180;
  food = spawnFood();
  gameOver = false;
  particles = [];
  floatingTexts = [];
  joystick.x = joystick.centerX;
  joystick.y = joystick.centerY;
  joystick.dragging = false;
  lastMove = performance.now();
}

function spawnFood() {
  let f;
  do {
    f = {
      x: Math.floor(Math.random() * (W / GRID)) * GRID,
      y: Math.floor(Math.random() * (ARENA_H / GRID)) * GRID
    };
  } while (snake && snake.some(s => s.x === f.x && s.y === f.y));
  return f;
}

function setDirection(dir) {
  const opposite = {
    LEFT: "RIGHT",
    RIGHT: "LEFT",
    UP: "DOWN",
    DOWN: "UP"
  };
  if (dir !== opposite[direction]) {
    nextDirection = dir;
  }
}

function moveSnake() {
  direction = nextDirection;
  const head = snake[0];
  let x = head.x;
  let y = head.y;

  if (direction === "LEFT") x -= GRID;
  if (direction === "RIGHT") x += GRID;
  if (direction === "UP") y -= GRID;
  if (direction === "DOWN") y += GRID;

  const newHead = {x, y};

  if (x < 0 || x >= W || y < 0 || y >= ARENA_H) {
    endGame();
    return;
  }

  // Saat makanan dimakan, ekor tidak dihapus sehingga ular bertambah.
  const ateFood = x === food.x && y === food.y;

  // Izinkan melewati posisi ekor lama jika ekor akan bergerak.
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);
  if (bodyToCheck.some(s => s.x === x && s.y === y)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (ateFood) {
    score += 10;
    colorIndex = (colorIndex + 1) % palettes.length;

    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x: food.x + GRID / 2,
        y: food.y + GRID / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 10
      });
    }

    floatingTexts.push({
      x: food.x,
      y: food.y,
      text: "+10",
      life: 25
    });

    if (speedMs > 70) speedMs -= 3;
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  gameOver = true;
  if (score > highScore) highScore = score;
}

function updateEffects() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  floatingTexts.forEach(t => {
    t.y -= 1;
    t.life--;
  });
  floatingTexts = floatingTexts.filter(t => t.life > 0);
}

function drawBackground() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = ARENA;
  ctx.fillRect(0, 0, W, ARENA_H);

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  for (let x = 0; x <= W; x += GRID) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_H);
    ctx.stroke();
  }

  for (let y = 0; y <= ARENA_H; y += GRID) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#323250";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, ARENA_H - 3);
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFood() {
  foodPulse += 0.15;
  const pulse = Math.floor(2 * Math.sin(foodPulse));
  const size = GRID - 6 + pulse;
  const x = food.x + 3 - pulse / 2;
  const y = food.y + 3 - pulse / 2;

  ctx.fillStyle = PINK;
  roundedRect(x, y, size, size, 7);
  ctx.fill();
}

function drawSnake() {
  const palette = palettes[colorIndex];

  snake.forEach((segment, i) => {
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 1;
    roundedRect(segment.x, segment.y, GRID, GRID, 6);
    ctx.stroke();

    ctx.fillStyle = i === 0 ? palette.head : palette.body;
    roundedRect(segment.x + 1, segment.y + 1, GRID - 2, GRID - 2, 5);
    ctx.fill();

    if (i === 0) drawEyes(segment);
  });
}

function drawEyes(head) {
  ctx.fillStyle = WHITE;
  let eyes = [];

  if (direction === "RIGHT")
    eyes = [[head.x + 14, head.y + 6], [head.x + 14, head.y + 14]];
  if (direction === "LEFT")
    eyes = [[head.x + 6, head.y + 6], [head.x + 6, head.y + 14]];
  if (direction === "UP")
    eyes = [[head.x + 6, head.y + 6], [head.x + 14, head.y + 6]];
  if (direction === "DOWN")
    eyes = [[head.x + 6, head.y + 14], [head.x + 14, head.y + 14]];

  eyes.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEffects() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 35);
    ctx.fillStyle = palettes[colorIndex].head;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  floatingTexts.forEach(t => {
    ctx.globalAlpha = Math.max(0, t.life / 25);
    ctx.fillStyle = YELLOW;
    ctx.font = "bold 22px Arial";
    ctx.fillText(t.text, t.x, t.y);
  });
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = WHITE;
  ctx.font = "bold 22px Arial";
  ctx.fillText(`SCORE: ${score}`, 25, 34);

  ctx.fillStyle = "#a0a0c8";
  ctx.font = "15px Arial";
  ctx.fillText(`BEST: ${highScore}`, 25, 57);
}

function drawJoystick() {
  ctx.fillStyle = "#12121c";
  ctx.fillRect(0, ARENA_H, W, 130);

  ctx.strokeStyle = "#3c3c5a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ARENA_H);
  ctx.lineTo(W, ARENA_H);
  ctx.stroke();

  ctx.fillStyle = "#1e1e30";
  ctx.beginPath();
  ctx.arc(joystick.centerX, joystick.centerY, joystick.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joystick.centerX, joystick.centerY, joystick.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(joystick.x, joystick.y, joystick.knobRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8282aa";
  ctx.font = "15px Arial";
  const hint = "Geser Joystick untuk Mengarahkan";
  ctx.fillText(hint, W / 2 - ctx.measureText(hint).width / 2, H - 122);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(10,10,16,0.86)";
  ctx.fillRect(0, 0, W, H);

  const dw = 440, dh = 280;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2 - 20;

  ctx.fillStyle = "#181826";
  roundedRect(dx, dy, dw, dh, 16);
  ctx.fill();

  ctx.strokeStyle = PINK;
  ctx.lineWidth = 2;
  roundedRect(dx, dy, dw, dh, 16);
  ctx.stroke();

  ctx.fillStyle = PINK;
  ctx.font = "bold 42px Arial";
  const title = "GAME OVER";
  ctx.fillText(title, dx + (dw - ctx.measureText(title).width) / 2, dy + 65);

  ctx.strokeStyle = "#3c3c5a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx + 40, dy + 80);
  ctx.lineTo(dx + dw - 40, dy + 80);
  ctx.stroke();

  ctx.fillStyle = "#9696be";
  ctx.font = "15px Arial";
  const label = "SKOR AKHIR";
  ctx.fillText(label, dx + (dw - ctx.measureText(label).width) / 2, dy + 112);

  ctx.fillStyle = YELLOW;
  ctx.font = "bold 42px Arial";
  const val = String(score);
  ctx.fillText(val, dx + (dw - ctx.measureText(val).width) / 2, dy + 155);

  ctx.fillStyle = BLUE;
  roundedRect(dx + 40, dy + 195, dw - 80, 45, 10);
  ctx.fill();

  ctx.fillStyle = "#0e0e16";
  ctx.font = "bold 22px Arial";
  const btn = "MAIN LAGI [R]";
  ctx.fillText(btn, dx + (dw - ctx.measureText(btn).width) / 2, dy + 225);

  ctx.fillStyle = "#a0a0c8";
  ctx.font = "15px Arial";
  const hint = "Atau sentuh layar untuk mengulang";
  ctx.fillText(hint, W / 2 - ctx.measureText(hint).width / 2, dy + dh + 35);
}

function draw() {
  drawBackground();

  if (!gameOver) {
    drawFood();
    drawEffects();
    drawSnake();
    drawHUD();
    drawJoystick();
  } else {
    drawSnake();
    drawGameOver();
  }
}

function gameLoop(time) {
  if (!gameOver && time - lastMove >= speedMs) {
    moveSnake();
    lastMove = time;
  }

  updateEffects();
  draw();
  requestAnimationFrame(gameLoop);
}

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const source = e.touches ? e.touches[0] : e;
  return {
    x: (source.clientX - rect.left) * W / rect.width,
    y: (source.clientY - rect.top) * H / rect.height
  };
}

function handleJoystick(x, y) {
  const dx = x - joystick.centerX;
  const dy = y - joystick.centerY;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    const limit = joystick.radius;
    const amount = Math.min(dist, limit);
    joystick.x = joystick.centerX + dx / dist * amount;
    joystick.y = joystick.centerY + dy / dist * amount;
  }

  if (dist > 8) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angle >= -45 && angle <= 45) setDirection("RIGHT");
    else if (angle > 45 && angle < 135) setDirection("DOWN");
    else if (angle >= 135 || angle <= -135) setDirection("LEFT");
    else setDirection("UP");
  }
}

canvas.addEventListener("mousedown", e => {
  const p = getCanvasPoint(e);

  if (gameOver) {
    resetGame();
    return;
  }

  const dist = Math.hypot(p.x - joystick.centerX, p.y - joystick.centerY);
  if (dist <= joystick.radius + 25) {
    joystick.dragging = true;
    handleJoystick(p.x, p.y);
  }
});

canvas.addEventListener("mousemove", e => {
  if (!joystick.dragging || gameOver) return;
  const p = getCanvasPoint(e);
  handleJoystick(p.x, p.y);
});

window.addEventListener("mouseup", () => {
  joystick.dragging = false;
  joystick.x = joystick.centerX;
  joystick.y = joystick.centerY;
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const p = getCanvasPoint(e);

  if (gameOver) {
    resetGame();
    return;
  }

  const dist = Math.hypot(p.x - joystick.centerX, p.y - joystick.centerY);
  if (dist <= joystick.radius + 25) {
    joystick.dragging = true;
    handleJoystick(p.x, p.y);
  }
}, {passive: false});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  if (!joystick.dragging || gameOver) return;
  const p = getCanvasPoint(e);
  handleJoystick(p.x, p.y);
}, {passive: false});

window.addEventListener("touchend", () => {
  joystick.dragging = false;
  joystick.x = joystick.centerX;
  joystick.y = joystick.centerY;
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") setDirection("LEFT");
  else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") setDirection("RIGHT");
  else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") setDirection("UP");
  else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") setDirection("DOWN");
  else if (e.key.toLowerCase() === "r" && gameOver) resetGame();
});

resetGame();
requestAnimationFrame(gameLoop);
