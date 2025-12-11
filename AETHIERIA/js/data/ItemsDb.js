
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

// 🛡️ ARMOR & SHIELD SYSTEM
export const ItemType = {
    WEAPON: 'WEAPON',
    SHIELD: 'SHIELD',
    HELMET: 'HELMET',
    CHESTPLATE: 'CHESTPLATE',
    LEGGINGS: 'LEGGINGS',
    CONSUMABLE: 'CONSUMABLE',
    MATERIAL: 'MATERIAL'
};

export const ArmorSet = {
    TRAVELER: 'TRAVELER',
    STONE: 'STONE',
    PYRO: 'PYRO'
};

export const PassiveType = {
    SPEED: 'SPEED',
    RESIST_FIRE: 'RESIST_FIRE',
    RESIST_WATER: 'RESIST_WATER',
    KNOCKBACK_IMMUNE: 'KNOCKBACK_IMMUNE',
    FIRE_DAMAGE: 'FIRE_DAMAGE'
};

export const SetBonuses = {
    TRAVELER: {
        pieces: 3,
        name: 'Voyageur Agile',
        bonus: { type: PassiveType.SPEED, value: 10 }
    },
    STONE: {
        pieces: 3,
        name: 'Inébranlable',
        bonus: { type: PassiveType.KNOCKBACK_IMMUNE, value: 1 }
    },
    PYRO: {
        pieces: 3,
        name: 'Maître du Feu',
        bonus: { type: PassiveType.FIRE_DAMAGE, value: 15 }
    }
};

export const ItemsDb = [
    // ========================================
    // QUEST ITEMS
    // ========================================
    {
        id: 'ancient_communicator',
        name: 'Communicateur Ancien',
        type: 'quest_item',
        description: 'Un étrange dispositif qui vibre doucement.',
        icon: '💎',
        rarity: 'quest',
        stackable: false
    },

    // ========================================
    // WEAPONS
    // ========================================
    // ========================================
    // WEAPONS (EXPANDED TO ~50)
    // ========================================

    // --- SWORDS (Balanced) ---
    { id: 'sword_rusted', name: 'Épée Rouillée', category: 'WEAPON', weaponType: 'SWORD', rarity: 1, stats: { damage: 60, speed: 1.0 }, visualStats: { color: '#8B4513' }, skill: { name: 'Frappe', cost: 10, type: 'STRIKE' } },
    { id: 'sword_iron', name: 'Épée en Fer', category: 'WEAPON', weaponType: 'SWORD', rarity: 1, stats: { damage: 90, speed: 1.0 }, visualStats: { color: '#C0C0C0' }, skill: { name: 'Estoc', cost: 15, type: 'THRUST' } },
    { id: 'sword_steel', name: 'Lame d\'Acier', category: 'WEAPON', weaponType: 'SWORD', rarity: 2, stats: { damage: 130, speed: 1.1 }, visualStats: { color: '#D3D3D3' }, skill: { name: 'Double Coupe', cost: 20, type: 'DOUBLE' } },
    { id: 'sword_knight', name: 'Gladius', category: 'WEAPON', weaponType: 'SWORD', rarity: 2, stats: { damage: 150, speed: 1.0 }, visualStats: { color: '#FFD700', guardType: 'CROSS' }, skill: { name: 'Brise-Garde', cost: 25, type: 'SMASH' } },
    { id: 'sword_fire', name: 'Lame Ardente', category: 'WEAPON', weaponType: 'SWORD', rarity: 3, stats: { damage: 220, speed: 1.1 }, visualStats: { color: '#FF4500', emissive: 1.0 }, skill: { name: 'Vague de Feu', cost: 40, type: 'AOE_FIRE' } },
    { id: 'sword_ice', name: 'Croc de Givre', category: 'WEAPON', weaponType: 'SWORD', rarity: 3, stats: { damage: 210, speed: 1.1 }, visualStats: { color: '#00FFFF', emissive: 1.0 }, skill: { name: 'Gel', cost: 35, type: 'FREEZE' } },
    { id: 'sword_lightning', name: 'Foudre', category: 'WEAPON', weaponType: 'SWORD', rarity: 4, stats: { damage: 320, speed: 1.3 }, visualStats: { color: '#FFFF00', emissive: 2.0 }, skill: { name: 'Éclair', cost: 50, type: 'BOLT' } },
    { id: 'sword_plasma', name: 'Sabre Plasma', category: 'WEAPON', weaponType: 'SWORD', rarity: 4, stats: { damage: 350, speed: 1.3 }, visualStats: { color: '#00FF00', emissive: 2.0, guardType: 'TECH' }, skill: { name: 'Surcharge', cost: 60, type: 'OVERLOAD' } },
    { id: 'sword_dark', name: 'Épée Maudite', category: 'WEAPON', weaponType: 'SWORD', rarity: 4, stats: { damage: 360, speed: 1.0 }, visualStats: { color: '#4B0082', emissive: 1.5 }, skill: { name: 'Vampirisme', cost: 45, type: 'DRAIN' } },
    { id: 'sword_excalibur', name: 'Excalibur', category: 'WEAPON', weaponType: 'SWORD', rarity: 5, stats: { damage: 600, speed: 1.2 }, visualStats: { color: '#FFFFFF', emissive: 3.0 }, skill: { name: 'Lumière Sacrée', cost: 100, type: 'NUKE' } },

    // --- GREATSWORDS (Slow, Heavy) ---
    { id: 'gs_wood', name: 'Massue en Bois', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 1, stats: { damage: 100, speed: 0.5 }, visualStats: { color: '#8B4513' }, skill: { name: 'Écrasement', cost: 20, type: 'SMASH' } },
    { id: 'gs_iron', name: 'Espadon de Fer', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 1, stats: { damage: 160, speed: 0.5 }, visualStats: { color: '#555555' }, skill: { name: 'Balayage', cost: 25, type: 'SWEEP' } },
    { id: 'gs_heavy', name: 'Fendoir Lourd', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 2, stats: { damage: 220, speed: 0.6 }, visualStats: { color: '#2F4F4F' }, skill: { name: 'Brise-Crâne', cost: 30, type: 'STUN' } },
    { id: 'gs_stone', name: 'Pilier Ancien', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 3, stats: { damage: 300, speed: 0.4 }, visualStats: { color: '#808080', bladeLength: 1.8 }, skill: { name: 'Séisme', cost: 50, type: 'QUAKE' } },
    { id: 'gs_magma', name: 'Tranche-Montagne', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 5, stats: { damage: 700, speed: 0.5 }, visualStats: { color: '#FF4500', emissive: 2.0 }, skill: { name: 'Éruption', cost: 100, type: 'ERUPTION' } },
    { id: 'gs_crystal', name: 'Lame Prisme', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 4, stats: { damage: 450, speed: 0.6 }, visualStats: { color: '#FF69B4', emissive: 1.0 }, skill: { name: 'Rayon', cost: 60, type: 'BEAM' } },
    { id: 'gs_void', name: 'Dévoreur', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 4, stats: { damage: 500, speed: 0.5 }, visualStats: { color: '#000000', emissive: 0.5 }, skill: { name: 'Trou Noir', cost: 80, type: 'GRAVITY' } },
    // More Greatswords...
    { id: 'gs_bone', name: 'Lame d\'Os', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 2, stats: { damage: 200, speed: 0.55 }, visualStats: { color: '#F5DEB3' }, skill: { name: 'Terreur', cost: 30, type: 'FEAR' } },
    { id: 'gs_executioner', name: 'Bourreau', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 3, stats: { damage: 350, speed: 0.45 }, visualStats: { color: '#8B0000' }, skill: { name: 'Guillotine', cost: 45, type: 'EXECUTE' } },
    { id: 'gs_titan', name: 'Titan', category: 'WEAPON', weaponType: 'GREATSWORD', rarity: 5, stats: { damage: 800, speed: 0.4 }, visualStats: { color: '#B8860B', emissive: 1.0 }, skill: { name: 'Impact', cost: 90, type: 'IMPACT' } },

    // --- DAGGERS (Fast, Crit) ---
    { id: 'dagger_rusty', name: 'Couteau Rouillé', category: 'WEAPON', weaponType: 'DAGGER', rarity: 1, stats: { damage: 30, speed: 2.0 }, visualStats: { color: '#8B4513' }, skill: { name: 'Lancer', cost: 10, type: 'THROW' } },
    { id: 'dagger_thief', name: 'Surin de Voleur', category: 'WEAPON', weaponType: 'DAGGER', rarity: 1, stats: { damage: 50, speed: 2.5 }, visualStats: { color: '#444444' }, skill: { name: 'Poche', cost: 5, type: 'STEAL' } },
    { id: 'dagger_assassin', name: 'Lame de l\'Ombre', category: 'WEAPON', weaponType: 'DAGGER', rarity: 2, stats: { damage: 80, speed: 2.8 }, visualStats: { color: '#2F4F4F' }, skill: { name: 'Invisibilité', cost: 30, type: 'STEALTH' } },
    { id: 'dagger_poison', name: 'Croc Venimeux', category: 'WEAPON', weaponType: 'DAGGER', rarity: 2, stats: { damage: 70, speed: 2.6 }, visualStats: { color: '#00FF00', emissive: 0.5 }, skill: { name: 'Poison', cost: 25, type: 'POISON' } },
    { id: 'dagger_void', name: 'Croc du Néant', category: 'WEAPON', weaponType: 'DAGGER', rarity: 3, stats: { damage: 120, speed: 3.0 }, visualStats: { color: '#9400D3', emissive: 1.5 }, skill: { name: 'Téléport', cost: 40, type: 'BLINK' } },
    { id: 'dagger_time', name: 'Dague Temporelle', category: 'WEAPON', weaponType: 'DAGGER', rarity: 4, stats: { damage: 150, speed: 3.5 }, visualStats: { color: '#00CED1', emissive: 2.0 }, skill: { name: 'Hâte', cost: 50, type: 'HASTE' } },
    { id: 'dagger_blood', name: 'Soif de Sang', category: 'WEAPON', weaponType: 'DAGGER', rarity: 3, stats: { damage: 100, speed: 2.8 }, visualStats: { color: '#8B0000', emissive: 0.8 }, skill: { name: 'Saignement', cost: 30, type: 'BLEED' } },
    { id: 'dagger_wind', name: 'Souffle', category: 'WEAPON', weaponType: 'DAGGER', rarity: 4, stats: { damage: 140, speed: 3.2 }, visualStats: { color: '#E0FFFF' }, skill: { name: 'Tornade', cost: 45, type: 'WIND' } },
    { id: 'dagger_dragon', name: 'Griffe de Dragon', category: 'WEAPON', weaponType: 'DAGGER', rarity: 5, stats: { damage: 250, speed: 3.0 }, visualStats: { color: '#FFD700', emissive: 1.0 }, skill: { name: 'Exécution', cost: 80, type: 'KILL' } },
    { id: 'dagger_chaos', name: 'Chaos', category: 'WEAPON', weaponType: 'DAGGER', rarity: 5, stats: { damage: 280, speed: 3.5 }, visualStats: { color: '#FF00FF', emissive: 2.0 }, skill: { name: 'Folie', cost: 90, type: 'CHAOS' } },

    // --- SPEARS (Reach) ---
    { id: 'spear_wood', name: 'Lance en Bois', category: 'WEAPON', weaponType: 'SPEAR', rarity: 1, stats: { damage: 70, speed: 1.2 }, visualStats: { color: '#DEB887' }, skill: { name: 'Piquée', cost: 15, type: 'POKE' } },
    { id: 'spear_iron', name: 'Pique de Soldat', category: 'WEAPON', weaponType: 'SPEAR', rarity: 2, stats: { damage: 110, speed: 1.2 }, visualStats: { color: '#C0C0C0' }, skill: { name: 'Charge', cost: 25, type: 'CHARGE' } },
    { id: 'spear_trident', name: 'Trident', category: 'WEAPON', weaponType: 'SPEAR', rarity: 3, stats: { damage: 180, speed: 1.1 }, visualStats: { color: '#00BFFF' }, skill: { name: 'Vague', cost: 40, type: 'WAVE' } },
    { id: 'spear_holy', name: 'Lance Sacrée', category: 'WEAPON', weaponType: 'SPEAR', rarity: 4, stats: { damage: 250, speed: 1.3 }, visualStats: { color: '#FFFFE0', emissive: 1.0 }, skill: { name: 'Soin', cost: 50, type: 'HEAL_SELF' } },
    { id: 'spear_demon', name: 'Fourche Démoniaque', category: 'WEAPON', weaponType: 'SPEAR', rarity: 5, stats: { damage: 400, speed: 1.0 }, visualStats: { color: '#FF0000', emissive: 2.0 }, skill: { name: 'Enfer', cost: 100, type: 'HELL' } },
    // +5 more spears
    { id: 'spear_bamboo', name: 'Lance de Bambou', category: 'WEAPON', weaponType: 'SPEAR', rarity: 1, stats: { damage: 75, speed: 1.4 }, visualStats: { color: '#556B2F' }, skill: { name: 'Rafale', cost: 20, type: 'FLURRY' } },
    { id: 'spear_ice', name: 'Harpon de Glace', category: 'WEAPON', weaponType: 'SPEAR', rarity: 3, stats: { damage: 190, speed: 1.1 }, visualStats: { color: '#E0FFFF', emissive: 0.5 }, skill: { name: 'Javelot', cost: 35, type: 'THROW_ICE' } },
    { id: 'spear_thunder', name: 'Lance-Tonnerre', category: 'WEAPON', weaponType: 'SPEAR', rarity: 4, stats: { damage: 280, speed: 1.2 }, visualStats: { color: '#FFFF00', emissive: 1.5 }, skill: { name: 'Tonnerre', cost: 60, type: 'THUNDER' } },
    { id: 'spear_guard', name: 'Hallebarde', category: 'WEAPON', weaponType: 'SPEAR', rarity: 2, stats: { damage: 130, speed: 0.9 }, visualStats: { color: '#708090' }, skill: { name: 'Défense', cost: 20, type: 'BLOCK_BUFF' } },
    { id: 'spear_shadow', name: 'Ombre-Pique', category: 'WEAPON', weaponType: 'SPEAR', rarity: 5, stats: { damage: 420, speed: 1.5 }, visualStats: { color: '#000000', emissive: 1.0 }, skill: { name: 'Assassinat', cost: 80, type: 'TELE_STAB' } },

    // --- BOWS (Ranged) ---
    { id: 'bow_wood', name: 'Arc Court', category: 'WEAPON', weaponType: 'BOW', rarity: 1, stats: { damage: 40, speed: 1.0, range: 20 }, visualStats: { color: '#8B4513' }, skill: { name: 'Tir Rapide', cost: 15, type: 'RAPID' } },
    { id: 'bow_long', name: 'Arc Long', category: 'WEAPON', weaponType: 'BOW', rarity: 2, stats: { damage: 70, speed: 0.8, range: 40 }, visualStats: { color: '#A0522D' }, skill: { name: 'Tir Puissant', cost: 25, type: 'POWER_SHOT' } },
    { id: 'bow_elf', name: 'Arc Elfique', category: 'WEAPON', weaponType: 'BOW', rarity: 3, stats: { damage: 120, speed: 1.2, range: 50 }, visualStats: { color: '#90EE90' }, skill: { name: 'Flèche Guidée', cost: 40, type: 'HOMING' } },
    { id: 'bow_dark', name: 'Arc des Ombres', category: 'WEAPON', weaponType: 'BOW', rarity: 4, stats: { damage: 180, speed: 1.1, range: 45 }, visualStats: { color: '#2F4F4F', emissive: 1.0 }, skill: { name: 'Pluie Noire', cost: 60, type: 'RAIN' } },
    { id: 'bow_god', name: 'Arc Céleste', category: 'WEAPON', weaponType: 'BOW', rarity: 5, stats: { damage: 300, speed: 1.5, range: 100 }, visualStats: { color: '#FFD700', emissive: 2.0 }, skill: { name: 'Rayon Solaire', cost: 100, type: 'BEAM_SHOT' } },
    // +5 more bows
    { id: 'bow_hunter', name: 'Arc de Chasseur', category: 'WEAPON', weaponType: 'BOW', rarity: 2, stats: { damage: 80, speed: 0.9, range: 35 }, visualStats: { color: '#556B2F' }, skill: { name: 'Piège', cost: 20, type: 'TRAP' } },
    { id: 'bow_ice', name: 'Arc de Givre', category: 'WEAPON', weaponType: 'BOW', rarity: 3, stats: { damage: 130, speed: 1.0, range: 45 }, visualStats: { color: '#E0FFFF' }, skill: { name: 'Flèche Gelée', cost: 35, type: 'FREEZE_SHOT' } },
    { id: 'bow_fire', name: 'Arc Phénix', category: 'WEAPON', weaponType: 'BOW', rarity: 4, stats: { damage: 200, speed: 1.1, range: 50 }, visualStats: { color: '#FF4500', emissive: 1.0 }, skill: { name: 'Explosion', cost: 50, type: 'EXPLOSIVE_SHOT' } },
    { id: 'bow_storm', name: 'Arc Tempête', category: 'WEAPON', weaponType: 'BOW', rarity: 3, stats: { damage: 140, speed: 1.3, range: 40 }, visualStats: { color: '#FFFF00' }, skill: { name: 'Multishot', cost: 45, type: 'MULTI' } },
    { id: 'bow_void', name: 'Arc du Vide', category: 'WEAPON', weaponType: 'BOW', rarity: 5, stats: { damage: 350, speed: 1.0, range: 80 }, visualStats: { color: '#800080', emissive: 1.5 }, skill: { name: 'Trou Noir', cost: 90, type: 'VOID_SHOT' } },

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

    // --- ARMURES ---
    // SET DU VOYAGEUR (Cuir léger - Débutant)
    {
        id: 'armor_traveler_head',
        name: 'Casque du Voyageur',
        category: ItemCategory.ARMOR,
        type: ItemType.HELMET,
        set: ArmorSet.TRAVELER,
        rarity: Rarity.COMMON,
        stats: { defense: 2 },
        passive: null,
        visualStats: { color: '#8B4513', material: 'LEATHER' },
        description: "Casque en cuir léger pour les aventuriers."
    },
    {
        id: 'armor_traveler_chest',
        name: 'Tunique du Voyageur',
        category: ItemCategory.ARMOR,
        type: ItemType.CHESTPLATE,
        set: ArmorSet.TRAVELER,
        rarity: Rarity.COMMON,
        stats: { defense: 4 },
        passive: null,
        visualStats: { color: '#8B4513', material: 'LEATHER' },
        description: "Tunique en cuir souple, parfaite pour voyager."
    },
    {
        id: 'armor_traveler_legs',
        name: 'Jambières du Voyageur',
        category: ItemCategory.ARMOR,
        type: ItemType.LEGGINGS,
        set: ArmorSet.TRAVELER,
        rarity: Rarity.COMMON,
        stats: { defense: 2 },
        passive: null,
        visualStats: { color: '#8B4513', material: 'LEATHER' },
        description: "Jambières légères pour parcourir de longues distances."
    },

    // SET DE PIERRE (Armure lourde - Tank)
    {
        id: 'armor_stone_head',
        name: 'Heaume de Pierre',
        category: ItemCategory.ARMOR,
        type: ItemType.HELMET,
        set: ArmorSet.STONE,
        rarity: Rarity.UNCOMMON,
        stats: { defense: 5 },
        passive: { type: PassiveType.SPEED, value: -10 },
        visualStats: { color: '#808080', material: 'STONE' },
        description: "Heaume massif taillé dans la pierre. Ralentit les mouvements."
    },
    {
        id: 'armor_stone_chest',
        name: 'Plastron de Pierre',
        category: ItemCategory.ARMOR,
        type: ItemType.CHESTPLATE,
        set: ArmorSet.STONE,
        rarity: Rarity.UNCOMMON,
        stats: { defense: 12 },
        passive: { type: PassiveType.SPEED, value: -10 },
        visualStats: { color: '#808080', material: 'STONE' },
        description: "Armure de pierre impénétrable. Protection maximale."
    },
    {
        id: 'armor_stone_legs',
        name: 'Jambières de Pierre',
        category: ItemCategory.ARMOR,
        type: ItemType.LEGGINGS,
        set: ArmorSet.STONE,
        rarity: Rarity.UNCOMMON,
        stats: { defense: 5 },
        passive: { type: PassiveType.SPEED, value: -10 },
        visualStats: { color: '#808080', material: 'STONE' },
        description: "Jambières de pierre lourdes mais résistantes."
    },

    // SET PYRO (Armure magique - Feu)
    {
        id: 'armor_pyro_head',
        name: 'Couronne Pyro',
        category: ItemCategory.ARMOR,
        type: ItemType.HELMET,
        set: ArmorSet.PYRO,
        rarity: Rarity.RARE,
        stats: { defense: 3 },
        passive: { type: PassiveType.RESIST_FIRE, value: 20 },
        visualStats: { color: '#FF4500', material: 'MAGIC', emissive: 2.0 },
        description: "Couronne enflammée. Résistance au feu +20%."
    },
    {
        id: 'armor_pyro_chest',
        name: 'Robe Pyro',
        category: ItemCategory.ARMOR,
        type: ItemType.CHESTPLATE,
        set: ArmorSet.PYRO,
        rarity: Rarity.RARE,
        stats: { defense: 8 },
        passive: { type: PassiveType.RESIST_FIRE, value: 20 },
        visualStats: { color: '#FF4500', material: 'MAGIC', emissive: 2.0 },
        description: "Robe imprégnée de magie du feu. Résistance au feu +20%."
    },
    {
        id: 'armor_pyro_legs',
        name: 'Pantalon Pyro',
        category: ItemCategory.ARMOR,
        type: ItemType.LEGGINGS,
        set: ArmorSet.PYRO,
        rarity: Rarity.RARE,
        stats: { defense: 3 },
        passive: { type: PassiveType.RESIST_FIRE, value: 20 },
        visualStats: { color: '#FF4500', material: 'MAGIC', emissive: 2.0 },
        description: "Pantalon magique résistant aux flammes. Résistance au feu +20%."
    },

    // --- BOUCLIERS ---
    {
        id: 'shield_wood',
        name: 'Bouclier en Bois',
        category: ItemCategory.ARMOR,
        type: ItemType.SHIELD,
        rarity: Rarity.COMMON,
        stats: {
            defense: 5,
            durability: 10,
            blockChance: 0.5
        },
        visualStats: { color: '#8B4513', material: 'WOOD' },
        description: "Un bouclier simple en bois. Bloque 50% des dégâts."
    },
    {
        id: 'shield_iron',
        name: 'Bouclier en Fer',
        category: ItemCategory.ARMOR,
        type: ItemType.SHIELD,
        rarity: Rarity.UNCOMMON,
        stats: {
            defense: 10,
            durability: 50,
            blockChance: 1.0
        },
        visualStats: { color: '#C0C0C0', material: 'IRON' },
        description: "Bouclier en fer solide. Bloque 100% des dégâts."
    },
    {
        id: 'shield_knight',
        name: 'Bouclier du Chevalier',
        category: ItemCategory.ARMOR,
        type: ItemType.SHIELD,
        rarity: Rarity.RARE,
        stats: {
            defense: 15,
            durability: 100,
            blockChance: 1.0
        },
        passive: { type: 'REFLECT_DAMAGE', value: 10 },
        visualStats: { color: '#FFD700', material: 'STEEL', emissive: 0.5 },
        description: "Bouclier noble. Bloque 100% et réfléchit 10% des dégâts."
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
