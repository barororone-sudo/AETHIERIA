// @ts-check
import * as THREE from 'three';
import { Elements } from './Chemistry.js';
import { PoolManager } from './managers/PoolManager.js';

/**
 * @typedef {Object} Projectile
 * @property {THREE.Mesh} mesh
 * @property {THREE.Vector3} velocity
 * @property {boolean} active
 * @property {number} life
 */

export class Combat {
    /**
     * @param {import('./Player.js').Player} player
     */
    constructor(player) {
        this.player = player;
        this.comboStep = 0;
        this.lastAttackTime = 0;
        this.isAiming = false;
        this.comboResetTime = 1000; // ms
        /** @type {Projectile[]} */ this.projectiles = [];
        /** @type {THREE.Mesh|null} */ this.weapon = null;
        /** @type {THREE.Group|null} */ this.bow = null;
        this.attackProgress = 0;
        this.isAttacking = false;

        // PoolManager initialized in init()
        /** @type {PoolManager|null} */ this.pool = null;
    }

    init() {
        if (this.player.world && this.player.world.game) {
            this.pool = new PoolManager(this.player.world.game);
            this.initPools();
        }
        this.initWeapon();
    }

    initPools() {
        if (!this.pool) return;

        this.pool.register('arrow', () => {
            const geo = new THREE.CylinderGeometry(0.05, 0.05, 1.0);
            geo.rotateX(Math.PI / 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            return new THREE.Mesh(geo, mat);
        }, 20);

        this.pool.register('fireball', () => {
            const geo = new THREE.SphereGeometry(0.3);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            return new THREE.Mesh(geo, mat);
        }, 10);
    }

    initWeapon() {
        if (!this.player.weaponSlot) return;

        const geo = new THREE.BoxGeometry(0.1, 1.5, 0.3);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });

        this.weapon = new THREE.Mesh(geo, mat);
        this.weapon.rotation.x = Math.PI / 2;
        this.weapon.position.set(0, 0, 0.75);
        this.weapon.visible = false;

        this.player.weaponSlot.add(this.weapon);
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        const now = performance.now();
        if (this.comboStep >= 0 && now - this.lastAttackTime > this.comboResetTime) {
            if (this.weapon && !this.isAttacking) this.weapon.visible = false;
        }

        if (this.isAttacking) {
            this.attackProgress += dt * 3.0;
            if (this.attackProgress >= 1) {
                this.isAttacking = false;
                this.attackProgress = 0;
                if (this.weapon) this.weapon.visible = false;
            } else if (this.attackProgress > 0.3 && this.attackProgress < 0.7) {
                this.checkHit();
            }
        }

        this.updateProjectiles(dt);
    }

    /**
     * @param {number} dt
     */
    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                this.destroyProjectile(i);
                continue;
            }

            p.velocity.y -= 9.8 * dt; // Gravity

            const move = p.velocity.clone().multiplyScalar(dt);
            const nextPos = p.mesh.position.clone().add(move);
            const dir = move.clone().normalize();
            const dist = move.length();

            const raycaster = new THREE.Raycaster(p.mesh.position, dir, 0, dist);
            // @ts-ignore
            if (this.player.game.camera) raycaster.camera = this.player.game.camera;

            // Check Enemies
            /** @type {any[]} */
            const enemies = (this.player.world && this.player.world.enemies) ? this.player.world.enemies : [];
            // @ts-ignore
            if (this.player.world && this.player.world.golem && !this.player.world.golem.isDead) {
                // @ts-ignore
                enemies.push(this.player.world.golem);
            }

            const enemyMeshes = enemies.map(e => e.mesh);
            const intersects = raycaster.intersectObjects(enemyMeshes, true);

            if (intersects.length > 0) {
                this.handleProjectileHit(intersects[0], enemies);
                this.destroyProjectile(i);
                continue;
            }

            // Floor Check
            if (nextPos.y < 0) {
                this.destroyProjectile(i);
                continue;
            }

            p.mesh.position.copy(nextPos);
            p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.velocity.clone().normalize().negate());
        }
    }

    /**
     * @param {number} index
     */
    destroyProjectile(index) {
        const p = this.projectiles[index];
        if (this.pool) this.pool.return('arrow', p.mesh);
        this.projectiles.splice(index, 1);
    }

    /**
     * @param {THREE.Intersection} hit
     * @param {any[]} enemies
     */
    handleProjectileHit(hit, enemies) {
        // @ts-ignore
        const isWeakPoint = hit.object.userData.isWeakPoint;

        let root = hit.object;
        while (root.parent && root.parent.type !== 'Scene') {
            root = root.parent;
        }

        const enemy = enemies.find(e => e.mesh === root);
        if (enemy) {
            enemy.takeDamage(15, Elements.NONE, isWeakPoint);
            // @ts-ignore
            if (this.player.hitStop) this.player.hitStop(0.05);
            // @ts-ignore
            if (this.player.screenShake) this.player.screenShake(0.2, 0.1);
        }
    }

    attack() {
        if (this.isAttacking) return;
        if (this.isAiming) {
            this.shootArrow();
            return;
        }

        const now = performance.now();
        if (now - this.lastAttackTime < 1000) {
            this.comboStep = (this.comboStep + 1) % 3;
        } else {
            this.comboStep = 0;
        }

        this.lastAttackTime = now;
        this.isAttacking = true;
        this.attackProgress = 0;

        if (this.weapon) this.weapon.visible = true;
        // @ts-ignore
        if (this.player.audio) this.player.audio.playSFX('sword');

        // @ts-ignore
        if (this.player.triggerAttackVisuals) this.player.triggerAttackVisuals(this.comboStep);

        const lungeForce = (this.comboStep === 2) ? 15 : 5;
        // @ts-ignore
        const forward = this.player.getForwardVector();
        if (this.player.body) {
            this.player.body.velocity.x += forward.x * lungeForce;
            this.player.body.velocity.z += forward.z * lungeForce;
        }
    }

    checkHit() {
        if (!this.player.world || !this.player.body) return;
        /** @type {any[]} */
        const enemies = this.player.world.enemies || [];

        enemies.forEach(enemy => {
            if (!this.player.body) return;
            const dist = this.player.body.position.distanceTo(enemy.body.position);
            const range = 3.0 + (enemy.hitRadius || 0);

            if (dist < range) {
                const direction = new THREE.Vector3().subVectors(enemy.body.position, this.player.body.position).normalize();
                const force = (this.comboStep === 2) ? 15 : 8;

                if (enemy.applyKnockback) enemy.applyKnockback(direction, force);

                // @ts-ignore
                const baseAtk = this.player.stats ? this.player.stats.attack : 5;
                const weaponDmg = (this.player.equippedWeapon && this.player.equippedWeapon.stats) ? this.player.equippedWeapon.stats.damage : 0;
                let damage = baseAtk + weaponDmg;

                if (this.comboStep === 2) damage *= 1.5;
                const isCrit = Math.random() < 0.1;
                if (isCrit) damage *= 2.0;

                enemy.takeDamage(Math.floor(damage), Elements.NONE);

                const playerPos = new THREE.Vector3(this.player.body.position.x, this.player.body.position.y, this.player.body.position.z);
                const hitPos = playerPos.add(direction.clone().multiplyScalar(1.0));

                if (this.player.game.ui && this.player.game.ui.showDamage) {
                    this.player.game.ui.showDamage(hitPos, Math.floor(damage), isCrit);
                }

                // @ts-ignore
                if (this.player.spawnHitParticles) this.player.spawnHitParticles(hitPos);
                // @ts-ignore
                if (this.player.hitStop) this.player.hitStop(0.05);
                // @ts-ignore
                if (this.player.screenShake) this.player.screenShake(0.3, 0.2);
            }
        });
    }

    toggleAim() {
        this.isAiming = !this.isAiming;
        if (this.isAiming) {
            if (this.weapon) this.weapon.visible = false;
            // if (this.bow) this.bow.visible = true;
        } else {
            if (this.weapon) this.weapon.visible = false;
            // if (this.bow) this.bow.visible = false;
        }
    }

    shootArrow() {
        if (!this.player.world || !this.pool || !this.player.mesh) return;

        // @ts-ignore
        if (this.player.playAnimation) this.player.playAnimation('BOW', false);

        const spawnPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.game.camera);

        let targetPoint = new THREE.Vector3();
        /** @type {THREE.Object3D[]} */
        const objectsToCheck = [];
        // @ts-ignore
        if (this.player.world.enemies) objectsToCheck.push(...this.player.world.enemies.map(e => e.mesh));

        const intersects = raycaster.intersectObjects(objectsToCheck, true);

        if (intersects.length > 0) {
            targetPoint.copy(intersects[0].point);
        } else {
            targetPoint.copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(100));
        }

        const direction = new THREE.Vector3().subVectors(targetPoint, spawnPos).normalize();
        const arrowMesh = this.pool.get('arrow');
        if (!arrowMesh) return;

        arrowMesh.position.copy(spawnPos);
        arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().negate());

        /** @type {Projectile} */
        const arrow = {
            mesh: arrowMesh,
            velocity: direction.multiplyScalar(40),
            active: true,
            life: 5.0
        };

        this.projectiles.push(arrow);
    }
}
