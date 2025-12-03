// @ts-check
import * as THREE from 'three';
import { Elements } from './Chemistry.js';
import { PoolManager } from './managers/PoolManager.js';

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
        /** @type {any[]} */ this.projectiles = [];
        /** @type {THREE.Mesh|null} */ this.weapon = null;
        this.attackProgress = 0;
        this.isAttacking = false;

        // Pool Manager
        // We defer initialization to ensure game.world is ready
        /** @type {PoolManager|null} */ this.pool = null;

        // Weapon Mesh (Procedural Sword)
        // this.initWeapon(); // Moved to init()
    }

    init() {
        // Now we can safely access game via world
        if (this.player.world) {
            this.pool = new PoolManager(this.player.world.game);
            this.initPools();
        }
        this.initWeapon();
    }

    initPools() {
        if (!this.pool) return;
        // Arrow Pool
        this.pool.register('arrow', () => {
            const geo = new THREE.CylinderGeometry(0.05, 0.05, 1.0);
            geo.rotateX(Math.PI / 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const mesh = new THREE.Mesh(geo, mat);
            return mesh;
        }, 20);

        // Fireball Pool
        this.pool.register('fireball', () => {
            const geo = new THREE.SphereGeometry(0.3);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
            const mesh = new THREE.Mesh(geo, mat);
            return mesh;
        }, 10);
    }

    initWeapon() {
        if (!this.player.mesh) return;

        const geo = new THREE.BoxGeometry(0.1, 1.5, 0.3);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        this.weapon = new THREE.Mesh(geo, mat);
        this.weapon.position.set(0.5, 0.5, 0.5);
        this.weapon.rotation.x = Math.PI / 2;
        this.weapon.visible = false;

        this.player.mesh.add(this.weapon);
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        const now = performance.now();
        if (this.comboStep > 0 && now - this.lastAttackTime > this.comboResetTime) {
            this.comboStep = 0;
            if (this.weapon) this.weapon.visible = false;
        }

        // Attack State Logic
        if (this.isAttacking) {
            this.attackProgress += dt * 3.0; // Speed of attack
            if (this.attackProgress >= 1) {
                this.isAttacking = false;
                this.attackProgress = 0;
                if (this.weapon) this.weapon.visible = false;
            } else {
                // Hitbox Active Window (e.g., 0.3 to 0.7)
                if (this.attackProgress > 0.3 && this.attackProgress < 0.7) {
                    this.checkHit();
                }
            }
        }

        // Update Projectiles (Arrows)
        if (this.projectiles) {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                if (!p.active) continue;

                p.life -= dt;
                if (p.life <= 0) {
                    this.pool.return('arrow', p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Gravity
                p.velocity.y -= 9.8 * dt;

                // Move
                const move = p.velocity.clone().multiplyScalar(dt);
                const nextPos = p.mesh.position.clone().add(move);

                // Raycast for hit detection
                const dir = move.clone().normalize();
                const dist = move.length();
                const raycaster = new THREE.Raycaster(p.mesh.position, dir, 0, dist);
                // FIX: Assign camera to raycaster to support Sprites
                raycaster.camera = this.player.game.camera;

                // Check Enemies
                const enemies = (this.player.world && this.player.world.enemies) ? this.player.world.enemies : [];
                // Also check Golem
                if (this.player.world && this.player.world.golem && !this.player.world.golem.isDead) {
                    enemies.push(this.player.world.golem);
                }

                // We need meshes for raycaster
                const enemyMeshes = enemies.map(e => e.mesh);
                const intersects = raycaster.intersectObjects(enemyMeshes, true); // Recursive

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    console.log("Arrow Hit!", hit.object.name);

                    // Find which enemy
                    // This is a bit hacky, better to have a map or userData
                    // For now, let's assume we hit something

                    // Check if Weak Point
                    const isWeakPoint = hit.object.userData.isWeakPoint;

                    // Apply Damage
                    // We need to find the enemy object from the mesh
                    // Traverse up to find the root mesh which should match enemy.mesh
                    let root = hit.object;
                    while (root.parent && root.parent.type !== 'Scene') {
                        root = root.parent;
                    }

                    const enemy = enemies.find(e => e.mesh === root);
                    if (enemy) {
                        enemy.takeDamage(15, Elements.NONE, isWeakPoint);
                    }

                    // Stick arrow logic removed for pooling simplicity (or we can attach a clone?)
                    // For now, just destroy on hit
                    this.pool.return('arrow', p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Check Walls/Floor
                // TODO: Add environment collision
                if (nextPos.y < 0) { // Floor
                    this.pool.return('arrow', p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                p.mesh.position.copy(nextPos);
                // Rotate to face velocity
                p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.velocity.clone().normalize().negate());
            }
        }
    }

    attack() {
        if (this.isAttacking) return; // No spamming

        const now = performance.now();
        this.comboStep = (this.comboStep % 3) + 1;
        this.lastAttackTime = now;
        this.isAttacking = true;
        this.attackProgress = 0;
        if (this.weapon) this.weapon.visible = true;

        if (this.player.audio) this.player.audio.playSFX('sword');

        console.log(`Attack Combo: ${this.comboStep}`);

        // Lunge (Forward Impulse)
        const forward = this.player.getForwardVector();
        this.player.body.velocity.x += forward.x * 5;
        this.player.body.velocity.z += forward.z * 5;
    }

    checkHit() {
        // Simple distance check for now
        if (!this.player.world) return;
        const enemies = this.player.world.enemies || [];
        enemies.forEach(enemy => {
            const dist = this.player.body.position.distanceTo(enemy.body.position);
            if (dist < 3) {
                enemy.takeDamage(10, Elements.NONE);
            }
        });
    }

    toggleAim() {
        this.isAiming = !this.isAiming;
        console.log(`Aiming: ${this.isAiming}`);
    }

    useSkill() {
        console.log("Skill: Fireball!");
        if (!this.pool) return;
        // Create Fireball from Pool
        const projectile = this.pool.get('fireball');
        if (!projectile) return;

        if (!this.player.mesh) return;
        const spawnPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
        projectile.position.copy(spawnPos);

        const forward = this.player.getForwardVector();
        const velocity = forward.multiplyScalar(20);

        // Simple projectile logic
        const updateProjectile = () => {
            if (!projectile.visible) return; // Returned to pool

            projectile.position.add(velocity.clone().multiplyScalar(0.016));

            // Floor Check (Updraft)
            if (projectile.position.y < 0) {
                if (this.player.world) this.player.world.createUpdraft(projectile.position);
                if (this.pool) this.pool.return('fireball', projectile);
                return; // Stop
            }

            // Enemy Check
            const enemies = this.player.world.enemies || [];
            for (const enemy of enemies) {
                if (projectile.position.distanceTo(enemy.body.position) < 1) {
                    enemy.takeDamage(20, Elements.PYRO);
                    if (this.pool) this.pool.return('fireball', projectile);
                    return;
                }
            }

            if (projectile.position.distanceTo(spawnPos) < 50) {
                requestAnimationFrame(updateProjectile);
            } else {
                if (this.pool) this.pool.return('fireball', projectile);
            }
        };
        updateProjectile();
    }

    shootArrow() {
        if (!this.player.world) return;
        if (!this.pool) return;

        console.log("Shooting Arrow!");
        if (!this.player.mesh) return;
        const spawnPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const forward = this.player.getForwardVector();

        // Get from Pool
        const arrowMesh = this.pool.get('arrow');
        if (!arrowMesh) return;

        arrowMesh.position.copy(spawnPos);
        arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward.clone().negate()); // Look at target

        // Physics
        const velocity = forward.clone().multiplyScalar(40); // Fast

        const arrow = {
            mesh: arrowMesh,
            velocity: velocity,
            active: true,
            life: 5.0
        };

        if (!this.projectiles) this.projectiles = [];
        this.projectiles.push(arrow);
    }

    useUltimate() {
        console.log("Ultimate: METEOR!");
        // Cinematic Camera would go here
    }
}
