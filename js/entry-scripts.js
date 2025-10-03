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

    // Keyboard accessibility on Enter key
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
    // Navigate to main portfolio site (index.html)
    window.location.href = 'index.html';
}

function goToPortfolioGame() {
    // Placeholder URL for the portfolio game - replace with actual link later
    window.location.href = 'https://your-portfolio-game-link.com';
}
