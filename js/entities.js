// js/entities.js (HD‑2D sprite pass: detailed chibi + simple NPCs)
const Entities = (() => {
  const TILE = 16;

  // Animation timing
  const ANIM = {
    idleFrame: 1,
    walkFps: 8,   // readable cadence
    frames: 4
  };

  // Shared palette utility (hue-shifted ramps help readability)
  const PAL = {
    hair: '#ff7ae6',
    hairHi: '#ffc0f3',
    skin: '#f1f5f9',
    skinHi: '#ffffff',
    outfit: '#1f2937',
    outfitHi: '#3a4a63',
    trim: '#93c5fd',
    eye: '#0b1220',
    shadowDark: '#0a1222',
    shadowMed: '#cbd5e1',
    boot: '#94a3b8'
  };

  function createPlayer({ x, y }) {
    return {
      x, y,
      dir: 'down',            // 'up' | 'down' | 'left' | 'right'
      frame: ANIM.idleFrame,  // 0..3
      t: 0,
      look: { x: 0, y: 1 },
      pal: { ...PAL }
    };
  }

  function createNPC({ x, y, dir = 'down', palette = {} }) {
    return {
      x, y, dir,
      frame: ANIM.idleFrame, t: 0,
      look: { x: 0, y: 1 },
      pal: { ...PAL, ...palette }
    };
  }

  function updateFacing(e, xAxis, yAxis) {
    if (Math.abs(xAxis) > Math.abs(yAxis)) {
      if (xAxis < 0) { e.dir = 'left';  e.look.x = -1; e.look.y = 0; }
      else if (xAxis > 0) { e.dir = 'right'; e.look.x = 1; e.look.y = 0; }
    } else if (Math.abs(yAxis) > 0) {
      if (yAxis < 0) { e.dir = 'up';    e.look.x = 0; e.look.y = -1; }
      else if (yAxis > 0) { e.dir = 'down';  e.look.x = 0; e.look.y = 1; }
    }
    if (xAxis === 0 && yAxis === 0) {
      e.look.x *= 0.9; e.look.y *= 0.9;
      if (Math.hypot(e.look.x, e.look.y) < 0.1) { e.look.x = 0; e.look.y = 0; }
    }
  }

  function updateWalk(e, dt) {
    e.t += dt;
    e.frame = Math.floor(e.t * ANIM.walkFps) % ANIM.frames;
  }
  function updateIdle(e, dt) {
    e.t += dt * 0.5;
    e.frame = ANIM.idleFrame;
  }

  // Public draw for player and NPCs use same renderer
  function drawPlayer(ctx, e) { drawChibi(ctx, e); }
  function drawNPC(ctx, e) { drawChibi(ctx, e, true); }

  // Core chibi drawing
  function drawChibi(ctx, e, slightDesat = false) {
    const cx = Math.floor(e.x);
    const cy = Math.floor(e.y);

    const bob = Math.sin(performance.now() * 0.008) * 0.9;
    const swing = walkSwing(e.frame);
    const sign = swingSign(e.frame);

    const pal = e.pal;
    const outfit = slightDesat ? mix(pal.outfit, '#223046', 0.3) : pal.outfit;
    const outfitHi = slightDesat ? mix(pal.outfitHi, '#305070', 0.3) : pal.outfitHi;

    ctx.save();
    ctx.translate(cx, cy + bob);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 7, 6, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Proportions: ~2.25 heads tall
    // Head: 12x12; Body: 10x12; Legs: 4px; Arms thin
    const headY = -12;
    const bodyY = -2;

    // Body base
    ctx.fillStyle = outfit;
    roundRect(ctx, -5, bodyY, 10, 12, 3, true);

    // Outfit highlight band (top-lit)
    ctx.fillStyle = outfitHi;
    ctx.fillRect(-4, bodyY + 2, 8, 2);

    // Arms (slight swing)
    ctx.fillStyle = outfit;
    ctx.fillRect(-6, bodyY + 3 + swing, 2, 6);
    ctx.fillRect(4,  bodyY + 3 - swing, 2, 6);

    // Legs and boots
    ctx.fillStyle = pal.shadowMed;
    ctx.fillRect(-4, bodyY + 10, 3, 4);
    ctx.fillRect(1,  bodyY + 10, 3, 4);
    ctx.fillStyle = pal.boot;
    ctx.fillRect(-4, bodyY + 12 + sign, 3, 2);
    ctx.fillRect(1,  bodyY + 12 - sign, 3, 2);

    // Head (skin base)
    ctx.fillStyle = pal.skin;
    roundRect(ctx, -6, headY, 12, 12, 5, true);

    // Head highlight (gives volume)
    let grd = ctx.createLinearGradient(-6, headY, 6, headY + 12);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = grd;
    roundRect(ctx, -6, headY, 12, 12, 5, true);

    // Hair silhouette (directional)
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (e.dir === 'up') {
      ctx.moveTo(-6, headY + 1);
      ctx.bezierCurveTo(-6, headY - 6, 6, headY - 6, 6, headY + 1);
      ctx.lineTo(6, headY + 6);
      ctx.bezierCurveTo(3, headY + 3, -3, headY + 3, -6, headY + 6);
    } else if (e.dir === 'down') {
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-3, headY - 2, 3, headY - 2, 6, headY + 2);
      ctx.lineTo(6, headY + 9);
      ctx.bezierCurveTo(2, headY + 6, -2, headY + 6, -6, headY + 9);
    } else if (e.dir === 'left') {
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-8, headY - 2, 2, headY - 3, 6, headY + 2);
      ctx.lineTo(6, headY + 10);
      ctx.bezierCurveTo(-1, headY + 7, -6, headY + 7, -6, headY + 10);
    } else { // right
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-2, headY - 3, 8, headY - 2, 6, headY + 2);
      ctx.lineTo(6, headY + 10);
      ctx.bezierCurveTo(6, headY + 7, 1, headY + 7, -6, headY + 10);
    }
    ctx.closePath(); ctx.fill();

    // Hair highlight
    ctx.fillStyle = pal.hairHi;
    if (e.dir === 'down') ctx.fillRect(-3, headY + 1, 6, 2);
    else if (e.dir === 'up') ctx.fillRect(-2, headY - 1, 4, 2);
    else if (e.dir === 'left') ctx.fillRect(-4, headY + 1, 4, 2);
    else ctx.fillRect(0, headY + 1, 4, 2);

    // Face features (directional)
    drawFace(ctx, e, headY);

    ctx.restore();
  }

  function drawFace(ctx, e, headY) {
    const pal = e.pal;
    ctx.fillStyle = pal.eye;

    if (e.dir === 'up') {
      dot(ctx, -2, headY + 2, 1);
      dot(ctx,  2, headY + 2, 1);
    } else if (e.dir === 'down') {
      dot(ctx, -2, headY + 4, 1.2);
      dot(ctx,  2, headY + 4, 1.2);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(-1, headY + 7, 2, 1);
    } else if (e.dir === 'left') {
      dot(ctx, -3, headY + 4, 1.2);
      ctx.fillStyle = '#64748b'; ctx.fillRect(1, headY + 5, 2, 1);
    } else { // right
      dot(ctx, 3, headY + 4, 1.2);
      ctx.fillStyle = '#64748b'; ctx.fillRect(-3, headY + 5, 2, 1);
    }
  }

  // Helpers
  function walkSwing(frame) { return frame === 0 ? -1 : frame === 2 ? 1 : 0; }
  function swingSign(frame) { return frame === 0 ? -1 : frame === 2 ? 1 : 0; }

  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bch = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bch})`;
  }
  function hexToRgb(h) {
    const s = h.startsWith('#') ? h.slice(1) : h;
    const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    const n = parseInt(v, 16);
    return { r: (n>>16)&255, g:(n>>8)&255, b:n&255 };
  }

  return {
    createPlayer,
    createNPC,
    updateFacing,
    updateWalk,
    updateIdle,
    drawPlayer,
    drawNPC
  };
})();
