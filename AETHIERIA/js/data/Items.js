// js/data/Items.js

export const ItemType = {
    WEAPON: 'weapon',
    CONSUMABLE: 'consumable',
    MATERIAL: 'material'
};

export const Items = {
    'sword_iron': {
        id: 'sword_iron',
        name: 'Iron Sword',
        type: ItemType.WEAPON,
        description: 'A standard iron sword.',
        stats: { attack: 10 },
        color: '#aaaaaa',
        iconAtlas: { x: 0, y: 0 } // Nano Banana Placeholder
    },
    'potion_health': {
        id: 'potion_health',
        name: 'Health Potion',
        type: ItemType.CONSUMABLE,
        description: 'Restores 50 HP.',
        effect: { heal: 50 },
        color: '#ff4444',
        iconAtlas: { x: 1, y: 0 }
    },
    'crystal_pyro': {
        id: 'crystal_pyro',
        name: 'Pyro Crystal',
        type: ItemType.MATERIAL,
        description: 'A crystal infused with fire energy.',
        color: '#ff8800',
        iconAtlas: { x: 2, y: 0 }
    },
    'shield_wood': {
        id: 'shield_wood',
        name: 'Wooden Shield',
        type: ItemType.WEAPON, // Or ARMOR if we add that type
        description: 'A basic wooden shield.',
        stats: { defense: 5 },
        color: '#8B4513',
        iconAtlas: { x: 3, y: 0 }
    }
};
