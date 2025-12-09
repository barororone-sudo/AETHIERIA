/**
 * WeaponAnimations.js
 * Animations spécifiques par type d'arme avec articulations améliorées
 */

export class WeaponAnimations {
    constructor(player) {
        this.player = player;
        this.animationTime = 0;
        this.currentAnimation = null;
        this.animationDuration = 0;
    }

    /**
     * Démarre une animation d'attaque selon le type d'arme
     * @param {string} weaponType
     * @param {number} comboStep - 0, 1, ou 2
     */
    playAttackAnimation(weaponType, comboStep) {
        this.animationTime = 0;
        this.currentAnimation = weaponType;

        // Durées par arme
        const durations = {
            'DAGGER': 0.25,
            'SWORD': 0.35,
            'GREATSWORD': 0.6,
            'SPEAR': 0.4,
            'BOW': 0.5
        };

        this.animationDuration = durations[weaponType] || 0.35;
    }

    /**
     * Update les animations d'attaque
     * @param {number} dt
     */
    update(dt) {
        if (!this.currentAnimation) return;

        this.animationTime += dt;
        const progress = Math.min(this.animationTime / this.animationDuration, 1.0);

        // Appliquer l'animation selon le type d'arme
        switch (this.currentAnimation) {
            case 'DAGGER':
                this.animateDaggerAttack(progress);
                break;
            case 'SWORD':
                this.animateSwordAttack(progress);
                break;
            case 'GREATSWORD':
                this.animateGreatswordAttack(progress);
                break;
            case 'SPEAR':
                this.animateSpearAttack(progress);
                break;
        }

        // Fin de l'animation
        if (progress >= 1.0) {
            this.currentAnimation = null;
        }
    }

    /**
     * 🗡️ Animation dagues - Rapide, mouvements croisés
     * @param {number} progress - 0 à 1
     */
    animateDaggerAttack(progress) {
        const p = this.player;
        if (!p.leftArm || !p.rightArm) return;

        // Easing pour snap rapide
        const snap = progress < 0.3 ? progress / 0.3 : 1.0 - ((progress - 0.3) / 0.7);

        // Main droite - Slash diagonal
        p.rightArm.rotation.x = -1.5 + snap * -0.8;
        p.rightArm.rotation.y = snap * 0.5;
        p.rightArm.rotation.z = -0.3 - snap * 0.4;

        if (p.rightForeArm) {
            p.rightForeArm.rotation.x = -0.5 - snap * 0.8;
        }

        // Main gauche - Mouvement opposé (dual-wield)
        p.leftArm.rotation.x = -1.5 + snap * -0.6;
        p.leftArm.rotation.y = -snap * 0.5;
        p.leftArm.rotation.z = 0.3 + snap * 0.4;

        if (p.leftForeArm) {
            p.leftForeArm.rotation.x = -0.5 - snap * 0.6;
        }

        // Rotation du corps pour plus de puissance
        if (p.bodyMesh) {
            p.bodyMesh.rotation.y = Math.sin(snap * Math.PI) * 0.3;
        }
    }

    /**
     * ⚔️ Animation épée - Arcs larges
     * @param {number} progress
     */
    animateSwordAttack(progress) {
        const p = this.player;
        if (!p.rightArm) return;

        const swing = Math.sin(progress * Math.PI);

        // Grand arc horizontal
        p.rightArm.rotation.x = -1.2 - swing * 0.5;
        p.rightArm.rotation.y = -0.8 + progress * 1.6; // Sweep
        p.rightArm.rotation.z = -0.5;

        if (p.rightForeArm) {
            p.rightForeArm.rotation.x = -0.3 - swing * 0.4;
        }

        // Corps suit le mouvement
        if (p.bodyMesh) {
            p.bodyMesh.rotation.y = (progress - 0.5) * 0.6;
        }
    }

    /**
     * 🗡️ Animation greatsword - Lourd, puissant
     * @param {number} progress
     */
    animateGreatswordAttack(progress) {
        const p = this.player;
        if (!p.rightArm || !p.leftArm) return;

        // Windup puis slam
        const phase = progress < 0.4 ? 0 : (progress - 0.4) / 0.6;

        if (progress < 0.4) {
            // Windup - lever l'arme
            const wind = progress / 0.4;
            p.rightArm.rotation.x = -2.5 * wind;
            p.leftArm.rotation.x = -2.3 * wind;

            if (p.bodyMesh) {
                p.bodyMesh.rotation.x = 0.3 * wind; // Lean back
            }
        } else {
            // Slam down
            p.rightArm.rotation.x = -2.5 + phase * 3.0;
            p.leftArm.rotation.x = -2.3 + phase * 2.8;

            if (p.bodyMesh) {
                p.bodyMesh.rotation.x = 0.3 - phase * 0.8; // Lean forward
            }
        }

        // Les deux mains tiennent l'arme
        p.rightArm.rotation.z = -0.2;
        p.leftArm.rotation.z = 0.2;
    }

    /**
     * 🔱 Animation lance - Thrust avant
     * @param {number} progress
     */
    animateSpearAttack(progress) {
        const p = this.player;
        if (!p.rightArm) return;

        const thrust = progress < 0.3 ? 0 : Math.min((progress - 0.3) / 0.3, 1.0);

        // Thrust avant
        p.rightArm.rotation.x = -1.0 - thrust * 0.5;
        p.rightArm.rotation.z = -0.3;

        if (p.rightForeArm) {
            p.rightForeArm.rotation.x = -0.8 - thrust * 0.4;
        }

        // Corps penche en avant
        if (p.bodyMesh) {
            p.bodyMesh.rotation.x = thrust * 0.4;
            p.bodyMesh.position.z = thrust * 0.3; // Lunge forward
        }
    }

    /**
     * Reset l'animation
     */
    reset() {
        this.currentAnimation = null;
        this.animationTime = 0;
    }
}
