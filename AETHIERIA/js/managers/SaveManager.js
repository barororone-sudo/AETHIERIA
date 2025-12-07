// js/managers/SaveManager.js

export class SaveManager {
    constructor(game) {
        this.game = game;
        this.currentSlotId = 1;
        this.baseKey = 'AETHIERIA_SAVE_SLOT_';

        // Auto-save every 60s
        setInterval(() => {
            if (this.game.isRunning && !this.game.isPaused) {
                this.save();
            }
        }, 60000);

        // Save on Exit/Refresh
        window.addEventListener('beforeunload', () => {
            if (this.game.isRunning) {
                this.save();
            }
        });
    }

    /**
     * @param {number} id 
     */
    selectSlot(id) {
        if ([1, 2, 3].includes(id)) {
            this.currentSlotId = id;
            console.log(`Save Slot ${id} selected.`);
        } else {
            console.warn(`Invalid Slot ID: ${id}. Defaulting to 1.`);
            this.currentSlotId = 1;
        }
    }

    getCurrentKey() {
        return `${this.baseKey}${this.currentSlotId}`;
    }

    /**
     * @param {number} id 
     */
    async deleteSlot(id) {
        try {
            await fetch(`/api/save/${id}`, { method: 'DELETE' });
            console.log(`Save Slot ${id} deleted (server).`);
        } catch (e) {
            console.error(`Error deleting slot ${id}:`, e);
        }
    }

    /**
     * Returns info for all 3 slots.
     * @returns {Array<{id: number, exists: boolean, level: number, date: string, location: string}>}
     */
    async getSlotsInfo() {
        try {
            const response = await fetch('/api/slots');
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error("Failed to fetch slots info:", e);
        }
        // Fallback or empty if server fails
        return [
            { id: 1, exists: false },
            { id: 2, exists: false },
            { id: 3, exists: false }
        ];
    }

    // Helper for UI compatibility if needed
    async getSlotInfo(id) {
        const slots = await this.getSlotsInfo();
        return slots.find(s => s.id === id) || { exists: false };
    }

    async save() {
        const player = this.game.player;
        if (!player || !player.body) return;

        const data = {
            position: { x: player.body.position.x, y: player.body.position.y, z: player.body.position.z },
            inventory: player.inventory.items,
            inventory: player.inventory.items,
            stats: { hp: player.hp, stamina: player.stamina },
            level: player.levelManager ? player.levelManager.getData() : { level: 1 },
            story: this.game.story ? this.game.story.getData() : { state: 'START' },
            world: {
                time: this.game.world.time,
                fog: this.game.world.fogGrid ?
                    this.game.world.fogGrid.map((p, i) => p.isDiscovered ? i : -1).filter(i => i !== -1)
                    : [],
                towers: (this.game.world && this.game.world.towers) ? this.game.world.towers.reduce((acc, tower) => {
                    acc[tower.id] = tower.isUnlocked;
                    return acc;
                }, {}) : {}
            },
            timestamp: Date.now()
        };

        try {
            const response = await fetch(`/api/save/${this.currentSlotId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log(`Game Saved to Server!`);
                if (this.game.ui && this.game.ui.showToast) {
                    this.game.ui.showToast("Partie Sauvegardée (Serveur) !");
                }
            } else {
                console.error("Save failed:", await response.text());
            }
        } catch (e) {
            console.error("Save error:", e);
        }
    }

    async load() {
        try {
            const response = await fetch(`/api/load/${this.currentSlotId}`);

            if (!response.ok) {
                console.log(`No save found on server (or error).`);
                return false;
            }

            const data = await response.json();
            if (data.empty) return false;

            const player = this.game.player;

            // Restore Position
            if (data.position) {
                player.body.position.set(data.position.x, data.position.y, data.position.z);
                player.body.velocity.set(0, 0, 0);

                // FIX: Force Terrain Update IMMEDIATELY to generate ground physics before next frame
                if (this.game.world && this.game.world.terrainManager) {
                    this.game.world.terrainManager.update(player.body.position);
                }
            }

            // Restore Inventory
            if (data.inventory) {
                player.inventory.items = data.inventory;
                if (this.game.ui) this.game.ui.renderInventory();
            }

            // Restore Stats
            if (data.stats) {
                player.hp = data.stats.hp || 100;
                player.stamina = data.stats.stamina || 100;
            }

            // Restore Level
            if (data.level && player.levelManager) {
                player.levelManager.loadData(data.level);
            }

            // Restore Story
            if (data.story && this.game.story) {
                this.game.story.loadData(data.story);
            }

            // Restore World
            if (data.world) {
                this.game.world.time = data.world.time || 0;

                if (data.world.fog && this.game.world.fogGrid) {
                    data.world.fog.forEach(index => {
                        if (this.game.world.fogGrid[index]) {
                            this.game.world.fogGrid[index].isDiscovered = true;
                        }
                    });
                }

                if (data.world.towers && this.game.world.towers) {
                    this.game.world.towers.forEach(tower => {
                        if (data.world.towers[tower.id]) {
                            tower.isUnlocked = true;
                            if (tower.mesh && tower.mesh.material) tower.mesh.material.color.setHex(0x33ccff);
                            if (tower.light) tower.light.color.setHex(0x33ccff);
                            if (this.game.ui && this.game.ui.mapManager) {
                                this.game.ui.mapManager.unlockTower(tower);
                            }
                        }
                    });
                }
            }

            console.log(`Game Loaded from Server!`);
            return true;
        } catch (e) {
            console.error(`Failed to load save from server:`, e);
            return false;
        }
    }

    reset() {
        this.deleteSlot(this.currentSlotId);
    }
}
