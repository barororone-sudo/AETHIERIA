
export const ItemCategory = {
    WEAPON: 'WEAPON',
    ARMOR: 'ARMOR',
    CONSUMABLE: 'CONSUMABLE',
    FOOD: 'FOOD',
    MATERIAL: 'MATERIAL',
    MATERIAL_WEAPON: 'MATERIAL_WEAPON',
    QUEST: 'QUEST'
};

export const WeaponType = {
    SWORD: 'SWORD',
    GREATSWORD: 'GREATSWORD',
    DAGGER: 'DAGGER',
    SPEAR: 'SPEAR',
    DOUBLE_BLADE: 'DOUBLE_BLADE',
    BOW: 'BOW'
};

export const Rarity = {
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 3,
    EPIC: 4,
    LEGENDARY: 5
};

export const ItemsDb = [
    // --- WEAPONS ---
    {
        id: 'sword_starter',
        name: 'Épée d\'Entraînement',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.SWORD,
        rarity: Rarity.COMMON,
        visualStats: { color: '#888888', bladeLength: 0.8, guardType: 'SIMPLE', emissive: 0 },
        stats: { damage: 80, speed: 1.0, critChance: 0.05 },
        description: "Une lame simple pour commencer l'aventure."
    },
    {
        id: 'sword_steel',
        name: 'Lame d\'Acier',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.SWORD,
        rarity: Rarity.UNCOMMON,
        visualStats: { color: '#C0C0C0', bladeLength: 0.9, guardType: 'CROSS', emissive: 0 },
        stats: { damage: 150, speed: 1.1, critChance: 0.10 },
        description: "Forgée dans un acier résistant."
    },
    {
        id: 'sword_plasma',
        name: 'Sabre Plasma',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.SWORD,
        rarity: Rarity.EPIC,
        visualStats: { color: '#00FFFF', bladeLength: 1.0, guardType: 'TECH', emissive: 2.0 },
        stats: { damage: 350, speed: 1.3, critChance: 0.25 },
        description: "Une technologie avancée qui coupe à travers l'armure."
    },
    {
        id: 'greatsword_iron',
        name: 'Espadon de Fer',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.GREATSWORD,
        rarity: Rarity.COMMON,
        visualStats: { color: '#555555', bladeLength: 1.6, guardType: 'HEAVY', emissive: 0 },
        stats: { damage: 250, speed: 0.6, critChance: 0.10 },
        description: "Lourd et brutale."
    },
    {
        id: 'greatsword_magma',
        name: 'Tranche-Montagne',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.GREATSWORD,
        rarity: Rarity.LEGENDARY,
        visualStats: { color: '#FF4400', bladeLength: 1.8, guardType: 'SPIKED', emissive: 1.5 },
        stats: { damage: 600, speed: 0.5, critChance: 0.40 },
        description: "Fait trembler la terre à chaque coup."
    },
    {
        id: 'dagger_thief',
        name: 'Surin de Voleur',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.DAGGER,
        rarity: Rarity.COMMON,
        visualStats: { color: '#444444', bladeLength: 0.4, guardType: 'NONE', emissive: 0 },
        stats: { damage: 50, speed: 2.5, critChance: 0.30 },
        description: "Parfait pour les attaques sournoises."
    },
    {
        id: 'dagger_void',
        name: 'Croc du Néant',
        category: ItemCategory.WEAPON,
        weaponType: WeaponType.DAGGER,
        rarity: Rarity.RARE,
        visualStats: { color: '#9900FF', bladeLength: 0.5, guardType: 'CURVED', emissive: 1.0 },
        stats: { damage: 120, speed: 2.8, critChance: 0.50 },
        description: "Vibre d'une énergie sombre."
    },

    // --- ARMOR (New) ---
    {
        id: 'shield_wood',
        name: 'Bouclier en Bois',
        category: ItemCategory.ARMOR,
        rarity: Rarity.COMMON,
        visualStats: { color: '#8B4513' },
        stats: { defense: 50 },
        description: "Protège des petites attaques."
    },

    // --- CONSUMABLES (Potions) ---
    {
        id: 'potion_health',
        name: 'Potion de Soin',
        category: ItemCategory.CONSUMABLE,
        rarity: Rarity.COMMON,
        visualStats: { color: '#FF0000' },
        stats: { heal: 500 },
        description: "Restaure 500 PV instantanément."
    },

    // --- FOOD (Buffs) ---
    {
        id: 'apple_red',
        name: 'Pomme Rouge',
        category: ItemCategory.FOOD,
        rarity: Rarity.COMMON,
        visualStats: { color: '#FF0000', shape: 'SPHERE' }, // Placeholder visual
        stats: { heal: 100 },
        description: "Une pomme croquante. Restaure un peu de vie."
    },
    {
        id: 'steak_wolf',
        name: 'Steak de Loup',
        category: ItemCategory.FOOD,
        rarity: Rarity.UNCOMMON,
        visualStats: { color: '#8B4513', shape: 'CUBE' },
        stats: { heal: 200 },
        buff: { type: 'ATTACK', value: 50, duration: 60 },
        description: "Viande grillée. Augmente l'Attaque de 50 pendant 60s."
    },

    // --- MATERIALS (Crafting) ---
    {
        id: 'slime_jelly',
        name: 'Gelée de Slime',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.COMMON,
        description: "Visqueux mais utile pour l'alchimie."
    },
    {
        id: 'material_slime', // Legacy Alias
        name: 'Gelée de Slime',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.COMMON,
        description: "Visqueux mais utile pour l'alchimie."
    },
    {
        id: 'goblin_fang',
        name: 'Croc de Gobelin',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.COMMON,
        description: "Pointu et jauni."
    },
    // WEAPON UPGRADE MATERIALS
    {
        id: 'iron_ore',
        name: 'Minerai de Fer',
        category: ItemCategory.MATERIAL_WEAPON,
        rarity: Rarity.COMMON,
        stats: { xpValue: 100 },
        description: "Matériau d'amélioration basique. (XP Faible)"
    },
    {
        id: 'crystal_ethereal',
        name: 'Cristal Éthéré',
        category: ItemCategory.MATERIAL_WEAPON,
        rarity: Rarity.RARE,
        stats: { xpValue: 500 },
        description: "Un cristal vibrant d'énergie pure. (XP Moyen)"
    },
    {
        id: 'golem_core',
        name: 'Cœur de Golem',
        category: ItemCategory.MATERIAL_WEAPON,
        rarity: Rarity.EPIC,
        stats: { xpValue: 2000 },
        description: "Le cœur pulsant d'un ancien gardien. (XP Élevé)"
    },

    { // Legacy aliases for loot tables
        id: 'material_slime_red',
        name: 'Gelée Rouge Instable',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.UNCOMMON,
        description: "Explosif."
    },
    {
        id: 'material_slime_blue',
        name: 'Gelée Bleue Glaciale',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.UNCOMMON,
        description: "Froide au toucher."
    },
    {
        id: 'coin_gold',
        name: 'Pièce d\'Or',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.COMMON,
        description: "Monnaie d'échange universelle."
    },
    {
        id: 'crystal_pyro',
        name: 'Cristal Pyro',
        category: ItemCategory.MATERIAL,
        rarity: Rarity.RARE,
        description: "Contient l'essence du feu."
    },

    // --- QUEST ITEMS ---
    {
        id: 'dungeon_key',
        name: 'Clé du Donjon',
        category: ItemCategory.QUEST,
        rarity: Rarity.RARE,
        description: "Ouvre la porte du donjon oublié."
    },
    {
        id: 'ancient_key',
        name: 'Clé Ancienne',
        category: ItemCategory.QUEST,
        rarity: Rarity.EPIC,
        description: "Ouvre les portes et coffres rares scellés par la magie."
    }
];

export const getItemById = (id) => ItemsDb.find(i => i.id === id);
