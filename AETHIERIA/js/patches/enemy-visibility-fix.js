// EMERGENCY FIX: Force all enemy meshes to be visible
// This patch runs after game initialization to fix invisible enemies

console.log('[PATCH] Enemy Visibility Fix loading...');

// Wait for game to be ready
const waitForGame = setInterval(() => {
    if (window.game && window.game.world && window.game.world.enemies) {
        clearInterval(waitForGame);
        applyEnemyVisibilityFix();
    }
}, 100);

function applyEnemyVisibilityFix() {
    console.log('[PATCH] Applying enemy visibility fix...');

    const enemies = window.game.world.enemies || [];
    let fixedCount = 0;

    enemies.forEach((enemy, index) => {
        if (!enemy.mesh) {
            console.warn(`[PATCH] Enemy ${index} has no mesh!`);
            return;
        }

        // Force visibility on all meshes
        enemy.mesh.visible = true;
        enemy.mesh.frustumCulled = false; // 🔧 FIX: Disable frustum culling

        // Traverse all children and fix them
        enemy.mesh.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false; // 🔧 FIX: Prevent disappearing

                // Fix material issues
                if (child.material) {
                    // Ensure material is not transparent/invisible
                    if (child.material.opacity !== undefined && child.material.opacity < 0.1) {
                        child.material.opacity = 1.0;
                    }

                    // Force material update
                    child.material.needsUpdate = true;

                    // Note: Can't convert MeshBasicMaterial without THREE import
                    // Just ensure it's visible
                }

                fixedCount++;
            }
        });
    });

    console.log(`[PATCH] ✅ Fixed ${fixedCount} enemy meshes across ${enemies.length} enemies`);

    // Re-apply fix every 5 seconds for newly spawned enemies
    setInterval(() => {
        const currentEnemies = window.game.world.enemies || [];
        currentEnemies.forEach((enemy) => {
            if (enemy.mesh && !enemy.isDead) {
                enemy.mesh.visible = true;
                enemy.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = true;
                    }
                });
            }
        });
    }, 5000);
}

console.log('[PATCH] Enemy visibility fix loaded');
