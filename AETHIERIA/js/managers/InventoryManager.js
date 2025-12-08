// js/managers/InventoryManager.js
import { ItemType } from '../data/Items.js';
import { ItemCategory } from '../data/ItemsDb.js';

export class InventoryManager {
    constructor(player) {
        this.player = player;
        this.slots = new Array(20).fill(null); // 20 Slots
        this.maxStack = 99;
    }

    addItem(itemId, count = 1) {
        // Use DataManager
        const itemDef = this.player.game.data.getItem(itemId);

        if (!itemDef) {
            console.error(`Item ${itemId} not found in DB!`);
            return false;
        }

        // 1. Try to stack
        if (itemDef.type !== ItemType.WEAPON) { // Weapons don't stack usually
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i] && this.slots[i].id === itemId && this.slots[i].count < this.maxStack) {
                    const space = this.maxStack - this.slots[i].count;
                    const add = Math.min(space, count);
                    this.slots[i].count += add;
                    count -= add;
                    if (count === 0) return true;
                }
            }
        }

        // 2. Add to empty slot
        if (count > 0) {
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i] === null) {
                    this.slots[i] = { id: itemId, count: count };
                    return true;
                }
            }
        }

        console.warn("Inventory Full!");
        return false;
    }

    removeItem(index, count = 1) {
        if (!this.slots[index]) return false;

        this.slots[index].count -= count;
        if (this.slots[index].count <= 0) {
            this.slots[index] = null;
        }
        return true;
    }

    useItem(index) {
        const slot = this.slots[index];
        if (!slot) return;

        const itemDef = this.player.game.data.getItem(slot.id);
        if (!itemDef) return;

        if (itemDef.type === ItemType.CONSUMABLE) {
            if (itemDef.effect.heal) {
                this.player.heal(itemDef.effect.heal);
            }
            this.removeItem(index, 1);
        } else if (itemDef.type === ItemType.WEAPON) {
            this.player.equip(slot.id);
        }
    }

    useItemById(itemId) {
        // Find first slot with this item
        const index = this.slots.findIndex(slot => slot && slot.id === itemId);
        if (index !== -1) {
            this.useItem(index);
            return true;
        }
        console.log(`Item ${itemId} not found in inventory.`);
        return false;
    }

    getInventoryData() {
        return this.slots;
    }

    getSlotsByCategory(filter) {
        if (filter === 'ALL') {
            // Return all valid slots with their index
            return this.slots.map((slot, index) => ({ slot, index })).filter(item => item.slot !== null);
        }

        const filtered = [];
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (!slot) continue;

            const item = this.player.game.data.getItem(slot.id);
            if (!item) continue;

            let match = false;
            switch (filter) {
                case 'WEAPON':
                    match = (item.category === ItemCategory.WEAPON || item.category === ItemCategory.ARMOR);
                    break;
                case 'HEAL':
                    match = (item.category === ItemCategory.CONSUMABLE || item.category === ItemCategory.FOOD);
                    break;
                case 'MATERIAL':
                    match = (item.category === ItemCategory.MATERIAL || item.category === ItemCategory.MATERIAL_WEAPON);
                    break;
                case 'QUEST':
                    match = (item.category === ItemCategory.QUEST);
                    break;
            }

            if (match) {
                filtered.push({ slot, index: i });
            }
        }
        return filtered;
    }
}
