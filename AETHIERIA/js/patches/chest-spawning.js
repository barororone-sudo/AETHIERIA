// Patch pour spawner des coffres dans le monde et connecter aux quêtes
// Ajoute spawnWorldObjects() à LevelManager et notifie StoryManager

console.log('[PATCH] Chest Spawning & Quest Integration loaded');

// Fonction pour spawner les coffres
const spawnChests = async (game) => {
    try {
        // Import des dépendances nécessaires
        const THREE = await import('three').then(m => m.default || m);
        const { Chest } = await import('../world/Chest.js');

        console.log('[PATCH] Spawning world objects (chests)...');

        // 1. Coffre de Tutoriel (Devant le joueur)
        const h1 = game.world.terrainManager.getHeightAt(0, -10);
        const chest1 = new Chest(
            game,
            game.world,
            new THREE.Vector3(0, h1, -10),
            1, // Tier 1 (Commun)
            false // Non verrouillé
        );

        // Patcher la méthode open du coffre pour notifier le StoryManager
        const originalOpen1 = chest1.open.bind(chest1);
        chest1.open = function () {
            originalOpen1();
            if (game.story && !this._notified) {
                console.log(`[PATCH] Chest opened, notifying story (tier: ${this.tier})`);
                game.story.triggerEvent('OPEN_CHEST', { tier: this.tier });
                this._notified = true;
            }
        };
        console.log('[PATCH] Tutorial chest spawned at (0, -10)');

        // 2. Coffre de Récompense (Loin, vers la tour)
        const h2 = game.world.terrainManager.getHeightAt(30, -50);
        const chest2 = new Chest(
            game,
            game.world,
            new THREE.Vector3(30, h2, -50),
            2, // Tier 2 (Rare)
            false
        );

        const originalOpen2 = chest2.open.bind(chest2);
        chest2.open = function () {
            originalOpen2();
            if (game.story && !this._notified) {
                console.log(`[PATCH] Chest opened, notifying story (tier: ${this.tier})`);
                game.story.triggerEvent('OPEN_CHEST', { tier: this.tier });
                this._notified = true;
            }
        };
        console.log('[PATCH] Reward chest spawned at (30, -50)');

        // 3. Coffre Précieux (Optionnel, loin)
        const h3 = game.world.terrainManager.getHeightAt(-60, -80);
        const chest3 = new Chest(
            game,
            game.world,
            new THREE.Vector3(-60, h3, -80),
            3, // Tier 3 (Précieux)
            false
        );

        const originalOpen3 = chest3.open.bind(chest3);
        chest3.open = function () {
            originalOpen3();
            if (game.story && !this._notified) {
                console.log(`[PATCH] Chest opened, notifying story (tier: ${this.tier})`);
                game.story.triggerEvent('OPEN_CHEST', { tier: this.tier });
                this._notified = true;
            }
        };
        console.log('[PATCH] Precious chest spawned at (-60, -80)');

        console.log('[PATCH] All chests spawned and patched successfully');

    } catch (err) {
        console.error('[PATCH] Failed to spawn chests:', err);
    }
};

// Attendre que le jeu soit prêt
window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game && window.game.world && window.game.world.terrainManager && window.game.story) {
            clearInterval(checkGame);

            // Attendre que le terrain soit généré
            setTimeout(() => {
                spawnChests(window.game);
            }, 3000);
        }
    }, 100);
});
