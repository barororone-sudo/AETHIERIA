/*
 * AETHIERIA - DIALOGUES DATABASE
 * Progressive dialogue system based on quest state
 */

export const DialoguesDb = {
    // ========================================
    // ELARA - Main Story NPC (Village Elder)
    // ========================================
    'elara': {
        // Default dialogue (no active quest)
        'default': {
            speaker: 'Elara',
            text: "Bonjour, voyageur. Que puis-je faire pour vous ?",
            next: null
        },

        // When mq_01_wakeup is active
        'mq_01_wakeup': {
            speaker: 'Elara',
            text: "Regardez autour de vous. Cherchez le dispositif. Il devrait émettre une lueur bleue.",
            next: 'hint'
        },
        'hint': {
            speaker: 'Elara',
            text: "Les Anciens ont laissé des artefacts partout. Celui-ci est proche.",
            next: null
        },

        // When mq_02_first_contact is active (player found communicator)
        'mq_02_first_contact': {
            speaker: 'Elara',
            text: "Vous l'avez trouvé ! Vous êtes le Marcheur d'Écho décrit dans les prophéties.",
            next: 'prophecy'
        },
        'prophecy': {
            speaker: 'Elara',
            text: "Les Anciens ont prédit qu'un être comme vous se réveillerait pour restaurer l'équilibre du monde brisé.",
            next: 'mission'
        },
        'mission': {
            speaker: 'Elara',
            text: "La Corruption du Vide dévore nos îles. Vous seul pouvez stabiliser la réalité.",
            next: null
        },

        // When mq_03_training is active
        'mq_03_training': {
            speaker: 'Elara',
            text: "Prouvez-moi que vous êtes capable de vous battre. Éliminez les Golems d'Entraînement près du camp.",
            next: 'training_tip'
        },
        'training_tip': {
            speaker: 'Elara',
            text: "Utilisez vos compétences de combat. Les Golems sont résistants mais prévisibles.",
            next: null
        },

        // When mq_04_forbidden_ruins is active
        'mq_04_forbidden_ruins': {
            speaker: 'Elara',
            text: "Soyez prudent aux Ruines. L'énergie là-bas est instable.",
            next: 'warning'
        },
        'warning': {
            speaker: 'Elara',
            text: "Le Gardien Construct protège le Fragment de Clé. C'est un adversaire redoutable créé par les Anciens.",
            next: 'advice'
        },
        'advice': {
            speaker: 'Elara',
            text: "Étudiez ses mouvements. Chaque boss a une faiblesse.",
            next: null
        },

        // After completing Act 1
        'act1_complete': {
            speaker: 'Elara',
            text: "Vous avez prouvé votre valeur, Marcheur d'Écho. Les Temples Élémentaires vous attendent.",
            next: 'act2_hint'
        },
        'act2_hint': {
            speaker: 'Elara',
            text: "Cherchez les trois Fragments : Pyro, Cryo, et Electro. Ils restaureront l'équilibre.",
            next: null
        }
    },

    // ========================================
    // LYRA - Side Quest NPC (Lost Pendant)
    // ========================================
    'lyra': {
        'default': {
            speaker: 'Lyra',
            text: "Bonjour... Vous semblez capable. Pourriez-vous m'aider ?",
            next: 'request'
        },
        'request': {
            speaker: 'Lyra',
            text: "J'ai perdu le pendentif de ma mère près de la cascade. C'est tout ce qu'il me reste d'elle.",
            next: null,
            questTrigger: 'side_01_lost_pendant' // Triggers side quest
        },

        'side_01_lost_pendant': {
            speaker: 'Lyra',
            text: "Merci de m'aider. La cascade est au nord, près des rochers moussus.",
            next: null
        },

        'quest_complete': {
            speaker: 'Lyra',
            text: "Vous l'avez retrouvé ! Merci infiniment. Voici une petite récompense.",
            next: null
        }
    },

    // ========================================
    // ELDER - Tutorial NPC
    // ========================================
    'elder': {
        'default': {
            speaker: 'L\'Ancien',
            text: "Bienvenue, Marcheur d'Écho. Le monde a besoin de vous.",
            next: 'explanation'
        },
        'explanation': {
            speaker: 'L\'Ancien',
            text: "La Fracture a brisé notre réalité. Seuls les Marcheurs comme vous peuvent stabiliser les îles.",
            next: 'warning'
        },
        'warning': {
            speaker: 'L\'Ancien',
            text: "Méfiez-vous de la Corruption du Vide. Elle dévore tout ce qu'elle touche.",
            next: null
        }
    }
};

/**
 * Get dialogue for NPC based on current quest state
 * @param {string} npcId - NPC identifier
 * @param {string} questId - Current active quest ID
 * @returns {object} Dialogue node
 */
export const getDialogue = (npcId, questId = 'default') => {
    const npcDialogues = DialoguesDb[npcId];
    if (!npcDialogues) {
        console.warn(`[DialoguesDb] NPC ${npcId} not found`);
        return null;
    }

    // Try to get quest-specific dialogue
    if (questId && npcDialogues[questId]) {
        return npcDialogues[questId];
    }

    // Fallback to default
    return npcDialogues['default'];
};

/**
 * Get next dialogue node
 */
export const getNextDialogue = (npcId, currentNodeId) => {
    const npcDialogues = DialoguesDb[npcId];
    if (!npcDialogues) return null;

    const currentNode = npcDialogues[currentNodeId];
    if (!currentNode || !currentNode.next) return null;

    return npcDialogues[currentNode.next];
};
