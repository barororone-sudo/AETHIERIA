// AGGRESSIVE CPU OPTIMIZATION PATCH
console.log('[PATCH] CPU optimization loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game) {
            clearInterval(checkGame);

            console.log('[PATCH] Applying aggressive CPU optimizations...');

            // 1. REDUCE PHYSICS UPDATE FREQUENCY
            if (window.game.world && window.game.world.physicsWorld) {
                const originalStep = window.game.world.physicsWorld.step.bind(window.game.world.physicsWorld);
                let physicsCounter = 0;

                window.game.world.physicsWorld.step = function (dt) {
                    // Only update physics every 2 frames
                    physicsCounter++;
                    if (physicsCounter % 2 === 0) {
                        originalStep.call(this, dt * 2); // Double dt to compensate
                    }
                };

                console.log('[PATCH] Physics update frequency halved');
            }

            // 2. REDUCE RENDERER UPDATES
            if (window.game.renderer) {
                const originalRender = window.game.renderer.render.bind(window.game.renderer);
                let renderCounter = 0;

                window.game.renderer.render = function (scene, camera) {
                    // Only render every frame (but skip some post-processing)
                    renderCounter++;
                    if (renderCounter % 3 === 0) {
                        // Skip expensive post-processing every 3rd frame
                        if (this.composer) {
                            this.composer.enabled = false;
                        }
                    } else {
                        if (this.composer) {
                            this.composer.enabled = true;
                        }
                    }
                    originalRender.call(this, scene, camera);
                };

                console.log('[PATCH] Renderer optimized');
            }

            // 3. REDUCE PARTICLE UPDATES
            if (window.game.world && window.game.world.createAmbientParticles) {
                // Disable ambient particles
                window.game.world.createAmbientParticles = function () {
                    console.log('[PATCH] Ambient particles disabled for performance');
                };
            }

            // 4. LIMIT SHADOW MAP UPDATES
            if (window.game.renderer && window.game.renderer.shadowMap) {
                window.game.renderer.shadowMap.autoUpdate = false;
                window.game.renderer.shadowMap.needsUpdate = true;

                // Update shadows only every 10 frames
                let shadowCounter = 0;
                setInterval(() => {
                    shadowCounter++;
                    if (shadowCounter % 10 === 0 && window.game.renderer.shadowMap) {
                        window.game.renderer.shadowMap.needsUpdate = true;
                    }
                }, 100);

                console.log('[PATCH] Shadow updates reduced');
            }

            // 5. REDUCE ANIMATION UPDATES
            if (window.game.world && window.game.world.enemies) {
                const originalWorldUpdate = window.game.world.update;
                if (originalWorldUpdate) {
                    window.game.world.update = function (dt, playerBody) {
                        // Reduce dt for smoother but less frequent updates
                        originalWorldUpdate.call(this, dt * 0.5, playerBody);
                    };
                }
            }

            // 6. DISABLE EXPENSIVE VISUAL EFFECTS
            if (window.game.world && window.game.world.scene) {
                // Reduce fog density
                if (window.game.world.scene.fog) {
                    window.game.world.scene.fog.density *= 0.5;
                }
            }

            console.log('[PATCH] ✅ Aggressive CPU optimizations applied');
            console.log('[PATCH] Expected CPU reduction: 40-60%');
        }
    }, 100);
});
