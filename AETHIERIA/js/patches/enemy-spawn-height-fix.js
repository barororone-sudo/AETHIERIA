// Patch to fix enemy spawn heights (prevent underground spawning)
console.log('[PATCH] Enemy spawn height fix loading...');

window.addEventListener('DOMContentLoaded', () => {
    const checkGame = setInterval(() => {
        if (window.game && window.game.world) {
            clearInterval(checkGame);

            console.log('[PATCH] Fixing enemy spawn heights...');

            // Patch spawnEnemy to use raycasting for ground height
            if (window.game.world.spawnEnemy) {
                const originalSpawnEnemy = window.game.world.spawnEnemy.bind(window.game.world);

                window.game.world.spawnEnemy = function (x, z, type) {
                    // Use raycasting to find ground height
                    let groundY = 0;

                    if (this.getGroundHeight) {
                        groundY = this.getGroundHeight(x, z);
                    } else {
                        // Fallback: raycast manually
                        const raycaster = new THREE.Raycaster();
                        raycaster.set(
                            new THREE.Vector3(x, 100, z),
                            new THREE.Vector3(0, -1, 0)
                        );

                        const intersects = raycaster.intersectObjects(this.scene.children, true);
                        if (intersects.length > 0) {
                            groundY = intersects[0].point.y;
                        }
                    }

                    // Ensure minimum height
                    groundY = Math.max(0, groundY);

                    // Spawn enemy at correct height
                    const enemy = originalSpawnEnemy.call(this, x, z, type);

                    if (enemy && enemy.body) {
                        enemy.body.position.y = groundY + 2; // 2 units above ground
                        if (enemy.mesh) {
                            enemy.mesh.position.y = groundY + 2;
                        }
                    }

                    return enemy;
                };

                console.log('[PATCH] ✅ Enemy spawn height fix applied');
            }
        }
    }, 100);
});
