/*
 * AETHIERIA - MAIN STORYLINE
 * The Shattered Aether Saga
 * 
 * ACT 1: THE ECHO OF AWAKENING
 * Tutorial phase. Player awakens, learns they are an Echo Walker, defeats first boss.
 * Location: Spawn Plains, First Village, Ancient Ruins
 * Boss: Guardian Construct
 * 
 * ACT 2: THE ELEMENTAL FRAGMENTS
 * Open world exploration. Find and purify 3 Elemental Temples to restore balance.
 * Locations: Pyro Temple (Desert), Cryo Temple (Snow), Electro Temple (Mountain)
 * Bosses: Pyro Guardian, Cryo Guardian, Electro Guardian
 * 
 * ACT 3: THE VOID INVASION
 * World transformation. The Void Corruption spreads, enemies get corrupted.
 * Locations: All biomes (corrupted versions)
 * Boss: Void Commander
 * 
 * ACT 4: THE SKY CITADEL
 * Final climb. Ascend to the Sky Citadel and face the source of corruption.
 * Location: Sky Citadel (Floating Fortress)
 * Boss: The Architect (Final Boss)
 */

export const QuestsDb = [
    // ========================================
    // ACT 1: THE ECHO OF AWAKENING
    // ========================================

    {
        id: 'mq_01_wakeup',
        type: 'MAIN',
        act: 1,
        title: "Le Réveil",
        description: "Trouvez le Communicateur Ancien près du point d'apparition.",
        prereq: null,
        steps: [
            {
                id: 'find_communicator',
                description: "Cherchez le Communicateur Ancien",
                type: 'COLLECT_ITEM',
                targetId: 'ancient_communicator',
                targetPos: { x: 10, y: 0, z: -15 },
                radius: 5,
                isCompleted: false
            }
        ],
        rewards: {
            exp: 50,
            items: ['sword_rusty'],
            gold: 100
        },
        onComplete: {
            unlocks: ['mq_02_first_contact']
        }
    },

    {
        id: 'mq_02_first_contact',
        type: 'MAIN',
        act: 1,
        title: "Premier Contact",
        description: "Parlez à Elara au camp.",
        prereq: 'mq_01_wakeup',
        steps: [
            {
                id: 'talk_elara',
                description: "Parlez à Elara",
                type: 'TALK_NPC',
                targetId: 'elara',
                targetPos: { x: 0, y: 0, z: 30 },
                radius: 10,
                isCompleted: false
            }
        ],
        rewards: {
            exp: 75,
            gold: 0
        },
        onComplete: {
            unlocks: ['mq_03_training']
        }
    },

    {
        id: 'mq_03_training',
        type: 'MAIN',
        act: 1,
        title: "Entraînement",
        description: "Prouvez votre valeur en combat.",
        prereq: 'mq_02_first_contact',
        steps: [
            {
                id: 'defeat_golems',
                description: "Éliminez les Golems d'Entraînement",
                type: 'KILL_ENEMY',
                targetId: 'training_golem',
                targetCount: 3,
                currentCount: 0,
                isCompleted: false
            }
        ],
        rewards: {
            exp: 100,
            items: ['shield_basic'],
            gold: 150
        },
        onComplete: {
            unlocks: ['mq_04_forbidden_ruins'],
            skillUnlock: 'power_strike'
        }
    },

    {
        id: 'mq_04_forbidden_ruins',
        type: 'MAIN',
        act: 1,
        title: "Les Ruines Interdites",
        description: "Explorez les ruines anciennes et affrontez le Gardien.",
        prereq: 'mq_03_training',
        steps: [
            {
                id: 'reach_gate',
                description: "Atteignez la Porte des Ruines",
                type: 'ENTER_ZONE',
                targetId: 'ruined_gate',
                targetPos: { x: 150, y: 0, z: -50 },
                radius: 10,
                isCompleted: false
            },
            {
                id: 'find_key_fragment',
                description: "Trouvez le Fragment de Clé Alpha",
                type: 'COLLECT_ITEM',
                targetId: 'key_fragment_alpha',
                targetPos: { x: 155, y: 0, z: -55 },
                radius: 5,
                isCompleted: false
            },
            {
                id: 'defeat_guardian',
                description: "Éliminez le Gardien Construct",
                type: 'KILL_BOSS',
                targetId: 'guardian_construct',
                isCompleted: false
            }
        ],
        rewards: {
            exp: 250,
            items: ['echo_shard', 'artifact_stabilizer'],
            gold: 500
        },
        onComplete: {
            unlocks: ['mq_05_act2_intro'],
            cutscene: 'act1_complete'
        }
    },

    // ========================================
    // ACT 2: THE ELEMENTAL FRAGMENTS (Placeholder)
    // ========================================

    {
        id: 'mq_05_act2_intro',
        type: 'MAIN',
        act: 2,
        title: "Les Fragments Élémentaires",
        description: "Elara vous parle des trois temples à purifier.",
        prereq: 'mq_04_forbidden_ruins',
        steps: [
            {
                id: 'talk_elara_act2',
                description: "Écoutez les instructions d'Elara",
                type: 'TALK_NPC',
                targetId: 'elara',
                targetPos: { x: 0, y: 0, z: 30 },
                radius: 10,
                isCompleted: false
            }
        ],
        rewards: {
            exp: 100,
            gold: 0
        },
        onComplete: {
            unlocks: ['mq_06_pyro_temple', 'mq_07_cryo_temple', 'mq_08_electro_temple']
        }
    },

    // ========================================
    // SIDE QUESTS
    // ========================================

    {
        id: 'side_01_lost_pendant',
        type: 'SIDE',
        act: 1,
        title: "Souvenir Perdu",
        description: "Lyra a perdu le pendentif de sa mère près de la cascade.",
        prereq: null,
        triggerNPC: 'lyra',
        steps: [
            {
                id: 'find_pendant',
                description: "Cherchez le pendentif près de la cascade",
                type: 'COLLECT_ITEM',
                targetId: 'pendant_lyra',
                targetPos: { x: -30, y: 0, z: 40 },
                radius: 5,
                isCompleted: false
            }
        ],
        rewards: {
            exp: 50,
            gold: 100,
            reputation: { npc: 'lyra', amount: 10 }
        },
        onComplete: {
            dialogue: 'lyra_pendant_thanks'
        }
    }
];

/**
 * Get quest by ID
 */
export const getQuestById = (questId) => {
    return QuestsDb.find(q => q.id === questId);
};

/**
 * Get quests by type
 */
export const getQuestsByType = (type) => {
    return QuestsDb.filter(q => q.type === type);
};

/**
 * Get quests by act
 */
export const getQuestsByAct = (act) => {
    return QuestsDb.filter(q => q.act === act);
};

/**
 * Get all main quests
 */
export const getMainQuests = () => {
    return getQuestsByType('MAIN');
};

/**
 * Get all side quests
 */
export const getSideQuests = () => {
    return getQuestsByType('SIDE');
};
