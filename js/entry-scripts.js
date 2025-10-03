document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btn');

  // Click feedback
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('clicked');
      setTimeout(() => btn.classList.remove('clicked'), 180);
      navigate(btn.dataset.nav);
    });

    // Keyboard activation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  function navigate(href) {
    if (!href) return;
    const withVT = typeof document.startViewTransition === 'function';
    if (!withVT) {
      window.location.href = href;
      return;
    }
    document.startViewTransition(() => {
      window.location.href = href;
    });
  }
});

