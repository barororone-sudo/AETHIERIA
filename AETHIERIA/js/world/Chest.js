
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Utils } from '../Utils.js';

export class Chest {
    /**
     * @param {import('../main.js').Game} game
     * @param {any} world
     * @param {THREE.Vector3} position
     * @param {number} tier 1=Common, 2=Exquisite, 3=Precious, 4=Legendary
     * @param {boolean} locked
     */
    constructor(game, world, position, tier = 1, locked = false) {
        this.game = game;
        this.world = world;
        this.position = position;
        this.tier = tier;
        this.locked = locked;
        this.interactionRadius = 4.0;
        this.isOpen = false;

        this.initVisuals();
        this.initPhysics();
        this.initUI();
    }

    initVisuals() {
        if (this.world.interactables) {
            this.world.interactables.push(this);
        }
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.mesh.position.y += 0.5;

        // Tier Visuals
        let bodyColor = 0x8B4513; // Common (Wood)
        let trimColor = 0x555555; // Iron band
        let auraColor = null;

        switch (this.tier) {
            case 2: // Exquisite (Iron/Silver)
                bodyColor = 0x444444;
                trimColor = 0xCECECE;
                break;
            case 3: // Precious (Gold)
                bodyColor = 0xD4AF37;
                trimColor = 0xFFFFFF;
                auraColor = 0xFFD700;
                break;
            case 4: // Legendary
                bodyColor = 0x220044; // Dark Purple
                trimColor = 0xFF00FF; // Neon
                auraColor = 0xFF00FF;
                break;
        }

        const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor });
        const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.8, roughness: 0.2 });

        // --- BASE ---
        this.base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), bodyMat);
        this.base.position.y = -0.2;
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.mesh.add(this.base);

        // --- LID GROUP ---
        this.lidGroup = new THREE.Group();
        this.lidGroup.position.set(0, 0.1, -0.5);
        this.mesh.add(this.lidGroup);

        const lid = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1), bodyMat);
        lid.position.set(0, 0.2, 0.5);
        lid.castShadow = true;
        this.lidGroup.add(lid);

        // Lock
        const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        this.lockMat = new THREE.MeshStandardMaterial({ color: this.locked ? 0xFF0000 : 0x00FF00, emissive: this.locked ? 0x220000 : 0x002200 });
        this.lockMesh = new THREE.Mesh(lockGeo, this.lockMat);
        this.lockMesh.position.set(0, 0.2, 1.05);
        this.lidGroup.add(this.lockMesh);

        // --- AURA (Tier 3+) ---
        if (auraColor) {
            const auraGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
            const auraMat = new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
            this.aura = new THREE.Mesh(auraGeo, auraMat);
            this.aura.position.y = -0.49;
            this.mesh.add(this.aura);

            // Pillar of light
            const pillGeo = new THREE.CylinderGeometry(0.1, 0.1, 10, 8);
            pillGeo.translate(0, 5, 0);
            const pillMat = new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
            this.pillar = new THREE.Mesh(pillGeo, pillMat);
            this.mesh.add(this.pillar);
        }

        this.world.scene.add(this.mesh);
    }

    initPhysics() {
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        this.body = new CANNON.Body({ mass: 0 }); // Static
        this.body.addShape(shape);
        this.body.position.copy(this.position);
        this.body.position.y += 0.5;
        this.body.collisionResponse = false;
        this.body.userData = { parent: this };
        this.world.physicsWorld.addBody(this.body);
    }

    initUI() {
        this.indicator = document.createElement('div');
        this.indicator.innerText = this.locked ? 'LOCKED' : 'OPEN';
        this.indicator.style.position = 'absolute';
        this.indicator.style.color = this.locked ? '#ff3333' : '#33ff33';
        this.indicator.style.fontSize = '18px';
        this.indicator.style.fontWeight = 'bold';
        this.indicator.style.textShadow = '0 0 4px black';
        this.indicator.style.display = 'none';
        this.indicator.style.pointerEvents = 'none';
        document.body.appendChild(this.indicator);
    }

    update(dt) {
        if (!this.game.player || this.isOpen) {
            this.indicator.style.display = 'none';
            if (this.aura) this.aura.visible = false;
            if (this.pillar) this.pillar.visible = false;
            return;
        }

        // Animate Aura
        if (this.aura) {
            this.aura.rotation.y += dt;
            const s = 1.0 + Math.sin(Date.now() * 0.002) * 0.2;
            this.aura.scale.set(s, 1, s);
        }

        // UI
        const dist = this.mesh.position.distanceTo(this.game.player.mesh.position);
        if (dist < this.interactionRadius) {
            const v = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            v.project(this.game.camera);
            const x = (v.x * .5 + .5) * window.innerWidth;
            const y = (v.y * -.5 + .5) * window.innerHeight;
            this.indicator.style.left = `${x}px`;
            this.indicator.style.top = `${y}px`;
            this.indicator.innerText = this.locked ? (this.game.player.inventory.hasItem('ancient_key') ? '[E] UNLOCK' : 'LOCKED (Key Needed)') : '[E] OPEN';
            this.indicator.style.color = this.locked ? (this.game.player.inventory.hasItem('ancient_key') ? '#ffff00' : '#ff0000') : '#00ff00';
            this.indicator.style.display = 'block';
        } else {
            this.indicator.style.display = 'none';
        }
    }

    interact() {
        if (this.isOpen) return;

        if (this.locked) {
            // Check for key
            if (this.game.player.inventory.hasItem('ancient_key')) {
                this.unlock();
            } else {
                this.game.ui.showToast("Ce coffre est verrouillé ! Il faut une Clé Ancienne.", 'error');
                // Play locked sound
            }
            return;
        }

        this.open();

        // ✨ Notify StoryManager of chest opening
        if (this.game.story) {
            this.game.story.triggerEvent('OPEN_CHEST', { tier: this.tier });
        }
    }

    unlock() {
        this.locked = false;
        this.game.player.inventory.removeItem('ancient_key', 1);
        this.lockMat.color.setHex(0x00FF00);
        this.lockMat.emissive.setHex(0x002200);
        this.game.ui.showToast("Coffre déverrouillé !", 'success');
        // Play unlock sound
        setTimeout(() => this.open(), 500);
    }

    open() {
        this.isOpen = true;
        this.indicator.style.display = 'none';
        if (this.pillar) this.pillar.visible = false;

        // 1. Lid Animation
        let progress = 0;
        const animate = () => {
            progress += 0.04;
            this.lidGroup.rotation.x = -Math.PI * 0.6 * Math.min(progress, 1);
            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();

        // 2. Light Burst
        const light = new THREE.PointLight(0xFFD700, 2, 8);
        light.position.set(0, 0.5, 0);
        this.mesh.add(light);

        // 3. Loot Logic
        if (this.game.lootManager) {
            const drops = this.game.lootManager.getChestLoot(this.tier);
            this.game.lootManager.dropLoot(this.mesh.position, drops);

            // Story Event
            if (this.game.story) {
                this.game.story.triggerEvent('OPEN_CHEST', { tier: this.tier });
            }

            // "Tadaa" Item Floating (Just visual for the primary item)
            if (drops.length > 0) {
                // Find best item to show
                const best = drops.find(d => d.itemId.includes('sword') || d.itemId.includes('crystal')) || drops[0];
                this.showTadaItem(best.itemId);
            }
        }
    }

    showTadaItem(itemId) {
        // Visual Mesh floating up
        const itemData = this.game.data.getItem(itemId);
        // Simple placeholder visual
        const color = itemData && itemData.visualStats ? itemData.visualStats.color : '#FFFFFF';

        const mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.4),
            new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 })
        );
        mesh.position.copy(this.mesh.position);
        mesh.position.y += 0.8;
        this.world.scene.add(mesh);

        // Animate
        let t = 0;
        const anim = () => {
            t += 0.02;
            mesh.position.y += 0.005;
            mesh.rotation.y += 0.05;
            mesh.scale.setScalar(1.0 + Math.sin(t * 5) * 0.2);

            if (t < 2.0) {
                requestAnimationFrame(anim);
            } else {
                this.world.scene.remove(mesh);
            }
        };
        anim();
    }
}
