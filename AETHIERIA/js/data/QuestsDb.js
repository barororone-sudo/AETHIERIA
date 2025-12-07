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
                targetId: 'sword_01',
                targetPos: { x: 15, y: 0.5, z: 10 },
                isCompleted: false,
                onComplete: (game) => {
                    const lumina = game.world.npcs.find(n => n.name === 'Lumina');
                    if (lumina) {
                        lumina.dialogueData = 'lumina_sword_found';
                    }
                    game.ui.showToast("Nouvel indice obtenu.");
                }
            },
            {
                id: 'q1_step2',
                description: "Éliminer le Gardien du Pont qui bloque l'accès à la Tour.",
                targetType: 'KILL_ENEMY',
                targetId: 'guardian_golem',
                targetPos: { x: 0, y: 5, z: -40 },
                isCompleted: false,
                onComplete: (game) => {
                    game.story.finishAct1Boss();
                }
            },
            {
                id: 'q1_step3',
                description: "Grimper au sommet de la Tour et l'activer.",
                targetType: 'INTERACT',
                targetId: 'tower_central',
                targetPos: { x: 50, y: 0, z: 50 },
                isCompleted: false,
                onComplete: (game) => {
                    game.story.triggerMapReveal(50, 50);
                    setTimeout(() => {
                        game.story.completeQuest('quest_001');
                        game.story.startAct2();
                    }, 4000);
                }
            }
        ],
        rewards: { exp: 100, item: null }
    },
    {
        id: 'quest_002',
        title: "L'Appel de la Forêt",
        description: "Une aura étrange émane de l'ouest. Enquêtez.",
        steps: [
            { id: 'enter_forest', description: "Pénétrez dans la Forêt des Murmures", targetPos: { x: -120, y: 0, z: 100 }, targetType: 'ENTER_ZONE', targetId: 'forest_whispers', isCompleted: false },
            { id: 'find_shrine', description: "Trouvez l'Autel Ancien", targetPos: { x: -250, y: 0, z: 150 }, targetType: 'INTERACT', targetId: 'forest_shrine', isCompleted: false }
        ],
        rewards: { exp: 200, item: 'bow_01' }
    }

];

export const getQuestById = (id) => QuestsDb.find(q => q.id === id);
