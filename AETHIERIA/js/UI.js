// js/UI.js
import * as THREE from 'three';
import { Items } from './data/Items.js';
import { MapManager } from './managers/MapManager.js';

export class UIManager {
    /**
     * @param {import('./main.js').Game} game
     */
    constructor(game) {
        this.game = game;
        this.mapManager = new MapManager(game);
        // ... existing constructor code ...
        this.isOpen = false;

        this.menu = document.getElementById('pause-menu');
        if (!this.menu) {
            console.error("Pause Menu element not found!");
            return;
        }

        // Inject Menu HTML dynamically with new structure
        this.menu.innerHTML = `
            <div class="pause-menu-container">
                <!-- Left Column: Actions -->
                <div class="action-buttons">
                    <button id="resume-btn" class="btn-action">REPRENDRE</button>
                    <button id="save-btn" class="btn-action">SAUVEGARDER</button>
                    <button id="download-btn" class="btn-action">TÉLÉCHARGER</button>
                    <button id="quit-btn" class="btn-action btn-quit">QUITTER</button>
                </div>

                <!-- Right Column: Inventory & Stats -->
                <div class="right-panel">
                    <div class="inventory-section">
                        <div class="section-header">INVENTAIRE</div>
                        <div id="inventory-grid"></div>
                    </div>
                    
                    <div class="stats-section">
                        <div class="section-header">STATISTIQUES</div>
                        <div id="stats-content"></div>
                    </div>
                </div>
            </div>
        `;

        // Remove old manual styling override since CSS handles it
        this.menu.style.cssText = '';

        // Get references AFTER injection
        this.grid = document.getElementById('inventory-grid');
        this.stats = document.getElementById('stats-content');

        if (!this.grid || !this.stats) {
            console.warn("UI elements not found!");
        }

        this.initInput();
        this.initBossUI();
        this.initCrosshair();
        // this.initMinimap(); // Deferred to Game.init()
        // this.createMainMenu(); // DEFERRED to avoid flicker during loading

        // Pause Menu Buttons
        document.getElementById('resume-btn').onclick = () => this.toggleMenu();
        document.getElementById('save-btn').onclick = () => {
            if (this.game.saveManager) {
                this.game.saveManager.save();
                const btn = document.getElementById('save-btn');
                const originalText = btn.innerText;
                btn.innerText = "SAVED!";
                setTimeout(() => btn.innerText = originalText, 1000);
            }
        };
        document.getElementById('download-btn').onclick = () => this.downloadSave();
        document.getElementById('quit-btn').onclick = () => location.reload();
    }

    createMainMenu() {
        this.mainMenu = document.createElement('div');
        this.mainMenu.id = 'main-menu';
        this.mainMenu.style.position = 'absolute';
        this.mainMenu.style.top = '0';
        this.mainMenu.style.left = '0';
        this.mainMenu.style.width = '100%';
        this.mainMenu.style.height = '100%';
        this.mainMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.mainMenu.style.display = 'flex';
        this.mainMenu.style.flexDirection = 'column';
        this.mainMenu.style.justifyContent = 'center';
        this.mainMenu.style.alignItems = 'center';
        this.mainMenu.style.zIndex = '2000';
        this.mainMenu.style.backdropFilter = 'blur(10px)';

        const title = document.createElement('h1');
        title.innerText = 'AETHERIA';
        title.style.color = 'white';
        title.style.fontSize = '80px';
        title.style.marginBottom = '50px';
        title.style.textShadow = '0 0 20px #00aaff';
        title.style.fontFamily = 'Cinzel, serif'; // Assuming font is available or fallback
        this.mainMenu.appendChild(title);

        const btnStyle = `
            padding: 15px 40px;
            font-size: 24px;
            margin: 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            cursor: pointer;
            transition: all 0.3s;
            border-radius: 5px;
            border-radius: 5px;
        `;

        const continueBtn = document.createElement('button');
        continueBtn.innerText = 'Continue';
        continueBtn.style.cssText = btnStyle;
        continueBtn.onclick = () => {
            this.hideMainMenu();
            this.game.start(true);
        };

        // Check if save exists - Async check would be better, but for now let's ENABLE it
        // and let the button click handle the "No Save" alert from main.js
        // Or better: We could make an async check here if we really wanted to disable it.
        // For simplicity: We assume there might be a save.
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1.0';
        continueBtn.style.cursor = 'pointer';

        const newGameBtn = document.createElement('button');
        newGameBtn.innerText = 'New Game';
        newGameBtn.style.cssText = btnStyle;
        newGameBtn.onclick = () => {
            this.hideMainMenu();
            this.game.start(false);
        };

        this.mainMenu.appendChild(continueBtn);
        this.mainMenu.appendChild(newGameBtn);

        document.body.appendChild(this.mainMenu);
        document.body.appendChild(this.mainMenu);
        this.setupKeyboardNavigation(this.mainMenu);
    }

    /**
     * @param {Array<Object> | null} [preloadedSlots=null]
     */
    createSlotSelectionUI(preloadedSlots = null) {
        // Remove Main Menu if it exists
        this.hideMainMenu();

        const container = document.createElement('div');
        container.id = 'slot-selection';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = 'rgba(10, 10, 20, 0.95)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.zIndex = '3000';
        container.style.backdropFilter = 'blur(10px)';
        container.style.fontFamily = 'Cinzel, serif';

        const title = document.createElement('h1');
        title.innerText = 'CHOISIS TON AVENTURE';
        title.style.color = '#ffd700';
        title.style.fontSize = '60px';
        title.style.marginBottom = '60px';
        title.style.textShadow = '0 0 20px #ffaa00';
        container.appendChild(title);

        const slotsContainer = document.createElement('div');
        slotsContainer.style.display = 'flex';
        slotsContainer.style.gap = '30px'; // Reduced gap for 3 slots
        container.appendChild(slotsContainer);

        // Helper to render slots
        const renderSlots = (slotsInfo) => {
            slotsInfo.forEach(info => {
                const cardWrapper = document.createElement('div');
                cardWrapper.style.position = 'relative';

                const card = document.createElement('div');
                card.className = info.exists ? 'slot-card' : 'slot-card empty';
                card.setAttribute('tabindex', '0'); // Focusable

                if (info.exists) {
                    // --- POPULATED HERO CARD ---

                    // Avatar (Placeholder gradient or image)
                    // In a real app, this would be a screenshot or character render
                    // We'll use a dynamic gradient based on ID for variety
                    const avatar = document.createElement('div');
                    avatar.className = 'slot-avatar';
                    // Unique hue per slot
                    const hue = info.id * 60;
                    avatar.style.background = `linear-gradient(to bottom, hsl(${hue}, 50%, 20%), hsl(${hue}, 60%, 10%))`;
                    avatar.innerHTML = `<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; opacity:0.3; font-size:80px;">⚔️</div>`;
                    card.appendChild(avatar);

                    // Content
                    const content = document.createElement('div');
                    content.className = 'slot-content';
                    content.innerHTML = `
                        <h2 class="slot-title">HÉROS ${info.id}</h2>
                        <div class="slot-level">NIVEAU ${info.level}</div>
                        <div class="slot-meta">
                            <span>📅 ${info.date.split(' ')[0]}</span>
                            <span>📍 ${info.location}</span>
                        </div>
                    `;
                    card.appendChild(content);

                    // Delete Button
                    const trashBtn = document.createElement('button');
                    trashBtn.className = 'delete-slot-btn';
                    trashBtn.innerHTML = '✕';
                    trashBtn.title = "Supprimer le Héros";

                    trashBtn.onclick = async (e) => {
                        e.stopPropagation();
                        // Custom Confirm could go here, staying with native for safety/speed
                        if (confirm(`⚠ SUPPRIMER HÉROS ${info.id} ?\nCette action est définitive.`)) {
                            try {
                                await this.game.saveManager.deleteSlot(info.id);
                                container.remove();
                                setTimeout(() => this.createSlotSelectionUI(), 100);
                            } catch (error) {
                                console.error("Delete Failed:", error);
                            }
                        }
                    };
                    cardWrapper.appendChild(trashBtn);

                } else {
                    // --- EMPTY CARD (NEW GAME) ---
                    card.innerHTML = `
                        <div class="add-hero-icon">+</div>
                        <div class="slot-content">
                            <h2 class="slot-title" style="color: #666; text-shadow:none;">NOUVEAU</h2>
                            <div class="slot-level" style="color:#444;">CRÉER UNE LÉGENDE</div>
                        </div>
                    `;
                }

                // Click Handler
                card.onclick = () => {
                    // Play start sound?
                    // this.playSound('ui_confirm');

                    this.game.saveManager.selectSlot(info.id);
                    container.style.opacity = '0';
                    setTimeout(() => container.remove(), 400); // Wait for transition
                    this.createMainMenu();
                };

                // Add to wrapper then container
                cardWrapper.appendChild(card);
                slotsContainer.appendChild(cardWrapper);
            });

            document.body.appendChild(container);
            this.setupKeyboardNavigation(container);
        };

        // Use preloaded data or fetch it
        if (preloadedSlots) {
            renderSlots(preloadedSlots);
        } else {
            this.game.saveManager.getSlotsInfo().then(slotsInfo => {
                renderSlots(slotsInfo);
            });
        }
    }

    hideMainMenu() {
        if (this.mainMenu) {
            this.mainMenu.style.opacity = '0';
            setTimeout(() => this.mainMenu.remove(), 500);
        }
    }

    initBossUI() {
        this.bossContainer = document.createElement('div');
        this.bossContainer.id = 'boss-container';
        this.bossContainer.style.position = 'absolute';
        this.bossContainer.style.top = '50px';
        this.bossContainer.style.left = '50%';
        this.bossContainer.style.transform = 'translateX(-50%)';
        this.bossContainer.style.width = '600px';
        this.bossContainer.style.display = 'none';
        this.bossContainer.style.textAlign = 'center';
        this.bossContainer.innerHTML = `
            <h2 id="boss-name" style="color:white; text-shadow: 0 0 5px black; margin-bottom: 5px;">Boss Name</h2>
            <div style="width: 100%; height: 20px; background: #333; border: 2px solid #555; border-radius: 10px; overflow: hidden;">
                <div id="boss-hp-bar" style="width: 100%; height: 100%; background: #d00; transition: width 0.2s;"></div>
            </div>
        `;
        document.body.appendChild(this.bossContainer);
    }

    updateBossBar(hp, maxHp, name) {
        this.bossContainer.style.display = 'block';
        document.getElementById('boss-name').innerText = name;
        const pct = Math.max(0, (hp / maxHp) * 100);
        document.getElementById('boss-hp-bar').style.width = `${pct}%`;
    }

    hideBossBar() {
        this.bossContainer.style.display = 'none';
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyI') {
                this.toggleMenu();
            }
            // Support 'M' (Qwerty) and Semicolon (Azerty M position) and literal 'm' check
            if (e.code === 'KeyM' || e.code === 'Semicolon' || e.key === 'm' || e.key === 'M') {
                this.toggleMap();
            }
            // Use KeyDown for immediate response, but handle repeats if necessary
            if (e.code === 'CapsLock' && !e.repeat) {
                console.log("CapsLock Pressed (UI)");
                this.toggleMap();
            }
        });
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.innerText = msg;
        toast.style.position = 'absolute';
        toast.style.top = '10%';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(0,0,0,0.7)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '10000';
        toast.style.pointerEvents = 'none';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        this.menu.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) {
            this.menu.style.zIndex = '5000'; // Force On Top (higher than map 2000)
            document.exitPointerLock();
            this.renderInventory();
            this.renderStats();

            // Hide Minimap when Inventory is open
            if (this.mapManager) this.mapManager.hide();

            // Blur Effect on Canvas
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.style.filter = 'blur(5px)';

            // Note: Menu styles (bg, backdrop) are now in CSS #pause-menu
        } else {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.style.filter = 'none';

            // Restore Minimap
            if (this.mapManager) this.mapManager.show();

            // Removed automatic pointer lock request to avoid "User Gesture" errors.
            // Player must click to regain focus.
        }
    }

    renderInventory() {
        this.grid.innerHTML = '';
        const slots = this.game.player.inventory.slots;

        slots.forEach((slot, index) => {
            const el = document.createElement('div');
            el.className = 'inventory-slot';

            if (slot) {
                // Fetch Data
                const item = this.game.data.getItem(slot.id);
                if (item) {
                    el.innerHTML = `<div style="font-size: 24px;">${item.icon || '?'}</div>`;
                    if (slot.count > 1) {
                        el.innerHTML += `<div style="position:absolute; bottom:2px; right:5px; font-size:12px; font-weight:bold; color:white;">${slot.count}</div>`;
                    }
                    // Tooltip (Simple Title)
                    el.title = item.name;

                    // Rarity/Color Border override
                    if (item.color) {
                        el.style.borderColor = item.color;
                    }
                }

                el.onclick = () => {
                    this.game.player.inventory.useItem(index);
                    this.renderInventory(); // Refresh
                    this.renderStats();
                };
            }

            this.grid.appendChild(el);
        });
    }

    initStaminaWheel() {
        this.staminaContainer = document.createElement('div');
        this.staminaContainer.id = 'stamina-wheel-container';
        this.staminaContainer.style.display = 'none';
        document.body.appendChild(this.staminaContainer);
    }

    updateStamina(current, max) {
        if (!this.staminaContainer) this.initStaminaWheel();

        // Logic: Base circle is 100 stamina. Extra stamina adds rings or segments.
        // For simplicity: 1 Full Circle = 100 Stamina.
        // If max > 100, we just scale the circle slightly or add a second ring?
        // Let's do the scaling approach for now as it's cleaner to implement quickly.
        // Or better: The "Zelda" way is a partial circle that grows to a full circle, then a second circle.
        // Let's stick to: 1 Ring = Max Stamina. Visual size depends on Max Stamina.

        // Base Radius = 20px. Max Radius = 40px.
        // Scale factor based on max/100.
        const scale = Math.min(2.0, Math.max(1.0, max / 100));
        const size = 60 * scale;
        const radius = 20 * scale;
        const strokeWidth = 5 * scale;
        const center = size / 2;
        const circumference = 2 * Math.PI * radius;

        // Re-build SVG if max changed (or init)
        // We check if we need to redraw structure
        if (this.currentMaxStamina !== max) {
            this.currentMaxStamina = max;
            this.staminaContainer.innerHTML = `
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <!-- Background -->
                    <circle cx="${center}" cy="${center}" r="${radius}" fill="rgba(0,0,0,0.5)" stroke="none" />
                    <!-- Progress -->
                    <circle id="stamina-progress" cx="${center}" cy="${center}" r="${radius - strokeWidth / 2}" 
                            fill="none" stroke="#00ff00" stroke-width="${strokeWidth}" 
                            stroke-dasharray="${circumference}" stroke-dashoffset="0" 
                            transform="rotate(-90 ${center} ${center})" 
                            stroke-linecap="round" />
                </svg>
            `;
        }

        const pct = Math.max(0, current / max);
        const circle = this.staminaContainer.querySelector('#stamina-progress');

        if (circle) {
            const offset = circumference * (1 - pct);
            circle.style.strokeDashoffset = offset;

            // Color: Red if exhausted or very low
            if (pct < 0.2 && current < 20) {
                circle.style.stroke = '#ff3333';
            } else {
                circle.style.stroke = '#00ff00';
            }
        }

        // Visibility
        if (pct >= 1.0) {
            this.staminaContainer.style.opacity = '0';
        } else {
            this.staminaContainer.style.display = 'block';
            this.staminaContainer.style.opacity = '1';
        }

        // Position: Above Head
        if (this.game.player && this.game.player.mesh) {
            const pos = this.game.player.mesh.position.clone();
            pos.y += 2.2; // Slightly higher
            pos.project(this.game.camera);

            const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

            this.staminaContainer.style.left = `${x - size / 2}px`;
            this.staminaContainer.style.top = `${y - size / 2}px`;
        }
    }

    renderStats() {
        const p = this.game.player;
        this.stats.innerHTML = `
            <p><strong>Niveau:</strong> ${p.levelManager ? p.levelManager.level : 1}</p>
            <p><strong>XP:</strong> ${p.levelManager ? p.levelManager.currentXp : 0} / ${p.levelManager ? p.levelManager.xpToNextLevel : 1000}</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 5px 0;">
            <p><strong>HP:</strong> ${Math.floor(p.hp)} / ${p.maxHp}</p>
            <p><strong>Stamina:</strong> ${Math.floor(p.stamina)} / ${p.maxStamina}</p>
            <p><strong>Attaque:</strong> ${p.stats.attack}</p>
            <p><strong>Défense:</strong> ${p.stats.defense}</p>
        `;
        this.updateHearts(p.hp, p.maxHp);
    }

    updateHearts(current, max) {
        if (!this.heartsContainer) {
            this.heartsContainer = document.getElementById('hearts-container');
        }
        if (!this.heartsContainer) return;

        // Logic: 1 Heart = 20 HP
        const totalHearts = Math.ceil(max / 20);
        const currentHearts = Math.ceil(current / 20);

        // Clear and Rebuild (as requested)
        this.heartsContainer.innerHTML = '';

        for (let i = 0; i < totalHearts; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';

            // Calculate state for this heart
            // Heart i represents HP from (i*20) to ((i+1)*20)
            const heartMin = i * 20;
            const heartMax = (i + 1) * 20;

            if (current >= heartMax) {
                // Full Heart
                heart.style.opacity = '1.0';
                heart.style.filter = 'none';
            } else if (current > heartMin) {
                // Partial Heart (e.g. 10/20)
                // For simplicity, just show it but maybe grayscale or opacity?
                // User suggested: "dernier cœur visuellement différent"
                heart.style.opacity = '1.0';
                heart.style.filter = 'grayscale(0.5) brightness(0.8)';
            } else {
                // Empty Heart
                heart.style.opacity = '0.3'; // Dimmed
                heart.style.filter = 'grayscale(1.0)';
            }

            this.heartsContainer.appendChild(heart);
        }
    }

    // --- LEVELING UI ---

    initXpBar() {
        this.xpContainer = document.createElement('div');
        this.xpContainer.id = 'xp-container';
        this.xpContainer.style.position = 'absolute';
        this.xpContainer.style.bottom = '0';
        this.xpContainer.style.left = '0';
        this.xpContainer.style.width = '100%';
        this.xpContainer.style.height = '6px';
        this.xpContainer.style.background = 'rgba(0,0,0,0.5)';
        this.xpContainer.style.zIndex = '900'; // Below UI elements but above game

        this.xpBar = document.createElement('div');
        this.xpBar.style.width = '0%';
        this.xpBar.style.height = '100%';
        this.xpBar.style.background = 'linear-gradient(90deg, #9b59b6, #f1c40f)'; // Purple to Gold
        this.xpBar.style.transition = 'width 0.5s ease-out';
        this.xpBar.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.5)';

        this.xpContainer.appendChild(this.xpBar);
        document.body.appendChild(this.xpContainer);
    }

    updateXpBar(current, max, level) {
        if (!this.xpContainer) this.initXpBar();
        const pct = Math.min(100, (current / max) * 100);
        this.xpBar.style.width = `${pct}%`;
    }

    showLevelUpToast(level) {
        const toast = document.createElement('div');
        toast.innerHTML = `<h1 style="color: #ffd700; font-size: 60px; margin: 0; text-shadow: 0 0 30px #ffaa00;">NIVEAU ${level} !</h1><p style="color: white; font-size: 20px;">Stats augmentées</p>`;
        toast.style.position = 'absolute';
        toast.style.top = '30%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%) scale(0.5)';
        toast.style.opacity = '0';
        toast.style.textAlign = 'center';
        toast.style.zIndex = '10000';
        toast.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        document.body.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, -50%) scale(1.0)';
        });

        // Remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
    initCrosshair() {
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'crosshair';
        this.crosshair.style.position = 'absolute';
        this.crosshair.style.top = '50%';
        this.crosshair.style.left = '50%';
        this.crosshair.style.width = '20px';
        this.crosshair.style.height = '20px';
        this.crosshair.style.transform = 'translate(-50%, -50%)';
        this.crosshair.style.pointerEvents = 'none';
        this.crosshair.style.display = 'none';

        // Simple Crosshair SVG
        this.crosshair.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" stroke="white" stroke-width="2" fill="none" />
                <circle cx="10" cy="10" r="2" fill="red" />
            </svg>
        `;
        document.body.appendChild(this.crosshair);
    }

    playSound(id) {
        if (this.game.audio && this.game.audio.playSFX) {
            this.game.audio.playSFX(id);
        } else {
            // Fallback / Log
            // console.log("Playing Sound:", id);
        }
    }

    showInteractionPrompt(text) {
        if (!this.interactionPrompt) {
            this.interactionPrompt = document.createElement('div');
            this.interactionPrompt.style.position = 'absolute';
            this.interactionPrompt.style.bottom = '20%';
            this.interactionPrompt.style.left = '50%';
            this.interactionPrompt.style.transform = 'translateX(-50%)';
            this.interactionPrompt.style.color = 'white';
            this.interactionPrompt.style.fontFamily = 'sans-serif';
            this.interactionPrompt.style.fontSize = '24px';
            this.interactionPrompt.style.fontWeight = 'bold';
            this.interactionPrompt.style.textShadow = '0 0 5px black';
            this.interactionPrompt.style.pointerEvents = 'none';
            document.body.appendChild(this.interactionPrompt);
        }
        this.interactionPrompt.innerText = text;
        this.interactionPrompt.style.display = 'block';
    }

    hideInteractionPrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.style.display = 'none';
        }
    }

    initMinimap() {
        if (this.mapManager) {
            this.mapManager.init();
        }
    }

    showMinimap() {
        if (this.mapManager) {
            this.mapManager.show();
        }
    }

    /**
     * @param {number|Player} [dtOrPlayer]
     */
    update(dtOrPlayer) {
        let dt = 0;
        let p = this.game.player;

        if (typeof dtOrPlayer === 'number') {
            dt = dtOrPlayer;
        } else if (dtOrPlayer && dtOrPlayer.constructor && dtOrPlayer.constructor.name === 'Player') {
            p = dtOrPlayer;
        } else if (dtOrPlayer && typeof dtOrPlayer === 'object') {
            // Fallback if safe check above fails
            p = dtOrPlayer;
        }

        if (p) {
            this.updateStamina(p.stamina, p.maxStamina);
            this.updateHearts(p.hp, p.maxHp);

            // Update Crosshair Visibility
            if (p.combat) {
                this.crosshair.style.display = p.combat.isAiming ? 'block' : 'none';
            }
        }

        // Update Minimap
        this.updateMinimap(dt);
    }

    updateMinimap(dt) {
        if (this.mapManager) {
            this.mapManager.update(dt);
        }
    }

    revealRegion(x, z, radius) {
        if (this.mapManager) {
            this.mapManager.revealZone(x, z, radius);
            this.showToast("Map Updated: Region Revealed");
        }
    }

    toggleMap() {
        if (this.mapManager) {
            this.mapManager.toggleMap();
        }
    }

    playMapUnlockAnimation(targetPosition) {
        // 1. Flash Effect
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'white';
        flash.style.opacity = '0.8';
        flash.style.transition = 'opacity 1s';
        flash.style.zIndex = '9999';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 1000);
        }, 100);

        // 2. Open Big Map to show reveal
        this.toggleMap(true);

        // 3. Sound
        if (this.game.audio) {
            // this.game.audio.playSFX('discovery'); // TODO: Add sound
        }
    }

    updateMinimap(dt) {
        if (this.mapManager) {
            this.mapManager.update(dt);
        }
    }

    toggleMap(forceState = null) {
        if (this.mapManager) {
            this.mapManager.toggleMap(forceState);
        }
    }


    showDamage(position, amount, isCritical) {
        const el = document.createElement('div');
        el.innerText = Math.floor(amount);
        el.style.position = 'absolute';
        el.style.color = isCritical ? '#FFD700' : 'white';
        el.style.fontSize = isCritical ? '32px' : '20px';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '0 0 5px black';
        el.style.pointerEvents = 'none';
        el.style.transition = 'top 1s, opacity 1s';
        el.style.zIndex = '1000';

        // Convert World Position to Screen Position
        const vector = position.clone();
        vector.project(this.game.camera);

        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        document.body.appendChild(el);

        // Animate
        requestAnimationFrame(() => {
            el.style.top = `${y - 100}px`;
            el.style.opacity = '0';
            if (isCritical) {
                el.style.transform = 'scale(1.5)';
            }
        });

        setTimeout(() => el.remove(), 1000);
    }

    downloadSave() {
        // Ensure latest state is saved
        if (this.game.saveManager) this.game.saveManager.save();

        const saveData = localStorage.getItem('AETHERIA_SAVE_V1');
        if (!saveData) {
            alert("No save data found!");
            return;
        }

        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Aetheria_Save_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    setupKeyboardNavigation(container) {
        if (!container) return;

        // Cleanup previous listener if exists
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }

        // Find all interactive elements
        // Updated selector to find buttons AND the new .slot-card class
        const buttons = Array.from(container.querySelectorAll('button, .slot-card'));
        if (buttons.length === 0) return;

        let currentIndex = 0;

        // Helper to update visual focus
        const updateFocus = () => {
            buttons.forEach((btn, index) => {
                if (index === currentIndex) {
                    btn.classList.add('focused');
                    // Scroll into view if needed
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    btn.classList.remove('focused');
                }
            });
        };

        // Initial Focus
        updateFocus();

        // Keyboard Handler
        this.keyboardHandler = (e) => {
            // Safety check: if menu is closed, remove listener
            if (container.style.display === 'none' || !document.body.contains(container)) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
                return;
            }

            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                case 'ArrowLeft':
                case 'KeyA':
                    currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
                    updateFocus();
                    e.preventDefault();
                    break;

                case 'ArrowDown':
                case 'KeyS':
                case 'ArrowRight':
                case 'KeyD':
                    currentIndex = (currentIndex + 1) % buttons.length;
                    updateFocus();
                    e.preventDefault();
                    break;

                case 'Enter':
                case 'NumpadEnter':
                case 'Space':
                case 'KeyE': // Added E key support
                case 'KeyF':
                    console.log("Keyboard Action on:", buttons[currentIndex]);
                    if (buttons[currentIndex]) {
                        buttons[currentIndex].click();
                        // Visual Feedback
                        buttons[currentIndex].style.transform = 'scale(0.95)';
                        setTimeout(() => buttons[currentIndex].style.transform = '', 100);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    break;
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
    }

    // --- CINEMATIC & TUTORIAL UI ---

    showCinematicText(text, duration = 3000) {
        if (!this.cinematicOverlay) {
            this.cinematicOverlay = document.createElement('div');
            this.cinematicOverlay.id = 'cinematic-overlay';
            this.cinematicOverlay.style.position = 'fixed';
            this.cinematicOverlay.style.top = '0';
            this.cinematicOverlay.style.left = '0';
            this.cinematicOverlay.style.width = '100%';
            this.cinematicOverlay.style.height = '100%';
            this.cinematicOverlay.style.backgroundColor = 'black';
            this.cinematicOverlay.style.display = 'flex';
            this.cinematicOverlay.style.justifyContent = 'center';
            this.cinematicOverlay.style.alignItems = 'center';
            this.cinematicOverlay.style.zIndex = '5000';
            this.cinematicOverlay.style.transition = 'opacity 1s';
            document.body.appendChild(this.cinematicOverlay);

            this.cinematicText = document.createElement('p');
            this.cinematicText.style.color = '#ddd';
            this.cinematicText.style.fontFamily = 'Cinzel, serif';
            this.cinematicText.style.fontSize = '28px';
            this.cinematicText.style.maxWidth = '800px';
            this.cinematicText.style.textAlign = 'center';
            this.cinematicText.style.lineHeight = '1.6';
            this.cinematicText.style.opacity = '0';
            this.cinematicText.style.transition = 'opacity 1s';
            this.cinematicOverlay.appendChild(this.cinematicText);
        }

        this.cinematicOverlay.style.display = 'flex';
        this.cinematicOverlay.style.opacity = '1';

        this.cinematicText.innerText = text;

        // Force reflow
        void this.cinematicText.offsetWidth;

        this.cinematicText.style.opacity = '1';

        setTimeout(() => {
            if (this.cinematicText) this.cinematicText.style.opacity = '0';
        }, duration - 500);
    }

    hideCinematicOverlay() {
        // HIDE LOADING SCREEN (Failsafe)
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';

        // FORCE REMOVE CINEMATIC OVERLAY
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) overlay.remove();

        // Also clear reference to avoid errors
        this.cinematicOverlay = null;

        // RESTORE UI ELEMENTS
        const hearts = document.getElementById('hearts-container');
        if (hearts) hearts.style.display = 'flex';
        this.showMinimap();
    }

    showTutorialInstruction(text) {
        if (!this.tutorialBox) {
            this.tutorialBox = document.createElement('div');
            this.tutorialBox.id = 'tutorial-box';
            this.tutorialBox.style.position = 'fixed';
            this.tutorialBox.style.top = '20%';
            this.tutorialBox.style.left = '50%';
            this.tutorialBox.style.transform = 'translate(-50%, -50%)';
            this.tutorialBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.tutorialBox.style.padding = '20px 40px';
            this.tutorialBox.style.borderRadius = '10px';
            this.tutorialBox.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            this.tutorialBox.style.color = '#00ffcc';
            this.tutorialBox.style.fontFamily = 'sans-serif';
            this.tutorialBox.style.fontSize = '24px';
            this.tutorialBox.style.textAlign = 'center';
            this.tutorialBox.style.zIndex = '4000';
            this.tutorialBox.style.pointerEvents = 'none';
            this.tutorialBox.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.2)';
            document.body.appendChild(this.tutorialBox);
        }
        this.tutorialBox.innerHTML = text;
        this.tutorialBox.style.display = 'block';

        this.tutorialBox.animate([
            { transform: 'translate(-50%, -50%) scale(0.95)', opacity: 0.9 },
            { transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1 }
        ], {
            duration: 1000,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out'
        });
    }

    hideTutorialInstruction() {
        if (this.tutorialBox) {
            this.tutorialBox.style.display = 'none';
            this.tutorialBox.getAnimations().forEach(anim => anim.cancel());
        }
    }

    showTitle(title, subtitle, duration = 5000) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '40%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.textAlign = 'center';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '4500';
        container.style.textShadow = '0 0 20px rgba(0,0,0,0.8)';

        const h1 = document.createElement('h1');
        h1.innerText = title;
        h1.style.color = 'white';
        h1.style.fontFamily = 'Cinzel, serif';
        h1.style.fontSize = '80px';
        h1.style.margin = '0';
        h1.style.opacity = '0';
        h1.style.transform = 'scale(0.8)';
        h1.style.transition = 'all 2s ease-out';

        const p = document.createElement('p');
        p.innerText = subtitle || "";
        p.style.color = '#ffaa00';
        p.style.fontFamily = 'Cinzel, serif';
        p.style.fontSize = '30px';
        p.style.margin = '10px 0 0 0';
        p.style.opacity = '0';
        p.style.transform = 'translateY(20px)';
        p.style.transition = 'all 2s ease-out 0.5s';

        if (!subtitle) p.style.display = 'none';

        container.appendChild(h1);
        container.appendChild(p);
        document.body.appendChild(container);

        requestAnimationFrame(() => {
            h1.style.opacity = '1';
            h1.style.transform = 'scale(1)';
            p.style.opacity = '1';
            p.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            container.style.transition = 'opacity 2s';
            container.style.opacity = '0';
            setTimeout(() => container.remove(), 2000);
        }, duration);
    }
}
