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

        // 🎯 Hit tracking per attack swing (prevents multi-hit)
        /** @type {Set<string>} */ this.hitEnemies = new Set();

        // Z-Targeting
        /** @type {import('./Enemy.js').Enemy | null} */ this.lockedTarget = null;
        this.reticle = null; // Visual Indicator

        // PoolManager initialized in init()
        /** @type {PoolManager|null} */ this.pool = null;
    }

    init() {
        if (this.player.world && this.player.world.game) {
            this.pool = new PoolManager(this.player.world.game);
            this.initPools();
        }
        this.initWeapon();
        this.initReticle();
    }

    /**
     * ⚡ HIT FLASH EFFECT
     * Flashes enemy mesh white for 100ms when taking damage
     * @param {any} enemy - Enemy object with mesh property
     */
    flashEnemy(enemy) {
        if (!enemy || !enemy.mesh) return;

        const mesh = enemy.mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // Store original emissive values (only for materials that support it)
        const originalEmissive = materials.map(mat => {
            // Skip materials without emissive support
            if (!mat || mat.emissive === undefined) return null;

            return {
                color: mat.emissive.clone(),
                intensity: mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0
            };
        });

        // Flash white (only materials with emissive support)
        materials.forEach((mat, index) => {
            if (mat && mat.emissive !== undefined) {
                mat.emissive.setHex(0xffffff);
                mat.emissiveIntensity = 10.0;
            }
        });

        // Revert after 100ms
        setTimeout(() => {
            materials.forEach((mat, index) => {
                if (mat && mat.emissive !== undefined && originalEmissive[index]) {
                    mat.emissive.copy(originalEmissive[index].color);
                    mat.emissiveIntensity = originalEmissive[index].intensity;
                }
            });
        }, 100);
    }

    initReticle() {
        // Simple Ring for Targeting
        const geo = new THREE.RingGeometry(0.3, 0.35, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        this.reticle = new THREE.Mesh(geo, mat);
        this.reticle.rotation.x = -Math.PI / 2;
        this.reticle.visible = false;
        if (this.player.world) this.player.world.scene.add(this.reticle);
    }

    initPools() {
        if (!this.pool) return;

        // Arrow Factory Helper
        /** @param {THREE.ColorRepresentation} color */
        const createArrow = (color) => {
            const grp = new THREE.Group();
            const geo = new THREE.CylinderGeometry(0.05, 0.05, 1.0);
            geo.rotateX(Math.PI / 2);
            const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            grp.add(mesh);
            return grp; // Return Group to match expectance? Or Mesh? PoolManager handles Object3D.
            // Actually let's return Mesh for simplicity if physics body matches.
            return mesh;
        };

        this.pool.register('arrow', () => createArrow(0x8B4513), 20); // Normal
        this.pool.register('arrow_pyro', () => createArrow(0xFF0000), 10);
        this.pool.register('arrow_cryo', () => createArrow(0x00FFFF), 10);
        this.pool.register('arrow_electro', () => createArrow(0xFFFF00), 10);
        this.pool.register('arrow_anemo', () => createArrow(0x88FF88), 10);
        this.pool.register('arrow_hydro', () => createArrow(0x0000FF), 10);
        this.pool.register('arrow_dendro', () => createArrow(0x008800), 10);
        this.pool.register('arrow_dark', () => createArrow(0x220022), 10);

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
        this.updateLock(dt);
    }

    /**
     * @param {number} dt
     */
    updateLock(dt) {
        if (this.lockedTarget) {
            // Check validity
            if (this.lockedTarget.isDead || !this.lockedTarget.mesh) {
                this.unlock();
                return;
            }

            // Check Distance
            const dist = this.player.mesh.position.distanceTo(this.lockedTarget.mesh.position);
            if (dist > 20) { // Max lock range
                this.unlock();
                return;
            }

            // Update Reticle
            if (this.reticle) {
                this.reticle.visible = true;
                this.reticle.position.copy(this.lockedTarget.mesh.position);
                this.reticle.position.y += this.lockedTarget.height || 1.0;
                this.reticle.rotation.z += dt * 2; // Spin
                // Pulse
                const s = 1.0 + Math.sin(performance.now() * 0.01) * 0.2;
                this.reticle.scale.set(s, s, s);
                this.reticle.lookAt(this.player.camera.position);
            }
        } else {
            if (this.reticle) this.reticle.visible = false;
        }
    }

    toggleLock() {
        if (this.lockedTarget) {
            this.unlock();
        } else {
            this.lockClosest();
        }
    }

    unlock() {
        this.lockedTarget = null;
        if (this.reticle) this.reticle.visible = false;
        // Optionally reset camera? Player.js handles that based on existence of lockedTarget
    }

    lockClosest() {
        if (!this.player.world || !this.player.world.enemies) return;

        const enemies = this.player.world.enemies.filter(e => !e.isDead);
        const playerPos = this.player.mesh.position;
        const camDir = new THREE.Vector3();
        this.player.camera.getWorldDirection(camDir);

        /** @type {import('./Enemy.js').Enemy | null} */
        let closest = null;
        let minScore = 999;

        // Combine Distance + Angle for "Best Target"
        enemies.forEach(e => {
            const disp = e.mesh.position.clone().sub(playerPos);
            const dist = disp.length();
            if (dist > 15) return; // Too far

            disp.normalize();
            const angle = camDir.angleTo(disp);
            if (angle > Math.PI / 2) return; // Behind camera

            // Score: Distance (weighted) + Angle (weighted)
            // Preference for things in front of camera
            const score = dist + (angle * 10);

            if (score < minScore) {
                minScore = score;
                closest = e;
            }
        });

        if (closest) {
            this.lockedTarget = closest;
            // @ts-ignore
            console.log("Locked on:", closest.name || "Enemy");
        } else {
            // Recenter Camera if no target?
            // this.player.resetCameraBehind();
        }
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

            // ⚡ HIT FLASH EFFECT
            this.flashEnemy(enemy);

            // @ts-ignore
            if (this.player.hitStop) this.player.hitStop(0.05);
            // @ts-ignore
            if (this.player.screenShake) this.player.screenShake(0.2, 0.1);
        }
    }

    attack() {
        console.log('🎯 attack() called, isAttacking:', this.isAttacking);
        if (this.isAttacking) return;
        if (this.isAiming) {
            this.shootArrow();
            return;
        }

        // 🎮 USE ADVANCED COMBO SYSTEM
        const comboStep = this.player.comboSystem ? this.player.comboSystem.registerHit() : 1;
        this.comboStep = comboStep - 1; // Keep for compatibility (0-indexed)

        this.lastAttackTime = performance.now();
        this.isAttacking = true;
        this.attackProgress = 0;
        console.log('✅ Attack started, isAttacking now:', this.isAttacking);

        if (this.weapon) this.weapon.visible = true;
        // @ts-ignore
        if (this.player.audio) this.player.audio.playSFX('sword');

        // 🎯 TRIGGER WEAPON-SPECIFIC ANIMATION
        if (this.player.weaponAnimations && this.player.equippedWeapon) {
            const weaponType = this.player.equippedWeapon.weaponType;
            this.player.weaponAnimations.playAttackAnimation(weaponType, this.comboStep);
            console.log(`🎯 ${weaponType} animation (combo ${comboStep})`);
        }

        // ✨ START WEAPON TRAIL
        if (this.player.weaponTrail && this.player.weaponSlot) {
            const weaponPos = new THREE.Vector3();
            this.player.weaponSlot.getWorldPosition(weaponPos);
            this.player.weaponTrail.start(weaponPos);

            // Stop trail after attack duration
            setTimeout(() => {
                if (this.player.weaponTrail) this.player.weaponTrail.stop();
            }, 400);
        }

        // Legacy trail (keep for compatibility)
        if (this.player.visuals) {
            this.player.visuals.startTrail();
            setTimeout(() => { if (this.player.visuals) this.player.visuals.stopTrail(); }, 300);
        }

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
        console.log('🔍 checkHit() called');
        if (!this.player.world || !this.player.body) return;
        /** @type {any[]} */
        const enemies = this.player.world.enemies || [];
        console.log('👹 Enemies found:', enemies.length);

        enemies.forEach(enemy => {
            if (!this.player.body) return;

            const dist = this.player.body.position.distanceTo(enemy.body.position);
            console.log(`📏 Distance to enemy: ${dist.toFixed(2)}`);

            let weaponRange = 3.0;
            if (this.player.equippedWeapon) {
                switch (this.player.equippedWeapon.weaponType) {
                    case 'SPEAR': weaponRange = 4.5; break;
                    case 'GREATSWORD': weaponRange = 4.0; break;
                    case 'DAGGER': weaponRange = 2.0; break;
                    case 'DOUBLE_BLADE': weaponRange = 3.5; break;
                    default: weaponRange = 3.0;
                }
            }
            const range = weaponRange + (enemy.hitRadius || 0);

            if (dist < range) {
                console.log(`💥 HIT! Distance ${dist.toFixed(2)} < Range ${range.toFixed(2)}`);
                const direction = new THREE.Vector3().subVectors(enemy.body.position, this.player.body.position).normalize();
                const force = (this.comboStep === 2) ? 15 : 8;

                if (enemy.applyKnockback) enemy.applyKnockback(direction, force);

                // 💪 CALCULATE DAMAGE WITH COMBO MULTIPLIER
                // @ts-ignore
                const baseAtk = this.player.stats ? this.player.stats.attack : 5;
                const weaponDmg = (this.player.equippedWeapon && this.player.equippedWeapon.stats) ? this.player.equippedWeapon.stats.damage : 0;
                let damage = baseAtk + weaponDmg;

                // Apply combo multiplier
                const comboMultiplier = this.player.comboSystem ? this.player.comboSystem.getDamageMultiplier() : 1.0;
                damage *= comboMultiplier;

                const isCrit = Math.random() < 0.1;
                if (isCrit) damage *= 2.0;

                enemy.takeDamage(Math.floor(damage), Elements.NONE);

                // ⚡ HIT FLASH EFFECT
                this.flashEnemy(enemy);

                const playerPos = new THREE.Vector3(this.player.body.position.x, this.player.body.position.y, this.player.body.position.z);
                const hitPos = playerPos.add(direction.clone().multiplyScalar(1.0));

                if (this.player.game.ui && this.player.game.ui.showDamage) {
                    this.player.game.ui.showDamage(hitPos, Math.floor(damage), isCrit);
                }

                // 💥 ADVANCED PARTICLE EFFECTS
                const isComboFinisher = (this.comboStep === 2);

                if (this.player.particleSystem) {
                    if (isComboFinisher) {
                        // Combo 3 = Explosion
                        this.player.particleSystem.emitExplosion(hitPos);
                    } else if (isCrit) {
                        // Critical = Gold particles
                        this.player.particleSystem.emitCriticalHit(hitPos);
                    } else {
                        // Normal = White sparks
                        this.player.particleSystem.emitHitSparks(hitPos);
                    }
                }

                // Legacy particles (keep for compatibility)
                if (this.player.visuals) {
                    const el = this.player.equippedWeapon ? this.player.equippedWeapon.element : 'NONE';
                    this.player.visuals.spawnImpact(hitPos, el);
                }

                // 📳 ADVANCED COMBAT EFFECTS
                if (this.player.combatEffects) {
                    if (isComboFinisher) {
                        this.player.combatEffects.comboFinisherEffect();
                    } else if (isCrit) {
                        this.player.combatEffects.criticalHitEffect();
                    } else {
                        this.player.combatEffects.normalHitEffect();
                    }
                }

                // @ts-ignore
                if (this.player.hitStop) this.player.hitStop(0.05);
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

    /**
     * ⚡ SPECIAL SKILL - Genshin Impact Style
     * AOE burst with damage, knockback, and visual effect
     */
    triggerSkill() {
        console.log('⚡ SKILL ACTIVATED!');

        // Reset cooldown
        this.player.skillCooldown = this.player.skillMaxCooldown;

        // Visual burst effect
        this.createSkillBurst();

        // AOE damage
        this.applySkillDamage();

        // Sound effect
        if (this.player.game.audio) {
            this.player.game.audio.playSFX('sword'); // Reuse sword sound for now
        }
    }

    /**
     * Create visual burst effect
     */
    createSkillBurst() {
        const geo = new THREE.SphereGeometry(0.5, 32, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const burst = new THREE.Mesh(geo, mat);
        burst.position.copy(this.player.mesh.position);
        this.player.world.scene.add(burst);

        // Animate: scale + fade
        let time = 0;
        const animate = () => {
            time += 0.016; // ~60fps
            if (time > 0.5) {
                burst.geometry.dispose();
                burst.material.dispose();
                this.player.world.scene.remove(burst);
                return;
            }

            const scale = 1 + time * 20; // Scale to 10x
            burst.scale.set(scale, scale, scale);
            burst.material.opacity = 0.8 - time * 1.6;
            requestAnimationFrame(animate);
        };
        animate();

        // Use particle system if available
        if (this.player.particleSystem) {
            const pos = this.player.mesh.position.clone();
            this.player.particleSystem.emitExplosion(pos);
        }
    }

    /**
     * Apply AOE damage to nearby enemies
     */
    applySkillDamage() {
        const enemies = this.player.world.enemies || [];
        const playerPos = this.player.body.position;
        const skillRadius = 5.0;
        const skillDamage = 200;

        enemies.forEach(enemy => {
            const dist = playerPos.distanceTo(enemy.body.position);
            if (dist <= skillRadius) {
                enemy.takeDamage(skillDamage, Elements.NONE);

                // Flash effect
                this.flashEnemy(enemy);

                // Knockback
                const dir = new THREE.Vector3()
                    .subVectors(
                        new THREE.Vector3(enemy.body.position.x, enemy.body.position.y, enemy.body.position.z),
                        new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
                    )
                    .normalize();
                if (enemy.applyKnockback) {
                    enemy.applyKnockback(dir, 20);
                }

                // Show damage
                if (this.player.game.ui && this.player.game.ui.showDamage) {
                    const hitPos = new THREE.Vector3(enemy.mesh.position.x, enemy.mesh.position.y, enemy.mesh.position.z);
                    this.player.game.ui.showDamage(hitPos, skillDamage, false);
                }
            }
        });
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

        let projId = 'arrow';
        if (this.player.equippedWeapon && this.player.equippedWeapon.element) {
            projId = `arrow_${this.player.equippedWeapon.element.toLowerCase()}`;
        }

        const arrowMesh = this.pool.get(projId) || this.pool.get('arrow');
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
