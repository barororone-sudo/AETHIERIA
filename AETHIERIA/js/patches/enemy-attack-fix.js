// Patch to ensure enemies attack and deal damage to player
console.log('[PATCH] Enemy attack fix loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game && window.game.world && window.game.world.enemies) {
            clearInterval(checkGame);

            console.log('[PATCH] Patching enemy attack system...');

            // Patch all existing enemies
            window.game.world.enemies.forEach(enemy => {
                if (!enemy._attackPatched) {
                    const originalUpdate = enemy.update.bind(enemy);

                    enemy.update = function (dt, playerPosition) {
                        // Call original update
                        originalUpdate(dt, playerPosition);

                        // Ensure attack deals damage
                        if (this.state === 'ATTACK' && window.game.player) {
                            const player = window.game.player;
                            const dist = this.body.position.distanceTo(player.body.position);

                            // Deal damage when in range
                            if (dist < 3.0 && this.timers && this.timers.attack > 1.5 && this.timers.attack < 1.8) {
                                const damage = this.damageVal || this.stats?.damage || 10;
                                if (player.takeDamage) {
                                    player.takeDamage(damage);
                                    console.log(`[PATCH] Enemy dealt ${damage} damage`);
                                }
                            }
                        }
                    };

                    enemy._attackPatched = true;
                }
            });

            console.log(`[PATCH] ✅ Patched ${window.game.world.enemies.length} enemies`);
        }
    }, 100);
});
