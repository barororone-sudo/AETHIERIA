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
                const d = p.data || p; // Handle both wrapper and direct styles if mixed
                if (p.type === 'tower') this.addTowerIcon(d.tower, d.index);
                if (p.type === 'waypoint') this.addWaypointIcon(d.waypoint);
                if (p.type === 'camp') this.addCampIcon(d.camp);
                if (p.type === 'city') this.addCityIcon(d.city); // FIX: Add City Handling
            });
            this.pendingIcons = [];
        }

        // 7. Final Sync with WaypointManager
        this.syncMapIcons();
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

        // THROTTLE: Update Map Logic at 20 FPS (0.05s) to save CPU
        this._mapUpdateTimer = (this._mapUpdateTimer || 0) + dt;
        if (this._mapUpdateTimer < 0.05) return;
        this._mapUpdateTimer = 0;

        // DEBUG: Dummy Red Square at (0,0) Map Center
        if (!this.dummyDebug) {
            // ...
        }

        // APPLY TRANSFORM (Critical Fix)
        if (this.content) {
            const scale = this.isBigMap ? this.viewState.scale : 1.0;
            // Minimap (Small): Centered on player?
            // BigMap: Free pan/zoom (this.viewState)

            if (this.isBigMap) {
                this.content.style.transform = `translate(${this.viewState.x}px, ${this.viewState.y}px) scale(${this.viewState.scale})`;
            } else {
                // Minimap Mode: Center on player
                // We need to convert World -> Map Coords
                if (this.game.player && this.game.player.mesh) {
                    const p = this.game.player.mesh.position;
                    const mapPos = this.worldToMap(p.x, p.z);
                    // Container Center (e.g. 100px) - MapPos
                    // Presuming 200px minimap
                    const cx = 100;
                    const cy = 100;
                    const tx = cx - mapPos.x;
                    const ty = cy - mapPos.y;
                    this.content.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;
                }
            }
        }

        // DEBUG LOGS (User Request)
        this._debugTimer = (this._debugTimer || 0) + dt;
        if (this._debugTimer > 2.0) { // Log every 2 seconds
            this._debugTimer = 0;
            const p = this.game.player.mesh.position;
            const mapPos = this.worldToMap(p.x, p.z);
            console.log(`[Map Debug] World: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) -> Map CSS: (${mapPos.x.toFixed(1)}px, ${mapPos.y.toFixed(1)}px)`);
        }

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
                    width: '20px', height: '20px', // Larger
                    backgroundColor: 'rgba(255, 215, 0, 0.8)', // Gold transparent
                    border: '3px solid white',
                    borderRadius: '50%',
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '3000', // Above everything
                    pointerEvents: 'none',
                    boxShadow: '0 0 20px gold'
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
        const DETECTION_RANGE = 100; // Increased to 100m per user request

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

    // --- ICON SYNC ---
    syncMapIcons() {
        if (!this.game.waypointManager) return;

        console.log('[MapManager] Syncing Map Icons...');
        const allPoints = this.game.waypointManager.waypoints; // Map<id, data>

        allPoints.forEach((data, id) => {
            // Check if icon already exists on the OBJECT (linked via WaypointManager)
            // or if we track it locally.
            // Actually, let's rely on the IDs or the object reference.

            if (data.type === 'tower') {
                if (!data.object.icon) {
                    this.addTowerIcon(data.object);
                }
            } else if (data.type === 'waypoint') {
                if (!data.object.mapIcon) {
                    this.addWaypointIcon(data.object);
                }
            }
        });
    }

    addTowerIcon(tower, index) {
        if (!this.iconLayer) {
            this.pendingIcons.push({ type: 'tower', tower: tower, index: index });
            return;
        }

        // Avoid duplicates
        if (tower.icon) return;

        const icon = document.createElement('div');
        icon.className = 'map-icon map-icon-tower';
        icon.dataset.towerId = tower.id;

        // VISUALS: Yellow Square (User Request)
        const isUnlocked = tower.isUnlocked;
        // User asked for "Icone de tour jaune". Locked = Red? Unlocked = Yellow?
        // Let's go Unlocked = Yellow (#FFD700), Locked = Red (#FF0000).
        const color = isUnlocked ? '#FFD700' : '#FF0000';

        Object.assign(icon.style, {
            width: '12px', height: '12px', // Reduced Size (was 20px)
            backgroundColor: color,
            border: '2px solid #ffffff',
            borderRadius: '2px', // Slightly rounded
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '2000', // Top Priority
            pointerEvents: 'auto',
            cursor: 'pointer',
            display: 'block'
        });

        if (isUnlocked) {
            icon.style.boxShadow = '0 0 15px #FFD700';
        }

        this.iconLayer.appendChild(icon);
        tower.icon = icon;

        const pos = this.worldToMap(tower.position.x, tower.position.z);
        // FIX: Ensure absolute position and z-index are strict
        icon.style.position = 'absolute';
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;
        icon.style.zIndex = '9999'; // Force Z-Index

        // DEBUG: Log Tower Position
        // console.log(`[MapManager] Added Tower Icon at Map Pos: ${pos.x}, ${pos.y} (World: ${tower.position.x}, ${tower.position.z})`);

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
            tower.icon.style.backgroundColor = '#FFD700'; // Yellow
            tower.icon.style.boxShadow = '0 0 15px #FFD700';
            tower.icon.style.zIndex = '9999';
            tower.icon.style.pointerEvents = 'auto';
            tower.icon.style.cursor = 'pointer';
        }

        // GENSHIN LOGIC: Reveal the entire Biome Sector
        this.revealBiomeAt(tower.position.x, tower.position.z);
    }

    revealBiomeAt(x, z) {
        if (!this.fogCtx) return;

        // GENSHIN STYLE: Organic Radial Reveal
        // 1. Determine if Center (Forest) or Outer Wedge
        const dist = Math.sqrt(x * x + z * z);
        const mapCenter = this.worldToMap(0, 0);

        this.fogCtx.save();
        this.fogCtx.globalCompositeOperation = 'destination-out';
        this.fogCtx.fillStyle = 'rgba(0,0,0,1)';
        this.fogCtx.beginPath();

        if (dist < 800) {
            // CENTRAL BIOME (Forest) - Organic Circle
            const radius = 900 * this.scale; // Slightly larger to overlap
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2;
                // Add Noise to radius
                const variance = Math.sin(a * 10) * 0.05 + Math.cos(a * 23) * 0.05;
                const r = radius * (1 + variance);
                const px = mapCenter.x + Math.cos(a) * r;
                const py = mapCenter.y + Math.sin(a) * r;
                if (i === 0) this.fogCtx.moveTo(px, py);
                else this.fogCtx.lineTo(px, py);
            }
        } else {
            // RADIAL SECTOR (Wedge)
            // Fix: Center the wedge on the Tower's actual angle (No snapping to grid)
            const centerAngle = Math.atan2(z, x);

            // 9 Biomes = 40 degrees sector size
            const sectorSize = (Math.PI * 2) / 9;

            // Define Wedge centered on the input position
            const startAngle = centerAngle - sectorSize / 2 - 0.05; // Reduced overlap 0.1 -> 0.05
            const endAngle = centerAngle + sectorSize / 2 + 0.05;
            const innerR = 600 * this.scale;
            const outerR = 3000 * this.scale;

            // Draw Wavy Wedge
            // 1. Inner Arc (Wobbly)
            const steps = 30;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const a = startAngle + (endAngle - startAngle) * t;
                const variance = Math.sin(a * 15) * 50 * this.scale; // Wobble
                const r = innerR + variance;
                const px = mapCenter.x + Math.cos(a) * r;
                const py = mapCenter.y + Math.sin(a) * r;
                if (i === 0) this.fogCtx.moveTo(px, py);
                else this.fogCtx.lineTo(px, py);
            }

            // 2. Outer Arc (Wobbly)
            for (let i = steps; i >= 0; i--) {
                const t = i / steps;
                const a = startAngle + (endAngle - startAngle) * t;
                const variance = Math.cos(a * 20) * 100 * this.scale;
                const r = outerR + variance;
                const px = mapCenter.x + Math.cos(a) * r;
                const py = mapCenter.y + Math.sin(a) * r;
                this.fogCtx.lineTo(px, py);
            }
        }

        this.fogCtx.closePath();
        this.fogCtx.fill();
        this.fogCtx.restore();

        console.log(`[MapManager] Revealed Organic Sector for (${x}, ${z})`);
    }

    addWaypointIcon(waypoint) {
        if (!this.iconLayer) {
            this.pendingIcons.push({ type: 'waypoint', waypoint: waypoint });
            return;
        }

        if (waypoint.mapIcon) return; // Avoid duplicates

        const icon = document.createElement('div');
        icon.className = 'map-icon-waypoint';
        icon.dataset.waypointId = waypoint.id;

        const isUnlocked = this.game.waypointManager && this.game.waypointManager.isUnlocked(waypoint.id);

        Object.assign(icon.style, {
            width: '10px',
            height: '10px',
            backgroundColor: isUnlocked ? '#33ccff' : '#ff4444', // Blue/Red
            border: '2px solid white',
            borderRadius: '50%', // Circle
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '9999', // Above Waypoints
            cursor: isUnlocked ? 'pointer' : 'default',
            pointerEvents: isUnlocked ? 'auto' : 'none',
            boxShadow: isUnlocked ? '0 0 6px #33ccff' : 'none',
            display: 'block' // Always visible now? Or should hidden waypoints be hidden? 
            // Usually you see locked waypoints on map.
            // Previous logic hid them. Let's SHOW them as locked.
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
            this.pendingIcons.push({ type: 'camp', data: { camp } });
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

    addCityIcon(city) {
        if (!this.iconLayer) {
            this.pendingIcons.push({ type: 'city', data: { city } });
            return;
        }

        const icon = document.createElement('div');
        icon.className = 'map-icon-city';
        // VISUAL: House Shape (Square base + CSS Triangle roof implies Home)
        // Or just a Cyan Square.

        Object.assign(icon.style, {
            width: '14px',
            height: '14px',
            backgroundColor: '#00FFFF', // Cyan for Cities
            border: '2px solid #FFFFFF',
            position: 'absolute',
            transform: 'translate(-50%, -50%) scale(calc(1 / var(--map-scale, 1)))',
            zIndex: '1500', // high priority, below towers
            cursor: 'help',
            display: 'block',
            boxShadow: '0 0 10px #00FFFF'
        });

        const pos = this.worldToMap(city.x, city.z);
        icon.style.left = `${pos.x}px`;
        icon.style.top = `${pos.y}px`;

        // Tooltip
        icon.title = city.name;

        this.iconLayer.appendChild(icon);
        city.mapIcon = icon;
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

                let r = 0, g = 0, b = 0;

                // 1. Get Real Terrain Height if available
                let h = 0;
                if (tm) {
                    h = tm.getGlobalHeight(wx, wz);
                }

                // 2. Determine Biome (Exact Match with Chunk.js)
                if (tm) {
                    // Apply Jitter for Organic Edges (same as Chunk.js)
                    const jitter = 20;
                    const jx = (Math.random() - 0.5) * jitter;
                    const jz = (Math.random() - 0.5) * jitter;

                    const biome = tm.getBiome(wx + jx, wz + jz);
                    const color = tm.getBiomeColor(biome); // Returns standard THREE.Color or similar

                    // Convert float/hex to 0-255
                    if (color && color.r !== undefined) {
                        r = color.r * 255;
                        g = color.g * 255;
                        b = color.b * 255;
                    } else if (typeof color === 'number') {
                        // Hex support if needed
                        r = (color >> 16) & 255;
                        g = (color >> 8) & 255;
                        b = color & 255;
                    }

                    // Add Noise to texture (Organic feel)
                    const noise = (Math.random() - 0.5) * 20;
                    r = Math.max(0, Math.min(255, r + noise));
                    g = Math.max(0, Math.min(255, g + noise));
                    b = Math.max(0, Math.min(255, b + noise));

                } else {
                    // Fallback (Hardcoded) - Only if TM missing
                    r = 100; g = 100; b = 100;
                }

                // 3. Apply Topography (Water & Shading)
                if (h < 1.8) {
                    // Water Override
                    r = 60; g = 120; b = 200;
                } else if (h < 2.5) {
                    // Beach Override
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

        // STYLISH REVEAL (Soft Gradient)
        const grad = this.fogCtx.createRadialGradient(
            pos.x, pos.y, mapR * 0.5, // Inner radius (Fully Clear)
            pos.x, pos.y, mapR        // Outer radius (Fade to Fog)
        );

        // Alpha 1 = Removed (Destination-Out), Alpha 0 = Kept
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.fogCtx.fillStyle = grad;
        this.fogCtx.beginPath();
        this.fogCtx.arc(pos.x, pos.y, mapR, 0, Math.PI * 2);
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

        if (force !== undefined && force !== null) this.isBigMap = force;
        else this.isBigMap = !this.isBigMap;

        if (this.isBigMap) {
            // --- BIG MAP MODE (Genshin Pause Menu Style) ---
            this.container.style.cssText = `
                display: block !important;
                z-index: 2000 !important;
                opacity: 1 !important;
                width: 90% !important; 
                height: 90% !important;
                top: 5% !important;
                left: 5% !important;
                border-radius: 20px !important;
                position: absolute !important;
                background: rgba(0,0,0,0.9);
                border: 2px solid white !important;
                overflow: hidden !important; 
                pointer-events: auto !important;
            `;

            // RE-APPLY FOG BLACK (Fix for "Revealed" bug)
            if (this.fogCtx) {
                // If canvas reset or first open, ensure black
                if (this.fogCanvas.width !== this.mapSize) {
                    this.fogCanvas.width = this.mapSize;
                    this.fogCanvas.height = this.mapSize;
                    this.fogCtx.fillStyle = 'black';
                    this.fogCtx.fillRect(0, 0, this.mapSize, this.mapSize);
                }
            }

            // AUTO-CENTER ON PLAYER (Fix for "Small/Corner" bug)
            if (this.game.player && this.game.player.mesh) {
                // Get Container Dimensions (fallback to window if not rendered yet)
                const cw = this.container.clientWidth || (window.innerWidth * 0.9);
                const ch = this.container.clientHeight || (window.innerHeight * 0.9);

                const p = this.game.player.mesh.position;
                const mapPos = this.worldToMap(p.x, p.z);

                // Set ViewState (Scale 1.0 for details, Centered)
                this.viewState.scale = 1.0;
                this.viewState.x = (cw / 2) - mapPos.x;
                this.viewState.y = (ch / 2) - mapPos.y;

                this.viewStateStart.x = this.viewState.x;
                this.viewStateStart.y = this.viewState.y;

                // Reveal Player Area (200m) - DISABLED BY USER REQUEST
                // this.revealZone(p.x, p.z, 200);
            }

            // Apply Transform Immediately
            if (this.content) {
                this.content.style.transform = `translate(${this.viewState.x}px, ${this.viewState.y}px) scale(${this.viewState.scale})`;
            }

            if (this.game.ui) this.game.ui.showToast("MOLETTE: Zoom | GLISSER: Déplacer");
            if (document.pointerLockElement) document.exitPointerLock();

        } else {
            // --- MINIMAP MODE (HUD Style) ---
            this.container.style.cssText = `
                display: block !important;
                z-index: 1000 !important;
                opacity: 0.9 !important;
                width: 200px !important;
                height: 200px !important;
                top: 20px !important;
                right: 20px !important;
                left: auto !important; 
                bottom: auto !important;
                background: rgba(0,0,0,0.5); 
                border: 2px solid rgba(255,255,255,0.5) !important;
                border-radius: 50% !important; 
                position: absolute !important;
                overflow: hidden !important;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                pointer-events: none !important; 
            `;
            // Note: Transform updates for minimap are handled in update() loop (player following)

            // Allow game to capture pointer again if clicked
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
