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
        `;

        const continueBtn = document.createElement('button');
        continueBtn.innerText = 'Continue';
        continueBtn.style.cssText = btnStyle;
        continueBtn.onclick = () => this.game.startGame(true);

        // Check if save exists
        if (!localStorage.getItem('AETHERIA_SAVE_V1')) {
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
            continueBtn.style.cursor = 'not-allowed';
        }

        const newGameBtn = document.createElement('button');
        newGameBtn.innerText = 'New Game';
        newGameBtn.style.cssText = btnStyle;
        newGameBtn.onclick = () => this.game.startGame(false);

        this.mainMenu.appendChild(continueBtn);
        this.mainMenu.appendChild(newGameBtn);

        document.body.appendChild(this.mainMenu);
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
            if (e.code === 'KeyI' || e.code === 'Escape') {
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

            if (document.body.requestPointerLock) {
                document.body.requestPointerLock().catch(e => console.warn("Pointer Lock suppressed:", e));
            }
        }
    }

    renderInventory() {
        this.grid.innerHTML = '';
        const slots = this.game.player.inventory.slots;

        slots.forEach((slot, index) => {
            const el = document.createElement('div');
            el.className = 'inventory-slot';

            if (slot) {
                const item = Items[slot.id];
                el.style.backgroundColor = item.color;
                el.title = item.name;

                const name = document.createElement('span');
                name.innerText = item.name;
                el.appendChild(name);

                if (slot.count > 1) {
                    const count = document.createElement('div');
                    count.className = 'item-count';
                    count.innerText = slot.count;
                    el.appendChild(count);
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

    updateStamina(current, max) {
        if (!this.staminaContainer) {
            // Create if missing (or find existing)
            this.staminaContainer = document.getElementById('stamina-container');
            if (!this.staminaContainer) {
                // Inject if totally missing
                this.staminaContainer = document.createElement('div');
                this.staminaContainer.id = 'stamina-container';
                this.staminaContainer.style.position = 'absolute';
                this.staminaContainer.style.top = '50px';
                this.staminaContainer.style.left = '50px';
                this.staminaContainer.style.width = '200px';
                this.staminaContainer.style.height = '20px';
                this.staminaContainer.style.background = '#333';
                this.staminaContainer.style.border = '2px solid white';
                this.staminaContainer.style.borderRadius = '10px';
                this.staminaContainer.style.overflow = 'hidden';

                const bar = document.createElement('div');
                bar.id = 'stamina-bar';
                bar.style.width = '100%';
                bar.style.height = '100%';
                bar.style.background = '#00ff00';
                bar.style.transition = 'width 0.1s';
                this.staminaContainer.appendChild(bar);

                document.body.appendChild(this.staminaContainer);
            }
        }

        const bar = this.staminaContainer.querySelector('#stamina-bar') || this.staminaContainer.children[0];
        if (bar) {
            const pct = Math.max(0, (current / max) * 100);
            bar.style.width = `${pct}%`;

            // Color change on low stamina
            if (pct < 20) bar.style.background = '#ff0000';
            else bar.style.background = '#00ff00';
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

        // Rebuild if count mismatch (or empty)
        const heartCount = Math.ceil(max / 20); // 20 HP per heart? Or 100 HP = 5 hearts?
        // Let's assume 1 Heart = 20 HP.

        if (this.heartsContainer.children.length !== heartCount) {
            this.heartsContainer.innerHTML = '';
            for (let i = 0; i < heartCount; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart-icon';
                heart.style.width = '30px';
                heart.style.height = '30px';
                heart.style.backgroundImage = 'url("./assets/ui/heart_full.png")'; // Placeholder
                heart.style.backgroundSize = 'contain';
                heart.style.display = 'inline-block';
                heart.style.marginRight = '5px';
                this.heartsContainer.appendChild(heart);
            }
        }

        // Update State (Full/Half/Empty)
        const hearts = this.heartsContainer.children;
        for (let i = 0; i < hearts.length; i++) {
            const heartValue = (i + 1) * 20;
            if (current >= heartValue) {
                hearts[i].style.opacity = '1.0';
                hearts[i].style.filter = 'none';
            } else if (current >= heartValue - 10) {
                hearts[i].style.opacity = '1.0';
                hearts[i].style.filter = 'grayscale(0.5)'; // Half heart visual hack
            } else {
                hearts[i].style.opacity = '0.5';
                hearts[i].style.filter = 'grayscale(1.0)';
            }
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

    update() {
        // Update Crosshair Visibility
        if (this.game.player.combat) {
            this.crosshair.style.display = this.game.player.combat.isAiming ? 'block' : 'none';
        }

        // Update Minimap
        this.updateMinimap();
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

    updateMinimap() {
        if (this.mapManager) {
            this.mapManager.update();
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
}
