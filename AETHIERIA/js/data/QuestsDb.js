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
                targetPos: { x: 15, y: 0, z: 10 },
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
                targetPos: { x: 0, y: 0, z: -40 },
                isCompleted: false
            },
            {
                id: 'q1_step3',
                description: "Activer la Tour de la Plaine.",
                targetType: 'INTERACT',
                targetId: 'tower_central',
                targetPos: { x: 50, y: 0, z: 50 },
                isCompleted: false,
                onComplete: (game) => {
                    // Reveal Map Animation
                    if (game.ui) {
                        // Assuming playMapUnlockAnimation exists or we add it, reusing revealRegion with animation param if supported or just calling revealRegion as requested
                        // The prompt asked for: game.ui.playMapUnlockAnimation(); game.ui.revealRegion(0, 0, 1000);
                        if (game.ui.playMapUnlockAnimation) game.ui.playMapUnlockAnimation();
                        if (game.ui.revealRegion) game.ui.revealRegion(0, 0, 1000);
                    }

                    // Start Act 1 Ending Dialogue
                    if (game.dialogueManager) {
                        game.dialogueManager.startDialogue('lumina_act1_end', (choice) => {
                            // Can handle logic after dialogue here if needed
                        });
                    }
                }
            }
        ],
        rewards: {
            xp: 500,
            items: ['pulse_baton']
        },
        state: 'NOT_STARTED'
    },
    {
        id: 'quest_002',
        title: "Les Ombres",
        description: "La Tour a révélé une anomalie dans la Forêt Sombre. Rejoignez la lisière de la forêt pour enquêter.",
        steps: [
            {
                id: 'q2_step1',
                description: "Atteindre la lisière de la Forêt.",
                targetType: 'ENTER_ZONE',
                targetId: 'zone_forest_entrance',
                targetPos: { x: -50, y: 0, z: 80 }, // Forest Direction
                isCompleted: false
            }
        ],
        rewards: {
            xp: 1000
        },
        state: 'NOT_STARTED'
    }
];

export const getQuestById = (id) => QuestsDb.find(q => q.id === id);
