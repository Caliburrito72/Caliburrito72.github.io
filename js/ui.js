// js/ui.js
// UI system: overlays, panels, dialog, prompts, and helpers for game-object interactions.

const UI = (() => {
  let root;          // #ui-root
  let overlay;       // current overlay element
  let promptEl;      // floating interaction prompt
  let hintEl;        // bottom-left hint in index.html

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

  function isOpen() {
    return !!overlay;
  }

  function closePanel() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function showPromptAt(obj, key = 'E') {
    ensureRoot();
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.className = 'prompt';
      promptEl.style.position = 'absolute';
      root.appendChild(promptEl);
    }
    promptEl.textContent = `Press ${key}`;
    // Position near canvas center projection of world coords is managed by CSS absolute overlay;
    // here we approximate by centering relative to the canvas if available.
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = rect.left + rect.width / 2;   // simple central hint; advanced: compute screen pos from camera
    const py = rect.top + rect.height * 0.35;
    promptEl.style.left = `${px}px`;
    promptEl.style.top = `${py}px`;
    promptEl.style.display = 'block';
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePanel();
    });
    const panel = document.createElement('div');
    panel.className = 'panel';
    overlay.appendChild(panel);
    root.appendChild(overlay);
    return panel;
  }

  // Panels
  function openAbout(obj) {
    const p = makeOverlay();
    const h = document.createElement('h3');
    h.textContent = obj.data?.title || 'About';
    p.appendChild(h);

    const box = document.createElement('div');
    box.className = 'dialog';
    const portrait = document.createElement('div');
    portrait.className = 'portrait';
    box.appendChild(portrait);

    const body = document.createElement('div');
    body.className = 'dialog-body';
    const name = document.createElement('div');
    name.className = 'nameplate';
    name.textContent = 'Sam';
    const text = document.createElement('div');
    text.className = 'dialog-text';
    text.textContent = obj.data?.text || '';
    body.appendChild(name);
    body.appendChild(text);

    // tags
    const tags = document.createElement('div');
    tags.className = 'row';
    (obj.data?.tags || []).forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tags.appendChild(span);
    });
    body.appendChild(tags);

    box.appendChild(body);
    p.appendChild(box);

    const row = document.createElement('div');
    row.className = 'row';
    const closeBtn = button('Close', closePanel);
    row.appendChild(closeBtn);
    p.appendChild(row);
  }

  function openSkills(obj) {
    const p = makeOverlay();
    const h = document.createElement('h3');
    h.textContent = obj.data?.title || 'Skills';
    p.appendChild(h);

    const list = document.createElement('div');
    list.className = 'row';
    (obj.data?.skills || []).forEach(skill => {
      const card = document.createElement('div');
      card.className = 'card';
      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = `${skill.name} — ${skill.level}`;
      const tags = document.createElement('div');
      tags.className = 'row';
      (skill.tags || []).forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        tags.appendChild(span);
      });
      card.appendChild(title);
      card.appendChild(tags);
      list.appendChild(card);
    });
    p.appendChild(list);

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(button('Close', closePanel));
    p.appendChild(row);
  }

  function openGallery(obj) {
    const p = makeOverlay();
    const h = document.createElement('h3');
    h.textContent = obj.data?.title || 'Gallery';
    p.appendChild(h);

    (obj.data?.items || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = item.img || '';
      img.alt = item.title || 'Artwork';
      img.style.width = '100%';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid var(--line)';
      const caption = document.createElement('p');
      caption.textContent = `${item.title || ''} — ${item.caption || ''}`;
      card.appendChild(img);
      card.appendChild(caption);
      p.appendChild(card);
    });

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(button('Close', closePanel));
    p.appendChild(row);
  }

  function openProjects(obj) {
    const p = makeOverlay();
    const h = document.createElement('h3');
    h.textContent = obj.data?.title || 'Projects';
    p.appendChild(h);

    (obj.data?.items || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = item.title || 'Project';
      const desc = document.createElement('p');
      desc.textContent = item.desc || '';
      card.appendChild(title);
      card.appendChild(desc);
      if (item.link) {
        const a = document.createElement('a');
        a.href = item.link;
        a.textContent = 'Open';
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'tag';
        card.appendChild(a);
      }
      p.appendChild(card);
    });

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(button('Close', closePanel));
    p.appendChild(row);
  }

  function openContact(obj) {
    const p = makeOverlay();
    const h = document.createElement('h3');
    h.textContent = obj.data?.title || 'Contact';
    p.appendChild(h);

    const email = document.createElement('p');
    email.textContent = `Email: ${obj.data?.email || ''}`;
    p.appendChild(email);

    const links = document.createElement('div');
    links.className = 'row';
    (obj.data?.links || []).forEach(l => {
      const a = document.createElement('a');
      a.href = l.url;
      a.textContent = l.label;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'tag';
      links.appendChild(a);
    });
    p.appendChild(links);

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(button('Close', closePanel));
    p.appendChild(row);
  }

  // Helpers
  function button(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  return {
    setHint,
    isOpen,
    closePanel,
    showPromptAt,
    hidePrompt,
    openObject
  };
})();
