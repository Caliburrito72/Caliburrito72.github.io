// js/ui.js
// Overlays, object panels, anchored prompts, Dialogue UI, and robust Gallery rendering.

const UI = (() => {
  let root;          // #ui-root
  let overlay;       // active overlay
  let promptEl;      // floating "Press E"
  let hintEl;        // bottom-left hint chip
  let toastEl;       // transient toast

  // Ensure a root container exists
  function ensureRoot() {
    if (!root) root = document.getElementById('ui-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ui-root';
      root.className = 'ui-root';
      document.body.appendChild(root);
    }
  }

  function setHint(text) {
    hintEl = hintEl || document.getElementById('hint');
    if (hintEl) hintEl.textContent = text;
  }

  function toast(text, ms = 1800) {
    ensureRoot();
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.position = 'fixed';
      toastEl.style.left = '50%';
      toastEl.style.bottom = '70px';
      toastEl.style.transform = 'translateX(-50%)';
      toastEl.style.padding = '8px 12px';
      toastEl.style.border = '1px solid var(--line)';
      toastEl.style.borderRadius = '10px';
      toastEl.style.background = 'rgba(0,0,0,.55)';
      toastEl.style.color = '#cfe6f5';
      toastEl.style.pointerEvents = 'none';
      toastEl.style.zIndex = 50;
      root.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.display = 'none'; }, ms);
  }

  function isOpen() { return !!overlay; }
  function closePanel() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      window.removeEventListener('keydown', keyToAdvance);
    }
  }

  // "Press E" prompt anchored to object using camera mapping
  function showPromptAt(obj, key = 'E') {
    ensureRoot();
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.className = 'prompt';
      promptEl.style.position = 'fixed';
      root.appendChild(promptEl);
    }
    promptEl.textContent = `Press ${key}`;

    const canvas = document.getElementById('game');
    if (!canvas || !window.__JRPG) { promptEl.style.display = 'none'; return; }
    const rect = canvas.getBoundingClientRect();
    const { camera } = window.__JRPG;

    const TILE = 16;
    // obj is world tile coords for interactables (x,y as tiles). For NPC prompt we pass a faux object with tile coords.
    const wx = obj.x * TILE + TILE / 2;
    const wy = obj.y * TILE + TILE / 2;

    // Use current zoom to place within canvas rect correctly
    const zoom = window.__JRPG?.setZoom ? window.__JRPG.camera.w && (canvas.width / window.__JRPG.camera.w) : 1;

    // Camera-space to screen coordinates
    const sx = Math.round((wx - camera.x) * zoom);
    const sy = Math.round((wy - camera.y) * zoom);

    const px = rect.left + (sx * rect.width / canvas.width);
    const py = rect.top + (sy * rect.height / canvas.height) - 18;

    if (px < rect.left || px > rect.right || py < rect.top || py > rect.bottom) {
      promptEl.style.display = 'none';
    } else {
      promptEl.style.left = `${px}px`;
      promptEl.style.top = `${py}px`;
      promptEl.style.display = 'block';
    }
  }
  function hidePrompt(){ if (promptEl) promptEl.style.display = 'none'; }

  // Generic overlay builder
  function makeOverlay() {
    ensureRoot();
    closePanel();
    overlay = document.createElement('div');
    overlay.className = 'ui-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
    const panel = document.createElement('div'); panel.className = 'panel';
    overlay.appendChild(panel);
    root.appendChild(overlay);
    return panel;
  }

  // Object panels
  function openObject(obj) {
    if (!obj || !obj.type) return;
    if (obj.type === 'about') return openAbout(obj);
    if (obj.type === 'skills') return openSkills(obj);
    if (obj.type === 'gallery') return openGallery(obj);
    if (obj.type === 'projects') return openProjects(obj);
    if (obj.type === 'contact') return openContact(obj);
  }

  function openAbout(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'About');
    const box = row(p, 'dialog');
    const portrait = div(box, 'portrait');
    const body = div(box, 'dialog-body');
    div(body, 'nameplate', 'Sam');
    div(body, 'dialog-text', obj.data?.text || 'No profile yet.');
    const tags = row(body, 'row');
    (obj.data?.tags || []).forEach(t => span(tags, 'tag', t));
    actions(p, ['Close'], [closePanel]);
  }

  function openSkills(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'Skills');
    const list = row(p, 'row');
    (obj.data?.skills || []).forEach(s => {
      const card = div(list, 'card');
      const title = div(card, '', `${s.name} — ${s.level}`);
      title.style.fontWeight = '600';
      const tags = row(card, 'row');
      (s.tags || []).forEach(t => span(tags, 'tag', t));
    });
    actions(p, ['Close'], [closePanel]);
  }

  // Robust Gallery (never blank): thumbnails + caption + onerror fallback
  function openGallery(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'Gallery');

    const items = obj.data?.items || [];
    if (!items.length) {
      const note = document.createElement('p');
      note.textContent = 'No gallery items yet. Check back soon!';
      p.appendChild(note);
      actions(p, ['Close'], [closePanel]);
      return;
    }

    items.forEach(item => {
      const card = div(p, 'card');
      const img = document.createElement('img');
      img.src = item.img || '';
      img.alt = item.title || 'Artwork';

      // fallback on error (local placeholder)
      img.onerror = () => {
        img.onerror = null;
        img.src = 'assets/ui/placeholder.jpg';
      };

      img.style.width = '100%';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid var(--line)';

      const caption = document.createElement('p');
      caption.textContent = `${item.title || 'Untitled'} — ${item.caption || ''}`;

      card.appendChild(img);
      card.appendChild(caption);
    });

    actions(p, ['Close'], [closePanel]);
  }

  function openProjects(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'Projects');
    (obj.data?.items || []).forEach(item => {
      const card = div(p, 'card');
      const title = div(card, '', item.title || 'Project'); title.style.fontWeight = '600';
      const desc = document.createElement('p'); desc.textContent = item.desc || ''; card.appendChild(desc);
      if (item.link) {
        const a = document.createElement('a'); a.href = item.link; a.target = '_blank'; a.rel='noopener'; a.className='tag'; a.textContent='Open';
        card.appendChild(a);
      }
    });
    actions(p, ['Close'], [closePanel]);
  }

  function openContact(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'Contact');
    const email = document.createElement('p'); email.textContent = `Email: ${obj.data?.email || ''}`; p.appendChild(email);
    const links = row(p, 'row');
    (obj.data?.links || []).forEach(l => {
      const a = document.createElement('a'); a.href = l.url; a.target='_blank'; a.rel='noopener'; a.className='tag'; a.textContent=l.label;
      links.appendChild(a);
    });
    actions(p, ['Close'], [closePanel]);
  }

  // Dialogue overlay (speaker name + line-by-line with Next/Close)
  function openDialogue({ name = 'Local', lines = [] }) {
    const p = makeOverlay();
    addHeader(p, 'Conversation');

    const box = row(p, 'dialog');
    const portrait = div(box, 'portrait'); // can be styled or replaced later with avatar canvas
    const body = div(box, 'dialog-body');

    const nameplate = div(body, 'nameplate', name);
    const lineEl = div(body, 'dialog-text', '');

    let idx = 0;
    function renderLine() {
      if (idx >= lines.length) { closePanel(); return; }
      typeText(lineEl, lines[idx], 18); // 18ms per char
      idx++;
      updateButtons();
    }

    function typeText(el, text, ms) {
      el.textContent = '';
      let i = 0;
      clearInterval(el._t);
      el._t = setInterval(() => {
        el.textContent = text.slice(0, i++);
        if (i > text.length) { clearInterval(el._t); }
      }, ms);
    }

    const btnRow = row(body, 'row');
    const nextBtn = document.createElement('button');
    const closeBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    closeBtn.textContent = 'Close';
    btnRow.appendChild(nextBtn); btnRow.appendChild(closeBtn);

    function updateButtons() {
      nextBtn.style.display = idx < lines.length ? 'inline-block' : 'none';
    }

    function keyToAdvance(e) {
      if (!overlay) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); renderLine(); }
      if (e.key === 'Escape') closePanel();
    }

    nextBtn.addEventListener('click', renderLine);
    closeBtn.addEventListener('click', closePanel);
    window.addEventListener('keydown', keyToAdvance);

    renderLine();
  }

  // DOM helpers
  function addHeader(parent, text) { const h = document.createElement('h3'); h.textContent = text; parent.appendChild(h); }
  function row(parent, cls) { const d = document.createElement('div'); d.className = cls; parent.appendChild(d); return d; }
  function div(parent, cls, text) { const d = document.createElement('div'); if (cls) d.className = cls; if (text) d.textContent = text; parent.appendChild(d); return d; }
  function span(parent, cls, text) { const s = document.createElement('span'); s.className = cls; s.textContent = text; parent.appendChild(s); return s; }
  function actions(parent, labels, handlers) {
    const r = row(parent, 'row');
    labels.forEach((label, i) => {
      const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', handlers[i] || (()=>{})); r.appendChild(b);
    });
  }

  return { setHint, toast, isOpen, closePanel, showPromptAt, hidePrompt, openObject, openDialogue };
})();
