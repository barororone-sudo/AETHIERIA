// Patch pour ajouter les méthodes manquantes à SaveManager et InventoryManager
// Ce script ajoute deleteSave() et hasItem() sans modifier les fichiers sources

console.log('[PATCH] Manager methods patch loaded');

window.addEventListener('DOMContentLoaded', () => {
    const checkManagers = setInterval(() => {
        if (window.game && window.game.saveManager && window.game.player && window.game.player.inventory) {
            clearInterval(checkManagers);

            // === PATCH SAVEMANAGER ===
            if (!window.game.saveManager.deleteSave) {
                window.game.saveManager.deleteSave = async function (slotIndex) {
                    const key = `aethieria_save_${slotIndex}`;
                    localStorage.removeItem(key);
                    console.log(`💾 [PATCH] Save slot ${slotIndex} deleted.`);

                    // Rafraîchir l'interface immédiatement
                    if (this.game.ui) {
                        const slots = await this.getSlotsInfo();
                        this.game.ui.createSlotSelectionUI(slots);
                    }
                    return true;
                };
                console.log('[PATCH] SaveManager.deleteSave() added');
            }

            // === PATCH INVENTORYMANAGER ===
            if (!window.game.player.inventory.hasItem) {
                window.game.player.inventory.hasItem = function (itemId) {
                    return this.slots.some(slot => slot && slot.id === itemId && slot.count > 0);
                };
                console.log('[PATCH] InventoryManager.hasItem() added');
            }

            console.log('[PATCH] Manager methods successfully patched');
        }
    }, 100);
});
