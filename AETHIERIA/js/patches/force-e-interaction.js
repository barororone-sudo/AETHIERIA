// Patch to force E key interaction with quest items
console.log('[PATCH] Force E interaction loading...');

let lastEKeyState = false;

window.addEventListener('DOMContentLoaded', () => {
    // Override keyboard input to ensure E key works
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyE' && !lastEKeyState) {
            lastEKeyState = true;
            console.log('[PATCH] E key pressed - forcing quest item check');

            // Wait for game to be ready
            if (window.game && window.game.player && window.game.player.checkQuestItems) {
                window.game.player.checkQuestItems();
            } else {
                console.log('[PATCH] Game not ready yet');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyE') {
            lastEKeyState = false;
        }
    });

    console.log('[PATCH] ✅ Force E interaction loaded');
});
