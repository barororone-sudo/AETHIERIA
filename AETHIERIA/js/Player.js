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
        this.isSprinting = false;

        // Game Feel Variables
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.rotationVelocity = 0; // For tilt
        this.cameraLagPos = new THREE.Vector3(); // Virtual target
        this.baseFov = 75;
        this.targetFov = 75;

        this.lastJumpTime = 0;
        this.stepTimer = 0;

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

        // Timers
        this.hitStopTimer = 0;
        /** @type {number} */ this.shakeTimer = 0;
        /** @type {number} */ this.shakeIntensity = 0;

        // Abilities
        /** @type {boolean} */ this.canGlide = true;
        /** @type {boolean} */ this.canSurf = true;

        /** @type {number} */ this.VISUAL_OFFSET_Y = 0.0;

        // Visuals (Initialized in initVisuals)
        /** @type {THREE.Group|null} */ this.mesh = null;
        /** @type {THREE.Group|null} */ this.bodyGroup = null; // Root of visuals
        /** @type {THREE.Group|null} */ this.torso = null; // Upper body (can twist)
        /** @type {THREE.Group|null} */ this.rightArmPivot = null; // Shoulder
        /** @type {THREE.Group|null} */ this.rightArm = null; // Arm
        /** @type {THREE.Group|null} */ this.hand = null; // Hand
        /** @type {THREE.Group|null} */ this.weaponSlot = null; // Weapon Attachment

        /** @type {THREE.Mesh|null} */ this.torsoMesh = null;
        /** @type {THREE.Mesh|null} */ this.headMesh = null;
        /** @type {THREE.Group|null} */ this.hairGroup = null;
        /** @type {Limb|null} */ this.armL = null; // Left arm (simple)
        /** @type {Limb|null} */ this.legL = null;
        /** @type {Limb|null} */ this.legR = null;

        /** @type {THREE.Group|null} */ this.shieldGroup = null;
        /** @type {THREE.Group|null} */ this.scarf = null;
        /** @type {THREE.Mesh|null} */ this.scarfTail1 = null;

        /** @type {SwordTrail|null} */ this.swordTrail = null;

        // Give starter items
        this.inventory.addItem('sword_iron', 1);
        this.inventory.addItem('potion_health', 5);

        // UI Elements
        // UI Elements
        // Decoupled: Managed by UIManager via this.game.ui

        this.initInput();
        this.initUI();
        this.initPhysics();
        this.initVisuals();

        // Initialize Combat (after visuals)
        if (this.combat) this.combat.init();
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
    }

    initPhysics() {
        if (!this.world) return;
        // Capsule-like shape (Cylinder)
        const radius = 0.4;
        const height = 1.8;
        const shape = new CANNON.Cylinder(radius, radius, height, 8);

        // Material
        const material = this.world.slipperyMaterial || new CANNON.Material('player');

        this.body = new CANNON.Body({
            mass: 60, // kg
            material: material,
            shape: shape,
            linearDamping: 0.9, // High damping for ground control
            angularDamping: 0.9,
            fixedRotation: true // Prevent tipping over
        });

        this.body.position.set(0, 10, 0); // Start in air
        this.world.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        if (!this.world) return;
        this.mesh = new THREE.Group();
        this.world.scene.add(this.mesh);

        // Load GLB
        this.loadGLB();

        // Materials
        const toonGradient = this.world.toonGradientMap || null;
        const matToon = (color) => new THREE.MeshToonMaterial({
            color: color,
            gradientMap: toonGradient
        });

        const cSkin = 0xFFCCAA;
        const cTunic = 0x00AAFF;
        const cHair = 0xFFD700;
        const cPants = 0xF5F5DC;
        const cBoots = 0x4A3C31;
        const cScarf = 0xFF4400;
        const cDark = 0x333333;

        // 1. Body Group (Main Container)
        this.bodyGroup = new THREE.Group();
        this.bodyGroup.position.y = 0.9;
        this.mesh.add(this.bodyGroup);

        // 2. Legs
        const createLimb = (w, h, d, color, x, y, z, parent) => {
            const g = new THREE.Group();
            g.position.set(x, y, z);
            parent.add(g);
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matToon(color));
            m.position.y = -h / 2;
            m.castShadow = true;
            g.add(m);
            return { group: g, mesh: m };
        };

        this.legL = createLimb(0.1, 0.45, 0.1, cPants, -0.12, -0.25, 0, this.bodyGroup);
        this.legR = createLimb(0.1, 0.45, 0.1, cPants, 0.12, -0.25, 0, this.bodyGroup);

        // Boots
        const bootGeo = new THREE.BoxGeometry(0.11, 0.15, 0.15);
        const bootMat = matToon(cBoots);
        const bootL = new THREE.Mesh(bootGeo, bootMat); bootL.position.y = -0.3; this.legL.group.add(bootL);
        const bootR = new THREE.Mesh(bootGeo, bootMat); bootR.position.y = -0.3; this.legR.group.add(bootR);

        // 3. Torso
        this.torso = new THREE.Group();
        this.bodyGroup.add(this.torso);

        // Tunic
        const tunicGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.5, 8);
        this.torsoMesh = new THREE.Mesh(tunicGeo, matToon(cTunic));
        this.torsoMesh.castShadow = true;
        this.torso.add(this.torsoMesh);

        // Head
        this.head = new THREE.Group();
        this.head.position.y = 0.35;
        this.torso.add(this.head);
        this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), matToon(cSkin));
        this.head.add(this.headMesh);

        // Hair
        this.hairGroup = new THREE.Group();
        this.head.add(this.hairGroup);
        const spikeGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
        const spikeMat = matToon(cHair);
        for (let i = 0; i < 8; i++) {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            const angle = (i / 8) * Math.PI * 2;
            spike.position.set(Math.cos(angle) * 0.1, 0.05, Math.sin(angle) * 0.1);
            spike.rotation.x = -0.5; spike.rotation.y = angle;
            this.hairGroup.add(spike);
        }
        const topSpike = new THREE.Mesh(spikeGeo, spikeMat);
        topSpike.position.y = 0.1; topSpike.scale.set(1.5, 1.5, 1.5);
        this.hairGroup.add(topSpike);

        // Scarf
        this.scarf = new THREE.Group();
        this.scarf.position.set(0, 0.2, -0.1);
        this.torso.add(this.scarf);
        this.scarfTail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.3), matToon(cScarf));
        this.scarfTail1.rotation.x = -0.5;
        this.scarf.add(this.scarfTail1);

        // 4. Arms
        this.armL = createLimb(0.08, 0.35, 0.08, cSkin, -0.22, 0.15, 0, this.torso);

        // RIGHT ARM (COMPLEX RIG)
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.22, 0.15, 0);
        this.torso.add(this.rightArmPivot);

        this.rightArm = new THREE.Group();
        this.rightArmPivot.add(this.rightArm);

        const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), matToon(cSkin));
        armMesh.position.y = -0.175;
        armMesh.castShadow = true;
        this.rightArm.add(armMesh);

        // Hand
        this.hand = new THREE.Group();
        this.hand.position.y = -0.35;
        this.rightArm.add(this.hand);

        const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06), matToon(cSkin));
        this.hand.add(handMesh);

        // Weapon Slot
        this.weaponSlot = new THREE.Group();
        this.hand.add(this.weaponSlot);

        // 5. Shield
        this.shieldGroup = new THREE.Group();
        const shieldMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.05, 6), new THREE.MeshStandardMaterial({ color: cDark, emissive: 0x00FF00, emissiveIntensity: 0.2 }));
        shieldMesh.rotation.x = Math.PI / 2;
        this.shieldGroup.add(shieldMesh);
        this.shieldGroup.position.set(0, 0, -0.15);
        this.shieldGroup.rotation.z = 0.2;
        this.torso.add(this.shieldGroup);

        // Initialize Camera Lag
        this.cameraLagPos.copy(this.mesh.position);

        // Initialize Sword Trail
        this.swordTrail = new SwordTrail(this.world.scene, 0x00FFFF, 20);
    }

    loadGLB() {
        // Load GLB Model
        const loader = new GLTFLoader();
        /** @type {Object<string, THREE.AnimationClip>} */
        this.animations = {}; // Store clips: { 'IDLE': clip, 'RUN': clip, ... }
        this.currentAction = null;

        // 1. Load Main Model (Using Bow Animation GLB as base since Steampunk is missing)
        loader.load('assets/videoplayback (3)_default.glb', (gltf) => {
            console.log("Main GLB Loaded!", gltf);
            const model = gltf.scene;
            model.scale.set(1.0, 1.0, 1.0);
            model.position.y = 0;

            // Shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Hide Procedural
            if (this.bodyGroup) this.bodyGroup.visible = false;
            this.mesh.add(model);
            this.glbModel = model;

            // Mixer Setup
            this.mixer = new THREE.AnimationMixer(model);

            // Assign Animation from Base Model (BOW)
            if (gltf.animations.length > 0) {
                this.animations['BOW'] = gltf.animations[0];
                // Use BOW as temporary IDLE to prevent T-Pose, or just don't play anything
                // this.animations['IDLE'] = gltf.animations[0]; 
                // this.playAnimation('IDLE');
            }

            // 2. Load Extra Animations
            this.loadAnimation(loader, 'assets/déplacement.glb', 'RUN');
            this.loadAnimation(loader, 'assets/grimper.glb', 'CLIMB');
            this.loadAnimation(loader, 'assets/sword_attack.glb', 'ATTACK');
            // BOW is already loaded as base

        }, undefined, (error) => {
            console.error('An error happened loading the GLB:', error);
        });
    }

    loadAnimation(loader, path, name) {
        loader.load(path, (gltf) => {
            if (gltf.animations.length > 0) {
                console.log(`Loaded Animation: ${name}`);
                const clip = gltf.animations[0];
                this.animations[name] = clip;
            }
        });
    }

    playAnimation(name, loop = true) {
        if (!this.mixer || !this.animations[name]) return;
        if (this.currentAnimName === name) return; // Already playing

        const clip = this.animations[name];
        const action = this.mixer.clipAction(clip);

        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }

        action.reset();
        action.fadeIn(0.2);
        action.play();

        if (!loop) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.mixer.addEventListener('finished', () => {
                // Return to Idle after one-shot
                if (this.currentAnimName === name) {
                    this.playAnimation('IDLE');
                }
            });
        }

        this.currentAction = action;
        this.currentAnimName = name;
    }

    initUI() {
        // Deprecated: UI is managed by UIManager
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        if (!this.mesh || !this.body) return 1;

        // Interaction (F Key)
        if (this.input.keys.interact) {
            if (this.world) {
                const target = this.world.getClosestInteractable(this.mesh.position, 3.0);
                if (target) {
                    if (typeof target.interact === 'function') {
                        target.interact();
                    } else if (target.userData && typeof target.userData.interact === 'function') {
                        target.userData.interact();
                    }
                }
            }
            this.input.keys.interact = false; // Debounce
        }

        // Hit Stop
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return 0.01; // Slow motion
        }

        // Screen Shake Decay
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        this.checkGround();
        this.handleState(dt);
        this.updatePhysics(dt);
        this.updateVisuals(dt);
        this.updateCamera(dt);
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
    handleState(dt) {
        const grounded = this.checkGround();
        const input = this.getInputVector();
        const speed = input.length();

        // State Transitions
        switch (this.state) {
            case 'IDLE':
            case 'WALK':
            case 'RUN':
                // Water Check
                if (this.mesh.position.y < 1.3 && !grounded) {
                    this.state = 'SWIM';
                    break;
                }

                if (!grounded) {
                    this.state = 'AIR';
                } else if (this.input.keys.jump) {
                    this.body.velocity.y = 8; // Jump impulse
                    this.state = 'AIR';
                    this.lastJumpTime = Date.now();
                } else if (this.input.keys.crouch && this.canSurf && speed > 0.1) {
                    this.state = 'SURF';
                    this.enterSurf();
                } else {
                    if (speed > 0.1) {
                        this.state = this.input.keys.sprint ? 'RUN' : 'WALK';
                    } else {
                        this.state = 'IDLE';
                    }
                }
                break;

            case 'SWIM':
                if (this.mesh.position.y >= 1.3) { // Surface
                    // Check if can stand
                    if (grounded && this.mesh.position.y >= 1.5) {
                        this.state = 'IDLE';
                    } else if (this.input.keys.jump) {
                        // Try to jump out?
                        this.body.velocity.y = 5;
                        this.state = 'AIR';
                    }
                }
                break;

            case 'AIR':
                if (grounded && this.body.velocity.y <= 0) {
                    this.state = 'IDLE';
                } else if (this.input.keys.jump && this.canGlide && (Date.now() - this.lastJumpTime > 500)) {
                    this.state = 'GLIDE';
                    this.lastJumpTime = Date.now(); // Cooldown
                }
                break;

            case 'GLIDE':
                if (grounded || this.input.keys.jump) { // Toggle off
                    this.state = grounded ? 'IDLE' : 'AIR';
                    this.lastJumpTime = Date.now();
                }
                break;

            case 'SURF':
                if (!this.input.keys.crouch || speed < 0.1) {
                    this.state = grounded ? 'IDLE' : 'AIR';
                    this.exitSurf();
                }
                break;
        }
    }

    enterSurf() {
        // Move shield to feet
        if (this.shieldGroup && this.mesh) {
            this.mesh.attach(this.shieldGroup); // Parent to root
            this.shieldGroup.position.set(0, 0.1, 0);
            this.shieldGroup.rotation.set(0, 0, 0);
        }
    }

    exitSurf() {
        // Move shield to back
        if (this.shieldGroup && this.torso) {
            this.torso.attach(this.shieldGroup);
            this.shieldGroup.position.set(0, 0, -0.2);
            this.shieldGroup.rotation.set(Math.PI / 2, 0, 0);
        }
    }

    /**
     * @param {number} dt
     */
    updatePhysics(dt) {
        if (!this.mesh || !this.body) return;
        const input = this.getInputVector();
        const speed = input.length();
        const grounded = this.checkGround();

        // Friction Control (Anti-Slide)
        if (this.state === 'SURF') {
            // Slippery
            this.body.material = this.world.slipperyMaterial || null;
            this.body.linearDamping = 0.1;
        } else if (this.state === 'SWIM') {
            // Water Drag
            this.body.material = null;
            this.body.linearDamping = 0.5; // High drag
        } else {
            // Grippy
            this.body.material = null; // Default friction
            this.body.linearDamping = 0.9;
        }

        // Anti-Slide on Slopes (Force Stop)
        if (grounded && speed < 0.1 && this.state !== 'SURF') {
            // Manual Friction to stop sliding
            this.body.velocity.x *= 0.5;
            this.body.velocity.z *= 0.5;
            this.body.angularVelocity.set(0, 0, 0);
            this.currentSpeed = 0;
        }

        // Artificial Gravity/Downforce
        if (grounded && this.state !== 'AIR' && this.state !== 'SWIM') {
            this.body.velocity.y -= 10 * dt; // Stick to ground
        }

        // Buoyancy (Swim)
        if (this.state === 'SWIM') {
            if (this.mesh.position.y < 1.5) {
                this.body.velocity.y += 15 * dt; // Float up
            }
            // Cap vertical speed
            if (this.body.velocity.y > 2) this.body.velocity.y = 2;
        }

        // Target Speed
        let targetSpeed = 0;
        if (this.state === 'WALK') targetSpeed = 6;
        if (this.state === 'RUN') targetSpeed = 12;
        if (this.state === 'SWIM') targetSpeed = 4;
        if (this.state === 'AIR') targetSpeed = 6; // Better air control
        if (this.state === 'GLIDE') targetSpeed = 10; // Faster glide
        if (this.state === 'SURF') targetSpeed = 20; // FAST SURF

        // Inertia
        const accel = (this.state === 'IDLE') ? 10.0 : 2.0;
        this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed * speed, dt * accel);

        // Apply Velocity
        if (speed > 0.1 || this.currentSpeed > 0.1) {
            const moveDir = input.clone().normalize();

            // Movement Logic
            if (this.state === 'GLIDE') {
                this.body.velocity.x = moveDir.x * this.currentSpeed;
                this.body.velocity.z = moveDir.z * this.currentSpeed;
                this.body.velocity.y = Math.max(this.body.velocity.y, -2);
            } else if (this.state === 'SURF') {
                // Physics-based sliding + input influence
                this.body.velocity.x += moveDir.x * dt * 5;
                this.body.velocity.z += moveDir.z * dt * 5;
            } else if (this.state === 'SWIM') {
                // Swimming movement
                this.body.velocity.x += moveDir.x * dt * 10;
                this.body.velocity.z += moveDir.z * dt * 10;
            } else if (grounded) {
                // Direct control on ground
                this.body.velocity.x = moveDir.x * this.currentSpeed;
                this.body.velocity.z = moveDir.z * this.currentSpeed;
            } else {
                // Air control (limited)
                this.body.velocity.x += moveDir.x * dt * 5;
                this.body.velocity.z += moveDir.z * dt * 5;
                // Clamp air speed
                const hVel = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z);
                if (hVel.length() > targetSpeed) {
                    hVel.normalize().multiplyScalar(targetSpeed);
                    this.body.velocity.x = hVel.x;
                    this.body.velocity.z = hVel.y;
                }
            }

            // Rotation
            if (speed > 0.1 && this.state !== 'SURF') {
                const targetRotation = Math.atan2(moveDir.x, moveDir.z);
                const currentRotation = this.mesh.rotation.y;
                let diff = targetRotation - currentRotation;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.mesh.rotation.y += diff * dt * 10;
                this.rotationVelocity = diff;
            }
        }

        // Sync Mesh
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 0.9;
    }
    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        // --- GLB ANIMATION STATE MACHINE ---
        if (this.mixer && this.animations) {
            // Prevent overriding one-shot animations (like ATTACK or BOW)
            if (this.currentAnimName === 'ATTACK' && this.currentAction && this.currentAction.isRunning()) {
                this.mixer.update(dt);
                return;
            }
            if (this.currentAnimName === 'BOW' && this.currentAction && this.currentAction.isRunning()) {
                this.mixer.update(dt);
                return;
            }

            if (this.combat && this.combat.isAttacking) {
                this.playAnimation('ATTACK', false);
            } else if (this.state === 'RUN' || this.state === 'WALK') {
                this.playAnimation('RUN');
                // Adjust speed based on movement
                if (this.currentAction) {
                    this.currentAction.timeScale = this.state === 'RUN' ? 1.5 : 1.0;
                }
            } else if (this.state === 'CLIMB') {
                this.playAnimation('CLIMB');
            } else if (this.state === 'IDLE') {
                this.playAnimation('IDLE');
            }

            this.mixer.update(dt);
        }
    }

    /**
     * @param {number} dt
     */
    updateCamera(dt) {
        if (!this.mesh) return;
        // Camera Target (Player Head)
        const targetPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));

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
        if (!this.game.ui) return;
        this.game.ui.updateStamina(this.stamina, this.maxStamina);
        this.game.ui.updateHearts(this.hp, this.maxHp);
    }

    getInputVector() {
        const inputVector = new THREE.Vector3(0, 0, 0);
        if (this.input.keys.forward) inputVector.z -= 1;
        if (this.input.keys.backward) inputVector.z += 1;
        if (this.input.keys.left) inputVector.x -= 1;
        if (this.input.keys.right) inputVector.x += 1;

        if (inputVector.length() > 0) {
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
            if (Math.abs(mesh.position.y - groundH) < 0.5) { // Increased tolerance
                return true;
            }
        }
        return false;
    }
}
