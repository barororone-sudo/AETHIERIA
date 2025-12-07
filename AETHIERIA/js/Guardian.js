import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy.js';
import { Elements } from './Chemistry.js';

export class Guardian extends Enemy {
    constructor(world, position) {
        super(world, position);
        this.maxHp = 500;
        this.hp = 500;
        this.name = "Guardian";
        this.hitRadius = 3.0; // Large hitbox for large enemy

        // Stagger System
        this.stagger = 0;
        this.maxStagger = 100;
        this.isStaggered = false;

        // Visuals (Giant Black Cube with Red Aura)
        this.world.scene.remove(this.mesh); // Remove default enemy mesh

        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.8
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
        this.world.scene.add(this.mesh);

        // Glowing Eye
        const eyeGeo = new THREE.SphereGeometry(0.5);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        this.eye = new THREE.Mesh(eyeGeo, eyeMat);
        this.eye.position.set(0, 0, 2); // Front face
        this.mesh.add(this.eye);

        // Physics
        this.world.physicsWorld.removeBody(this.body);
        const shape = new CANNON.Box(new CANNON.Vec3(2, 2, 2));
        this.body = new CANNON.Body({
            mass: 50,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.world.physicsWorld.addBody(this.body);

        // Stagger Bar UI (World Space)
        this.createStaggerBar();
    }

    createStaggerBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 10;
        this.staggerCtx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        this.staggerSprite = new THREE.Sprite(spriteMat);
        this.staggerSprite.scale.set(4, 0.4, 1);
        this.staggerSprite.position.y = 3.5;
        this.mesh.add(this.staggerSprite);

        this.updateStaggerUI();
    }

    updateStaggerUI() {
        const ctx = this.staggerCtx;
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 100, 10);

        const pct = (this.stagger / this.maxStagger) * 100;
        ctx.fillStyle = '#FFFF00'; // Yellow for stagger
        ctx.fillRect(0, 0, pct, 10);

        this.staggerSprite.material.map.needsUpdate = true;
    }

    takeDamage(amount, element, isWeakPoint) {
        if (this.isStaggered) {
            amount *= 2.0; // Double damage when staggered
            isWeakPoint = true; // Auto crit
        }

        super.takeDamage(amount, element, isWeakPoint);

        // Add Stagger
        if (!this.isStaggered) {
            this.stagger += amount * 2; // Damage adds to stagger
            if (this.stagger >= this.maxStagger) {
                this.enterStaggerState();
            }
            this.updateStaggerUI();
        }

        // Direct UI Update
        if (this.game && this.game.ui && this.hp > 0) {
            this.game.ui.updateBossBar(this.hp, this.maxHp, "Gardien Ancestral");
        }
    }

    enterStaggerState() {
        this.isStaggered = true;
        this.stagger = this.maxStagger;
        this.eye.material.color.setHex(0x555555); // Eye goes dim

        console.log("Guardian Staggered!");
        this.world.game.ui.showToast("Guardian Staggered!");

        // "Ragdoll" - Tilt over
        // Since we use fixedRotation, we can't just let physics do it easily without changing body settings.
        // Let's just animate the mesh for visual feedback
        this.mesh.rotation.z = 0.5;

        setTimeout(() => {
            this.recoverFromStagger();
        }, 5000); // 5s stun
    }

    recoverFromStagger() {
        this.isStaggered = false;
        this.stagger = 0;
        this.eye.material.color.setHex(0xFF0000);
        this.mesh.rotation.z = 0;
        this.updateStaggerUI();
    }

    die() {
        console.log("Guardian Defeated!");
        if (this.game.ui) this.game.ui.hideBossBar();
        this.game.story.notify('KILL_ENEMY', 'guardian_golem');
        super.die();
    }

    update(dt, playerPosition) {
        // Fallback: If fell through world, respawn up
        if (this.body.position.y < -10) {
            this.body.position.set(0, 10, -40);
            this.body.velocity.set(0, 0, 0);
            console.warn("Guardian fell through world. Resetting position.");
        }

        super.update(dt, playerPosition);

        // Re-apply Stagger Rotation (override super.update's sync)
        if (this.isStaggered) {
            this.mesh.rotation.z = 0.5;
            this.eye.material.color.setHex(0x555555);
        } else {
            // Normal Eye Tracking (if not staggered)
            if (playerPosition) {
                this.eye.lookAt(playerPosition);
            }
        }

        // Stagger decay
        if (this.stagger > 0) {
            this.stagger -= 5 * dt;
            this.updateStaggerUI();
        }
    }
}
