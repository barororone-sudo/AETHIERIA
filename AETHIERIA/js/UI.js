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

        // Inject Menu HTML dynamically to ensure it exists
        this.menu.innerHTML = `
            <div class="menu-container glass-panel" style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 40px;">
                <h1 style="color: white; text-shadow: 0 0 10px #fff; font-size: 48px; margin: 0;">PAUSED</h1>
                <div style="display: flex; gap: 40px; align-items: flex-start;">
                        <button id="resume-btn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px;">RESUME</button>
                        <button id="save-btn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px;">SAVE GAME</button>
                        <button id="download-btn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px;">DOWNLOAD SAVE</button>
                        <button id="quit-btn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px;">QUIT TO TITLE</button>
                    </div>
                    <div class="inventory-section" style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px;">
                        <h2 style="color: #ddd; margin-top: 0;">INVENTORY</h2>
                        <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(4, 50px); gap: 5px;"></div>
                    </div>
                    <div class="stats-section" style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px;">
                        <h2 style="color: #ddd; margin-top: 0;">STATS</h2>
                        <div id="stats-content" style="color: #aaa;"></div>
                    </div>
                </div>
            </div>
        `;

        // Re-style menu container
        this.menu.style.display = 'none';
        this.menu.style.position = 'fixed';
        this.menu.style.top = '0';
        this.menu.style.left = '0';
        this.menu.style.width = '100%';
        this.menu.style.height = '100%';
        this.menu.style.background = 'rgba(0,0,0,0.8)';
        this.menu.style.zIndex = '1000';
        this.menu.style.justifyContent = 'center';
        this.menu.style.alignItems = 'center';

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
        this.createMainMenu();

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

    createSlotSelectionUI() {
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

        // Create Slots dynamically (Async)
        this.game.saveManager.getSlotsInfo().then(slotsInfo => {
            slotsInfo.forEach(info => {
                const cardWrapper = document.createElement('div');
                cardWrapper.style.position = 'relative';

                const card = document.createElement('div');
                card.className = 'slot-card'; // For keyboard navigation selector
                card.setAttribute('tabindex', '0'); // Make focusable
                card.style.width = '250px';
                card.style.height = '350px';
                card.style.background = 'linear-gradient(180deg, rgba(30,30,40,1) 0%, rgba(20,20,30,1) 100%)';
                card.style.border = '2px solid #444';
                card.style.borderRadius = '15px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.alignItems = 'center';
                card.style.justifyContent = 'center';
                card.style.cursor = 'pointer';
                card.style.transition = 'all 0.3s';
                card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                card.style.overflow = 'hidden';

                // Hover Effect
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-10px) scale(1.05)';
                    card.style.border = '2px solid #ffd700';
                    card.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3)';
                };
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0) scale(1.0)';
                    card.style.border = '2px solid #444';
                    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                };

                // Content
                const slotTitle = document.createElement('h2');
                slotTitle.innerText = `PARTIE ${info.id}`;
                slotTitle.style.color = '#aaa';
                slotTitle.style.marginBottom = '20px';
                card.appendChild(slotTitle);

                if (info.exists) {
                    // Info
                    const details = document.createElement('div');
                    details.style.textAlign = 'center';
                    details.style.color = 'white';
                    details.innerHTML = `
                    <p style="font-size: 24px; color: #ffd700; margin: 10px 0;">Niveau ${info.level}</p>
                    <p style="font-size: 14px; color: #888; margin: 5px 0;">${info.location}</p>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">${info.date}</p>
                `;
                    card.appendChild(details);

                    // Trash Button (Outside Card to avoid click conflict, or inside with stopPropagation)
                    const trashBtn = document.createElement('button');
                    trashBtn.innerHTML = '🗑️';
                    trashBtn.style.position = 'absolute';
                    trashBtn.style.top = '-10px';
                    trashBtn.style.right = '-10px';
                    trashBtn.style.width = '40px';
                    trashBtn.style.height = '40px';
                    trashBtn.style.borderRadius = '50%';
                    trashBtn.style.border = 'none';
                    trashBtn.style.background = '#ff4444';
                    trashBtn.style.color = 'white';
                    trashBtn.style.fontSize = '20px';
                    trashBtn.style.cursor = 'pointer';
                    trashBtn.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
                    trashBtn.style.display = 'flex';
                    trashBtn.style.alignItems = 'center';
                    trashBtn.style.justifyContent = 'center';
                    trashBtn.style.zIndex = '10';

                    trashBtn.onclick = async (e) => {
                        e.stopPropagation(); // Prevent card click
                        if (confirm(`Supprimer la sauvegarde Partie ${info.id} ? Cette action est irréversible.`)) {
                            await this.game.saveManager.deleteSlot(info.id);
                            // Refresh UI
                            container.remove();
                            this.createSlotSelectionUI();
                        }
                    };
                    cardWrapper.appendChild(trashBtn);

                } else {
                    // Empty
                    const empty = document.createElement('div');
                    empty.innerText = '+ Nouvelle Partie';
                    empty.style.color = '#666';
                    empty.style.fontSize = '20px';
                    empty.style.border = '2px dashed #444';
                    empty.style.padding = '20px';
                    empty.style.borderRadius = '10px';
                    card.appendChild(empty);
                }

                // Click Handler (Select Slot)
                card.onclick = () => {
                    this.game.saveManager.selectSlot(info.id);

                    container.style.opacity = '0';
                    setTimeout(() => container.remove(), 500);

                    this.createMainMenu();
                };

                cardWrapper.appendChild(card);
                slotsContainer.appendChild(cardWrapper);
            });
        }); // End Promise

        document.body.appendChild(container);
        this.setupKeyboardNavigation(container);
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
            document.exitPointerLock();
            this.renderInventory();
            this.renderStats();

            // Blur Effect
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.style.filter = 'blur(5px)';

            this.menu.style.backgroundColor = 'rgba(20, 20, 30, 0.8)'; // Paimon Style Dark Blue
            this.menu.style.backdropFilter = 'blur(10px)';
        } else {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.style.filter = 'none';

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
            <p><strong>HP:</strong> ${Math.floor(p.hp)} / ${p.maxHp}</p>
            <p><strong>Stamina:</strong> ${Math.floor(p.stamina)} / ${p.maxStamina}</p>
            <p><strong>ATK:</strong> ${p.stats.attack}</p>
            <p><strong>ATK:</strong> ${p.stats.attack}</p>
            <p><strong>DEF:</strong> ${p.stats.defense}</p>
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

    update(dt) {
        const p = this.game.player;
        if (p) {
            this.updateStamina(p.stamina, p.maxStamina);
            this.updateHearts(p.hp, p.maxHp);
        }

        // Update Crosshair Visibility
        if (this.game.player.combat) {
            this.crosshair.style.display = this.game.player.combat.isAiming ? 'block' : 'none';
        }

        // Update Minimap
        this.updateMinimap(dt);
    }

    revealRegion(x, z, radius) {
        if (this.mapManager) {
            this.mapManager.revealZone(x, z, radius);
            this.showToast("Map Updated: Region Revealed");
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
                case 'Space':
                case 'KeyF': // Added F key support
                    buttons[currentIndex].click();
                    e.preventDefault();
                    break;
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
    }
}
