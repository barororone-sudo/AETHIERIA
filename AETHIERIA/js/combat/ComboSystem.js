/**
 * ComboSystem.js
 * Gère les combos d'attaque avec timing windows et multiplicateurs de dégâts
 */

export class ComboSystem {
    constructor(player) {
        this.player = player;

        // État du combo
        this.currentCombo = 0;        // 0, 1, 2, 3
        this.maxCombo = 3;
        this.lastHitTime = 0;
        this.comboWindow = 800;       // 0.8s pour enchaîner

        // Multiplicateurs de dégâts
        this.damageMultipliers = {
            0: 1.0,   // Pas de combo
            1: 1.0,   // Premier coup
            2: 1.3,   // Deuxième coup (+30%)
            3: 1.6    // Troisième coup (+60%)
        };

        // Callbacks pour événements
        this.onComboChange = null;
        this.onComboReset = null;
    }

    /**
     * Enregistre un coup et avance le combo
     * @returns {number} Le numéro du coup actuel (1, 2, ou 3)
     */
    registerHit() {
        const now = Date.now();
        const timeSinceLastHit = now - this.lastHitTime;

        // Reset si trop lent
        if (timeSinceLastHit > this.comboWindow && this.currentCombo > 0) {
            this.reset();
        }

        // Avancer le combo
        this.currentCombo++;
        if (this.currentCombo > this.maxCombo) {
            this.currentCombo = 1; // Recommencer
        }

        this.lastHitTime = now;

        // Callback
        if (this.onComboChange) {
            this.onComboChange(this.currentCombo);
        }

        console.log(`⚔️ Combo: ${this.currentCombo} (x${this.getDamageMultiplier().toFixed(1)})`);

        return this.currentCombo;
    }

    /**
     * Retourne le multiplicateur de dégâts actuel
     * @returns {number}
     */
    getDamageMultiplier() {
        return this.damageMultipliers[this.currentCombo] || 1.0;
    }

    /**
     * Retourne le numéro du combo actuel
     * @returns {number}
     */
    getCurrentCombo() {
        return this.currentCombo;
    }

    /**
     * Reset le combo
     */
    reset() {
        if (this.currentCombo > 0) {
            console.log('🔄 Combo reset');
            this.currentCombo = 0;

            if (this.onComboReset) {
                this.onComboReset();
            }
        }
    }

    /**
     * Update appelé chaque frame
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // Auto-reset si timeout
        if (this.currentCombo > 0) {
            const timeSinceLastHit = Date.now() - this.lastHitTime;
            if (timeSinceLastHit > this.comboWindow) {
                this.reset();
            }
        }
    }

    /**
     * Retourne le nom de l'animation pour le coup actuel
     * @returns {string}
     */
    getAttackAnimation() {
        const animations = ['attack_1', 'attack_2', 'attack_3'];
        const index = Math.min(this.currentCombo - 1, 2);
        return animations[index] || 'attack_1';
    }

    /**
     * Vérifie si on peut attaquer (pas en cooldown)
     * @returns {boolean}
     */
    canAttack() {
        // Pour l'instant, toujours true
        // Peut être étendu avec cooldown global
        return true;
    }
}
