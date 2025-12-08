export const QuestsDb = [
    {
        id: 'quest_001',
        title: "Le Départ",
        description: "Après des siècles de sommeil, ECHO-7 se réactive. Préparez-vous pour votre première mission.",
        steps: [
            {
                id: 'q1_step0',
                description: "Parlez au Gardien.",
                targetType: 'TALK',
                targetId: 'guardian_npc',
                isCompleted: false,
                onComplete: (game) => {
                    game.ui.showToast("Le Gardien vous a donné vos instructions.");
                    if (game.ui.playSound) game.ui.playSound('ui_ding');
                }
            },
            {
                id: 'q1_step1',
                description: "Trouvez une arme dans un coffre.",
                targetType: 'OPEN_CHEST',
                targetId: 'any',
                isCompleted: false,
                onComplete: (game) => {
                    game.ui.showToast("Nouvel Objectif : Équipez l'arme");
                    if (game.ui.playSound) game.ui.playSound('quest_step_complete');
                }
            },
            {
                id: 'q1_step2',
                description: "Équipez votre arme (Touche I).",
                targetType: 'EQUIP_WEAPON',
                targetId: 'any',
                isCompleted: false,
                onComplete: (game) => {
                    game.ui.showToast("Prêt au combat !");
                    if (game.ui.playSound) game.ui.playSound('quest_step_complete');
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
        rewards: { exp: 200, item: 'sword_steel' }
    }

];

export const getQuestById = (id) => QuestsDb.find(q => q.id === id);
