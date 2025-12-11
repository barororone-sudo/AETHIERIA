// Patch to spawn quest chest at beacon location
console.log('[PATCH] Quest chest spawning loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(async () => {
        if (window.game && window.game.world && window.game.world.scene && window.game.world.terrainManager) {
            clearInterval(checkGame);

            console.log('[PATCH] Spawning quest chest...');

            // Import QuestChest
            const { QuestChest } = await import('../world/QuestChest.js');

            const tm = window.game.world.terrainManager;
            const x = 10;
            const z = -15;
            let y = tm.getGlobalHeight(x, z);

            // Ensure not underwater (Water level ~2.0)
            if (y < 2.5) y = 2.5;

            // Spawn quest chest at beacon location
            const questChest = new QuestChest(
                window.game,
                { x, y, z },
                'ancient_communicator'
            );

            // Store reference
            if (!window.game.world.questChests) {
                window.game.world.questChests = [];
            }
            window.game.world.questChests.push(questChest);

            // Update quest chests in game loop
            const originalUpdate = window.game.world.update.bind(window.game.world);
            window.game.world.update = function (dt, playerBody) {
                originalUpdate(dt, playerBody);

                // Update quest chests
                if (this.questChests) {
                    this.questChests.forEach(chest => chest.update(dt));
                }
            };

            console.log(`[PATCH] ✅ Quest chest spawned at (${x}, ${y.toFixed(2)}, ${z})`);
        }
    }, 100);
});
