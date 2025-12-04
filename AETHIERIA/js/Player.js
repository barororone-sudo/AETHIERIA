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
        /** @type {HTMLElement|null} */ this.staminaContainer = null;
        /** @type {HTMLElement|null} */ this.staminaRing = null;
        /** @type {HTMLElement|null} */ this.heartsContainer = null;
        /** @type {HTMLElement|null} */ this.iconGlide = null;
        /** @type {HTMLElement|null} */ this.iconSurf = null;

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
        const cWhite = 0xFFFFFF;
        const cDark = 0x333333;

        // 1. Body Group (Main Container)
        this.bodyGroup = new THREE.Group();
        this.bodyGroup.position.y = 0.9;
        this.mesh.add(this.bodyGroup);

        // 2. Legs (Attached to BodyGroup, independent of Torso twist)
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

        // 3. Torso (Upper Body - Can Twist)
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
        // Left Arm (Simple)
        this.armL = createLimb(0.08, 0.35, 0.08, cSkin, -0.22, 0.15, 0, this.torso);

        // RIGHT ARM (COMPLEX RIG)
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.22, 0.15, 0); // Shoulder position
        this.torso.add(this.rightArmPivot);

        this.rightArm = new THREE.Group();
        this.rightArmPivot.add(this.rightArm);

        const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), matToon(cSkin));
        armMesh.position.y = -0.175; // Center of arm
        armMesh.castShadow = true;
        this.rightArm.add(armMesh);

        // Hand
        this.hand = new THREE.Group();
        this.hand.position.y = -0.35; // End of arm
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

    initUI() {
        this.staminaContainer = document.getElementById('stamina-container');
        this.staminaRing = document.getElementById('stamina-ring');
        this.heartsContainer = document.getElementById('hearts-container');
        this.iconGlide = document.getElementById('icon-glide');
        this.iconSurf = document.getElementById('icon-surf');
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        if (!this.mesh || !this.body) return 1;

        // Interaction (F Key)
        if (this.input.keys.interact) {
            // Find closest interactable
            if (this.world) {
                const target = this.world.getClosestInteractable(this.mesh.position);
                if (target) {
                    target.interact();
                }
            }
            this.input.keys.interact = false; // Reset immediate
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
        } else {
            // Grippy
            this.body.material = null; // Default friction
            this.body.linearDamping = 0.9;
        }

        // Anti-Slide on Slopes (Force Stop)
        if (grounded && speed < 0.1 && this.state !== 'SURF') {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.currentSpeed = 0;
        }

        // Artificial Gravity/Downforce
        if (grounded && this.state !== 'AIR') {
            this.body.velocity.y -= 10 * dt; // Stick to ground
        }

        // Target Speed
        let targetSpeed = 0;
        if (this.state === 'WALK') targetSpeed = 5;
        if (this.state === 'RUN') targetSpeed = 10;
        if (this.state === 'AIR') targetSpeed = 4;
        if (this.state === 'GLIDE') targetSpeed = 8;
        if (this.state === 'SURF') targetSpeed = 15;

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
        if (!this.bodyGroup || !this.torso || !this.rightArmPivot) return;

        const time = Date.now() * 0.005;

        // --- 1. RESET POSE ---
        // Torso
        this.torso.rotation.set(0, 0, 0);
        this.bodyGroup.rotation.x = 0;

        // Arms
        if (this.armL) this.armL.group.rotation.set(0, 0, 0);
        this.rightArmPivot.rotation.set(0, 0, 0);
        this.rightArm.rotation.set(0, 0, 0);
        this.hand.rotation.set(0, 0, 0);

        // Legs
        if (this.legL) this.legL.group.rotation.set(0, 0, 0);
        if (this.legR) this.legR.group.rotation.set(0, 0, 0);

        // --- 2. IDLE / MOVE ANIMATION ---
        if (this.state === 'IDLE') {
            // Breathing
            this.bodyGroup.scale.y = 1 + Math.sin(time * 2) * 0.02;
            this.bodyGroup.position.y = 0.9 + Math.sin(time * 2) * 0.01;

            // Combat Ready Pose (Right Arm)
            this.rightArmPivot.rotation.z = Math.PI / 4; // 45 deg out
            this.rightArmPivot.rotation.x = 0.2;
            this.rightArm.rotation.z = 0.2;

            // Left Arm Idle
            if (this.armL) this.armL.group.rotation.z = 0.1 + Math.sin(time) * 0.05;

        } else if (this.state === 'WALK' || this.state === 'RUN') {
            const isRun = this.state === 'RUN';
            const freq = isRun ? 15 : 10;
            const amp = isRun ? 0.8 : 0.5;

            // Lean Forward
            this.bodyGroup.rotation.x = isRun ? 0.3 : 0.1;

            // Legs
            if (this.legL) this.legL.group.rotation.x = Math.sin(time * freq) * amp;
            if (this.legR) this.legR.group.rotation.x = Math.sin(time * freq + Math.PI) * amp;

            // Arms
            if (this.armL) this.armL.group.rotation.x = Math.sin(time * freq + Math.PI) * amp;
            // Right arm swings but keeps weapon ready
            this.rightArmPivot.rotation.x = Math.sin(time * freq) * amp;
            this.rightArmPivot.rotation.z = 0.5;
        }

        // --- 3. COMBAT OVERRIDES (PROCEDURAL) ---
        if (this.combat && this.combat.isAttacking) {
            const progress = this.combat.attackProgress;
            const combo = this.combat.comboStep;

            // Update Sword Trail
            if (this.swordTrail && this.combat && this.combat.weapon) {
                const tipPos = new THREE.Vector3(0, 0.75, 0); // Tip (Local Y-up of sword mesh)
                const basePos = new THREE.Vector3(0, -0.75, 0); // Base
                tipPos.applyMatrix4(this.combat.weapon.matrixWorld);
                basePos.applyMatrix4(this.combat.weapon.matrixWorld);
                this.swordTrail.update(basePos, tipPos);
            }

            if (combo === 1) {
                // HORIZONTAL SLASH
                // Phase 1: Windup (0.0 - 0.2)
                // Phase 2: Slash (0.2 - 0.4)
                // Phase 3: Recover (0.4 - 1.0)

                if (progress < 0.2) {
                    // Windup: Twist Left, Arm Back
                    const t = progress / 0.2;
                    this.torso.rotation.y = THREE.MathUtils.lerp(0, 1.0, t); // Twist Right (Screen Left)
                    this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(0, 1.5, t); // Arm Back
                    this.rightArmPivot.rotation.z = 1.5;
                } else if (progress < 0.4) {
                    // Slash: Twist Right, Arm Sweep
                    const t = (progress - 0.2) / 0.2;
                    this.torso.rotation.y = THREE.MathUtils.lerp(1.0, -1.5, t); // Twist Left (Screen Right)
                    this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(1.5, -1.0, t); // Sweep
                    this.rightArmPivot.rotation.z = 1.5;
                    this.rightArm.rotation.x = -0.5; // Blade alignment
                } else {
                    // Recover
                    const t = (progress - 0.4) / 0.6;
                    this.torso.rotation.y = THREE.MathUtils.lerp(-1.5, 0, t);
                    this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(-1.0, 0, t);
                    this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(1.5, 0.8, t);
                }
            } else if (combo === 2) {
                // VERTICAL SMASH
                if (progress < 0.3) {
                    // Windup: Arm Up
                    const t = progress / 0.3;
                    this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(0.5, 3.0, t); // High up
                    this.torso.rotation.x = -0.5; // Arch back
                } else if (progress < 0.5) {
                    // Smash
                    const t = (progress - 0.3) / 0.2;
                    this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(3.0, 0.5, t);
                    this.rightArmPivot.rotation.x = 1.5; // Forward
                    this.torso.rotation.x = 0.5; // Crunch forward
                } else {
                    // Recover
                    const t = (progress - 0.5) / 0.5;
                    this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(0.5, 0.8, t);
                    this.torso.rotation.x = THREE.MathUtils.lerp(0.5, 0, t);
                }
            } else {
                // THRUST
                if (progress < 0.3) {
                    // Pull Back
                    const t = progress / 0.3;
                    this.rightArmPivot.position.z = THREE.MathUtils.lerp(0, 0.3, t); // Pull shoulder back
                    this.rightArmPivot.rotation.x = -0.5;
                } else if (progress < 0.5) {
                    // Thrust
                    const t = (progress - 0.3) / 0.2;
                    this.rightArmPivot.position.z = THREE.MathUtils.lerp(0.3, -0.5, t); // Push forward
                    this.torso.position.z = 0.2; // Lunge body
                    this.rightArmPivot.rotation.x = 0;
                } else {
                    // Recover
                    const t = (progress - 0.5) / 0.5;
                    this.rightArmPivot.position.z = THREE.MathUtils.lerp(-0.5, 0, t);
                    this.torso.position.z = THREE.MathUtils.lerp(0.2, 0, t);
                }
            }
        } else if (this.combat && this.combat.isAiming) {
            // Aiming Pose
            // Torso follows camera pitch (approximate)
            const pitch = this.cameraState.phi - Math.PI / 2; // 0 is horizon
            this.torso.rotation.x = pitch;
            this.torso.rotation.y = -0.5; // Slight turn

            // Arms holding bow
            // Right Arm (Holds Bow)
            this.rightArmPivot.rotation.set(0, 0, 0);
            this.rightArmPivot.rotation.z = Math.PI / 2; // Raise arm
            this.rightArmPivot.rotation.y = -Math.PI / 2; // Point forward

            // Left Arm (Fake Pull String)
            if (this.armL) {
                this.armL.group.rotation.set(0, 0, 0);
                this.armL.group.rotation.z = Math.PI / 2; // Raise arm
                this.armL.group.rotation.y = 0.5; // Pull string
            }
        } else {
            // Reset Trail
            if (this.swordTrail) this.swordTrail.reset();
        }

        // Scarf Physics
        if (this.scarf) {
            this.scarf.rotation.x = THREE.MathUtils.lerp(this.scarf.rotation.x, -0.5 + this.currentSpeed * 0.1, dt * 5);
            this.scarf.rotation.y = THREE.MathUtils.lerp(this.scarf.rotation.y, -this.rotationVelocity, dt * 5);
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
        // Stamina
        if (this.staminaContainer && this.staminaRing) {
            if (this.stamina < this.maxStamina) {
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
