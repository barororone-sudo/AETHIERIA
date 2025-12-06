import * as THREE from 'three';

export class MapManager {
    constructor(game) {
        this.game = game;
        this.container = null;
        this.content = null; // The Zoomable Wrapper
        this.terrainLayer = null;
        this.fogCanvas = null;
        this.fogCtx = null;
        this.iconLayer = null;

        this.mapSize = 2000; // World Size in Pixels (1:1 with World Units)
        this.worldSize = 2000; // World units
        this.scale = this.mapSize / this.worldSize; // 1.0

        this.icons = new Map(); // Map of object ID -> DOM Element
        this.isBigMap = false;

        // Quest Marker Logic
        this.activeQuestMarker = null; // { x, z }

        // View State (Replaces old transform/offset logic)
        this.viewState = {
            x: 0,
            y: 0,
            scale: 1.0
        };

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.viewStateStart = { x: 0, y: 0 }; // Snapshot for dragging

        // Pending icons to load
        this.pendingIcons = [];
    }

    setQuestMarker(x, z) {
        this.activeQuestMarker = { x, z };
    }

    removeQuestMarker() {
        this.activeQuestMarker = null;
    }

    init() {
        console.log("MapManager: Initializing (New Architecture)...");

        // 1. Create Container
        const existing = document.getElementById('minimap-container');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'minimap-container';
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'absolute';
        this.container.style.display = 'none'; // Hidden by default (Waiting for Game Start)
        this.container.style.zIndex = '1000'; // Standard UI z-index

        // Default Minimap Styles are in CSS
        document.body.appendChild(this.container);

        // 2. Create Content Wrapper (THE KEY PARENT)
        // This element receives the Transform (Scale/Translate)
        this.content = document.createElement('div');
        this.content.id = 'map-content';
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.width = `${this.mapSize}px`; // Match Map Size
        this.content.style.height = `${this.mapSize}px`;
        this.content.style.transformOrigin = '0 0'; // Scale from top-left logic
        this.container.appendChild(this.content);

        // 3. Create Layers INSIDE Content
        const layerStyle = {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
        };

        // Terrain
        this.terrainLayer = document.createElement('img');
        this.terrainLayer.id = 'map-layer-terrain';
        this.terrainLayer.src = this.generateMapTexture();
        Object.assign(this.terrainLayer.style, layerStyle);
        this.terrainLayer.style.zIndex = '1';
        this.content.appendChild(this.terrainLayer);

        // Fog
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.id = 'map-layer-fog';
        this.fogCanvas.width = this.mapSize;
        this.fogCanvas.height = this.mapSize;
        Object.assign(this.fogCanvas.style, layerStyle);
        this.fogCanvas.style.zIndex = '5'; // Fog ABOVE Terrain(1), BELOW Icons(10)
        this.content.appendChild(this.fogCanvas);

        // 5. Interactions
        this.setupInteractions();

        // 6. Process Pending / Existing Towers

        // Icons Layer (Where all markers live)
        this.iconLayer = document.createElement('div');
        this.iconLayer.id = 'map-layer-icons';
        Object.assign(this.iconLayer.style, layerStyle);
        this.iconLayer.style.zIndex = '10';
        // CRITICAL: Content is parent. Icons follow content's transform automatically.
        this.content.appendChild(this.iconLayer);

        // 4. Setup Fog Context
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.fogCtx.fillStyle = '#000000';
        this.fogCtx.fillRect(0, 0, this.mapSize, this.mapSize);

        // 5. Interactions
        // 6. Process Pending / Existing Towers
        if (this.pendingIcons) {
            this.pendingIcons.forEach(item => {
                if (item.type === 'tower') this.addTowerIcon(item.tower, item.index);
            });
            this.pendingIcons = [];
        }
        // Load Existing Towers from World
        if (this.game.world && this.game.world.towers) {
            this.game.world.towers.forEach((tower, index) => {
                if (!tower.icon) this.addTowerIcon(tower, index);
            });
        }
    }

    setupInteractions() {
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e)); // Window for smooth drag outside
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
        this.container.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable context menu
    }

    // --- ZOOM MATH (CRITIQUE) ---
    onWheel(e) {
        if (!this.isBigMap) return;
        e.preventDefault();
        // console.log("Map Wheel Event:", e.deltaY); // DEBUG INPUT

        // Get Mouse Position relative to Container (Viewport)
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = this.viewState.scale;
        const zoomSpeed = 0.2;

        // Calculate New Scale
        let newScale = oldScale - Math.sign(e.deltaY) * zoomSpeed;
        newScale = Math.max(0.5, Math.min(newScale, 4.0)); // Clamp

        // Math: Preserve the point under mouse
        // NewTx = MouseX - ( (MouseX - OldTx) / OldScale ) * NewScale
        const oldTx = this.viewState.x;
        const oldTy = this.viewState.y;

        const newTx = mouseX - ((mouseX - oldTx) / oldScale) * newScale;
        const newTy = mouseY - ((mouseY - oldTy) / oldScale) * newScale;

        // Apply
        this.viewState.scale = newScale;
        this.viewState.x = newTx;
        this.viewState.y = newTy;
    }

    // --- PANNING ---
    onMouseDown(e) {
        if (!this.isBigMap) return;
        this.isDragging = true;
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;

        // Snapshot current view state
        this.viewStateStart.x = this.viewState.x;
        this.viewStateStart.y = this.viewState.y;

        this.container.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.isBigMap) return;

        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;

        // Update ViewState directly
        this.viewState.x = this.viewStateStart.x + dx;
        this.viewState.y = this.viewStateStart.y + dy;
    }

    onMouseUp(e) {
        this.isDragging = false;
        if (this.isBigMap) this.container.style.cursor = '';
    }

    // --- CORE UPDATE ---
    update(dt) {
        if (!this.game.player || !this.container || !this.content) return;

        // 0. Update Scale Var for Icons (InvScale)
        if (this.iconLayer) {
            this.iconLayer.style.setProperty('--map-scale', this.isBigMap ? this.viewState.scale : 1);
        }

        // 1. Update Icon Positions (Pure Map Coords)
        this.updatePlayerIcon();
        this.updateEnemyIcons();

        // Quest Marker
        if (this.activeQuestMarker) {
            let icon = this.icons.get('quest_marker');
            if (!icon) {
                icon = document.createElement('div');
                icon.className = 'map-icon-quest';
                Object.assign(icon.style, {
                    width: '16px', height: '16px',
                    backgroundColor: 'gold',
                    border: '2px solid white',
                    borderRadius: '50%',
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '20',
                    pointerEvents: 'none',
                    boxShadow: '0 0 10px gold'
                });
                this.iconLayer.appendChild(icon);
                this.icons.set('quest_marker', icon);
            }

            const pos = this.worldToMap(this.activeQuestMarker.x, this.activeQuestMarker.z);
            icon.style.left = `${pos.x}px`;
            icon.style.top = `${pos.y}px`;

            // Inverse Scale
            const scale = this.isBigMap ? this.viewState.scale : 1;
            const invScale = 1 / Math.max(0.1, scale);
            icon.style.transform = `translate(-50%, -50%) scale(${invScale})`; // Keep constant size
        } else {
            const icon = this.icons.get('quest_marker');
            if (icon) {
                icon.remove();
                this.icons.delete('quest_marker');
            }
        }

        if (this.revealAnimation) this.updateRevealAnimation(dt);

        // 2. LOD / CSS
        if (this.viewState.scale > 1.5) {
            this.container.classList.add('zoom-high');
        } else {
            this.container.classList.remove('zoom-high');
        }

        // 3. Apply Transform
        if (this.isBigMap) {
            // Big Map: Use Manual ViewState (Free Cam)
            this.content.style.transform = `translate3d(${this.viewState.x}px, ${this.viewState.y}px, 0) scale(${this.viewState.scale})`;
        } else {
            // Minimap: Center on Player automatically
            const cw = this.container.clientWidth;
            const ch = this.container.clientHeight;

            const p = this.game.player.mesh.position;
            const mapPos = this.worldToMap(p.x, p.z);

            // Center: ScreenCenter - MapPos
            const tx = (cw / 2) - mapPos.x;
            const ty = (ch / 2) - mapPos.y;

            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1)`;
        }
    }

    // --- ICONS (STRICT POSITIONING) ---
    updatePlayerIcon() {
        if (!this.game.player) return;
        let icon = this.icons.get('player');
        if (!icon) {
            icon = document.createElement('div');
            icon.className = 'map-icon-player';
            Object.assign(icon.style, {
                width: '0', height: '0',
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '10px solid #00ff00',
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                zIndex: '100',
                filter: 'drop-shadow(0 0 2px black)',
                pointerEvents: 'none'
            });
            this.iconLayer.appendChild(icon);
            this.icons.set('player', icon);
        }

        const p = this.game.player.mesh.position;
        const pos = this.worldToMap(p.x, p.z);

        // PURE MAP COORDS (0 to 2000)
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        const rotation = this.game.player.mesh.rotation.y;
        // Inverse Scale for Player Icon manually
        const scale = this.isBigMap ? this.viewState.scale : 1;
        const invScale = 1 / Math.max(0.1, scale);
        icon.style.transform = `translate(-50%, -50%) rotate(${-rotation + Math.PI}rad) scale(${invScale})`;
    }

    updateEnemyIcons() {
        const enemies = this.game.world.enemies || [];
        enemies.forEach((enemy, index) => {
            if (enemy.isDead) { // Check dead... }
                const el = this.icons.get(`enemy-${index}`);
                if (el) { el.remove(); this.icons.delete(`enemy-${index}`); }
                return;
            }

            let icon = this.icons.get(`enemy-${index}`);

            if (!icon) {
                icon = document.createElement('div');
                icon.className = 'map-icon-enemy'; // FOR CSS TARGETING
                Object.assign(icon.style, {
                    width: '8px', height: '8px',
                    backgroundColor: 'red',
                    borderRadius: '50%',
                    position: 'absolute',
                    transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))', // CSS Var InvScale
                    zIndex: '5',
                    pointerEvents: 'none',
                    boxShadow: '0 0 4px red'
                });
                this.iconLayer.appendChild(icon);
                this.icons.set(`enemy-${index}`, icon);
            }

            const pos = this.worldToMap(enemy.body.position.x, enemy.body.position.z);
            icon.style.left = `${pos.x}px`;
            icon.style.top = `${pos.y}px`;
        });
    }

    addTowerIcon(tower, index) {
        if (!this.iconLayer) {
            if (!this.pendingIcons) this.pendingIcons = [];
            this.pendingIcons.push({ type: 'tower', tower, index });
            return;
        }

        const icon = document.createElement('div');
        icon.className = 'map-icon-tower';
        Object.assign(icon.style, {
            width: '12px', height: '12px',
            backgroundColor: 'red',
            border: '2px solid white',
            borderRadius: '2px',
            borderRadius: '2px',
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '8',
            pointerEvents: 'none'
        });
        this.iconLayer.appendChild(icon);
        tower.icon = icon;

        const pos = this.worldToMap(tower.position.x, tower.position.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;
    }

    unlockTower(tower) {
        // console.log("Unlocking Tower Icon...", tower);
        if (tower.icon) {
            tower.icon.style.backgroundColor = '#00ccff';
            tower.icon.style.boxShadow = '0 0 10px #00ccff';
            tower.icon.style.zIndex = '20';
        } else {
            console.warn("Tower has no icon to unlock!", tower);
        }
        // Force immediate large reveal
        this.revealZone(tower.position.x, tower.position.z, 150);
    }

    // --- UTILS ---
    worldToMap(x, z) {
        const offsetX = x + this.worldSize / 2;
        const offsetZ = z + this.worldSize / 2;
        return {
            x: offsetX * this.scale,
            y: offsetZ * this.scale
        };
    }

    generateMapTexture() {
        const res = 2048;
        const canvas = document.createElement('canvas');
        canvas.width = res; canvas.height = res;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#112233'; // Default Ocean
        ctx.fillRect(0, 0, res, res);

        if (!this.game.world.terrainManager) return canvas.toDataURL();

        const tm = this.game.world.terrainManager;
        const imgData = ctx.getImageData(0, 0, res, res);
        const data = imgData.data;

        for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
                const wx = (x / res) * this.worldSize - this.worldSize / 2;
                const wz = (y / res) * this.worldSize - this.worldSize / 2;
                const h = tm.getHeightAt(wx, wz);
                const biome = tm.getBiomeAt(wx, wz);

                let r = 0, g = 0, b = 0;
                if (h < 1.8) { r = 60; g = 120; b = 200; }
                else if (h < 3.0) { r = 210; g = 190; b = 130; }
                else {
                    switch (biome) {
                        case 'SNOW': r = 240; g = 240; b = 250; break;
                        case 'MOUNTAIN': r = 100; g = 100; b = 100; break;
                        case 'DESERT': r = 200; g = 170; b = 100; break;
                        case 'FOREST': r = 30; g = 100; b = 30; break;
                        default: r = 80; g = 160; b = 80;
                    }
                    const shade = 1.0 - (h / 100) * 0.2;
                    r *= shade; g *= shade; b *= shade;
                }
                const idx = (y * res + x) * 4;
                data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL();
    }

    revealZone(x, z, r) {
        if (!this.fogCtx) return;
        // console.log(`Map: Revealing Zone at (${x}, ${z}) R=${r}`);
        const pos = this.worldToMap(x, z);
        const mapR = r * this.scale;

        this.fogCtx.save();
        this.fogCtx.globalCompositeOperation = 'destination-out';
        this.fogCtx.fillStyle = 'rgba(0,0,0,1)';

        // Organic Shape (Jagged Polygon)
        this.fogCtx.beginPath();
        const points = 32; // Amount of jagged points
        // Use position to seed the shape rotation/offset so towers look different
        const seed = (x + z) * 0.01;

        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;

            // Formula: Base R * (0.8 + 0.3 * noisy_wave)
            // Using cos(angle * 5) creates a 5-pointed star-like blob
            // Adding seed ensures uniqueness per tower
            const variance = Math.cos(angle * 7 + seed) * 0.2 + Math.sin(angle * 3) * 0.1;
            const currentR = mapR * (0.9 + variance);

            const px = pos.x + Math.cos(angle) * currentR;
            const py = pos.y + Math.sin(angle) * currentR;

            if (i === 0) this.fogCtx.moveTo(px, py);
            else this.fogCtx.lineTo(px, py);
        }

        this.fogCtx.closePath();
        this.fogCtx.fill();
        this.fogCtx.globalCompositeOperation = 'source-over';
        this.fogCtx.restore();
    }

    animateReveal(x, z, r, duration = 1.0, onComplete = null) {
        // Calculate speed based on duration
        const speed = r / duration;
        // Init currentRadius to 0 explicitly
        this.revealAnimation = { x, z, currentRadius: 0, targetRadius: r, speed, onComplete };
    }

    updateRevealAnimation(dt) {
        if (!this.revealAnimation) return;

        // Ensure dt is valid
        const animDt = (dt && !isNaN(dt)) ? dt : 0.016;

        const anim = this.revealAnimation;
        anim.currentRadius += anim.speed * animDt;

        if (anim.currentRadius >= anim.targetRadius) {
            anim.currentRadius = anim.targetRadius;
            this.revealZone(anim.x, anim.z, anim.currentRadius);

            // Execute Callback (Unlock Tower etc.)
            if (anim.onComplete) anim.onComplete();

            this.revealAnimation = null;
        } else {
            this.revealZone(anim.x, anim.z, anim.currentRadius);
        }
    }

    toggleMap(force) {
        if (!this.container) return;
        // console.log(`TOGGLE MAP CALLED. Current: ${this.isBigMap}, Force: ${force}`);

        if (force !== undefined && force !== null) this.isBigMap = force;
        else this.isBigMap = !this.isBigMap;

        if (this.isBigMap) {
            // FORCE Visibility Sequence
            // FORCE LAYOUT (Manual Override with !important)
            this.container.style.cssText = `
                display: block !important;
                z-index: 2000 !important;
                opacity: 1 !important;
                width: 80% !important;
                width: 80% !important;
                height: 80% !important;
                top: 10% !important;
                left: 10% !important;
                bottom: auto !important;
                right: auto !important;
                border-radius: 20px !important;
                position: absolute !important;
                background: rgba(0,0,0,0.8);
                border: 2px solid white !important;
            `;
            this.container.style.display = 'block'; // Force override
            // Release mouse for map interaction
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            // Initial Centering on Player for ViewState
            // Fallback to Window Size if container isn't ready
            const cw = this.container.clientWidth || (window.innerWidth * 0.8);
            const ch = this.container.clientHeight || (window.innerHeight * 0.8);

            if (this.game.player && this.game.player.mesh) {
                const p = this.game.player.mesh.position;
                const mapPos = this.worldToMap(p.x, p.z);

                this.viewState.scale = 1.0;
                this.viewState.x = (cw / 2) - mapPos.x;
                this.viewState.y = (ch / 2) - mapPos.y;
            }

            if (this.game.ui) this.game.ui.showToast("MOLETTE: Zoom | GLISSER: Déplacer");
        } else {
            this.container.classList.remove('big-map-active');

            // CLEAR OVERRIDES (Restores CSS class defaults like Border)
            this.container.style.cssText = '';

            this.container.style.display = 'block'; // Ensure it stays visible as minimap

            // RESET LAYOUT TO MINIMAP
            this.container.style.width = '200px';
            this.container.style.height = '200px';
            this.container.style.top = 'auto'; // Clear top
            this.container.style.left = 'auto'; // Clear left
            this.container.style.bottom = '20px';
            this.container.style.right = '20px';
            this.container.style.borderRadius = '50%';
        }
    }

    playMapUnlockAnimation() {
        // Visual Flare Effect on Minimap?
        // For now, let's just do a big reveal pulse
        if (this.container) {
            this.container.style.transition = 'box-shadow 0.5s ease-out';
            this.container.style.boxShadow = '0 0 50px 20px #00ccff';
            setTimeout(() => {
                this.container.style.boxShadow = '';
            }, 1000);
        }
        this.revealZone(0, 0, 1000);
    }

    show() {
        if (this.container) this.container.style.display = 'block';
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
    }
}
