// js/main.js (minimap fix + HD‑2D pass refinements)
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Constants
  const TILE = 16;
  const TILES_PER_SEC = 3.5;
  const SPEED = TILES_PER_SEC * TILE;
  const DIAG = 1 / Math.sqrt(2);
  const WORLD_W = MAP.width * TILE;
  const WORLD_H = MAP.height * TILE;

  // Camera
  const camera = { x: 0, y: 0, w: canvas.width, h: canvas.height, lookAhead: 12 };

  // Input
  const keys = new Set();
  addEventListener('keydown', e => { keys.add(e.key); if (e.key === 'Escape') UI.closePanel(); });
  addEventListener('keyup', e => keys.delete(e.key));
  addEventListener('blur', () => keys.clear());

  // Player
  const player = Entities.createPlayer({ x: MAP.playerSpawn.x, y: MAP.playerSpawn.y });

  // Quest guide
  const QUESTS = [
    { id: 'about',   text: 'Meet Sam (About).', done: false },
    { id: 'skills',  text: 'Check the Skills Board.', done: false },
    { id: 'gallery', text: 'Visit the Art Gallery.', done: false },
    { id: 'projects',text: 'See the Projects Arcade.', done: false },
    { id: 'contact', text: 'Open the Mailbox (Contact).', done: false }
  ];
  function markQuest(id) {
    const q = QUESTS.find(q => q.id === id);
    if (q && !q.done) { q.done = true; UI.toast(`Progress: ${q.text} ✓`); }
  }
  function currentQuestText() {
    const q = QUESTS.find(q => !q.done);
    return q ? q.text : 'All sections explored!';
  }

  // HUD containers
  const stage = document.querySelector('.stage');
  // Ensure .stage is relative so absolutes anchor correctly
  if (stage && getComputedStyle(stage).position === 'static') {
    stage.style.position = 'relative';
  }

  // Minimap (fixed CSS size; internal DPR scaling)
  const mm = document.createElement('canvas');
  const MM_CSS_W = 96; // CSS pixels
  const MM_CSS_H = 64; // CSS pixels
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  mm.width = MM_CSS_W * dpr;
  mm.height = MM_CSS_H * dpr;
  Object.assign(mm.style, {
    position: 'absolute', left: '12px', top: '12px',
    width: `${MM_CSS_W}px`, height: `${MM_CSS_H}px`,
    border: '1px solid var(--line)', borderRadius: '10px',
    background: 'rgba(0,0,0,.35)', zIndex: 5, imageRendering: 'pixelated'
  });
  stage?.appendChild(mm);
  const mmctx = mm.getContext('2d');
  mmctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

  // Quest chip under minimap
  const questChip = document.createElement('div');
  Object.assign(questChip.style, {
    position: 'absolute', left: '12px', top: `${12 + MM_CSS_H + 8}px`,
    padding: '4px 8px', fontSize: '12px', color: '#cfe6f5',
    background: 'rgba(0,0,0,.35)', border: '1px solid var(--line)',
    borderRadius: '10px', zIndex: 5, maxWidth: `${MM_CSS_W}px`
  });
  questChip.textContent = currentQuestText();
  stage?.appendChild(questChip);

  // Glow buffer for emissive/bloom (offscreen, matches main canvas CSS size)
  const glow = document.createElement('canvas');
  glow.width = canvas.width; glow.height = canvas.height;
  const glowCtx = glow.getContext('2d');

  // Timing
  let last = performance.now();
  let fpsTimer = 0, frames = 0;

  function init() {
    UI.setHint('WASD/Arrows move · E interact · Esc close');
    requestAnimationFrame(loop);
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;

    update(dt);
    render(dt);

    frames++; fpsTimer += dt;
    if (fpsTimer >= 1) {
      const el = document.getElementById('fps');
      if (el) el.textContent = `${Math.round(frames / fpsTimer)} FPS`;
      questChip.textContent = currentQuestText();
      fpsTimer = 0; frames = 0;
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    handleMovement(dt);
    handleInteractions();
    updateCamera(dt);
  }

  function handleMovement(dt) {
    if (UI.isOpen()) { Entities.updateIdle(player, dt); return; }

    let x = 0, y = 0;
    const left  = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    const right = keys.has('ArrowRight')|| keys.has('d') || keys.has('D');
    const up    = keys.has('ArrowUp')   || keys.has('w') || keys.has('W');
    const down  = keys.has('ArrowDown') || keys.has('s') || keys.has('S');

    if (left)  x -= 1;
    if (right) x += 1;
    if (up)    y -= 1;
    if (down)  y += 1;

    if (keys.has('e') || keys.has('E') || keys.has('Enter')) tryInteract();

    if (x !== 0 && y !== 0) { x *= DIAG; y *= DIAG; }

    const vx = x * SPEED, vy = y * SPEED;
    Entities.updateFacing(player, x, y);

    if (x !== 0 || y !== 0) {
      const nx = player.x + vx * dt;
      const ny = player.y;
      const cx = collides(nx, ny) ? player.x : nx;

      const ny2 = player.y + vy * dt;
      const cy = collides(cx, ny2) ? player.y : ny2;

      player.x = clamp(cx, TILE, WORLD_W - TILE);
      player.y = clamp(cy, TILE, WORLD_H - TILE);
      Entities.updateWalk(player, dt);
    } else {
      Entities.updateIdle(player, dt);
    }
  }

  function collides(px, py) {
    const half = 6;
    return isSolid(px - half, py - half) ||
           isSolid(px + half, py - half) ||
           isSolid(px - half, py + half) ||
           isSolid(px + half, py + half);
  }
  function isSolid(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP.width || ty >= MAP.height) return true;
    return MAP.solids[ty][tx] === 1;
  }

  function tryInteract() {
    const obj = nearestObject(14);
    if (!obj) return;
    UI.openObject(obj);
    markQuest(obj.id);
  }

  function handleInteractions() {
    const obj = nearestObject(14);
    if (obj) UI.showPromptAt(obj, 'E'); else UI.hidePrompt();
  }

  function nearestObject(radiusPx) {
    let nearest = null, best = 1e9;
    for (const obj of MAP.objects) {
      const ox = obj.x * TILE + TILE / 2;
      const oy = obj.y * TILE + TILE / 2;
      const d = Math.hypot(player.x - ox, player.y - oy);
      if (d < radiusPx && d < best) { best = d; nearest = obj; }
    }
    return nearest;
  }

  function updateCamera(dt) {
    const targetX = player.x + player.look.x * camera.lookAhead - camera.w / 2;
    const targetY = player.y + player.look.y * camera.lookAhead - camera.h / 2;
    camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
    camera.y += (targetY - camera.y) * Math.min(1, dt * 6);
    camera.x = clamp(camera.x, 0, Math.max(0, WORLD_W - camera.w));
    camera.y = clamp(camera.y, 0, Math.max(0, WORLD_H - camera.h));
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Render
  function render(dt) {
    // Background
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0a0f24'); g.addColorStop(1, '#0b0d1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    drawParallax();
    drawMap();
    Entities.drawPlayer(ctx, player);

    ctx.restore();

    compositeGlow(dt);
    drawMinimap();
  }

  // Parallax and fog
  function drawParallax() {
    const t = performance.now() * 0.02;
    drawHills('#0b1634', '#15214a', 36, 1.4, t * 0.05);
    drawHills('#12204a', '#1a2c62', 72, 1.8, t * 0.07);
    drawHills('#1a2b60', '#213874', 108, 2.2, t * 0.09);
    drawFog();
  }
  function drawHills(c1, c2, yOff, amp, t) {
    ctx.beginPath();
    const baseY = MAP.height * TILE - (90 + yOff);
    ctx.moveTo(0, MAP.height * TILE);
    for (let x = 0; x <= MAP.width * TILE; x += 8) {
      const y = baseY + Math.sin((x + t) * 0.02) * (amp * 12);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(MAP.width * TILE, MAP.height * TILE);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, baseY, 0, MAP.height * TILE);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill();
  }
  function drawFog() {
    const fogTop = (MAP.height * TILE) * 0.5;
    const grd = ctx.createLinearGradient(0, fogTop, 0, MAP.height * TILE);
    grd.addColorStop(0, 'rgba(173,216,230,0.04)');
    grd.addColorStop(1, 'rgba(173,216,230,0.16)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, MAP.width * TILE, MAP.height * TILE);
  }

  function drawMap() {
    for (let ty = 0; ty < MAP.height; ty++) {
      for (let tx = 0; tx < MAP.width; tx++) {
        const x = tx * TILE, y = ty * TILE;
        const solid = MAP.solids[ty][tx] === 1;
        if (solid) {
          ctx.fillStyle = '#1b2433'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#11192a'; ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        } else {
          ctx.fillStyle = '#0e162a'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x, y + TILE - 3, TILE, 3);
        }
      }
    }

    // Objects + glow
    for (const obj of MAP.objects) {
      const cx = obj.x * TILE + TILE / 2;
      const cy = obj.y * TILE + TILE / 2;

      // ground halo
      ctx.fillStyle = 'rgba(110,231,255,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();

      drawObjectIcon(obj, cx, cy);

      // glow mask (screen space relative to camera)
      const sx = Math.floor(cx - camera.x);
      const sy = Math.floor(cy - camera.y);
      const pulse = 10 + Math.sin(performance.now() * 0.005) * 2;
      glowCtx.fillStyle = 'rgba(110,231,255,0.3)';
      glowCtx.beginPath(); glowCtx.arc(sx, sy, pulse, 0, Math.PI * 2); glowCtx.fill();
    }
  }

  function drawObjectIcon(obj, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    if (obj.type === 'gallery') {
      ctx.fillStyle = '#6ee7ff'; ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = '#ff7ae6'; ctx.fillRect(-3, -1, 6, 3);
    } else if (obj.type === 'projects') {
      ctx.fillStyle = '#ff7ae6'; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, 0); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    } else if (obj.type === 'skills') {
      ctx.fillStyle = '#6ee7ff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b1220'; ctx.fillRect(-1, -3, 2, 6);
    } else if (obj.type === 'contact') {
      ctx.fillStyle = '#cfe6f5'; ctx.fillRect(-6, -4, 12, 8); ctx.strokeStyle = '#0b1220'; ctx.strokeRect(-6, -4, 12, 8);
    } else if (obj.type === 'about') {
      ctx.fillStyle = '#b9c8d8'; ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-3, 2, 6, 4);
    }
    ctx.restore();
  }

  function compositeGlow(dt) {
    // downsample for blur
    const temp = document.createElement('canvas');
    temp.width = Math.floor(glow.width / 2);
    temp.height = Math.floor(glow.height / 2);
    const tctx = temp.getContext('2d');
    tctx.drawImage(glow, 0, 0, temp.width, temp.height);
    glowCtx.clearRect(0, 0, glow.width, glow.height);
    glowCtx.globalAlpha = 0.9;
    glowCtx.drawImage(temp, 0, 0, glow.width, glow.height);
    glowCtx.globalAlpha = 1.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glow, 0, 0);
    ctx.restore();

    glowCtx.clearRect(0, 0, glow.width, glow.height);
  }

  function drawMinimap() {
    const scaleX = MM_CSS_W / WORLD_W;
    const scaleY = MM_CSS_H / WORLD_H;

    // clear bezel
    mmctx.clearRect(0, 0, MM_CSS_W, MM_CSS_H);
    mmctx.fillStyle = 'rgba(8,12,22,0.85)';
    mmctx.fillRect(0, 0, MM_CSS_W, MM_CSS_H);

    // solids
    mmctx.fillStyle = 'rgba(27,36,51,0.95)';
    for (let y = 0; y < MAP.height; y++) {
      for (let x = 0; x < MAP.width; x++) {
        if (MAP.solids[y][x] === 1) {
          mmctx.fillRect(Math.floor(x * TILE * scaleX), Math.floor(y * TILE * scaleY),
                         Math.ceil(TILE * scaleX), Math.ceil(TILE * scaleY));
        }
      }
    }

    // objects
    mmctx.fillStyle = '#6ee7ff';
    for (const obj of MAP.objects) {
      const ox = obj.x * TILE + TILE / 2;
      const oy = obj.y * TILE + TILE / 2;
      mmctx.fillRect(Math.floor(ox * scaleX) - 1, Math.floor(oy * scaleY) - 1, 2, 2);
    }

    // player
    mmctx.fillStyle = '#ff7ae6';
    mmctx.fillRect(Math.floor(player.x * scaleX) - 2, Math.floor(player.y * scaleY) - 2, 4, 4);

    // viewport
    mmctx.strokeStyle = 'rgba(207,230,245,0.85)';
    mmctx.lineWidth = 1;
    mmctx.strokeRect(Math.floor(camera.x * scaleX), Math.floor(camera.y * scaleY),
                     Math.floor(camera.w * scaleX), Math.floor(camera.h * scaleY));
  }

  window.__JRPG = { player, camera, MAP, UI, Entities };
  init();
})();
