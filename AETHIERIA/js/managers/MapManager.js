import * as THREE from 'three';

export class MapManager {
    constructor(game) {
        this.game = game;
        this.container = null;
        this.content = null; // Wrapper for scrolling
        this.terrainLayer = null;
        this.fogCanvas = null;
        this.fogCtx = null;
        this.iconLayer = null;

        this.mapSize = 2000; // Full World Size in Pixels (1:1 with World Units)
        this.worldSize = 2000; // World units
        this.scale = this.mapSize / this.worldSize; // 1.0

        this.icons = new Map(); // Map of object ID -> DOM Element
        this.isBigMap = false;
    }

    init() {
        console.log("MapManager: Initializing...");

        // 1. Create Container Dynamically
        const existing = document.getElementById('minimap-container');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'minimap-container';
        document.body.appendChild(this.container);

        // 2. Create Content Wrapper (The Scrolling Part)
        this.content = document.createElement('div');
        this.content.id = 'map-content';
        this.container.appendChild(this.content);

        // 3. Create Layers INSIDE Content
        // Terrain (Canvas generated)
        this.terrainLayer = document.createElement('img');
        this.terrainLayer.id = 'map-layer-terrain';
        this.terrainLayer.src = this.generateMapTexture(); // Generate Procedural Map
        this.content.appendChild(this.terrainLayer);

        // Fog (Canvas)
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.id = 'map-layer-fog';
        this.fogCanvas.width = this.mapSize;
        this.fogCanvas.height = this.mapSize;
        this.content.appendChild(this.fogCanvas);

        // Icons (Div)
        this.iconLayer = document.createElement('div');
        this.iconLayer.id = 'map-layer-icons';
        this.content.appendChild(this.iconLayer);

        // 4. Setup Fog
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.fogCtx.fillStyle = 'black';
        this.fogCtx.fillRect(0, 0, this.mapSize, this.mapSize);

        console.log("MapManager: DOM Injected.");
    }

    generateMapTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = this.mapSize;
        canvas.height = this.mapSize;
        const ctx = canvas.getContext('2d');

        // Helper to convert World Coords to Map Coords
        const toMap = (x, z) => {
            const mx = (x + this.worldSize / 2) * this.scale;
            const my = (z + this.worldSize / 2) * this.scale;
            return { x: mx, y: my };
        };

        // 1. Base Ground (Dirt/Darker Green)
        ctx.fillStyle = '#2d4a2d';
        ctx.fillRect(0, 0, this.mapSize, this.mapSize);

        // 2. Grid Lines (Faint)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 100; // 100 world units = 100 pixels (scale 1)
        for (let x = 0; x <= this.mapSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.mapSize);
            ctx.stroke();
        }
        for (let y = 0; y <= this.mapSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.mapSize, y);
            ctx.stroke();
        }

        // 3. Grass Field (0, 0, 100x100)
        // World: -50 to 50 on X and Z
        const p1 = toMap(-50, -50);
        const p2 = toMap(50, 50);
        const w = p2.x - p1.x;
        const h = p2.y - p1.y;

        ctx.fillStyle = '#4a854a'; // Lighter Green
        ctx.fillRect(p1.x, p1.y, w, h);

        // 4. Arena (0, -40, Radius 20)
        const arenaPos = toMap(0, -40);
        const arenaRadius = 20 * this.scale;
        ctx.fillStyle = '#444444'; // Dark Grey
        ctx.beginPath();
        ctx.arc(arenaPos.x, arenaPos.y, arenaRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Wall (0, -10, 10x20x2 but BoxGeometry is 10,20,2 so width=10, depth=2)
        // Position is center.
        const wallPos = toMap(0, -10);
        const wallW = 10 * this.scale;
        const wallD = 2 * this.scale; // Depth (Z)

        ctx.fillStyle = '#888888'; // Grey
        ctx.fillRect(wallPos.x - wallW / 2, wallPos.y - wallD / 2, wallW, wallD);

        // 6. Towers (Bases)
        // Central (50, 50)
        // NW (-100, 100)
        // SE (150, -50)
        const towers = [
            { x: 50, z: 50 },
            { x: -100, z: 100 },
            { x: 150, z: -50 }
        ];

        ctx.fillStyle = '#550000'; // Dark Red Base
        towers.forEach(t => {
            const pos = toMap(t.x, t.z);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        });

        return canvas.toDataURL();
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    update() {
        if (!this.game.player || !this.game.player.mesh || !this.container || !this.content) return;

        // Update Icons
        this.updatePlayerIcon();
        this.updateEnemyIcons();

        // Handle Reveal Animation
        if (this.revealAnimation) {
            this.updateRevealAnimation();
        }

        // Smooth Zoom
        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        // SCROLLING LOGIC (GPS Style)
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        const cx = cw / 2;
        const cy = ch / 2;

        const p = this.game.player.mesh.position;
        const mapPos = this.worldToMap(p.x, p.z);

        let tx = cx - mapPos.x;
        let ty = cy - mapPos.y;

        if (this.isBigMap) {
            // Use dynamic zoom
            tx = cx - (mapPos.x * this.zoom);
            ty = cy - (mapPos.y * this.zoom);
            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${this.zoom})`;
        } else {
            // Minimap fixed zoom (1.0)
            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        }
    }

    animateReveal(worldX, worldZ, targetRadius, duration = 1.0) {
        this.revealAnimation = {
            x: worldX,
            z: worldZ,
            currentRadius: 0,
            targetRadius: targetRadius,
            speed: targetRadius / duration // units per second
        };
    }

    updateRevealAnimation() {
        if (!this.revealAnimation) return;

        const dt = this.game.clock.getDelta(); // Use clock delta
        // Note: If game is paused, dt might be 0 or main loop might not pass dt to ui.update?
        // main.js calls ui.update() but doesn't pass dt. 
        // We should use a fixed timestep or get dt from game.clock if accessible.
        // But wait, if game.isPaused, main.js skips world.update but runs ui.update.
        // game.clock.getDelta() is called in main.js BEFORE the pause check.
        // So we can't call it again here or we mess up the time.
        // Let's assume 1/60s for UI animation if we can't get real dt, or use a small fixed value.
        const animDt = 0.016;

        const anim = this.revealAnimation;
        anim.currentRadius += anim.speed * animDt * 60; // Speed up a bit for visual flair

        if (anim.currentRadius >= anim.targetRadius) {
            anim.currentRadius = anim.targetRadius;
            this.revealZone(anim.x, anim.z, anim.currentRadius);
            this.revealAnimation = null; // Done
        } else {
            // Draw partial reveal
            this.revealZone(anim.x, anim.z, anim.currentRadius);
        }
    }

    updatePlayerIcon() {
        if (!this.game.player || !this.game.player.mesh) return;
        let icon = this.icons.get('player');
        if (!icon) {
            icon = document.createElement('div');
            icon.className = 'map-icon-player';
            // Style for player icon
            Object.assign(icon.style, {
                width: '10px',
                height: '10px',
                backgroundColor: '#00ff00',
                borderRadius: '50%',
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                border: '2px solid white',
                zIndex: '10'
            });
            this.iconLayer.appendChild(icon);
            this.icons.set('player', icon);
        }

        const p = this.game.player.mesh.position;
        const pos = this.worldToMap(p.x, p.z);

        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        // Rotate icon based on camera angle
        const angle = this.game.player.cameraState ? this.game.player.cameraState.theta : 0;
        icon.style.transform = `translate(-50%, -50%) rotate(${-angle}rad)`;
    }

    updateEnemyIcons() {
        const enemies = this.game.world.enemies || [];

        enemies.forEach((enemy, index) => {
            if (enemy.isDead) {
                const el = this.icons.get(`enemy-${index}`);
                if (el) {
                    el.remove();
                    this.icons.delete(`enemy-${index}`);
                }
                return;
            }

            let icon = this.icons.get(`enemy-${index}`);
            if (!icon) {
                icon = document.createElement('div');
                // Style for enemy icon
                Object.assign(icon.style, {
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'red',
                    borderRadius: '50%',
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '5'
                });
                this.iconLayer.appendChild(icon);
                this.icons.set(`enemy-${index}`, icon);
            }

            const pos = this.worldToMap(enemy.body.position.x, enemy.body.position.z);
            icon.style.left = `${pos.x}px`;
            icon.style.top = `${pos.y}px`;
        });
    }

    revealZone(worldX, worldZ, radius) {
        if (!this.fogCtx) return;

        const pos = this.worldToMap(worldX, worldZ);
        // Scale radius to map size
        const mapRadius = radius * this.scale;

        // Cut out the fog using destination-out
        this.fogCtx.globalCompositeOperation = 'destination-out';

        // Use RECTANGLE (Square)
        this.fogCtx.fillRect(pos.x - mapRadius, pos.y - mapRadius, mapRadius * 2, mapRadius * 2);

        this.fogCtx.globalCompositeOperation = 'source-over';

        console.log(`MapManager: Revealed zone at ${worldX}, ${worldZ} with radius ${radius}`);
    }

    addTowerIcon(tower, index) {
        const icon = document.createElement('div');
        // Style for tower icon
        Object.assign(icon.style, {
            width: '12px',
            height: '12px',
            backgroundColor: 'red', // Locked color
            border: '2px solid white',
            borderRadius: '2px', // Square-ish
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            zIndex: '8'
        });

        this.iconLayer.appendChild(icon);

        // Store reference
        tower.icon = icon;

        // Initial Position
        const pos = this.worldToMap(tower.position.x, tower.position.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;
    }

    unlockTower(tower) {
        if (tower.icon) {
            tower.icon.style.backgroundColor = '#00ccff'; // Unlocked color
        }
        // Reveal a large area around the tower
        this.revealZone(tower.position.x, tower.position.z, 300);
    }

    toggleMap(forceState) {
        if (!this.container) return;

        if (forceState !== undefined && forceState !== null) {
            this.isBigMap = forceState;
        } else {
            this.isBigMap = !this.isBigMap;
        }

        if (this.isBigMap) {
            // OPEN BIG MAP
            this.container.classList.add('big-map-active');

            // PAUSE GAME
            if (this.game) {
                this.game.isPaused = true;
                document.body.style.cursor = 'default';
                document.exitPointerLock();
            }

        } else {
            // CLOSE BIG MAP
            this.container.classList.remove('big-map-active');

            // RESUME GAME
            if (this.game) {
                this.game.isPaused = false;
                document.body.style.cursor = 'none';
                if (document.hasFocus()) {
                    document.body.requestPointerLock().catch(e => console.warn("MapManager PointerLock failed:", e));
                }
            }
        }
        console.log("Map toggled. Big Map:", this.isBigMap, "Paused:", this.game.isPaused);
    }

    worldToMap(x, z) {
        // Map 0,0 is Top-Left
        // World 0,0 is Center
        // World Range: -1000 to 1000 (assuming 2000 worldSize)
        // Map Range: 0 to 2000 (1:1 scale)

        const offsetX = x + this.worldSize / 2;
        const offsetZ = z + this.worldSize / 2;

        const mapX = offsetX * this.scale;
        const mapY = offsetZ * this.scale;

        return { x: mapX, y: mapY };
    }
}
