// js/patches/death-system.js
// Game Over Screen and Respawn System

console.log('[PATCH] Death System loading...');

// Wait for game to be ready
const waitForGame = setInterval(() => {
    if (window.game && window.game.ui) {
        clearInterval(waitForGame);
        initializeDeathSystem();
    }
}, 100);

function initializeDeathSystem() {
    console.log('[DEATH SYSTEM] Initializing...');

    // Create Game Over overlay
    createGameOverUI();

    // Add methods to Game
    addGameMethods();

    // Add UI methods
    addUIMethods();

    console.log('[DEATH SYSTEM] ✅ Initialized');
}

function createGameOverUI() {
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.innerHTML = `
        <div class="game-over-content">
            <h1 class="game-over-title">💀 YOU DIED</h1>
            <p class="game-over-subtitle">Your journey ends here...</p>
            <div class="game-over-buttons">
                <button id="respawn-btn" class="game-over-btn primary">
                    <span>🔄 Respawn</span>
                    <small>Return with 50% HP</small>
                </button>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #game-over-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.8s ease;
        }
        
        #game-over-overlay.visible {
            opacity: 1;
        }
        
        .game-over-content {
            text-align: center;
            color: white;
            animation: fadeInUp 1s ease;
        }
        
        .game-over-title {
            font-size: 5rem;
            margin-bottom: 1rem;
            color: #ff4444;
            text-shadow: 0 0 30px rgba(255, 68, 68, 0.8);
            font-weight: bold;
            letter-spacing: 0.1em;
        }
        
        .game-over-subtitle {
            font-size: 1.8rem;
            margin-bottom: 3rem;
            color: #ccc;
            opacity: 0.8;
        }
        
        .game-over-buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
        }
        
        .game-over-btn {
            padding: 20px 60px;
            font-size: 1.3rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 300px;
        }
        
        .game-over-btn span {
            font-weight: bold;
            font-size: 1.4rem;
        }
        
        .game-over-btn small {
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        .game-over-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
            border-color: rgba(255, 255, 255, 0.4);
        }
        
        .game-over-btn.primary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    // Event listener
    document.getElementById('respawn-btn').addEventListener('click', () => {
        if (window.game && window.game.respawnPlayer) {
            window.game.respawnPlayer();
        }
    });
}

function addGameMethods() {
    const game = window.game;

    // Trigger Game Over
    game.triggerGameOver = function () {
        console.log('🎮 Game Over triggered');

        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            // Hide HUD
            const gameUI = document.getElementById('game-ui');
            if (gameUI) gameUI.style.display = 'none';

            // Show overlay
            overlay.style.display = 'flex';
            setTimeout(() => {
                overlay.classList.add('visible');
            }, 50);
        }
    };

    // Respawn Player
    game.respawnPlayer = function () {
        console.log('🔄 Respawning player...');

        const player = this.player;
        if (!player) return;

        // Get last save position
        let spawnPos = new CANNON.Vec3(0, 50, 0); // Default

        if (this.saveManager && this.saveManager.currentSave) {
            const saveData = this.saveManager.currentSave;
            if (saveData.position) {
                spawnPos = new CANNON.Vec3(
                    saveData.position.x,
                    saveData.position.y + 2,
                    saveData.position.z
                );
            }
        }

        // Reset player with 50% HP
        player.hp = Math.floor(player.maxHp * 0.5); // 50% HP
        player.state = 'IDLE';
        player.body.position.copy(spawnPos);
        player.body.velocity.set(0, 0, 0);
        player.body.angularVelocity.set(0, 0, 0);

        // Update UI
        if (this.ui && this.ui.updateHealth) {
            this.ui.updateHealth(player.hp, player.maxHp);
        }

        // Hide game over screen
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 800);
        }

        // Show HUD
        const gameUI = document.getElementById('game-ui');
        if (gameUI) gameUI.style.display = 'block';

        console.log(`✅ Player respawned at ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)} with ${player.hp}/${player.maxHp} HP`);
    };
}

function addUIMethods() {
    const ui = window.game.ui;

    // Update Health (CRITICAL - was missing!)
    ui.updateHealth = function (hp, maxHp) {
        // Update hearts display if it exists
        const heartsContainer = document.getElementById('hearts-container');
        if (heartsContainer && this.updateHearts) {
            this.updateHearts();
        }

        // Log for debugging
        console.log(`HP: ${hp}/${maxHp}`);
    };

    // Animate Health Drain
    ui.animateHealthDrain = function (oldHp, newHp, maxHp, duration) {
        const startTime = Date.now();
        const hpDiff = oldHp - newHp;

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);

            const currentHp = oldHp - (hpDiff * progress);
            this.updateHealth(Math.floor(currentHp), maxHp);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    };

    // Damage Flash
    ui.showDamageFlash = function () {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(255, 0, 0, 0.3);
            pointer-events: none;
            z-index: 8888;
            animation: damageFlash 0.3s ease;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes damageFlash {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    };
}

console.log('[PATCH] Death system loaded');
