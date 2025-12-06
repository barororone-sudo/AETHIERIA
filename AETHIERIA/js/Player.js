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
// @ts-ignore
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// @ts-ignore
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ToonMaterial } from './materials/ToonMaterial.js';
import { generateCharacter } from './character.js';

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

        this.hp = 60;
        this.maxHp = 60;

        this.isInvincible = false;

        // Procedural Character Data
        this.characterData = generateCharacter();
        this.applyCharacterData();

        this.stats = {
            attack: this.characterData.stats.atk,
            defense: this.characterData.stats.def
        };

        // Inventory
        this.inventory = new InventoryManager(this);

        // State Machine
        this.state = 'IDLE';
        this.stamina = 100;
        this.maxStamina = 100;
        this.exhausted = false;
        this.staminaRegenRate = 10;
        this.staminaDrainRates = {
            SPRINT: 15,
            GLIDE: 8, // Balanced: ~12s flight time
            CLIMB: 15,
            SURF: 5,
            SWIM: 10
        };
        this.lastStaminaUseTime = 0;

        // Game Feel Variables
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.rotationVelocity = 0; // For tilt
        this.cameraLagPos = new THREE.Vector3(); // Virtual target
        this.baseFov = 75;
        this.targetFov = 75;

        this.lastJumpTime = 0;
        this.stepTimer = 0;
        this.lastGenTime = 0; // Debounce for scroll wheel
        this.hasReleasedJump = true;
        this.jumpTapCount = 0;
        this.canGlide = true; // Enabled by default for testing
        this.canSurf = true;

        // Camera State
        this.cameraState = {
            distance: 5,
            theta: Math.PI, // Behind player
            phi: Math.PI / 3, // 60 degrees down
            target: new THREE.Vector3()
        };

        // Combat System
        /** @type {Combat} */ this.combat = new Combat(this);
        this.swordTrail = null;

        // Audio & Input
        this.audio = game.audio || null;
        this.inputLocked = false;
        this.isInTutorial = false; // Flag for tutorial limitations

        // Register Input Callbacks
        this.input.onToggleMap = () => {
            if (this.isInTutorial) {
                if (this.game.ui) this.game.ui.showToast("Carte indisponible pendant le tutoriel.");
                return;
            }
            if (this.game.ui && this.game.ui.mapManager) {
                this.game.ui.mapManager.toggleMap();
            }
        };

        // Timers
        this.hitStopTimer = 0;
        /** @type {number} */ this.shakeTimer = 0;
        /** @type {number} */ this.shakeIntensity = 0;

        // Abilities
        // this.canGlide = false; // REMOVED duplicate
        /** @type {boolean} */ this.canSurf = true;

        /** @type {number} */ this.VISUAL_OFFSET_Y = 0.0;

        // Visuals (Initialized in initVisuals)
        /** @type {THREE.Group|null} */ this.mesh = null;
        /** @type {THREE.Group|null} */ this.weaponSlot = null; // Weapon Attachment
        /** @type {THREE.Group|null} */ this.shieldGroup = null; // Shield Attachment

        /** @type {SwordTrail|null} */ this.swordTrail = null;

        // Give starter items
        this.inventory.addItem('sword_iron', 1);
        this.inventory.addItem('potion_health', 5);

        // Attack Animation State
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackDuration = 0.3;
        this.currentComboIndex = 0;

        this.initInput();
        this.initUI(); // Now binds character data
        this.initPhysics();
        this.initVisuals();

        // Initialize Combat (after visuals)
        if (this.combat) this.combat.init();
    }

    /**
     * @param {number} amount
     */
    takeDamage(amount) {
        if (this.isInvincible) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            // TODO: Game Over logic
            console.log("Player Died!");
        }

        // Visual Feedback
        if (this.game.ui) this.game.ui.update(this);
        this.screenShake(0.5, 0.2);
    }

    initInput() {
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.cameraState.theta -= e.movementX * 0.002;
                this.cameraState.phi -= e.movementY * 0.002;
                // Clamp phi to avoid flipping
                this.cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraState.phi));
            }
        });

        document.addEventListener('mousedown', (e) => {
            // Check if Map is Open - If so, DO NOT LOCK POINTER
            if (this.game.ui && this.game.ui.mapManager && this.game.ui.mapManager.isBigMap) {
                return;
            }

            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock().catch(e => {
                    if (e.name === 'SecurityError') return; // Ignore benign security errors (fast toggle)
                    console.warn("Pointer Lock failed/cancelled:", e);
                });
            } else {
                if (e.button === 0) { // Left Click
                    this.combat.attack();
                } else if (e.button === 2) { // Right Click
                    this.combat.toggleAim();
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (document.pointerLockElement === document.body) {
                if (e.button === 2) { // Right Click Release
                    if (this.combat.isAiming) this.combat.toggleAim();
                }
            }
        });

        // Scroll Wheel to Generate Variant
        document.addEventListener('wheel', (e) => {
            if (Date.now() - this.lastGenTime < 200) return; // Debounce
            this.lastGenTime = Date.now();

            this.characterData = generateCharacter();
            this.applyCharacterData();
            this.initVisuals();

            console.log("New Variant Generated:", this.characterData.name);
        });
    }

    initPhysics() {
        if (!this.world) return;
        // Sphere shape for smoother movement
        const radius = 0.5;
        const shape = new CANNON.Sphere(radius);

        // Material
        const material = this.world.slipperyMaterial || new CANNON.Material('player');

        this.body = new CANNON.Body({
            mass: 60, // kg
            material: material,
            shape: shape,
            linearDamping: 0.1, // Lower damping for smoother movement (was 0.9)
            angularDamping: 0.9,
            fixedRotation: true // Prevent tipping over
        });

        this.body.position.set(0, 50, 0); // SAFE SPAWN HIGH UP

        // FIX: Enable CCD (Continuous Collision Detection) to prevent tunneling at high speeds
        this.body.ccdSpeedThreshold = 1;
        this.body.ccdIterations = 10;

        this.world.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        if (!this.world) return;

        // Cleanup existing
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            // Traverse and dispose geometry/materials
            this.mesh.traverse((child) => {
                // @ts-ignore
                if (child.isMesh) {
                    // @ts-ignore
                    if (child.geometry) child.geometry.dispose();
                    // @ts-ignore
                    if (child.material) {
                        // @ts-ignore
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        // @ts-ignore
                        else child.material.dispose();
                    }
                }
            });
        }

        this.mesh = new THREE.Group();
        this.world.scene.add(this.mesh);

        // --- PALETTE ---
        const cPrimary = new THREE.Color(this.characterData.palette[1]); // Dark Body
        const cSecondary = new THREE.Color(this.characterData.palette[0]); // Light Armor
        const cAccent = new THREE.Color(this.characterData.palette[2]); // Neon

        const matBody = new THREE.MeshStandardMaterial({ color: cPrimary, roughness: 0.7, metalness: 0.5 });
        const matArmor = new THREE.MeshStandardMaterial({ color: cSecondary, roughness: 0.5, metalness: 0.7 });
        const matJoint = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }); // Dark Grey Joints
        const matNeon = new THREE.MeshStandardMaterial({ color: cAccent, emissive: cAccent, emissiveIntensity: 2.0 });

        // --- 1. TORSO (Root of Body) ---
        // Torso Group
        this.bodyMesh = new THREE.Group();
        this.bodyMesh.position.y = 0.95; // Hip height
        this.mesh.add(this.bodyMesh);

        // Torso Geometry
        const torsoGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
        const torso = new THREE.Mesh(torsoGeo, matBody);
        torso.position.y = 0.25; // Sit on top of hips
        torso.castShadow = true;
        this.bodyMesh.add(torso);

        // Chest Plate (Armor)
        const chestGeo = new THREE.BoxGeometry(0.42, 0.3, 0.27);
        const chest = new THREE.Mesh(chestGeo, matArmor);
        chest.position.y = 0.35;
        torso.add(chest);

        // Core (Neon Heart)
        const coreGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const core = new THREE.Mesh(coreGeo, matNeon);
        core.position.set(0, 0.35, 0.15);
        torso.add(core);

        // --- 2. HEAD ---
        this.head = new THREE.Group();
        this.head.position.set(0, 0.55, 0); // Neck
        this.bodyMesh.add(this.head);

        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMesh = new THREE.Mesh(headGeo, matBody);
        headMesh.position.y = 0.15; // Pivot at base of neck
        headMesh.castShadow = true;
        this.head.add(headMesh);

        // Visor
        const visorGeo = new THREE.BoxGeometry(0.25, 0.08, 0.05);
        const visor = new THREE.Mesh(visorGeo, matNeon);
        visor.position.set(0, 0.15, 0.16); // Front of face
        this.head.add(visor);

        // --- 3. ARMS ---
        const armW = 0.12;
        const armL = 0.35;
        const armD = 0.12;

        // LEFT ARM
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.28, 0.45, 0); // Shoulder
        this.bodyMesh.add(this.leftArm);

        const lUpperGeo = new THREE.BoxGeometry(armW, armL, armD);
        const lUpper = new THREE.Mesh(lUpperGeo, matArmor);
        lUpper.position.y = -armL / 2;
        lUpper.castShadow = true;
        this.leftArm.add(lUpper);

        // Left Forearm
        this.leftForeArm = new THREE.Group();
        this.leftForeArm.position.y = -armL; // Elbow
        this.leftArm.add(this.leftForeArm);

        const lLowerGeo = new THREE.BoxGeometry(armW * 0.8, armL * 0.9, armD * 0.8);
        const lLower = new THREE.Mesh(lLowerGeo, matBody);
        lLower.position.y = -armL * 0.45;
        lLower.castShadow = true;
        this.leftForeArm.add(lLower);

        // Left Hand (Invisible Anchor)
        this.leftHand = new THREE.Group();
        this.leftHand.position.y = -armL * 0.9;
        this.leftForeArm.add(this.leftHand);

        // RIGHT ARM
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.28, 0.45, 0); // Shoulder
        this.bodyMesh.add(this.rightArm);

        const rUpperGeo = new THREE.BoxGeometry(armW, armL, armD);
        const rUpper = new THREE.Mesh(rUpperGeo, matArmor);
        rUpper.position.y = -armL / 2;
        rUpper.castShadow = true;
        this.rightArm.add(rUpper);

        // Right Forearm
        this.rightForeArm = new THREE.Group();
        this.rightForeArm.position.y = -armL; // Elbow
        this.rightArm.add(this.rightForeArm);

        const rLowerGeo = new THREE.BoxGeometry(armW * 0.8, armL * 0.9, armD * 0.8);
        const rLower = new THREE.Mesh(rLowerGeo, matBody);
        rLower.position.y = -armL * 0.45;
        rLower.castShadow = true;
        this.rightForeArm.add(rLower);

        // Right Hand (Invisible Anchor)
        this.rightHand = new THREE.Group();
        this.rightHand.position.y = -armL * 0.9;
        this.rightForeArm.add(this.rightHand);

        // Weapon Slot
        this.weaponSlot = new THREE.Group();
        this.weaponSlot.rotation.x = Math.PI / 2;
        this.rightHand.add(this.weaponSlot);

        // --- 4. LEGS ---
        const legW = 0.14;
        const legL = 0.45;
        const legD = 0.14;

        // LEFT LEG
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.15, 0.0, 0); // Hip socket
        this.bodyMesh.add(this.leftLeg);

        const lThighGeo = new THREE.BoxGeometry(legW, legL, legD);
        const lThigh = new THREE.Mesh(lThighGeo, matArmor);
        lThigh.position.y = -legL / 2;
        lThigh.castShadow = true;
        this.leftLeg.add(lThigh);

        // Left Shin
        this.leftShin = new THREE.Group();
        this.leftShin.position.y = -legL; // Knee
        this.leftLeg.add(this.leftShin);

        const lShinGeo = new THREE.BoxGeometry(legW * 0.8, legL, legD * 0.8);
        const lShin = new THREE.Mesh(lShinGeo, matBody);
        lShin.position.y = -legL / 2;
        lShin.castShadow = true;
        this.leftShin.add(lShin);

        // Left Foot
        const footGeo = new THREE.BoxGeometry(0.12, 0.1, 0.2);
        this.leftFoot = new THREE.Mesh(footGeo, matJoint);
        this.leftFoot.position.set(0, -legL, 0.05); // Offset forward
        this.leftShin.add(this.leftFoot);

        // RIGHT LEG
        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.15, 0.0, 0); // Hip socket
        this.bodyMesh.add(this.rightLeg);

        const rThighGeo = new THREE.BoxGeometry(legW, legL, legD);
        const rThigh = new THREE.Mesh(rThighGeo, matArmor);
        rThigh.position.y = -legL / 2;
        rThigh.castShadow = true;
        this.rightLeg.add(rThigh);

        // Right Shin
        this.rightShin = new THREE.Group();
        this.rightShin.position.y = -legL; // Knee
        this.rightLeg.add(this.rightShin);

        const rShinGeo = new THREE.BoxGeometry(legW * 0.8, legL, legD * 0.8);
        const rShin = new THREE.Mesh(rShinGeo, matBody);
        rShin.position.y = -legL / 2;
        rShin.castShadow = true;
        this.rightShin.add(rShin);

        // Right Foot
        this.rightFoot = new THREE.Mesh(footGeo, matJoint);
        this.rightFoot.position.set(0, -legL, 0.05);
        this.rightShin.add(this.rightFoot);

        // --- 5. ATTACHMENTS ---
        // Light
        const light = new THREE.PointLight(cAccent, 2, 5);
        light.position.set(0, 1, 0);
        this.mesh.add(light);

        // Glider
        this.gliderMesh = new THREE.Group();
        this.gliderMesh.position.set(0, 0.3, -0.15); // On back
        this.gliderMesh.visible = false;

        // Pack
        const packGeo = new THREE.BoxGeometry(0.3, 0.4, 0.15);
        const packMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        const pack = new THREE.Mesh(packGeo, packMat);
        this.gliderMesh.add(pack);

        // Wings
        const wingMat = new THREE.MeshStandardMaterial({ color: cAccent, emissive: cAccent, emissiveIntensity: 3.0, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        const wingGeo = new THREE.BufferGeometry();
        const wingVerts = new Float32Array([
            0, 0, 0, -1.2, 0.2, 0.3, -0.3, -0.2, 0.2,
            0, 0, 0, -1.2, 0.2, 0.3, -0.3, 0.1, -0.1
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
        const lWing = new THREE.Mesh(wingGeo, wingMat);
        this.gliderMesh.add(lWing);
        const rWing = lWing.clone();
        rWing.scale.set(-1, 1, 1);
        this.gliderMesh.add(rWing);

        this.bodyMesh.add(this.gliderMesh);

        // Shield
        this.shieldGroup = new THREE.Group();
        const shieldGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.rotation.x = Math.PI / 2;
        this.shieldGroup.add(this.shieldMesh);
        this.shieldGroup.position.set(0, 0.1, -0.2); // On Back
        this.bodyMesh.add(this.shieldGroup);

        // Equip Weapon
        this.equipWeapon('assets/sword_iron.glb');
    }

    /**
     * @param {string} path 
     */
    equipWeapon(path) {
        if (!this.weaponSlot) return;

        // Clear existing
        while (this.weaponSlot.children.length > 0) {
            this.weaponSlot.remove(this.weaponSlot.children[0]);
        }

        const loader = new GLTFLoader();
        // @ts-ignore
        const dracoLoader = new DRACOLoader();
        // @ts-ignore
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        // @ts-ignore
        loader.setDRACOLoader(dracoLoader);

        loader.load(path, (/** @type {any} */ gltf) => {
            const sword = gltf.scene;
            sword.rotation.x = -Math.PI / 2; // Common fix

            sword.traverse((/** @type {THREE.Object3D} */ child) => {
                if (/** @type {THREE.Mesh} */(child).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (this.weaponSlot) this.weaponSlot.add(sword);
            // @ts-ignore
            dracoLoader.dispose();
        });
    }

    applyCharacterData() {
        this.hp = this.characterData.stats.hp;
        this.maxHp = this.characterData.stats.hp;
        this.maxStamina = this.characterData.stats.stamina;
        this.stamina = this.maxStamina;
    }

    initUI() {
        // Deprecated: UI is managed by UIManager
        // Character generation is now handled via Scroll Wheel
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        if (!this.mesh || !this.body) return 1;

        // Interaction (E Key)
        if (this.input.keys.interact) {
            // Prevent new interaction if dialogue is open
            if (this.game.dialogueManager && this.game.dialogueManager.isActive) {
                // Let DialogueManager handle the input in its update()
                this.input.keys.interact = false; // Consume key to prevent stuck state
                return;
            }

            console.log("Player: Interact Key Pressed");
            if (this.world) {
                console.log("Player: Requesting Interactable from World...");
                const target = this.world.getClosestInteractable(this.mesh.position, 5.0);
                if (target) {
                    console.log("Player: Interactable Found:", target);
                    if (typeof target.interact === 'function') {
                        target.interact();
                    } else if (target.userData && typeof target.userData.interact === 'function') {
                        target.userData.interact();
                    } else {
                        console.warn("Player: Target has no interact method", target);
                    }
                } else {
                    console.log("Player: No interactable in range (3.0)");
                }
            }
            this.input.keys.interact = false; // Debounce
        }

        // PANIC BUTTON (P)
        if (this.game.input.keys.p) {
            this.body.position.set(0, 50, 0);
            this.body.velocity.set(0, 0, 0);
            this.state = 'AIR';
            this.body.wakeUp();
        }

        // --- SANITY CHECK (ANTI-CRASH) ---
        this.checkSanity("Start of Update");

        // Debug Logging (Every 1s)
        if (!this.debugTimer) this.debugTimer = 0;
        if (typeof dt !== 'number' || isNaN(dt)) {
            console.warn("Invalid dt in Player.update:", dt);
            dt = 0.016;
        }

        // Debug Logging (Every 1s)
        if (!this.debugTimer) this.debugTimer = 0;
        this.debugTimer += dt;
        if (this.debugTimer > 1.0) {
            this.debugTimer = 0;
            // console.log(`[PLAYER DEBUG] State: ${this.state}, Pos: ${this.body.position.y.toFixed(2)}, VelY: ${this.body.velocity.y.toFixed(2)}, Grounded: ${this.checkGround()}`);
        }

        // Hit Stop
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return 0.01; // Slow motion
        }

        // Screen Shake Decay
        if ((this.shakeTimer || 0) > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        this.checkGround();
        this.updateStamina(dt);

        this.handleState(dt);
        this.checkSanity("After handleState");

        this.updatePhysics(dt);
        this.checkSanity("After updatePhysics");

        this.updateVisuals(dt);
        this.checkSanity("After updateVisuals");

        this.updateCamera(dt);
        this.checkSanity("After updateCamera");

        this.updateUI();

        if (this.combat) this.combat.update(dt);

        // Bullet Time (Aiming in Air)
        if (this.state === 'AIR' && this.combat && this.combat.isAiming) {
            this.stamina -= dt * 10;
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.combat.isAiming = false;
                return 1.0;
            }
            return 0.05; // SLOW MOTION
        }

        return 1;
    }

    /**
     * @param {number} dt
     */
    updateStamina(dt) {
        let draining = false;

        // @ts-ignore
        if (['SPRINT', 'GLIDE', 'CLIMB', 'SURF'].includes(this.state)) {
            draining = true;
            // @ts-ignore
            this.stamina -= this.staminaDrainRates[this.state] * dt;
        } else if (this.state === 'SWIM' && this.input.keys.sprint) {
            draining = true;
            this.stamina -= this.staminaDrainRates.SWIM * dt;
        }

        if (draining) {
            this.lastStaminaUseTime = Date.now();
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.exhausted = true;
                // Force exit state
                if (this.state === 'CLIMB' || this.state === 'GLIDE') this.state = 'AIR';
                if (this.state === 'SURF') { this.exitSurf(); this.state = 'IDLE'; }
                if (this.state === 'SPRINT') this.state = 'RUN';
            }
        } else {
            // Regen
            if (this.exhausted) {
                this.stamina += this.staminaRegenRate * dt;
                if (this.stamina > this.maxStamina * 0.25) {
                    this.exhausted = false;
                }
            } else {
                if (Date.now() - this.lastStaminaUseTime > 1000) {
                    this.stamina += this.staminaRegenRate * dt;
                }
            }
        }
        this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina));
    }

    checkWall() {
        if (!this.mesh) return false;
        // Raycast from chest height (approx center of body)
        // Mesh is shifted down 0.5, so mesh.y + 1.0 is top of head.
        // Let's lower it to mesh.y + 0.5 (Center of body)
        const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        const forward = this.getForwardVector();
        // Increase length to ensure we hit the wall even if physics keeps us slightly away
        // Reduced from 2.0 to 1.0 to prevent false positives (stuck in air)
        const raycaster = new THREE.Raycaster(rayOrigin, forward, 0, 1.0);

        if (this.world && this.world.terrainManager && this.world.terrainManager.group) {
            const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
            if (intersects.length > 0) {
                // console.log("Wall Ray Hit:", intersects[0].object.name, intersects[0].distance);
                if (intersects[0].face) {
                    const normal = intersects[0].face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(intersects[0].object.matrixWorld)).normalize();
                    // console.log("Wall Normal Y:", normal.y);
                    if (Math.abs(normal.y) < 0.5) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkLedge() {
        if (!this.mesh) return null;

        // Raycast Definitions
        const forward = this.getForwardVector();
        const kneePos = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)); // Knee/Waist
        const headPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)); // Head

        const rayDist = 1.0; // Check 1m ahead

        let kneeHit = false;
        let headHit = false;
        let wallObject = null;
        let wallHeight = 0;

        if (this.world && this.world.terrainManager) {
            // Check Low
            const rayLow = new THREE.Raycaster(kneePos, forward, 0, rayDist);
            const hitsLow = rayLow.intersectObjects(this.world.terrainManager.group.children, true);
            if (hitsLow.length > 0) {
                kneeHit = true;
                wallObject = hitsLow[0].object;
            }

            // Check High
            const rayHigh = new THREE.Raycaster(headPos, forward, 0, rayDist);
            const hitsHigh = rayHigh.intersectObjects(this.world.terrainManager.group.children, true);
            if (hitsHigh.length > 0) {
                headHit = true;
            }
        }

        // MANTLE CONDITION: Knee hit but Head clear (Ledge)
        if (kneeHit && !headHit && wallObject && this.world && this.world.terrainManager && this.world.terrainManager.group) {
            // Find EXACT ledge height (raycast down from above)
            // Start ray 1.8m up, 1m forward, look DOWN
            const ledgeCheckOrigin = this.mesh.position.clone().addScaledVector(forward, 0.8).add(new THREE.Vector3(0, 2.5, 0));
            const rayDown = new THREE.Raycaster(ledgeCheckOrigin, new THREE.Vector3(0, -1, 0), 0, 3.0);
            const hitsDown = rayDown.intersectObjects(this.world.terrainManager.group.children, true);

            if (hitsDown.length > 0) {
                return { type: 'LEDGE', height: hitsDown[0].point.y };
            }
        }

        return null; // No ledge
    }

    unlockGlider() {
        this.canGlide = true;
        if (this.game.ui) this.game.ui.showToast("Paravoile Débloquée !");
    }

    /**
     * @param {number} dt
     */
    handleState(dt) {
        const grounded = this.checkGround();
        const input = this.getInputVector();
        const speed = input.length();

        // Universal Water Check
        if (this.mesh && this.mesh.position.y < 1.3 && !grounded && this.state !== 'SWIM') {
            this.state = 'SWIM';
        }

        switch (this.state) {
            case 'IDLE':
            case 'WALK':
            case 'RUN':
            case 'SPRINT':
                if (!grounded) {
                    this.state = 'AIR';
                } else if (this.input.keys.jump && !this.exhausted) {
                    this.body.velocity.y = 15; // Adjusted Jump Height (Was 22)
                    this.state = 'AIR';
                    this.lastJumpTime = Date.now();
                    this.hasReleasedJump = false; // Prevent instant glide activation
                } else if (this.input.keys.crouch) {
                    // Enter Guard
                    this.state = 'GUARD';
                } else {
                    if (speed > 0.1) {
                        if (this.input.keys.sprint && !this.exhausted) {
                            this.state = 'SPRINT';
                        } else {
                            this.state = 'RUN';
                        }
                    } else {
                        // Safe Idling
                        this.state = 'IDLE';
                    }
                }
                break;

            case 'GUARD':
                // Exit Guard if Crouch released OR moving fast OR Jumping
                if (!this.input.keys.crouch || speed > 1.0 || this.input.keys.jump) {
                    this.state = 'IDLE';
                }
                break;

            case 'AIR':
                if (!this.input.keys.jump) this.hasReleasedJump = true;

                // Read Tap Count
                const taps = this.input.jumpTapCount;

                // Double Tap -> Glide (Restored)
                if (taps === 2 && this.canGlide && !this.exhausted) {
                    // SAFETY CHECK: Prevent ground activation (which causes blue screen/clipping)
                    let safeToGlide = true;
                    if (this.mesh && this.world && this.world.terrainManager) {
                        const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                        // STRICTER: Require 5m clearance to prevent ground clipping
                        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 5.0);
                        const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
                        if (intersects.length > 0) {
                            safeToGlide = false;
                        }
                    }

                    if (safeToGlide) {
                        this.enterGlide();
                    }
                }
                // Single Press High Air -> Glide (Restored)
                else if (this.input.keys.jump && this.canGlide && !this.exhausted && this.hasReleasedJump) {
                    // Check Height
                    if (this.mesh && this.world && this.world.terrainManager && this.world.terrainManager.group) {
                        const rayOrigin = this.mesh.position.clone();
                        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 100); // Check down
                        const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);

                        // If ground is far enough (> 5m)
                        if (intersects.length > 0 && intersects[0].distance > 5.0) {
                            this.enterGlide();
                        } else if (intersects.length === 0) {
                            // No ground found (void) -> Glide allowed - DISABLED FOR DEBUGGING
                            // this.enterGlide(); 
                        }
                    }
                } // Closes else if (jump...)
                // Triple Tap -> Surf
                else if (taps === 3 && this.canSurf && !this.exhausted) {
                    this.state = 'SURF';
                    this.enterSurf();
                    this.input.jumpTapCount = 0; // Consume
                }

                // Landing Assist: Force down if close to ground but not grounded yet
                if (this.mesh && this.world && this.world.terrainManager && this.world.terrainManager.group && this.body.velocity.y < 0 && this.body.velocity.y > -5) {
                    // Simple raycast check for "almost grounded"
                    const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 1.5); // Check slightly further than checkGround
                    const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
                    if (intersects.length > 0) {
                        this.body.velocity.y = -5; // Force landing
                    }
                }

                if (grounded && this.body.velocity.y <= 0) {
                    this.state = 'IDLE';
                } else if (this.input.keys.crouch) {
                    // FIX: Prevent accidental DIVE immediately after jump (causes clipping)
                    if (Date.now() - this.lastJumpTime > 400) {
                        this.state = 'DIVE';
                    }
                } else if (this.input.keys.forward && !this.exhausted && this.checkWall()) {
                    this.state = 'CLIMB';
                    this.body.velocity.set(0, 0, 0);
                }
                break;

            case 'DIVE':
                if (grounded) {
                    this.state = 'IDLE';
                    this.screenShake(0.5, 0.2); // Impact
                } else if (!this.input.keys.crouch) {
                    this.state = 'AIR';
                }
                break;

            case 'GLIDE':
                if (!this.input.keys.jump) this.hasReleasedJump = true;

                if (grounded || (this.input.keys.jump && this.hasReleasedJump) || this.exhausted) {
                    this.state = grounded ? 'IDLE' : 'AIR';
                    this.lastJumpTime = Date.now();
                    this.hasReleasedJump = false;
                } else if (this.input.keys.crouch) {
                    this.state = 'DIVE';
                }
                break;

            case 'CLIMB':
                if (this.exhausted || this.input.keys.jump) {
                    this.state = 'AIR';
                    if (this.input.keys.jump) {
                        this.body.velocity.y = 6;
                        this.body.velocity.addScaledVector(this.getForwardVector(), -4);
                    }
                }
                break;

            case 'SWIM':
                if (this.mesh && this.mesh.position.y >= 1.3) {
                    // Exit water: Go to IDLE if grounded, otherwise AIR
                    this.state = grounded ? 'IDLE' : 'AIR';
                }
                break;

            case 'SURF':
                this.handleSurfState(dt);
                break;
        }
    }

    enterGlide() {
        console.log("Entering Glide...");
        this.state = 'GLIDE';
        this.input.jumpTapCount = 0; // Consume

        // Air Brake
        if (!this.body) { console.error("No Body in enterGlide"); return; }

        if (isNaN(this.body.velocity.y)) {
            console.warn("NaN Velocity Y in enterGlide. Resetting.");
            this.body.velocity.y = 0;
        }
        this.body.velocity.y = Math.max(this.body.velocity.y, -1.0);
        this.body.angularVelocity.set(0, 0, 0); // Stop spinning

        // Align rotation to camera/input immediately if moving
        const input = this.getInputVector();
        console.log("Glide Input:", input);

        if (input.length() > 0) {
            const angle = Math.atan2(input.x, input.z);
            if (!isNaN(angle)) {
                const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.body.quaternion.copy(q);
            } else {
                console.error("NaN Angle in enterGlide");
            }
        }

        this.hasReleasedJump = false;
    }

    /**
     * @param {number} dt
     */
    handleSurfState(dt) {
        if (!this.input.keys.jump) this.hasReleasedJump = true;

        // Exit Conditions:
        // 1. Jump (Ollie out)
        if (this.input.keys.jump && this.hasReleasedJump) {
            this.exitSurf();
            this.state = 'AIR';
            this.body.velocity.y = 8;
            this.input.jumpTapCount = 0;
            this.hasReleasedJump = false;
        }
        // 2. Stop (Speed too low)
        else if (this.checkGround() && this.body.velocity.length() < 0.5) {
            this.exitSurf();
            this.state = 'IDLE';
        }
        // 3. Manual Cancel (Crouch Toggle)
        else if (this.input.keys.crouch) {
            this.exitSurf();
            this.state = 'IDLE';
        }
    }

    enterSurf() {
        if (this.mesh && this.shieldGroup && this.shieldMesh) {
            this.mesh.attach(this.shieldGroup); // Parent to root
            // this.shieldGroup.position.set(0, -0.5, 0); 
            this.shieldGroup.position.set(0, 0.2, 0);
            this.shieldGroup.rotation.set(0, 0, 0);

            // Make it bigger
            this.shieldMesh.scale.set(1.5, 1, 1.5);
        }
    }

    exitSurf() {
        // Move shield to back
        if (this.shieldGroup && this.mesh && this.shieldMesh) {
            this.mesh.attach(this.shieldGroup);
            this.shieldGroup.position.set(0, 1.0, -0.3);
            this.shieldGroup.rotation.set(Math.PI / 2, 0, 0); // Adjust rotation if needed
            this.shieldMesh.scale.set(1, 1, 1); // Reset scale
        }
    }

    /**
     * @param {number} dt
     */
    updatePhysics(dt) {
        if (!this.mesh || !this.body) return;

        this.body.wakeUp(); // Prevent sleeping (stuck in air fix)

        // 1. Combat Lock
        if (this.combat && this.combat.isAttacking) {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
            this.mesh.position.copy(this.body.position);
            this.mesh.position.y -= 0.5;
            return;
        }

        const input = this.getInputVector();
        const inputLen = input.length();
        const grounded = this.checkGround();
        let moveDir = input.clone().normalize();

        // Default Damping
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.9;

        switch (this.state) {
            case 'GUARD':
                this.body.velocity.set(0, 0, 0);
                this.body.linearDamping = 1.0; // Max damping
                break;

            case 'AIR':
                // Extra Gravity (Removed to rely on physics engine)
                // this.body.velocity.y -= 10 * dt; 

                // Terminal Velocity Clamp (Prevent falling through map)
                if (this.body.velocity.y < -30) {
                    this.body.velocity.y = -30;
                }

                // GROUND SAFETY CHECK
                // If we are falling fast, do a raycast down to predict collision
                if (this.body.velocity.y < -10) {
                    const raycaster = new THREE.Raycaster(this.mesh.position, new THREE.Vector3(0, -1, 0), 0, Math.abs(this.body.velocity.y * dt) + 1.0);
                    if (this.world && this.world.terrainManager) {
                        const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
                        if (intersects.length > 0) {
                            // About to hit ground, clamp position
                            this.body.position.y = intersects[0].point.y + 1.0;
                            this.body.velocity.y = 0;
                            this.state = 'IDLE';
                        }
                    }
                }

                // Air Control
                // Gravity Adjustment (Floatier Fall)
                this.body.velocity.y -= 15 * dt; // Gravity (User Request: -15)

                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 5;
                    this.body.velocity.z += input.z * dt * 5;

                    // CHECK FOR MANTLE (Zelda Logic)
                    // If moving forward into a wall in mid-air
                    if (this.body.velocity.y < 5) { // Only when falling or peak jump
                        const ledge = this.checkLedge();
                        if (ledge) {
                            // "Pop" up to ledge
                            const targetY = ledge.height + 1.2; // Stand on top

                            // Simple teleport/boost for now (Animation would be better)
                            if (Math.abs(this.mesh.position.y - targetY) < 2.5) {
                                this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, targetY, 0.5);
                                this.body.velocity.y = 5; // Little hop up
                                this.body.velocity.addScaledVector(this.getForwardVector(), 5); // Push forward
                                this.state = 'AIR'; // Stay air until grounded
                            }
                        }
                    }
                }
                break;

            case 'DIVE':
                // Fast Fall
                this.body.velocity.y = -50; // Force constant fast fall
                this.body.linearDamping = 0.0;

                // Reduced Air Control
                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 10; // Slightly more control to aim landing
                    this.body.velocity.z += input.z * dt * 10;
                }
                break;
            case 'GLIDE':
                // "Zelda Style" Flight Physics - PLAYER CONTROLLED

                // 1. Gravity / Lift
                const glideTerminalVelocity = -2.0;
                if (this.body.velocity.y > glideTerminalVelocity) {
                    this.body.velocity.y -= 5.0 * dt;
                } else {
                    this.body.velocity.y = glideTerminalVelocity;
                }

                // 2. Movement (Direct Input Control)
                if (inputLen > 0) {
                    // Apply velocity directly based on camera-relative input
                    this.body.velocity.x = input.x * 15;
                    this.body.velocity.z = input.z * 15;
                    // Reset Damping
                    this.body.linearDamping = 0.1;

                    // Rotation: Face direction of movement
                    const angle = Math.atan2(input.x, input.z);
                    const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                    this.body.quaternion.slerp(targetQ, 0.1);

                } else {
                    // No Input: Slide/Coast
                    // Apply High Damping to stop horizontal movement = HOVER
                    this.body.linearDamping = 0.9;
                    // No forced forward movement here!
                }

                // 3. Stabilization (Prevent twisting)
                this.body.angularVelocity.set(0, 0, 0);
                break;

            case 'SURF':
                // Logic moved to handleState to prevent conflicts
                // Only Physics (Slope sliding) remains here

                // Slope Physics
                let slopeAngle = 0;
                let onSlope = false;

                if (grounded && this.world && this.world.terrainManager) {
                    const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
                    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 2.5);
                    const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);

                    if (intersects.length > 0 && intersects[0].face) {
                        const normal = intersects[0].face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(intersects[0].object.matrixWorld)).normalize();
                        // Angle between UP (0,1,0) and Normal
                        slopeAngle = normal.angleTo(new THREE.Vector3(0, 1, 0)) * (180 / Math.PI);
                        onSlope = true;

                        // Gravity Slide
                        // Project gravity onto slope
                        const gravity = new THREE.Vector3(0, -20, 0);
                        const slideForce = gravity.clone().projectOnPlane(normal);
                        this.body.velocity.x += slideForce.x * dt;
                        this.body.velocity.z += slideForce.z * dt;
                    }
                }

                if (slopeAngle < 10) {
                    // Flat ground: High Friction (Stop)
                    this.body.linearDamping = 0.8;
                } else {
                    // Slope: Low Friction (Slide)
                    this.body.linearDamping = 0.01;
                }

                // Input Steering (only slight influence)
                if (inputLen > 0) {
                    const surfDir = input.clone().normalize();
                    this.body.velocity.x += surfDir.x * dt * 5;
                    this.body.velocity.z += surfDir.z * dt * 5;
                }
                break;

            case 'CLIMB':
                this.body.velocity.set(0, 0, 0); // Defy gravity
                const climbSpeed = 3;
                if (this.input.keys.forward) this.body.velocity.y = climbSpeed;
                if (this.input.keys.backward) this.body.velocity.y = -climbSpeed;
                if (this.input.keys.left) {
                    const left = this.getForwardVector().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                    this.body.velocity.x = left.x * climbSpeed;
                    this.body.velocity.z = left.z * climbSpeed;
                }
                if (this.input.keys.right) {
                    const right = this.getForwardVector().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                    this.body.velocity.x = right.x * climbSpeed;
                    this.body.velocity.z = right.z * climbSpeed;
                }
                break;

            case 'SWIM':
                this.body.linearDamping = 0.8; // Viscous
                this.body.velocity.y += 10 * dt; // Buoyancy
                if (this.mesh.position.y > 1.3) this.body.velocity.y = Math.min(0, this.body.velocity.y);

                if (inputLen > 0) {
                    const swimSpeed = this.input.keys.sprint ? 8 : 4;
                    this.body.velocity.x += input.x * dt * swimSpeed * 2;
                    this.body.velocity.z += input.z * dt * swimSpeed * 2;
                }
                break;

            case 'SPRINT':
            case 'RUN':
            case 'WALK':
            case 'IDLE':
                // Ground Movement
                let targetSpeed = 8;
                if (this.state === 'RUN') targetSpeed = 12;
                if (this.state === 'SPRINT') targetSpeed = 18;

                const accel = (this.state === 'IDLE') ? 25.0 : 10.0;
                this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed * inputLen, dt * accel);

                // Slope Handling
                if (grounded && this.world && this.world.terrainManager) {
                    const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
                    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 2.5);
                    const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);

                    if (intersects.length > 0 && intersects[0].face) {
                        const groundNormal = intersects[0].face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(intersects[0].object.matrixWorld)).normalize();
                        moveDir.projectOnPlane(groundNormal).normalize();
                    }
                }

                if (inputLen > 0.1) {
                    this.body.velocity.x = moveDir.x * this.currentSpeed;
                    this.body.velocity.z = moveDir.z * this.currentSpeed;
                } else if (grounded) {
                    // Force Stop (No Sliding)
                    this.body.velocity.x = 0;
                    this.body.velocity.z = 0;
                    this.currentSpeed = 0;
                }

                // Gravity on slopes/edges if not fully grounded but in ground state
                if (!grounded) {
                    this.body.velocity.y -= 10 * dt;
                }
                break;
        }

        // Rotation
        if (inputLen > 0.1) {
            const targetRot = Math.atan2(input.x, input.z);
            let currentRot = this.mesh.rotation.y;
            let diff = targetRot - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * dt * 15;
        }

        // Sync Mesh
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 0.5;
    }

    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        if (!this.mesh) return;

        // Smooth Time for animations
        const time = Date.now() * 0.01;

        let targetRotX = 0;
        let targetRotY = 0;
        let targetRotZ = 0;
        let targetPosY = 0.95; // Base Hip Height

        // Reset Limbs (Lerp targets)
        let lArmRot = { x: 0, y: 0, z: 0 }; // Left Shoulder
        let rArmRot = { x: 0, y: 0, z: 0 }; // Right Shoulder
        let lLegRot = { x: 0, y: 0, z: 0 }; // Left Hip
        let rLegRot = { x: 0, y: 0, z: 0 }; // Right Hip
        let lKneeRot = 0;
        let rKneeRot = 0;
        let lElbowRot = -0.1; // Slight natural bend
        let rElbowRot = -0.1;

        const lerpFactor = dt * 10;

        // SURF Check (Shield)
        if (this.state !== 'SURF' && this.shieldGroup && this.shieldGroup.parent !== this.bodyMesh && this.bodyMesh) {
            this.bodyMesh.add(this.shieldGroup);
            this.shieldGroup.position.set(0, 0.1, -0.2);
            this.shieldGroup.rotation.set(0, 0, 0);
        }

        // State Machine for Visuals
        switch (this.state) {
            case 'GLIDE':
                targetRotX = 0.5; // Lean forward
                targetPosY = 0.95;

                // T-Pose / Superman
                lArmRot.z = 0.2; // Wings out
                rArmRot.z = -0.2;
                lArmRot.x = -1.5; // Forward
                rArmRot.x = -1.5;

                // Legs drag
                lLegRot.x = 0.5;
                rLegRot.x = 0.5;

                if (this.gliderMesh) this.gliderMesh.visible = true;
                break;

            case 'DIVE':
                targetRotX = -1.5; // Head down
                targetPosY = 0.95;

                // Streamline
                lArmRot.x = -3.0; // Up (relative to body)
                rArmRot.x = -3.0;
                break;

            case 'SURF':
                targetRotY = -Math.PI / 2; // Sideways
                targetRotX = -0.2;
                targetPosY = 0.7; // Low

                // Balance
                lArmRot.z = 1.0;
                rArmRot.z = -0.5;
                lLegRot.x = 0.5; // Bent
                rLegRot.x = -0.5;

                // Shield Logic
                if (this.shieldGroup && this.shieldGroup.parent !== this.mesh) {
                    this.mesh.attach(this.shieldGroup);
                    this.shieldGroup.position.set(0, -0.9, 0); // Under feet
                    this.shieldGroup.rotation.set(0, 0, 0);
                }
                break;

            case 'RUN':
            case 'WALK':
                targetRotX = Math.min(this.currentSpeed * 0.05, 0.2); // Lean
                targetPosY = 0.95 + Math.sin(time * 2) * 0.02; // Bob

                // Walk Cycle
                const runSpeed = this.currentSpeed * 1.5;
                const legAmp = this.state === 'RUN' ? 1.0 : 0.6;
                const armAmp = this.state === 'RUN' ? 1.2 : 0.6;

                // Legs (Antiphase)
                lLegRot.x = Math.cos(time * runSpeed) * legAmp;
                rLegRot.x = Math.cos(time * runSpeed + Math.PI) * legAmp;

                // Knees (Simple bob)
                lKneeRot = Math.abs(Math.sin(time * runSpeed)) * legAmp;
                rKneeRot = Math.abs(Math.sin(time * runSpeed + Math.PI)) * legAmp;

                // Arms (Opposite to Legs)
                lArmRot.x = Math.cos(time * runSpeed + Math.PI) * armAmp;
                rArmRot.x = Math.cos(time * runSpeed) * armAmp;
                lArmRot.z = 0.1; // Clear body
                rArmRot.z = -0.1;

                lElbowRot = -1.5; // Fixed running arms? Or dynamic?
                if (this.state === 'WALK') {
                    lElbowRot = -0.2;
                    rElbowRot = -0.2;
                } else {
                    lElbowRot = -1.5;
                    rElbowRot = -1.5;
                }
                break;

            case 'IDLE':
            case 'AIR':
                if (this.state === 'AIR') {
                    // Jump pose
                    lLegRot.x = 0.2;
                    rLegRot.x = -0.4; // One leg up
                    lArmRot.z = 0.5; // Balance
                    rArmRot.z = -0.5;
                } else {
                    // Breathing
                    targetPosY = 0.95 + Math.sin(time * 0.5) * 0.01;
                    lArmRot.z = 0.05 + Math.sin(time * 0.5) * 0.02;
                    rArmRot.z = -0.05 - Math.sin(time * 0.5) * 0.02;
                }
                break;
            case 'GUARD':
                targetRotX = 0;
                lArmRot.x = -0.5;
                rArmRot.x = -0.5;
                break;
        }

        // Apply Rotations (Lerp)
        if (this.bodyMesh) {
            if (this.state !== 'SURF') {
                this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, targetRotY, lerpFactor);
            } else {
                this.bodyMesh.rotation.y = targetRotY;
            }
            this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetRotX, lerpFactor);
            this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetPosY, lerpFactor);
        }

        // Limbs
        this.animateLimb(this.leftArm, lArmRot, lerpFactor);
        this.animateLimb(this.rightArm, rArmRot, lerpFactor);
        this.animateLimb(this.leftLeg, lLegRot, lerpFactor);
        this.animateLimb(this.rightLeg, rLegRot, lerpFactor);

        // Knees / Elbows (X rotation only usually)
        if (this.leftForeArm) this.leftForeArm.rotation.x = THREE.MathUtils.lerp(this.leftForeArm.rotation.x, lElbowRot, lerpFactor);
        if (this.rightForeArm) this.rightForeArm.rotation.x = THREE.MathUtils.lerp(this.rightForeArm.rotation.x, rElbowRot, lerpFactor);
        if (this.leftShin) this.leftShin.rotation.x = THREE.MathUtils.lerp(this.leftShin.rotation.x, lKneeRot, lerpFactor);
        if (this.rightShin) this.rightShin.rotation.x = THREE.MathUtils.lerp(this.rightShin.rotation.x, rKneeRot, lerpFactor);

        // Attack Overrides (Simplistic)
        if (this.isAttacking) {
            // FORCE RIGHT ARM POSITIONS FOR ATTACK
            // This prevents the walk/run cycle from overriding the attack animation
            rArmRot.x = -0.5; // Lift arm
            rArmRot.z = -0.5; // Clear body
            rElbowRot = -0.5; // Bend slightly

            // Let updateAttackVisuals handle the rest (swinging the sword/hand)
            this.updateAttackVisuals(dt);
        }
    }

    /**
     * @param {THREE.Object3D|undefined} limb 
     * @param {{x: number, y: number, z: number}} targetRot 
     * @param {number} lerp 
     */
    animateLimb(limb, targetRot, lerp) {
        if (!limb) return;
        limb.rotation.x = THREE.MathUtils.lerp(limb.rotation.x, targetRot.x, lerp);
        limb.rotation.y = THREE.MathUtils.lerp(limb.rotation.y, targetRot.y, lerp);
        limb.rotation.z = THREE.MathUtils.lerp(limb.rotation.z, targetRot.z, lerp);
    }

    /**
     * @param {number} dt
     */
    updateAttackVisuals(dt) {
        if (!this.rightHand) return;

        this.attackTimer += dt;
        const progress = Math.min(this.attackTimer / this.attackDuration, 1.0);
        const t = 1 - (1 - progress) * (1 - progress); // EaseOutQuad

        if (this.currentComboIndex === 0) {
            this.rightHand.rotation.y = THREE.MathUtils.lerp(-Math.PI / 2, Math.PI / 2, t);
            this.rightHand.position.z = 0.5 * Math.sin(t * Math.PI);
        } else if (this.currentComboIndex === 1) {
            this.rightHand.rotation.y = THREE.MathUtils.lerp(Math.PI / 2, -Math.PI / 2, t);
            this.rightHand.position.z = 0.5 * Math.sin(t * Math.PI);
        } else if (this.currentComboIndex === 2) {
            this.rightHand.rotation.x = THREE.MathUtils.lerp(-Math.PI / 4, Math.PI / 2, t);
            this.rightHand.position.y = 0.5 - t * 0.5;
        }

        if (progress >= 1.0) {
            this.isAttacking = false;
        }
    }

    /**
     * @param {number} comboIndex
     */
    triggerAttackVisuals(comboIndex) {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.currentComboIndex = comboIndex;
        this.attackDuration = (comboIndex === 2) ? 0.4 : 0.25;
    }

    /**
     * @param {string} name
     * @param {boolean} loop
     */
    playAnimation(name, loop) {
        // Placeholder for future animation system
        // Currently visuals are procedural
        if (name === 'BOW') {
            // Logic to raise arms for bow is handled in updateVisuals via isAiming check
            // But we can add a trigger here if needed
            console.log(`Playing Animation: ${name}`);
        }
    }

    /**
     * @param {THREE.Vector3} position
     * @param {string|number} color
     */
    spawnHitParticles(position, color = 0xffff00) {
        if (!this.world) return;
        const world = this.world; // Capture for closure

        const particleCount = 8;
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < particleCount; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);

            // Random spread
            mesh.position.x += (Math.random() - 0.5) * 0.5;
            mesh.position.y += (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 0.5;

            // Velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5 + 2, // Upward bias
                (Math.random() - 0.5) * 5
            );

            world.scene.add(mesh);

            // Simple animation loop for this particle
            const lifeTime = 0.5; // seconds
            let age = 0;

            const animate = () => {
                age += 0.016;
                if (age > lifeTime) {
                    world.scene.remove(mesh);
                    return;
                }

                mesh.position.add(velocity.clone().multiplyScalar(0.016));
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
                mesh.scale.multiplyScalar(0.9); // Shrink

                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    /**
     * @param {number} dt
     */
    updateCamera(dt) {
        if (!this.mesh) return;
        // Camera Target (Head level or slightly above to prevent obstruction)
        // Raised from 1.6 to 1.9 to clear player head
        const targetPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.9, 0));

        // Camera Lag
        this.cameraLagPos.lerp(targetPos, dt * 5); // Smooth follow

        // Orbit
        const dist = this.cameraState.distance;
        const theta = this.cameraState.theta;
        const phi = this.cameraState.phi;

        const x = this.cameraLagPos.x + dist * Math.sin(phi) * Math.sin(theta);
        const y = this.cameraLagPos.y + dist * Math.cos(phi);
        const z = this.cameraLagPos.z + dist * Math.sin(phi) * Math.cos(theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.cameraLagPos);

        // Camera Collision with Terrain
        if (this.world && this.world.terrainManager) {
            const camH = this.world.terrainManager.getGlobalHeight(this.camera.position.x, this.camera.position.z);
            if (this.camera.position.y < camH + 1.0) {
                const targetY = camH + 1.0;
                this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, dt * 10);
            }
        }

        // Screen Shake
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.x += rx;
            this.camera.position.y += ry;
        }

        // Dynamic FOV
        this.targetFov = (this.state === 'RUN') ? 85 : 75;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, dt * 2);
        this.camera.updateProjectionMatrix();

        // CAMERA FIX FOR GLIDE: Pull back
        if (this.state === 'GLIDE') {
            // Safety check
            if (!this.cameraState || isNaN(this.cameraState.theta)) {
                this.cameraState = {
                    distance: 10,
                    theta: 0,
                    phi: 0,
                    target: new THREE.Vector3()
                };
            }

            // Cible : Le dos du joueur
            const target = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));

            // Position Caméra : Loin derrière et en haut
            const offset = new THREE.Vector3(0, 4, 8); // Slightly closer to avoid clipping

            // Safe rotation application
            const theta = this.cameraState.theta || 0;
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);

            const targetPos = target.clone().add(offset);

            // Check for NaN BEFORE applying
            if (!isNaN(targetPos.x) && !isNaN(targetPos.y) && !isNaN(targetPos.z)) {
                this.camera.position.lerp(targetPos, dt * 3);
                this.camera.lookAt(this.mesh.position);
            } else {
                console.error("GLIDE CAMERA NAN DETECTED:", targetPos);
            }
            return;
        }
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

    updateUI() {
        if (this.game.ui) {
            this.game.ui.update(this);
        }
    }

    checkGround() {
        if (!this.world || !this.mesh) return false;
        const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        // Deepened detection (0.6 -> 0.8) to prevent floating
        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 0.8);

        // Check Terrain
        if (this.world.terrainManager && this.world.terrainManager.group) {
            const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
            if (intersects.length > 0) return true;
        }

        // Check Chunks (if separate)
        // @ts-ignore
        if (this.world.chunkManager && this.world.chunkManager.chunks) {
            // Simplify: just check terrain manager for now as chunks are usually there
        }

        return false;
    }

    getInputVector() {
        const v = new THREE.Vector3();
        if (this.inputLocked) return v;

        if (this.input.keys.forward) v.z -= 1;
        if (this.input.keys.backward) v.z += 1;
        if (this.input.keys.left) v.x -= 1;
        if (this.input.keys.right) v.x += 1;

        // Rotate by camera theta
        const theta = (this.cameraState && !isNaN(this.cameraState.theta)) ? this.cameraState.theta : 0;
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);

        return v;
    }





    getForwardVector() {
        if (!this.mesh) return new THREE.Vector3(0, 0, -1);
        const v = new THREE.Vector3(0, 0, -1);
        // Safety check for rotation
        if (!isNaN(this.mesh.rotation.y)) {
            v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        }
        return v;
    }

    /**
     * WATCHDOG: Detects and fixes NaN physics to prevent game crash (Blue Screen)
     * @param {string} label
     */
    checkSanity(label = "General") {
        if (!this.body) return;

        // Check Position
        if (this.body.position && (isNaN(this.body.position.x) || isNaN(this.body.position.y) || isNaN(this.body.position.z))) {
            console.error(`[CRITICAL] PLAYER POSITION CORRUPTED (NaN) at [${label}]. RESETTING...`);
            // Reset to safe spot
            this.body.position.set(0, 50, 0);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            if (this.mesh) this.mesh.position.copy(this.body.position);
            this.state = 'AIR';
            this.body.wakeUp(); // Ensure physics engine picks up the reset
        }

        // Check Rotation
        if (this.body.quaternion && (isNaN(this.body.quaternion.x) || isNaN(this.body.quaternion.y) || isNaN(this.body.quaternion.z) || isNaN(this.body.quaternion.w))) {
            console.error(`[CRITICAL] PLAYER ROTATION CORRUPTED (NaN) at [${label}]. RESETTING...`);
            this.body.quaternion.set(0, 0, 0, 1);
            if (this.mesh) this.mesh.rotation.set(0, 0, 0);
            this.body.wakeUp();
        }

        // Check Velocity
        if (this.body.velocity && (isNaN(this.body.velocity.x) || isNaN(this.body.velocity.y) || isNaN(this.body.velocity.z))) {
            console.error(`[CRITICAL] PLAYER VELOCITY CORRUPTED (NaN) at [${label}]. RESETTING...`);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.wakeUp();
        }
    }
}
