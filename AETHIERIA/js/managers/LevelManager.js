export class LevelManager {
    constructor(game) {
        this.game = game;
        this.level = 1;
        this.currentXp = 0;
        // Formula: Level 1 -> 1000 XP, Level 2 -> 1200 XP, etc.
        this.xpToNextLevel = this.calculateXpThreshold(1);
    }

    calculateXpThreshold(level) {
        return Math.floor(level * 1000 * 1.2);
    }

    /**
     * @param {number} amount
     */
    addXp(amount) {
        this.currentXp += amount;

        let leveledUp = false;
        let levelsGained = 0;

        // Check for Level Up (handle multiple levels)
        while (this.currentXp >= this.xpToNextLevel) {
            this.currentXp -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = this.calculateXpThreshold(this.level);

            this.applyLevelUpStats();
            leveledUp = true;
            levelsGained++;
        }

        if (leveledUp) {
            this.game.ui.showLevelUpToast(this.level);
        }

        // Update UI
        this.game.ui.updateXpBar(this.currentXp, this.xpToNextLevel, this.level);
    }

    applyLevelUpStats() {
        const p = this.game.player;
        if (!p) return;

        // Exponential Growth (5%)
        const growthFactor = 1.05;

        // HP Growth
        p.maxHp = Math.floor(p.maxHp * growthFactor);
        p.hp = p.maxHp; // Full Heal

        // Stat Growth
        p.stats.attack = Math.floor(p.stats.attack * growthFactor) + 1; // Ensure at least +1
        p.stats.defense = Math.floor(p.stats.defense * growthFactor) + 1;

        // Update UI Hearts
        this.game.ui.updateHearts(p.hp, p.maxHp);

        console.log(`Level Up! New Level: ${this.level}. Stats: HP=${p.maxHp}, ATK=${p.stats.attack}`);
    }

    // Save/Load Support (to be called by SaveManager)
    getData() {
        return {
            level: this.level,
            currentXp: this.currentXp
        };
    }

    loadData(data) {
        if (!data) return;
        this.level = data.level || 1;
        this.currentXp = data.currentXp || 0;
        this.xpToNextLevel = this.calculateXpThreshold(this.level);
        this.game.ui.updateXpBar(this.currentXp, this.xpToNextLevel, this.level);
    }
}
