// js/UI.js
import * as THREE from 'three';
import { ItemsDb, ItemCategory } from './data/ItemsDb.js';
import { MapManager } from './managers/MapManager.js';

export class UIManager {
    /**
     * @param {import('./main.js').Game} game
     */
    constructor(game) {
        this.game = game;
        this.mapManager = new MapManager(game);

        this.isOpen = false;
        this.activeTab = 'ALL';

        // --- CRITICAL DOM ELEMENTS ---
        this.menu = document.getElementById('pause-menu');
        if (!this.menu) {
            console.error("Pause Menu element not found!");
            // Create it if missing for robustness
            this.menu = document.createElement('div');
            this.menu.id = 'pause-menu';
            document.body.appendChild(this.menu);
        }

        // Initialize Styles and UI Components
        this.initStyles();
        this.createMenuStructure();

        // Core features
        this.initInput();
        this.initBossUI();
        this.initCrosshair();
        // Fullscreen button removed
        this.initHUD();
        this.initQuestUI(); // Quest UI
    }

    // --- INITIALIZATION ---

    initStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #pause-menu {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85); /* Overlay Dim */
                z-index: 2000;
                justify-content: center;
                align-items: center;
                border: none; /* No border on overlay */
            }
            #pause-menu.visible {
                display: flex;
            }
            .pause-menu-container {
                display: flex;
                flex-direction: row; /* Side by side */
                gap: 50px;
                width: 80vw;
                height: 80vh;
                min-width: 800px;
                min-height: 600px;
                background: rgba(20, 20, 25, 0.95);
                padding: 40px;
                border-radius: 15px;
                color: white;
                border: 3px solid #8b4513; /* The ONE border */
                box-shadow: 0 0 50px rgba(0,0,0,0.8);
            }
            /* Tabs */
            .inventory-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                padding-bottom: 10px;
            }
            .inv-tab {
                background: none;
                border: 1px solid rgba(255,255,255,0.1);
                color: #aaa;
                padding: 10px 20px;
                cursor: pointer;
                font-family: 'Cinzel', serif;
                font-weight: bold;
                transition: all 0.2s;
            }
            .inv-tab:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            .inv-tab.active {
                border-color: #ffd700;
                color: #ffd700;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
            }
            /* Grid */
            #inventory-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); /* Bigger slots */
                gap: 10px;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border-radius: 5px;
                overflow-y: auto;
                flex: 1; /* Fill remaining space */
            }
            .inventory-slot {
                width: 80px; height: 80px;
                background: rgba(255,255,255,0.05);
                border: 2px solid #555;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                position: relative;
                transition: all 0.1s;
            }
            .inventory-slot:hover {
                border-color: white;
                background: rgba(255,255,255,0.1);
                transform: scale(1.05);
            }
            /* Action Buttons */
            .btn-action {
                display: block;
                width: 100%;
                padding: 15px;
                margin-bottom: 15px;
                background: transparent;
                border: 1px solid white;
                color: white;
                font-size: 18px;
                cursor: pointer;
                text-align: left;
                padding-left: 30px;
                transition: all 0.2s;
            }
            .btn-action:hover {
                background: rgba(255,255,255,0.1);
                padding-left: 40px;
                border-color: #ffd700;
                color: #ffd700;
            }
            .btn-quit { border-color: #ff3333; color: #ff9999; }
            .btn-quit:hover { background: rgba(255,0,0,0.1); border-color: red; }
        `;
        document.head.appendChild(style);
    }

    createMenuStructure() {
        this.menu.innerHTML = `
            <div class="pause-menu-container">
                <!-- Left: Buttons -->
                <div style="flex: 1;">
                    <h1 style="color:white; font-family:'Cinzel', serif; margin-bottom:40px;">PAUSE</h1>
                    <button id="resume-btn" class="btn-action">REPRENDRE</button>
                    <button id="save-btn" class="btn-action">SAUVEGARDER</button>
                    <button id="download-btn" class="btn-action">TÉLÉCHARGER</button>
                    <button id="quit-btn" class="btn-action btn-quit">QUITTER</button>
                </div>

                <!-- Right: Inventory -->
                <div style="flex: 2; display: flex; flex-direction: column;">
                    <div class="inventory-tabs">
                        <button class="inv-tab active" data-tab="ALL">TOUT</button>
                        <button class="inv-tab" data-tab="WEAPON">ARMES</button>
                        <button class="inv-tab" data-tab="CONSUMABLE">SOIN</button>
                        <button class="inv-tab" data-tab="MATERIAL">MATÉRIAUX</button>
                    </div>
                    <div id="inventory-grid"></div>
                    
                    <div style="margin-top: 20px; color: #aaa; font-style: italic;" id="inv-desc">
                        Sélectionnez un objet pour l'utiliser.
                    </div>
                    
                    <div id="stats-content" style="margin-top: auto; border-top: 1px solid #444; padding-top: 10px; color: white;">
                        <!-- Stats injected here -->
                    </div>
                </div>
            </div>
        `;

        // Bind Buttons
        document.getElementById('resume-btn').onclick = () => this.toggleMenu();
        document.getElementById('save-btn').onclick = () => this.saveGame();
        document.getElementById('download-btn').onclick = () => this.downloadSave();
        document.getElementById('quit-btn').onclick = () => location.reload();

        // Bind Tabs
        const tabs = this.menu.querySelectorAll('.inv-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.updateInventory(); // Refresh with new filter
            };
        });

        // Refs
        this.grid = document.getElementById('inventory-grid');
        this.stats = document.getElementById('stats-content');
    }

    // --- FEATURES REQUESTED ---

    initFullscreen() {
        // Hardcoded Button creation
        const btn = document.createElement('div');
        btn.id = 'fullscreen-btn-hardcoded';

        // Critical Style
        Object.assign(btn.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '100000',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid white',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '24px',
            userSelect: 'none'
        });

        btn.innerHTML = '⛶'; // Expand Icon

        // Event
        btn.onclick = (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
            // Update Icon state
            setTimeout(() => {
                btn.innerHTML = document.fullscreenElement ? '✕' : '⛶';
            }, 100);
        };

        document.body.appendChild(btn);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Erreur plein écran: ${err.message}`);
                this.showToast("Erreur Plein Écran: Bloqué par le navigateur", 'error');
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    }

    updateInventory() {
        if (!this.grid || !this.game.player) return;

        this.grid.innerHTML = '';
        const slots = this.game.player.inventory.slots;

        slots.forEach((slot, index) => {
            if (!slot) return;

            const item = this.game.data.getItem(slot.id);
            if (!item) return;

            // --- FILTER LOGIC ---
            let show = false;
            switch (this.activeTab) {
                case 'ALL':
                    show = true;
                    break;
                case 'WEAPON':
                    show = (item.category === ItemCategory.WEAPON);
                    break;
                case 'CONSUMABLE':
                    // User asked for "SOIN" -> Consumable + Food
                    show = (item.category === ItemCategory.CONSUMABLE || item.category === ItemCategory.FOOD);
                    break;
                case 'MATERIAL':
                    show = (item.category === ItemCategory.MATERIAL || item.category === ItemCategory.MATERIAL_WEAPON || item.category === ItemCategory.QUEST);
                    break;
            }

            if (!show) return;

            // --- RENDER ---
            const el = document.createElement('div');
            el.className = 'inventory-slot';
            el.innerHTML = `<div style="font-size: 24px;">${item.icon || (item.category === 'WEAPON' ? '⚔️' : '📦')}</div>`;
            el.title = item.name;

            // Count or Level
            if (slot.count > 1) {
                const count = document.createElement('div');
                count.innerText = slot.count;
                Object.assign(count.style, {
                    position: 'absolute', bottom: '2px', right: '4px',
                    fontSize: '12px', fontWeight: 'bold', color: 'white', textShadow: '0 0 2px black'
                });
                el.appendChild(count);
            } else if (item.category === 'WEAPON' && slot.properties) {
                const lvl = document.createElement('div');
                lvl.innerText = `L${slot.properties.level || 1}`;
                Object.assign(lvl.style, {
                    position: 'absolute', bottom: '2px', right: '4px',
                    fontSize: '10px', fontWeight: 'bold', color: '#f1c40f', textShadow: '0 0 2px black'
                });
                el.appendChild(lvl);
            }

            // Rarity Border
            const colors = { 1: '#fff', 2: '#2ecc71', 3: '#3498db', 4: '#9b59b6', 5: '#f1c40f' };
            el.style.borderColor = colors[item.rarity] || '#555';

            // Interaction
            el.onclick = (e) => {
                if (e.shiftKey && item.category === ItemCategory.WEAPON) {
                    this.game.player.inventory.upgradeWeapon(index);
                } else {
                    this.game.player.inventory.useItem(index);
                }
                this.updateInventory(); // Refresh
                this.renderStats();
            };

            this.grid.appendChild(el);
        });

        if (this.grid.children.length === 0) {
            this.grid.innerHTML = `<div style="color:gray; grid-column: 1/-1; text-align:center;">Aucun objet dans cette catégorie.</div>`;
        }

        // Update Description Text
        const desc = document.getElementById('inv-desc');
        if (desc) desc.innerText = "Clic pour utiliser/équiper. Shift+Clic pour améliorer (Coût: Minerai).";
    }

    renderStats() {
        const p = this.game.player;
        if (!p || !this.stats) return;

        this.stats.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <div>Niveau: <strong>${p.level}</strong></div>
                <div>XP: <strong>${Math.floor(p.exp)} / ${p.expToNextLevel}</strong></div>
                <div>HP: <strong>${Math.floor(p.hp)}</strong></div>
                <div>Stamina: <strong>${Math.floor(p.stamina)}</strong></div>
                <div>Attaque: <strong>${p.stats.attack}</strong></div>
                <div>Défense: <strong>${p.stats.defense}</strong></div>
            </div>
        `;
    }

    // --- OTHER CORE UI METHODS (PRESERVED) ---

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyI' || e.code === 'Tab') {
                e.preventDefault(); // Prevent tab focus switch
                this.toggleMenu();
            }
            if (e.code === 'KeyM') {
                this.toggleMap();
            }
            if (e.code === 'KeyJ') {
                this.toggleQuestJournal();
            }
        });

        // Sync with Input Class
        if (this.game.input) {
            this.game.input.onToggleJournal = () => this.toggleQuestJournal();
        }
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;

        // Use CSS class instead of inline style
        if (this.isOpen) {
            this.menu.classList.add('visible');
            document.exitPointerLock();
            this.updateInventory();
            this.renderStats();
            if (this.mapManager) this.mapManager.hide();
            // Blur canvas
            const c = document.querySelector('canvas');
            if (c) c.style.filter = 'blur(5px)';
        } else {
            this.menu.classList.remove('visible');
            // Unblur
            const c = document.querySelector('canvas');
            if (c) c.style.filter = 'none';
            if (this.mapManager) this.mapManager.show();
        }
    }

    saveGame() {
        if (this.game.saveManager) {
            this.game.saveManager.save();
            this.showToast("Partie Sauvegardée !");
        }
    }

    // --- HUD ---

    initHUD() {
        const old = document.getElementById('hud-player');
        if (old) old.remove();

        const container = document.createElement('div');
        container.id = 'hud-player';
        Object.assign(container.style, {
            position: 'absolute', top: '20px', left: '20px',
            display: 'flex', gap: '15px', alignItems: 'center', zIndex: '1000'
        });

        // Level Bubble
        const level = document.createElement('div');
        Object.assign(level.style, {
            width: '40px', height: '40px', borderRadius: '50%',
            background: '#34495e', border: '2px solid white',
            color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontWeight: 'bold', fontSize: '18px', boxShadow: '0 0 10px black'
        });
        level.innerText = '1';
        this.hudLevel = level;
        container.appendChild(level);

        // Bars Group
        const group = document.createElement('div');
        group.style.display = 'flex';
        group.style.flexDirection = 'column';
        group.style.gap = '5px';

        // HP
        const hpBar = this.createBar(300, 20, '#e74c3c', '#c0392b');
        this.hudHp = hpBar.fill;
        this.hudHpText = hpBar.text;
        group.appendChild(hpBar.container);

        // XP
        const xpBar = this.createBar(200, 16, '#f1c40f', '#f39c12');
        this.hudXp = xpBar.fill;
        group.appendChild(xpBar.container);

        // Add text to XP manually since helper is generic
        this.hudXpText = document.createElement('div');
        Object.assign(this.hudXpText.style, {
            position: 'absolute', width: '100%', textAlign: 'center', fontSize: '10px', color: 'white', textShadow: '0 1px 1px black'
        });
        xpBar.container.appendChild(this.hudXpText);

        container.appendChild(group);
        document.body.appendChild(container);

        // Shake CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes hud-shake { 0% { transform: translate(1px, 1px); } 10% { transform: translate(-1px, -2px); } 20% { transform: translate(-3px, 0px); } 30% { transform: translate(3px, 2px); } 40% { transform: translate(1px, -1px); } 50% { transform: translate(-1px, 2px); } 60% { transform: translate(-3px, 1px); } 70% { transform: translate(3px, 1px); } 80% { transform: translate(-1px, -1px); } 90% { transform: translate(1px, 2px); } 100% { transform: translate(1px, -2px); } }
            .hud-shaking { animation: hud-shake 0.5s; }
        `;
        document.head.appendChild(style);
    }

    createBar(w, h, c1, c2) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            width: w + 'px', height: h + 'px', background: 'rgba(0,0,0,0.6)',
            borderRadius: '4px', overflow: 'hidden', position: 'relative', border: '1px solid #555'
        });

        const fill = document.createElement('div');
        Object.assign(fill.style, {
            width: '100%', height: '100%', background: `linear-gradient(90deg, ${c1}, ${c2})`,
            transition: 'width 0.2s'
        });
        container.appendChild(fill);

        const text = document.createElement('div');
        Object.assign(text.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'white', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 2px black'
        });
        container.appendChild(text);

        return { container, fill, text };
    }

    updateHUD(player) {
        if (!this.hudHp) this.initHUD();

        // Level
        this.hudLevel.innerText = player.level;

        // HP
        const hpPct = (player.hp / player.maxHp) * 100;
        this.hudHp.style.width = `${Math.max(0, hpPct)}%`;
        this.hudHpText.innerText = `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;

        // XP
        const xpPct = (player.exp / player.expToNextLevel) * 100; // Simplified calculation
        this.hudXp.style.width = `${Math.min(100, Math.max(0, xpPct))}%`;
        this.hudXpText.innerText = `${Math.floor(player.exp)} / ${player.expToNextLevel}`; // Add explicit text

        // Shake
        if (this.lastHp && player.hp < this.lastHp) {
            const h = document.getElementById('hud-player');
            if (h) {
                h.classList.remove('hud-shaking');
                void h.offsetWidth;
                h.classList.add('hud-shaking');
            }
        }
        this.lastHp = player.hp;
    }

    update(dt) {
        const p = this.game.player;
        if (p) {
            this.updateHUD(p);
            this.updateStamina(p.stamina, p.maxStamina);
            if (this.crosshair && p.combat) {
                this.crosshair.style.display = p.combat.isAiming ? 'block' : 'none';
            }
        }
        if (this.mapManager) this.mapManager.update(dt);
        this.updateQuestIndicators();
    }

    // --- STAMINA ---
    initStaminaWheel() {
        this.staminaContainer = document.createElement('div');
        this.staminaContainer.style.position = 'absolute';
        this.staminaContainer.style.display = 'none';
        this.staminaContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.staminaContainer);
    }

    updateStamina(current, max) {
        if (!this.staminaContainer) this.initStaminaWheel();

        // Simple Circular Bar
        if (current >= max) {
            this.staminaContainer.style.display = 'none';
            return;
        }

        this.staminaContainer.style.display = 'block';
        const pct = current / max;
        const color = pct < 0.2 ? '#e74c3c' : '#2ecc71';

        // SVG
        const r = 20;
        const c = 2 * Math.PI * r;
        const dash = c * pct; // Length of stroke

        this.staminaContainer.innerHTML = `
            <svg width="50" height="50" style="transform: rotate(-90deg);">
                <circle cx="25" cy="25" r="${r}" stroke="rgba(0,0,0,0.5)" stroke-width="5" fill="none" />
                <circle cx="25" cy="25" r="${r}" stroke="${color}" stroke-width="5" fill="none" 
                    stroke-dasharray="${c}" stroke-dashoffset="${c - dash}" />
            </svg>
        `;

        // Position above player HEAD
        if (this.game.player && this.game.player.mesh) {
            const pos = this.game.player.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0));
            pos.project(this.game.camera);
            const x = (pos.x * .5 + .5) * window.innerWidth;
            const y = (-(pos.y * .5) + .5) * window.innerHeight;
            this.staminaContainer.style.left = `${x - 25}px`;
            this.staminaContainer.style.top = `${y - 25}px`;
        }
    }

    // --- UTILS ---

    showToast(msg, type = 'info') {
        // Find or create toast container
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            Object.assign(container.style, {
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', gap: '10px', zIndex: '10000', pointerEvents: 'none'
            });
            document.body.appendChild(container);
        }

        const t = document.createElement('div');
        t.innerText = msg;

        // Style based on type
        let bg = 'rgba(0, 0, 0, 0.9)';
        let border = '1px solid #444';
        let icon = '';

        if (type === 'success') { bg = 'rgba(46, 204, 113, 0.9)'; border = '1px solid #2ecc71'; icon = '✅ '; }
        else if (type === 'error') { bg = 'rgba(231, 76, 60, 0.9)'; border = '1px solid #c0392b'; icon = '❌ '; }
        else if (type === 'quest') { bg = 'rgba(212, 175, 55, 0.9)'; border = '1px solid #f1c40f'; icon = '📜 '; }

        t.innerHTML = `<strong>${icon}</strong> ${msg}`;

        Object.assign(t.style, {
            background: bg, border: border,
            color: 'white', padding: '15px 30px', borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            fontFamily: "'Segoe UI', sans-serif", fontSize: '18px',
            opacity: '0', transform: 'translateY(-20px)', transition: 'all 0.4s ease'
        });

        container.appendChild(t);

        // Animate In
        requestAnimationFrame(() => {
            t.style.opacity = '1';
            t.style.transform = 'translateY(0)';
        });

        // Remove
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-20px)';
            setTimeout(() => t.remove(), 400);
        }, 3000);
    }

    showQuestUpdate(title, status) {
        let msg = '';
        if (status === 'STARTED') msg = `Nouvelle Quête : ${title}`;
        else if (status === 'UPDATED') msg = `Mise à jour : ${title}`;
        else if (status === 'COMPLETED') msg = `Quête Terminée : ${title}`;
        this.showToast(msg, status === 'COMPLETED' ? 'success' : 'quest');
    }

    initCrosshair() {
        this.crosshair = document.createElement('div');
        Object.assign(this.crosshair.style, {
            position: 'absolute', top: '50%', left: '50%', width: '4px', height: '4px',
            background: 'white', border: '1px solid black', borderRadius: '50%',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'none'
        });
        document.body.appendChild(this.crosshair);
    }

    // --- QUEST JOURNAL ---

    initQuestJournal() {
        const modal = document.createElement('div');
        modal.id = 'quest-journal';
        // Base Style
        Object.assign(modal.style, {
            display: 'none', position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh', background: 'rgba(10, 10, 15, 0.95)',
            zIndex: '6000', color: '#ecf0f1', fontFamily: "'Cinzel', serif"
        });

        // Layout
        modal.innerHTML = `
            <div style="display: flex; width: 80%; height: 80%; margin: 5% auto; background: rgba(0,0,0,0.5); border: 2px solid #555; border-radius: 10px; overflow: hidden; box-shadow: 0 0 50px rgba(0,0,0,0.8);">
                <!-- Left: Quest List -->
                <div class="quest-list-panel" style="width: 35%; border-right: 1px solid #555; background: rgba(30,30,40,0.8); padding: 20px; overflow-y: auto;">
                    <h2 style="color: #ffd700; border-bottom: 2px solid #555; padding-bottom: 10px; margin-top: 0;">Journal de Quêtes</h2>
                    <h3 style="color: #aaa; margin-top: 20px;">En cours</h3>
                    <div id="quest-list-active" style="display: flex; flex-direction: column; gap: 5px;"></div>
                    
                    <h3 style="color: #aaa; margin-top: 20px;">Terminées</h3>
                    <div id="quest-list-completed" style="display: flex; flex-direction: column; gap: 5px;"></div>
                </div>

                <!-- Right: Details -->
                <div class="quest-details-panel" style="width: 65%; padding: 40px; background: url('assets/textures/paper_texture.jpg') no-repeat center/cover; color: #222; position: relative;">
                    <!-- Overlay for readability if texture missing -->
                    <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(240, 230, 210, 0.9); z-index: 0;"></div>
                    
                    <div id="quest-details-content" style="position: relative; z-index: 1;">
                        <div style="text-align: center; margin-top: 20%; color: #666; font-style: italic;">
                            Sélectionnez une quête pour voir les détails...
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Close Hint -->
            <div style="position: absolute; bottom: 30px; width: 100%; text-align: center; color: #888; font-family: sans-serif;">
                Appuyez sur [J] pour fermer
            </div>
        `;

        document.body.appendChild(modal);
    }

    toggleQuestJournal() {
        const journal = document.getElementById('quest-journal');
        if (!journal) {
            this.initQuestJournal();
            this.toggleQuestJournal(); // Retry
            return;
        }

        const isVisible = journal.style.display !== 'none';

        if (isVisible) {
            journal.style.display = 'none';
            document.exitPointerLock(); // Usually we want lock back, but clicking involves mouse.
            // Game usually handles lock on click.
        } else {
            journal.style.display = 'block';
            this.updateQuestJournal();
            document.exitPointerLock(); // Unlock for mouse control
        }
    }

    updateQuestJournal() {
        const activeList = document.getElementById('quest-list-active');
        const completedList = document.getElementById('quest-list-completed');
        const detailsPanel = document.getElementById('quest-details-content');

        if (!activeList || !completedList) return;

        activeList.innerHTML = '';
        completedList.innerHTML = '';

        const generateItem = (quest, active) => {
            const div = document.createElement('div');
            div.innerText = (active ? '🔹 ' : '✔ ') + quest.title;
            Object.assign(div.style, {
                padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px',
                cursor: 'pointer', transition: 'background 0.2s', fontSize: '16px'
            });
            div.onmouseover = () => div.style.background = 'rgba(255,255,255,0.1)';
            div.onmouseout = () => div.style.background = 'rgba(255,255,255,0.05)';
            div.onclick = () => this.showQuestDetails(quest, active);
            return div;
        };

        // Active
        this.game.questManager.activeQuests.forEach(q => activeList.appendChild(generateItem(q, true)));

        // Completed (IDs only in compeltedQuests, need to fetch data)
        this.game.questManager.completedQuests.forEach(qid => {
            // Find data (assuming simple getter integration or just basics)
            // Ideally QuestManager should provide full objects for history, or we fetch from DB.
            // Using QuestManager.completedQuests which is array of IDs.
            // We need to fetch from DataManager or DB.
            const qData = this.game.data.getQuest(qid);
            if (qData) completedList.appendChild(generateItem(qData, false));
        });
    }

    showQuestDetails(quest, isActive) {
        const container = document.getElementById('quest-details-content');
        if (!container) return;

        let stepsHtml = '';
        if (quest.steps) {
            stepsHtml = quest.steps.map(s => {
                const status = s.isCompleted ? '✅' : '⬜';
                const progress = s.targetCount ? ` (${s.currentCount || 0}/${s.targetCount})` : '';
                return `<div style="margin-bottom: 8px; font-size: 18px;">${status} ${s.description} <strong>${progress}</strong></div>`;
            }).join('');
        }

        let rewardsHtml = '';
        if (quest.rewards) {
            if (quest.rewards.exp) rewardsHtml += `<span>✨ ${quest.rewards.exp} XP</span> `;
            if (quest.rewards.gold) rewardsHtml += `<span>💰 ${quest.rewards.gold} Or</span> `;
        }

        container.innerHTML = `
            <h1 style="border-bottom: 2px solid #8b4513; padding-bottom: 10px; color: #5d4037;">${quest.title}</h1>
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px;">${quest.description || "Aucune description disponible."}</p>
            
            <h3 style="color: #8b4513;">Objectifs :</h3>
            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 5px; margin-bottom: 30px;">
                ${stepsHtml}
            </div>

            <h3 style="color: #8b4513;">Récompenses :</h3>
            <div style="font-weight: bold; font-size: 20px; color: #2ecc71;">
                ${rewardsHtml}
            </div>
            
            ${!isActive ? '<div style="margin-top: 30px; text-align: right; color: #27ae60; font-weight: bold; font-size: 24px;">QUEST COMPLETE</div>' : ''}
        `;
    }

    // --- INDICATORS ---

    updateQuestIndicators() {
        // Only track PRIMARY active quest for now (HUD focus)
        const qm = this.game.questManager;
        if (!qm) return;
        const activeQuest = qm.getActiveQuest();
        if (!activeQuest) {
            this.hideIndicator();
            return;
        }

        const currentStep = activeQuest.steps.find(s => !s.isCompleted);
        if (!currentStep || !currentStep.targetPos) {
            this.hideIndicator();
            return;
        }

        // Lazy Init Indicator
        if (!this.questIndicator) {
            this.questIndicator = document.createElement('div');
            this.questIndicator.className = 'quest-indicator';
            this.questIndicator.style.position = 'absolute';
            this.questIndicator.style.width = '40px';
            this.questIndicator.style.height = '40px';
            this.questIndicator.style.backgroundImage = 'none'; // 'url("assets/ui/arrow_gold.png")'; 
            // Fallback CSS Arrow if image missing
            this.questIndicator.innerHTML = '<div style="width:0; height:0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 20px solid #f1c40f; filter: drop-shadow(0 0 2px black);"></div>';
            this.questIndicator.style.display = 'none';
            this.questIndicator.style.zIndex = '900';
            this.questIndicator.style.pointerEvents = 'none';
            this.questIndicator.style.display = 'flex';
            this.questIndicator.style.justifyContent = 'center';
            this.questIndicator.style.alignItems = 'center';
            document.body.appendChild(this.questIndicator);
        }

        const target = new THREE.Vector3(currentStep.targetPos.x, currentStep.targetPos.y, currentStep.targetPos.z);
        const screenPos = target.clone().project(this.game.camera);

        const isOffScreen = screenPos.x < -0.9 || screenPos.x > 0.9 || screenPos.y < -0.9 || screenPos.y > 0.9 || screenPos.z > 1; // Margin 0.9

        if (isOffScreen) {
            this.questIndicator.style.display = 'flex';

            // Calculate Edge Position
            // If z > 1, it's behind. Invert x/y to point correctly?
            let x = screenPos.x;
            let y = screenPos.y;

            if (screenPos.z > 1) {
                x = -x;
                y = -y; // Invert logic for behind
                // But we want it on opposite edge?
                // Actually if behind, we usually just lock to bottom or top depending on pitch.
                // Simple version: Treat as far off on inverted vector
            }

            // Clamp to edge
            // Slope m = y/x
            // Intersect with x=1, x=-1, y=1, y=-1
            // We want the point on the box [-0.95, 0.95]

            const limit = 0.95;

            // Normalize to Max Component
            const max = Math.max(Math.abs(x), Math.abs(y));
            x /= max;
            y /= max;

            x *= limit;
            y *= limit;

            // Convert to Screen Coords (0..window)
            // screenPos is -1..1
            const screenX = (x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-(y * 0.5) + 0.5) * window.innerHeight;

            this.questIndicator.style.left = `${screenX - 20}px`;
            this.questIndicator.style.top = `${screenY - 20}px`;

            // Rotation
            const angle = Math.atan2(-x, -y); // Point towards center? No, point OUTWARDS or towards target?
            // Usually arrow points TO target.
            // If clamped to Right edge, arrow points Right.
            // Vector from Center (0,0) to Clamped (x,y) is direction TO target roughly.
            // Standard atan2(y, x). Y is inverted in CSS logic (Top=0).
            // Let's rely on angle from center.
            const rot = Math.atan2(-y, x) * 180 / Math.PI; // -y because CSS Y is down
            // 0 deg is Right.
            // Arrow points specific way. My arrow is Up-pointing triangle.
            // If active is Right (x=1, y=0), angle is 0. Arrow should point Right (90deg).
            // So +90 offset.

            const btn = this.questIndicator.children[0];
            if (btn) btn.style.transform = `rotate(${90 - rot}deg)`;

        } else {
            this.questIndicator.style.display = 'none'; // In view, beacon handles it
        }
    }

    hideIndicator() {
        if (this.questIndicator) this.questIndicator.style.display = 'none';
    }

    initMinimap() { if (this.mapManager) this.mapManager.init(); }
    showMinimap() { if (this.mapManager) this.mapManager.show(); }
    toggleMap() { if (this.mapManager) this.mapManager.toggleMap(); }

    showDamage(position, amount, isCritical, colorOverride = null) {
        const el = document.createElement('div');
        el.innerText = Math.floor(amount);
        Object.assign(el.style, {
            position: 'absolute',
            color: colorOverride || (isCritical ? '#FFD700' : 'white'),
            fontSize: isCritical ? '32px' : '20px',
            fontWeight: 'bold',
            textShadow: '0 0 5px black',
            pointerEvents: 'none',
            transition: 'top 1s, opacity 1s',
            zIndex: '1000'
        });

        const vector = position.clone();
        vector.project(this.game.camera);
        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.top = `${y - 100}px`;
            el.style.opacity = '0';
            if (isCritical) el.style.transform = 'scale(1.5)';
        });
        setTimeout(() => el.remove(), 1000);
    }

    /**
     * Show floating text in 3D space (for Reactions)
     */
    showFloatingText(position, text, color = '#ffffff', scale = 1.0) {
        const el = document.createElement('div');
        el.innerText = text;
        Object.assign(el.style, {
            position: 'absolute',
            color: color,
            fontSize: `${20 * scale}px`,
            fontWeight: 'bold',
            fontFamily: 'Cinzel, serif',
            textShadow: '0 0 5px black',
            pointerEvents: 'none',
            transition: 'top 1.5s, opacity 1.5s',
            zIndex: '1000',
            whiteSpace: 'nowrap'
        });

        const vector = position.clone();
        vector.project(this.game.camera);
        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;

        // Center the text
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translate(-50%, -50%)';

        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.top = `${y - 150}px`; // Float higher than damage
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%, -50%) scale(1.2)';
        });
        setTimeout(() => el.remove(), 1500);
    }

    initQuestUI() {
        this.questContainer = document.createElement('div');
        Object.assign(this.questContainer.style, {
            position: 'absolute', top: '80px', left: '20px',
            color: 'white', fontFamily: 'Cinzel, serif', fontSize: '18px',
            textShadow: '0 0 5px black', pointerEvents: 'none', zIndex: '900'
        });

        const title = document.createElement('div');
        title.innerText = 'OBJECTIF ACTUEL';
        title.style.color = '#ffd700'; // Gold
        title.style.fontSize = '14px';
        title.style.marginBottom = '5px';
        this.questContainer.appendChild(title);

        this.questText = document.createElement('div');
        this.questText.innerText = '-';
        this.questContainer.appendChild(this.questText);

        document.body.appendChild(this.questContainer);
    }

    updateQuestObjective(text) {
        if (!this.questContainer) this.initQuestUI();
        this.questText.innerText = text;

        // Pulse effect
        this.questText.style.transform = 'scale(1.1)';
        this.questText.style.color = '#ffffaa';
        setTimeout(() => {
            this.questText.style.transform = 'scale(1.0)';
            this.questText.style.color = 'white';
        }, 300);
    }

    initBossUI() {
        this.bossContainer = document.createElement('div');
        Object.assign(this.bossContainer.style, {
            position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)',
            width: '500px', textAlign: 'center', display: 'none'
        });
        this.bossContainer.innerHTML = `
            <h3 id="boss-name" style="color:#e74c3c; margin:0; text-shadow:0 0 5px black;">BOSS</h3>
            <div style="width:100%; height:15px; background:rgba(0,0,0,0.8); border:1px solid #555;">
                <div id="boss-bar-fill" style="width:100%; height:100%; background:#c0392b; transition:width 0.2s;"></div>
            </div>
        `;
        document.body.appendChild(this.bossContainer);
    }

    updateBossBar(hp, maxHp, name) {
        this.bossContainer.style.display = 'block';
        document.getElementById('boss-name').innerText = name;
        document.getElementById('boss-bar-fill').style.width = `${(hp / maxHp) * 100}%`;
    }

    hideBossBar() { this.bossContainer.style.display = 'none'; }

    // --- PRESERVED STORY UI ---

    showTitle(title) { this.showToast(title); /* Simplified fallback or keep full impl if needed */ }

    showCinematicText(text, duration) {
        // Reuse toast for simplicity or re-implement overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'black', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '6000',
            color: 'white', fontSize: '24px', fontFamily: 'serif'
        });
        overlay.innerText = text;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), duration);
    }

    hideCinematicOverlay() {
        // Logic to clear overlays
        const o = document.getElementById('loading-overlay');
        if (o) o.remove();
        this.showMinimap();
    }

    showTutorialInstruction(text) { this.showToast("TUTORIAL: " + text); }
    hideTutorialInstruction() { }

    playSound(id) { if (this.game.audio) this.game.audio.playSFX(id); }

    /**
     * Initialize Quest UI elements
     */
    initQuestUI() {
        // Create Quest HUD (objective display)
        this.questHud = document.createElement('div');
        this.questHud.id = 'quest-hud';
        this.questHud.className = 'hidden';
        document.body.appendChild(this.questHud);

        // Create Quest Toast (notification banner)
        this.questToast = document.createElement('div');
        this.questToast.id = 'quest-toast';
        this.questToast.innerHTML = `
            <div class="quest-title"></div>
            <div class="quest-status"></div>
        `;
        document.body.appendChild(this.questToast);
    }

    /**
     * Update quest objective display
     */
    updateObjective(text) {
        if (!this.questHud) return;

        if (text) {
            this.questHud.textContent = text;
            this.questHud.classList.remove('hidden');
        } else {
            this.questHud.classList.add('hidden');
        }
    }

    /**
     * Show quest notification banner
     */
    showQuestUpdate(title, status) {
        if (!this.questToast) return;

        const titleEl = this.questToast.querySelector('.quest-title');
        const statusEl = this.questToast.querySelector('.quest-status');

        titleEl.textContent = title;

        // Set status text and color
        let statusText = '';
        let statusClass = '';

        switch (status) {
            case 'STARTED':
                statusText = 'QUÊTE DÉMARRÉE';
                statusClass = 'started';
                break;
            case 'UPDATED':
                statusText = 'OBJECTIF MIS À JOUR';
                statusClass = 'updated';
                break;
            case 'COMPLETED':
                statusText = 'QUÊTE TERMINÉE';
                statusClass = 'completed';
                break;
        }

        statusEl.textContent = statusText;

        // Reset classes
        this.questToast.className = '';
        this.questToast.classList.add(statusClass);

        // Show animation
        setTimeout(() => {
            this.questToast.classList.add('show');
        }, 100);

        // Hide after 4 seconds
        setTimeout(() => {
            this.questToast.classList.remove('show');
        }, 4000);
    }

    // --- SLOT SELECTION (Zelda TOTK Style) ---
    async createSlotSelectionUI(slots) {
        // Overlay principal
        const overlay = document.createElement('div');
        overlay.id = 'slot-selection-overlay';
        overlay.className = 'zelda-save-screen';

        // Titre
        const title = document.createElement('h1');
        title.className = 'zelda-title';
        title.textContent = 'AETHERIA';
        overlay.appendChild(title);

        // Conteneur des boutons principaux
        const mainButtons = document.createElement('div');
        mainButtons.className = 'main-buttons';

        // Bouton Continuer
        const lastSlot = await this.game.saveManager.findLastUsedSlot();
        const continueBtn = this.createZeldaButton('CONTINUER', 'primary', async () => {
            if (lastSlot) {
                this.game.saveManager.selectSlot(lastSlot.id);
                overlay.remove();
                await this.game.start(true);
            }
        });

        if (!lastSlot) {
            continueBtn.disabled = true;
            continueBtn.classList.add('disabled');
        }

        mainButtons.appendChild(continueBtn);

        // Bouton Nouvelle Partie
        const newGameBtn = this.createZeldaButton('NOUVELLE PARTIE', 'secondary', () => {
            const emptySlot = slots.find(s => !s.exists) || slots[0];
            this.game.saveManager.selectSlot(emptySlot.id);
            overlay.remove();
            this.game.start(false);
        });
        mainButtons.appendChild(newGameBtn);

        overlay.appendChild(mainButtons);

        // Grille de profils
        const profileGrid = document.createElement('div');
        profileGrid.className = 'profile-grid';

        for (const slot of slots) {
            const card = this.createProfileCard(slot, overlay);
            profileGrid.appendChild(card);
        }

        overlay.appendChild(profileGrid);
        document.body.appendChild(overlay);
    }

    createZeldaButton(text, type, onClick) {
        const btn = document.createElement('button');
        btn.className = `zelda-btn zelda-btn-${type}`;
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    }

    createProfileCard(slot, overlay) {
        const card = document.createElement('div');
        card.className = slot.exists ? 'profile-card filled' : 'profile-card empty';

        if (slot.exists) {
            // Carte remplie
            card.innerHTML = `
                <div class="profile-header">
                    <div class="profile-icon">⚔️</div>
                    <div class="profile-title">PROFIL ${slot.id}</div>
                    <button class="delete-btn" title="Supprimer">✕</button>
                </div>
                <div class="profile-body">
                    <div class="profile-level">Niveau ${slot.level}</div>
                    <div class="profile-playtime">${this.game.saveManager.formatPlaytime(slot.playtime)}</div>
                    <div class="profile-location">${slot.location}</div>
                    <div class="profile-date">${slot.date}</div>
                </div>
            `;

            // Bouton supprimer
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.onclick = async (e) => {
                console.log('🗑️ Delete button clicked for slot:', slot.id);
                e.stopPropagation();
                e.preventDefault();
                if (confirm(`Supprimer le Profil ${slot.id} ?`)) {
                    console.log('✅ User confirmed deletion');
                    await this.game.saveManager.deleteSlot(slot.id);
                    overlay.remove();
                    const newSlots = await this.game.saveManager.getSlotsInfo();
                    await this.createSlotSelectionUI(newSlots);
                }
            };

            // Clic sur la carte
            card.onclick = () => {
                this.game.saveManager.selectSlot(slot.id);
                overlay.remove();
                this.game.start(true);
            };
        } else {
            // Carte vide
            card.innerHTML = `
                <div class="profile-empty-icon">+</div>
                <div class="profile-empty-text">Nouveau Profil</div>
            `;

            card.onclick = () => {
                this.game.saveManager.selectSlot(slot.id);
                overlay.remove();
                this.game.start(false);
            };
        }

        return card;
    }

    hideMainMenu() {
        const overlay = document.getElementById('slot-selection-overlay');
        if (overlay) overlay.remove();
    }
    downloadSave() {
        // Sauvegarder d'abord pour s'assurer que les données sont à jour
        if (this.game.saveManager) {
            this.game.saveManager.save();
        }

        // Récupérer la sauvegarde du slot actuel
        const currentKey = this.game.saveManager.getCurrentKey();
        const data = localStorage.getItem(currentKey);

        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Nom de fichier avec slot et timestamp
            const slotId = this.game.saveManager.currentSlotId;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `aetheria_slot${slotId}_${timestamp}.json`;

            a.click();
            URL.revokeObjectURL(url);

            this.showToast("Sauvegarde téléchargée !");
        } else {
            this.showToast("Aucune sauvegarde trouvée", 'error');
        }
    }

    // --- GAME OVER SCREEN ---

    showGameOver() {
        if (!this.gameOverScreen) {
            this.gameOverScreen = document.createElement('div');
            Object.assign(this.gameOverScreen.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'black', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', zIndex: '9999',
                opacity: '0', transition: 'opacity 1s ease-in'
            });

            const title = document.createElement('h1');
            title.innerText = 'GAME OVER';
            Object.assign(title.style, {
                color: 'red', fontFamily: 'Cinzel, serif', fontSize: '100px', margin: '0',
                textShadow: '0 0 20px darkred'
            });
            this.gameOverScreen.appendChild(title);

            const sub = document.createElement('p');
            sub.innerText = 'Le destin attendra...';
            Object.assign(sub.style, {
                color: 'grey', fontFamily: 'Cinzel, serif', fontSize: '24px', margin: '20px 0'
            });
            this.gameOverScreen.appendChild(sub);

            document.body.appendChild(this.gameOverScreen);
        }

        // Trigger Fade In
        this.gameOverScreen.style.display = 'flex';
        // Force reflow
        this.gameOverScreen.offsetHeight;
        this.gameOverScreen.style.opacity = '1';
    }

    hideGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.style.opacity = '0';
            setTimeout(() => {
                this.gameOverScreen.style.display = 'none';
            }, 1000);
        }
    }
}
