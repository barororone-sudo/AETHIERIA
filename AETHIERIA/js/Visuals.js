import * as THREE from 'three';

export class Visuals {
    /**
     * @param {import('./Player.js').Player} player
     */
    constructor(player) {
        this.player = player;
        this.scene = player.world.scene;
        this.trails = [];
        this.particles = [];

        // Sword Trail Stats
        this.isTrailActive = false;
        this.trailPoints = [];
        this.trailMesh = null;
        this.maxTrailPoints = 20;

        this.initTrail();
    }

    initTrail() {
        // Ribbon Geometry
        // We will update geometry every frame
        const geometry = new THREE.BufferGeometry();
        // 20 points * 2 vertices per point (top/bottom) = 40 vertices
        const positions = new Float32Array(this.maxTrailPoints * 2 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.trailMesh = new THREE.Mesh(geometry, material);
        this.trailMesh.frustumCulled = false;
        this.scene.add(this.trailMesh);
    }

    startTrail() {
        this.isTrailActive = true;
        this.trailPoints = [];
        if (this.trailMesh) {
            this.trailMesh.visible = true;

            // Set Color based on Element
            if (this.player.equippedWeapon && this.player.equippedWeapon.element) {
                const el = this.player.equippedWeapon.element;
                let col = 0x00FFFF; // Default Teal
                if (el === 'PYRO') col = 0xFF4400;
                else if (el === 'ELECTRO') col = 0xFF00FF;
                else if (el === 'ANEMO') col = 0x88FF88;
                else if (el === 'CRYO') col = 0x00FFFF;

                // @ts-ignore
                this.trailMesh.material.color.setHex(col);
            } else {
                // @ts-ignore
                this.trailMesh.material.color.setHex(0xFFFFFF);
            }
        }
    }

    stopTrail() {
        this.isTrailActive = false;
        // Optionally fade out?
        // For now, instant hide after a short delay or just let it decay
        setTimeout(() => {
            if (this.trailMesh && !this.isTrailActive) this.trailMesh.visible = false;
            this.trailPoints = [];
        }, 200);
    }

    update(dt) {
        this.updateTrail(dt);
        this.updateParticles(dt);
    }

    updateTrail(dt) {
        if (!this.player.combat.weapon) return; // Need weapon reference

        if (this.isTrailActive) {
            // Get Weapon Top and Bottom positions in World Space
            const weapon = this.player.combat.weapon;

            // Assume weapon is BoxGeometry(0.1, 1.5, 0.3)
            // Local Y is length? Player.initWeapon says: BoxGeometry(0.1, 1.5, 0.3)
            // It replaces rotation.x = Math.PI/2.

            // We need 2 points: Base and Tip.
            // Let's deduce them. 
            // Tip is at (0, 0.75, 0) relative to weapon center? 
            // Actually Base is (0, -0.75, 0), Tip is (0, 0.75, 0).

            const tipLocal = new THREE.Vector3(0, 0.75, 0);
            const baseLocal = new THREE.Vector3(0, -0.5, 0); // Not full base, slightly up

            const tipWorld = tipLocal.applyMatrix4(weapon.matrixWorld);
            const baseWorld = baseLocal.applyMatrix4(weapon.matrixWorld);

            this.trailPoints.unshift({ top: tipWorld, bottom: baseWorld, time: Date.now() });
        } else {
            // Decay
            if (this.trailPoints.length > 0) this.trailPoints.pop();
        }

        // Limit length
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.pop();
        }

        // Update Mesh
        if (this.trailMesh && this.trailPoints.length > 1) {
            const positions = this.trailMesh.geometry.attributes.position.array;
            let idx = 0;
            for (let i = 0; i < this.trailPoints.length; i++) {
                const p = this.trailPoints[i];
                positions[idx++] = p.top.x;
                positions[idx++] = p.top.y;
                positions[idx++] = p.top.z;

                positions[idx++] = p.bottom.x;
                positions[idx++] = p.bottom.y;
                positions[idx++] = p.bottom.z;
            }
            // Fill rest with last point
            /*
            const last = this.trailPoints[this.trailPoints.length-1];
            while (idx < positions.length) {
                positions[idx++] = last.top.x;
                positions[idx++] = last.top.y;
                positions[idx++] = last.top.z;
                positions[idx++] = last.bottom.x;
                positions[idx++] = last.bottom.y;
                positions[idx++] = last.bottom.z;
            }
            */

            this.trailMesh.geometry.setDrawRange(0, this.trailPoints.length * 2);
            this.trailMesh.geometry.attributes.position.needsUpdate = true;
        }
    }

    updateParticles(dt) {
        // TODO: Implement particle system update
    }

    /**
     * @param {THREE.Vector3} pos 
     * @param {string} [element] 
     */
    spawnImpact(pos, element = 'NONE') {
        let color = 0xFFFFAA;
        let scale = 1.0;
        let isRising = false;

        switch (element) {
            case 'PYRO': color = 0xFF4400; isRising = true; break;
            case 'CRYO': color = 0x00FFFF; break;
            case 'ELECTRO': color = 0xFF00FF; break;
            case 'ANEMO': color = 0x88FF88; break;
            case 'DARK': color = 0x220022; break;
            default: color = 0xFFFFCC; break;
        }

        // Simple Particle Burst
        const count = 5;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            // Random spread
            mesh.position.x += (Math.random() - 0.5) * 0.5;
            mesh.position.y += (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 0.5;
            this.scene.add(mesh);

            const vel = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(0.1);
            if (isRising) vel.y += 0.05;

            // Animate
            const animate = () => {
                if (!mesh.parent) return;
                mesh.position.add(vel);
                mesh.rotation.x += 0.1;
                mesh.scale.multiplyScalar(0.9);
                if (mesh.scale.x < 0.01) {
                    this.scene.remove(mesh);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }
}
