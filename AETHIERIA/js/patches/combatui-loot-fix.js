// Patch amélioré pour CombatUI - Support robuste du texte de loot
// Réécriture complète de showDamage pour gérer nombres ET textes

console.log('[PATCH] CombatUI Enhanced Loot System loaded');

window.addEventListener('DOMContentLoaded', () => {
    const checkCombatUI = setInterval(() => {
        if (window.game && window.game.combatUI) {
            clearInterval(checkCombatUI);

            // Créer ou récupérer le conteneur de dégâts
            let damageContainer = document.getElementById('damage-container');
            if (!damageContainer) {
                damageContainer = document.createElement('div');
                damageContainer.id = 'damage-container';
                damageContainer.style.position = 'absolute';
                damageContainer.style.top = '0';
                damageContainer.style.left = '0';
                damageContainer.style.width = '100%';
                damageContainer.style.height = '100%';
                damageContainer.style.pointerEvents = 'none';
                damageContainer.style.overflow = 'hidden';
                damageContainer.style.zIndex = '5000';
                document.body.appendChild(damageContainer);
            }

            // Fonction helper pour convertir position 3D en 2D
            const toScreenPosition = (position, camera) => {
                const vector = position.clone();
                vector.project(camera);
                return {
                    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
                    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
                };
            };

            // Remplacer showDamage par une version robuste
            window.game.combatUI.showDamage = function (position, amount, isCrit = false) {
                const el = document.createElement('div');
                el.style.position = 'absolute';
                el.style.fontWeight = 'bold';
                el.style.textShadow = '2px 2px 0 #000';
                el.style.transition = 'top 1s ease-out, opacity 1s ease-out';
                el.style.opacity = '1.0';
                el.style.pointerEvents = 'none';
                el.style.fontFamily = 'Arial, sans-serif';

                // === LOGIQUE DE TYPE ROBUSTE ===
                if (typeof amount === 'number' && !isNaN(amount)) {
                    // C'est des DÉGÂTS (nombre valide)
                    const val = Math.floor(amount);
                    el.innerText = val.toString();
                    el.style.color = isCrit ? '#ff0000' : '#ffffff';
                    el.style.fontSize = isCrit ? '32px' : '20px';
                } else if (typeof amount === 'string') {
                    // C'est du LOOT (texte)
                    el.innerText = amount;

                    // Couleur selon rareté (détection de mots-clés)
                    const lowerText = amount.toLowerCase();
                    if (lowerText.includes('légendaire') || lowerText.includes('legendary')) {
                        el.style.color = '#FFD700'; // Or
                    } else if (lowerText.includes('rare')) {
                        el.style.color = '#00BFFF'; // Bleu
                    } else {
                        el.style.color = '#32CD32'; // Vert (défaut loot)
                    }

                    el.style.fontSize = '18px';
                    el.style.textShadow = '0px 0px 6px #000';
                } else {
                    // Type invalide - ne rien afficher
                    console.warn('[PATCH] CombatUI.showDamage: Invalid amount type:', typeof amount, amount);
                    return;
                }

                damageContainer.appendChild(el);

                // Positionnement initial
                const screenPos = toScreenPosition(position, this.game.camera);
                el.style.left = screenPos.x + 'px';
                const currentTop = screenPos.y;
                el.style.top = currentTop + 'px';

                // Animation CSS (monte et disparaît)
                requestAnimationFrame(() => {
                    el.style.top = (currentTop - 100) + 'px';
                    el.style.opacity = '0';
                });

                // Nettoyage automatique
                setTimeout(() => {
                    if (el.parentNode) {
                        el.remove();
                    }
                }, 1200);

                console.log(`[PATCH] CombatUI: Displayed ${typeof amount === 'number' ? 'damage' : 'loot'}: "${amount}"`);
            };

            console.log('[PATCH] CombatUI.showDamage() enhanced with robust type checking');
        }
    }, 100);
});
