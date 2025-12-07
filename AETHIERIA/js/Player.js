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

        // BASE STATS (Weak Start)
        this.baseStats = {
            hp: 50,
            attack: 5,
            defense: 0,
            speed: 1.0
        };

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

        this.updateStats();
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

            this.baseStats.hp += 10;
            this.baseStats.attack += 2;
            this.hp = this.maxHp = this.baseStats.hp;

            this.updateStats();
            if (this.game.ui) this.game.ui.showToast(`NIVEAU SUIVANT ! (Lvl ${this.level})`);
        }
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
    }

    initPhysics() {
        if (!this.world) return;
        const radius = 0.5;
        const shape = new CANNON.Sphere(radius);
        const material = this.world.slipperyMaterial || new CANNON.Material('player');

        this.body = new CANNON.Body({
            mass: 60,
            material: material,
            shape: shape,
            linearDamping: 0.1,
            angularDamping: 0.9,
            fixedRotation: true
        });

        this.body.position.set(0, 50, 0);
        this.body.ccdSpeedThreshold = 1;
        this.body.ccdIterations = 10;

        this.world.physicsWorld.addBody(this.body);
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
                    this.body.velocity.y = 15;
                    this.state = 'AIR';
                    this.lastJumpTime = Date.now();
                    this.hasReleasedJump = false;
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
                let slopeAngle = 0;
                if (grounded && this.world && this.world.terrainManager) {
                    // Simplified slope logic
                }
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
                let targetSpeed = this.state === 'SPRINT' ? 18 : (this.state === 'RUN' ? 12 : 8);
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

        if (inputLen > 0.1) {
            const angle = Math.atan2(input.x, input.z);
            let current = this.mesh.rotation.y;
            let diff = angle - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * dt * 15;
        }

        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 0.5;
    }

    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        if (!this.mesh) return;
        const time = Date.now() * 0.01;
        let targetRotX = 0, targetRotY = 0, targetPosY = 0.95;

        if (this.gliderMesh) this.gliderMesh.visible = (this.state === 'GLIDE');

        let lArmRot = { x: 0, y: 0, z: 0 }, rArmRot = { x: 0, y: 0, z: 0 };
        let lLegRot = { x: 0, y: 0, z: 0 }, rLegRot = { x: 0, y: 0, z: 0 };
        const lerpFactor = dt * 10;

        switch (this.state) {
            case 'GLIDE':
                targetRotX = 0.5;
                lArmRot.z = 0.2; rArmRot.z = -0.2;
                lArmRot.x = -1.5; rArmRot.x = -1.5;
                lLegRot.x = 0.5; rLegRot.x = 0.5;
                break;
            case 'DIVE':
                targetRotX = -1.5;
                lArmRot.x = -3.0; rArmRot.x = -3.0;
                break;
            case 'IDLE':
                targetPosY = 0.95 + Math.sin(time * 0.5) * 0.01;
                break;
            case 'RUN':
            case 'WALK':
                targetRotX = Math.min(this.currentSpeed * 0.05, 0.2);
                const runSpeed = this.currentSpeed * 1.5;
                lLegRot.x = Math.cos(time * runSpeed);
                rLegRot.x = Math.cos(time * runSpeed + Math.PI);
                lArmRot.x = Math.cos(time * runSpeed + Math.PI);
                rArmRot.x = Math.cos(time * runSpeed);
                break;
        }

        if (this.bodyMesh && this.state !== 'SURF') {
            this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, targetRotY, lerpFactor);
            this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetRotX, lerpFactor);
            this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetPosY, lerpFactor);
        }

        this.animateLimb(this.leftArm, lArmRot, lerpFactor);
        this.animateLimb(this.rightArm, rArmRot, lerpFactor);
        this.animateLimb(this.leftLeg, lLegRot, lerpFactor);
        this.animateLimb(this.rightLeg, rLegRot, lerpFactor);

        if (this.isAttacking) {
            rArmRot.x = -0.5; rArmRot.z = -0.5; // Override for attack base
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
        /** @param {number} t */
        function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
        const t = easeOutQuad(progress);

        // Simple Swing
        this.rightHand.rotation.y = THREE.MathUtils.lerp(-Math.PI / 2, Math.PI / 2, t);
        if (progress >= 1.0) this.isAttacking = false;
    }

    /**
     * @param {number} comboIndex
     */
    triggerAttackVisuals(comboIndex) {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.currentComboIndex = comboIndex;
        this.attackDuration = 0.3;
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

        const meshGroup = WeaponGenerator.createWeapon(item);
        meshGroup.rotation.x = -Math.PI / 2;
        this.weaponSlot.add(meshGroup);

        if (this.combat) {
            // combat logic
        }
    }
}
