// Patch pour corriger la minimap et le reveal
// Ce script active la minimap au démarrage et lie la touche 'M'

console.log('[PATCH] Minimap and reveal fix loaded');

// Attendre que le jeu soit initialisé
window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game && window.game.ui && window.game.ui.mapManager) {
            clearInterval(checkGame);

            // 1. Afficher la minimap au démarrage du jeu
            const originalGameStart = window.game.start.bind(window.game);
            window.game.start = async function (loadSave) {
                await originalGameStart(loadSave);

                // Afficher la minimap
                if (this.ui && this.ui.mapManager) {
                    this.ui.mapManager.show();
                    console.log('[PATCH] Minimap shown on game start');
                }
            };

            // 2. Lier la touche 'M' pour toggle la carte
            document.addEventListener('keydown', (e) => {
                // Touche 'M' pour la carte
                if (e.key.toLowerCase() === 'm' && window.game && window.game.ui && window.game.ui.mapManager) {
                    // Ne pas toggle si on est dans un menu ou dialogue
                    if (window.game.isPaused || window.game.dialogueManager?.isActive) {
                        return;
                    }

                    window.game.ui.mapManager.toggleMap();
                    console.log('[PATCH] Map toggled with M key');
                }
            });

            console.log('[PATCH] Minimap and map toggle (M key) enabled');
        }
    }, 100);
});
