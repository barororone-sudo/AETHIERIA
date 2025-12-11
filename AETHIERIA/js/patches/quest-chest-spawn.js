// Patch to spawn quest chest at beacon location
console.log('[PATCH] Quest chest spawning loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(async () => {
        if (window.game && window.game.world && window.game.world.scene) {
            clearInterval(checkGame);

            console.log('[PATCH] Spawning quest chest...');

            // Import QuestChest
            const { QuestChest } = await import('../world/QuestChest.js');

            // Spawn quest chest at beacon location (10, 0, -15)
            const questChest = new QuestChest(
                window.game,
                { x: 10, y: 0, z: -15 },
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

            console.log('[PATCH] ✅ Quest chest spawned at beacon location');
        }
    }, 100);
});
