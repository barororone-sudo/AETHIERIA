
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Switch {
    constructor(game, world, position, target) {
        this.game = game;
        this.world = world;
        this.position = position;
        this.target = target; // Component with .unlock()
        this.isPressed = false;

        this.initVisuals();
        this.initPhysics();
    }

    initVisuals() {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        // Frame
        const frameGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.2, 8);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        this.frame = new THREE.Mesh(frameGeo, frameMat);
        this.frame.position.y = 0.1;
        this.mesh.add(this.frame);

        // Button
        const btnGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 8);
        this.btnMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0x330000 });
        this.button = new THREE.Mesh(btnGeo, this.btnMat);
        this.button.position.y = 0.25;
        this.mesh.add(this.button);

        this.world.scene.add(this.mesh);

        // Link for interactables
        if (this.world.interactables) {
            this.world.interactables.push(this);
        }
    }

    initPhysics() {
        // Trigger
        const shape = new CANNON.Cylinder(1.2, 1.2, 0.5, 8);
        this.body = new CANNON.Body({ isTrigger: true });
        this.body.addShape(shape);
        this.body.position.copy(this.position);
        this.body.position.y += 0.25;

        // Listen for collisions
        this.body.addEventListener('collide', (e) => {
            if (this.isPressed) return;

            // Check if player
            // Note: e.body is the OTHER body. 
            // We need to check if e.body belongs to player. 
            // Safe check: assume only player triggers for now or check userData
            if (e.body === this.game.player.body) {
                this.press();
            }
        });

        this.world.physicsWorld.addBody(this.body);
    }

    update(dt) {
        // Fallback radius check if physics trigger fails
        if (!this.isPressed && this.game.player) {
            const dist = this.game.player.mesh.position.distanceTo(this.mesh.position);
            if (dist < 1.5) {
                this.press();
            }
        }
    }

    press() {
        if (this.isPressed) return;
        this.isPressed = true;

        console.log("Switch Pressed!");

        // Visual
        this.button.position.y = 0.15; // Press down
        this.btnMat.color.setHex(0x00FF00);
        this.btnMat.emissive.setHex(0x002200);

        // Sound
        // this.game.audio.play('click');

        // Action
        if (this.target && this.target.unlock) {
            this.target.unlock();
            this.game.ui.showToast("Mécanisme activé !", 'success');
        }
    }
}
