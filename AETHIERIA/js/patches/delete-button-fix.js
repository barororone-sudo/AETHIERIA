// Patch pour corriger le bouton de suppression de profil
// Ce patch intercepte la création des cartes de profil et corrige les event handlers

console.log('[PATCH] Delete button fix loaded');

// Sauvegarder la méthode originale
const originalCreateProfileCard = window.UIManager?.prototype?.createProfileCard;

if (originalCreateProfileCard) {
    window.UIManager.prototype.createProfileCard = function (slot, overlay) {
        // Appeler la méthode originale
        const card = originalCreateProfileCard.call(this, slot, overlay);

        if (slot.exists) {
            // Trouver le bouton de suppression
            const deleteBtn = card.querySelector('.delete-btn');

            if (deleteBtn) {
                console.log('[PATCH] Fixing delete button for slot', slot.id);

                // Supprimer l'ancien handler
                deleteBtn.onclick = null;

                // Ajouter le nouveau handler avec addEventListener
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('[PATCH] Delete button clicked for slot:', slot.id);

                    if (confirm(`Supprimer le Profil ${slot.id} ?`)) {
                        console.log('[PATCH] User confirmed deletion');
                        await this.game.saveManager.deleteSlot(slot.id);
                        overlay.remove();
                        const newSlots = await this.game.saveManager.getSlotsInfo();
                        await this.createSlotSelectionUI(newSlots);
                    }
                }, true); // Use capture phase
            }

            // Corriger aussi le handler de la carte
            const oldCardClick = card.onclick;
            card.onclick = null;
            card.addEventListener('click', (e) => {
                // Ne pas déclencher si on clique sur le bouton delete
                if (e.target.closest('.delete-btn')) {
                    console.log('[PATCH] Click on delete button, ignoring card click');
                    return;
                }
                console.log('[PATCH] Card clicked for slot:', slot.id);
                this.game.saveManager.selectSlot(slot.id);
                overlay.remove();
                this.game.start(true);
            });
        }

        return card;
    };

    console.log('[PATCH] Delete button fix applied successfully');
} else {
    console.error('[PATCH] UIManager.prototype.createProfileCard not found, patch not applied');
}
