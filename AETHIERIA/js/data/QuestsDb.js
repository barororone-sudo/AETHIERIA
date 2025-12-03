export const QuestsDb = {
    'prologue': {
        id: 'prologue',
        title: "L'Éveil",
        description: "Vous vous réveillez sur une plage inconnue. Trouvez des réponses.",
        steps: {
            'start': {
                description: "Parlez à l'inconnue sur la plage.",
                objective: "Parler à Lumina",
                target: { type: 'npc', id: 'lumina' }
            },
            'find_sword': {
                description: "Lumina dit qu'une arme est cachée près du rocher.",
                objective: "Trouver l'Épée Rouillée",
                target: { type: 'item', id: 'sword_01' }
            },
            'defeat_golem': {
                description: "Un Gardien bloque la sortie. Utilisez l'épée !",
                objective: "Vaincre le Gardien",
                target: { type: 'enemy', id: 'guardian_01' }
            }
        }
    },
    'dialogues': {
        'lumina_intro': {
            start: {
                text: "Ah, vous voilà enfin réveillé ! Je craignais que la marée ne vous emporte.",
                tags: ["[CAMERA:ZOOM]"],
                choices: [
                    { text: "Où suis-je ?", next: 'where' },
                    { text: "Qui êtes-vous ?", next: 'who' }
                ]
            },
            where: {
                text: "Sur la Plage des Oubliés. C'est ici que tout commence... ou finit.",
                next: 'weapon'
            },
            who: {
                text: "Je m'appelle Lumina. Je suis ici pour vous guider.",
                next: 'weapon'
            },
            weapon: {
                text: "Écoutez, ce n'est pas sûr ici. Il y a une vieille épée dans ce coffre, là-bas. Prenez-la.",
                tags: ["[CAMERA:POINT:chest_01]"],
                choices: [
                    { text: "D'accord.", next: 'end_intro' }
                ]
            },
            end_intro: {
                text: "Allez, vite !",
                action: 'quest_update:find_sword',
                next: null
            }
        },
        'lumina_sword_found': {
            start: {
                text: "Bien ! Vous avez l'air moins... vulnérable. Maintenant, attention au Gardien !",
                tags: ["[GIVE_ITEM:potion_health]"],
                next: null
            }
        }
    }
};
