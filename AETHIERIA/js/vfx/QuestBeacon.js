import * as THREE from 'three';

/**
 * Quest Beacon - Visual marker for quest objectives
 */
export class QuestBeacon {
    constructor(scene) {
        this.scene = scene;
        this.beacon = null;
        this.time = 0;
    }

    /**
     * Spawn a beacon at the given world position
     */
    spawnBeacon(x, z) {
        // Remove old beacon if exists
        this.removeBeacon();

        // Create tall cylinder geometry
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 200, 16, 1, true);

        // Gold/Yellow glowing material
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.beacon = new THREE.Mesh(geometry, material);
        this.beacon.position.set(x, 100, z); // Center at y=100 (height 200)
        this.scene.add(this.beacon);

        console.log(`[QuestBeacon] Beacon spawned at (${x}, ${z})`);
    }

    /**
     * Remove the current beacon
     */
    removeBeacon() {
        if (this.beacon) {
            this.scene.remove(this.beacon);
            if (this.beacon.geometry) this.beacon.geometry.dispose();
            if (this.beacon.material) this.beacon.material.dispose();
            this.beacon = null;
            console.log('[QuestBeacon] Beacon removed');
        }
    }

    /**
     * Update beacon animation (call every frame)
     */
    update(dt) {
        if (!this.beacon) return;

        this.time += dt;

        // Pulsing opacity animation (0.3 to 0.7)
        const pulse = 0.5 + Math.sin(this.time * 2) * 0.2;
        this.beacon.material.opacity = pulse;

        // Slow rotation
        this.beacon.rotation.y += dt * 0.5;
    }

    /**
     * Check if beacon exists
     */
    hasBeacon() {
        return this.beacon !== null;
    }
}
