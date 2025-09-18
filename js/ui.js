// js/ui.js (rewritten)
// UI system: overlays, panels, prompts anchored to world objects, quest/toast hooks.

const UI = (() => {
  let root;          // #ui-root
  let overlay;       // current overlay element
  let promptEl;      // floating interaction prompt
  let hintEl;        // bottom-left hint in DOM
  let toastEl;       // transient message
  let questEl;       // quest tracker element (text-only for now)

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

  function isOpen() {
    return !!overlay;
  }

  function closePanel() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Draw prompt above object using camera to world->screen mapping
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
    // world coordinates of the object center
    const wx = obj.x * TILE + TILE / 2;
    const wy = obj.y * TILE + TILE / 2;

    // screen coordinates relative to canvas
    const sx = Math.round(wx - camera.x);
    const sy = Math.round(wy - camera.y);

    // place prompt slightly above the object, within canvas box
    const px = rect.left + (sx * rect.width / canvas.width);
    const py = rect.top + (sy * rect.height / canvas.height) - 18;

    // show only if inside viewport
    if (px < rect.left || px > rect.right || py < rect.top || py > rect.bottom) {
      promptEl.style.display = 'none';
    } else {
      promptEl.style.left = `${px}px`;
      promptEl.style.top = `${py}px`;
      promptEl.style.display = 'block';
    }
  }

  function hidePrompt() {
    if (promptEl) promptEl.style.display = 'none';
  }

  function openObject(obj) {
    if (!obj || !obj.type) return;
    if (obj.type === 'about') return openAbout(obj);
    if (obj.type === 'skills') return openSkills(obj);
    if (obj.type === 'gallery') return openGallery(obj);
    if (obj.type === 'projects') return openProjects(obj);
    if (obj.type === 'contact') return openContact(obj);
  }

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

  // Panels
  function openAbout(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'About');
    const box = row(p, 'dialog');
    const portrait = div(box, 'portrait');
    const body = div(box, 'dialog-body');
    div(body, 'nameplate', 'Sam');
    div(body, 'dialog-text', obj.data?.text || '');
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

  function openGallery(obj) {
    const p = makeOverlay();
    addHeader(p, obj.data?.title || 'Gallery');
    (obj.data?.items || []).forEach(item => {
      const card = div(p, 'card');
      const img = document.createElement('img');
      img.src = item.img || '';
      img.alt = item.title || 'Artwork';
      img.style.width = '100%';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid var(--line)';
      const caption = document.createElement('p');
      caption.textContent = `${item.title || ''} — ${item.caption || ''}`;
      card.appendChild(img); card.appendChild(caption);
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
        const a = document.createElement('a'); a.href = item.link; a.target = '_blank'; a.rel='noopener';
        a.className='tag'; a.textContent='Open'; card.appendChild(a);
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

  // Helpers
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

  return {
    setHint,
    toast,
    isOpen,
    closePanel,
    showPromptAt,
    hidePrompt,
    openObject
  };
})();
