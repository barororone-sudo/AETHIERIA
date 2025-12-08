export const EnemyType = {
    MELEE: 'MELEE',
    RANGED: 'RANGED',
    MAGIC: 'MAGIC',
    TANK: 'TANK',
    ELITE: 'ELITE'
};

export const BehaviorType = {
    AGGRESSIVE: 'AGGRESSIVE',
    DEFENSIVE: 'DEFENSIVE',
    PACK: 'PACK',
    PATROL: 'PATROL'
};

export const EnemiesDb = [
    // --- SLIMES ---
    {
        id: 'slime_green',
        name: 'Slime Vert',
        type: EnemyType.MELEE,
        stats: { hp: 300, attack: 50, speed: 3.0, exp: 10 },
        ai: { detectionRange: 10, attackRange: 1.5, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0x44ff44, scale: 0.8, shape: 'SLIME' },
        lootTable: [
            { itemId: 'potion_health', chance: 0.1, min: 1, max: 1 },
            { itemId: 'material_slime', chance: 0.5, min: 1, max: 3 }
        ]
    },
    {
        id: 'slime_red',
        name: 'Slime Rouge',
        type: EnemyType.MELEE,
        stats: { hp: 400, attack: 150, speed: 3.5, exp: 20 },
        ai: { detectionRange: 12, attackRange: 1.5, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0xff4444, scale: 0.9, shape: 'SLIME', particles: 'PYRO' },
        lootTable: [
            { itemId: 'potion_health', chance: 0.15, min: 1, max: 1 },
            { itemId: 'material_slime_red', chance: 0.5, min: 1, max: 2 }
        ]
    },
    {
        id: 'slime_blue',
        name: 'Slime Bleu',
        type: EnemyType.MELEE,
        stats: { hp: 500, attack: 80, speed: 2.5, exp: 20 },
        ai: { detectionRange: 12, attackRange: 1.5, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0x4444ff, scale: 1.0, shape: 'SLIME', particles: 'CRYO' },
        lootTable: [
            { itemId: 'potion_health', chance: 0.15, min: 1, max: 1 },
            { itemId: 'material_slime_blue', chance: 0.5, min: 1, max: 2 }
        ]
    },

    // --- GOBLINS ---
    {
        id: 'goblin_scout',
        name: 'Gobelin Éclaireur',
        type: EnemyType.MELEE,
        stats: { hp: 450, attack: 80, speed: 6.0, exp: 25 },
        ai: { detectionRange: 18, attackRange: 2.0, behavior: BehaviorType.PACK },
        visuals: { color: 0x00cc00, scale: 0.9, shape: 'GOBELIN', weapon: 'dagger' },
        lootTable: [
            { itemId: 'dagger_thief', chance: 0.1, min: 1, max: 1 },
            { itemId: 'coin_gold', chance: 0.8, min: 1, max: 5 }
        ]
    },
    {
        id: 'goblin_archer',
        name: 'Gobelin Archer',
        type: EnemyType.RANGED,
        stats: { hp: 400, attack: 100, speed: 5.5, exp: 30 },
        ai: { detectionRange: 25, attackRange: 15.0, behavior: BehaviorType.PACK },
        visuals: { color: 0x00aa00, scale: 0.9, shape: 'GOBELIN', weapon: 'bow' },
        lootTable: [
            { itemId: 'coin_gold', chance: 0.8, min: 2, max: 8 },
            { itemId: 'potion_health', chance: 0.2 }
        ]
    },
    {
        id: 'goblin_thief',
        name: 'Gobelin Voleur',
        type: EnemyType.MELEE,
        stats: { hp: 350, attack: 200, speed: 7.0, exp: 35 },
        ai: { detectionRange: 10, attackRange: 1.5, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0x333333, scale: 0.8, shape: 'GOBELIN', weapon: 'dagger_dual' },
        lootTable: [
            { itemId: 'dagger_void', chance: 0.05 }, // Rare drop
            { itemId: 'coin_gold', chance: 1.0, min: 10, max: 20 }
        ]
    },

    // --- ORCS ---
    {
        id: 'orc_warrior',
        name: 'Orc Guerrier',
        type: EnemyType.TANK,
        stats: { hp: 1200, attack: 150, speed: 3.5, exp: 60 },
        ai: { detectionRange: 12, attackRange: 2.5, behavior: BehaviorType.DEFENSIVE },
        visuals: { color: 0x228822, scale: 1.3, shape: 'ORC', weapon: 'axe', shield: true },
        lootTable: [
            { itemId: 'sword_steel', chance: 0.15 },
            { itemId: 'potion_health', chance: 0.3, min: 1, max: 2 }
        ]
    },
    {
        id: 'orc_berserker',
        name: 'Orc Berserker',
        type: EnemyType.MELEE,
        stats: { hp: 1500, attack: 250, speed: 4.5, exp: 80 },
        ai: { detectionRange: 15, attackRange: 2.0, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0x882222, scale: 1.4, shape: 'ORC', weapon: 'axe_dual' },
        lootTable: [
            { itemId: 'greatsword_iron', chance: 0.1 },
            { itemId: 'potion_health', chance: 0.4, min: 1, max: 3 }
        ]
    },
    {
        id: 'orc_chief',
        name: 'Chef de Guerre Orc',
        type: EnemyType.ELITE,
        stats: { hp: 3000, attack: 400, speed: 3.0, exp: 200 },
        ai: { detectionRange: 20, attackRange: 3.0, behavior: BehaviorType.PACK },
        visuals: { color: 0x114411, scale: 1.6, shape: 'ORC', weapon: 'greatsword', crown: true },
        lootTable: [
            { itemId: 'greatsword_magma', chance: 0.2 }, // Legendary
            { itemId: 'coin_gold', chance: 1.0, min: 50, max: 100 }
        ]
    },

    // --- CONSTRUCTS ---
    {
        id: 'construct_sentinel',
        name: 'Sentinelle de Pierre',
        type: EnemyType.TANK,
        stats: { hp: 2000, attack: 300, speed: 2.0, exp: 100 },
        ai: { detectionRange: 10, attackRange: 3.0, behavior: BehaviorType.DEFENSIVE },
        visuals: { color: 0x888888, scale: 1.5, shape: 'CONSTRUCT' },
        lootTable: [
            { itemId: 'crystal_pyro', chance: 0.5, min: 1, max: 2 },
            { itemId: 'potion_health', chance: 0.2 }
        ]
    },
    {
        id: 'golem_ancient',
        name: 'Golem Ancien',
        type: EnemyType.ELITE,
        stats: { hp: 10000, attack: 800, speed: 1.5, exp: 500 }, // 10k HPosu
        ai: { detectionRange: 30, attackRange: 5.0, behavior: BehaviorType.AGGRESSIVE },
        visuals: { color: 0x555555, scale: 4.0, shape: 'CONSTRUCT', glow: 0xffaa00 },
        lootTable: [
            { itemId: 'sword_plasma', chance: 1.0 }, // Guaranteed Epic
            { itemId: 'coin_gold', chance: 1.0, min: 200, max: 500 }
        ]
    }
];

export function getEnemyById(id) {
    return EnemiesDb.find(e => e.id === id);
}
