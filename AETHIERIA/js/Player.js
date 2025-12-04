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

        this.hp = 100;
        this.maxHp = 100;

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
        this.lastGenTime = 0; // Debounce for scroll wheel

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

        // Scroll Wheel to Generate Variant
        document.addEventListener('wheel', (e) => {
            if (Date.now() - this.lastGenTime < 200) return; // Debounce
            this.lastGenTime = Date.now();

            this.characterData = generateCharacter();
            this.applyCharacterData();
            this.initVisuals();

            // Optional: Play sound or show small popup?
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

        this.body.position.set(0, 10, 0); // Start in air
        this.world.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        if (!this.world) return;

        // Cleanup existing
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
        }

        this.mesh = new THREE.Group();
        this.world.scene.add(this.mesh);

        // --- CYBER-BOT AVATAR ---

        // 1. Body (Black Box -> Palette[1])
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.characterData.palette[1]),
            roughness: 0.7,
            metalness: 0.5
        });
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.bodyMesh.position.y = 0.6; // Center pivot at feet
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.mesh.add(this.bodyMesh);

        // 2. Visor (Neon Red Eye -> Palette[2])
        const visorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.1);
        const visorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.characterData.palette[2]),
            emissive: new THREE.Color(this.characterData.palette[2]),
            emissiveIntensity: 2.0
        });
        this.visor = new THREE.Mesh(visorGeo, visorMat);
        this.visor.position.set(0, 0.3, 0.2); // Front of face
        this.bodyMesh.add(this.visor);

        // 3. Floating Hands (Rayman Style -> Palette[0])
        const handGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const handMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.characterData.palette[0]),
            emissive: new THREE.Color(this.characterData.palette[0]),
            emissiveIntensity: 0.5
        });

        // Left Hand
        this.leftHand = new THREE.Mesh(handGeo, handMat);
        this.leftHand.position.set(-0.5, 0.0, 0); // Relative to body center (which is at 0.6Y)
        this.bodyMesh.add(this.leftHand);

        // Right Hand (Weapon Slot)
        this.rightHand = new THREE.Mesh(handGeo, handMat);
        this.rightHand.position.set(0.5, 0.0, 0);
        this.bodyMesh.add(this.rightHand);

        // Weapon Slot Attachment
        this.weaponSlot = new THREE.Group();
        // Rotate weapon slot to align sword correctly (Standard swords point UP)
        this.weaponSlot.rotation.x = Math.PI / 2;
        this.rightHand.add(this.weaponSlot);

        // 4. Ambient Glow (PointLight)
        const light = new THREE.PointLight(this.characterData.palette[2], 2, 5);
        light.position.set(0, 1, 0);
        this.mesh.add(light);

        // Equip Weapon immediately
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

        // 1. Combat Lock
        if (this.combat && this.combat.isAttacking) {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
            // Sync visuel simple
            this.mesh.position.copy(this.body.position);
            this.mesh.position.y -= 0.5;
            return;
        }

        const input = this.getInputVector();
        const inputLen = input.length();
        const grounded = this.checkGround();

        // 2. Gestion de la Friction (CRITIQUE : 0 friction quand on bouge)
        if (inputLen > 0.1) {
            this.body.linearDamping = 0.0; // Glisse parfaite
        } else if (grounded) {
            this.body.linearDamping = 0.9; // Freinage sec à l'arrêt
            this.body.velocity.x *= 0.5;
            this.body.velocity.z *= 0.5;
        }

        // 3. Vitesse Cible (Boostée)
        let targetSpeed = 10; // Walk
        if (this.state === 'RUN') targetSpeed = 18; // Run boosté
        if (this.state === 'SPRINT') targetSpeed = 24;

        const accel = (this.state === 'IDLE') ? 10.0 : 5.0;
        this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed * inputLen, dt * accel);

        // 4. Application Mouvement
        let moveDir = input.clone().normalize();

        if (grounded && this.world && this.world.terrainManager) {
            // Raycast Sol
            const rayOrigin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
            const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 2.5);
            const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);

            if (intersects.length > 0) {
                // Pente détectée : on projette
                const groundNormal = intersects[0].face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(intersects[0].object.matrixWorld)).normalize();
                moveDir.projectOnPlane(groundNormal).normalize();

                // Alignement Visuel (Pente)
                const targetUp = groundNormal;
                const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetUp);
                const yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
                this.mesh.quaternion.slerp(alignQuat.multiply(yQuat), dt * 10);
            }

            // APPLICATION VÉLOCITÉ AU SOL
            if (inputLen > 0.1) {
                this.body.velocity.x = moveDir.x * this.currentSpeed;
                this.body.velocity.z = moveDir.z * this.currentSpeed;

                // "Step Assist" : Si on monte (moveDir.y > 0), on aide un peu.
                // Si on est plat, on laisse la physique gérer le Y ou on met 0.
                if (moveDir.y > 0) {
                    this.body.velocity.y = moveDir.y * this.currentSpeed;
                } else {
                    // Petite levitation pour éviter de racler le sol
                    // this.body.velocity.y = 0; 
                }
            }

        } else {
            // EN L'AIR
            if (inputLen > 0.1) {
                this.body.velocity.x += moveDir.x * dt * 20;
                this.body.velocity.z += moveDir.z * dt * 20;

                // Clamp Air Speed
                const hVel = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z);
                if (hVel.length() > targetSpeed) {
                    hVel.normalize().multiplyScalar(targetSpeed);
                    this.body.velocity.x = hVel.x;
                    this.body.velocity.z = hVel.y;
                }
            }
            // Gravité
            if (this.state !== 'SWIM') this.body.velocity.y -= 30 * dt;

            // Reset rotation visuelle X/Z en l'air
            const yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            this.mesh.quaternion.slerp(yQuat, dt * 5);
        }

        // 5. Rotation Personnage (Direction Input)
        const velocityXY = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z);
        if (inputLen > 0.1) { // On utilise l'input pour tourner, plus réactif que la vélocité
            const targetRotationY = Math.atan2(input.x, input.z) + this.cameraState.theta; // Ajuste selon caméra si besoin, ou juste input world space
            // Note: getInputVector renvoie déjà en world space relative caméra, donc :
            const targetRot = Math.atan2(input.x, input.z);

            let currentRot = this.mesh.rotation.y;
            let diff = targetRot - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * dt * 15;
        }

        // 6. Sync Mesh
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 0.5;
    }

    /**
     * @param {number} dt
     */
    /**
     * @param {number} dt
     */
    updateVisuals(dt) {
        if (!this.bodyMesh || !this.leftHand || !this.rightHand) return;

        const time = Date.now() * 0.001;

        // 1. Hover Effect (Idle)
        const hoverY = Math.sin(time * 3) * 0.05;
        this.bodyMesh.position.y = 0.6 + hoverY;

        // 2. Run Tilt
        const tiltAmount = Math.min(this.currentSpeed * 0.05, 0.5);
        this.bodyMesh.rotation.x = tiltAmount;

        // 3. Hand Animation
        if (this.currentSpeed > 1.0) {
            const swingSpeed = 10;
            const swingAmp = 0.5;
            this.leftHand.position.z = Math.sin(time * swingSpeed) * swingAmp;
            this.rightHand.position.z = Math.cos(time * swingSpeed) * swingAmp;
        } else {
            this.leftHand.position.z = THREE.MathUtils.lerp(this.leftHand.position.z, 0, dt * 5);
            this.rightHand.position.z = THREE.MathUtils.lerp(this.rightHand.position.z, 0, dt * 5);

            this.leftHand.position.y = Math.sin(time * 2) * 0.02;
            this.rightHand.position.y = Math.cos(time * 2) * 0.02;
        }

        // 4. Attack Animation Override (Procedural Combo)
        if (this.isAttacking) {
            this.attackTimer += dt;
            const progress = Math.min(this.attackTimer / this.attackDuration, 1.0);

            // Easing (EaseOutQuad)
            const t = 1 - (1 - progress) * (1 - progress);

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
        } else {
            this.rightHand.rotation.x = THREE.MathUtils.lerp(this.rightHand.rotation.x, 0, dt * 10);
            this.rightHand.rotation.y = THREE.MathUtils.lerp(this.rightHand.rotation.y, 0, dt * 10);
            this.rightHand.rotation.z = THREE.MathUtils.lerp(this.rightHand.rotation.z, 0, dt * 10);
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
