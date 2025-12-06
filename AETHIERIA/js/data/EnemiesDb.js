export const EnemiesDb = [
    {
        id: 'scrap_rat',
        name: 'Scrap-Rat',
        level: 1,
        biome: 'PLAINE',
        stats: {
            hp: 50,
            damage: 5,
            speed: 8,
            xp: 10
        },
        aiType: 'AGRESSIVE', // Se jette sur le joueur
        model: 'rat_robot.glb', // Placeholder
        description: "Un petit robot de maintenance corrompu, ses circuits exposés crépitent d'électricité statique."
    },
    {
        id: 'guardian_golem',
        name: 'Golem Gardien',
        level: 5,
        biome: 'PLAINE_BOSS',
        stats: {
            hp: 300,
            damage: 25,
            speed: 2,
            xp: 150
        },
        aiType: 'DEFENSIVE', // Reste près de sa zone, frappe fort si proche
        model: 'golem_ancient.glb',
        description: "Une sentinelle de l'ancien monde, lente mais dévastatrice. Son noyau brille d'une lueur menaçante."
    },
    {
        id: 'drone_wasp',
        name: 'Drone-Guêpe',
        level: 10,
        biome: 'FORET',
        stats: {
            hp: 80,
            damage: 15,
            speed: 12,
            xp: 40
        },
        aiType: 'FLEE', // Attaque à distance et s'éloigne si le joueur approche
        model: 'drone_wasp.glb',
        description: "Un drone de surveillance réaffecté pour le combat. Ses lasers sont précis et brûlants."
    }
];

export const getEnemyById = (id) => EnemiesDb.find(e => e.id === id);
