// js/main.js
// Bootstraps the JRPG portfolio: canvas loop, input, movement, camera, interactions, and UI hooks.

// Imports: map data, entities, and UI helpers must be loaded before this script via index.html script order.
// Expects global objects from other files:
//   MAP from js/map.js
//   Entities from js/entities.js
//   UI from js/ui.js

(() => {
  // Canvas and context
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Constants
  const TILE = 16;                    // tile size in pixels
  const TILES_PER_SEC = 3.5;          // movement speed target
  const SPEED = TILES_PER_SEC * TILE; // pixels per second, ~56 px/s
  const DIAG = 1 / Math.sqrt(2);      // for diagonal normalization
  const WORLD_W = MAP.width * TILE;
  const WORLD_H = MAP.height * TILE;

  // Camera setup (centered on player, clamped)
  const camera = { x: 0, y: 0, w: canvas.width, h: canvas.height, lookAhead: 12 };

  // Input
  const keys = new Set();
  addEventListener('keydown', e => { keys.add(e.key); if (e.key === 'Escape') UI.closePanel(); });
  addEventListener('keyup', e => keys.delete(e.key));
  addEventListener('blur', () => keys.clear());

  // Player
  const player = Entities.createPlayer({ x: MAP.playerSpawn.x, y: MAP.playerSpawn.y });

  // Timing
  let last = performance.now();
  let fpsTimer = 0, frames = 0;

  // Init
  function init() {
    UI.setHint('Explore the plaza and press E near glowing objects.'); // HUD hint
    requestAnimationFrame(loop);
  }

  // Main loop
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000); // clamp dt for stability
    last = ts;

    update(dt);
    render();

    // FPS meter
    frames++; fpsTimer += dt;
    if (fpsTimer >= 1) {
      const el = document.getElementById('fps');
      if (el) el.textContent = `${Math.round(frames / fpsTimer)} FPS`;
      fpsTimer = 0; frames = 0;
    }

    requestAnimationFrame(loop);
  }

  // Update world
  function update(dt) {
    handleMovement(dt);
    handleInteractions();
    updateCamera(dt);
  }

  function handleMovement(dt) {
    // Disallow movement while a modal UI panel is open
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

    // Interaction key
    if (keys.has('e') || keys.has('E') || keys.has('Enter')) {
      tryInteract();
    }

    // Normalize diagonal speed
    if (x !== 0 && y !== 0) { x *= DIAG; y *= DIAG; }

    // Move with collision
    const vx = x * SPEED;
    const vy = y * SPEED;

    // Update facing and animation
    Entities.updateFacing(player, x, y);
    if (x !== 0 || y !== 0) {
      // Attempt X then Y movement with collision checks
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
    // Collision against map's solid tiles
    const half = 6; // player body radius for collision sampling
    // sample 4 corners
    return isSolid(px - half, py - half) ||
           isSolid(px + half, py - half) ||
           isSolid(px - half, py + half) ||
           isSolid(px + half, py + half);
  }

  function isSolid(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP.width || ty >= MAP.height) return true;
    return MAP.solids[ty][tx] === 1;
  }

  function tryInteract() {
    // Find nearest interactable within radius
    const r = 14;
    let nearest = null, best = 1e9;
    for (const obj of MAP.objects) {
      const ox = obj.x * TILE + TILE / 2;
      const oy = obj.y * TILE + TILE / 2;
      const d = Math.hypot(player.x - ox, player.y - oy);
      if (d < r && d < best) { best = d; nearest = obj; }
    }
    if (nearest) UI.openObject(nearest);
  }

  function handleInteractions() {
    // Show/Hide proximity prompts
    let show = null;
    const r = 14;
    for (const obj of MAP.objects) {
      const ox = obj.x * TILE + TILE / 2;
      const oy = obj.y * TILE + TILE / 2;
      const d = Math.hypot(player.x - ox, player.y - oy);
      if (d < r) { show = obj; break; }
    }
    if (show) {
      UI.showPromptAt(show, 'E');
    } else {
      UI.hidePrompt();
    }
  }

  function updateCamera(dt) {
    // Smooth follow with slight look-ahead in facing direction
    const targetX = player.x + player.look.x * camera.lookAhead - camera.w / 2;
    const targetY = player.y + player.look.y * camera.lookAhead - camera.h / 2;
    camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
    camera.y += (targetY - camera.y) * Math.min(1, dt * 6);

    // Clamp to world
    camera.x = clamp(camera.x, 0, Math.max(0, WORLD_W - camera.w));
    camera.y = clamp(camera.y, 0, Math.max(0, WORLD_H - camera.h));
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Render
  function render() {
    // Sky/background gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0a1026');
    g.addColorStop(1, '#0a0d18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // Parallax backdrop
    drawParallax();

    // Map tiles and decorations
    drawMap();

    // Player
    Entities.drawPlayer(ctx, player);

    // Prompts (drawn in UI layer via absolute HTML; here only for debug if needed)

    ctx.restore();
  }

  function drawParallax() {
    // Simple layered hills/fog
    const t = performance.now() * 0.02;
    drawHills('#091024', '#0c1530', 30, 1.2, t * 0.05);
    drawHills('#0c1530', '#111c3d', 60, 1.6, t * 0.07);
    drawHills('#13224f', '#1a2c62', 90, 2.0, t * 0.09);
    drawFog();
  }

  function drawHills(c1, c2, yOff, amp, t) {
    const baseY = MAP.height * TILE - (80 + yOff);
    ctx.beginPath();
    ctx.moveTo(0, MAP.height * TILE);
    for (let x = 0; x <= MAP.width * TILE; x += 8) {
      const y = baseY + Math.sin((x + t) * 0.02) * (amp * 12);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(MAP.width * TILE, MAP.height * TILE);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, baseY, 0, MAP.height * TILE);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawFog() {
    const grd = ctx.createLinearGradient(0, (MAP.height * TILE) * 0.5, 0, MAP.height * TILE);
    grd.addColorStop(0, 'rgba(173,216,230,0.03)');
    grd.addColorStop(1, 'rgba(173,216,230,0.12)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, MAP.width * TILE, MAP.height * TILE);
  }

  function drawMap() {
    // Floor + walls based on MAP.tiles / MAP.solids
    for (let ty = 0; ty < MAP.height; ty++) {
      for (let tx = 0; tx < MAP.width; tx++) {
        const x = tx * TILE, y = ty * TILE;
        const solid = MAP.solids[ty][tx] === 1;
        if (solid) {
          ctx.fillStyle = '#1b2433';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#11192a';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        } else {
          ctx.fillStyle = '#0d1427';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(x, y + TILE - 3, TILE, 3);
        }
      }
    }

    // Decorative/interactable objects
    for (const obj of MAP.objects) {
      const cx = obj.x * TILE + TILE / 2;
      const cy = obj.y * TILE + TILE / 2;
      // Glow marker
      ctx.fillStyle = 'rgba(110,231,255,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();

      // Icon
      drawObjectIcon(obj, cx, cy);
    }
  }

  function drawObjectIcon(obj, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    // Different icons by type
    if (obj.type === 'gallery') {
      ctx.fillStyle = '#6ee7ff';
      ctx.fillRect(-6, -4, 12, 8);
      ctx.fillStyle = '#ff7ae6';
      ctx.fillRect(-3, -1, 6, 3);
    } else if (obj.type === 'projects') {
      ctx.fillStyle = '#ff7ae6';
      ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, 0); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    } else if (obj.type === 'skills') {
      ctx.fillStyle = '#6ee7ff';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b1220'; ctx.fillRect(-1, -3, 2, 6);
    } else if (obj.type === 'contact') {
      ctx.fillStyle = '#cfe6f5'; ctx.fillRect(-6, -4, 12, 8);
      ctx.strokeStyle = '#0b1220'; ctx.strokeRect(-6, -4, 12, 8);
    } else if (obj.type === 'about') {
      ctx.fillStyle = '#b9c8d8'; ctx.beginPath();
      ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-3, 2, 6, 4);
    }
    ctx.restore();
  }

  // Expose for debug in console
  window.__JRPG = { player, camera, MAP, UI, Entities };
  init();
})();
