/**
 * ParticleSystem.js
 * Système de particules optimisé avec pooling pour les effets de combat
 */

import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Pool de particules
        this.poolSize = 100;
        this.particles = [];
        this.activeParticles = [];

        // Créer le pool
        this.createParticlePool();
    }

    createParticlePool() {
        // Géométrie partagée
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.poolSize * 3);
        const colors = new Float32Array(this.poolSize * 3);
        const sizes = new Float32Array(this.poolSize);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Matériau
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Points mesh
        this.pointsMesh = new THREE.Points(geometry, material);
        this.scene.add(this.pointsMesh);

        // Initialiser les particules
        for (let i = 0; i < this.poolSize; i++) {
            this.particles.push({
                active: false,
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1.0,
                size: 0.1,
                color: new THREE.Color(1, 1, 1)
            });
        }
    }

    /**
     * Émet des particules d'impact normal
     * @param {THREE.Vector3} position
     * @param {number} count
     */
    emitHitSparks(position, count = 8) {
        for (let i = 0; i < count; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) break;

            // Position
            particle.position.copy(position);

            // Vélocité aléatoire
            particle.velocity.set(
                (Math.random() - 0.5) * 3,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 3
            );

            // Propriétés
            particle.life = 0;
            particle.maxLife = 0.5 + Math.random() * 0.3;
            particle.size = 0.08 + Math.random() * 0.04;
            particle.color.setHex(0xffffff); // Blanc/étincelles
            particle.active = true;

            this.activeParticles.push(particle);
        }
    }

    /**
     * Émet des particules de critique (dorées)
     * @param {THREE.Vector3} position
     * @param {number} count
     */
    emitCriticalHit(position, count = 20) {
        for (let i = 0; i < count; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) break;

            // Position
            particle.position.copy(position);

            // Vélocité explosive
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 2;
            particle.velocity.set(
                Math.cos(angle) * speed,
                Math.random() * 3 + 1,
                Math.sin(angle) * speed
            );

            // Propriétés
            particle.life = 0;
            particle.maxLife = 0.8 + Math.random() * 0.4;
            particle.size = 0.12 + Math.random() * 0.06;
            particle.color.setHex(0xffd700); // Or
            particle.active = true;

            this.activeParticles.push(particle);
        }
    }

    /**
     * Émet une explosion de particules (combo finisher)
     * @param {THREE.Vector3} position
     */
    emitExplosion(position) {
        this.emitCriticalHit(position, 30);

        // Ajouter quelques particules blanches
        this.emitHitSparks(position, 15);
    }

    /**
     * Récupère une particule inactive du pool
     * @returns {Object|null}
     */
    getInactiveParticle() {
        return this.particles.find(p => !p.active) || null;
    }

    /**
     * Update toutes les particules actives
     * @param {number} deltaTime
     */
    update(deltaTime) {
        const geometry = this.pointsMesh.geometry;
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color.array;
        const sizes = geometry.attributes.size.array;

        // Update particules actives
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];

            // Update vie
            particle.life += deltaTime;

            if (particle.life >= particle.maxLife) {
                // Particule morte
                particle.active = false;
                this.activeParticles.splice(i, 1);
                continue;
            }

            // Update position
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Gravité
            particle.velocity.y -= 9.8 * deltaTime;

            // Friction
            particle.velocity.multiplyScalar(0.98);

            // Fade out
            const lifeRatio = particle.life / particle.maxLife;
            const alpha = 1.0 - lifeRatio;

            // Mettre à jour les attributs
            const idx = this.particles.indexOf(particle);
            if (idx !== -1) {
                positions[idx * 3] = particle.position.x;
                positions[idx * 3 + 1] = particle.position.y;
                positions[idx * 3 + 2] = particle.position.z;

                colors[idx * 3] = particle.color.r * alpha;
                colors[idx * 3 + 1] = particle.color.g * alpha;
                colors[idx * 3 + 2] = particle.color.b * alpha;

                sizes[idx] = particle.size * (1.0 - lifeRatio * 0.5);
            }
        }

        // Marquer les attributs comme modifiés
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        this.pointsMesh.geometry.dispose();
        this.pointsMesh.material.dispose();
        this.scene.remove(this.pointsMesh);
    }
}
