// Card data structure for Portal apps
const cardData = [
    {
        title: 'Breath',
        description: 'Track your breathing patterns',
        image: 'apps/breath/breath.png',
        link: 'apps/breath/index.html',
        comingSoon: false
    },
    {
        title: 'The Hill',
        description: 'Interactive visual novel · Coming Soon',
        image: 'apps/the-hill/Hill.png',
        link: null,
        comingSoon: true
    },
    {
        title: 'NumComp',
        description: 'Visual numerical computing',
        image: 'apps/numcomp/numnode.png',
        link: 'apps/numcomp/index.html',
        comingSoon: false
    }
];

// Generate card HTML from data
function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = card.comingSoon ? 'tarot-card coming-soon' : 'tarot-card';

    // Create inner HTML structure
    const rotatorTag = card.comingSoon ? 'div' : 'a';
    const rotatorAttrs = card.comingSoon ? '' : `href="${card.link}"`;

    cardDiv.innerHTML = `
        <${rotatorTag} ${rotatorAttrs} class="card-rotator">
            <div class="card-inner">
                <div class="card-image">
                    <img src="${card.image}" alt="${card.title}" class="card-art">
                </div>
                <div class="card-content">
                    <h2 class="card-title">${card.title}</h2>
                    <p class="card-description">${card.description}</p>
                </div>
                <div class="card-iridescent"></div>
                <div class="card-shine"></div>
                <div class="card-glare"></div>
            </div>
        </${rotatorTag}>
    `;

    return cardDiv;
}

// Initialize cards on page load
function initializeCards() {
    const appGrid = document.querySelector('.app-grid');
    if (!appGrid) return;

    // Clear existing cards
    appGrid.innerHTML = '';

    // Generate and append cards
    cardData.forEach(card => {
        const cardElement = createCardElement(card);
        appGrid.appendChild(cardElement);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCards);
} else {
    initializeCards();
}
