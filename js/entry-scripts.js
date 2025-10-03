// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btn');

  // Add click feedback animation
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      button.classList.add('clicked');
      setTimeout(() => {
        button.classList.remove('clicked');
      }, 200);
    });
  });

  // Keyboard accessibility on Enter key and Space key
  buttons.forEach(button => {
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });
});

function goToEasyTour() {
  // Navigate to main portfolio site (portfolio.html)
  window.location.href = 'portfolio.html';
}

function goToPortfolioGame() {
  // Replace with your actual portfolio game URL when ready
  window.location.href = 'https://your-portfolio-game-link.com';
}

