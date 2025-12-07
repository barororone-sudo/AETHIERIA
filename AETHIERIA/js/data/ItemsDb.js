export const ItemsDb = [
    {
        id: 'sword_01', // ID MATCHING QUESTS
        name: 'Épée Rouillée',
        type: 'WEAPON',
        stats: {
            damage: 10,
            attackSpeed: 1.0
        },
        icon: '🗡️', // Placeholder
        color: '#8B4513',
        description: "Une lame d'ancien modèle, ébréchée par des siècles d'oubli. Elle pèse lourd du poids du passé."
    },
    {
        id: 'pulse_baton',
        name: 'Bâton d\'Impulsion',
        type: 'WEAPON',
        stats: {
            damage: 18,
            attackSpeed: 1.2
        },
        icon: '⚡',
        color: '#00FFFF',
        description: "Une arme technologique qui vibre d'une faible énergie bleue. Conçue pour la pacification, détournée pour la guerre."
    },
    {
        id: 'potion_health',
        name: 'Potion de Soin',
        type: 'CONSUMABLE',
        effect: { heal: 50 },
        icon: '🧪',
        color: '#ff4444',
        description: "Une fiole rouge vif. Restaure 50 PV."
    }
];

export const getItemById = (id) => ItemsDb.find(i => i.id === id);
