// js/managers/InventoryManager.js
import { Items, ItemType } from '../data/Items.js';

export class InventoryManager {
    constructor(player) {
        this.player = player;
        this.slots = new Array(20).fill(null); // 20 Slots
        this.maxStack = 99;
    }

    addItem(itemId, count = 1) {
        const itemDef = Items[itemId];
        if (!itemDef) {
            console.error(`Item ${itemId} not found!`);
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

        const itemDef = Items[slot.id];

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

    loadInventoryData(data) {
        this.slots = data || new Array(20).fill(null);
    }
}
