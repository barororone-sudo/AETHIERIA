import { ItemsDb } from '../data/ItemsDb.js';
import { QuestsDb } from '../data/QuestsDb.js';
import { EnemiesDb } from '../data/EnemiesDb.js';
import { DialoguesDb } from '../data/DialoguesDb.js';

export class DataManager {
    constructor(game) {
        this.game = game;
        this.items = ItemsDb;
        this.quests = QuestsDb;
        this.enemies = EnemiesDb;
        this.dialogues = DialoguesDb;
    }

    getItem(id) {
        return this.items.find(i => i.id === id) || null;
    }

    getQuest(id) {
        return this.quests.find(q => q.id === id) || null;
    }

    getDialogue(id) {
        // 1. Direct Lookup (e.g. 'elara') - Returns entire NPC block
        if (this.dialogues[id]) return this.dialogues[id];

        // 2. Deep Lookup (Search in all NPCs)
        for (const npcId in this.dialogues) {
            const npcDialogues = this.dialogues[npcId];
            // Return the WHOLE set so we can navigate 'next' pointers
            if (npcDialogues && npcDialogues[id]) {
                return npcDialogues;
            }
        }
        return null; // Not found
    }

    getEnemyStats(id) {
        return this.enemies.find(e => e.id === id) || null;
    }
}
