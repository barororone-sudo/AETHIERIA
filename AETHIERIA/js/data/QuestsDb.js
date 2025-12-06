export const QuestsDb = [
    {
        id: 'quest_001',
        title: "L'Éveil",
        description: "Après des siècles de sommeil, ECHO-7 se réactive. Le protocole de purge doit commencer. Atteignez la première Tour de la Plaine pour scanner la zone.",
        steps: [
            {
                id: 'q1_step1',
                description: "Trouver une arme pour vous défendre.",
                targetType: 'ITEM_PICKUP',
                targetId: 'rusty_sword',
                isCompleted: false
            },
            {
                id: 'q1_step2',
                description: "Éliminer le Gardien du Pont qui bloque l'accès à la Tour.",
                targetType: 'KILL_ENEMY',
                targetId: 'guardian_golem', // Mapping vers EnemiesDb
                isCompleted: false
            },
            {
                id: 'q1_step3',
                description: "Activer la Tour de la Plaine.",
                targetType: 'INTERACT',
                targetId: 'tower_plains_01',
                isCompleted: false
            }
        ],
        rewards: {
            xp: 500,
            items: ['pulse_baton'] // Item ID reward
        },
        state: 'NOT_STARTED' // NOT_STARTED, IN_PROGRESS, COMPLETED
    }
];

export const getQuestById = (id) => QuestsDb.find(q => q.id === id);
