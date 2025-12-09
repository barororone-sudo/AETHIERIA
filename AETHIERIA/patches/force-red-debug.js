// DEBUG: Force tous les meshes visibles en ROUGE
// Attendre que le jeu soit chargé
window.addEventListener('load', () => {
    // Attendre 3 secondes que le jeu initialise
    setTimeout(() => {
        console.log('🔴 DEBUG: Forçage de tous les meshes en rouge...');

        if (!window.game || !window.game.world || !window.game.world.scene) {
            console.error('❌ Game non initialisé !');
            return;
        }

        let meshCount = 0;
        window.game.world.scene.traverse((obj) => {
            if (obj.isMesh) {
                // Remplacer le matériau par du rouge basique
                obj.material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,  // Rouge vif
                    wireframe: false,
                    side: THREE.DoubleSide
                });
                obj.visible = true;
                obj.frustumCulled = false;

                meshCount++;
                console.log(`  🔴 Mesh ${meshCount} forcé rouge:`, obj.name || 'unnamed');
            }
        });

        console.log(`✅ ${meshCount} meshes forcés en rouge`);
        console.log('Si vous ne voyez RIEN de rouge, le problème n\'est PAS les matériaux.');
    }, 3000);
});
