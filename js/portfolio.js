/* =========================
   Utilities
   ========================= */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* =========================
   Loading overlay
   ========================= */
window.addEventListener('DOMContentLoaded', () => {
  const loader = $('#app-loader');
  // Small delay to allow CSS/Fonts to settle for a classy reveal
  setTimeout(() => {
    if (loader) {
      loader.classList.add('hidden');
      // Stagger a reveal class on first visible blocks
      $$('.reveal').slice(0, 2).forEach(el => el.classList.add('revealed'));
    }
  }, 400);
});

/* =========================
   Smooth in-page scroll
   ========================= */
$$('a.scrollto').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = $(href);
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* =========================
   Intersection Observer reveals
   ========================= */
(() => {
  const targets = $$('.reveal');
  if (!('IntersectionObserver' in window) || targets.length === 0) {
    // Fallback: reveal all if IO not supported
    targets.forEach(el => el.classList.add('revealed'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Optional: unobserve for performance once revealed
        obs.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  targets.forEach(t => io.observe(t));
})();
 
/* =========================
   Accessible Modal / Lightbox
   ========================= */
const Lightbox = (() => {
  const root = $('#lightbox');
  if (!root) return null;

  const backdrop = $('.lightbox-backdrop', root);
  const dialog = $('.lightbox-dialog', root);
  const body = $('.lightbox-body', root);
  const btnClose = $('.lightbox-close', root);

  let lastActive = null;

  // Find focusable elements for focus trap
  const focusablesSelector = [
    'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object',
    'embed', '[contenteditable]', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusables() {
    return Array.from(dialog.querySelectorAll(focusablesSelector))
      .filter(el => el.offsetParent !== null || el === btnClose);
  }

  function open(contentNode) {
    lastActive = document.activeElement;

    // Inject content
    body.innerHTML = '';
    body.appendChild(contentNode);

    root.hidden = false;
    // Trigger CSS open animations
    requestAnimationFrame(() => {
      root.classList.add('open');
    });

    // Trap focus
    const focusables = getFocusables();
    const first = focusables[0] || btnClose;
    first && first.focus();

    root.addEventListener('keydown', onKeydown);
    root.addEventListener('click', onClickOutside);
  }

  function close() {
    root.classList.remove('open');
    // After transition, hide and cleanup content
    setTimeout(() => {
      root.hidden = true;
      body.innerHTML = '';
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('click', onClickOutside);
      // Return focus to the last trigger
      lastActive && lastActive.focus();
    }, 250);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      // Simple focus trap
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onClickOutside(e) {
    if (e.target.matches('[data-close]')) {
      e.preventDefault();
      close();
    }
  }

  // Public API
  return { open, close };
})();

/* Bind gallery cards */
(() => {
  const cards = $$('.gallery .card');
  cards.forEach(card => {
    const type = card.getAttribute('data-modal');
    const src = card.getAttribute('data-src');
    const alt = card.getAttribute('data-alt') || '';

    function handleOpen() {
      if (!Lightbox || !src) return;
      let node;
      if (type === 'video') {
        node = document.createElement('video');
        node.controls = true;
        node.playsInline = true;
        node.src = src;
      } else {
        node = document.createElement('img');
        node.src = src;
        node.alt = alt;
        node.loading = 'eager';
        node.decoding = 'async';
        node.style.maxHeight = '82vh';
        node.style.objectFit = 'contain';
      }
      Lightbox.open(node);
    }

    card.addEventListener('click', handleOpen);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    });
  });
})();

/* =========================
   Optional: View Transition API for navigation
   ========================= */
function withViewTransition(navigate) {
  const supported = typeof document.startViewTransition === 'function';
  if (!supported) { navigate(); return; }
  document.startViewTransition(() => {
    navigate();
  });
}

$$('a[data-vt]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href) return;
    e.preventDefault();
    withViewTransition(() => {
      window.location.href = href;
    });
  });
});
