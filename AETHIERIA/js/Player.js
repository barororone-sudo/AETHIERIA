// js/Player.js
// @ts-check
import * as THREE from 'three';
// @ts-ignore
import * as CANNON from 'cannon-es';
import { Utils } from './Utils.js';
import { Input } from './Input.js';
import { Combat } from './Combat.js';
import { InventoryManager } from './managers/InventoryManager.js';
import { SwordTrail } from './VFX.js';

/**
 * @typedef {Object} Limb
 * @property {THREE.Group} group
 * @property {THREE.Mesh} mesh
 */

export class Player {
    /**
     * @param {import('./main.js').Game} game
     * @param {THREE.PerspectiveCamera} camera
     */
    constructor(game, camera) {
        this.game = game;
        this.world = game.world;
        this.camera = camera;
        this.input = game.input;

        this.hp = 100;
        this.maxHp = 100;
        this.stats = {
            attack: 10,
            defense: 5
        };

        // Inventory
        this.inventory = new InventoryManager(this);

        // State Machine
        this.state = 'IDLE';
        this.stamina = 100;
        this.maxStamina = 100;

        this.lastJumpTime = 0;
        this.stepTimer = 0;

        // Camera State
        this.cameraState = {
            distance: 10,
            phi: Math.PI / 6,
            theta: 0,
            target: new THREE.Vector3(),
            fov: 75
        };

        // Combat System
        /** @type {Combat} */ this.combat = new Combat(this);
        this.swordTrail = null;

        // Audio & Input
        this.audio = game.audio || null;
        this.inputLocked = false;

        // Timers
        this.hitStopTimer = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Abilities
        this.canGlide = true;
        this.canSurf = true;

        this.VISUAL_OFFSET_Y = 1.2;

        // Visuals (Initialized in initVisuals)
        /** @type {THREE.Group|null} */ this.mesh = null;
        /** @type {THREE.Group|null} */ this.torso = null;
        /** @type {THREE.Mesh|null} */ this.torsoMesh = null;
        /** @type {THREE.Mesh|null} */ this.skirtMesh = null;
        /** @type {THREE.Group|null} */ this.head = null;
        /** @type {THREE.Mesh|null} */ this.headMesh = null;
        /** @type {THREE.Group|null} */ this.hairGroup = null;
        /** @type {Limb|null} */ this.armL = null;
        /** @type {Limb|null} */ this.armR = null;
        /** @type {Limb|null} */ this.legL = null;
        /** @type {Limb|null} */ this.legR = null;
        /** @type {Limb|null} */ this.forearmL = null;
        /** @type {Limb|null} */ this.forearmR = null;
        /** @type {Limb|null} */ this.shinL = null;
        /** @type {Limb|null} */ this.shinR = null;
        /** @type {THREE.Mesh|null} */ this.backpack = null;
        /** @type {THREE.Group|null} */ this.weaponHolder = null;
        /** @type {THREE.Mesh|null} */ this.gliderMesh = null;
        /** @type {THREE.Mesh|null} */ this.surfMesh = null;
        /** @type {THREE.Mesh|null} */ this.halo = null;
        /** @type {THREE.Mesh|null} */ this.scarfTail1 = null;
        /** @type {THREE.Mesh|null} */ this.scarfTail2 = null;
        /** @type {THREE.Group|null} */ this.bowGroup = null;

        // Give starter items
        this.inventory.addItem('sword_iron', 1);
        this.inventory.addItem('potion_health', 5);

        // UI Elements
        /** @type {HTMLElement|null} */ this.staminaContainer = null;
        /** @type {HTMLElement|null} */ this.staminaRing = null;
        /** @type {HTMLElement|null} */ this.heartsContainer = null;
        /** @type {HTMLElement|null} */ this.iconGlide = null;
        /** @type {HTMLElement|null} */ this.iconSurf = null;

        this.initInput();
        this.initUI();
        this.initPhysics();
        this.initVisuals();
    }

    initUI() {
        this.staminaContainer = document.getElementById('stamina-container');
        this.staminaRing = document.getElementById('stamina-ring');
        this.heartsContainer = document.getElementById('hearts-container');
        this.iconGlide = document.getElementById('icon-glide');
        this.iconSurf = document.getElementById('icon-surf');
    }

    initInput() {
        document.addEventListener('click', () => {
            // Only request lock if menu is NOT open and we are not already locked
            if (this.game && this.game.ui && !this.game.ui.isOpen && document.pointerLockElement !== document.body) {
                if (document.body.requestPointerLock) {
                    document.body.requestPointerLock().catch(e => {
                        // Suppress expected security errors (e.g. user exited quickly)
                        if (e.name !== 'SecurityError') {
                            console.warn("Pointer Lock failed:", e);
                        }
                    });
                }
            }
        });

        document.addEventListener('mousedown', /** @param {MouseEvent} e */(e) => {
            if (document.pointerLockElement === document.body) {
                if (e.button === 0) { // Left Click
                    if (this.combat && this.combat.isAiming) {
                        this.combat.shootArrow();
                    } else if (this.combat) {
                        this.combat.attack();
                    }
                } else if (e.button === 2) { // Right Click
                    if (this.combat) this.combat.toggleAim();
                }
            }
        });

        document.addEventListener('keydown', /** @param {KeyboardEvent} e */(e) => {
            if (this.game.ui && this.game.ui.isOpen) return; // Block if menu open

            // Forward input to DialogueManager if active
            if (this.game.dialogueManager && this.game.dialogueManager.isActive) {
                this.game.dialogueManager.handleInput(e.code);
                return;
            }

            if (Date.now() - (this.lastInteractionTime || 0) < 500) return;

            if (e.code === 'KeyF') {
                if (this.tryInteract()) {
                    this.lastInteractionTime = Date.now();
                }
            }
            if (e.code === 'KeyE' && this.combat) this.combat.useSkill();
            if (e.code === 'KeyA' && this.combat) this.combat.useUltimate();
            if (e.code === 'KeyP') {
                this.inventory.useItemById('potion_health');
                // Update UI if menu is open
                if (this.world && this.world.game && this.world.game.ui && this.world.game.ui.isOpen) {
                    this.world.game.ui.renderInventory();
                    this.world.game.ui.renderStats();
                }
            }
        });

        document.addEventListener('mousemove', /** @param {MouseEvent} e */(e) => {
            if (document.pointerLockElement === document.body) {
                this.onMouseMove(e);
            }
        });
    }

    /**
     * @returns {boolean}
     */
    tryInteract() {
        if (!this.world || !this.world.interactables) return false;

        // Find closest interactable
        let closest = null;
        let minDist = 2.0; // Interaction range

        for (const obj of this.world.interactables) {
            if (!obj.mesh) continue;
            const dist = this.mesh ? this.mesh.position.distanceTo(obj.mesh.position) : Infinity;
            if (dist < minDist) {
                minDist = dist;
                closest = obj;
            }
        }

        if (closest) {
            console.log("Interacting with:", closest);
            if (closest.interact) {
                closest.interact(this);
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number} amount
     */
    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
        console.log(`Healed ${amount} HP. Current: ${this.hp}`);

        // Visual Feedback (Green Flash)
        if (this.torsoMesh && this.torsoMesh.material) {
            const mat = Array.isArray(this.torsoMesh.material) ? this.torsoMesh.material[0] : this.torsoMesh.material;
            // @ts-ignore
            const oldColor = mat.color.getHex();
            // @ts-ignore
            mat.color.setHex(0x00FF00);
            setTimeout(() => {
                if (this.torsoMesh && this.torsoMesh.material) {
                    // @ts-ignore
                    mat.color.setHex(oldColor);
                }
            }, 200);
        }

        this.updateUI();
    }

    /**
     * @param {number} amount
     */
    takeDamage(amount) {
        this.hp = Math.max(this.hp - amount, 0);
        console.log(`Took ${amount} damage. HP: ${this.hp}`);

        // Visual Feedback (Red Flash)
        if (this.torsoMesh && this.torsoMesh.material) {
            const mat = Array.isArray(this.torsoMesh.material) ? this.torsoMesh.material[0] : this.torsoMesh.material;
            // @ts-ignore
            const oldColor = mat.color.getHex();
            // @ts-ignore
            mat.color.setHex(0xFF0000);
            setTimeout(() => {
                if (this.torsoMesh && this.torsoMesh.material) {
                    // @ts-ignore
                    mat.color.setHex(oldColor);
                }
            }, 200);
        }

        this.updateUI();

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Player Died!");
        // TODO: Game Over Logic
        if (this.game && this.game.ui) {
            this.game.ui.showToast("YOU DIED");
        }
    }

    /**
     * @param {string} itemId
     */
    equip(itemId) {
        console.log(`Equipping ${itemId}...`);
        // Logic to switch weapon mesh would go here
    }

    initPhysics() {
        const world = this.world;
        if (!world) return;
        const radius = 0.5;
        const height = 1.8;

        const shape = new CANNON.Sphere(radius);

        // Use Slippery Material from World
        this.playerMaterial = world.slipperyMaterial || new CANNON.Material('player');

        this.contactMaterial = new CANNON.ContactMaterial(this.playerMaterial, world.defaultMaterial, {
            friction: 0.0,
            restitution: 0.0
        });
        // If world already has this contact material (via defaultSlipperyContact), this might be redundant but safe.
        // Actually, we should rely on World's contact materials if possible, but keeping this for safety.
        world.physicsWorld.addContactMaterial(this.contactMaterial);

        this.body = new CANNON.Body({
            mass: 5,
            shape: shape,
            position: new CANNON.Vec3(0, 50, 0),
            material: this.playerMaterial
        });

        this.body.linearDamping = 0.9;
        this.body.angularDamping = 1.0;
        this.body.fixedRotation = true;

        world.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        if (!this.world) return;
        // --- ANIME AVATAR COMPOSITE MODEL (1:7 Proportions) ---
        this.mesh = new THREE.Group();
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        const textures = this.game.loader.assets.textures;
        // @ts-ignore
        const faceTexture = textures['hero_face'];
        // @ts-ignore
        const outfitTexture = textures['hero_outfit'];

        // Materials
        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdfc4 }); // Beige

        const faceMat = new THREE.MeshToonMaterial({ map: faceTexture, transparent: true });

        const tunicMat = new THREE.MeshToonMaterial({
            color: 0xffffff,
            map: outfitTexture,
            side: THREE.DoubleSide
        });

        const hairMat = new THREE.MeshToonMaterial({ color: 0xffeba1 }); // Blonde
        const pantsMat = new THREE.MeshToonMaterial({ color: 0x333333 });
        const accessoryMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
        const rauraMat = new THREE.MeshStandardMaterial({
            color: 0x0a1a1a, // Dark Green/Black
            metalness: 0.8,
            roughness: 0.4,
            emissive: 0x00ffcc, // Teal Glow
            emissiveIntensity: 0.5
        });
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 1.0,
            roughness: 0.2
        });

        /**
         * @param {THREE.Mesh} mesh
         * @param {THREE.BufferGeometry} geometry
         * @param {number} thickness
         * @param {number} color
         */
        const addOutline = (mesh, geometry, thickness = 0.02, color = 0x000000) => {
            const outline = Utils.createOutlineMesh(geometry, thickness, color);
            mesh.add(outline);
        };

        // 1. TORSO GROUP (Pivot at Hips)
        this.torso = new THREE.Group();
        this.torso.position.y = 1.0; // Hip height
        this.mesh.add(this.torso);

        // Body Core
        const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
        this.torsoMesh = new THREE.Mesh(torsoGeo, tunicMat);
        this.torsoMesh.position.y = 0.25;
        this.torsoMesh.castShadow = true;
        this.torsoMesh.receiveShadow = true;
        addOutline(this.torsoMesh, torsoGeo, 0.02);
        this.torso.add(this.torsoMesh);

        // Physics Skirt (4 Planes)
        this.skirtGroup = new THREE.Group();
        this.torso.add(this.skirtGroup);
        const skirtW = 0.3;
        const skirtH = 0.4;
        const skirtGeo = new THREE.PlaneGeometry(skirtW, skirtH);

        /** @type {THREE.Group[]} */
        this.skirtPlanes = [];
        for (let i = 0; i < 4; i++) {
            const skirtPanel = new THREE.Mesh(skirtGeo, tunicMat);
            const angle = (i / 4) * Math.PI * 2;
            const radius = 0.15;

            const pivot = new THREE.Group();
            pivot.position.set(Math.sin(angle) * radius, 0.0, Math.cos(angle) * radius);
            pivot.rotation.y = angle;

            skirtPanel.position.y = -skirtH / 2;
            skirtPanel.position.z = 0.05;

            pivot.add(skirtPanel);
            this.skirtGroup.add(pivot);
            this.skirtPlanes.push(pivot);
        }

        // 2. HEAD GROUP
        this.head = new THREE.Group();
        this.head.position.set(0, 0.55, 0); // Neck position
        this.torso.add(this.head);

        // Head Mesh (Sphere)
        const headGeo = new THREE.SphereGeometry(0.28, 32, 32);
        this.headMesh = new THREE.Mesh(headGeo, skinMat);
        this.headMesh.castShadow = true;
        this.headMesh.receiveShadow = true;
        addOutline(this.headMesh, headGeo, 0.02, 0x5c3a21);
        this.head.add(this.headMesh);

        // Face Decal
        if (faceTexture) {
            const faceDecalGeo = new THREE.PlaneGeometry(0.4, 0.4);
            const faceDecal = new THREE.Mesh(faceDecalGeo, new THREE.MeshBasicMaterial({
                map: faceTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false
            }));
            faceDecal.position.set(0, 0, 0.29);
            this.head.add(faceDecal);
        }

        // Dynamic Hair (Shonen Style)
        this.hairGroup = new THREE.Group();
        this.head.add(this.hairGroup);

        const hairSpikeGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
        const hairPositions = [
            { x: 0, y: 0.3, z: -0.2, rx: -0.8, ry: 0, s: 1.2 },
            { x: 0.2, y: 0.25, z: -0.15, rx: -0.6, ry: 0.5, s: 1.1 },
            { x: -0.2, y: 0.25, z: -0.15, rx: -0.6, ry: -0.5, s: 1.1 },
            { x: 0, y: 0.45, z: 0, rx: 0, ry: 0, s: 1.0 },
            { x: 0.15, y: 0.4, z: 0.1, rx: 0.3, ry: 0.5, s: 0.9 },
            { x: -0.15, y: 0.4, z: 0.1, rx: 0.3, ry: -0.5, s: 0.9 },
            { x: 0, y: 0.35, z: 0.25, rx: 1.2, ry: 0.2, s: 0.8 }
        ];

        hairPositions.forEach(pos => {
            const spike = new THREE.Mesh(hairSpikeGeo, hairMat);
            spike.position.set(pos.x, pos.y, pos.z);
            spike.rotation.set(pos.rx, pos.ry, 0);
            spike.scale.setScalar(pos.s);
            addOutline(spike, hairSpikeGeo, 0.02, 0x8b4513);
            if (this.hairGroup) this.hairGroup.add(spike);
        });

        // Scarf
        this.scarfGroup = new THREE.Group();
        this.scarfGroup.position.set(0, 0.4, -0.15);
        this.torso.add(this.scarfGroup);

        /** @type {{group: THREE.Group, mesh: THREE.Mesh}[]} */
        this.scarfSegments = [];
        const scarfGeo = new THREE.BoxGeometry(0.25, 0.05, 0.4);
        const scarfMat = new THREE.MeshToonMaterial({ color: 0xff0000 });

        for (let i = 0; i < 3; i++) {
            const seg = new THREE.Mesh(scarfGeo, scarfMat);
            seg.position.z = -0.3;
            const pivot = new THREE.Group();
            pivot.position.z = (i === 0) ? 0 : -0.3;
            pivot.add(seg);

            if (i === 0) this.scarfGroup.add(pivot);
            else this.scarfSegments[i - 1].mesh.add(pivot);

            this.scarfSegments.push({ group: pivot, mesh: seg });
        }

        // 3. LIMBS
        /**
         * @param {number} width
         * @param {number} length
         * @param {THREE.Material} mat
         * @param {number} x
         * @param {number} y
         * @param {number} z
         * @param {boolean} [isRaura]
         */
        const createLimb = (width, length, mat, x, y, z, isRaura = false) => {
            const group = new THREE.Group();
            group.position.set(x, y, z);
            const geo = new THREE.CylinderGeometry(width, width * 0.8, length, 8);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = -length / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (!isRaura) addOutline(mesh, geo, 0.02);
            group.add(mesh);
            const jointGeo = new THREE.SphereGeometry(width * 1.2, 8, 8);
            const joint = new THREE.Mesh(jointGeo, mat);
            group.add(joint);

            if (isRaura) {
                const bandGeo = new THREE.TorusGeometry(width * 0.9, 0.01, 4, 16);
                const bandMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
                for (let i = 1; i < 4; i++) {
                    const band = new THREE.Mesh(bandGeo, bandMat);
                    band.position.y = -length * (i / 4);
                    band.rotation.x = Math.PI / 2;
                    group.add(band);
                }
            }
            return { group, mesh };
        };

        this.armL = createLimb(0.06, 0.5, skinMat, -0.32, 0.45, 0);
        this.torso.add(this.armL.group);
        this.forearmL = createLimb(0.05, 0.5, skinMat, 0, -0.5, 0);
        this.armL.group.add(this.forearmL.group);

        this.armR = createLimb(0.06, 0.5, rauraMat, 0.32, 0.45, 0, true);
        this.torso.add(this.armR.group);
        this.forearmR = createLimb(0.05, 0.5, rauraMat, 0, -0.5, 0, true);
        this.armR.group.add(this.forearmR.group);

        this.legL = createLimb(0.08, 0.7, pantsMat, -0.12, 0, 0);
        this.torso.add(this.legL.group);
        this.shinL = createLimb(0.07, 0.7, pantsMat, 0, -0.7, 0);
        this.legL.group.add(this.shinL.group);

        this.legR = createLimb(0.08, 0.7, pantsMat, 0.12, 0, 0);
        this.torso.add(this.legR.group);
        this.shinR = createLimb(0.07, 0.7, pantsMat, 0, -0.7, 0);
        this.legR.group.add(this.shinR.group);

        this.weaponHolder = new THREE.Group();
        this.weaponHolder.position.set(0, -0.4, 0);
        this.forearmR.group.add(this.weaponHolder);

        this.armL.group.rotation.z = Math.PI / 8;
        this.armR.group.rotation.z = -Math.PI / 8;

        this.world.scene.add(this.mesh);
        this.swordTrail = new SwordTrail(this.world.scene, 0x00FFFF, 20);
    }

    /**
     * @param {MouseEvent} e
     */
    onMouseMove(e) {
        const sensitivity = 0.002;
        this.cameraState.theta -= e.movementX * sensitivity;
        this.cameraState.phi -= e.movementY * sensitivity;
        const minPhi = 0.1;
        const maxPhi = Math.PI / 2 - 0.1;
        this.cameraState.phi = Utils.clamp(this.cameraState.phi, minPhi, maxPhi);
    }

    /**
     * @param {number} duration
     */
    hitStop(duration) {
        this.hitStopTimer = duration;
    }

    /**
     * @param {number} intensity
     * @param {number} duration
     */
    screenShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        // Hitstop Logic
        let timeScale = 1.0;
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            timeScale = 0.01; // Almost frozen
        } else if (this.state === 'AIR' && this.combat && this.combat.isAiming) {
            timeScale = 0.1; // Matrix Mode
        }

        const scaledDt = dt * timeScale;

        this.handleState(scaledDt);
        this.updatePhysics(scaledDt);
        this.updateVisuals();

        this.updateAnimations(dt);
        if (!this.inputLocked) {
            this.updateCamera(dt); // Camera moves at normal speed (mostly)
        }
        this.updateUI();

        if (this.combat) this.combat.update(scaledDt);

        // Check Interaction Prompt
        this.checkInteractionPrompt();

        if (this.game.clock.getElapsedTime() % 1.0 < dt) {
            if (this.mesh) console.log(`Player Pos: ${this.mesh.position.x.toFixed(2)}, ${this.mesh.position.y.toFixed(2)}, ${this.mesh.position.z.toFixed(2)} | State: ${this.state}`);
        }

        // Kill Z (Safety Net)
        if (this.mesh && this.mesh.position.y < -50) {
            console.warn("Player fell out of world! Resetting...");
            this.body.position.set(0, 50, 0);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }

        return timeScale;
    }

    checkInteractionPrompt() {
        if (!this.world || !this.world.interactables || !this.mesh) return;

        let found = false;
        // Check Towers/Chests
        if (this.world.interactables) {
            for (const obj of this.world.interactables) {
                const pos = obj.mesh ? obj.mesh.position : obj.position;
                if (!pos) continue;

                // Ignore Y axis for easier interaction (2D distance)
                const dx = this.mesh.position.x - pos.x;
                const dz = this.mesh.position.z - pos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 8) {
                    if (obj.type === 'tower' && !obj.isUnlocked) {
                        if (this.game.ui.showInteractionPrompt) {
                            this.game.ui.showInteractionPrompt("[F] Unlock Tower");
                        }
                        found = true;
                    }
                }
            }
        }

        // Check NPCs
        if (!found && this.world.npcs) {
            for (const npc of this.world.npcs) {
                // Use 2D Distance for NPCs too
                const dx = this.mesh.position.x - npc.mesh.position.x;
                const dz = this.mesh.position.z - npc.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 3) {
                    if (this.game.ui.showInteractionPrompt) {
                        this.game.ui.showInteractionPrompt(`[F] Talk to ${npc.name}`);
                    }
                    found = true;
                }
            }
        }

        if (!found) {
            if (this.game.ui.hideInteractionPrompt) {
                this.game.ui.hideInteractionPrompt();
            }
        }
    }

    /**
     * @param {number} dt
     */
    handleState(dt) {
        const onGround = this.checkGround();
        const inputVec = this.getInputVector();
        let speed = inputVec.length();

        // Sprint Logic
        if (this.input.keys.sprint && this.stamina > 0 && speed > 0) {
            this.isSprinting = true;
            speed *= 1.5; // 50% faster
            this.stamina -= 10 * dt; // Drain stamina
        } else {
            this.isSprinting = false;
            if (this.stamina < this.maxStamina) {
                this.stamina += 5 * dt; // Regen
            }
        }
        this.stamina = Utils.clamp(this.stamina, 0, this.maxStamina);
        const now = performance.now();

        // Handle Jump / Double Tap Surf
        if (this.input.keys.jump) {
            const timeSinceLastJump = now - this.lastJumpTime;

            if (timeSinceLastJump < 300 && this.canSurf) {
                // Double Tap -> SURF
                this.state = 'SURF';
                this.body.velocity.y = 5;
                this.body.velocity.addScaledVector(this.getForwardVector(), 10);
                if (this.audio) this.audio.playSFX('jump');
            } else {
                // Single Tap
                if (this.state === 'SURF') {
                    this.state = 'AIR'; // Toggle Off Surf
                    this.body.velocity.y = 6;
                } else if (onGround) {
                    this.body.velocity.y = 6;
                    this.state = 'AIR';
                    if (this.audio) this.audio.playSFX('jump');
                } else if (this.state === 'AIR' && this.stamina > 10 && this.canGlide) {
                    this.state = 'GLIDE';
                } else if (this.state === 'GLIDE') {
                    this.state = 'AIR'; // Toggle Off
                } else if (this.state === 'CLIMB') {
                    this.body.velocity.y = 6;
                    this.body.velocity.addScaledVector(this.getForwardVector(), -5);
                    this.state = 'AIR';
                    this.stamina -= 10;
                }
            }

            this.lastJumpTime = now;
            this.input.keys.jump = false;
        }

        switch (this.state) {
            case 'IDLE':
            case 'WALK':
                if (!onGround) {
                    this.state = 'AIR';
                } else if (speed > 0) {
                    this.state = 'WALK';
                    // Footsteps
                    this.stepTimer += dt;
                    if (this.stepTimer > 0.4) { // Every 400ms
                        if (this.audio) this.audio.playSFX('step');
                        this.stepTimer = 0;
                    }
                } else {
                    this.state = 'IDLE';
                    this.stepTimer = 0;
                }

                if (this.checkWall() && this.input.keys.forward && this.stamina > 10) {
                    this.state = 'CLIMB';
                }
                break;

            case 'AIR':
                if (onGround) {
                    this.state = 'IDLE';
                    if (this.gliderMesh) this.gliderMesh.visible = false;
                } else if (this.checkWall() && this.input.keys.forward && this.stamina > 10) {
                    this.state = 'CLIMB';
                }
                break;

            case 'CLIMB':
                if (this.stamina <= 0 || !this.input.keys.forward) {
                    this.state = 'AIR';
                }
                break;

            case 'GLIDE':
                if (onGround || this.stamina <= 0) {
                    this.state = 'AIR';
                    if (this.gliderMesh) this.gliderMesh.visible = false;
                }
                break;

            case 'SURF':
                if (onGround) {
                    // Slide
                }
                // Exit logic if needed
                break;
        }

        if (this.state === 'CLIMB' || this.state === 'GLIDE') {
            this.stamina -= 10 * dt;
        } else {
            this.stamina += 20 * dt;
        }
        this.stamina = Utils.clamp(this.stamina, 0, this.maxStamina);
        this.stamina = Utils.clamp(this.stamina, 0, this.maxStamina);
    }

    /**
     * @param {number} dt
     */
    updatePhysics(dt) {
        const body = this.body;
        const world = this.world;
        if (!body || !world) return;

        const inputVec = this.getInputVector();
        const moveSpeed = 5;

        body.linearDamping = 0.9;
        world.physicsWorld.gravity.set(0, -9.82, 0);

        if (this.state === 'SURF') {
            this.contactMaterial.friction = 0.0;
            body.linearDamping = 0.1;
        } else {
            this.contactMaterial.friction = 0.0;
            body.linearDamping = 0.9;
        }

        switch (this.state) {
            case 'WALK':
            case 'IDLE':
            case 'AIR':
                if (inputVec.length() > 0) {
                    body.velocity.x = inputVec.x * moveSpeed;
                    body.velocity.z = inputVec.z * moveSpeed;
                } else {
                    if (this.state !== 'AIR') {
                        body.velocity.x = 0;
                        body.velocity.z = 0;
                    }
                }
                break;

            case 'CLIMB':
                world.physicsWorld.gravity.set(0, 0, 0);
                body.velocity.set(0, 2, 0);
                break;

            case 'GLIDE':
                body.linearDamping = 0.5;
                world.physicsWorld.gravity.set(0, -1, 0);
                const forward = this.getForwardVector();
                body.velocity.x = forward.x * 8;
                body.velocity.z = forward.z * 8;
                body.velocity.y = Math.max(body.velocity.y, -2);
                break;

            case 'SURF':
                if (inputVec.length() > 0) {
                    body.applyForce(new CANNON.Vec3(inputVec.x * 10, 0, inputVec.z * 10), body.position);
                }
                break;
        }
    }

    // ...

    updateVisuals() {
        const mesh = this.mesh;
        const body = this.body;
        this.staminaContainer.style.display = 'block';
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (this.stamina / this.maxStamina) * circumference;
        this.staminaRing.style.strokeDashoffset = String(offset);
    } else {
    this.staminaContainer.style.display = 'none';
}
        }

// Hearts (Zelda Style)
if (this.heartsContainer) {
    const maxHearts = this.maxHp / 20; // 1 Heart = 20 HP
    const currentHearts = Math.ceil(this.hp / 20);

    // Only update if changed to avoid DOM thrashing
    if (this.heartsContainer.childElementCount !== maxHearts || this.heartsContainer.dataset.hp != String(Math.ceil(this.hp))) {
        this.heartsContainer.innerHTML = '';
        this.heartsContainer.dataset.hp = String(Math.ceil(this.hp));

        for (let i = 1; i <= maxHearts; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            if (i > currentHearts) {
                heart.classList.add('empty');
            }
            this.heartsContainer.appendChild(heart);
        }
    }
}

// Abilities UI
if (this.iconGlide) {
    this.iconGlide.style.opacity = this.canGlide ? (this.state === 'GLIDE' ? '1.0' : '0.5') : '0.1';
    this.iconGlide.style.border = this.state === 'GLIDE' ? '2px solid #00ff00' : '2px solid #fff';
}
if (this.iconSurf) {
    this.iconSurf.style.opacity = this.canSurf ? (this.state === 'SURF' ? '1.0' : '0.5') : '0.1';
    this.iconSurf.style.border = this.state === 'SURF' ? '2px solid #00ff00' : '2px solid #fff';
}
    }

getInputVector() {
    const inputVector = new THREE.Vector3(0, 0, 0);
    if (this.input.keys.forward) inputVector.z -= 1;
    if (this.input.keys.backward) inputVector.z += 1;
    if (this.input.keys.left) inputVector.x -= 1;
    if (this.input.keys.right) inputVector.x += 1;

    if (inputVector.length() > 0) {
        // console.log("Input Vector:", inputVector);
        inputVector.normalize();
        const rotation = new THREE.Euler(0, this.cameraState.theta, 0);
        inputVector.applyEuler(rotation);
    }
    return inputVector;
}

getForwardVector() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(0, this.cameraState.theta, 0));
    return forward;
}

checkGround() {
    const mesh = this.mesh;
    const world = this.world;
    if (!mesh || !world) return false;

    // 1. Check Terrain (The Truth)
    if (world.terrainManager) {
        const groundH = world.terrainManager.getGlobalHeight(mesh.position.x, mesh.position.z);
        // Player origin is at feet. If y is close to groundH, we are grounded.
        // Tolerance: 0.2
        if (Math.abs(mesh.position.y - groundH) < 0.3) {
            return true;
        }
    }

    // 2. Check Objects (Bridges, Platforms) via Raycast
    const raycaster = new THREE.Raycaster(mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), new THREE.Vector3(0, -1, 0), 0, 2.0);

    const interactables = world.interactables || [];
    const interactableMeshes = interactables.map(i => i.mesh || i).filter(i => i.isObject3D);

    // Only check interactables/structures, not terrain chunks (already checked above)
    const objects = [...interactableMeshes].filter(o => o);

    if (objects.length > 0) {
        const intersects = raycaster.intersectObjects(objects, true);
        return intersects.length > 0;
    }

    return false;
}

checkWall() {
    const mesh = this.mesh;
    const world = this.world;
    if (!mesh || !world) return false;
    const forward = this.getForwardVector();
    const raycaster = new THREE.Raycaster(mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), forward, 0, 1.0);

    const interactables = world.interactables || [];
    const interactableMeshes = interactables.map(i => i.mesh || i).filter(i => i.isObject3D);

    const intersects = raycaster.intersectObjects(interactableMeshes);
    return intersects.length > 0;
}
}
