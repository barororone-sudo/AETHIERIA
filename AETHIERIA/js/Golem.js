// js/Golem.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Chemistry, Elements } from './Chemistry.js';

export class Golem {
    constructor(world, position) {
        this.world = world;
        this.hp = 1000;
        this.maxHp = 1000;
        this.element = Elements.GEO;
        this.isDead = false;
        this.name = "Ancient Golem";

        // Physics Body (Main Collider)
        const shape = new CANNON.Box(new CANNON.Vec3(1.5, 2.5, 1.5));
        this.body = new CANNON.Body({
            mass: 50, // Heavy
            position: new CANNON.Vec3(position.x, position.y + 3, position.z),
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.world.physicsWorld.addBody(this.body);

        // Visuals (Group)
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        this.world.scene.add(this.mesh);

        this.initVisuals();

        // AI State
        this.state = 'IDLE'; // IDLE, CHASE, ATTACK, STUNNED
        this.attackTimer = 0;
    }

    initVisuals() {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.5 });

        // Torso
        const torsoGeo = new THREE.BoxGeometry(2, 2.5, 1.5);
        this.torso = new THREE.Mesh(torsoGeo, stoneMat);
        this.torso.position.y = 0;
        this.mesh.add(this.torso);

        // Head
        const headGeo = new THREE.BoxGeometry(1, 1, 1);
        this.head = new THREE.Mesh(headGeo, stoneMat);
        this.head.position.y = 1.75;
        this.mesh.add(this.head);

        // Weak Point (Crystal on Chest)
        const weakPointGeo = new THREE.OctahedronGeometry(0.4);
        this.weakPoint = new THREE.Mesh(weakPointGeo, crystalMat);
        this.weakPoint.position.set(0, 0, 0.8); // Front of chest
        this.weakPoint.userData = { isWeakPoint: true, parent: this };
        this.torso.add(this.weakPoint);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
        this.leftArm = new THREE.Mesh(armGeo, stoneMat);
        this.leftArm.position.set(-1.6, 0, 0);
        this.mesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, stoneMat);
        this.rightArm.position.set(1.6, 0, 0);
        this.mesh.add(this.rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.9, 2.0, 0.9);
        this.leftLeg = new THREE.Mesh(legGeo, stoneMat);
        this.leftLeg.position.set(-0.8, -2.25, 0);
        this.mesh.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, stoneMat);
        this.rightLeg.position.set(0.8, -2.25, 0);
        this.mesh.add(this.rightLeg);
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Sync Physics
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        if (!playerPosition) return;

        // Ensure playerPosition is a CANNON.Vec3
        let targetPos = playerPosition;
        if (!targetPos.vsub) {
            targetPos = new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z);
        }

        const dist = this.body.position.distanceTo(targetPos);

        // AI Logic
        if (this.state === 'IDLE') {
            if (dist < 20) this.state = 'CHASE';
        } else if (this.state === 'CHASE') {
            // Arena Constraint
            const arenaCenter = new CANNON.Vec3(0, 0, -40);
            const distToArena = this.body.position.distanceTo(arenaCenter);

            if (distToArena > 30) {
                // Return to center
                const dx = arenaCenter.x - this.body.position.x;
                const dz = arenaCenter.z - this.body.position.z;
                const angle = Math.atan2(dx, dz);
                this.mesh.rotation.y = angle;

                const dir = new CANNON.Vec3(dx, 0, dz);
                dir.normalize();
                this.body.velocity.x = dir.x * 5; // Run back
                this.body.velocity.z = dir.z * 5;
                return; // Ignore player until back in arena
            }

            // Rotate towards player
            const dx = targetPos.x - this.body.position.x;
            const dz = targetPos.z - this.body.position.z;
            const angle = Math.atan2(dx, dz);
            this.mesh.rotation.y = angle; // Visual rotation

            // Move
            if (dist > 5) {
                const dir = new CANNON.Vec3(dx, 0, dz);
                dir.normalize();
                this.body.velocity.x = dir.x * 3; // Slow but heavy
                this.body.velocity.z = dir.z * 3;
            } else {
                this.state = 'ATTACK';
                this.attackTimer = 0;
                this.body.velocity.x = 0;
                this.body.velocity.z = 0;
            }
        } else if (this.state === 'ATTACK') {
            this.attackTimer += dt;

            // Simple Attack Animation (Raise Arms)
            if (this.attackTimer < 1.0) {
                this.rightArm.rotation.x = -Math.PI; // Raise
            } else if (this.attackTimer < 1.5) {
                this.rightArm.rotation.x = 0; // Smash
                // Logic for damage area would go here
            } else {
                this.state = 'CHASE'; // Reset
            }
        }
    }

    takeDamage(amount, element, isWeakPoint = false) {
        let finalDamage = amount;

        if (isWeakPoint) {
            finalDamage *= 3; // Critical Hit
            console.log("CRITICAL HIT on Golem Weak Point!");
            // Visual Flash
            this.weakPoint.material.emissiveIntensity = 2.0;
            setTimeout(() => this.weakPoint.material.emissiveIntensity = 0.5, 200);
        } else {
            finalDamage *= 0.5; // Armor reduction
        }

        // Chemistry
        const reaction = Chemistry.applyElement(this, element, this.world);
        if (reaction && reaction.multiplier) {
            finalDamage *= reaction.multiplier;
        }

        this.hp -= finalDamage;
        console.log(`Golem took ${finalDamage} damage. HP: ${this.hp}`);

        // Update UI (Boss Bar)
        if (this.world.game && this.world.game.ui) {
            this.world.game.ui.updateBossBar(this.hp, this.maxHp, this.name);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Golem Defeated!");
        this.isDead = true;
        this.world.scene.remove(this.mesh);
        this.world.physicsWorld.removeBody(this.body);
        if (this.world.game && this.world.game.ui) {
            this.world.game.ui.hideBossBar();
        }
    }
}
