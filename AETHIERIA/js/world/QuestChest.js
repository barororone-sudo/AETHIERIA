import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Quest Chest - Special chest for quest items
 */
export class QuestChest {
    constructor(game, position, questItemId) {
        this.game = game;
        this.position = position;
        this.questItemId = questItemId;
        this.isOpen = false;
        this.mesh = null;
        this.body = null;

        this.init();
    }

    init() {
        // Access global THREE
        // if (!window.THREE) {
        //     console.error('THREE is not defined!');
        //     return;
        // }
        // const THREE = window.THREE;
        // const CANNON = window.CANNON;

        // Create golden chest mesh
        const geometry = new THREE.BoxGeometry(1.5, 1.2, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y + 0.6, this.position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.userData.isQuestChest = true;
        this.mesh.userData.questItemId = this.questItemId;
        this.game.world.scene.add(this.mesh);

        // Add glowing light
        const light = new THREE.PointLight(0xFFD700, 3, 8);
        light.position.copy(this.mesh.position);
        this.game.world.scene.add(light);
        this.light = light;

        // Physics body
        const shape = new CANNON.Box(new CANNON.Vec3(0.75, 0.6, 0.5));
        this.body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(this.position.x, this.position.y + 0.6, this.position.z)
        });
        this.game.world.physicsWorld.addBody(this.body);

        console.log(`[QuestChest] Spawned at (${this.position.x}, ${this.position.z}) with item: ${this.questItemId}`);
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        console.log(`[QuestChest] Opening chest with quest item: ${this.questItemId}`);

        // Add quest item to inventory
        if (this.game.player && this.game.player.inventory) {
            this.game.player.inventory.addItem(this.questItemId, 1);
        }

        // Trigger quest progression
        if (this.game.questManager) {
            this.game.questManager.checkQuestProgress('COLLECT_ITEM', { itemId: this.questItemId });
        }

        // Visual feedback
        if (this.game.ui) {
            this.game.ui.showToast('✨ Objet de quête obtenu !');
        }

        // Play sound
        if (this.game.audio) {
            this.game.audio.playSFX('chest_open');
        }

        // Change appearance (open lid)
        this.mesh.material.emissiveIntensity = 0;
        this.mesh.rotation.x = -0.5; // Tilt to show "open"

        // Remove light
        if (this.light) {
            this.game.world.scene.remove(this.light);
        }
    }

    update(dt) {
        if (this.isOpen) return;
        if (!this.mesh) return;

        // Floating animation
        this.mesh.position.y = this.position.y + 0.6 + Math.sin(Date.now() * 0.001) * 0.1;
        this.mesh.rotation.y += dt * 0.5;

        // Update light position
        if (this.light) {
            this.light.position.copy(this.mesh.position);
        }
    }

    dispose() {
        if (this.mesh) {
            this.game.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.light) {
            this.game.world.scene.remove(this.light);
        }
        if (this.body) {
            this.game.world.physicsWorld.removeBody(this.body);
        }
    }
}
