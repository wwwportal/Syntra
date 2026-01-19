// Loading Animation with GSAP MotionPathPlugin
// Circles spiral inward along smooth bezier curves to form the logo

document.addEventListener('DOMContentLoaded', () => {
    // Check if loading animation has already been shown this session
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');

    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');

    if (hasSeenLoading) {
        // Skip loading animation - show content immediately
        loadingScreen.style.display = 'none';
        mainContent.style.opacity = '1';

        // But still position and show the logo in bottom-right corner
        const container = document.querySelector('.loading-container');
        const containerSize = 300;
        const scale = 0.4;
        const margin = 20;
        const deadSpace = ((containerSize - 140) / 2) * scale;
        const scaledSize = containerSize * scale;
        const finalTop = window.innerHeight - scaledSize - margin + deadSpace;
        const finalLeft = window.innerWidth - scaledSize - margin + deadSpace;

        // Position logo immediately without animation
        container.style.position = 'fixed';
        container.style.top = finalTop + 'px';
        container.style.left = finalLeft + 'px';
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'top left';
        container.style.pointerEvents = 'auto';
        container.style.cursor = 'pointer';
        container.style.zIndex = '10000';

        // Make logo clickable to go home
        container.addEventListener('click', () => {
            window.location.href = '/';
        });

        // Add resize listener
        function updateLogoPosition() {
            const newFinalTop = window.innerHeight - scaledSize - margin + deadSpace;
            const newFinalLeft = window.innerWidth - scaledSize - margin + deadSpace;
            container.style.top = newFinalTop + 'px';
            container.style.left = newFinalLeft + 'px';
        }
        window.addEventListener('resize', updateLogoPosition);

        return;
    }

    // Mark that we've seen the loading animation
    sessionStorage.setItem('hasSeenLoading', 'true');

    // Register the MotionPathPlugin
    gsap.registerPlugin(MotionPathPlugin);

    const star = document.getElementById('star');
    const centerCircle = document.getElementById('center-circle');

    // Observer elements
    const obs1 = document.getElementById('obs-1');
    const obs2 = document.getElementById('obs-2');
    const obs3 = document.getElementById('obs-3');
    const obs4 = document.getElementById('obs-4');

    // Final colors for each observer
    const colors = {
        obs1: '#F5C542', // Yellow - top-left
        obs2: '#F5A3C7', // Pink - top-right
        obs3: '#A3E048', // Green - bottom-left
        obs4: '#7DD3E8'  // Blue - bottom-right
    };

    // Spiral animation duration
    const spiralDuration = 0.9;

    // Create the main timeline
    const tl = gsap.timeline();

    // Set container initial position (centered in viewport)
    const container = document.querySelector('.loading-container');
    const containerSize = 300;
    gsap.set(container, {
        top: (window.innerHeight - containerSize) / 2,
        left: (window.innerWidth - containerSize) / 2
    });

    // Set initial positions using x/y for MotionPath compatibility
    gsap.set([obs1, obs2, obs3, obs4], {
        position: 'absolute',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50
    });

    // Observer size: 70px CSS, SVG circle r=48/100, so visual radius = 70 * 0.48 = 33.6px
    // For circles to touch at center, offset = radius
    const obsOffset = 35;

    // Generate spiral path points (no rotation needed for circles)
    function generateSpiralPath(startAngle, endAngle, startRadius, endRadius, numPoints) {
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            // Ease the radius change for smoother motion
            const easedT = t * t * (3 - 2 * t); // smoothstep
            const radius = startRadius + (endRadius - startRadius) * easedT;
            const angle = startAngle + (endAngle - startAngle) * t;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            points.push({ x, y });
        }
        return points;
    }

    // Starting radius - within viewport since circles fade in
    const startRadius = Math.min(window.innerWidth, window.innerHeight) * 0.15;

    // End radius - distance from center to final corner position
    const endRadius = obsOffset * Math.sqrt(2);

    // Use half rotation (π) for a quicker spiral inward
    const totalRotation = Math.PI;

    // Final angles (where each observer ends up)
    const finalAngles = {
        obs1: -3 * Math.PI / 4,  // top-left
        obs2: -Math.PI / 4,       // top-right
        obs3: 3 * Math.PI / 4,    // bottom-left
        obs4: Math.PI / 4         // bottom-right
    };

    // Starting angles = final angles + total rotation (spiral backward from end)
    const angles = {
        obs1: { start: finalAngles.obs1 + totalRotation, end: finalAngles.obs1 },
        obs2: { start: finalAngles.obs2 + totalRotation, end: finalAngles.obs2 },
        obs3: { start: finalAngles.obs3 + totalRotation, end: finalAngles.obs3 },
        obs4: { start: finalAngles.obs4 + totalRotation, end: finalAngles.obs4 }
    };

    // Generate paths
    const path1 = generateSpiralPath(angles.obs1.start, angles.obs1.end, startRadius, endRadius, 24);
    const path2 = generateSpiralPath(angles.obs2.start, angles.obs2.end, startRadius, endRadius, 24);
    const path3 = generateSpiralPath(angles.obs3.start, angles.obs3.end, startRadius, endRadius, 24);
    const path4 = generateSpiralPath(angles.obs4.start, angles.obs4.end, startRadius, endRadius, 24);

    // Set starting positions and opacity
    gsap.set(obs1, { x: path1[0].x, y: path1[0].y, opacity: 0 });
    gsap.set(obs2, { x: path2[0].x, y: path2[0].y, opacity: 0 });
    gsap.set(obs3, { x: path3[0].x, y: path3[0].y, opacity: 0 });
    gsap.set(obs4, { x: path4[0].x, y: path4[0].y, opacity: 0 });

    // All observers animate together, staying 90° apart
    tl.to(obs1, {
        motionPath: {
            path: path1,
            curviness: 1.5
        },
        color: colors.obs1,
        duration: spiralDuration,
        ease: "power4.out"
    }, 0);

    tl.to(obs2, {
        motionPath: {
            path: path2,
            curviness: 1.5
        },
        color: colors.obs2,
        duration: spiralDuration,
        ease: "power4.out"
    }, 0);

    tl.to(obs3, {
        motionPath: {
            path: path3,
            curviness: 1.5
        },
        color: colors.obs3,
        duration: spiralDuration,
        ease: "power4.out"
    }, 0);

    tl.to(obs4, {
        motionPath: {
            path: path4,
            curviness: 1.5
        },
        color: colors.obs4,
        duration: spiralDuration,
        ease: "power4.out"
    }, 0);

    // Fade in circles - gradual fade throughout the animation
    tl.to([obs1, obs2, obs3, obs4], {
        opacity: 1,
        duration: spiralDuration * 0.85,
        ease: "none"
    }, 0.1);

    // Black circle fades in as observers converge - finish when circles meet
    tl.to(centerCircle, {
        opacity: 1,
        duration: spiralDuration,
        ease: "power2.in"
    }, 0);

    // Star appears AFTER spiral completes with instant glow spike
    tl.to(star, {
        opacity: 1,
        filter: "drop-shadow(0 0 20px white) drop-shadow(0 0 40px white)",
        duration: 0.1,
        ease: "none"
    }, spiralDuration);

    // Glow eases out gradually
    tl.to(star, {
        filter: "drop-shadow(0 0 0px white)",
        duration: 1.0,
        ease: "power2.out"
    }, spiralDuration + 0.1);

    // Hold for a moment, then move logo to bottom-right
    const holdTime = spiralDuration + 1.2;
    const moveToCornerDuration = 0.8;

    const scale = 0.4;
    const margin = 24;
    
    // Final position: bottom-right corner
    // Container is 300px, but the visible logo (~140px) is centered within it
    // So there's ~80px of dead space on each side of the logo within the container
    // When scaled to 0.4: container=120px, logo=~56px, dead space=~32px per side
    // We need to offset by the dead space so the visible logo has equal margins
    const scaledSize = containerSize * scale;
    const deadSpace = ((containerSize - 140) / 2) * scale; // ~32px scaled dead space
    const finalTop = window.innerHeight - scaledSize - margin + deadSpace;
    const finalLeft = window.innerWidth - scaledSize - margin + deadSpace;

    // Fade in main content with a smooth ease
    tl.to(mainContent, {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
    }, holdTime);

    // Move the entire loading container to bottom-right
    tl.to(container, {
        top: finalTop,
        left: finalLeft,
        scale: scale,
        transformOrigin: "top left",
        duration: moveToCornerDuration,
        ease: "power2.inOut"
    }, holdTime);

    // Fade out the black background, keeping the logo visible
    tl.to(loadingScreen, {
        backgroundColor: 'transparent',
        duration: moveToCornerDuration,
        ease: "none"
    }, holdTime);

    // After animation, just set up click behavior without changing position
    tl.add(() => {
        // Remove the loading screen overlay so it doesn't block the page
        // Keep only the container visible
        loadingScreen.style.width = 'auto';
        loadingScreen.style.height = 'auto';
        loadingScreen.style.pointerEvents = 'none';

        // Enable pointer events only on the container (the logo button)
        container.style.pointerEvents = 'auto';
        container.style.cursor = 'pointer';

        container.addEventListener('click', () => {
            window.location.href = '/';
        });

        // Function to update logo position on resize
        function updateLogoPosition() {
            const scaledSize = containerSize * scale;
            const deadSpace = ((containerSize - 140) / 2) * scale;
            const newFinalTop = window.innerHeight - scaledSize - margin + deadSpace;
            const newFinalLeft = window.innerWidth - scaledSize - margin + deadSpace;

            gsap.set(container, {
                top: newFinalTop,
                left: newFinalLeft
            });
        }

        // Add resize listener to keep logo in bottom-right corner
        window.addEventListener('resize', updateLogoPosition);
    }, holdTime + moveToCornerDuration);
});
