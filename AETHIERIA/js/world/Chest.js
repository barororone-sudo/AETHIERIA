
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Chest {
    constructor(game, world, position, itemId) {
        this.game = game;
        this.world = world;
        this.position = position;
        this.itemId = itemId;
        this.interactionRadius = 5.0;
        this.isOpen = false;

        this.initVisuals();
        this.initPhysics();
        this.initUI();
    }

    initVisuals() {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        // Lift slightly to sit on ground
        this.mesh.position.y += 0.5;

        // Materials
        const woodMat = new THREE.MeshToonMaterial({ color: 0x8B4513 }); // SaddleBrown
        const metalMat = new THREE.MeshToonMaterial({ color: 0xFFD700 }); // Gold

        // --- BASE ---
        const baseGeo = new THREE.BoxGeometry(1, 0.6, 1);
        this.base = new THREE.Mesh(baseGeo, woodMat);
        this.base.position.y = -0.2; // Shift down so center is 0
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.mesh.add(this.base);

        // --- LID GROUP (For pivoting) ---
        this.lidGroup = new THREE.Group();
        this.lidGroup.position.set(0, 0.1, -0.5); // Pivot at back edge
        this.mesh.add(this.lidGroup);

        // Lid Mesh
        const lidGeo = new THREE.BoxGeometry(1, 0.4, 1);
        this.lid = new THREE.Mesh(lidGeo, woodMat);
        this.lid.position.set(0, 0.2, 0.5); // Offset relative to pivot
        this.lid.castShadow = true;
        this.lidGroup.add(this.lid);

        // Lock/Trim
        const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        this.lock = new THREE.Mesh(lockGeo, metalMat);
        this.lock.position.set(0, 0.2, 1.05); // Front of lid
        this.lidGroup.add(this.lock);

        this.world.scene.add(this.mesh);
    }

    initPhysics() {
        // Trigger Body (Sensor)
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // Larger trigger
        this.body = new CANNON.Body({ mass: 0 });
        this.body.addShape(shape);
        this.body.position.copy(this.position);
        this.body.position.y += 0.5;
        this.body.collisionResponse = false; // Trigger only

        // Link for World.getClosestInteractable
        this.body.userData = { parent: this };

        this.world.physicsWorld.addBody(this.body);
    }

    initUI() {
        this.indicator = document.createElement('div');
        this.indicator.innerText = 'E';
        this.indicator.style.position = 'absolute';
        this.indicator.style.color = '#00ff00';
        this.indicator.style.fontSize = '24px';
        this.indicator.style.fontWeight = 'bold';
        this.indicator.style.textShadow = '0 0 5px black';
        this.indicator.style.pointerEvents = 'none';
        this.indicator.style.display = 'none';
        document.body.appendChild(this.indicator);
    }

    update(dt) {
        if (!this.game.player || !this.game.player.body || this.isOpen) {
            this.indicator.style.display = 'none';
            return;
        }

        // Check distance
        const dist = this.mesh.position.distanceTo(this.game.player.mesh.position);

        if (dist < this.interactionRadius) {
            // Project 3D to 2D
            const tempV = new THREE.Vector3().copy(this.mesh.position);
            tempV.y += 1.5; // Above chest
            tempV.project(this.game.camera);

            const x = (tempV.x * .5 + .5) * window.innerWidth;
            const y = (tempV.y * -.5 + .5) * window.innerHeight;

            this.indicator.style.left = `${x}px`;
            this.indicator.style.top = `${y}px`;
            this.indicator.style.display = 'block';
        } else {
            this.indicator.style.display = 'none';
        }
    }

    interact() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.indicator.style.display = 'none';

        console.log(`Opening chest: ${this.itemId}`);

        // 1. Animate Lid
        // Simple tween-like animation using GSAP if available, or manual lerp
        // Since we don't have GSAP installed, we'll do a simple quick rotation or add a "updateAnimation" method
        // For simplicity, instant rotation or CSS transition style logic
        let progress = 0;
        const animateOpen = () => {
            progress += 0.05;
            this.lidGroup.rotation.x = -Math.PI * 0.6 * Math.min(progress, 1);
            if (progress < 1) requestAnimationFrame(animateOpen);
        };
        animateOpen();

        // 2. Spawn Loot Item
        this.spawnLootVisual();

        // 3. Give Item
        this.game.player.inventory.addItem(this.itemId, 1);

        // 4. Notify UI & Story
        const item = this.game.data.getItem(this.itemId);
        const itemName = item ? item.name : this.itemId;
        this.game.ui.showToast(`Obtenu: ${itemName}`);
        this.game.story.notify('ITEM_PICKUP', this.itemId);
    }

    spawnLootVisual() {
        // Create a mini item mesh that floats up
        const geometry = new THREE.DodecahedronGeometry(0.3);
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold orb
        const itemMesh = new THREE.Mesh(geometry, material);
        itemMesh.position.copy(this.mesh.position);
        itemMesh.position.y += 0.5; // Inside chest
        this.world.scene.add(itemMesh);

        // Animate Float Up and Fade
        let age = 0;
        const animateLoot = () => {
            age += 0.02;
            itemMesh.position.y += 0.02;
            itemMesh.rotation.y += 0.1;

            if (age > 2.0) {
                this.world.scene.remove(itemMesh);
                geometry.dispose();
                material.dispose();
            } else {
                requestAnimationFrame(animateLoot);
            }
        };
        animateLoot();
    }
}
