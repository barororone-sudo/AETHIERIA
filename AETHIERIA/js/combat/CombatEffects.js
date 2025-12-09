/**
 * CombatEffects.js
 * Effets visuels de combat : screen shake, flash, slow-motion
 */

export class CombatEffects {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;

        // État du shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.originalCameraPosition = this.camera.position.clone();

        // Flash overlay
        this.flashOverlay = null;
        this.createFlashOverlay();
    }

    createFlashOverlay() {
        // Créer un div pour le flash blanc
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.id = 'combat-flash';
        this.flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
            transition: opacity 0.1s ease-out;
        `;
        document.body.appendChild(this.flashOverlay);
    }

    /**
     * Déclenche un screen shake
     * @param {number} intensity Intensité du shake (0.1 = léger, 0.5 = fort)
     * @param {number} duration Durée en secondes
     */
    shake(intensity = 0.1, duration = 0.2) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
        this.originalCameraPosition.copy(this.camera.position);
    }

    /**
     * Déclenche un flash blanc
     * @param {number} intensity Intensité (0-1)
     * @param {number} duration Durée en secondes
     */
    flash(intensity = 0.8, duration = 0.15) {
        if (!this.flashOverlay) return;

        this.flashOverlay.style.opacity = intensity.toString();

        setTimeout(() => {
            if (this.flashOverlay) {
                this.flashOverlay.style.opacity = '0';
            }
        }, duration * 1000);
    }

    /**
     * Effet combiné pour coup critique
     */
    criticalHitEffect() {
        this.shake(0.15, 0.25);
        this.flash(0.6, 0.12);
    }

    /**
     * Effet pour combo finisher
     */
    comboFinisherEffect() {
        this.shake(0.25, 0.35);
        this.flash(0.8, 0.18);
    }

    /**
     * Effet léger pour hit normal
     */
    normalHitEffect() {
        this.shake(0.05, 0.1);
    }

    /**
     * Update le screen shake
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (this.shakeTime < this.shakeDuration) {
            this.shakeTime += deltaTime;

            // Calculer l'intensité avec decay
            const progress = this.shakeTime / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * (1 - progress);

            // Appliquer le shake
            this.camera.position.x = this.originalCameraPosition.x + (Math.random() - 0.5) * currentIntensity;
            this.camera.position.y = this.originalCameraPosition.y + (Math.random() - 0.5) * currentIntensity;
            this.camera.position.z = this.originalCameraPosition.z + (Math.random() - 0.5) * currentIntensity;
        } else if (this.shakeIntensity > 0) {
            // Reset à la position originale
            this.camera.position.copy(this.originalCameraPosition);
            this.shakeIntensity = 0;
        }
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
        }
    }
}
