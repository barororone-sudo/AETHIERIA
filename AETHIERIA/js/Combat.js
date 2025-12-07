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
        /** @type {THREE.Group|null} */ this.bow = null;
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
        if (!this.player.weaponSlot) return;

        const geo = new THREE.BoxGeometry(0.1, 1.5, 0.3); // Width, Length, Thickness
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        this.weapon = new THREE.Mesh(geo, mat);

        // Align sword in hand
        // Box is Y-up. Rotate X-90 to point Z-forward.
        this.weapon.rotation.x = Math.PI / 2;
        this.weapon.position.set(0, 0, 0.75); // Offset so handle is in hand (half length)

        this.weapon.visible = false;

        this.player.weaponSlot.add(this.weapon);
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        const now = performance.now();
        if (this.comboStep >= 0 && now - this.lastAttackTime > this.comboResetTime) {
            // Reset combo if idle too long (visual only, logic handled in attack)
            // this.comboStep = 0; // Don't reset here, let attack() handle it or just keep index
            if (this.weapon && !this.isAttacking) this.weapon.visible = false;
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
                    if (this.pool) this.pool.return('arrow', p.mesh);
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
                // FIX: Assign camera to raycaster to support Sprites (e.g. Health Bars, Particles)
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
                        // Hit Feedback
                        if (this.player.hitStop) this.player.hitStop(0.05);
                        if (this.player.screenShake) this.player.screenShake(0.2, 0.1);
                    }

                    // Stick arrow logic removed for pooling simplicity (or we can attach a clone?)
                    // For now, just destroy on hit
                    if (this.pool) this.pool.return('arrow', p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Check Walls/Floor
                // TODO: Add environment collision
                if (nextPos.y < 0) { // Floor
                    if (this.pool) this.pool.return('arrow', p.mesh);
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

        // Branch: Shooting vs Melee
        if (this.isAiming) {
            this.shootArrow();
            return;
        }

        const now = performance.now();

        // Combo Logic
        if (now - this.lastAttackTime < 1000) { // 1s window
            this.comboStep = (this.comboStep + 1) % 3;
        } else {
            this.comboStep = 0;
        }

        this.lastAttackTime = now;
        this.isAttacking = true;
        this.attackProgress = 0;

        // Show weapon
        if (this.weapon) this.weapon.visible = true;

        if (this.player.audio) this.player.audio.playSFX('sword');

        console.log(`Attack Combo: ${this.comboStep}`);

        // Trigger Visuals on Player
        if (this.player.triggerAttackVisuals) {
            this.player.triggerAttackVisuals(this.comboStep);
        }

        // Lunge (Forward Impulse)
        // Combo 2 (3rd hit) lunges further
        const lungeForce = (this.comboStep === 2) ? 15 : 5;
        const forward = this.player.getForwardVector();
        if (this.player.body) {
            this.player.body.velocity.x += forward.x * lungeForce;
            this.player.body.velocity.z += forward.z * lungeForce;
        }
    }

    checkHit() {
        // Simple distance check for now
        if (!this.player.world) return;
        const enemies = this.player.world.enemies || [];
        enemies.forEach(enemy => {
            if (!this.player.body) return;
            const dist = this.player.body.position.distanceTo(enemy.body.position);
            // Dynamic Hitbox: Base Range (3) + Enemy Size (hitRadius or 0)
            const range = 3.0 + (enemy.hitRadius || 0);

            if (dist < range) {
                // Calculate Knockback Direction (Player -> Enemy)
                const direction = new THREE.Vector3().subVectors(enemy.body.position, this.player.body.position).normalize();

                // Force depends on combo step
                const force = (this.comboStep === 2) ? 15 : 8;

                // Apply Knockback
                if (enemy.applyKnockback) {
                    enemy.applyKnockback(direction, force);
                }

                // Apply Damage
                enemy.takeDamage(10, Elements.NONE);

                // VFX: Particles
                if (this.player.spawnHitParticles) {
                    // Hit point is roughly between player and enemy
                    // Convert Cannon Vec3 to Three Vector3
                    const playerPos = new THREE.Vector3(this.player.body.position.x, this.player.body.position.y, this.player.body.position.z);
                    const hitPos = playerPos.add(direction.multiplyScalar(1.0));
                    this.player.spawnHitParticles(hitPos);
                }

                // Hit Feedback (Juice)
                if (this.player.hitStop) this.player.hitStop(0.05); // 50ms
                if (this.player.screenShake) this.player.screenShake(0.3, 0.2); // Stronger shake for melee
            }
        });
    }

    toggleAim() {
        this.isAiming = !this.isAiming;
        console.log(`Aiming: ${this.isAiming}`);

        if (this.isAiming) {
            if (this.weapon) this.weapon.visible = false;
            if (this.bow) this.bow.visible = true;
        } else {
            if (this.weapon) this.weapon.visible = false; // Hide sword too (idle)
            if (this.bow) this.bow.visible = false;
        }
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
            const enemies = (this.player.world && this.player.world.enemies) ? this.player.world.enemies : [];
            for (const enemy of enemies) {
                if (projectile.position.distanceTo(enemy.body.position) < 1) {
                    enemy.takeDamage(20, Elements.PYRO);
                    if (this.player.hitStop) this.player.hitStop(0.1); // 100ms for heavy hit
                    if (this.player.screenShake) this.player.screenShake(0.4, 0.2);

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

        // Trigger Animation
        if (this.player.playAnimation) {
            this.player.playAnimation('BOW', false);
        }

        const spawnPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));

        // --- AIMING LOGIC ---
        // Raycast from Camera Center to find target
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.game.camera);

        // Intersect with World (Terrain, Enemies, etc.)
        // For now, let's just intersect with a virtual plane or far distance if nothing hit
        // Ideally we check enemies and terrain.
        // Let's assume a default target distance of 50 units if nothing is hit.

        let targetPoint = new THREE.Vector3();

        // 1. Check collisions with environment/enemies
        const objectsToCheck = [];
        if (this.player.world.enemies) objectsToCheck.push(...this.player.world.enemies.map(e => e.mesh));
        // TODO: Add terrain meshes to objectsToCheck if available

        const intersects = raycaster.intersectObjects(objectsToCheck, true);

        if (intersects.length > 0) {
            targetPoint.copy(intersects[0].point);
        } else {
            // No hit, aim at point far away along camera forward vector
            targetPoint.copy(raycaster.ray.origin).add(raycaster.ray.direction.multiplyScalar(100));
        }

        // Calculate Direction from Spawn to Target
        const direction = new THREE.Vector3().subVectors(targetPoint, spawnPos).normalize();

        // Get from Pool
        const arrowMesh = this.pool.get('arrow');
        if (!arrowMesh) return;

        arrowMesh.position.copy(spawnPos);
        // Look at target
        arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().negate());

        // Physics
        const velocity = direction.multiplyScalar(40); // Fast

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
