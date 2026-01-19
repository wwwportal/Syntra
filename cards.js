// Simple Card Tilt Effect

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.tarot-card:not(.placeholder)');

    cards.forEach(card => {
        let isAnimating = false;

        card.addEventListener('mousemove', (e) => {
            // Don't apply tilt if card is animating
            if (isAnimating) return;

            const rect = card.getBoundingClientRect();

            // Get mouse position relative to card center (-50 to 50)
            const x = ((e.clientX - rect.left) / rect.width) * 100 - 50;
            const y = ((e.clientY - rect.top) / rect.height) * 100 - 50;

            // Calculate tilt rotation (subtle effect)
            const rotateX = x / 3.5;
            const rotateY = -y / 3.5;

            // Update CSS variables
            card.style.setProperty('--rotate-x', `${rotateX}deg`);
            card.style.setProperty('--rotate-y', `${rotateY}deg`);
        });

        card.addEventListener('mouseleave', () => {
            // Don't reset tilt if card is animating
            if (isAnimating) return;

            // Reset tilt
            card.style.setProperty('--rotate-x', '0deg');
            card.style.setProperty('--rotate-y', '0deg');
        });

        // Click animation - card flies to center, spins and zooms
        const cardLink = card.querySelector('.card-rotator');
        cardLink.addEventListener('click', (e) => {
            e.preventDefault();
            const href = cardLink.href;

            // Set animating flag and reset tilt immediately
            isAnimating = true;
            card.style.setProperty('--rotate-x', '0deg');
            card.style.setProperty('--rotate-y', '0deg');

            // Get card's current position
            const rect = card.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;

            // Calculate translation to viewport center
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;
            const translateX = viewportCenterX - cardCenterX;
            const translateY = viewportCenterY - cardCenterY;

            // Prevent page scrolling/resizing during animation
            document.body.style.overflow = 'hidden';

            // Create animation timeline
            const tl = gsap.timeline({
                onComplete: () => {
                    window.location.href = href;
                }
            });

            // Disable hover effects during animation
            card.style.pointerEvents = 'none';

            // Animate card to center, lift it forward
            tl.to(card, {
                x: translateX,
                y: translateY,
                scale: 1.2,
                z: 200,
                duration: 0.5,
                ease: "power2.inOut"
            }, 0);

            // Spin and zoom in - two full rotations
            tl.to(cardLink, {
                rotateY: 720,
                scale: 3,
                duration: 1.2,
                ease: "linear"
            }, 0);

            // Fade out everything else - starts immediately
            // Get the current theme color from CSS variable
            const fadeColor = getComputedStyle(document.documentElement).getPropertyValue('--fade-bg-color').trim();
            tl.to('body', {
                backgroundColor: fadeColor,
                duration: 0.6,
                ease: "power2.out"
            }, 0);

            tl.to('#main-content > *:not(.app-grid)', {
                opacity: 0,
                duration: 0.6,
                ease: "power2.out"
            }, 0);

            tl.to('.tarot-card:not(.clicked)', {
                opacity: 0,
                duration: 0.6,
                ease: "power2.out"
            }, 0);

            // Mark this card as clicked
            card.classList.add('clicked');
        });
    });
});
