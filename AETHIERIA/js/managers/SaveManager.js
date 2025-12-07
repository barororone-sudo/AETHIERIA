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
        localStorage.removeItem(`${this.baseKey}${id}`);
        console.log(`Save Slot ${id} deleted (localStorage).`);
    }

    /**
     * Returns info for all 3 slots.
     * @returns {Promise<Array<{id: number, exists: boolean, level: number, date: string, location: string}>>}
     */
    async getSlotsInfo() {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const dataStr = localStorage.getItem(`${this.baseKey}${i}`);
            if (dataStr) {
                try {
                    const data = JSON.parse(dataStr);
                    slots.push({
                        id: i,
                        exists: true,
                        level: data.stats ? data.stats.level : (data.level && data.level.level ? data.level.level : 1),
                        date: data.meta ? data.meta.date : 'Unknown',
                        location: data.meta ? data.meta.location : 'Unknown'
                    });
                } catch (e) {
                    console.warn(`Corrupt save in slot ${i}`, e);
                    slots.push({ id: i, exists: false });
                }
            } else {
                slots.push({ id: i, exists: false });
            }
        }
        return slots;
    }

    async save() {
        const player = this.game.player;
        if (!player || !player.body) return;

        const data = {
            position: { x: player.body.position.x, y: player.body.position.y, z: player.body.position.z },
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
            meta: {
                date: new Date().toLocaleString(),
                location: `Zone ${Math.floor(player.body.position.x / 100)}`
            },
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.getCurrentKey(), JSON.stringify(data));
            console.log(`Game Saved to LocalStorage!`);
            if (this.game.ui && this.game.ui.showToast) {
                this.game.ui.showToast("Partie Sauvegardée !");
            }
        } catch (e) {
            console.error("Save error:", e);
        }
    }

    async load() {
        try {
            const dataStr = localStorage.getItem(this.getCurrentKey());

            if (!dataStr) {
                console.log(`No save found in LocalStorage.`);
                return false;
            }

            const data = JSON.parse(dataStr);
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

            console.log(`Game Loaded from LocalStorage!`);
            return true;
        } catch (e) {
            console.error(`Failed to load save from LocalStorage:`, e);
            return false;
        }
    }

    reset() {
        this.deleteSlot(this.currentSlotId);
    }
}
