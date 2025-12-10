// js/patches/stamina-ui.js
// BotW-style Stamina UI System

console.log('[PATCH] Stamina UI loading...');

// Wait for game to be ready
const waitForGameStamina = setInterval(() => {
    if (window.game && window.game.ui) {
        clearInterval(waitForGameStamina);
        initializeStaminaUI();
    }
}, 100);

function initializeStaminaUI() {
    console.log('[STAMINA UI] Initializing...');

    createStaminaBar();
    addUIMethod();

    console.log('[STAMINA UI] ✅ Initialized');
}

function createStaminaBar() {
    // Create stamina container
    const container = document.createElement('div');
    container.id = 'stamina-container';
    container.innerHTML = `
        <svg id="stamina-ring" width="120" height="120" viewBox="0 0 120 120">
            <!-- Background circle -->
            <circle cx="60" cy="60" r="50" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.1)" 
                stroke-width="8"/>
            
            <!-- Stamina circle -->
            <circle id="stamina-circle" cx="60" cy="60" r="50" 
                fill="none" 
                stroke="#4ade80" 
                stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray="314.159"
                stroke-dashoffset="0"
                transform="rotate(-90 60 60)"
                style="transition: stroke-dashoffset 0.1s ease, opacity 0.3s ease;"/>
        </svg>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #stamina-container {
            position: fixed;
            bottom: 120px;
            left: 20px;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        #stamina-container.visible {
            opacity: 1;
        }
        
        #stamina-ring {
            filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.5));
        }
        
        #stamina-circle {
            transition: stroke 0.2s ease;
        }
        
        /* Color changes based on stamina level */
        #stamina-circle.low {
            stroke: #fbbf24; /* Yellow */
        }
        
        #stamina-circle.critical {
            stroke: #ef4444; /* Red */
            animation: pulse 0.5s ease infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);
}

function addUIMethod() {
    const ui = window.game.ui;

    let hideTimeout = null;

    ui.updateStamina = function (stamina, maxStamina) {
        const container = document.getElementById('stamina-container');
        const circle = document.getElementById('stamina-circle');

        if (!container || !circle) return;

        const percentage = stamina / maxStamina;
        const circumference = 314.159; // 2 * PI * 50
        const offset = circumference * (1 - percentage);

        // Update circle
        circle.style.strokeDashoffset = offset;

        // Color based on percentage
        circle.classList.remove('low', 'critical');
        if (percentage < 0.25) {
            circle.classList.add('critical');
        } else if (percentage < 0.5) {
            circle.classList.add('low');
        }

        // Show/hide logic
        if (percentage < 1.0) {
            // Show bar
            container.classList.add('visible');

            // Clear any pending hide
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        } else {
            // Hide after delay when full
            if (!hideTimeout) {
                hideTimeout = setTimeout(() => {
                    container.classList.remove('visible');
                    hideTimeout = null;
                }, 1000); // 1s delay before hiding
            }
        }
    };
}

console.log('[PATCH] Stamina UI loaded');
