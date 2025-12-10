// js/managers/WaypointManager.js

export class WaypointManager {
    constructor(game) {
        this.game = game;
        this.unlockedPoints = new Set();
        this.waypoints = new Map(); // id -> {x, y, z, type, object}
        this.fadeOverlay = null;
    }

    /**
     * Register a waypoint (Tower or Waypoint object)
     * @param {string} id 
     * @param {THREE.Vector3} position 
     * @param {string} type - 'tower' or 'waypoint'
     * @param {object} object - Reference to the Tower/Waypoint instance
     */
    register(id, position, type, object) {
        this.waypoints.set(id, {
            x: position.x,
            y: position.y,
            z: position.z,
            type: type,
            object: object
        });
    }

    /**
     * Unlock a waypoint
     * @param {string} id 
     */
    unlock(id) {
        if (this.unlockedPoints.has(id)) {
            console.log(`[WaypointManager] ${id} already unlocked.`);
            return;
        }

        this.unlockedPoints.add(id);
        console.log(`[WaypointManager] Unlocked: ${id}`);

        // Visual/Audio Feedback
        if (this.game.ui) {
            this.game.ui.showToast("✨ Point de passage débloqué !", 'success');
            if (this.game.ui.playSound) {
                this.game.ui.playSound('quest_complete');
            }
        }

        // Update Map Icon
        if (this.game.ui && this.game.ui.mapManager) {
            const waypoint = this.waypoints.get(id);
            if (waypoint && waypoint.object && waypoint.object.mapIcon) {
                const icon = waypoint.object.mapIcon;
                icon.style.backgroundColor = '#33ccff';
                icon.style.boxShadow = '0 0 10px #33ccff';
                icon.style.cursor = 'pointer';
                icon.style.pointerEvents = 'auto';
            }
        }
    }

    /**
     * Check if a waypoint is unlocked
     * @param {string} id 
     * @returns {boolean}
     */
    isUnlocked(id) {
        return this.unlockedPoints.has(id);
    }

    /**
     * Get all unlocked waypoint IDs
     * @returns {Array<string>}
     */
    getUnlockedWaypoints() {
        return Array.from(this.unlockedPoints);
    }

    /**
     * Teleport player to a waypoint
     * @param {string} id 
     */
    async teleport(id) {
        const waypoint = this.waypoints.get(id);

        if (!waypoint) {
            console.warn(`[WaypointManager] Waypoint ${id} not found.`);
            return;
        }

        if (!this.unlockedPoints.has(id)) {
            console.warn(`[WaypointManager] Waypoint ${id} is locked.`);
            if (this.game.ui) {
                this.game.ui.showToast("⚠️ Point de passage verrouillé !", 'warning');
            }
            return;
        }

        console.log(`[WaypointManager] Teleporting to ${id}...`);

        // 1. Fade Out
        await this.fadeScreen(true);

        // 2. Move Player (+2 height for safety)
        if (this.game.player && this.game.player.body) {
            this.game.player.body.position.set(
                waypoint.x,
                waypoint.y + 2,
                waypoint.z
            );
            this.game.player.body.velocity.set(0, 0, 0);
            this.game.player.body.angularVelocity.set(0, 0, 0);

            // Update Terrain Manager
            if (this.game.world && this.game.world.terrainManager) {
                this.game.world.terrainManager.update(this.game.player.body.position);
            }

            console.log(`[WaypointManager] Teleported to (${waypoint.x.toFixed(1)}, ${waypoint.y.toFixed(1)}, ${waypoint.z.toFixed(1)})`);
        }

        // 3. Fade In
        await this.fadeScreen(false);

        // 4. Notification
        if (this.game.ui) {
            this.game.ui.showToast(`📍 Téléportation réussie`, 'info');
        }
    }

    /**
     * Create or get fade overlay
     * @returns {HTMLElement}
     */
    createFadeOverlay() {
        if (this.fadeOverlay) return this.fadeOverlay;

        this.fadeOverlay = document.createElement('div');
        this.fadeOverlay.id = 'fade-overlay';
        Object.assign(this.fadeOverlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'black',
            opacity: '0',
            transition: 'opacity 0.5s ease-in-out',
            pointerEvents: 'none',
            zIndex: '9999'
        });
        document.body.appendChild(this.fadeOverlay);
        return this.fadeOverlay;
    }

    /**
     * Fade screen in or out
     * @param {boolean} fadeOut - true = fade to black, false = fade to transparent
     * @returns {Promise<void>}
     */
    fadeScreen(fadeOut) {
        return new Promise(resolve => {
            const overlay = this.fadeOverlay || this.createFadeOverlay();

            // Force reflow for transition
            overlay.offsetHeight;

            overlay.style.opacity = fadeOut ? '1' : '0';

            setTimeout(resolve, 500); // Match transition duration
        });
    }

    /**
     * Get data for saving
     * @returns {Array<string>}
     */
    getData() {
        return Array.from(this.unlockedPoints);
    }

    /**
     * Load data from save
     * @param {Array<string>} unlockedIds 
     */
    loadData(unlockedIds) {
        if (!Array.isArray(unlockedIds)) return;

        this.unlockedPoints.clear();
        unlockedIds.forEach(id => {
            this.unlockedPoints.add(id);

            // Update visual state of waypoint objects
            const waypoint = this.waypoints.get(id);
            if (waypoint && waypoint.object) {
                waypoint.object.isUnlocked = true;

                // Update mesh material
                if (waypoint.object.mesh && waypoint.object.mesh.material) {
                    waypoint.object.mesh.material.emissive.setHex(0x0033ff);
                }

                // Update light
                if (waypoint.object.light) {
                    waypoint.object.light.color.setHex(0x33ccff);
                }
            }
        });

        console.log(`[WaypointManager] Loaded ${unlockedIds.length} unlocked waypoints.`);
    }
}
