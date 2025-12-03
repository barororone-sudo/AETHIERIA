// js/managers/SaveManager.js

export class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveKey = 'AETHERIA_SAVE_V1';

        // Auto-save every 60s
        setInterval(() => this.save(), 60000);
    }

    save() {
        const player = this.game.player;
        if (!player || !player.body) return; // Safety check

        const data = {
            position: { x: player.body.position.x, y: player.body.position.y, z: player.body.position.z },
            inventory: player.inventory.items, // Save raw items array
            stats: { hp: player.hp, stamina: player.stamina },
            story: { state: this.game.story.state },
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

        localStorage.setItem(this.saveKey, JSON.stringify(data));
        console.log("Game Saved!", data);

        // Visual Feedback (Toast)
        this.showSaveIcon();
    }

    load() {
        const json = localStorage.getItem(this.saveKey);
        if (!json) {
            console.log("No save found.");
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
                this.game.ui.renderInventory();
            }

            // Restore Stats
            if (data.stats) {
                player.hp = data.stats.hp || 100;
                player.stamina = data.stats.stamina || 100;
            }

            // Restore Story
            if (data.story && this.game.story) {
                this.game.story.state = data.story.state;
                // If boss was defeated, ensure it stays defeated
                if (this.game.story.state === 'VICTORY') {
                    this.game.story.guardian = null; // Prevent spawn
                    this.game.ui.hideBossBar();
                }
            }

            // Restore World Time & Fog
            if (data.world) {
                this.game.world.time = data.world.time || 0;

                // Restore Fog
                if (data.world.fog && this.game.world.fogGrid) {
                    data.world.fog.forEach(index => {
                        if (this.game.world.fogGrid[index]) {
                            this.game.world.fogGrid[index].isDiscovered = true;
                        }
                    });
                    // Force MapManager to redraw fog based on grid
                    // We need a method in MapManager for this, or we can just rely on the towers unlocking below
                    // But for exploration fog, we should ideally redraw.
                    // For now, let's assume towers handle the big reveals.
                }

                // Restore Towers
                if (data.world.towers && this.game.world.towers) {
                    this.game.world.towers.forEach(tower => {
                        if (data.world.towers[tower.id]) {
                            // Tower was unlocked
                            tower.isUnlocked = true;
                            // Update Visuals (Blue)
                            tower.mesh.material.color.setHex(0x33ccff);
                            tower.light.color.setHex(0x33ccff);
                            // Update Map Icon & Reveal Fog
                            if (this.game.ui.mapManager) {
                                this.game.ui.mapManager.unlockTower(tower);
                            }
                        }
                    });
                }
            }

            console.log("Game Loaded!", data);
            return true;
        } catch (e) {
            console.error("Failed to load save:", e);
            return false;
        }
    }

    reset() {
        localStorage.removeItem(this.saveKey);
        // location.reload(); // Removed to prevent loop
        console.log("Save cleared for new game.");
    }

    showSaveIcon() {
        // Simple visual feedback
        const icon = document.createElement('div');
        icon.innerText = '💾 Saving...';
        icon.style.position = 'absolute';
        icon.style.bottom = '20px';
        icon.style.right = '20px';
        icon.style.color = 'white';
        icon.style.fontFamily = 'sans-serif';
        icon.style.opacity = '1';
        icon.style.transition = 'opacity 1s';
        document.body.appendChild(icon);

        setTimeout(() => {
            icon.style.opacity = '0';
            setTimeout(() => icon.remove(), 1000);
        }, 2000);
    }
}
