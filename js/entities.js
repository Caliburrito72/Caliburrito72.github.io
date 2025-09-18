// js/entities.js
// Entities: player, simple NPC hooks, animation helpers, and drawing utilities.

const Entities = (() => {
  const TILE = 16;

  // Simple 4-direction, 4-frame walk timing
  const ANIM = {
    idleFrame: 1,
    walkFps: 8, // frames per second when walking
    frames: 4
  };

  function createPlayer({ x, y }) {
    return {
      x, y,
      dir: 'down',            // 'up' | 'down' | 'left' | 'right'
      frame: ANIM.idleFrame,  // 0..3
      t: 0,                   // time accumulator for animation
      look: { x: 0, y: 1 },   // unit look vector for camera look-ahead
      colorMain: '#e6edf3',
      colorAccent: '#ff7ae6',
      colorTrim: '#0b1220'
    };
  }

  function updateFacing(e, xAxis, yAxis) {
    // Determine facing based on input vector and set look vector
    if (Math.abs(xAxis) > Math.abs(yAxis)) {
      if (xAxis < 0) { e.dir = 'left';  e.look.x = -1; e.look.y = 0; }
      else if (xAxis > 0) { e.dir = 'right'; e.look.x = 1; e.look.y = 0; }
    } else if (Math.abs(yAxis) > 0) {
      if (yAxis < 0) { e.dir = 'up';    e.look.x = 0; e.look.y = -1; }
      else if (yAxis > 0) { e.dir = 'down';  e.look.x = 0; e.look.y = 1; }
    }
    // If no input, keep previous dir but zero look for calmer camera drift
    if (xAxis === 0 && yAxis === 0) {
      e.look.x *= 0.9; e.look.y *= 0.9;
      if (Math.hypot(e.look.x, e.look.y) < 0.1) { e.look.x = 0; e.look.y = 0; }
    }
  }

  function updateWalk(e, dt) {
    e.t += dt;
    const f = Math.floor(e.t * ANIM.walkFps) % ANIM.frames;
    e.frame = f;
  }

  function updateIdle(e, dt) {
    // Small breathing/bob effect by oscillating time, keep frame at idle
    e.t += dt * 0.5;
    e.frame = ANIM.idleFrame;
  }

  // Drawing
  function drawPlayer(ctx, e) {
    // Convert world pos to top-left sprite anchor (centered)
    const cx = Math.floor(e.x);
    const cy = Math.floor(e.y);

    // Bobbing for life
    const bob = Math.sin(performance.now() * 0.008) * 1.0;

    ctx.save();
    ctx.translate(cx, cy + bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body silhouette (anime‑inspired chibi proportions)
    // Base body
    ctx.fillStyle = e.colorMain;
    roundRect(ctx, -5, -8, 10, 14, 3, true);

    // Hair/Head accent
    ctx.fillStyle = e.colorAccent;
    if (e.dir === 'up') {
      ctx.fillRect(-4, -10, 8, 3);
      ctx.fillRect(-2, -12, 4, 2);
    } else if (e.dir === 'down') {
      ctx.fillRect(-4, -9, 8, 3);
      ctx.fillRect(-1, -6, 2, 2);
    } else if (e.dir === 'left') {
      ctx.fillRect(-5, -9, 7, 3);
      ctx.fillRect(-5, -6, 2, 2);
    } else { // right
      ctx.fillRect(-2, -9, 7, 3);
      ctx.fillRect(3, -6, 2, 2);
    }

    // Face visor/eyes line depending on facing
    ctx.fillStyle = e.colorTrim;
    if (e.dir === 'left') {
      ctx.fillRect(-5, -3, 3, 2);
    } else if (e.dir === 'right') {
      ctx.fillRect(2, -3, 3, 2);
    } else if (e.dir === 'up') {
      ctx.fillRect(-1, -7, 2, 2);
    } else {
      ctx.fillRect(-1, -1, 2, 2);
    }

    // Walk cycle leg swing (simple)
    const swing = walkSwing(e.frame);
    ctx.fillStyle = '#cfd9e6';
    ctx.fillRect(-4, 4, 3, 4);
    ctx.fillRect(1, 4, 3, 4);
    ctx.fillStyle = '#9fb0c2';
    ctx.fillRect(-4, 4 + swing, 3, 2);
    ctx.fillRect(1, 4 - swing, 3, 2);

    ctx.restore();
  }

  function walkSwing(frame) {
    // 0 1 2 3 -> -1 0 1 0 (gentle oscillation)
    return frame === 0 ? -1 : frame === 1 ? 0 : frame === 2 ? 1 : 0;
  }

  // Rounded rect helper
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
