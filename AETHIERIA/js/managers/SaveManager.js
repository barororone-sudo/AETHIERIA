// js/managers/SaveManager.js

export class SaveManager {
    constructor(game) {
        this.game = game;
        this.currentSlotId = 1;
        this.baseKey = 'AETHIERIA_SAVE_SLOT_';
        this.startTime = null; // Pour tracking du temps de jeu

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
     * Delete save and reload page for UI refresh
     * @param {number} slotIndex 
     */
    deleteSave(slotIndex) {
        const key = `${this.baseKey}${slotIndex}`;
        localStorage.removeItem(key);
        console.log(`[SaveManager] Slot ${slotIndex} deleted.`);
        // Recharger la page pour rafraîchir l'UI proprement
        window.location.reload();
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
                        location: data.meta ? data.meta.location : 'Unknown',
                        timestamp: data.meta ? data.meta.timestamp : 0,
                        playtime: data.meta ? data.meta.playtime : 0
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
            stats: {
                hp: player.hp,
                stamina: player.stamina,
                level: player.level,
                exp: player.exp
            },
            worldGen: (this.game.world && this.game.world.levelManager) ? this.game.world.levelManager.getData() : { camps: [] },
            story: this.game.story ? this.game.story.getData() : { state: 'START' },
            quests: this.game.questManager ? this.game.questManager.getData() : { activeQuests: [], completedQuests: [] },
            world: {
                time: this.game.world.time,
                fog: this.game.world.fogGrid ?
                    this.game.world.fogGrid.map((p, i) => p.isDiscovered ? i : -1).filter(i => i !== -1)
                    : [],
                towers: (this.game.world && this.game.world.towers) ? this.game.world.towers.reduce((acc, tower) => {
                    acc[tower.id] = tower.isUnlocked;
                    return acc;
                }, {}) : {},
                waypoints: this.game.waypointManager ? this.game.waypointManager.getData() : [],
                chests: (this.game.world && this.game.world.chests) ? this.game.world.chests.map(c => c.isOpened).filter(o => o) : [] // Basic chest tracking placeholder
            },
            meta: {
                date: new Date().toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                location: this.getLocationName(player.body.position),
                timestamp: Date.now(),
                playtime: this.calculatePlaytime()
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
                player.hp = data.stats.hp || 500;

                // MIGRATION: Fix Legacy Low HP (Hearts System)
                if (player.hp < 200) {
                    console.log("Migrating Legacy Save: Scaling HP x10");
                    player.hp *= 10;
                }

                player.stamina = data.stats.stamina || 100;
                player.level = data.stats.level || 1;
                player.exp = data.stats.exp || 0;

                player.updateStats(); // Recalculate maxHp etc.

                // Cap HP if it exceeds max (or fix if migration was slightly off)
                if (player.hp > player.maxHp) player.hp = player.maxHp;
            }

            // Restore Level (Use World Manager, not Player)
            if (data.worldGen && this.game.world && this.game.world.levelManager) {
                this.game.world.levelManager.loadData(data.worldGen);
            }

            // Restore Story
            if (data.story && this.game.story) {
                this.game.story.loadData(data.story);
            }

            // Restore Quests
            if (data.quests && this.game.questManager) {
                this.game.questManager.loadData(data.quests);
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

                // Restore Waypoints
                if (data.world.waypoints && this.game.waypointManager) {
                    this.game.waypointManager.loadData(data.world.waypoints);
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

    /**
     * Calcule le temps de jeu total en secondes
     */
    calculatePlaytime() {
        if (!this.startTime) {
            this.startTime = Date.now();
            return 0;
        }
        const elapsed = (Date.now() - this.startTime) / 1000;
        return Math.floor(elapsed);
    }

    /**
     * Formate le temps de jeu en heures/minutes
     */
    formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    }

    /**
     * Retourne un nom de zone lisible
     */
    getLocationName(position) {
        const x = position.x;
        const z = position.z;

        // Zones définies
        if (x > -100 && x < 100 && z > -100 && z < 100) {
            return "Plaines de l'Éveil";
        } else if (x < -100 && z > 50 && z < 250) {
            return "Forêt des Murmures";
        } else if (x > 100 && z < -100) {
            return "Désert Ardent";
        } else if (Math.abs(x) > 200 || Math.abs(z) > 200) {
            return "Terres Lointaines";
        }
        return "Zone Inconnue";
    }

    /**
     * Trouve le slot utilisé le plus récemment
     */
    async findLastUsedSlot() {
        const slots = await this.getSlotsInfo();
        const existingSlots = slots.filter(s => s.exists && s.timestamp);

        if (existingSlots.length === 0) return null;

        // Trier par timestamp décroissant
        existingSlots.sort((a, b) => b.timestamp - a.timestamp);
        return existingSlots[0];
    }
}
