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
import { ToonMaterial } from './materials/ToonMaterial.js';
import { generateCharacter } from './character.js';
import { LevelManager } from './managers/LevelManager.js';
import { WeaponGenerator } from './generators/WeaponGenerator.js';
import { Animator } from './components/Animator.js';
import { Visuals } from './Visuals.js';

export class Player {
    /**
     * @param {import('./main.js').Game} game
     * @param {THREE.PerspectiveCamera} camera
     */
    constructor(game, camera) {
        // --- TYPE DEFINITIONS for TS ---
        /** @type {THREE.Group} */ this.mesh;
        /** @type {THREE.Group} */ this.bodyMesh;
        /** @type {THREE.Group} */ this.head;
        /** @type {THREE.Group} */ this.leftArm;
        /** @type {THREE.Group} */ this.rightArm;
        /** @type {THREE.Group} */ this.leftForeArm;
        /** @type {THREE.Group} */ this.rightForeArm;
        /** @type {THREE.Group} */ this.leftHand;
        /** @type {THREE.Group} */ this.rightHand;
        /** @type {THREE.Group} */ this.leftLeg;
        /** @type {THREE.Group} */ this.rightLeg;
        /** @type {THREE.Group} */ this.leftShin;
        /** @type {THREE.Group} */ this.rightShin;
        /** @type {THREE.Mesh} */ this.leftFoot;
        /** @type {THREE.Mesh} */ this.rightFoot;
        /** @type {THREE.Group} */ this.weaponSlot;
        /** @type {THREE.Group} */ this.leftWeaponSlot;
        /** @type {THREE.Group} */ this.gliderMesh;
        /** @type {THREE.Group} */ this.shieldGroup;
        /** @type {THREE.Mesh} */ this.shieldMesh;
        /** @type {CANNON.Body} */ this.body;
        /** @type {any} */ this.equippedWeapon = null;

        this.game = game;
        this.world = game.world;
        this.camera = camera;
        this.input = game.input;

        this.isInvincible = false;

        // Initialize Character Data (Visuals & Base Info)
        this.characterData = generateCharacter();

        // RPG PROGRESSION
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 100;

        // BASE STATS (High HP RPG Style)
        this.baseStats = {
            hp: 500,
            attack: 50,
            defense: 5,
            speed: 1.0
        };

        this.levelProgress = 0.0;

        this.hp = this.baseStats.hp;
        this.maxHp = this.baseStats.hp;

        // EFFECTIVE STATS (Updated via updateStats)
        this.stats = { ...this.baseStats };

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
            GLIDE: 8,
            CLIMB: 15,
            SURF: 5,
            SWIM: 10
        };
        this.lastStaminaUseTime = 0;

        // Game Feel Variables
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.rotationVelocity = 0;
        this.cameraLagPos = new THREE.Vector3();
        this.baseFov = 75;
        this.targetFov = 75;

        this.lastJumpTime = 0;
        this.stepTimer = 0;
        this.lastGenTime = 0;
        this.hasReleasedJump = true;
        this.jumpTapCount = 0;
        this.canGlide = true;
        this.canSurf = true;

        // Camera State
        this.cameraState = {
            distance: 5,
            theta: Math.PI,
            phi: Math.PI / 3,
            target: new THREE.Vector3()
        };

        // Combat System
        /** @type {Combat} */ this.combat = new Combat(this);
        /** @type {LevelManager} */ this.levelManager = new LevelManager(game);
        this.swordTrail = null;

        // Audio & Input
        this.audio = game.audio || null;
        this.inputLocked = false;
        this.isInTutorial = false;

        // Initialize timers/vars for linting
        this.hitStopTimer = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.attackTimer = 0;
        this.attackDuration = 0;
        this.currentComboIndex = 0;
        this.isAttacking = false;
        this.shakeTriggered = false;

        // Register Input Callbacks
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

        this.initPhysics();
        this.initVisuals();
        this.initInput();
        this.updateStats();

        // Advanced Combat Components
        this.animator = new Animator(this);
        this.visuals = new Visuals(this);

        // Define Animations
        this.registerAnimations();
    }

    registerAnimations() {
        if (!this.animator) return;

        // Define simple poses (radians)
        // ATTACK 1 - Horizontal Slash
        this.animator.register('ATTACK_1', {
            duration: 0.4,
            keys: [
                {
                    t: 0.0, pose: {
                        rightArm: { x: -2.0, y: -0.5, z: 0.5 }, // Windup
                        torso: { x: 0, y: 0.5, z: 0 }
                    }
                },
                {
                    t: 0.15, pose: {
                        rightArm: { x: -1.5, y: 1.5, z: 0.5 }, // Swing
                        torso: { x: 0, y: -0.5, z: 0 }
                    }
                },
                {
                    t: 0.4, pose: {
                        rightArm: { x: 0, y: 0, z: 0 }, // Recover
                        torso: { x: 0, y: 0, z: 0 }
                    }
                }
            ]
        });

        // ATTACK 2 - Vertical Slash
        this.animator.register('ATTACK_2', {
            duration: 0.4,
            keys: [
                {
                    t: 0.0, pose: {
                        rightArm: { x: -Math.PI, y: 0, z: 0 }, // Up
                        torso: { x: 0, y: 0, z: 0 }
                    }
                },
                {
                    t: 0.2, pose: {
                        rightArm: { x: -0.5, y: 0, z: 0 }, // Down
                        torso: { x: 0.2, y: 0, z: 0 }
                    }
                },
                {
                    t: 0.4, pose: {
                        rightArm: { x: 0, y: 0, z: 0 },
                        torso: { x: 0, y: 0, z: 0 }
                    }
                }
            ]
        });

        // ATTACK 3 - Spin/Thrust
        this.animator.register('ATTACK_3', {
            duration: 0.6,
            keys: [
                {
                    t: 0.0, pose: {
                        rightArm: { x: -1.5, y: -1.0, z: 0 },
                        torso: { x: 0, y: 1.0, z: 0 }
                    }
                },
                {
                    t: 0.3, pose: {
                        rightArm: { x: -1.5, y: 2.0, z: 0 },
                        torso: { x: 0, y: -2.0, z: 0 } // Spin
                    }
                },
                {
                    t: 0.6, pose: {
                        rightArm: { x: 0, y: 0, z: 0 },
                        torso: { x: 0, y: 0, z: 0 }
                    }
                }
            ]
        });

        // DODGE
        this.animator.register('DODGE', {
            duration: 0.3,
            keys: [
                { t: 0.0, pose: { torso: { x: 0.5, y: 0, z: 0 } } }, // Lean forward
                { t: 0.3, pose: { torso: { x: 0, y: 0, z: 0 } } }
            ]
        });
    }

    /**
     * @param {number} amount
     */
    takeDamage(amount) {
        if (this.isInvincible) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            // TODO: Game Over
            console.log("Player Died!");
        }

        if (this.game.ui) this.game.ui.update(this);
        this.screenShake(0.5, 0.2);
    }

    /**
     * @param {number} amount
     */
    gainExp(amount) {
        this.exp += amount;
        if (this.game.ui) this.game.ui.showToast(`+${amount} XP`);

        if (this.exp >= this.expToNextLevel) {
            this.level++;
            this.exp -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);

            // RPG Growth: +10% HP, +5% Atk (Compound)
            this.baseStats.hp = Math.floor(this.baseStats.hp * 1.10);
            this.baseStats.attack = Math.floor(this.baseStats.attack * 1.05);

            // Full Heal on Level Up
            this.hp = this.baseStats.hp;
            this.maxHp = this.baseStats.hp;

            this.updateStats();
            if (this.game.ui) this.game.ui.showToast(`NIVEAU SUIVANT ! (Lvl ${this.level})`);
        }

        // Calculate Progress (0.0 - 1.0)
        this.levelProgress = this.exp / this.expToNextLevel;
    }

    updateStats() {
        this.stats.attack = this.baseStats.attack;
        this.stats.defense = this.baseStats.defense;
        this.maxHp = this.baseStats.hp;

        if (this.equippedWeapon && this.equippedWeapon.stats) {
            const dmg = this.equippedWeapon.stats.damage || 0;
            this.stats.attack += dmg;
        }

        if (this.game.ui) this.game.ui.update(this);
    }

    initInput() {
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.cameraState.theta -= e.movementX * 0.002;
                this.cameraState.phi -= e.movementY * 0.002;
                this.cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraState.phi));
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.game.ui && this.game.ui.mapManager && this.game.ui.mapManager.isBigMap) return;

            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock().catch(e => {
                    if (e.name === 'SecurityError') return;
                });
            } else {
                if (e.button === 0) {
                    this.combat.attack();
                } else if (e.button === 2) {
                    this.combat.toggleAim();
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (document.pointerLockElement === document.body) {
                if (e.button === 2) {
                    if (this.combat.isAiming) this.combat.toggleAim();
                }
            }
        });

        // Z-Targeting Toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                if (this.combat) this.combat.toggleLock();
            }
        });
    }

    initPhysics() {
        if (!this.world) {
            console.error("Player.initPhysics: this.world is MISSING!");
            return;
        }
        console.log("Player.initPhysics: Initializing Body...");
        const radius = 0.5;
        const shape = new CANNON.Sphere(radius);
        // Fallback if slipperyMaterial missing
        const material = this.world.slipperyMaterial || new CANNON.Material('player');

        this.body = new CANNON.Body({
            mass: 60,
            material: material,
            shape: shape,
            linearDamping: 0.1,
            angularDamping: 0.9,
            fixedRotation: true
        });

        this.body.position.set(0, 50, 0); // Spawn High
        this.body.ccdSpeedThreshold = 1;
        this.body.ccdIterations = 10;

        if (this.world.physicsWorld) {
            this.world.physicsWorld.addBody(this.body);
            console.log("Player Body Added to Physics World");
        } else {
            console.error("Player.initPhysics: physicsWorld is MISSING!");
        }
    }

    initVisuals() {
        if (!this.world) return;
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
        }

        this.mesh = new THREE.Group();
        this.world.scene.add(this.mesh);

        // --- PALETTE ---
        const cPrimary = new THREE.Color(this.characterData.palette[1]);
        const cSecondary = new THREE.Color(this.characterData.palette[0]);
        const cAccent = new THREE.Color(this.characterData.palette[2]);

        const matBody = new THREE.MeshStandardMaterial({ color: cPrimary, roughness: 0.7, metalness: 0.5 });
        const matArmor = new THREE.MeshStandardMaterial({ color: cSecondary, roughness: 0.5, metalness: 0.7 });
        const matJoint = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const matNeon = new THREE.MeshStandardMaterial({ color: cAccent, emissive: cAccent, emissiveIntensity: 2.0 });

        // --- BODY ---
        this.bodyMesh = new THREE.Group();
        this.bodyMesh.position.y = 0.95;
        this.mesh.add(this.bodyMesh);

        const torsoGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
        const torso = new THREE.Mesh(torsoGeo, matBody);
        torso.position.y = 0.25;
        torso.castShadow = true;
        this.bodyMesh.add(torso);

        const chestGeo = new THREE.BoxGeometry(0.42, 0.3, 0.27);
        const chest = new THREE.Mesh(chestGeo, matArmor);
        chest.position.y = 0.35;
        torso.add(chest);

        const coreGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const core = new THREE.Mesh(coreGeo, matNeon);
        core.position.set(0, 0.35, 0.15);
        torso.add(core);

        // --- HEAD ---
        this.head = new THREE.Group();
        this.head.position.set(0, 0.55, 0);
        this.bodyMesh.add(this.head);

        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMesh = new THREE.Mesh(headGeo, matBody);
        headMesh.position.y = 0.15;
        headMesh.castShadow = true;
        this.head.add(headMesh);

        const visorGeo = new THREE.BoxGeometry(0.25, 0.08, 0.05);
        const visor = new THREE.Mesh(visorGeo, matNeon);
        visor.position.set(0, 0.15, 0.16);
        this.head.add(visor);

        // --- ARMS ---
        const armW = 0.12, armL = 0.35, armD = 0.12;

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.28, 0.45, 0);
        this.bodyMesh.add(this.leftArm);
        const lUpper = new THREE.Mesh(new THREE.BoxGeometry(armW, armL, armD), matArmor);
        lUpper.position.y = -armL / 2;
        lUpper.castShadow = true;
        this.leftArm.add(lUpper);

        this.leftForeArm = new THREE.Group();
        this.leftForeArm.position.y = -armL;
        this.leftArm.add(this.leftForeArm);
        const lLower = new THREE.Mesh(new THREE.BoxGeometry(armW * 0.8, armL * 0.9, armD * 0.8), matBody);
        lLower.position.y = -armL * 0.45;
        lLower.castShadow = true;
        this.leftForeArm.add(lLower);
        this.leftHand = new THREE.Group();
        this.leftHand.position.y = -armL * 0.9;
        this.leftForeArm.add(this.leftHand);

        this.leftWeaponSlot = new THREE.Group();
        this.leftWeaponSlot.rotation.x = Math.PI / 2;
        this.leftHand.add(this.leftWeaponSlot);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.28, 0.45, 0);
        this.bodyMesh.add(this.rightArm);
        const rUpper = new THREE.Mesh(new THREE.BoxGeometry(armW, armL, armD), matArmor);
        rUpper.position.y = -armL / 2;
        rUpper.castShadow = true;
        this.rightArm.add(rUpper);

        this.rightForeArm = new THREE.Group();
        this.rightForeArm.position.y = -armL;
        this.rightArm.add(this.rightForeArm);
        const rLower = new THREE.Mesh(new THREE.BoxGeometry(armW * 0.8, armL * 0.9, armD * 0.8), matBody);
        rLower.position.y = -armL * 0.45;
        rLower.castShadow = true;
        this.rightForeArm.add(rLower);
        this.rightHand = new THREE.Group();
        this.rightHand.position.y = -armL * 0.9;
        this.rightForeArm.add(this.rightHand);

        this.weaponSlot = new THREE.Group();
        this.weaponSlot.rotation.x = Math.PI / 2;
        this.rightHand.add(this.weaponSlot);

        // --- LEGS ---
        const legW = 0.14, legL = 0.45, legD = 0.14;

        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.15, 0.0, 0);
        this.bodyMesh.add(this.leftLeg);
        const lThigh = new THREE.Mesh(new THREE.BoxGeometry(legW, legL, legD), matArmor);
        lThigh.position.y = -legL / 2;
        lThigh.castShadow = true;
        this.leftLeg.add(lThigh);

        this.leftShin = new THREE.Group();
        this.leftShin.position.y = -legL;
        this.leftLeg.add(this.leftShin);
        const lShin = new THREE.Mesh(new THREE.BoxGeometry(legW * 0.8, legL, legD * 0.8), matBody);
        lShin.position.y = -legL / 2;
        lShin.castShadow = true;
        this.leftShin.add(lShin);
        this.leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), matJoint);
        this.leftFoot.position.set(0, -legL, 0.05);
        this.leftShin.add(this.leftFoot);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.15, 0.0, 0);
        this.bodyMesh.add(this.rightLeg);
        const rThigh = new THREE.Mesh(new THREE.BoxGeometry(legW, legL, legD), matArmor);
        rThigh.position.y = -legL / 2;
        rThigh.castShadow = true;
        this.rightLeg.add(rThigh);

        this.rightShin = new THREE.Group();
        this.rightShin.position.y = -legL;
        this.rightLeg.add(this.rightShin);
        const rShin = new THREE.Mesh(new THREE.BoxGeometry(legW * 0.8, legL, legD * 0.8), matBody);
        rShin.position.y = -legL / 2;
        rShin.castShadow = true;
        this.rightShin.add(rShin);
        this.rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), matJoint);
        this.rightFoot.position.set(0, -legL, 0.05);
        this.rightShin.add(this.rightFoot);

        // --- ATTACHMENTS ---
        const light = new THREE.PointLight(cAccent, 2, 5);
        light.position.set(0, 1, 0);
        this.mesh.add(light);

        this.gliderMesh = new THREE.Group();
        this.gliderMesh.position.set(0, 0.3, -0.15);
        this.gliderMesh.visible = false;
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        this.gliderMesh.add(pack);
        const wMat = new THREE.MeshStandardMaterial({ color: cAccent, emissive: cAccent, emissiveIntensity: 3.0, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        const wGeo = new THREE.BufferGeometry();
        wGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -1.2, 0.2, 0.3, -0.3, -0.2, 0.2, 0, 0, 0, -1.2, 0.2, 0.3, -0.3, 0.1, -0.1]), 3));
        const lWing = new THREE.Mesh(wGeo, wMat);
        this.gliderMesh.add(lWing);
        const rWing = lWing.clone();
        rWing.scale.set(-1, 1, 1);
        this.gliderMesh.add(rWing);
        this.bodyMesh.add(this.gliderMesh);

        this.shieldGroup = new THREE.Group();
        this.shieldMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        this.shieldMesh.rotation.x = Math.PI / 2;
        this.shieldGroup.add(this.shieldMesh);
        this.shieldGroup.position.set(0, 0.1, -0.2);
        this.bodyMesh.add(this.shieldGroup);
    }

    applyCharacterData() {
        this.hp = this.characterData.stats.hp;
        this.maxHp = this.characterData.stats.hp;
        this.maxStamina = this.characterData.stats.stamina;
        this.stamina = this.maxStamina;
    }

    initUI() { }

    updateUI() {
        if (this.game.ui) {
            this.game.ui.update(this);
        }
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        if (!this.mesh || !this.body) return;

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        this.checkGround();
        this.updateStamina(dt);
        this.handleState(dt);
        this.checkSanity("After State");
        this.updatePhysics(dt);
        this.checkSanity("After Physics");
        this.updateVisuals(dt);
        this.updateCamera(dt);
        this.updateUI();

        if (this.combat) this.combat.update(dt);
        if (this.animator) this.animator.update(dt);
        if (this.visuals) this.visuals.update(dt);

        if (this.state === 'AIR' && this.combat && this.combat.isAiming) {
            this.stamina -= dt * 10;
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.combat.isAiming = false;
            }
        }
    }

    /**
     * @param {number} dt
     */
    handleState(dt) {
        const grounded = this.checkGround();
        const input = this.getInputVector();
        const speed = input.length();

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
                    if (this.combat && this.combat.lockedTarget && speed > 0.1) {
                        this.state = 'DODGE';
                        this.lastJumpTime = Date.now();
                        const dodgeDir = input.clone().normalize();
                        const force = 25;
                        this.body.velocity.x = dodgeDir.x * force;
                        this.body.velocity.z = dodgeDir.z * force;
                        this.body.velocity.y = 5;
                    } else {
                        // JUMP FORCE TUNED (15 -> 12)
                        this.body.velocity.y = 12;
                        this.state = 'AIR';
                        this.lastJumpTime = Date.now();
                        this.hasReleasedJump = false;
                    }
                } else if (speed > 0.1) {
                    // MOVEMENT LOGIC
                    if (this.input.keys.sprint && !this.exhausted) {
                        this.state = 'SPRINT';
                    } else {
                        this.state = 'RUN';
                    }
                } else {
                    this.state = 'IDLE';
                }
                break;

            case 'GUARD':
                if (!this.input.keys.crouch || speed > 1.0 || this.input.keys.jump) {
                    this.state = 'IDLE';
                }
                break;

            case 'AIR':
                if (!this.input.keys.jump) this.hasReleasedJump = true;
                const taps = this.input.jumpTapCount;

                if (taps === 2 && this.canGlide && !this.exhausted) {
                    this.enterGlide();
                } else if (this.input.keys.jump && this.canGlide && !this.exhausted && this.hasReleasedJump) {
                    this.enterGlide();
                } else if (taps === 3 && this.canSurf && !this.exhausted) {
                    this.state = 'SURF';
                    this.enterSurf();
                    this.input.jumpTapCount = 0;
                }

                if (this.input.keys.crouch) {
                    if (Date.now() - this.lastJumpTime > 400) {
                        this.state = 'DIVE';
                    }
                } else if (this.input.keys.forward && !this.exhausted && this.checkWall()) {
                    this.state = 'CLIMB';
                }

                if (grounded && this.body.velocity.y <= 0) this.state = 'IDLE';
                break;

            case 'DODGE':
                // High friction, controlled dash
                if (Date.now() - this.lastJumpTime > 300) { // Dodge duration
                    this.state = 'IDLE';
                    this.body.velocity.set(0, 0, 0); // Stop sliding
                }
                break;

            case 'DIVE':
                if (grounded) {
                    this.state = 'IDLE';
                    this.screenShake(0.5, 0.2);
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
                    this.state = grounded ? 'IDLE' : 'AIR';
                }
                break;

            case 'SURF':
                if (!this.input.keys.jump) this.hasReleasedJump = true;
                if (this.input.keys.jump && this.hasReleasedJump) {
                    this.exitSurf();
                    this.state = 'AIR';
                    this.body.velocity.y = 8;
                    this.input.jumpTapCount = 0;
                } else if (this.checkGround() && this.body.velocity.length() < 0.5) {
                    this.exitSurf();
                    this.state = 'IDLE';
                }
                break;
        }
    }

    enterGlide() {
        this.state = 'GLIDE';
        this.input.jumpTapCount = 0;
        if (this.body.velocity.y < -1) this.body.velocity.y = -1;
        this.body.angularVelocity.set(0, 0, 0);
    }

    enterSurf() {
        if (this.mesh && this.shieldGroup) {
            this.mesh.attach(this.shieldGroup);
            this.shieldGroup.position.set(0, 0.2, 0);
            this.shieldGroup.rotation.set(0, 0, 0);
            this.shieldMesh.scale.set(1.5, 1, 1.5);
        }
    }

    exitSurf() {
        if (this.shieldGroup && this.bodyMesh) {
            this.bodyMesh.add(this.shieldGroup);
            this.shieldGroup.position.set(0, 0.1, -0.2);
            this.shieldMesh.scale.set(1, 1, 1);
        }
    }

    /**
     * @param {number} dt
     */
    updatePhysics(dt) {
        if (!this.mesh || !this.body) return;
        this.body.wakeUp();

        // Interaction Check
        this.checkInteraction();

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

        // Locked Movement Override
        if (this.combat && this.combat.lockedTarget && grounded && this.state !== 'DODGE') {
            // Locked strafe logic can be refined here
        }

        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.9;

        switch (this.state) {
            case 'GUARD':
                this.body.velocity.set(0, 0, 0);
                this.body.linearDamping = 1.0;
                break;

            case 'AIR':
                if (this.body.velocity.y < -30) this.body.velocity.y = -30;
                this.body.velocity.y -= 12 * dt;
                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 5;
                    this.body.velocity.z += input.z * dt * 5;
                }
                break;

            case 'DIVE':
                this.body.velocity.y = -50;
                this.body.linearDamping = 0.0;
                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 10;
                    this.body.velocity.z += input.z * dt * 10;
                }
                break;

            case 'GLIDE':
                if (this.body.velocity.y > -2.0) this.body.velocity.y -= 5.0 * dt;
                else this.body.velocity.y = -2.0;

                if (inputLen > 0) {
                    this.body.velocity.x = input.x * 15;
                    this.body.velocity.z = input.z * 15;
                    const angle = Math.atan2(input.x, input.z);
                    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                    this.body.quaternion.slerp(q, 0.1);
                } else {
                    this.body.linearDamping = 0.9;
                }
                this.body.angularVelocity.set(0, 0, 0);
                break;

            case 'SURF':
                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 20;
                    this.body.velocity.z += input.z * dt * 20;
                }
                this.body.linearDamping = 0.01;
                break;

            case 'CLIMB':
                this.body.velocity.set(0, 0, 0);
                if (this.input.keys.forward) this.body.velocity.y = 3;
                if (this.input.keys.backward) this.body.velocity.y = -3;
                break;

            case 'SWIM':
                this.body.linearDamping = 0.8;
                this.body.velocity.y += 10 * dt;
                if (this.mesh.position.y > 1.3) this.body.velocity.y = Math.min(0, this.body.velocity.y);
                if (inputLen > 0) {
                    this.body.velocity.x += input.x * dt * 8;
                    this.body.velocity.z += input.z * dt * 8;
                }
                break;

            case 'SPRINT':
            case 'RUN':
            case 'WALK':
            case 'IDLE':
                // SPEEDS TUNED: SPRINT=12, RUN=7, WALK=4
                let targetSpeed = this.state === 'SPRINT' ? 12 : (this.state === 'RUN' ? 7 : 4);
                const accel = (this.state === 'IDLE') ? 25.0 : 10.0;
                this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed * inputLen, dt * accel);

                if (inputLen > 0.1) {
                    this.body.velocity.x = moveDir.x * this.currentSpeed;
                    this.body.velocity.z = moveDir.z * this.currentSpeed;
                } else if (grounded) {
                    this.body.velocity.x = 0;
                    this.body.velocity.z = 0;
                }
                if (!grounded) this.body.velocity.y -= 10 * dt;
                break;
        }

        if (inputLen > 0.1 && (!this.combat || !this.combat.lockedTarget)) {
            const angle = Math.atan2(input.x, input.z);
            let current = this.mesh.rotation.y;
            let diff = angle - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * dt * 15;
        } else if (this.combat && this.combat.lockedTarget && this.combat.lockedTarget.mesh) {
            // Locked Movement (Strafing)
            const targetPos = this.combat.lockedTarget.mesh.position;
            const playerPos = this.mesh.position;
            const dx = targetPos.x - playerPos.x;
            const dz = targetPos.z - playerPos.z;
            const angle = Math.atan2(dx, dz);

            let current = this.mesh.rotation.y;
            let diff = angle - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * dt * 20;
        }

        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 0.5;
    }

    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        if (!this.mesh) return;

        // If playing a procedural animation, override manual transforms
        if (this.animator && this.animator.isPlaying) {
            return;
        }

        const time = Date.now() * 0.005; // Base time scale
        let targetRotX = 0, targetRotY = 0, targetRotZ = 0, targetPosY = 0.95;

        // Limbs Rotation State (x, y, z)
        let lArmRot = { x: 0, y: 0, z: 0.1 }; // Slight A-pose
        let rArmRot = { x: 0, y: 0, z: -0.1 };
        let lLegRot = { x: 0, y: 0, z: 0 };
        let rLegRot = { x: 0, y: 0, z: 0 };

        // Articulated Parts (Indices: ForeArm, Shin)
        let lForeArmRot = { x: -0.2, y: 0, z: 0 }; // Natural bend
        let rForeArmRot = { x: -0.2, y: 0, z: 0 };
        let lShinRot = { x: 0, y: 0, z: 0 };
        let rShinRot = { x: 0, y: 0, z: 0 };

        const lerpFactor = dt * 15;

        if (this.gliderMesh) this.gliderMesh.visible = (this.state === 'GLIDE');

        switch (this.state) {
            case 'GLIDE':
                targetRotX = 0.5;
                lArmRot.z = 0.2; rArmRot.z = -0.2;
                lArmRot.x = -1.5; rArmRot.x = -1.5;
                lLegRot.x = 0.2; rLegRot.x = 0.2;
                lShinRot.x = 0.5; rShinRot.x = 0.5; // Legs up
                break;

            case 'DIVE':
                targetRotX = -1.5;
                lArmRot.x = -3.0; rArmRot.x = -3.0;
                lLegRot.x = 0.2; rLegRot.x = 0.2;
                break;

            case 'IDLE':
                // "Ready" Stance: Knees bent, feet apart
                targetPosY = 0.90 + Math.sin(time * 2) * 0.005; // Breathe

                lLegRot.z = -0.05; rLegRot.z = 0.05; // Wide stance
                lLegRot.x = -0.1; rLegRot.x = -0.1; // Thighs forward
                lShinRot.x = 0.2; rShinRot.x = 0.2; // Knees bent (Counter thigh)

                // Arms ready
                lArmRot.z = 0.1; rArmRot.z = -0.1;
                lArmRot.x = Math.sin(time * 1.5) * 0.03;
                rArmRot.x = Math.cos(time * 1.5) * 0.03;
                break;

            case 'RUN':
            case 'WALK':
            case 'SPRINT':
                targetRotX = Math.min(this.currentSpeed * 0.05, 0.2); // Lean forward
                const runSpeed = this.currentSpeed * 0.8; // Speed multiplier
                const t = time * runSpeed;

                // --- LEGS (Sinus) ---
                // Thighs
                lLegRot.x = Math.cos(t);
                rLegRot.x = Math.cos(t + Math.PI);

                // Shins (Bend when leg moves backward/up)
                // Logic: When Thigh is going Back (cos > 0 ?? no), we plant.
                // When Thigh moves Forward (lift), Knee bends.
                // Simple trick: max(0, sin) offset properly
                lShinRot.x = Math.max(0, Math.sin(t + 0.5) * 1.5);
                rShinRot.x = Math.max(0, Math.sin(t + Math.PI + 0.5) * 1.5);

                // --- ARMS (Opposite Leg) ---
                lArmRot.x = Math.cos(t + Math.PI) * 0.8;
                rArmRot.x = Math.cos(t) * 0.8;

                // Forearms (Inertia - lag behind arm)
                lForeArmRot.x = -0.5 - Math.cos(t + Math.PI) * 0.3;
                rForeArmRot.x = -0.5 - Math.cos(t) * 0.3;

                // --- BODY BOB & TILT (BANKING) ---
                // Bounce on every step (frequency * 2)
                const bounce = Math.abs(Math.sin(t));
                targetPosY = 0.94 + bounce * 0.04;

                // Sway Side-to-Side
                targetRotZ = Math.cos(t) * 0.05;

                // Banking (Lean into turn)
                // We need rotationDelta. Let's approximate from rotation velocity or Input
                // Simple approach: Input Left/Right gives z-tilt
                if (this.input.keys.left) targetRotZ += 0.15;
                if (this.input.keys.right) targetRotZ -= 0.15;

                break;
        }

        if (this.bodyMesh && this.state !== 'SURF') {
            this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, targetRotY, lerpFactor);
            this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetRotX, lerpFactor);
            this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, targetRotZ, lerpFactor);
            this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetPosY, lerpFactor);
        }

        // Apply Rotations
        this.animateLimb(this.leftArm, lArmRot, lerpFactor);
        this.animateLimb(this.rightArm, rArmRot, lerpFactor);
        this.animateLimb(this.leftLeg, lLegRot, lerpFactor);
        this.animateLimb(this.rightLeg, rLegRot, lerpFactor);

        // Sub-Limbs
        this.animateLimb(this.leftForeArm, lForeArmRot, lerpFactor);
        this.animateLimb(this.rightForeArm, rForeArmRot, lerpFactor);
        this.animateLimb(this.leftShin, lShinRot, lerpFactor);
        this.animateLimb(this.rightShin, rShinRot, lerpFactor);

        // Head Tracking
        this.updateHeadTracking(dt);

        if (this.isAttacking) {
            // Attack Overrides...
            if (this.rightForeArm) this.rightForeArm.rotation.x = -0.1; // Stiffen arm
            rArmRot.x = -0.5; rArmRot.z = -0.5;
            this.updateAttackVisuals(dt);
        }
    }

    /**
     * @param {number} dt
     */
    updateAttackVisuals(dt) {
        if (!this.rightHand) return;
        this.attackTimer += dt;
        const progress = Math.min(this.attackTimer / this.attackDuration, 1.0);

        // Easing Helper
        /** @param {number} t */
        const easeOutQuad = t => t * (2 - t);
        /** @param {number} x */
        const easeInOutSine = x => -(Math.cos(Math.PI * x) - 1) / 2;

        const weaponType = this.equippedWeapon ? this.equippedWeapon.weaponType : 'SWORD';
        const combo = this.currentComboIndex || 0;

        switch (weaponType) {
            case 'SWORD': {
                // Combo 1: Diagonal Right->Left
                // Combo 2: Horizontal Left->Right
                // Combo 3: Thrust / Overhead
                const t = Math.sin(progress * Math.PI);

                if (combo === 0) {
                    this.rightArm.rotation.x = -1.0 + t * 0.5;
                    this.rightArm.rotation.y = -0.5 - t * 1.5; // Swipe Right to Left
                    this.rightArm.rotation.z = -0.5 - t * 0.5;
                } else if (combo === 1) {
                    this.rightArm.rotation.x = -1.0 + t * 0.5;
                    this.rightArm.rotation.y = -2.0 + t * 2.5; // Swipe Left to Right (Start from left)
                    this.rightArm.rotation.z = -0.5 + t * 0.5;
                } else {
                    // Thrust
                    const poke = easeOutQuad(progress);
                    this.rightArm.rotation.x = -1.5;
                    this.rightArm.rotation.y = -0.5;
                    // @ts-ignore
                    this.rightArm.position.z = Math.sin(progress * Math.PI) * 0.8; // Deep lunge
                }
                break;
            }

            case 'GREATSWORD': {
                // Heavy, Slow
                if (combo < 2) {
                    // Wide Sweep
                    // Windup
                    if (progress < 0.4) {
                        const t = progress / 0.4;
                        this.rightArm.rotation.y = THREE.MathUtils.lerp(0, -1.5, t); // Wind right
                        this.rightArm.rotation.x = -1.0;
                    } else {
                        // Swing
                        const t = (progress - 0.4) / 0.6;
                        this.rightArm.rotation.y = THREE.MathUtils.lerp(-1.5, 1.5, easeOutQuad(t));

                        // Shake
                        if (t > 0.2 && !this.shakeTriggered) {
                            this.screenShake(0.2, 0.2);
                            this.shakeTriggered = true;
                        }
                    }
                } else {
                    // Overhead Smash (Combo 3)
                    if (progress < 0.4) {
                        const t = progress / 0.4;
                        this.rightArm.rotation.x = THREE.MathUtils.lerp(-0.5, -2.5, t); // Wind back
                    } else {
                        const t = (progress - 0.4) / 0.6;
                        const val = easeOutQuad(t);
                        this.rightArm.rotation.x = THREE.MathUtils.lerp(-2.5, 1.0, val); // Smash
                        if (val > 0.5 && !this.shakeTriggered) {
                            this.screenShake(0.5, 0.3); // Heavy Shake
                            this.shakeTriggered = true;
                        }
                    }
                }
                break;
            }

            case 'DAGGER': {
                // Hyper Styled Dagger Combos
                const t = easeOutQuad(progress);
                const sinPi = Math.sin(progress * Math.PI);

                // Arms: Start raised and ready
                this.rightArm.rotation.x = -1.5;
                this.leftArm.rotation.x = -1.5;

                if (combo === 0) {
                    // 1. Right Backhand Slit + Body Twist
                    // Twist body left to emphasize right slash
                    this.bodyMesh.rotation.y = THREE.MathUtils.lerp(0, 0.5, sinPi);

                    this.rightArm.rotation.y = THREE.MathUtils.lerp(-0.5, -2.0, sinPi);
                    this.rightArm.rotation.x = -1.2;
                    // @ts-ignore
                    this.rightArm.position.z = sinPi * 0.4;
                    // Left Arm Guarding
                    this.leftArm.rotation.x = -1.0;
                    this.leftArm.rotation.z = 0.5;
                } else if (combo === 1) {
                    // 2. Left Backhand Slit + Body Twist
                    // Twist body right
                    this.bodyMesh.rotation.y = THREE.MathUtils.lerp(0, -0.5, sinPi);

                    this.leftArm.rotation.y = THREE.MathUtils.lerp(0.5, 2.0, sinPi);
                    this.leftArm.rotation.x = -1.2;
                    // @ts-ignore
                    this.leftArm.position.z = sinPi * 0.4;
                    // Right Arm Guarding
                    this.rightArm.rotation.x = -1.0;
                    this.rightArm.rotation.z = -0.5;
                } else {
                    // 3. X-Scissor Dash
                    // Crouch/Lean forward
                    this.bodyMesh.rotation.x = 0.5 * sinPi;

                    // Wide Open -> Snap Shut
                    // Phase 1: Open Wide
                    if (progress < 0.2) {
                        this.rightArm.rotation.y = -0.5;
                        this.leftArm.rotation.y = 0.5;
                    } else {
                        // Phase 2: Snap
                        const snap = (progress - 0.2) / 0.8;
                        this.rightArm.rotation.y = THREE.MathUtils.lerp(-0.5, -1.8, snap); // Cross inwards
                        this.leftArm.rotation.y = THREE.MathUtils.lerp(0.5, 1.8, snap);    // Cross inwards
                        // @ts-ignore
                        this.rightArm.position.z = snap * 0.5;
                        // @ts-ignore
                        this.leftArm.position.z = snap * 0.5;

                        // Screen Shake on impact
                        if (snap > 0.5 && !this.shakeTriggered) {
                            this.screenShake(0.3, 0.15);
                            this.shakeTriggered = true;
                        }
                    }
                }
                break;
            }

            case 'SPEAR': {
                const t = easeOutQuad(progress);
                if (combo < 2) {
                    // Piston Thrust
                    const thrust = Math.sin(progress * Math.PI);
                    // High vs Low?
                    const heightBias = combo === 0 ? 0.2 : -0.2;

                    this.rightArm.rotation.x = -1.5 + heightBias;
                    // @ts-ignore
                    this.rightArm.position.z = thrust * 0.6; // Reach
                } else {
                    // Spin (Combo 3)
                    this.rightArm.rotation.x = -1.5;
                    this.rightArm.rotation.z = t * Math.PI * 4; // 2 spins

                    // Body Spin
                    this.bodyMesh.rotation.y += dt * 10;
                }
                break;
            }

            case 'DOUBLE_BLADE': {
                // Helicopter
                if (combo === 0) {
                    // Vertical Spin (Side)
                    if (this.weaponSlot) this.weaponSlot.rotation.x += dt * 20;
                    this.rightArm.rotation.z = -1.5; // Arm side
                } else {
                    // Horizontal Spin (Helicopter)
                    this.rightArm.rotation.x = -1.5; // Arm forward
                    this.rightArm.rotation.z = -1.5; // Blade Horizontal
                    if (this.weaponSlot) this.weaponSlot.rotation.y += dt * 25; // Faster

                    if (combo === 2) {
                        this.bodyMesh.rotation.y += dt * 15; // Body Spin too
                    }
                }
                break;
            }

            default: {
                // Fallback
                const t = Math.sin(progress * Math.PI);
                this.rightArm.rotation.x = -1.0 + t * 0.5;
                this.rightArm.rotation.y = -0.5 - t * 1.5;
                break;
            }
        }

        if (progress >= 1.0) {
            this.isAttacking = false;
            this.shakeTriggered = false;
            // Reset transforms that might persist
            // @ts-ignore
            this.rightArm.position.z = 0;
            // @ts-ignore
            this.leftArm.position.z = 0; // Reset Dagger offhand
            // Reset weapon slot rotations
            if (this.weaponSlot) {
                this.weaponSlot.rotation.set(Math.PI / 2, 0, 0);
            }
        }
    }

    /**
     * @param {number} comboIndex
     */
    triggerAttackVisuals(comboIndex) {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.currentComboIndex = comboIndex;
        this.shakeTriggered = false;

        const type = this.equippedWeapon ? this.equippedWeapon.weaponType : 'SWORD';
        switch (type) {
            case 'GREATSWORD': this.attackDuration = 0.9; break;
            case 'DAGGER': this.attackDuration = 0.15; break;
            case 'SWORD': default: this.attackDuration = 0.3; break;
        }
    }

    /**
     * @param {THREE.Object3D} limb
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
    updateCamera(dt) {
        if (!this.mesh) return;
        const targetPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.9, 0));
        this.cameraLagPos.lerp(targetPos, dt * 5);

        const dist = this.cameraState.distance;
        const theta = this.cameraState.theta;
        const phi = this.cameraState.phi;

        const x = this.cameraLagPos.x + dist * Math.sin(phi) * Math.sin(theta);
        const y = this.cameraLagPos.y + dist * Math.cos(phi);
        const z = this.cameraLagPos.z + dist * Math.sin(phi) * Math.cos(theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.cameraLagPos);

        // Z-Targeting Camera Override
        if (this.combat && this.combat.lockedTarget && this.combat.lockedTarget.mesh) {
            // Position: Behind Player, slightly offset
            const targetPos = this.combat.lockedTarget.mesh.position.clone();
            const playerPos = this.mesh.position.clone();

            // Vector from Target to Player
            const dir = new THREE.Vector3().subVectors(playerPos, targetPos).normalize();

            // Ideal Cam Pos: PlayerPos + Direction * distance + height
            const camDist = 6.0;
            const camHeight = 3.0;
            const idealPos = playerPos.clone().add(dir.multiplyScalar(camDist));
            idealPos.y += camHeight;

            // Smoothly interpolate
            this.camera.position.lerp(idealPos, dt * 5);

            // Look at Midpoint or Target?
            // Zelda typically keeps player in foreground, target in bg.
            // Let's look at target but biased slightly up
            const lookAtPos = targetPos.clone().add(new THREE.Vector3(0, 1.0, 0));
            this.camera.lookAt(lookAtPos);
        }

        if (this.shakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        }
    }

    /**
     * @param {number} duration
     */
    hitStop(duration) { this.hitStopTimer = duration; }
    /**
     * @param {number} intensity
     * @param {number} duration
     */
    screenShake(intensity, duration) { this.shakeIntensity = intensity; this.shakeTimer = duration; }

    /**
     * @param {string} name
     * @param {boolean} [loop]
     */
    playAnimation(name, loop = false) { }

    checkGround() {
        if (!this.world || !this.mesh) return false;
        const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 0.8);
        if (this.world.terrainManager) {
            const hits = raycaster.intersectObjects(this.world.terrainManager.group.children, true);
            if (hits.length > 0) return true;
        }
        return false;
    }

    checkWall() { return false; } // Simplified

    getInputVector() {
        const v = new THREE.Vector3();
        if (this.inputLocked) return v;
        if (this.input.keys.forward) v.z -= 1;
        if (this.input.keys.backward) v.z += 1;
        if (this.input.keys.left) v.x -= 1;
        if (this.input.keys.right) v.x += 1;
        if (this.cameraState) v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraState.theta);
        return v;
    }

    getForwardVector() {
        const v = new THREE.Vector3(0, 0, -1);
        if (this.mesh) v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        return v;
    }

    /**
     * @param {number} dt
     */
    updateStamina(dt) {
        if (this.state === 'IDLE' || this.state === 'WALK') {
            this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);
        } else {
            // Drain logic if needed, currently mostly event based
        }
    }

    /**
     * @param {string} label
     */
    checkSanity(label) {
        if (!this.body) return;
        if (isNaN(this.body.position.y)) {
            console.warn("NaN Physics detected", label);
            this.body.position.set(0, 50, 0);
            this.body.velocity.set(0, 0, 0);
        }
    }

    /**
     * @param {THREE.Vector3} pos
     * @param {string|number} [color]
     */
    spawnHitParticles(pos, color) {
        // Implementation can be added back if needed
    }

    checkInteraction() {
        // Debounce Logic
        if (this.input.keys.interact) {
            if (this.interactDebounce) return;
            this.interactDebounce = true;

            // Perform Interaction
            if (this.world && this.world.interactables) {
                const playerPos = this.mesh.position;
                /** @type {any} */
                let closest = null;
                let minDst = 999;

                this.world.interactables.forEach(obj => {
                    if (!obj.mesh) return;
                    const d = playerPos.distanceTo(obj.mesh.position);
                    if (d < (obj.interactionRadius || 5)) {
                        if (d < minDst) {
                            minDst = d;
                            closest = obj;
                        }
                    }
                });

                // @ts-ignore
                if (closest && closest.interact) {
                    console.log("Player interacting with:", closest);
                    closest.interact();
                }
            }
        } else {
            this.interactDebounce = false;
        }
    }

    /**
     * @param {string} itemId 
     */
    equipWeapon(itemId) {
        const item = this.game.data.getItem(itemId);
        if (!item) return;

        if (this.equippedWeapon) {
            while (this.weaponSlot.children.length > 0) {
                this.weaponSlot.remove(this.weaponSlot.children[0]);
            }
        }

        this.equippedWeapon = item;
        this.updateStats();
        console.log(`Equipping [Procedural]: ${item.name}`);

        if (this.game.story) {
            this.game.story.triggerEvent('EQUIP_WEAPON', { id: itemId });
        }

        const meshGroup = WeaponGenerator.createWeapon(item);
        meshGroup.rotation.x = -Math.PI / 2;
        this.weaponSlot.add(meshGroup);

        if (this.leftWeaponSlot) {
            // Clear left hand
            while (this.leftWeaponSlot.children.length > 0) {
                this.leftWeaponSlot.remove(this.leftWeaponSlot.children[0]);
            }

            // Dual Wield Daggers
            if (item.weaponType === 'DAGGER') {
                const offHandMesh = WeaponGenerator.createWeapon(item);
                offHandMesh.rotation.x = -Math.PI / 2;
                // Mirror if asymmetric? Daggers usually symmetric.
                // Just add it.
                this.leftWeaponSlot.add(offHandMesh);
            }
        }

        if (this.combat) {
            // combat logic
        }
    }

    /**
     * @param {number} dt
     */
    updateHeadTracking(dt) {
        if (!this.head) return;

        let targetLookY = 0;
        let targetLookX = 0;

        if (this.combat && this.combat.lockedTarget && this.combat.lockedTarget.mesh) {
            // LOOK AT TARGET
            const targetPos = this.combat.lockedTarget.mesh.position;
            const myPos = this.mesh.position;

            // Vector to target
            const dx = targetPos.x - myPos.x;
            const dz = targetPos.z - myPos.z;
            const dy = (targetPos.y + 1.0) - (myPos.y + 1.5); // Look at head height

            // Convert global angle to local head angle
            // Global Angle
            const angleGlobal = Math.atan2(dx, dz);
            // Player Body Angle
            const bodyRot = this.mesh.rotation.y;

            // Diff
            let diff = angleGlobal - bodyRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            // Clamp Neck Twist (45 deg)
            targetLookY = Math.max(-0.8, Math.min(0.8, diff));

            // Pitch (Up/Down)
            const dist = Math.sqrt(dx * dx + dz * dz);
            targetLookX = -Math.atan2(dy, dist);
            targetLookX = Math.max(-0.5, Math.min(0.5, targetLookX));

        } else if (this.currentSpeed > 0.1) {
            // LOOK INTO TURN
            // If turning left, look left. 
            // We can approximate turn by Input
            // Or better, just slightly bias towards movement direction relative to camera?
            // Simple: Look slightly into the turn
            if (this.input.keys.left) targetLookY = 0.5; // Look Left
            if (this.input.keys.right) targetLookY = -0.5; // Look Right
        }

        // Apply
        const lerpSpeed = dt * 5;
        this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, targetLookY, lerpSpeed);
        this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, targetLookX, lerpSpeed);
    }
}
