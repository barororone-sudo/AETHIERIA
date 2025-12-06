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
        return this.dialogues[id] || null;
    }

    getEnemyStats(id) {
        return this.enemies.find(e => e.id === id) || null;
    }
}
