// js/Enemy.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Chemistry, Elements } from './Chemistry.js';
import { EnemiesDb, EnemyType, BehaviorType } from './data/EnemiesDb.js';

// 🚀 ZERO ALLOCATION: Reusable Global Temps
const _tempVec3 = new THREE.Vector3();
const _tempVec3_2 = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempCanonVec3 = new CANNON.Vec3();

export class Enemy {
    /**
     * @param {import('./World.js').World} world 
     * @param {CANNON.Vec3} position 
     * @param {object|string|null} configOrId 
     * @param {THREE.Object3D} mesh 
     */
    constructor(world, position, configOrId = null, mesh = null) {
        this.world = world;
        this.game = world.game;

        // --- LOAD CONFIG ---
        // Handle legacy (element) vs new (config)
        let config = null;
        if (typeof configOrId === 'string') {
            config = EnemiesDb.find(e => e.id === configOrId);
        } else if (configOrId && configOrId.stats) {
            config = configOrId;
        }

        // Apply Config or Defaults
        this.config = config || EnemiesDb.find(e => e.id === 'slime_green') || EnemiesDb[0]; // Fallback

        this.name = this.config.name;
        this.id = this.config.id;
        this.type = this.config.type;
        this.behavior = this.config.behavior || BehaviorType.PATROL;

        this.hp = this.config.stats.hp;
        this.maxHp = this.config.stats.hp;
        this.speed = this.config.stats.speed;
        this.damageVal = this.config.stats.damage;
        this.expReward = this.config.stats.exp || 10;

        // Element (Integration with Chemistry)
        this.element = Elements.NONE;
        if (this.config.visuals && this.config.visuals.particles) {
            const p = this.config.visuals.particles.toUpperCase();
            if (p === 'PYRO' || p === 'FIRE') this.element = Elements.PYRO;
            else if (p === 'CRYO' || p === 'ICE') this.element = Elements.CRYO;
            else if (p === 'HYDRO' || p === 'WATER') this.element = Elements.HYDRO;
            else if (p === 'ELECTRO') this.element = Elements.ELECTRO;
        } else if (this.id.includes('red')) this.element = Elements.PYRO;
        else if (this.id.includes('blue')) this.element = Elements.HYDRO; // Default blue to Hydro if no particle
        else if (this.id.includes('yellow')) this.element = Elements.ELECTRO;

        // Boss Malphas = Metal/Void? Lets say Neutral or specific.
        if (this.id === 'boss_malphas') this.element = Elements.NONE; // Neural for now

        // State Machine
        this.state = 'IDLE'; // IDLE, PATROL, ALERT, CHASE, ATTACK, RETURN, PREP, STUNNED
        this.isInvulnerable = false; // For Leash/Return

        this.timers = {
            state: 0,
            attack: 0,
            path: 0,
            stun: 0
        };

        this.spawnPoint = position.clone();
        this.patrolPoint = position.clone();

        this.active = true; // Pool Flag

        // --- VISUALS ---
        this.VISUAL_OFFSET_Y = 0.0;
        if (mesh) {
            this.mesh = mesh;
            this.height = 1.0;
        } else {
            // Procedural Model via MonsterFactory
            if (this.world.monsterFactory) {
                this.mesh = this.world.monsterFactory.createEnemy(this.config.visuals);
            } else {
                // Fallback
                const geo = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x880000 });
                this.mesh = new THREE.Mesh(geo, mat);
            }
            this.height = this.config.visuals.scale || 1.0;
        }

        // Snap to Ground - ROBUST FIX
        const ABSOLUTE_MIN_HEIGHT = 5.0; // Never spawn below 5m

        if (this.world.getGroundHeight) {
            const groundY = this.world.getGroundHeight(position.x, position.z);
            if (groundY !== null && groundY !== undefined && groundY > 0) {
                const spawnHeight = groundY + (this.height / 2) + 1.0;
                position.y = Math.max(ABSOLUTE_MIN_HEIGHT, spawnHeight);
            } else {
                position.y = ABSOLUTE_MIN_HEIGHT;
            }
        } else {
            position.y = ABSOLUTE_MIN_HEIGHT;
        }

        this.mesh.position.copy(position);
        this.world.scene.add(this.mesh);

        // --- PHYSICS ---
        const halfExtents = new CANNON.Vec3(0.5 * (this.config.visuals.scale || 1), 0.5 * (this.config.visuals.scale || 1), 0.5 * (this.config.visuals.scale || 1));
        const shape = new CANNON.Box(halfExtents);
        this.body = new CANNON.Body({
            mass: 5 * (this.config.visuals.scale || 1),
            position: new CANNON.Vec3(position.x, position.y, position.z),
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.linearDamping = 0.5; // Walking damping
        this.world.physicsWorld.addBody(this.body);

        // --- UI ---
        // Only create floating HP bar for non-bosses
        const isBoss = (this.type === 'BOSS' || (this.config && this.config.visuals && this.config.visuals.isBoss));
        if (this.game.combatUI && !isBoss) {
            this.hpBar = this.game.combatUI.createHealthBar(this);
        }
    }

    /**
     * RESET for Object Pooling
     * @param {CANNON.Vec3} position
     * @param {string|object} configOrId
     */
    reset(position, configOrId) {
        // 1. Re-Config
        let config = null;
        if (typeof configOrId === 'string') {
            config = EnemiesDb.find(e => e.id === configOrId);
        } else if (configOrId && configOrId.stats) {
            config = configOrId;
        }
        this.config = config || this.config; // Keep old if null (shouldn't happen)

        // 2. Stats
        this.hp = this.config.stats.hp;
        this.maxHp = this.config.stats.hp;
        this.speed = this.config.stats.speed;
        this.damageVal = this.config.stats.damage;
        this.expReward = this.config.stats.exp || 10;

        this.name = this.config.name;
        this.id = this.config.id;
        this.type = this.config.type;

        // 3. State
        this.state = 'IDLE';
        this.isInvulnerable = false;
        this.isDead = false;

        // Element Inference
        this.element = Elements.NONE;
        if (this.config.visuals && this.config.visuals.particles) {
            const p = this.config.visuals.particles.toUpperCase();
            if (p === 'PYRO' || p === 'FIRE') this.element = Elements.PYRO;
            else if (p === 'CRYO' || p === 'ICE') this.element = Elements.CRYO;
            else if (p === 'HYDRO' || p === 'WATER') this.element = Elements.HYDRO;
            else if (p === 'ELECTRO') this.element = Elements.ELECTRO;
        } else if (this.id.includes('red')) this.element = Elements.PYRO;
        else if (this.id.includes('blue')) this.element = Elements.HYDRO;
        else if (this.id.includes('yellow')) this.element = Elements.ELECTRO;

        // 4. Position
        this.spawnPoint.copy(position);
        this.patrolPoint.copy(position);

        this.body.position.set(position.x, position.y, position.z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.wakeUp();

        this.mesh.position.copy(position);
        this.mesh.visible = true;
        this.active = true;

        // 5. Visuals - Rebuild if needed? 
        // For strict performance, we should reuse mesh if same type.
        // For now, let's assume same mesh or minimal update.
        // If type changed completely (e.g. Slime -> Goblin), we might need to swap mesh.
        // TODO: Mesh Swapping logic in optimizations later.

        // Update HP Bar
        if (this.hpBar) {
            this.hpBar.update(this.mesh.position, this.hp, this.maxHp);
        } else if (this.game.combatUI && !(this.type === 'BOSS' || (this.config && this.config.visuals && this.config.visuals.isBoss))) {
            // Re-create if missing and NOT a boss
            this.hpBar = this.game.combatUI.createHealthBar(this);
        }
    }

    /**
     * Dot Product Vision Check - ZERO ALLOCATION
     */
    canSeePlayer(player) {
        if (!player || !player.mesh) return false;

        const distSq = this.body.position.distanceSquared(player.body.position);
        const radius = this.config.stats.detectionRadius;
        if (distSq > radius * radius) return false;

        // Vector to player
        _tempVec3.copy(player.mesh.position).sub(this.mesh.position).normalize();

        // My Forward vector
        _tempVec3_2.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();

        // Dot Product
        const dot = _tempVec3_2.dot(_tempVec3);

        // 60 Degrees cone approx 0.5 dot
        if (dot > 0.5) {
            return true;
        }

        return false;
    }

    update(dt) {
        if (this.state === 'DUMMY') return; // Debug Dummy
        if (!this.world.game.player) return;

        // --- OPTIMIZATION: Distance Culling & Sleep Physics ---
        const player = this.world.game.player;
        const distSq = this.body.position.distanceSquared(player.body.position); // CANNON method

        // 100m Culling (100*100 = 10000)
        // Exception: BOSSES should have larger range
        let cullDistSq = 10000;
        if (this.type === 'ELITE' || this.type === 'BOSS' || (this.config && this.config.visuals && this.config.visuals.isBoss)) {
            cullDistSq = 250000; // 500m
        }

        if (distSq > cullDistSq) {
            if (this.body.sleepState !== CANNON.Body.SLEEPING) {
                this.body.sleep();
                this.mesh.visible = false;
            }
            return;
        } else {
            if (this.body.sleepState === CANNON.Body.SLEEPING) {
                this.body.wakeUp();
                this.mesh.visible = true;
            }
        }

        // Sync Physics
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y += this.VISUAL_OFFSET_Y;
        this.mesh.quaternion.copy(this.body.quaternion);

        // State Machine
        this.timers.state -= dt;
        this.timers.attack -= dt;

        // Calculate SQRT distance only once here if needed for audio logic, otherwise use SQ
        // Using SQ everywhere is faster, but some logic needs generic dist.
        const dist = Math.sqrt(distSq);

        // DEBUG BOSS AI
        if ((this.type === 'BOSS' || (this.config && this.config.visuals && this.config.visuals.isBoss))) {
            if (!this._bossDebugTimer) this._bossDebugTimer = 0;
            this._bossDebugTimer += dt;
            if (this._bossDebugTimer > 1.0) {
                this._bossDebugTimer = 0;
                console.log(`[BOSS_AI] State: ${this.state} | DistToPlayer: ${dist.toFixed(1)} | DistToSpawn: ${this.body.position.distanceTo(this.spawnPoint).toFixed(1)} | Invuln: ${this.isInvulnerable} | HP: ${this.hp}/${this.maxHp}`);
            }
        }

        // 🛡️ BOSS MALPHAS PHASE 2 LOGIC
        if (this.config.id === 'boss_malphas' && !this.isEnraged && this.hp < this.maxHp * 0.5) {
            this.isEnraged = true;
            this.speed *= 1.5; // +50% Speed

            // Visual Change - Turn Red
            if (this.mesh) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const mat = child.material;
                        if (mat.emissive) {
                            mat.emissive.setHex(0xff0000);
                            mat.emissiveIntensity = 2.0;
                        }
                        if (mat.color) {
                            mat.color.setHex(0x550000); // Dark Red body
                        }
                    }
                });
            }

            if (this.game.ui) this.game.ui.showToast("MALPHAS EST ENRAGÉ !", "warning");
        }

        // Phase 2 Particle Trail
        if (this.isEnraged && this.game.particles) {
            if (Math.random() < 0.3) {
                this.game.particles.emit(this.body.position, 'lava', 1);
            }
        }

        switch (this.state) {
            case 'IDLE':
                this.updateIdle(dt, player, dist);
                break;
            case 'PATROL':
                this.updatePatrol(dt, player, dist);
                break;
            case 'ALERT':
                this.updateAlert(dt, player, dist);
                break;
            case 'CHASE':
                this.updateChase(dt, player, dist);
                break;
            case 'PREP':
                this.updatePrep(dt, player, dist);
                break;
            case 'ATTACK':
                this.updateAttack(dt, player, dist);
                break;
            case 'STUNNED':
                this.updateStunned(dt);
                break;
            case 'RETURN':
                this.updateReturn(dt);
                break;
        }

        if (this.hp <= 0) this.die();
    }

    updateIdle(dt, player, dist) {
        // Transition: See Player -> ALERT or CHASE
        if (this.canSeePlayer(player) || this.detectAudio(player, dist)) {
            this.state = 'ALERT';
            this.timers.state = 1.0;
            this.showEmote('?');
            return;
        }

        // Transition: Timeout -> PATROL
        if (this.timers.state <= 0) {
            this.state = 'PATROL';
            this.pickRandomPatrolPoint();
            this.timers.state = 5 + Math.random() * 5;
        }

        this.body.velocity.set(0, 0, 0);
    }

    updatePatrol(dt, player, dist) {
        if (this.canSeePlayer(player) || this.detectAudio(player, dist)) {
            this.state = 'ALERT';
            this.timers.state = 1.0;
            this.showEmote('?');
            return;
        }

        // Move to Patrol Point
        const speed = this.speed * 0.5;
        // Use manual distance check to avoid alloc logic if possible in moveTowards
        this.moveTowards(this.patrolPoint, speed);

        // Reached point? (Using CANNON distanceTo for native checks)
        if (this.body.position.distanceTo(this.patrolPoint) < 1.0) {
            this.state = 'IDLE';
            this.timers.state = 2 + Math.random() * 3;
        }
    }

    updateAlert(dt, player, dist) {
        // Face player
        this.lookAt(player.mesh.position);

        if (this.timers.state <= 0) {
            this.state = 'CHASE';
            this.showEmote('!');
            this.alertAllies(10);
        }
    }

    updateChase(dt, player, dist) {
        // 🛡️ Leash Check: Return to spawn if too far
        // Bosses get a huge arena (150m) vs Mobs (40m)
        let leashDist = 40;
        if (this.type === 'BOSS' || this.isBoss) leashDist = 150;

        const distFromSpawn = this.body.position.distanceTo(this.spawnPoint);
        if (this.spawnPoint && distFromSpawn > leashDist) {
            this.state = 'RETURN';
            this.timers.state = 2.0;
            this.isInvulnerable = true;
            this.showEmote('💢');
            return;
        }

        // Ranged Kiting Behavior
        if (this.type === EnemyType.RANGED && dist < 5.0) {
            // RUN AWAY!
            const playerPos = player.body.position;
            // No Alloc Flee Dir
            _tempCanonVec3.set(
                this.body.position.x - playerPos.x,
                0,
                this.body.position.z - playerPos.z
            );
            _tempCanonVec3.normalize();
            this.body.velocity.x = _tempCanonVec3.x * this.speed;
            this.body.velocity.z = _tempCanonVec3.z * this.speed;

            this.lookAt(player.mesh.position);
            return;
        }

        // Standard Chase
        const attackRange = this.config.ai?.attackRange || 2.0;
        if (dist > attackRange) {
            this.moveTowards(player.body.position, this.speed);
        } else {
            // In Range -> PREP (Telegraph)
            if (this.timers.attack <= 0) {
                this.state = 'PREP';
                this.timers.state = 0.5; // 0.5s Telegraph Duration
                this.flashColor(0xFF0000, 500);
            } else {
                // Wait/Strafe
                this.body.velocity.set(0, 0, 0);
                this.lookAt(player.mesh.position);
            }
        }
    }

    updatePrep(dt, player, dist) {
        this.body.velocity.set(0, 0, 0);
        this.lookAt(player.mesh.position);

        if (this.timers.state <= 0) {
            this.state = 'ATTACK';
            this.timers.state = 0.2;
            this.timers.attack = 2.0;
        }
    }

    updateAttack(dt, player, dist) {
        this.body.velocity.set(0, 0, 0);

        if (this.timers.state > 0) {
            // Animating...
        } else {
            // Finish Attack
            const attackRange = this.config.ai?.attackRange || 2.0;
            // console.log(`${this.name} attacks!`);

            // Check Hit
            if (dist <= attackRange * 1.5) {
                if (player.takeDamage) player.takeDamage(this.damageVal);
            }

            this.state = 'CHASE';
        }
    }

    updateReturn(dt) {
        // Run fast to spawn
        const speed = this.speed * 2.0; // Sprint
        this.moveTowards(this.spawnPoint, speed);

        // Rapid Heal
        this.hp = Math.min(this.hp + (this.maxHp * 0.5 * dt), this.maxHp);

        // Strict connection check - IMPROVED
        // Ignore Y axis for distance check to prevent being stuck due to height diffs
        const distSq = (this.body.position.x - this.spawnPoint.x) ** 2 + (this.body.position.z - this.spawnPoint.z) ** 2;

        // Threshold sq: 3.0 * 3.0 = 9.0
        if (distSq < 9.0) {
            this.state = 'IDLE';
            this.hp = this.maxHp;
            this.timers.state = 2.0;
            this.isInvulnerable = false;
            this.showEmote('✅');
            this.body.velocity.set(0, 0, 0); // Stop moving
        }

        // Failsafe: If close enough but Y is wrong, snap? 
        // Or just let the physics handle it. 
        // If we are super close in XZ but stuck, release anyway.
    }

    /**
     * Move physics body towards target - ZERO ALLOCATION
     * @param {CANNON.Vec3} targetPos 
     * @param {number} speed 
     */
    moveTowards(targetPos, speed) {
        // Reuse global cannon vec
        _tempCanonVec3.set(
            targetPos.x - this.body.position.x,
            0,
            targetPos.z - this.body.position.z
        );

        const lenSq = _tempCanonVec3.lengthSquared();
        if (lenSq > 0.01) {
            _tempCanonVec3.normalize();
            this.body.velocity.x = _tempCanonVec3.x * speed;
            this.body.velocity.z = _tempCanonVec3.z * speed;

            // Look At (Yaw only) - Reuse global Quat/Vec3
            const angle = Math.atan2(_tempCanonVec3.x, _tempCanonVec3.z);
            _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle); // Note: Vector3(0,1,0) is static internally in Three usually, but let's be safe. 
            // Actually better to use Object3D.lookAt manually if we want 0 alloc, but slerp needs quat.
            this.mesh.quaternion.slerp(_tempQuat, 0.1);
            this.body.quaternion.copy(this.mesh.quaternion);
        }
    }

    /**
     * Rotate mesh towards target - ZERO ALLOCATION
     * @param {THREE.Vector3} targetPos 
     */
    lookAt(targetPos) {
        const dx = targetPos.x - this.body.position.x;
        const dz = targetPos.z - this.body.position.z;
        const angle = Math.atan2(dx, dz);

        _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.mesh.quaternion.slerp(_tempQuat, 0.1);
        this.body.quaternion.copy(this.mesh.quaternion);
    }

    pickRandomPatrolPoint() {
        const radius = 10;
        const theta = Math.random() * Math.PI * 2;
        this.patrolPoint.set(
            this.spawnPoint.x + Math.sin(theta) * radius,
            this.spawnPoint.y,
            this.spawnPoint.z + Math.cos(theta) * radius
        );
    }

    showEmote(symbol) {
        // TODO implementation
    }

    updateStunned(dt) {
        if (this.timers.stun <= 0) {
            this.state = 'CHASE';
        } else {
            this.timers.stun -= dt;
            this.body.velocity.set(0, 0, 0);
        }
    }

    flashColor(hex, duration = 100) {
        if (!this.mesh) return;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                if (mat && mat.color) {
                    if (mat.userData.oldColor === undefined) mat.userData.oldColor = mat.color.getHex();
                    mat.color.setHex(hex);
                    setTimeout(() => {
                        if (mat.userData.oldColor !== undefined) mat.color.setHex(mat.userData.oldColor);
                    }, duration);
                }
            }
        });
    }

    alertAllies(range) {
        if (!this.world.enemies) return;

        const rangeSq = range * range; // Optimize

        for (const ally of this.world.enemies) {
            if (ally === this || ally.state === 'CHASE' || ally.state === 'RETURN' || ally.isDead) continue;

            const distSq = this.body.position.distanceSquared(ally.body.position);
            if (distSq < rangeSq) {
                ally.state = 'ALERT';
                ally.timers.state = 0.5;
                ally.showEmote('!');
            }
        }
    }

    detectAudio(player, dist) {
        if (dist > 15) return false;

        let noiseLevel = 0;
        // CANNON length() is fine, checking speed
        const speed = player.body.velocity.length();
        if (speed > 8) noiseLevel = 1.0;
        else if (speed > 2) noiseLevel = 0.3;

        if (player.isAttacking) noiseLevel = 1.0;

        if (noiseLevel > 0.5) {
            return true;
        }
        return false;
    }

    takeDamage(amount, element, isWeakPoint) {
        console.log(`[Enemy] ${this.name} taking damage: ${amount}. Invuln: ${this.isInvulnerable}`);
        if (this.isInvulnerable) {
            this.game.ui.showToast("Immunisé !", "info");
            return;
        }

        let finalDamage = amount;

        // --- CHEMISTRY REACTION ---
        // element is the Attack Element (Trigger)
        // this.element is the Enemy Element (Aura)
        if (element && element !== Elements.NONE) {

            // 1. Check for Reaction
            const reaction = Chemistry.getReaction(element, this.element);

            if (reaction) {
                // Apply Multiplier
                if (reaction.multiplier) {
                    finalDamage *= reaction.multiplier;
                    // Show Text: "MELT (x2.0)"
                    if (this.game.combatUI && this.mesh) {
                        this.game.combatUI.showDamage(this.mesh.position, `${reaction.type} x${reaction.multiplier}`, true); // True for Critical/Special style
                    }
                } else if (reaction.damage) {
                    // Transform (Overload, etc) - Extra Flat Damage
                    finalDamage += reaction.damage; // Add flat damage to hit
                    if (this.game.combatUI && this.mesh) {
                        this.game.combatUI.showDamage(this.mesh.position, reaction.type, true);
                    }
                } else {
                    // Other effects (Freeze)
                    if (this.game.combatUI && this.mesh) {
                        this.game.combatUI.showDamage(this.mesh.position, reaction.type, true);
                    }
                }

                // Side Effects
                if (reaction.type === 'FROZEN') {
                    // TODO: Implement Freeze logic (pause AI)
                }

            }
        }

        this.hp -= finalDamage;

        // 💫 Hit Stun Logic
        if (this.state === 'ATTACK' || this.state === 'PREP' || this.state === 'CHASE') {
            if (this.type !== 'BOSS' && !this.isBoss) { // Bosses resist stun usually
                this.state = 'STUNNED';
                this.timers.stun = 0.5;
            }
        }

        // --- VFX ---
        if (this.game.combatUI && this.mesh) {
            this.game.combatUI.showDamage(this.mesh.position, finalDamage, isWeakPoint);
        }

        if (this.game.particles && this.mesh) {
            let pType = 'blood';
            if (this.type === 'TANK' || this.type === 'CONSTRUCT') pType = 'metal';
            else if (this.config.id.includes('slime')) pType = 'slime';
            this.game.particles.emit(this.mesh.position, pType, 5);
        }

        this.flashColor(0xFFFFFF, 100);

        if (this.hp <= 0) this.die();
    }

    die() {
        if (this.game.player) {
            this.game.player.gainExp(this.expReward);
        }

        if (this.game.story) {
            this.game.story.notify('KILL_ENEMY', this.config.id || this.name);
        }

        // QUEST PROGRESSION
        if (this.game.questManager) {
            // Notify generic kill
            this.game.questManager.checkQuestProgress('KILL_ENEMY', { enemyId: this.config.id });

            // Notify boss kill if applicable
            if (this.type === EnemyType.ELITE || this.type === EnemyType.BOSS || this.config.visuals?.isBoss) {
                this.game.questManager.checkQuestProgress('KILL_BOSS', { enemyId: this.config.id });
            }
        }

        // Loot
        if (this.game.lootManager) {
            const drops = this.game.lootManager.rollLoot(this);
            if (drops.length > 0) {
                this.game.lootManager.spawnLoot(this.mesh.position, drops);
            }
        }

        // POOL DESPAWN
        if (this.world.poolManager) {
            this.world.poolManager.despawn(this);
        } else {
            // Fallback Legacy Destroy
            this.world.scene.remove(this.mesh);
            this.world.physicsWorld.removeBody(this.body);
        }
    }
}
