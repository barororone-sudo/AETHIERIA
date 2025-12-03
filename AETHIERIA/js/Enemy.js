// js/Enemy.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Chemistry, Elements } from './Chemistry.js';

export class Enemy {
    constructor(world, position, element = null, mesh = null) {
        this.world = world;
        this.hp = 100;
        this.maxHp = 100;
        this.element = element;
        this.isFrozen = false;
        this.VISUAL_OFFSET_Y = 0.5;

        // Visuals
        if (mesh) {
            this.mesh = mesh;
            this.height = 1.0; // Default approximation
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0x880000 });
            this.mesh = new THREE.Mesh(geo, mat);
            this.height = 1.0;
        }

        // Snap to Ground (Feet Positioning)
        if (this.world.getGroundHeight) {
            const groundY = this.world.getGroundHeight(position.x, position.z);
            if (groundY !== null) {
                // Position Y = Ground + HalfHeight + Safety
                const targetY = groundY + (this.height / 2) + 0.1;
                position.y = targetY;
            }
        }

        this.mesh.position.copy(position);
        this.world.scene.add(this.mesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.body.addShape(shape);
        this.world.physicsWorld.addBody(this.body);

        // AI
        this.state = 'PATROL';
        this.patrolPoint = position.clone();
    }

    update(dt, playerPosition) {
        if (!playerPosition) return;
        if (this.isFrozen) return;

        this.mesh.position.copy(this.body.position);
        this.mesh.position.y += this.VISUAL_OFFSET_Y;
        this.mesh.quaternion.copy(this.body.quaternion);

        // Ensure playerPosition is a CANNON.Vec3
        let targetPos = playerPosition;
        if (!targetPos.vsub) {
            // Convert THREE.Vector3 to CANNON.Vec3 if necessary
            targetPos = new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z);
        }

        // AI Logic
        const dist = this.body.position.distanceTo(targetPos);

        if (dist < 10) {
            this.state = 'CHASE';
        } else {
            this.state = 'PATROL';
        }

        if (this.state === 'CHASE') {
            const dir = new CANNON.Vec3();
            targetPos.vsub(this.body.position, dir);
            const distanceToPlayer = dir.length();
            dir.normalize();

            // Circling Logic
            // We want to maintain a distance of ~5 units
            // If too far, approach. If too close, back up.
            // Always add a perpendicular component to circle.

            const idealDist = 5.0;
            const approachWeight = (distanceToPlayer - idealDist) * 0.5; // Positive = approach, Negative = retreat

            // Perpendicular vector (Cross product with Up)
            const circleDir = new CANNON.Vec3(dir.z, 0, -dir.x); // Simple 2D perp

            // Randomize circling direction occasionally
            if (!this.circleDirSign) this.circleDirSign = Math.random() > 0.5 ? 1 : -1;
            // Change direction rarely
            if (Math.random() < 0.005) this.circleDirSign *= -1;

            const finalDir = new CANNON.Vec3();
            finalDir.x = dir.x * approachWeight + circleDir.x * this.circleDirSign;
            finalDir.z = dir.z * approachWeight + circleDir.z * this.circleDirSign;

            // Normalize and apply speed
            if (finalDir.length() > 0.1) {
                finalDir.normalize();
                this.body.velocity.x = finalDir.x * 3; // Slightly faster
                this.body.velocity.z = finalDir.z * 3;
            }

            // Attack Player
            if (distanceToPlayer < 3.0) {
                // Simple cooldown check could be added here
                if (Math.random() < 0.02) { // Lower chance per frame, but consistent
                    console.log("Enemy Attacking!");
                    // Lunge
                    const lunge = dir.scale(10);
                    this.body.velocity.x += lunge.x;
                    this.body.velocity.z += lunge.z;

                    this.world.game.player.takeDamage(10);
                }
            }
        }
    }

    takeDamage(amount, element, isWeakPoint) {
        // Chemistry
        const reaction = Chemistry.applyElement(this, element, this.world);
        let multiplier = 1.0;

        if (reaction && reaction.multiplier) {
            multiplier = reaction.multiplier;
        }

        if (isWeakPoint) multiplier *= 2.0;

        const finalDamage = amount * multiplier;
        this.hp -= finalDamage;
        console.log(`Enemy took ${finalDamage} damage! HP: ${this.hp}`);

        // Visual Feedback
        const flashColor = (colorHex) => {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (mat && mat.emissive) {
                        // Store original if not stored
                        if (!mat.userData.origColor) mat.userData.origColor = mat.color.getHex();
                        mat.color.setHex(colorHex);
                    } else if (mat && mat.color) {
                        if (!mat.userData.origColor) mat.userData.origColor = mat.color.getHex();
                        mat.color.setHex(colorHex);
                    }
                }
            });
        };

        flashColor(0xffffff);
        setTimeout(() => {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (mat && mat.userData.origColor !== undefined) {
                        mat.color.setHex(mat.userData.origColor);
                    }
                }
            });
        }, 100);

        // Juiciness
        const isCritical = multiplier > 1.0;
        this.world.game.ui.showDamage(this.mesh.position, finalDamage, isCritical);

        if (isCritical) {
            this.world.game.player.hitStop(0.1);
            this.world.game.player.screenShake(0.5, 0.2);
        } else {
            this.world.game.player.screenShake(0.2, 0.1);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Enemy Defeated!");
        this.world.scene.remove(this.mesh);
        this.world.physicsWorld.removeBody(this.body);
        // Remove from world list (handled in World.js usually)
        this.isDead = true;

        // Spawn Loot
        this.world.spawnLoot(this.mesh.position);
    }
}
