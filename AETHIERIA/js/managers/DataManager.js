import { ItemsDb } from '../data/ItemsDb.js';
import { QuestsDb } from '../data/QuestsDb.js';
import { EnemiesDb } from '../data/EnemiesDb.js';

export class DataManager {
    constructor(game) {
        this.game = game;
        this.items = ItemsDb;
        this.quests = QuestsDb;
        this.enemies = EnemiesDb;
    }

    getItem(id) {
        return this.items[id] || null;
    }

    getQuest(id) {
        return this.quests[id] || null;
    }

    getDialogue(id) {
        return this.quests.dialogues[id] || null;
    }

    getEnemyStats(id) {
        return this.enemies[id] || null;
    }
}
