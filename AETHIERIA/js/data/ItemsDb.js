
export const WeaponType = {
    SWORD: 'SWORD',
    GREATSWORD: 'GREATSWORD',
    DAGGER: 'DAGGER',
    SPEAR: 'SPEAR'
};

export const Rarity = {
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 3,
    EPIC: 4,
    LEGENDARY: 5
};

export const ItemsDb = [
    // --- STARTER WEAPON ---
    {
        id: 'sword_starter',
        name: 'Épée d\'Entraînement',
        type: 'WEAPON',
        weaponType: WeaponType.SWORD,
        rarity: Rarity.COMMON,
        // Procedural Generation Data
        visualStats: {
            color: '#888888',
            bladeLength: 0.8,
            guardType: 'SIMPLE',
            emissive: 0
        },
        stats: {
            damage: 8,
            speed: 1.0,
            critChance: 0.05
        },
        description: "Une lame simple pour commencer l'aventure."
    },

    // --- SWORDS ---
    {
        id: 'sword_steel',
        name: 'Lame d\'Acier',
        type: 'WEAPON',
        weaponType: WeaponType.SWORD,
        rarity: Rarity.UNCOMMON,
        visualStats: {
            color: '#C0C0C0',
            bladeLength: 0.9,
            guardType: 'CROSS',
            emissive: 0
        },
        stats: {
            damage: 15,
            speed: 1.1,
            critChance: 0.10
        },
        description: "Forgée dans un acier résistant."
    },
    {
        id: 'sword_plasma',
        name: 'Sabre Plasma',
        type: 'WEAPON',
        weaponType: WeaponType.SWORD,
        rarity: Rarity.EPIC,
        visualStats: {
            color: '#00FFFF',
            bladeLength: 1.0,
            guardType: 'TECH',
            emissive: 2.0 // Glow
        },
        stats: {
            damage: 35,
            speed: 1.3,
            critChance: 0.25
        },
        description: "Une technologie avancée qui coupe à travers l'armure."
    },

    // --- GREATSWORDS (Heavy, Slow) ---
    {
        id: 'greatsword_iron',
        name: 'Espadon de Fer',
        type: 'WEAPON',
        weaponType: WeaponType.GREATSWORD,
        rarity: Rarity.COMMON,
        visualStats: {
            color: '#555555',
            bladeLength: 1.6,
            guardType: 'HEAVY',
            emissive: 0
        },
        stats: {
            damage: 25,
            speed: 0.6,
            critChance: 0.10
        },
        description: "Lourd et brutale."
    },
    {
        id: 'greatsword_magma',
        name: 'Tranche-Montagne',
        type: 'WEAPON',
        weaponType: WeaponType.GREATSWORD,
        rarity: Rarity.LEGENDARY,
        visualStats: {
            color: '#FF4400',
            bladeLength: 1.8,
            guardType: 'SPIKED',
            emissive: 1.5
        },
        stats: {
            damage: 60,
            speed: 0.5,
            critChance: 0.40
        },
        description: "Fait trembler la terre à chaque coup."
    },

    // --- DAGGERS (Fast, Low Base Dmg, High Crit) ---
    {
        id: 'dagger_thief',
        name: 'Surin de Voleur',
        type: 'WEAPON',
        weaponType: WeaponType.DAGGER,
        rarity: Rarity.COMMON,
        visualStats: {
            color: '#444444',
            bladeLength: 0.4,
            guardType: 'NONE',
            emissive: 0
        },
        stats: {
            damage: 5,
            speed: 2.5,
            critChance: 0.30
        },
        description: "Parfait pour les attaques sournoises."
    },
    {
        id: 'dagger_void',
        name: 'Croc du Néant',
        type: 'WEAPON',
        weaponType: WeaponType.DAGGER,
        rarity: Rarity.RARE,
        visualStats: {
            color: '#9900FF',
            bladeLength: 0.5,
            guardType: 'CURVED',
            emissive: 1.0
        },
        stats: {
            damage: 12,
            speed: 2.8,
            critChance: 0.50
        },
        description: "Vibre d'une énergie sombre."
    },
    {
        id: 'potion_health',
        name: 'Potion de Soin',
        type: 'CONSUMABLE',
        visualStats: { color: '#FF0000' },
        stats: { heal: 50 },
        description: "Restaure 50 PV."
    }
];

export const getItemById = (id) => ItemsDb.find(i => i.id === id);

