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
    deleteSlot(id) {
        const key = `${this.baseKey}${id}`;
        localStorage.removeItem(key);
        console.log(`Save Slot ${id} deleted.`);
    }

    /**
     * Returns info for all 3 slots.
     * @returns {Array<{id: number, exists: boolean, level: number, date: string, location: string}>}
     */
    getSlotsInfo() {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const key = `${this.baseKey}${i}`;
            const json = localStorage.getItem(key);

            if (json) {
                try {
                    const data = JSON.parse(json);
                    slots.push({
                        id: i,
                        exists: true,
                        level: 1, // Placeholder for now
                        date: new Date(data.timestamp).toLocaleString(),
                        location: `X: ${Math.round(data.position.x)}, Z: ${Math.round(data.position.z)}`
                    });
                } catch (e) {
                    console.error(`Error parsing slot ${i}:`, e);
                    slots.push({ id: i, exists: false });
                }
            } else {
                slots.push({ id: i, exists: false });
            }
        }
        return slots;
    }

    // Helper for UI compatibility if needed
    getSlotInfo(id) {
        const slots = this.getSlotsInfo();
        return slots.find(s => s.id === id) || { exists: false };
    }

    save() {
        const player = this.game.player;
        if (!player || !player.body) return;

        const data = {
            position: { x: player.body.position.x, y: player.body.position.y, z: player.body.position.z },
            inventory: player.inventory.items,
            stats: { hp: player.hp, stamina: player.stamina },
            story: { state: this.game.story ? this.game.story.state : 'START' },
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

        const key = this.getCurrentKey();
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Game Saved to Slot ${this.currentSlotId}!`);

        if (this.game.ui && this.game.ui.showToast) {
            this.game.ui.showToast("Partie Sauvegardée !");
        }
    }

    load() {
        const key = this.getCurrentKey();
        const json = localStorage.getItem(key);

        if (!json) {
            console.log(`No save found in Slot ${this.currentSlotId}.`);
            return false;
        }

        try {
            const data = JSON.parse(json);
            const player = this.game.player;

            // Restore Position
            if (data.position) {
                player.body.position.set(data.position.x, data.position.y, data.position.z);
                player.body.velocity.set(0, 0, 0);
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

            // Restore Story
            if (data.story && this.game.story) {
                this.game.story.state = data.story.state;
                if (this.game.story.state === 'VICTORY') {
                    this.game.story.guardian = null;
                    if (this.game.ui) this.game.ui.hideBossBar();
                }
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

            console.log(`Game Loaded from Slot ${this.currentSlotId}!`);
            return true;
        } catch (e) {
            console.error(`Failed to load save from Slot ${this.currentSlotId}:`, e);
            return false;
        }
    }

    reset() {
        this.deleteSlot(this.currentSlotId);
    }
}
