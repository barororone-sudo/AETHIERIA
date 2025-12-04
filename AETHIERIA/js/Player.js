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
        /** @type {THREE.Group|null} */ this.weaponSlot = null; // Weapon Attachment
        /** @type {THREE.Group|null} */ this.shieldGroup = null; // Shield Attachment

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

        this.body.position.set(0, 10, 0); // Start in air
        this.world.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        if (!this.world) return;
        this.mesh = new THREE.Group();
        this.world.scene.add(this.mesh);

        // Load GLB
        this.loadGLB();
    }

    loadGLB() {
        const loader = new GLTFLoader();
        /** @type {Object<string, THREE.AnimationClip>} */
        this.animations = {};
        this.currentAction = null;
        /** @type {string|null} */
        this.currentAnimName = null;

        // 1. Load Main Model
        loader.load('assets/hero.glb', (/** @type {any} */ gltf) => {
            console.log("Main GLB Loaded!", gltf);
            const model = gltf.scene;
            model.scale.set(1.0, 1.0, 1.0);

            // Shadows
            model.traverse((/** @type {THREE.Object3D} */ child) => {
                if (/** @type {THREE.Mesh} */(child).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (this.mesh) this.mesh.add(model);
            this.glbModel = model;

            // --- BONE SOCKET SYSTEM ---
            // Find Right Hand Bone
            /** @type {THREE.Object3D|null} */
            let handBone = null;

            // Priority List
            const boneNames = ['RightHand', 'mixamorig:RightHand', 'Hand.R', 'RightHandIndex1'];

            // First pass: Exact match or high priority
            model.traverse((/** @type {any} */ child) => {
                if (handBone) return; // Stop if found
                if (child.isBone) {
                    if (child.name === 'RightHand' || child.name === 'mixamorig:RightHand' || child.name === 'Hand.R') {
                        handBone = child;
                    }
                }
            });

            // Second pass: Partial match if not found (but exclude fingers if possible)
            if (!handBone) {
                model.traverse((/** @type {any} */ child) => {
                    if (handBone) return;
                    if (child.isBone && child.name.includes('RightHand') && !child.name.includes('Pinky') && !child.name.includes('Index') && !child.name.includes('Thumb') && !child.name.includes('Middle') && !child.name.includes('Ring')) {
                        handBone = child;
                    }
                });
            }

            // Fallback: If still not found, take anything with RightHand (even fingers, better than nothing)
            if (!handBone) {
                model.traverse((/** @type {any} */ child) => {
                    if (handBone) return;
                    if (child.isBone && child.name.includes('RightHand')) {
                        handBone = child;
                    }
                });
            }

            if (handBone) {
                console.log("Found Hand Bone:", handBone.name);
                this.weaponSlot = new THREE.Group();
                handBone.add(this.weaponSlot);

                // Reset transform relative to bone
                this.weaponSlot.position.set(0, 0, 0);
                this.weaponSlot.rotation.set(0, 0, 0);
                this.weaponSlot.scale.set(1, 1, 1);
            } else {
                console.warn("Right Hand Bone not found!");
            }

            // Mixer Setup
            this.mixer = new THREE.AnimationMixer(model);

            // 2. Load Extra Animations in Parallel
            const anims = {
                RUN: 'assets/déplacement.glb',
                ATTACK: 'assets/sword_attack.glb',
                CLIMB: 'assets/grimper.glb',
                JUMP: 'assets/Jumping.glb',
                BOW: 'assets/arc.glb'
            };

            const promises = Object.entries(anims).map(([name, path]) => {
                return new Promise((resolve) => {
                    loader.load(path, (/** @type {any} */ animGltf) => {
                        if (animGltf.animations.length > 0) {
                            if (this.animations) this.animations[name] = animGltf.animations[0];
                        }
                        resolve(null);
                    }, undefined, (/** @type {any} */ err) => {
                        console.warn(`Failed to load animation ${name} at ${path}`, err);
                        resolve(null); // Resolve anyway to not block others
                    });
                });
            });

            // Also check if the main model has animations (e.g. default IDLE)
            if (gltf.animations.length > 0) {
                if (this.animations) {
                    this.animations['IDLE'] = gltf.animations[0];
                }
            }

            Promise.all(promises).then(() => {
                if (this.animations) {
                    console.log("All animations loaded:", Object.keys(this.animations));
                    // Start Idle
                    this.playAnimation('IDLE');

                    // Equip Starter Weapon
                    this.equipWeapon('assets/sword_iron.glb');
                }
            });

        }, undefined, (/** @type {any} */ error) => {
            console.error('An error happened loading the GLB:', error);
        });
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

        // Setup Draco Loader
        // @ts-ignore
        const dracoLoader = new DRACOLoader();
        // @ts-ignore
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        // @ts-ignore
        loader.setDRACOLoader(dracoLoader);

        loader.load(path, (/** @type {any} */ gltf) => {
            const sword = gltf.scene;

            // Adjust rotation to fit in hand (standard fix for many assets)
            // Usually swords point UP (Y) or Forward (Z). In hand, Z is often "out" of palm.
            // Let's try rotating -90 on X or Y. 
            // For now, let's assume standard alignment and tweak if user complains.
            // User suggested: "Applique une rotation par défaut si nécessaire (souvent -90° sur X ou Y)"
            sword.rotation.x = -Math.PI / 2; // Common fix

            sword.traverse((/** @type {THREE.Object3D} */ child) => {
                if (/** @type {THREE.Mesh} */(child).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (this.weaponSlot) this.weaponSlot.add(sword);
            console.log("Equipped Weapon:", path);

            // Dispose Draco
            // @ts-ignore
            dracoLoader.dispose();
        });
    }

    /**
     * @param {string} name 
     * @param {boolean} loop 
     * @param {number} duration Crossfade duration in seconds
     */
    playAnimation(name, loop = true, duration = 0.2) {
        if (!this.mixer || !this.animations || !this.animations[name]) return;
        if (this.currentAnimName === name) return;

        const newClip = this.animations[name];
        const newAction = this.mixer.clipAction(newClip);
        const currentAction = this.currentAction;

        if (currentAction) {
            // Crossfade
            newAction.reset();
            newAction.play();
            currentAction.crossFadeTo(newAction, duration, true);
        } else {
            newAction.play();
        }

        if (!loop) {
            newAction.setLoop(THREE.LoopOnce, 1);
            newAction.clampWhenFinished = true;

            // For JUMP, we want to clamp and NOT return to IDLE automatically (handled by state machine)
            if (name !== 'JUMP') {
                const mixer = this.mixer;
                const onFinished = (/** @type {any} */ e) => {
                    if (e.action === newAction) {
                        mixer.removeEventListener('finished', onFinished);
                        // Return to Idle
                        this.playAnimation('IDLE', true, 0.2);
                    }
                };
                mixer.addEventListener('finished', onFinished);
            }
        } else {
            newAction.setLoop(THREE.LoopRepeat, Infinity);
            newAction.clampWhenFinished = false;
        }

        this.currentAction = newAction;
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
        if ((this.shakeTimer || 0) > 0) {
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
        if (this.shieldGroup && this.mesh) {
            this.mesh.attach(this.shieldGroup);
            this.shieldGroup.position.set(0, 1.0, -0.3);
            this.shieldGroup.rotation.set(Math.PI / 2, 0, 0); // Adjust rotation if needed
        }
    }

    /**
     * @param {number} dt
     */
    updatePhysics(dt) {
        if (!this.mesh || !this.body) return;

        // Combat Lock: Stop movement/rotation during attack
        if (this.combat && this.combat.isAttacking) {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
            this.currentSpeed = 0;

            // Keep Gravity/Downforce
            const grounded = this.checkGround();
            if (grounded && this.state !== 'AIR' && this.state !== 'SWIM') {
                this.body.velocity.y -= 10 * dt;
            }

            // Sync Mesh (Position only, NO rotation update)
            const physicsOffset = 0.5;
            this.mesh.position.copy(this.body.position);
            this.mesh.position.y -= physicsOffset;

            return; // Skip rest of movement logic
        }

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
            // Grippy (but smooth movement)
            this.body.material = null; // Default friction
            this.body.linearDamping = 0.1; // Was 0.9, caused sluggishness
        }

        // Anti-Slide on Slopes (Force Stop) & Damping
        if (speed < 0.1 && this.state !== 'SURF' && this.state !== 'AIR') {
            // High damping to stop immediately
            this.body.linearDamping = 0.9;
        } else {
            this.body.linearDamping = 0.1;
        }

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
            let moveDir = input.clone().normalize();

            // Slope Physics: Project movement onto ground plane
            if (grounded && this.world && this.world.terrainManager) {
                const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
                const rayDir = new THREE.Vector3(0, -1, 0);
                const raycaster = new THREE.Raycaster(rayOrigin, rayDir, 0, 2.0);
                if (this.world.terrainManager.group) {
                    const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
                    if (intersects.length > 0 && intersects[0].face) {
                        const normal = intersects[0].face.normal.clone();
                        // Transform normal to world space if needed (usually local if terrain is static, but let's be safe)
                        const object = intersects[0].object;
                        if (object && /** @type {THREE.Mesh} */(object).isMesh) {
                            normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
                        }

                        // Project and normalize
                        moveDir.projectOnPlane(normal).normalize();
                    }
                }
            }

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
                // Note: We don't set Y here, gravity/slope projection handles it
                // Actually, for full slope support with direct velocity, we might want to apply the Y component of moveDir too if it's significant?
                // The user asked to "Applique la vitesse sur ce nouveau vecteur".
                // If we only set X and Z, we lose the slope climb capability.
                // So we should add the Y component if we are on a slope.
                if (moveDir.y !== 0) {
                    this.body.velocity.y = moveDir.y * this.currentSpeed;
                }
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
        }

        // Rotation (Follow Velocity)
        const velocity = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z);
        if (velocity.length() > 0.1) {
            const targetRotation = Math.atan2(velocity.x, velocity.y); // Note: atan2(x, y) for Three.js Y-rotation
            const currentRotation = this.mesh.rotation.y;

            // Shortest path interpolation
            let diff = targetRotation - currentRotation;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            // Smooth lerp
            this.mesh.rotation.y += diff * dt * 10;
            this.rotationVelocity = diff;
        }

        // Sync Mesh
        // Body is a Sphere of radius 0.5
        const physicsOffset = 0.5;

        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= physicsOffset; // Pivot at feet

        // Slope Alignment
        if (grounded && this.world && this.world.terrainManager) {
            // Raycast down to find normal
            const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
            const rayDir = new THREE.Vector3(0, -1, 0);
            const raycaster = new THREE.Raycaster(rayOrigin, rayDir, 0, 2.0);

            // Use terrainManager.group for intersection
            if (this.world.terrainManager.group) {
                // Raycast against the entire terrain group (recursive)
                const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
                if (intersects.length > 0) {
                    const normal = intersects[0].face.normal;

                    // Transform normal to world space
                    const object = /** @type {any} */ (intersects[0].object);
                    if (object && object.isMesh) {
                        normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
                    }

                    const targetUp = normal.clone();

                    // Calculate target quaternion based on normal
                    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetUp);

                    // Combine with Y rotation (Direction)
                    const yRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
                    targetQuat.multiply(yRotation);

                    // Smoothly interpolate
                    this.mesh.quaternion.slerp(targetQuat, dt * 10);
                    return; // Skip default rotation sync
                }
            }
        }

        // Default Rotation (if not on slope or no normal found)
        // We already set rotation.y above based on velocity.
        // Just ensure we reset X/Z rotation if we were on a slope and now are not.
        // But wait, we are modifying mesh.rotation.y directly above. 
        // If we use quaternion slerp, we should probably stick to quaternions.
        // For now, let's just leave the default behavior if no slope found.
    }
    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        // --- GLB ANIMATION STATE MACHINE ---
        if (this.mixer && this.animations) {
            // Priority 1: Jump (Air/Glide)
            if (this.state === 'AIR' || this.state === 'GLIDE') {
                this.playAnimation('JUMP', false);
                return;
            }

            // Priority 2: Combat
            if (this.combat) {
                if (this.combat.isAttacking) {
                    this.playAnimation('ATTACK', false);
                    this.mixer.update(dt);
                    return;
                }
                if (this.combat.isAiming) {
                    this.playAnimation('BOW', false); // or clamp
                    this.mixer.update(dt);
                    return;
                }
            }

            // Priority 3: Movement
            if (this.state === 'CLIMB') {
                this.playAnimation('CLIMB');
            } else if (this.state === 'RUN' || this.state === 'WALK') {
                // Calculate Real Velocity (Horizontal)
                const velocity = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z).length();

                // Anti-Wall-Run: If trying to move but blocked (low velocity), play IDLE
                // We check if input is active (implied by state RUN/WALK usually, but let's trust the state)
                // If velocity is very low, we are likely pushing a wall.
                if (velocity < 0.1) {
                    this.playAnimation('IDLE');
                } else {
                    this.playAnimation('RUN');
                    // Dynamic TimeScale for "No Skating"
                    if (this.currentAction) {
                        // User requested velocity.length() / 7.0
                        let scale = velocity / 7.0;
                        // Clamp to avoid super slow/fast animation
                        scale = Math.max(0.5, Math.min(scale, 2.0));
                        this.currentAction.timeScale = scale;
                    }
                }
            } else {
                // Default
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
        // Camera Target (Shoulders/Head)
        const targetPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)); // Was 1.5

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
