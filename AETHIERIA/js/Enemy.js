// js/Enemy.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Chemistry, Elements } from './Chemistry.js';
import { EnemiesDb, EnemyType, BehaviorType } from './data/EnemiesDb.js';

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
        this.config = config || EnemiesDb.find(e => e.id === 'slime_green') || EnemiesDb[0]; // Fallback to Blob

        this.name = this.config.name;
        this.id = this.config.id;
        this.type = this.config.type;
        this.behavior = this.config.behavior || BehaviorType.PATROL;

        this.hp = this.config.stats.hp;
        this.maxHp = this.config.stats.hp;
        this.speed = this.config.stats.speed;
        this.damageVal = this.config.stats.damage;
        this.expReward = this.config.stats.exp || 10; // Default 10 XP

        // Element (Legacy support, though arguably redundancy)
        this.element = Elements.NONE;

        // State Machine
        this.state = 'IDLE'; // IDLE, PATROL, ALERT, CHASE, ATTACK, RETURN
        this.timers = {
            state: 0,
            attack: 0,
            path: 0
        };

        this.spawnPoint = position.clone();
        this.patrolPoint = position.clone();

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
                // Fallback if factory missing (should not happen)
                const geo = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x880000 });
                this.mesh = new THREE.Mesh(geo, mat);
            }
            this.height = this.config.visuals.scale || 1.0;
        }

        // Snap to Ground
        if (this.world.getGroundHeight) {
            const groundY = this.world.getGroundHeight(position.x, position.z);
            if (groundY !== null) {
                position.y = groundY + (this.height / 2) + 0.1;
            }
        }

        this.mesh.position.copy(position);
        this.world.scene.add(this.mesh);

        // --- PHYSICS ---
        // Scale physics body to match visual scale roughly
        const halfExtents = new CANNON.Vec3(0.5 * (this.config.visuals.scale || 1), 0.5 * (this.config.visuals.scale || 1), 0.5 * (this.config.visuals.scale || 1));
        const shape = new CANNON.Box(halfExtents);
        this.body = new CANNON.Body({
            mass: 5 * (this.config.visuals.scale || 1), // Heavier if bigger
            position: new CANNON.Vec3(position.x, position.y, position.z),
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.linearDamping = 0.5; // Walking damping
        this.world.physicsWorld.addBody(this.body);

        // --- UI ---
        if (this.game.combatUI) {
            this.hpBar = this.game.combatUI.createHealthBar(this);
        }
    }

    createProceduralMesh(config) {
        const color = config.visuals.color || 0xff0000;
        const scale = config.visuals.scale || 1.0;
        const model = config.visuals.model || 'BOX';

        let geo, mat;
        if (model === 'BLOB') {
            geo = new THREE.SphereGeometry(0.5, 16, 16);
            geo.translate(0, -0.2, 0); // Flatten bottom roughly
            geo.scale(1, 0.6, 1);
        } else if (model === 'CONSTRUCT') {
            geo = new THREE.BoxGeometry(0.8, 1.2, 0.6); // Bulky
        } else {
            geo = new THREE.BoxGeometry(0.5, 1.0, 0.5); // Humanoid
        }

        mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.setScalar(scale);

        // Golem Special: Glowing Eyes
        if (config.visuals.glow) {
            const eyeGeo = new THREE.BoxGeometry(0.1, 0.05, 0.05);
            const eyeMat = new THREE.MeshBasicMaterial({ color: config.visuals.glow });
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-0.15, 0.3, 0.25);
            rightEye.position.set(0.15, 0.3, 0.25);
            mesh.add(leftEye);
            mesh.add(rightEye);
        }

        // Equipment (Visual Only for now)
        if (config.visuals.equipment) {
            if (config.visuals.equipment.leftHand === 'shield_wood') {
                const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
                shield.rotation.x = Math.PI / 2;
                shield.position.set(0.35, 0, 0.3);
                mesh.add(shield);
            }
        }

        return mesh;
    }

    /**
     * Dot Product Vision Check
     */
    canSeePlayer(player) {
        if (!player || !player.mesh) return false;

        const dist = this.body.position.distanceTo(player.body.position);
        if (dist > this.config.stats.detectionRadius) return false;

        // Vector to player
        const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position).normalize();

        // My Forward vector
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();

        // Dot Product: 1.0 = Direct front, 0.0 = Side, -1.0 = Behind
        const dot = forward.dot(toPlayer);

        // 60 Degrees cone approx 0.5 dot
        if (dot > 0.5) {
            // TODO: Raycast check for walls? For now assume line of sight in open field.
            return true;
        }

        return false;
    }

    update(dt, playerPosition) {
        if (this.state === 'DUMMY') return; // Debug Dummy
        if (!this.world.game.player) return;

        // Sync Physics
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y += this.VISUAL_OFFSET_Y;
        this.mesh.quaternion.copy(this.body.quaternion);

        // State Machine
        this.timers.state -= dt;
        this.timers.attack -= dt;

        const player = this.world.game.player;
        const distToPlayer = this.body.position.distanceTo(player.body.position);

        switch (this.state) {
            case 'IDLE':
                this.updateIdle(dt, player, distToPlayer);
                break;
            case 'PATROL':
                this.updatePatrol(dt, player, distToPlayer);
                break;
            case 'ALERT':
                this.updateAlert(dt, player, distToPlayer);
                break;
            case 'CHASE':
                this.updateChase(dt, player, distToPlayer);
                break;
            case 'ATTACK':
                this.updateAttack(dt, player, distToPlayer);
                break;
            case 'RETURN':
                this.updateReturn(dt, player, distToPlayer);
                break;
        }

        if (this.hp <= 0) this.die();
    }

    updateIdle(dt, player, dist) {
        // Transition: See Player -> ALERT or CHASE
        if (this.canSeePlayer(player) || this.detectAudio(player, dist)) {
            this.state = 'ALERT';
            this.timers.state = 1.0; // 1s Alert delay
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
        const speed = this.speed * 0.5; // Half speed for patrol
        this.moveTowards(this.patrolPoint, speed);

        // Reached point?
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
            this.alertAllies(10); // Group behaviors
        }
    }

    updateChase(dt, player, dist) {
        // Leash Check: Return to spawn if too far
        if (this.body.position.distanceTo(this.spawnPoint) > 40) {
            this.state = 'RETURN';
            this.timers.state = 5.0; // Heal
            return;
        }

        // Ranged Kiting Behavior
        if (this.type === EnemyType.RANGED && dist < 5.0) {
            // RUN AWAY!
            const away = new CANNON.Vec3().subVectors(this.body.position, player.body.position);
            away.y = 0; // Dont fly
            away.normalize();
            this.body.velocity.x = away.x * this.speed;
            this.body.velocity.z = away.z * this.speed;
            this.lookAt(player.mesh.position); // Look at threat while backing up
            return;
        }

        // Standard Chase
        if (dist > this.config.stats.attackRange) {
            this.moveTowards(player.body.position, this.speed);
        } else {
            // In Range -> ATTACK
            if (this.timers.attack <= 0) {
                this.state = 'ATTACK';
                this.timers.state = 0.5; // Windup
            } else {
                // Wait/Strafe
                this.body.velocity.set(0, 0, 0);
                this.lookAt(player.mesh.position);
            }
        }
    }

    updateAttack(dt, player, dist) {
        // 1. Windup (timers.state > 0)
        // 2. Strike (transition)
        // 3. Cooldown

        this.body.velocity.set(0, 0, 0);
        this.lookAt(player.mesh.position);

        if (this.timers.state > 0) {
            // Telegraph visual
            if (!this.telegraphMesh) {
                const geo = new THREE.CircleGeometry(this.config.stats.attackRange * 0.8, 32);
                const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                this.telegraphMesh = new THREE.Mesh(geo, mat);
                this.telegraphMesh.rotation.x = -Math.PI / 2;
                this.telegraphMesh.position.y = 0.1;
                this.mesh.add(this.telegraphMesh); // Attach to enemy or world? 
                // Enemy moves, telegraph usually follows or stays?
                // For simplicity, attach to enemy (frontal cone/area).
                this.telegraphMesh.position.z = this.config.stats.attackRange * 0.5;
            }
            // Pulse opacity?
            this.telegraphMesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.02) * 0.2;

        } else {
            // DO ATTACK
            if (this.telegraphMesh) {
                this.telegraphMesh.geometry.dispose();
                this.telegraphMesh.material.dispose();
                this.mesh.remove(this.telegraphMesh);
                this.telegraphMesh = null;
            }

            console.log(`${this.name} attacks!`);

            // Check Hit (Cone/Area)
            // Just distance for now
            if (dist <= this.config.stats.attackRange * 1.5) {
                if (player.takeDamage) player.takeDamage(this.damageVal);
            }

            this.state = 'CHASE'; // Back to Engage
            this.timers.attack = 2.0; // 2s Cooldown
        }
    }

    moveTowards(targetPos, speed) {
        const dir = new CANNON.Vec3().subVectors(targetPos, this.body.position);
        dir.y = 0;
        if (dir.length() > 0.1) {
            dir.normalize();
            this.body.velocity.x = dir.x * speed;
            this.body.velocity.z = dir.z * speed;

            // Look At (Yaw only)
            const angle = Math.atan2(dir.x, dir.z);
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            this.mesh.quaternion.slerp(q, 0.1);
            this.body.quaternion.copy(this.mesh.quaternion); // Sync physics rot
        }
    }

    lookAt(targetPos) {
        const dx = targetPos.x - this.body.position.x;
        const dz = targetPos.z - this.body.position.z;
        const angle = Math.atan2(dx, dz);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.mesh.quaternion.slerp(q, 0.1);
        this.body.quaternion.copy(this.mesh.quaternion);
    }

    pickRandomPatrolPoint() {
        // Random point within 10m of spawn
        const radius = 10;
        const theta = Math.random() * Math.PI * 2;
        this.patrolPoint.set(
            this.spawnPoint.x + Math.sin(theta) * radius,
            this.spawnPoint.y,
            this.spawnPoint.z + Math.cos(theta) * radius
        );
    }

    showEmote(symbol) {
        // TODO: Floating UI above head
        // console.log(`[${this.name}] Emote: ${symbol}`);
    }

    takeDamage(amount, element, isWeakPoint) {
        // Shield Logic (Orc)
        if (this.config.id === 'orc_warrior' && this.world.game.player) {
            const player = this.world.game.player;
            const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position).normalize();
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();
            if (forward.dot(toPlayer) > 0.5) { // Facing player
                console.log("BLOCKED!");
                amount *= 0.2; // 80% Reduction
                // Play clang sound?
            }
        }

        const finalDamage = amount; // Simplified for now
        this.hp -= finalDamage;

        // --- VFX: Damage Numbers ---
        if (this.game.combatUI && this.mesh) {
            this.game.combatUI.showDamage(this.mesh.position, finalDamage, isWeakPoint);
        }

        // --- VFX: Particles ---
        if (this.game.particles && this.mesh) {
            let pType = 'blood';
            if (this.type === 'TANK' || this.type === 'CONSTRUCT') pType = 'metal';
            else if (this.config.id.includes('slime')) pType = 'slime';
            this.game.particles.emit(this.mesh.position, pType, 5);
        }

        // Reaction
        if (this.state === 'IDLE' || this.state === 'PATROL') {
            this.state = 'ALERT';
            this.timers.state = 0.0; // Instant alert
        }

        // Flash Red visual (Group Compatible)
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (mat && mat.color) {
                        if (!mat.userData.oldColor) mat.userData.oldColor = mat.color.getHex();
                        mat.color.setHex(0xffffff);
                        setTimeout(() => { if (mat.userData.oldColor !== undefined) mat.color.setHex(mat.userData.oldColor); }, 100);
                    }
                }
            });
        }

        if (this.hp <= 0) this.die();
    }

    die() {
        console.log("Enemy Defeated!", this.name);

        // Grant XP
        if (this.game.player) {
            this.game.player.gainExp(this.expReward);
        }

        // Notify Story
        if (this.game.story) {
            this.game.story.notify('KILL_ENEMY', this.config.id || this.name); // Prefer ID
        }

        this.world.scene.remove(this.mesh);
        this.world.physicsWorld.removeBody(this.body);

        // Remove from array? World does this usually
        // Use flag
        this.isDead = true;

        // New Loot Logic
        if (this.game.lootManager) {
            const drops = this.game.lootManager.rollLoot(this);
            if (drops.length > 0) {
                this.game.lootManager.spawnLoot(this.mesh.position, drops);
            }
        }
    }

    // Legacy support for manual calls (Debug)
    applyKnockback(dir, force) {
        this.body.velocity.x += dir.x * force;
        this.body.velocity.z += dir.z * force;
        this.body.velocity.y += 5;
    }

    // --- NEW BEHAVIORS ---

    updateReturn(dt, player, dist) {
        // Run fast to spawn
        const speed = this.speed * 2.0; // Sprint
        this.moveTowards(this.spawnPoint, speed);

        // Invincible logic should be checked in takeDamage
        this.hp = Math.min(this.hp + (this.maxHp * 0.1 * dt), this.maxHp); // 10% HP/sec

        if (this.body.position.distanceTo(this.spawnPoint) < 1.0) {
            this.state = 'IDLE';
            this.hp = this.maxHp;
            this.timers.state = 2.0;
        }
    }

    alertAllies(range) {
        if (!this.world.enemies) return;

        for (const ally of this.world.enemies) {
            if (ally === this || ally.state === 'CHASE' || ally.state === 'RETURN' || ally.isDead) continue;

            const dist = this.body.position.distanceTo(ally.body.position);
            if (dist < range) {
                ally.state = 'ALERT';
                ally.timers.state = 0.5;
                ally.showEmote('!');
            }
        }
    }

    detectAudio(player, dist) {
        // Simple noise mechanics
        if (dist > 15) return false;

        let noiseLevel = 0;
        const speed = player.body.velocity.length();
        if (speed > 8) noiseLevel = 1.0; // Sprinting
        else if (speed > 2) noiseLevel = 0.3; // Walking

        if (player.isAttacking) noiseLevel = 1.0;

        if (noiseLevel > 0.5) {
            return true;
        }
        return false;
    }
}
