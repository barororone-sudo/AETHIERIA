export const EnemiesDb = {
    'guardian_01': {
        id: 'guardian_01',
        name: 'Gardien de Pierre',
        type: 'construct',
        stats: {
            hp: 500,
            damage: 20,
            speed: 2.0
        },
        loot: ['potion_health'],
        model: 'cube_boss' // Placeholder for model type
    },
    'slime_blue': {
        id: 'slime_blue',
        name: 'Slime Hydro',
        type: 'slime',
        stats: {
            hp: 50,
            damage: 5,
            speed: 3.0
        },
        loot: ['slime_condensate']
    }
};
