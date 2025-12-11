// CRITICAL PERFORMANCE PATCH
console.log('[PATCH] Performance optimization loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game) {
            clearInterval(checkGame);

            console.log('[PATCH] Applying performance optimizations...');

            // 1. REDUCE FPS TARGET
            if (window.game.animate) {
                const originalAnimate = window.game.animate.bind(window.game);
                let lastFrame = 0;
                const targetFPS = 40; // Lower FPS for better performance
                const frameTime = 1000 / targetFPS;

                window.game.animate = function () {
                    const now = performance.now();
                    const elapsed = now - lastFrame;

                    if (elapsed < frameTime) {
                        requestAnimationFrame(this.animate.bind(this));
                        return;
                    }

                    lastFrame = now - (elapsed % frameTime);
                    originalAnimate();
                };

                console.log(`[PATCH] FPS limited to ${targetFPS}`);
            }

            // 2. REDUCE ENEMY UPDATE FREQUENCY
            if (window.game.world) {
                const originalWorldUpdate = window.game.world.update.bind(window.game.world);
                let enemyUpdateCounter = 0;

                window.game.world.update = function (dt, playerBody) {
                    // Only update 10 enemies per frame instead of all
                    const MAX_ENEMY_UPDATES = 10;

                    if (this.enemies && this.enemies.length > 0) {
                        const startIndex = enemyUpdateCounter % this.enemies.length;
                        const endIndex = Math.min(startIndex + MAX_ENEMY_UPDATES, this.enemies.length);

                        // Temporarily store all enemies
                        const allEnemies = this.enemies;
                        // Only update subset
                        this.enemies = allEnemies.slice(startIndex, endIndex);

                        originalWorldUpdate.call(this, dt, playerBody);

                        // Restore all enemies
                        this.enemies = allEnemies;

                        enemyUpdateCounter += MAX_ENEMY_UPDATES;
                    } else {
                        originalWorldUpdate.call(this, dt, playerBody);
                    }
                };

                console.log('[PATCH] Enemy update frequency reduced');
            }

            // 3. DISABLE EXPENSIVE VISUAL EFFECTS
            if (window.game.renderer && window.game.renderer.composer) {
                // Reduce bloom intensity
                const composer = window.game.renderer.composer;
                if (composer.passes) {
                    composer.passes.forEach(pass => {
                        if (pass.strength !== undefined) {
                            pass.strength *= 0.5; // Reduce bloom
                        }
                    });
                }
                console.log('[PATCH] Visual effects reduced');
            }

            // 4. LOG FPS
            let frameCount = 0;
            let lastFPSLog = performance.now();

            setInterval(() => {
                const now = performance.now();
                const elapsed = (now - lastFPSLog) / 1000;
                const fps = frameCount / elapsed;

                console.log(`[PERFORMANCE] FPS: ${fps.toFixed(1)}`);

                frameCount = 0;
                lastFPSLog = now;
            }, 5000); // Log every 5 seconds

            // Count frames
            const originalRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = function (callback) {
                frameCount++;
                return originalRAF(callback);
            };

            console.log('[PATCH] ✅ Performance optimizations applied');
            console.log('[PATCH] Target FPS: 40, Enemy updates: 10/frame');
        }
    }, 100);
});
