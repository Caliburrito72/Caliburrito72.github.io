// js/entities.js (rewritten)
// Entities: anime‑inspired chibi player with clearer head/face/hair, 4‑frame walk, and drawing utilities.

const Entities = (() => {
  const TILE = 16;

  // 4‑frame cycle tuned for readability at ~8 fps walking
  const ANIM = {
    idleFrame: 1,
    walkFps: 8,
    frames: 4
  };

  function createPlayer({ x, y }) {
    return {
      x, y,
      dir: 'down',            // 'up' | 'down' | 'left' | 'right'
      frame: ANIM.idleFrame,  // 0..3
      t: 0,                   // time accumulator for animation
      look: { x: 0, y: 1 },   // unit vector for camera look‑ahead
      // Palette
      hair: '#ff7ae6',
      skin: '#f1f5f9',
      shadow: '#cbd5e1',
      outfit: '#1f2937',
      trim: '#93c5fd',
      eye: '#0b1220'
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

  // Drawing helpers
  function drawPlayer(ctx, e) {
    const cx = Math.floor(e.x);
    const cy = Math.floor(e.y);

    const bob = Math.sin(performance.now() * 0.008) * 1.0;

    ctx.save();
    ctx.translate(cx, cy + bob);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Proportions (chibi)
    // Head: 12x12 circle‑ish, Body: 10x12 rounded rect
    // Offsets
    const headY = -11;
    const bodyY = -2;

    // Body (outfit)
    ctx.fillStyle = e.outfit;
    roundRect(ctx, -5, bodyY, 10, 12, 3, true);

    // Collar/trim
    ctx.fillStyle = e.trim;
    ctx.fillRect(-4, bodyY + 1, 8, 2);

    // Arms (simple swing)
    const swing = walkSwing(e.frame);
    ctx.fillStyle = e.outfit;
    // left arm
    ctx.fillRect(-6, bodyY + 2 + swing, 2, 6);
    // right arm
    ctx.fillRect(4, bodyY + 2 - swing, 2, 6);

    // Legs with alternating step
    ctx.fillStyle = e.shadow;
    ctx.fillRect(-4, bodyY + 9, 3, 4);
    ctx.fillRect(1,  bodyY + 9, 3, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-4, bodyY + 11 + swingSign(e.frame), 3, 2);
    ctx.fillRect(1,  bodyY + 11 - swingSign(e.frame), 3, 2);

    // Head base (skin)
    ctx.fillStyle = e.skin;
    roundRect(ctx, -6, headY, 12, 12, 5, true);

    // Hair silhouette (side‑swept)
    ctx.fillStyle = e.hair;
    ctx.beginPath();
    if (e.dir === 'up') {
      // crown heavy, fringe back
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-6, headY - 6, 6, headY - 6, 6, headY + 2);
      ctx.lineTo(6, headY + 6);
      ctx.bezierCurveTo(3, headY + 3, -3, headY + 3, -6, headY + 6);
      ctx.closePath();
    } else if (e.dir === 'down') {
      // fringe forward
      ctx.moveTo(-6, headY + 1);
      ctx.bezierCurveTo(-3, headY - 3, 3, headY - 3, 6, headY + 1);
      ctx.lineTo(6, headY + 8);
      ctx.bezierCurveTo(2, headY + 4, -2, headY + 4, -6, headY + 8);
      ctx.closePath();
    } else if (e.dir === 'left') {
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-8, headY - 2, 2, headY - 4, 6, headY + 2);
      ctx.lineTo(6, headY + 9);
      ctx.bezierCurveTo(-2, headY + 6, -6, headY + 6, -6, headY + 9);
      ctx.closePath();
    } else { // right
      ctx.moveTo(-6, headY + 2);
      ctx.bezierCurveTo(-2, headY - 4, 8, headY - 2, 6, headY + 2);
      ctx.lineTo(6, headY + 9);
      ctx.bezierCurveTo(6, headY + 6, 2, headY + 6, -6, headY + 9);
      ctx.closePath();
    }
    ctx.fill();

    // Face features
    drawFace(ctx, e, headY);

    ctx.restore();
  }

  function drawFace(ctx, e, headY) {
    ctx.fillStyle = e.eye;

    if (e.dir === 'up') {
      // Eyes higher and closer
      dot(ctx, -2, headY + 2, 1);
      dot(ctx,  2, headY + 2, 1);
      // No mouth visible
    } else if (e.dir === 'down') {
      dot(ctx, -2, headY + 4, 1.2);
      dot(ctx,  2, headY + 4, 1.2);
      // small mouth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1, headY + 7, 2, 1);
    } else if (e.dir === 'left') {
      dot(ctx, -3, headY + 4, 1.2);
      // cheek line hint
      ctx.fillStyle = '#64748b';
      ctx.fillRect(1, headY + 5, 2, 1);
    } else { // right
      ctx.fillStyle = e.eye;
      dot(ctx, 3, headY + 4, 1.2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-3, headY + 5, 2, 1);
    }

    // Simple highlight on head (gives volume)
    const grd = ctx.createLinearGradient(-6, headY, 6, headY + 12);
    grd.addColorStop(0, 'rgba(255,255,255,0.10)');
    grd.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = grd;
    roundRect(ctx, -6, headY, 12, 12, 5, true);
  }

  // Helpers
  function dot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function walkSwing(frame) {
    // 0 1 2 3 -> -1 0 1 0 (gentle oscillation)
    return frame === 0 ? -1 : frame === 1 ? 0 : frame === 2 ? 1 : 0;
  }
  function swingSign(frame) {
    return frame === 0 ? -1 : frame === 2 ? 1 : 0;
  }

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

  // Exports
  return {
    createPlayer,
    updateFacing,
    updateWalk,
    updateIdle,
    drawPlayer
  };
})();
