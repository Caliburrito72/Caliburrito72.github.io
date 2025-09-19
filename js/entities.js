// js/entities.js
// Detailed chibi characters with unique palettes, improved shading, crisp outlines,
// small accessory for the player, and preserved API for main.js.

const Entities = (() => {
  const TILE = 16;

  // Animation
  const ANIM = {
    idleFrame: 1,   // 0..3
    walkFps: 8,
    frames: 4
  };

  // Base palettes (no pink hair by default). Each variant can be mixed per NPC.
  const BASE_PAL = {
    hair:    '#2b1d14', // deep brown
    hairHi:  '#6a4a30',
    skin:    '#f2e7da',
    skinHi:  '#fff5ea',
    outline: '#0b0f1a',
    eye:     '#0c1220',
    outfit:  '#1f2937', // charcoal navy
    outfitHi:'#3a4a63',
    trim:    '#9ac3ff',
    boot:    '#8aa0b6',
    scarf:   '#c14646'  // player accessory for uniqueness
  };

  // Player factory
  function createPlayer({ x, y }) {
    return {
      x, y,
      dir: 'down',            // 'up' | 'down' | 'left' | 'right'
      frame: ANIM.idleFrame,  // 0..3
      t: 0,
      look: { x: 0, y: 1 },
      pal: { ...BASE_PAL },
      accessory: 'scarf',     // small accessory to feel unique
      name: 'Sam'
    };
  }

  // NPC factory (optional name and palette tweaks)
  function createNPC({ x, y, dir = 'down', palette = {}, name = 'Local', dialogues = [] }) {
    return {
      x, y, dir, frame: ANIM.idleFrame, t: 0,
      look: { x: 0, y: 1 },
      pal: { ...BASE_PAL, ...palette },
      name,
      dialogues
    };
  }

  // Facing and animation update
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
  function updateWalk(e, dt) { e.t += dt; e.frame = Math.floor(e.t * ANIM.walkFps) % ANIM.frames; }
  function updateIdle(e, dt) { e.t += dt * 0.5; e.frame = ANIM.idleFrame; }

  // Public draw
  function drawPlayer(ctx, e) { drawChibi(ctx, e, false); }
  function drawNPC(ctx, e)   { drawChibi(ctx, e, true);  } // slight desat for background

  // Core chibi draw with improved shading and outline accents
  function drawChibi(ctx, e, slightDesat) {
    const cx = Math.floor(e.x);
    const cy = Math.floor(e.y);

    const bob = Math.sin(performance.now() * 0.008) * 0.9;
    const frame = e.frame;
    const swing = (frame === 0 ? -1 : frame === 2 ? 1 : 0);
    const step  = swing;

    const pal = e.pal;
    const tone = (hex, amt) => mix(hex, '#223', slightDesat ? amt : 0);
    const outline = pal.outline;

    ctx.save();
    ctx.translate(cx, cy + bob);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 7, 6, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Proportions
    // Head: 12x12; Body: 10x12; Legs/boots; Arms thin; Accessory
    const headY = -12;
    const bodyY = -2;

    // Body with shading band
    ctx.fillStyle = tone(pal.outfit, 0.15);
    roundRect(ctx, -5, bodyY, 10, 12, 3, true, false);

    ctx.fillStyle = tone(pal.outfitHi, 0.15);
    ctx.fillRect(-4, bodyY + 2, 8, 2);

    // Arms (swing)
    ctx.fillStyle = tone(pal.outfit, 0.15);
    ctx.fillRect(-6, bodyY + 3 + swing, 2, 6);
    ctx.fillRect( 4, bodyY + 3 - swing, 2, 6);

    // Legs and boots
    ctx.fillStyle = '#cfd6e0';
    ctx.fillRect(-4, bodyY + 10, 3, 4);
    ctx.fillRect( 1, bodyY + 10, 3, 4);

    ctx.fillStyle = pal.boot;
    ctx.fillRect(-4, bodyY + 12 + step, 3, 2);
    ctx.fillRect( 1, bodyY + 12 - step, 3, 2);

    // Head base
    ctx.fillStyle = pal.skin;
    roundRect(ctx, -6, headY, 12, 12, 5, true, false);

    // Head gradient volume
    let grd = ctx.createLinearGradient(-6, headY, 6, headY + 12);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = grd;
    roundRect(ctx, -6, headY, 12, 12, 5, true, false);

    // Hair silhouette (directional) non‑pink palette
    ctx.fillStyle = tone(pal.hair, 0.0);
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
    } else {
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-2, headY - 3, 8, headY - 2, 6, headY + 2);
      ctx.lineTo(6, headY + 10);
      ctx.bezierCurveTo(6, headY + 7, 1, headY + 7, -6, headY + 10);
    }
    ctx.closePath(); ctx.fill();

    // Hair highlight
    ctx.fillStyle = tone(pal.hairHi, 0.0);
    if (e.dir === 'down') ctx.fillRect(-3, headY + 1, 6, 2);
    else if (e.dir === 'up') ctx.fillRect(-2, headY - 1, 4, 2);
    else if (e.dir === 'left') ctx.fillRect(-4, headY + 1, 4, 2);
    else ctx.fillRect(0, headY + 1, 4, 2);

    // Face features
    drawFace(ctx, e, headY);

    // Accessory (player only): scarf under chin with tiny motion
    if (e.accessory === 'scarf') {
      const wave = Math.sin(performance.now() * 0.006) * 0.5;
      ctx.fillStyle = pal.scarf;
      ctx.fillRect(-3, bodyY + 0, 6, 2);
      ctx.fillRect(2, bodyY + 1, 2, 4 + wave);
    }

    // Subtle outline accents (top-lit lighten, bottom-lined dark)
    ctx.strokeStyle = outline;
    ctx.globalAlpha = 0.22;
    strokeRoundRect(ctx, -6, headY, 12, 12, 5);
    strokeRoundRect(ctx, -5, bodyY, 10, 12, 3);
    ctx.globalAlpha = 1.0;

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
    } else {
      dot(ctx, 3, headY + 4, 1.2);
      ctx.fillStyle = '#64748b'; ctx.fillRect(-3, headY + 5, 2, 1);
    }

    // Skin highlight (subtle)
    const skinHi = ctx.createLinearGradient(-6, headY, 6, headY + 12);
    skinHi.addColorStop(0, 'rgba(255,255,255,0.07)');
    skinHi.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = skinHi;
    roundRect(ctx, -6, headY, 12, 12, 5, true, false);
  }

  // Helpers
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
  function strokeRoundRect(ctx, x, y, w, h, r) { roundRect(ctx, x, y, w, h, r, false, true); }

  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
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
