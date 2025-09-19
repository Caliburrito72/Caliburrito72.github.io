// js/main.js
// Camera dead-zone follow (mobile-friendly), crisp pixel rendering,
// screen-space glow (no sticking), NPC dialogue triggers, organized layers, and tunable settings.

(() => {
  // Canvas + context
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false; // crisp pixels

  // Constants
  const TILE = 16;
  const SPEED = 3.5 * TILE;        // tiles/sec feel
  const DIAG = 1 / Math.sqrt(2);
  const WORLD_W = MAP.width * TILE;
  const WORLD_H = MAP.height * TILE;

  // Tunables (adjust live via __JRPG.* in console)
  const TUNE = {
    zoom: 1.30,         // camera closeness (1..2 range is safe)
    followSpeed: 6.0,   // camera easing, higher = snappier
    deadZoneW: 120,     // dead-zone width in world pixels (before zoom)
    deadZoneH: 80,      // dead-zone height in world pixels (before zoom)
    interactRadius: 14  // interact prompt radius in world pixels
  };

  // Stage letterbox + DPR setup (reliable mobile init)
  const stage = document.querySelector('.stage');
  function fitCanvas() {
    const rect = stage.getBoundingClientRect();
    const targetAR = 16 / 9;
    let w = rect.width, h = rect.height;
    if (w / h > targetAR) { w = Math.round(h * targetAR); }
    else { h = Math.round(w / targetAR); }
    Object.assign(canvas.style, {
      width: `${w}px`,
      height: `${h}px`,
      marginLeft: `${(rect.width - w)/2}px`,
      marginTop: `${(rect.height - h)/2}px`
    });
    // DPR internal buffer
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const baseW = 640, baseH = 360;
    canvas.width = Math.floor(baseW * dpr);
    canvas.height = Math.floor(baseH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // keep glow buffer in sync
    glow.width = canvas.width; glow.height = canvas.height;
  }
  addEventListener('resize', fitCanvas);
  addEventListener('orientationchange', fitCanvas);
  setTimeout(fitCanvas, 0); // defer for mobile layout timing [prevents partial init]

  // Camera with dead-zone follow
  const camera = {
    x: 0, y: 0, w: canvas.width, h: canvas.height,
    lookAhead: 12
  };

  // Input (keyboard + touch joystick)
  const keys = new Set();
  addEventListener('keydown', e => { keys.add(e.key); if (e.key === 'Escape') UI.closePanel(); });
  addEventListener('keyup', e => keys.delete(e.key));
  addEventListener('blur', () => keys.clear());

  // Player + ambient NPCs
  const player = Entities.createPlayer({ x: MAP.playerSpawn.x, y: MAP.playerSpawn.y });
  const ambient = (MAP.npcs || []).map(n => Entities.createNPC(n));

  // Dialogue target detection (NPCs)
  function nearestNPC(radiusPx) {
    let best = 1e9, found = null;
    for (const n of ambient) {
      const d = Math.hypot(player.x - n.x, player.y - n.y);
      if (d < radiusPx && d < best) { best = d; found = n; }
    }
    return found;
  }

  // Quest scaffold (unchanged)
  const QUESTS = [
    { id: 'about',   text: 'Meet Sam (About).', done: false },
    { id: 'skills',  text: 'Check the Skills Board.', done: false },
    { id: 'gallery', text: 'Visit the Art Gallery.', done: false },
    { id: 'projects',text: 'See the Projects Arcade.', done: false },
    { id: 'contact', text: 'Open the Mailbox (Contact).', done: false }
  ];
  function markQuest(id){ const q=QUESTS.find(q=>q.id===id); if(q&&!q.done){ q.done=true; UI.toast(`Progress: ${q.text} ✓`); } }
  function currentQuestText(){ const q=QUESTS.find(q=>!q.done); return q ? q.text : 'All sections explored!'; }

  // HUD: minimap + quest chip
  const mm = document.createElement('canvas');
  const MM_CSS_W = 96, MM_CSS_H = 64;
  const mmDpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  mm.width = MM_CSS_W * mmDpr; mm.height = MM_CSS_H * mmDpr;
  Object.assign(mm.style, { position:'absolute', left:'12px', top:'12px', width:`${MM_CSS_W}px`, height:`${MM_CSS_H}px`,
    border:'1px solid var(--line)', borderRadius:'10px', background:'rgba(0,0,0,.35)', zIndex:5, imageRendering:'pixelated' });
  stage?.appendChild(mm);
  const mmctx = mm.getContext('2d'); mmctx.setTransform(mmDpr,0,0,mmDpr,0,0);

  const questChip = document.createElement('div');
  Object.assign(questChip.style, { position:'absolute', left:'12px', top:`${12+MM_CSS_H+8}px`, padding:'4px 8px', fontSize:'12px', color:'#cfe6f5',
    background:'rgba(0,0,0,.35)', border:'1px solid var(--line)', borderRadius:'10px', zIndex:5, maxWidth:`${MM_CSS_W}px` });
  questChip.textContent = currentQuestText(); stage?.appendChild(questChip);

  // Mobile controls: joystick + E
  const touchState = { x:0, y:0, active:false };
  const joy = document.createElement('div'), btnE = document.createElement('button');
  Object.assign(joy.style, { position:'absolute', left:'12px', bottom:'12px', width:'90px', height:'90px', borderRadius:'50%',
    border:'1px solid var(--line)', background:'rgba(0,0,0,.25)', zIndex:6, touchAction:'none' });
  Object.assign(btnE.style, { position:'absolute', right:'12px', bottom:'24px', width:'60px', height:'60px', borderRadius:'50%',
    border:'1px solid var(--line)', background:'#0b1220', color:'#e6edf3', zIndex:6 });
  btnE.textContent='E'; stage?.appendChild(joy); stage?.appendChild(btnE);
  joy.addEventListener('touchstart', onTouch, { passive:false });
  joy.addEventListener('touchmove', onTouch, { passive:false });
  joy.addEventListener('touchend', ()=>{ touchState.x=0; touchState.y=0; touchState.active=false; }, { passive:true });
  function onTouch(e){
    const t=e.touches[0], r=joy.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    const dx=t.clientX-cx, dy=t.clientY-cy, R=r.width/2-8, m=Math.hypot(dx,dy);
    const nx=(m>R?(dx/m)*R:dx)/R, ny=(m>R?(dy/m)*R:dy)/R;
    touchState.x = Math.max(-1, Math.min(1, nx));
    touchState.y = Math.max(-1, Math.min(1, ny));
    touchState.active = true; e.preventDefault();
  }
  btnE.addEventListener('touchstart', (e)=>{ doInteract(); e.preventDefault(); }, { passive:false });

  // Glow buffer (screen-space, cleared every frame start and after composite)
  const glow = document.createElement('canvas');
  glow.width = canvas.width; glow.height = canvas.height;
  const glowCtx = glow.getContext('2d');

  // Timing
  let last = performance.now(), fpsTimer=0, frames=0;

  function init(){
    UI.setHint('WASD/Arrows · E interact · Esc close · Touch joystick + E on mobile');
    requestAnimationFrame(loop);
  }

  function loop(ts){
    const dt = Math.min(0.05, (ts - last)/1000); last = ts;
    update(dt); render(dt);
    frames++; fpsTimer += dt;
    if (fpsTimer >= 1){ const el=document.getElementById('fps'); if (el) el.textContent = `${Math.round(frames/fpsTimer)} FPS`; questChip.textContent=currentQuestText(); fpsTimer=0; frames=0; }
    requestAnimationFrame(loop);
  }

  // Update
  function update(dt){
    handleMovement(dt);
    handleInteractions();
    updateCamera(dt);
    for (const n of ambient) Entities.updateIdle(n, dt);
  }

  function handleMovement(dt){
    if (UI.isOpen()) { Entities.updateIdle(player, dt); return; }
    let x=0,y=0;
    const L=keys.has('ArrowLeft')||keys.has('a')||keys.has('A');
    const R=keys.has('ArrowRight')||keys.has('d')||keys.has('D');
    const U=keys.has('ArrowUp')||keys.has('w')||keys.has('W');
    const D=keys.has('ArrowDown')||keys.has('s')||keys.has('S');
    if (L) x--; if (R) x++; if (U) y--; if (D) y++;
    if (touchState.active){ x+=touchState.x; y+=touchState.y; }
    if (keys.has('e')||keys.has('E')||keys.has('Enter')) doInteract();

    if (x&&y){ x*=DIAG; y*=DIAG; }
    const vx=x*SPEED, vy=y*SPEED;
    Entities.updateFacing(player, x, y);

    if (x||y){
      const nx=player.x+vx*dt, ny=player.y;
      const cx=collides(nx,ny)?player.x:nx;
      const ny2=player.y+vy*dt;
      const cy=collides(cx,ny2)?player.y:ny2;
      player.x=Math.max(TILE, Math.min(WORLD_W-TILE, cx));
      player.y=Math.max(TILE, Math.min(WORLD_H-TILE, cy));
      Entities.updateWalk(player, dt);
    } else {
      Entities.updateIdle(player, dt);
    }
  }

  // Interaction (NPC dialogue or object open)
  function doInteract(){
    // NPC first
    const npc = nearestNPC(TUNE.interactRadius);
    if (npc && npc.dialogues && npc.dialogues.length){
      UI.openDialogue({ name: npc.name || 'Local', lines: npc.dialogues });
      return;
    }
    // Objects
    const obj = nearestObject(TUNE.interactRadius);
    if (obj){ UI.openObject(obj); markQuest(obj.id); }
  }

  function handleInteractions(){
    // Show prompt near either NPC or object (priority to NPC if both)
    const npc = nearestNPC(TUNE.interactRadius);
    if (npc){ UI.showPromptAt({ x: npc.x/TILE, y: npc.y/TILE, type: 'npc' }, 'E'); return; }
    const obj = nearestObject(TUNE.interactRadius);
    if (obj) UI.showPromptAt(obj, 'E'); else UI.hidePrompt();
  }

  function nearestObject(r){
    let best = 1e9, chosen = null;
    for (const o of MAP.objects){
      const ox=o.x*TILE+TILE/2, oy=o.y*TILE+TILE/2;
      const d=Math.hypot(player.x-ox, player.y-oy);
      if (d<r && d<best){ best=d; chosen=o; }
    }
    return chosen;
  }

  // Collisions
  function collides(px,py){
    const h=6;
    return isSolid(px-h,py-h)||isSolid(px+h,py-h)||isSolid(px-h,py+h)||isSolid(px+h,py+h);
  }
  function isSolid(px,py){
    const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
    if (tx<0||ty<0||tx>=MAP.width||ty>=MAP.height) return true;
    return MAP.solids[ty][tx]===1;
  }

  // Camera dead-zone follow
  function updateCamera(dt){
    // derive view size from base canvas internal resolution and zoom
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const baseW = 640, baseH = 360;
    const viewW = (baseW * dpr) / TUNE.zoom;
    const viewH = (baseH * dpr) / TUNE.zoom;

    // dead-zone box centered on current camera target
    const dzW = TUNE.deadZoneW, dzH = TUNE.deadZoneH;
    const dzX = camera.x + (viewW - dzW) / 2;
    const dzY = camera.y + (viewH - dzH) / 2;

    let targetX = camera.x, targetY = camera.y;

    // push camera only when player exits the dead-zone
    if (player.x < dzX)          targetX = player.x - (viewW - dzW)/2;
    else if (player.x > dzX+dzW) targetX = player.x - (viewW + dzW)/2;

    if (player.y < dzY)          targetY = player.y - (viewH - dzH)/2;
    else if (player.y > dzY+dzH) targetY = player.y - (viewH + dzH)/2;

    // ease toward target
    camera.x += (targetX - camera.x) * Math.min(1, dt * TUNE.followSpeed);
    camera.y += (targetY - camera.y) * Math.min(1, dt * TUNE.followSpeed);

    camera.w = viewW; camera.h = viewH;
    camera.x = Math.max(0, Math.min(WORLD_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - camera.h, camera.y));
  }

  // Render
  function render(dt){
    // Background
    const g=ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#0a0f24'); g.addColorStop(1,'#0b0d1a');
    ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Always clear glow at frame start to avoid any residual halos
    glowCtx.clearRect(0,0,glow.width,glow.height);

    // World with zoom then camera translate
    ctx.save();
    ctx.scale(TUNE.zoom, TUNE.zoom);
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    drawParallax();
    drawGround();
    drawWater();
    drawProps();
    drawObjects();
    for (const n of ambient) Entities.drawNPC(ctx, n);
    Entities.drawPlayer(ctx, player);

    ctx.restore();

    // Composite glow additively and clear again
    compositeGlow();
    drawMinimap();
  }

  // Visual layers
  function drawParallax(){
    const t=performance.now()*0.02;
    drawHills('#0b1634','#15214a',36,1.4,t*0.05);
    drawHills('#12204a','#1a2c62',72,1.8,t*0.07);
    drawHills('#1a2b60','#213874',108,2.2,t*0.09);
    drawFog();
  }
  function drawHills(c1,c2,yOff,amp,t){
    ctx.beginPath();
    const baseY=MAP.height*TILE-(90+yOff);
    ctx.moveTo(0, MAP.height*TILE);
    for(let x=0;x<=MAP.width*TILE;x+=8){
      const y=baseY + Math.sin((x+t)*0.02)*(amp*12);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(MAP.width*TILE, MAP.height*TILE);
    ctx.closePath();
    const g=ctx.createLinearGradient(0,baseY,0,MAP.height*TILE);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle=g; ctx.fill();
  }
  function drawFog(){
    const fogTop=(MAP.height*TILE)*0.5;
    const grd=ctx.createLinearGradient(0,fogTop,0,MAP.height*TILE);
    grd.addColorStop(0,'rgba(173,216,230,0.04)');
    grd.addColorStop(1,'rgba(173,216,230,0.16)');
    ctx.fillStyle=grd; ctx.fillRect(0,0,MAP.width*TILE,MAP.height*TILE);
  }

  function drawGround(){
    for(let ty=0; ty<MAP.height; ty++){
      for(let tx=0; tx<MAP.width; tx++){
        const x=tx*TILE, y=ty*TILE;
        const solid = MAP.solids[ty][tx]===1;
        if (!solid) {
          const n=(Math.sin(tx*12.9898+ty*78.233)*43758.5453)%1;
          const g = 140 + Math.floor(n*25), b = 70 + Math.floor(n*20);
          ctx.fillStyle=`rgb(${20},${g},${b})`;
          ctx.fillRect(x,y,TILE,TILE);
          ctx.fillStyle='rgba(255,255,255,0.035)'; ctx.fillRect(x,y,TILE,2);
          ctx.fillStyle='rgba(0,0,0,0.035)'; ctx.fillRect(x,y+TILE-2,TILE,2);
        } else {
          ctx.fillStyle='#252f44'; ctx.fillRect(x,y,TILE,TILE);
          ctx.fillStyle='#131a2b'; ctx.fillRect(x+3,y+3,TILE-6,TILE-6);
        }
      }
    }
  }

  function drawWater(){
    if (!MAP.water || !MAP.water.rects) return;
    const t = performance.now()*0.0015;
    for (const r of MAP.water.rects){
      const x0=r.x0*TILE, y0=r.y0*TILE, x1=r.x1*TILE, y1=r.y1*TILE, w=x1-x0, h=y1-y0;
      const g=ctx.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'#0f4364'); g.addColorStop(1,'#0b2a46');
      ctx.fillStyle=g; ctx.fillRect(x0,y0,w,h);
      ctx.globalAlpha=0.12; ctx.fillStyle='#cfe6f5';
      for(let y=y0;y<y1;y+=4){ const ph=Math.sin((y*0.08)+t*2.5)*2; ctx.fillRect(x0, y+ph, w, 1); }
      ctx.globalAlpha=0.10; ctx.fillStyle='#9adfff';
      for(let y=y0+2;y<y1;y+=6){ const ph=Math.sin((y*0.06)-t*3.0)*3; ctx.fillRect(x0+4+ph, y, w-8, 1); }
      ctx.globalAlpha=1.0;
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x0, y0, w, 2); ctx.fillRect(x0, y1-2, w, 2);
    }
  }

  function drawProps(){
    if(!MAP.props) return;
    for(const p of MAP.props){
      const x=p.x*TILE + TILE/2, y=p.y*TILE + TILE/2;
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y+6, 6, 3, 0, 0, Math.PI*2); ctx.fill();

      if (p.type==='lamp'){
        ctx.fillStyle='#4b5a73'; ctx.fillRect(x-1, y-10, 2,10);
        ctx.fillStyle='#6ee7ff'; ctx.fillRect(x-3, y-14, 6,4);
        ctx.fillStyle='rgba(110,231,255,0.18)'; ctx.beginPath(); ctx.arc(x, y-12, 8, 0, Math.PI*2); ctx.fill();

        // screen-space glow with zoom
        const sx = Math.floor((x - camera.x) * TUNE.zoom);
        const sy = Math.floor((y - 12 - camera.y) * TUNE.zoom);
        const pulse=7 + Math.sin(performance.now()*0.006)*2;
        glowCtx.fillStyle='rgba(110,231,255,0.28)'; glowCtx.beginPath(); glowCtx.arc(sx, sy, pulse*TUNE.zoom, 0, Math.PI*2); glowCtx.fill();

      } else if (p.type==='sign'){
        ctx.fillStyle='#8aa1c0'; ctx.fillRect(x-5, y-6, 10, 6);
        ctx.fillStyle='#0b1220'; ctx.fillRect(x-1, y-8, 2, 2);

      } else if (p.type==='crate'){
        ctx.fillStyle='#4a3b2a'; ctx.fillRect(x-6, y-6, 12, 12);
        ctx.strokeStyle='#2e241a'; ctx.strokeRect(x-6, y-6, 12, 12);

      } else if (p.type==='plant'){
        ctx.fillStyle='#3aa26b'; ctx.beginPath(); ctx.arc(x-2, y, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+2, y, 3, 0, Math.PI*2); ctx.fill();

      } else if (p.type==='banner'){
        const color=p.color||'#ff7ae6';
        ctx.fillStyle=color; ctx.fillRect(x-1, y-10, 2, 10);
        ctx.fillRect(x-6, y-10, 12, 4);

      } else if (p.type==='bench'){
        ctx.fillStyle='#5a4b3a'; ctx.fillRect(x-8, y-3, 16, 3);
        ctx.fillStyle='#3a2f24'; ctx.fillRect(x-7, y, 2, 3); ctx.fillRect(x+5, y, 2, 3);
      }
    }
  }

  function drawObjects(){
    for (const obj of MAP.objects){
      const cx=obj.x*TILE + TILE/2, cy=obj.y*TILE + TILE/2;
      // ground halo (world)
      ctx.fillStyle='rgba(110,231,255,0.12)'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();

      // icon
      drawObjectIcon(obj, cx, cy);

      // screen-space glow aligned with camera and zoom
      const sx = Math.floor((cx - camera.x) * TUNE.zoom);
      const sy = Math.floor((cy - camera.y) * TUNE.zoom);
      const pulse = 10 + Math.sin(performance.now() * 0.005) * 2;
      glowCtx.fillStyle='rgba(110,231,255,0.30)'; glowCtx.beginPath(); glowCtx.arc(sx, sy, pulse*TUNE.zoom, 0, Math.PI*2); glowCtx.fill();
    }
  }

  function drawObjectIcon(obj, cx, cy){
    ctx.save(); ctx.translate(cx, cy);
    if (obj.type==='gallery'){ ctx.fillStyle='#6ee7ff'; ctx.fillRect(-6,-5,12,10); ctx.fillStyle='#ff7ae6'; ctx.fillRect(-3,-1,6,3); }
    else if (obj.type==='projects'){ ctx.fillStyle='#ff7ae6'; ctx.beginPath(); ctx.moveTo(-6,-5); ctx.lineTo(6,0); ctx.lineTo(-6,5); ctx.closePath(); ctx.fill(); }
    else if (obj.type==='skills'){ ctx.fillStyle='#6ee7ff'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#0b1220'; ctx.fillRect(-1,-3,2,6); }
    else if (obj.type==='contact'){ ctx.fillStyle='#cfe6f5'; ctx.fillRect(-6,-4,12,8); ctx.strokeStyle='#0b1220'; ctx.strokeRect(-6,-4,12,8); }
    else if (obj.type==='about'){ ctx.fillStyle='#b9c8d8'; ctx.beginPath(); ctx.arc(0,-2,4,0,Math.PI*2); ctx.fill(); ctx.fillRect(-3,2,6,4); }
    ctx.restore();
  }

  // Composite glow (additive), then clear buffer for next frame
  function compositeGlow(){
    const temp=document.createElement('canvas');
    temp.width=Math.floor(glow.width/2); temp.height=Math.floor(glow.height/2);
    const tctx=temp.getContext('2d'); tctx.drawImage(glow,0,0,temp.width,temp.height);
    glowCtx.clearRect(0,0,glow.width,glow.height);
    glowCtx.globalAlpha=0.9; glowCtx.drawImage(temp,0,0,glow.width,glow.height); glowCtx.globalAlpha=1.0;

    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.drawImage(glow,0,0,canvas.width,canvas.height); ctx.restore();
    glowCtx.clearRect(0,0,glow.width,glow.height);
  }

  // Minimap
  function drawMinimap(){
    const MM_W=MM_CSS_W, MM_H=MM_CSS_H, scaleX=MM_W/WORLD_W, scaleY=MM_H/WORLD_H;
    mmctx.clearRect(0,0,MM_W,MM_H);
    mmctx.fillStyle='rgba(8,12,22,0.85)'; mmctx.fillRect(0,0,MM_W,MM_H);

    // solids
    mmctx.fillStyle='rgba(27,36,51,0.95)';
    for (let y=0;y<MAP.height;y++){
      for (let x=0;x<MAP.width;x++){
        if (MAP.solids[y][x]===1){
          mmctx.fillRect(Math.floor(x*TILE*scaleX), Math.floor(y*TILE*scaleY), Math.ceil(TILE*scaleX), Math.ceil(TILE*scaleY));
        }
      }
    }

    // water
    if (MAP.water && MAP.water.rects){
      mmctx.fillStyle='rgba(110,231,255,0.5)';
      for (const r of MAP.water.rects){
        mmctx.fillRect(Math.floor(r.x0*TILE*scaleX), Math.floor(r.y0*TILE*scaleY),
          Math.ceil((r.x1-r.x0)*TILE*scaleX), Math.ceil((r.y1-r.y0)*TILE*scaleY));
      }
    }

    // objects
    mmctx.fillStyle='#6ee7ff';
    for (const obj of MAP.objects){
      const ox=obj.x*TILE+TILE/2, oy=obj.y*TILE+TILE/2;
      mmctx.fillRect(Math.floor(ox*scaleX)-1, Math.floor(oy*scaleY)-1, 2, 2);
    }

    // player
    mmctx.fillStyle='#ff7ae6';
    mmctx.fillRect(Math.floor(player.x*scaleX)-2, Math.floor(player.y*scaleY)-2, 4, 4);

    // viewport
    mmctx.strokeStyle='rgba(207,230,245,0.85)'; mmctx.lineWidth=1;
    mmctx.strokeRect(Math.floor(camera.x*scaleX), Math.floor(camera.y*scaleY),
                     Math.floor(camera.w*scaleX), Math.floor(camera.h*scaleY));
  }

  // Expose console tuning
  window.__JRPG = {
    player, camera, MAP, UI, Entities,
    setZoom(z){ TUNE.zoom = Math.max(1, Math.min(2, z)); },
    setFollowSpeed(s){ TUNE.followSpeed = Math.max(1, Math.min(12, s)); },
    setDeadZone(w,h){ TUNE.deadZoneW = Math.max(40,w|0); TUNE.deadZoneH = Math.max(30,h|0); },
    fit: fitCanvas
  };

  init();
})();
