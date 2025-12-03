// js/NPC.js
import * as THREE from 'three';

export class NPC {
    constructor(game, world, position, dialogueData) {
        this.game = game;
        this.world = world;
        this.position = position;
        this.dialogueData = dialogueData;
        this.name = "Ancien";
        this.interactionRadius = 3.0;

        this.initVisuals();
    }

    initVisuals() {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        // Simple Anime Style NPC (Robed Figure)
        const mat = new THREE.MeshToonMaterial({ color: 0x888888 }); // Grey Robe
        const skinMat = new THREE.MeshToonMaterial({ color: 0xFFE0BD });

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.6, 8);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.8;
        this.mesh.add(body);

        this.height = 1.6; // Total height of body

        // Snap to Ground (Feet Positioning)
        if (this.world.getGroundHeight) {
            const groundY = this.world.getGroundHeight(this.position.x, this.position.z);
            if (groundY !== null) {
                // NPC Mesh pivot is at feet (Group origin), so we set Y to groundY directly.
                // But let's add a tiny offset to avoid z-fighting with floor
                this.mesh.position.y = groundY + 0.1;
                this.position.y = groundY + 0.1;
            }
        }

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.7;
        this.mesh.add(head);

        // Hood/Hair
        const hoodGeo = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const hood = new THREE.Mesh(hoodGeo, mat);
        hood.position.y = 1.7;
        hood.rotation.x = 0.2;
        this.mesh.add(hood);

        // Staff
        const staffGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.6, 1.25, 0.2);
        staff.rotation.z = 0.1;
        this.mesh.add(staff);

        // Floating "?" or "!" Indicator
        this.indicator = document.createElement('div');
        this.indicator.innerText = '!';
        this.indicator.style.position = 'absolute';
        this.indicator.style.color = '#ffd700';
        this.indicator.style.fontSize = '30px';
        this.indicator.style.fontWeight = 'bold';
        this.indicator.style.textShadow = '0 0 5px black';
        this.indicator.style.display = 'none'; // Hidden until close
        document.body.appendChild(this.indicator);

        this.world.scene.add(this.mesh);
    }

    update(dt) {
        if (!this.game.player || !this.game.player.body) return;

        // Look at player
        this.mesh.lookAt(this.game.player.body.position.x, this.mesh.position.y, this.game.player.body.position.z);

        // Check distance (2D)
        const dx = this.mesh.position.x - this.game.player.body.position.x;
        const dz = this.mesh.position.z - this.game.player.body.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Update Indicator Position (Project 3D to 2D)
        if (dist < 20) {
            const tempV = new THREE.Vector3().copy(this.mesh.position);
            tempV.y += 2.5; // Above head
            tempV.project(this.game.camera);

            const x = (tempV.x * .5 + .5) * window.innerWidth;
            const y = (tempV.y * -.5 + .5) * window.innerHeight;

            this.indicator.style.left = `${x}px`;
            this.indicator.style.top = `${y}px`;
            this.indicator.style.display = 'block';

            if (dist < this.interactionRadius) {
                this.indicator.innerText = 'F'; // Prompt to interact
                this.indicator.style.color = '#00ff00';
            } else {
                this.indicator.innerText = '!';
                this.indicator.style.color = '#ffd700';
            }
        } else {
            this.indicator.style.display = 'none';
        }
    }

    interact() {
        console.log("Interacting with", this.name);
        this.game.dialogueManager.startDialogue(this.name, this.dialogueData);
    }
}
