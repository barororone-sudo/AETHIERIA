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

        // Interactive State
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentMapCenter = { x: 0, y: 0 }; // Center in Map Coords
    }

    init() {
        console.log("MapManager: Initializing...");

        // 1. Create Container Dynamically
        const existing = document.getElementById('minimap-container');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'minimap-container';
        this.container.style.overflow = 'hidden'; // Ensure content stays within bounds
        this.container.style.position = 'absolute'; // Or fixed, handled by CSS usually but good to enforce if needed
        document.body.appendChild(this.container);

        // 2. Create Content Wrapper (The Scrolling Part)
        this.content = document.createElement('div');
        this.content.id = 'map-content';
        this.content.style.transformOrigin = '0 0'; // Fix Alignment
        this.content.style.width = `${this.mapSize}px`;
        this.content.style.height = `${this.mapSize}px`;
        this.container.appendChild(this.content);

        // 3. Create Layers INSIDE Content
        // Common Style for Layers to ensure perfect overlay
        const layerStyle = {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%'
        };

        // Terrain (Canvas generated)
        this.terrainLayer = document.createElement('img');
        this.terrainLayer.id = 'map-layer-terrain';
        this.terrainLayer.src = this.generateMapTexture(); // Generate Procedural Map
        Object.assign(this.terrainLayer.style, layerStyle);
        this.terrainLayer.style.zIndex = '1';
        this.content.appendChild(this.terrainLayer);

        // Fog (Canvas)
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.id = 'map-layer-fog';
        this.fogCanvas.width = this.mapSize;
        this.fogCanvas.height = this.mapSize;
        Object.assign(this.fogCanvas.style, layerStyle);
        this.fogCanvas.style.zIndex = '2'; // Fog above terrain
        this.content.appendChild(this.fogCanvas);

        // Icons (Div)
        this.iconLayer = document.createElement('div');
        this.iconLayer.id = 'map-layer-icons';
        Object.assign(this.iconLayer.style, layerStyle);
        this.iconLayer.style.zIndex = '10'; // Icons above fog
        this.content.appendChild(this.iconLayer);

        // 4. Setup Fog
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.fogCtx.fillStyle = '#000000'; // Full Black
        this.fogCtx.fillRect(0, 0, this.mapSize, this.mapSize);

        // 5. Event Listeners for Interaction
        this.setupInteractions();

        // 6. Process Pending Icons
        if (this.pendingIcons) {
            this.pendingIcons.forEach(item => {
                if (item.type === 'tower') {
                    this.addTowerIcon(item.tower, item.index);
                }
            });
            this.pendingIcons = [];
        }

        console.log("MapManager: DOM Injected.");
    }

    setupInteractions() {
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
        this.container.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    }

    onMouseDown(e) {
        if (!this.isBigMap) return;
        // Left click (0) or Right click (2)
        this.isDragging = true;
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
        this.dragThresholdExceeded = false; // Reset drag flag
        this.container.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.isBigMap) return;

        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;

        // Check if moved enough to consider it a drag
        if (!this.dragThresholdExceeded && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            this.dragThresholdExceeded = true;
        }

        if (this.dragThresholdExceeded) {
            this.dragStart.x = e.clientX;
            this.dragStart.y = e.clientY;

            // Pan logic
            this.mapOffset.x += dx;
            this.mapOffset.y += dy;
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        if (this.isBigMap) this.container.style.cursor = ''; // Let CSS handle it (grab)

        // If it was a CLICK (not a drag), handle selection
        if (!this.dragThresholdExceeded) {
            this.handleMapClick(e);
        }
    }

    handleMapClick(e) {
        // Calculate World Coordinates from Click
        const rect = this.container.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // We need to reverse the transform applied in update() to get Map Coordinates.
        // update logic:
        // tx = (cx + offset.x) - (center.x * zoom)
        // ScreenX = mapX * zoom + tx

        // Therefore:
        // mapX * zoom = ScreenX - tx
        // mapX = (ScreenX - tx) / zoom

        // Reconstruct tx
        let tx = (cx + this.mapOffset.x) - (this.currentMapCenter.x * this.zoom);
        let ty = (cy + this.mapOffset.y) - (this.currentMapCenter.y * this.zoom);

        const mapPixelX = (clickX - tx) / this.zoom;
        const mapPixelY = (clickY - ty) / this.zoom;

        // Convert Map Pixel to World
        // mapX = (worldX + worldSize/2) * scale
        // worldX = (mapX / scale) - worldSize/2

        // mapSize = 2000, worldSize = 2000 => scale = 1
        const worldX = (mapPixelX / this.scale) - this.worldSize / 2;
        const worldZ = (mapPixelY / this.scale) - this.worldSize / 2;

        console.log(`Map Click: ${worldX.toFixed(2)}, ${worldZ.toFixed(2)}`);
        this.addWaypoint(worldX, worldZ);
    }

    onWheel(e) {
        if (!this.isBigMap) return;
        e.preventDefault();

        // SIMPLIFIED ZOOM (Center Zoom)
        const zoomSpeed = 0.5;
        const oldZoom = this.targetZoom;

        // e.deltaY > 0 means scrolling DOWN (Zoom OUT)
        let newZoom = oldZoom - Math.sign(e.deltaY) * zoomSpeed;

        // Clamp Zoom
        newZoom = Math.max(0.5, Math.min(newZoom, 4.0));

        this.targetZoom = newZoom;

        // CRITICAL FIX: Scale Offset so we stay looking at the same map point
        // Offset_new = Offset_old * (newZoom / oldZoom)

        if (oldZoom > 0) {
            const ratio = newZoom / oldZoom;
            this.mapOffset.x *= ratio;
            this.mapOffset.y *= ratio;
        }
    }

    onContextMenu(e) {
        if (!this.isBigMap) return;
        e.preventDefault();

        // Calculate Map Coordinates
        // Transform screen (clientX, clientY) to Map Coords
        // Center of screen is (cw/2, ch/2)
        // Map Transform is: translate(tx, ty) scale(z)
        // tx = cx - center.x * z + offset.x
        // ty = cy - center.y * z + offset.y

        // Inverse:
        // mapX = (screenX - tx) / z

        // Let's rely on getBoundingClientRect for simplicity if possible, 
        // but transform makes it tricky.
        // Let's use the update logic variables.

        const rect = this.container.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        // Current Transform values (approx)
        // We need exact values. Let's recalculate what they ARE currently.
        // Actually, we can just use the visual offset we set in update()
        // But better to reverse the logic we use in update.

        // Center of map in pixels (relative to top-left of map image)
        // We want to find this.

        // Screen Click relative to center
        const relX = e.clientX - rect.left - cx;
        const relY = e.clientY - rect.top - cy;

        // Adjust for Offset and Zoom
        // screen = (map - center) * zoom + offset
        // (screen - offset) / zoom + center = map

        // Wait, my update logic is:
        // tx = cx - (mapPos.x * zoom) + offset.x
        // So: screenX = cx - mapX * zoom + offset.x
        // mapX * zoom = cx + offset.x - screenX
        // mapX = (cx + offset.x - screenX) / zoom  <-- Wait signs are tricky

        // Let's look at update():
        // tx = cx - (mapPos.x * zoom) + this.mapOffset.x;
        // screenX (relative to container left) = tx + mapPixelX * zoom? No.
        // The content div is moved by tx, ty.
        // Inside content div, map image is at 0,0.
        // So click on content div (local) is map coordinate?
        // Yes, if we get click relative to content div.

        // But content div is transformed.
        // Easier way:
        const mapX = (e.clientX - rect.left - (cx + this.mapOffset.x)) / -this.targetZoom;
        // Let's re-derive:
        // tx = cx - mapX * z + offX
        // screenX = tx + mapX_in_div * z  (if scale was on content)
        // Actually scale is on content.
        // So screenX = tx + click_in_content * z
        // click_in_content = (screenX - tx) / z

        // Let's use the computed transform variables from update()
        // We need to store them or recompute.

        // Let's just use the logic:
        // We want to place a marker at World Coordinates.

        // 1. Get Map Coordinates
        // We know the map center is at (this.currentMapCenter.x, this.currentMapCenter.y)
        // Screen Center corresponds to Map Center + Offset/Zoom?
        // No, in update() we set the transform such that the player (or center) is at screen center.

        // Let's simplify:
        // We have mapOffset which shifts the view.
        // We have zoom.

        // MapX = (e.clientX - rect.left - cx - this.mapOffset.x) / this.targetZoom + this.currentMapCenter.x
        // Wait, signs.
        // If I move map RIGHT (positive offset), I see LEFT part of map.
        // So map coords should decrease.
        // Correct.

        // Let's try:
        // MapPixelX = (e.clientX - rect.left - cx - this.mapOffset.x) / this.targetZoom + this.currentMapCenter.x;
        // MapPixelY = (e.clientY - rect.top - cy - this.mapOffset.y) / this.targetZoom + this.currentMapCenter.y;

        // Actually, let's just use the player position as reference if we haven't panned?
        // But we have panned.

        // Let's use the inverse of the transform we apply in update.
        // In update: transform = translate(tx, ty) scale(z)
        // tx = cx - center.x * z + offset.x

        // clickX = tx + mapPixelX * z
        // mapPixelX = (clickX - tx) / z

        // We need tx.
        // tx = cx - this.currentMapCenter.x * this.targetZoom + this.mapOffset.x;

        const z = this.targetZoom;
        const tx = cx - this.currentMapCenter.x * z + this.mapOffset.x;
        const ty = cy - this.currentMapCenter.y * z + this.mapOffset.y;

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const mapPixelX = (clickX - tx) / z;
        const mapPixelY = (clickY - ty) / z;

        // Convert Map Pixel to World
        // mapX = (worldX + worldSize/2) * scale
        // worldX = (mapX / scale) - worldSize/2

        const worldX = (mapPixelX / this.scale) - this.worldSize / 2;
        const worldZ = (mapPixelY / this.scale) - this.worldSize / 2;

        console.log(`Right Click at Map: ${mapPixelX}, ${mapPixelY} -> World: ${worldX}, ${worldZ}`);

        this.addWaypoint(worldX, worldZ);
    }

    addWaypoint(x, z) {
        // Remove existing waypoint? Or allow multiple? User said "sélection un point". Singular?
        if (this.waypointIcon) {
            this.waypointIcon.remove();
            this.waypointIcon = null;
        }

        // VISUAL REMOVED as per user request ("retire moi les flèche rouge")
        /*
        const icon = document.createElement('div');
        Object.assign(icon.style, {
            width: '10px',
            height: '10px',
            backgroundColor: 'transparent',
            border: '2px solid red',
            borderRadius: '50%', // Circle
            position: 'absolute',
            transform: 'translate(-50%, -50%)', // Center on point
            zIndex: '20',
            boxShadow: '0 0 4px red'
        });

        this.iconLayer.appendChild(icon);
        this.waypointIcon = icon;
        */
        this.waypointPos = { x, z }; // World Coords (Keep logic, hide visual)

        // Update position immediately
        // const pos = this.worldToMap(x, z);
        // if (this.waypointIcon) {
        //    this.waypointIcon.style.left = `${pos.x}px`;
        //    this.waypointIcon.style.top = `${pos.y}px`;
        // }

        console.log("Waypoint added at", x, z);
    }

    generateMapTexture() {
        const resolution = 2048; // High resolution for clarity
        const canvas = document.createElement('canvas');
        canvas.width = resolution;
        canvas.height = resolution;
        const ctx = canvas.getContext('2d');

        // Fill Background (Deep Water)
        ctx.fillStyle = '#1a3c6e'; // Deep Blue
        ctx.fillRect(0, 0, resolution, resolution);

        if (!this.game.world.terrainManager) {
            console.warn("MapManager: TerrainManager not ready for map generation.");
            return canvas.toDataURL();
        }

        const tm = this.game.world.terrainManager;
        const imgData = ctx.getImageData(0, 0, resolution, resolution);
        const data = imgData.data;

        // Iterate pixels
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                // Map Pixel -> World Coordinate
                // Map (0,0) is Top-Left (-1000, -1000 World)
                // Map (512,512) is Bottom-Right (1000, 1000 World)

                const worldX = (x / resolution) * this.worldSize - (this.worldSize / 2);
                const worldZ = (y / resolution) * this.worldSize - (this.worldSize / 2);

                const height = tm.getHeightAt(worldX, worldZ);
                const biome = tm.getBiomeAt(worldX, worldZ);

                let r, g, b;

                // Color Logic
                if (height < 1.8) {
                    // Water/Coast
                    r = 60; g = 120; b = 200; // Blue
                } else if (height < 3.0) {
                    // Beach
                    r = 210; g = 190; b = 130; // Sand
                } else {
                    // Land
                    switch (biome) {
                        case 'SNOW':
                            r = 240; g = 240; b = 250;
                            break;
                        case 'MOUNTAIN':
                            r = 100; g = 100; b = 100;
                            break;
                        case 'DESERT':
                            r = 200; g = 170; b = 100;
                            break;
                        case 'FOREST':
                            r = 30; g = 100; b = 30;
                            break;
                        case 'CITY':
                            r = 120; g = 120; b = 130;
                            break;
                        default: // PLAINS
                            r = 80; g = 160; b = 80;
                    }

                    // Simple shading based on height (fake ambient occlusion)
                    const shade = 1.0 - (height / 100) * 0.2;
                    r *= shade;
                    g *= shade;
                    b *= shade;
                }

                const index = (y * resolution + x) * 4;
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255; // Alpha
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Draw Towers (Overlay) - REMOVED to prevent ghosting (Icons are used instead)
        // const towers = [ ... ];
        // ctx.fillStyle = '#ff0000';
        // towers.forEach(t => { ... });

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

    update(dt) {
        if (!this.game.player || !this.game.player.mesh || !this.container || !this.content) return;

        // Update Icons
        this.updatePlayerIcon();
        this.updateEnemyIcons();

        // Handle Reveal Animation
        if (this.revealAnimation) {
            this.updateRevealAnimation(dt);
        }

        // INSTANT ZOOM (Fixes Drift/Jump issues)
        this.zoom = this.targetZoom;

        // SCROLLING LOGIC
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        const cx = cw / 2;
        const cy = ch / 2;

        const p = this.game.player.mesh.position;
        const playerMapPos = this.worldToMap(p.x, p.z);

        // Always update this reference
        this.currentMapCenter = playerMapPos;

        if (this.isBigMap) {
            // Logic:
            // We want the Player (currentMapCenter) to be at Screen Center (cx, cy) + Offset.
            // ScreenX = (MapX * Zoom) + TranslateX
            // TranslateX = ScreenX - (MapX * Zoom)
            // We want ScreenX to be (cx + offset.x) when MapX is currentMapCenter.x
            // tx = (cx + offset.x) - (currentMapCenter.x * zoom)

            let tx = (cx + this.mapOffset.x) - (this.currentMapCenter.x * this.zoom);
            let ty = (cy + this.mapOffset.y) - (this.currentMapCenter.y * this.zoom);

            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${this.zoom})`;

        } else {
            // Minimap: Simple Centering on Player, no Offset, Zoom 1.0 (or custom fixed zoom)
            // tx = cx - (playerMapPos.x * 1.0)
            let tx = cx - playerMapPos.x;
            let ty = cy - playerMapPos.y;
            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        }
    }

    animateReveal(worldX, worldZ, targetRadius, duration = 1.0, onComplete) {
        this.revealAnimation = {
            x: worldX,
            z: worldZ,
            currentRadius: 0,
            targetRadius: targetRadius,
            speed: targetRadius / duration,
            onComplete: onComplete
        };
    }

    updateRevealAnimation(dt) {
        if (!this.revealAnimation) return;

        // Use passed dt
        const animDt = dt || 0.016;

        const anim = this.revealAnimation;
        anim.currentRadius += anim.speed * animDt; // Correct speed (units per second)

        if (anim.currentRadius >= anim.targetRadius) {
            anim.currentRadius = anim.targetRadius;
            this.revealZone(anim.x, anim.z, anim.currentRadius);

            if (anim.onComplete) anim.onComplete();
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
            // Style for player icon (Arrow)
            Object.assign(icon.style, {
                width: '0',
                height: '0',
                borderLeft: '5px solid transparent', // Smaller (was 6)
                borderRight: '5px solid transparent',
                borderBottom: '10px solid #00ff00', // Smaller (was 12)
                backgroundColor: 'transparent',
                borderRadius: '0',
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                zIndex: '100', // ALWAYS ON TOP
                filter: 'drop-shadow(0 0 2px black)'
            });
            this.iconLayer.appendChild(icon);
            this.icons.set('player', icon);
        }

        const p = this.game.player.mesh.position;
        const pos = this.worldToMap(p.x, p.z);

        // Debug Icon Pos
        // console.log(`Icon Pos: ${pos.x}, ${pos.y} (Player: ${p.x}, ${p.z})`);

        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        // Rotate icon based on player rotation
        // Mesh rotation Y: PI is Forward (-Z), 0 is Backward (+Z)
        // Arrow default is UP (-Z)
        // So we need to map PI -> 0 deg, 0 -> 180 deg
        const rotation = this.game.player.mesh.rotation.y;
        icon.style.transform = `translate(-50%, -50%) rotate(${-rotation + Math.PI}rad)`;
    }

    updateEnemyIcons() {
        if (!this.game.player || !this.game.player.mesh) return;
        const playerPos = this.game.player.mesh.position;
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

            // RADAR LOGIC: Only show if close to player
            const dist = playerPos.distanceTo(enemy.body.position);
            const isVisible = dist < 40; // 40m Radar Range

            let icon = this.icons.get(`enemy-${index}`);

            if (!isVisible) {
                if (icon) icon.style.display = 'none';
                return;
            }

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
                    zIndex: '5',
                    boxShadow: '0 0 5px red' // Glow for visibility
                });
                this.iconLayer.appendChild(icon);
                this.icons.set(`enemy-${index}`, icon);
            }

            icon.style.display = 'block';
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
        this.fogCtx.save();
        this.fogCtx.globalCompositeOperation = 'destination-out';
        this.fogCtx.beginPath();
        this.fogCtx.arc(pos.x, pos.y, mapRadius, 0, Math.PI * 2);
        this.fogCtx.fillStyle = 'white'; // Color doesn't matter for destination-out, but good practice
        this.fogCtx.fill();
        this.fogCtx.restore();

        // console.log(`MapManager: Revealed zone at ${worldX}, ${worldZ} with radius ${radius}`);
    }

    addTowerIcon(tower, index) {
        if (!this.iconLayer) {
            // Queue it if map not ready yet
            if (!this.pendingIcons) this.pendingIcons = [];
            this.pendingIcons.push({ type: 'tower', tower, index });
            return;
        }

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
            tower.icon.style.boxShadow = '0 0 10px #00ccff';
            tower.icon.style.zIndex = '20'; // Bring to top
        }
        // console.log("MapManager: Unlocking Tower - Revealing Zone");
        this.revealZone(tower.position.x, tower.position.z, 100);
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

            // OPEN BIG MAP
            this.container.classList.add('big-map-active');

            // FORCE RESET: Always center on player when opening
            // This prevents the "stuck on old view" issue user reported.
            this.mapOffset = { x: 0, y: 0 };

            // Optional: Reset zoom or keep it? 
            // User complained about "being at the same place". Resetting zoom ensures a fresh start.
            // this.targetZoom = 1.0; 

            // Recenter Hint (Still useful if they pan while open)
            if (this.game.ui) this.game.ui.showToast("ESPACE pour Recentrer");

            // PAUSE GAME
            if (this.game) {
                this.game.isPaused = true;
                document.body.style.cursor = ''; // Let CSS handle it (grab)
                document.exitPointerLock();
            }

            // Add internal key listener for Space (Recenter)
            this._recenterHandler = (e) => {
                if (e.code === 'Space') {
                    this.mapOffset = { x: 0, y: 0 };
                }
            };
            window.addEventListener('keydown', this._recenterHandler);

        } else {
            // CLOSE BIG MAP
            this.container.classList.remove('big-map-active');

            // Remove listener
            if (this._recenterHandler) {
                window.removeEventListener('keydown', this._recenterHandler);
                this._recenterHandler = null;
            }

            // RESUME GAME
            if (this.game) {
                this.game.isPaused = false;
                document.body.style.cursor = 'none';
                // REMOVED: document.body.requestPointerLock() to avoid "User Gesture" error.
                // Player must click to resume.
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
