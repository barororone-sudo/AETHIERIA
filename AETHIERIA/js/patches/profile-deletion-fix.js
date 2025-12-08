// Patch pour corriger le rafraîchissement de l'UI après suppression de profil
// Ce script intercepte la méthode createProfileCard et corrige le bouton de suppression

console.log('[PATCH] Profile deletion UI refresh fix loaded');

// Attendre que le jeu soit initialisé
window.addEventListener('DOMContentLoaded', () => {
    // Attendre que UIManager soit disponible
    const checkUIManager = setInterval(() => {
        if (window.game && window.game.ui) {
            clearInterval(checkUIManager);

            // Sauvegarder la méthode originale
            const originalCreateProfileCard = window.game.ui.createProfileCard.bind(window.game.ui);

            // Remplacer par une version corrigée
            window.game.ui.createProfileCard = function (slot, overlay) {
                const card = originalCreateProfileCard(slot, overlay);

                // Si c'est une carte remplie, corriger le bouton de suppression
                if (slot.exists) {
                    const deleteBtn = card.querySelector('.delete-btn');
                    if (deleteBtn) {
                        // Supprimer l'ancien handler
                        deleteBtn.onclick = null;

                        // Ajouter le nouveau handler corrigé
                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            console.log('[PATCH] Delete button clicked for slot:', slot.id);

                            if (confirm(`Supprimer le Profil ${slot.id} ?`)) {
                                console.log('[PATCH] User confirmed deletion');

                                // Supprimer le slot
                                await this.game.saveManager.deleteSlot(slot.id);

                                // Supprimer TOUS les overlays existants
                                document.querySelectorAll('.zelda-save-screen').forEach(o => o.remove());

                                // Recréer l'UI avec les nouveaux slots
                                const newSlots = await this.game.saveManager.getSlotsInfo();
                                await this.createSlotSelectionUI(newSlots);

                                console.log('[PATCH] UI refreshed successfully');
                            }
                        }, true);
                    }
                }

                return card;
            };

            console.log('[PATCH] Profile deletion fix applied successfully');
        }
    }, 100);
});
