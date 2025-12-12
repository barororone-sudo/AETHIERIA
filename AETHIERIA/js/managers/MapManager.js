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

        this.mapSize = 2048; // Match texture size
        this.worldSize = 5000; // Updated to match Biome Extents (-2500 to 2500)
        this.scale = this.mapSize / this.worldSize;

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
        this.fogCanvas.style.zIndex = '5';
        this.fogCanvas.style.opacity = '1.0'; // Fog of War enabled (Black)
        this.content.appendChild(this.fogCanvas);

        // 4. Setup Fog Context
        this.fogCtx = this.fogCanvas.getContext('2d', { willReadFrequently: true });
        this.fogCtx.fillStyle = '#000000';
        this.fogCtx.fillRect(0, 0, this.mapSize, this.mapSize);

        // 5. Icons Layer
        // Icons Layer (Where all markers live)
        this.iconLayer = document.createElement('div');
        this.iconLayer.id = 'map-layer-icons';
        Object.assign(this.iconLayer.style, layerStyle);
        this.iconLayer.style.zIndex = '10';
        // CRITICAL: Content is parent. Icons follow content's transform automatically.
        this.content.appendChild(this.iconLayer);

        // 6. Interactions
        this.setupInteractions();

        // Load Existing Towers from World (Sync)
        if (this.game.world && this.game.world.towers) {
            this.game.world.towers.forEach((tower, index) => {
                if (!tower.icon) this.addTowerIcon(tower, index);
            });
        }

        // Process Deferred Icons (Safety Net)
        if (this.pendingIcons && this.pendingIcons.length > 0) {
            console.log(`[MapManager] Processing ${this.pendingIcons.length} pending icons...`);
            this.pendingIcons.forEach(p => {
                if (p.type === 'tower') this.addTowerIcon(p.tower, p.index);
                // Add handles for other types if needed
                if (p.type === 'waypoint') this.addWaypointIcon(p.waypoint);
                if (p.type === 'camp') this.addCampIcon(p.camp);
            });
            this.pendingIcons = [];
        }
    }


    setupInteractions() {
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e)); // Window for smooth drag outside
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
        this.container.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable context menu
    }

    // --- ZOOM MATH ---
    onWheel(e) {
        if (!this.isBigMap) return;
        e.preventDefault();

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

        // FAILSAFE: Check for missing tower icons once a second
        this._iconCheckTimer = (this._iconCheckTimer || 0) + dt;
        if (this._iconCheckTimer > 1.0) {
            this._iconCheckTimer = 0;
            if (this.game.world && this.game.world.towers && this.game.world.towers.length > 0) {
                this.game.world.towers.forEach((t, i) => {
                    if (!t.icon || !t.icon.parentElement) {
                        this.addTowerIcon(t, i);
                    }
                });
            }
        }

        // 0. Update Scale Var for Icons (InvScale)
        if (this.iconLayer) {
            this.iconLayer.style.setProperty('--map-scale', this.isBigMap ? this.viewState.scale : 1);
        }

        // 1. Update Icon Positions (Pure Map Coords)
        this.updateEnemyIcons();
        this.updateCampIcons();
        this.updateWaypointIcons();
        this.updatePlayerIcon();

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
            const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.2;

            icon.style.transform = `translate(-50%, -50%) scale(${invScale * pulse})`;
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
            this.content.style.transform = `translate3d(${this.viewState.x}px, ${this.viewState.y}px, 0) scale(${this.viewState.scale})`;
        } else {
            // Minimap: Center on Player automatically
            const cw = this.container.clientWidth;
            const ch = this.container.clientHeight;

            const p = this.game.player.mesh.position;
            const mapPos = this.worldToMap(p.x, p.z);

            const tx = (cw / 2) - mapPos.x;
            const ty = (ch / 2) - mapPos.y;

            this.content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1)`;
        }
    }

    updatePlayerIcon() {
        if (!this.game.player) return;
        let icon = this.icons.get('player');

        // FORCE REVEAL around player disabled (Fog of War Active)
        // if (this.game.player.mesh) {
        //     this.revealZone(this.game.player.mesh.position.x, this.game.player.mesh.position.z, 200);
        // }

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
                zIndex: '100', // Player above everything
                filter: 'drop-shadow(0 0 2px black)',
                pointerEvents: 'none'
            });
            this.iconLayer.appendChild(icon);
            this.icons.set('player', icon);
        }

        const p = this.game.player.mesh.position;
        const pos = this.worldToMap(p.x, p.z);

        // PURE MAP COORDS
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
        const player = this.game.player;

        // 🎯 Only show enemies within detection range (Genshin-style)
        const DETECTION_RANGE = 100; // meters

        enemies.forEach((enemy, index) => {
            if (enemy.isDead) {
                const el = this.icons.get(`enemy-${index}`);
                if (el) { el.remove(); this.icons.delete(`enemy-${index}`); }
                return;
            }

            // 🔍 Distance check - only show nearby enemies
            if (player && player.body) {
                const dx = enemy.body.position.x - player.body.position.x;
                const dz = enemy.body.position.z - player.body.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Hide icon if too far
                let icon = this.icons.get(`enemy-${index}`);
                if (dist > DETECTION_RANGE) {
                    if (icon) {
                        icon.style.display = 'none';
                    }
                    return;
                }

                // Show icon if in range
                if (!icon) {
                    icon = document.createElement('div');
                    icon.className = 'map-icon-enemy';
                    Object.assign(icon.style, {
                        width: '8px', height: '8px',
                        backgroundColor: 'red',
                        borderRadius: '50%',
                        position: 'absolute',
                        transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
                        zIndex: '5',
                        pointerEvents: 'none',
                        boxShadow: '0 0 4px red'
                    });
                    this.iconLayer.appendChild(icon);
                    this.icons.set(`enemy-${index}`, icon);
                } else {
                    icon.style.display = 'block';
                }

                const pos = this.worldToMap(enemy.body.position.x, enemy.body.position.z);
                icon.style.left = `${pos.x}px`;
                icon.style.top = `${pos.y}px`;
            }
        });
    }

    updateCampIcons() {
        if (!this.game.world || !this.game.world.levelManager) return;

        const camps = this.game.world.levelManager.activeCamps;
        const player = this.game.player;
        const DETECTION_RANGE = 50; // Show camps within 50 units

        camps.forEach(camp => {
            // Create icon if it doesn't exist
            if (!camp.mapIcon) {
                this.addCampIcon(camp);
            }

            if (player && player.body && camp.mapIcon) {
                const dx = camp.x - player.body.position.x;
                const dz = camp.z - player.body.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Show if within detection range
                if (dist < DETECTION_RANGE) {
                    camp.mapIcon.style.display = 'block';
                    // Update color based on cleared status
                    camp.mapIcon.style.backgroundColor = camp.cleared ? '#888888' : '#ff4444';
                } else {
                    camp.mapIcon.style.display = 'none';
                }
            }
        });
    }

    updateWaypointIcons() {
        if (!this.game.world || !this.game.world.waypoints) return;

        const waypoints = this.game.world.waypoints;

        waypoints.forEach(waypoint => {
            if (!waypoint.mapIcon) return;

            const isUnlocked = this.game.waypointManager && this.game.waypointManager.isUnlocked(waypoint.id);
            const isRevealed = this.isFogRevealed(waypoint.position.x, waypoint.position.z);

            // LOGIC: Show if unlocked OR if in revealed area
            const shouldShow = isUnlocked || isRevealed;

            if (shouldShow) {
                waypoint.mapIcon.style.display = 'block';
                // COLOR: Unlocked = Blue, Locked = Red
                const color = isUnlocked ? '#33ccff' : '#ff4444';
                waypoint.mapIcon.style.backgroundColor = color;

                // Shadow for glow
                waypoint.mapIcon.style.boxShadow = isUnlocked ? '0 0 6px #33ccff' : '0 0 4px #ff0000';
                waypoint.mapIcon.style.opacity = '1';

                // Interaction
                waypoint.mapIcon.style.cursor = isUnlocked ? 'pointer' : 'default';
                waypoint.mapIcon.style.pointerEvents = isUnlocked ? 'auto' : 'none';

                // Stack Order: Unlocked on top
                waypoint.mapIcon.style.zIndex = isUnlocked ? '1002' : '1001';

            } else {
                waypoint.mapIcon.style.display = 'none';
            }
        });
    }

    addTowerIcon(tower, index) {
        if (!this.iconLayer) {
            this.pendingIcons.push({ type: 'tower', tower: tower, index: index });
            return;
        }

        const icon = document.createElement('div');
        icon.className = 'map-icon map-icon-tower';
        icon.dataset.towerId = tower.id;

        // VISUALS: Red Square (Locked) -> Blue Square (Unlocked)
        const isUnlocked = tower.isUnlocked;
        const color = isUnlocked ? '#33ccff' : '#ff0000';

        Object.assign(icon.style, {
            width: '20px', height: '20px', // Large Square for Visibility
            backgroundColor: color,
            border: '2px solid #ffffff',
            borderRadius: '2px',
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '2000', // Very High priority
            pointerEvents: 'auto',
            cursor: 'pointer',
            display: 'block' // Always visible
        });

        if (isUnlocked) {
            icon.style.boxShadow = '0 0 15px #00ccff';
        }

        this.iconLayer.appendChild(icon);
        tower.icon = icon;

        const pos = this.worldToMap(tower.position.x, tower.position.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        // Click handler
        icon.onclick = (e) => {
            if (tower.isUnlocked && this.game.waypointManager) {
                e.stopPropagation();
                this.game.waypointManager.teleport(tower.id);
                this.toggleMap(false);
            } else {
                if (this.game.ui) this.game.ui.showToast("Tour Verrouillée", "error");
            }
        };
    }

    unlockTower(tower) {
        if (tower.icon) {
            tower.icon.style.backgroundColor = '#33ccff';
            tower.icon.style.boxShadow = '0 0 15px #33ccff';
            tower.icon.style.zIndex = '2010';
            tower.icon.style.pointerEvents = 'auto';
            tower.icon.style.cursor = 'pointer';
        }

        // GENSHIN LOGIC: Reveal the entire Biome Sector
        this.revealBiomeAt(tower.position.x, tower.position.z);
    }

    revealBiomeAt(x, z) {
        // Map Biome Logic (same as generateMapTexture)
        // Col Limits: -1200, -400, 400, 1200
        // Row Split: z=0

        let minX, maxX, minZ, maxZ;

        // Determine Column
        if (x < -1200) { minX = -2500; maxX = -1200; }
        else if (x < -400) { minX = -1200; maxX = -400; }
        else if (x < 400) { minX = -400; maxX = 400; }
        else if (x < 1200) { minX = 400; maxX = 1200; }
        else { minX = 1200; maxX = 2500; }

        // Determine Row
        if (z < 0) { minZ = -2500; maxZ = 0; }
        else { minZ = 0; maxZ = 2500; }

        // Padding to ensure overlap
        const padding = 20;

        // Convert to Map Coords
        const p1 = this.worldToMap(minX - padding, minZ - padding);
        const p2 = this.worldToMap(maxX + padding, maxZ + padding);

        const w = p2.x - p1.x;
        const h = p2.y - p1.y;

        // Clear Rect on Fog
        if (this.fogCtx) {
            this.fogCtx.save();
            this.fogCtx.globalCompositeOperation = 'destination-out';
            this.fogCtx.fillStyle = 'rgba(0,0,0,1)';
            this.fogCtx.fillRect(p1.x, p1.y, w, h);
            this.fogCtx.restore();
        }

        console.log(`[MapManager] Revealing Biome Sector for (${x},${z}) -> Rect [${minX}, ${minZ}] to [${maxX}, ${maxZ}]`);
    }

    addWaypointIcon(waypoint) {
        if (!this.iconLayer) {
            this.pendingIcons.push({ type: 'waypoint', waypoint: waypoint });
            return;
        }

        // console.log('[MapManager] addWaypointIcon:', waypoint.id);

        const icon = document.createElement('div');
        icon.className = 'map-icon-waypoint';
        icon.dataset.waypointId = waypoint.id;

        const isUnlocked = this.game.waypointManager && this.game.waypointManager.isUnlocked(waypoint.id);

        Object.assign(icon.style, {
            width: '8px',
            height: '8px',
            backgroundColor: isUnlocked ? '#33ccff' : '#ff4444', // Blue/Red
            border: '1px solid white',
            borderRadius: '50%', // Circle
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '1000',
            cursor: isUnlocked ? 'pointer' : 'default',
            pointerEvents: isUnlocked ? 'auto' : 'none',
            boxShadow: isUnlocked ? '0 0 6px #33ccff' : 'none',
            display: 'none' // Hidden by default, managed by updateWaypointIcons
        });

        // Click handler
        icon.onclick = (e) => {
            if (isUnlocked && this.game.waypointManager) {
                e.stopPropagation();
                this.game.waypointManager.teleport(waypoint.id);
                this.toggleMap(false);
            }
        };

        const pos = this.worldToMap(waypoint.position.x, waypoint.position.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        this.iconLayer.appendChild(icon);
        waypoint.mapIcon = icon;
    }

    addCampIcon(camp) {
        if (!this.iconLayer) {
            console.warn("[MapManager] Icon layer not ready, cannot add camp icon.");
            return;
        }

        const icon = document.createElement('div');
        icon.className = 'map-icon-camp';
        icon.dataset.campId = `camp_${camp.x}_${camp.z}`;

        Object.assign(icon.style, {
            width: '8px',
            height: '8px',
            backgroundColor: camp.cleared ? '#888888' : '#ff4444',
            border: '1px solid white',
            borderRadius: '50%',
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '5',
            pointerEvents: 'none',
            display: 'none' // Hidden by default, shown when player is nearby
        });

        const pos = this.worldToMap(camp.x, camp.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        this.iconLayer.appendChild(icon);
        camp.mapIcon = icon;
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

        // Fill background
        ctx.fillStyle = '#112233';
        ctx.fillRect(0, 0, res, res);

        const imgData = ctx.getImageData(0, 0, res, res);
        const data = imgData.data;

        const tm = this.game.world ? this.game.world.terrainManager : null;

        // FAILSAFE: If no terrain manager, use fallback
        if (!tm) {
            console.warn('[MapManager] TerrainManager not ready. Using simplified biome map.');
        }

        for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
                const wx = (x / res) * this.worldSize - this.worldSize / 2;
                const wz = (y / res) * this.worldSize - this.worldSize / 2;

                let r = 50, g = 50, b = 50; // Default

                // 1. Get Real Terrain Height if available
                let h = 0;
                if (tm) {
                    h = tm.getGlobalHeight(wx, wz);
                }

                // 2. Determine Biome (Grid Logic)
                let col = 2; // Middle
                if (wx < -1200) col = 0;
                else if (wx < -400) col = 1;
                else if (wx < 400) col = 2;
                else if (wx < 1200) col = 3;
                else col = 4;

                const isNorth = (wz < 0);

                // Base Biome Color
                if (isNorth) {
                    switch (col) {
                        case 0: r = 200; g = 240; b = 255; break; // ICE
                        case 1: r = 240; g = 240; b = 250; break; // SNOW
                        case 2: r = 180; g = 220; b = 240; break; // AIR
                        case 3: r = 140; g = 100; b = 180; break; // LIGHTNING
                        case 4: r = 220; g = 100; b = 220; break; // CRYSTAL
                    }
                } else {
                    switch (col) {
                        case 0: r = 34; g = 139; b = 34; break; // FOREST
                        case 1: r = 0; g = 100; b = 0; break;   // JUNGLE
                        case 2: r = 218; g = 165; b = 32; break;// GOLD
                        case 3: r = 255; g = 69; b = 0; break;  // FIRE
                        case 4: r = 80; g = 0; b = 0; break;    // LAVA
                    }
                }

                // 3. Apply Topography (Water & Shading)
                if (h < 1.8) {
                    // Water Override
                    r = 60; g = 120; b = 200;
                } else if (h < 2.5) {
                    // Beach Override (except for ICE/LAVA maybe? keep simple)
                    r = 210; g = 190; b = 130;
                } else {
                    // Land Shading
                    const bright = 1.0 + (h - 10) * 0.01;
                    r = Math.min(255, r * bright);
                    g = Math.min(255, g * bright);
                    b = Math.min(255, b * bright);
                }

                const idx = (y * res + x) * 4;
                data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Draw Grid Lines for clarity
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Horizon line
        const midY = res / 2;
        ctx.moveTo(0, midY); ctx.lineTo(res, midY);
        // Verified Vertical lines (approx boundaries)
        // -1200, -400, 400, 1200 mapped to 0-2048
        // world scale: 5000. 0 -> 1024. 1 unit = 2048/5000 = 0.4096 px
        const s = 2048 / 5000;
        const boundaries = [-1200, -400, 400, 1200];
        boundaries.forEach(bx => {
            const px = (bx + 2500) * s;
            ctx.moveTo(px, 0); ctx.lineTo(px, res);
        });
        ctx.stroke();

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

    /**
     * Check if a world position is revealed in the fog of war
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {boolean} - True if revealed, false if fogged
     */
    isFogRevealed(worldX, worldZ) {
        if (!this.fogCtx || !this.fogCanvas) return true;

        const pos = this.worldToMap(worldX, worldZ);

        if (pos.x < 0 || pos.x >= this.mapSize || pos.y < 0 || pos.y >= this.mapSize) {
            return false;
        }

        const pixelData = this.fogCtx.getImageData(pos.x, pos.y, 1, 1).data;
        return pixelData[3] === 0;
    }
}
