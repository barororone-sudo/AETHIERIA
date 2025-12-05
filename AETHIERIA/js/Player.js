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

        // 5. Glider (Paraglider) - Procedural Triangle
        const gliderGeo = new THREE.ConeGeometry(1.5, 1.0, 3); // Triangle shape
        gliderGeo.rotateX(Math.PI / 2); // Flat
        gliderGeo.rotateY(Math.PI); // Point forward
        const gliderMat = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            side: THREE.DoubleSide,
            roughness: 0.5
        });

        this.gliderMesh = new THREE.Mesh(gliderGeo, gliderMat);
        this.gliderMesh.position.set(0, 1.5, -0.5);
        this.gliderMesh.visible = false;
        this.mesh.add(this.gliderMesh);

        // 6. Shield Group (Surfboard / Back)
        this.shieldGroup = new THREE.Group();

        // Shield Visual
        const shieldGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Wood
            roughness: 0.8
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.rotation.x = Math.PI / 2; // Flat
        this.shieldGroup.add(this.shieldMesh);

        // Default Position: On Back
        this.shieldGroup.position.set(0, 0.0, -0.35); // Relative to bodyMesh center
        this.bodyMesh.add(this.shieldGroup); // Attach to body by default

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

        // PANIC BUTTON (P) - Reset Position
        if (this.game.input.keys.p || (this.input.keys.interact && this.input.keys.jump)) { // Fallback combo
            // console.log("PANIC RESET TRIGGERED");
            this.body.position.set(0, 50, 0);
            this.body.velocity.set(0, 0, 0);
            this.state = 'AIR';
            this.body.wakeUp();
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
                    this.body.velocity.y = 18; // Heroic Jump (User Request: 18)
                    this.state = 'AIR';
                    this.lastJumpTime = Date.now();
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
                if (!this.input.keys.crouch || speed > 0.1) {
                    this.state = 'IDLE';
                }
                break;

            case 'AIR':
                if (!this.input.keys.jump) this.hasReleasedJump = true;

                // Read Tap Count
                const taps = this.input.jumpTapCount;

                // Double Tap -> Glide (Keep as backup)
                if (taps === 2 && this.canGlide && !this.exhausted) {
                    this.state = 'GLIDE';
                    this.input.jumpTapCount = 0; // Consume
                }
                // Single Press High Air -> Glide (New Logic)
                else if (this.input.keys.jump && this.canGlide && !this.exhausted && this.hasReleasedJump) {
                    // Check Height
                    if (this.mesh && this.world && this.world.terrainManager && this.world.terrainManager.group) {
                        const rayOrigin = this.mesh.position.clone();
                        const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, 100); // Check down
                        const intersects = raycaster.intersectObjects(this.world.terrainManager.group.children, true);

                        // If ground is far enough (> 3m)
                        if (intersects.length > 0 && intersects[0].distance > 3.0) {
                            this.state = 'GLIDE';
                            this.body.velocity.y = Math.max(this.body.velocity.y, -1.0); // Air Brake
                            this.body.angularVelocity.set(0, 0, 0); // Stop spinning

                            // Align rotation to camera/input immediately if moving
                            const input = this.getInputVector();
                            if (input.length() > 0) {
                                const angle = Math.atan2(input.x, input.z);
                                const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                                this.body.quaternion.copy(q);
                            }

                            this.hasReleasedJump = false; // Prevent spam
                        } else if (intersects.length === 0) {
                            // No ground found (void) -> Glide allowed
                            this.state = 'GLIDE';
                            this.body.velocity.y = Math.max(this.body.velocity.y, -1.0); // Air Brake
                            this.body.angularVelocity.set(0, 0, 0);
                            this.hasReleasedJump = false;
                        }
                    }
                }
                // Triple Tap -> Surf
                else if (taps === 3 && this.canSurf && !this.exhausted) {
                    this.state = 'SURF';
                    this.enterSurf();
                    this.input.jumpTapCount = 0; // Consume
                }

                // Landing Assist: Force down if close to ground but not grounded yet
                if (this.mesh && this.world && this.world.terrainManager && this.world.terrainManager.group && this.body.velocity.y > -1) {
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
                    this.state = 'DIVE';
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
                // "Zelda Style" Flight Physics

                // 1. Gravity / Lift
                // Constant slow descent (Terminal Velocity)
                const glideTerminalVelocity = -2.0;
                if (this.body.velocity.y > glideTerminalVelocity) {
                    this.body.velocity.y -= 5.0 * dt; // Gravity towards terminal
                } else {
                    this.body.velocity.y = glideTerminalVelocity; // Clamp
                }

                // 2. Movement
                const baseGlideSpeed = 8.0; // Always move slightly
                const boostSpeed = 12.0;

                if (inputLen > 0) {
                    // Active Control
                    // Rotate character to face input direction smoothly
                    const angle = Math.atan2(input.x, input.z);
                    const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                    this.body.quaternion.slerp(targetQ, 0.1);

                    // Move in facing direction
                    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.body.quaternion);
                    this.body.velocity.x = forward.x * boostSpeed;
                    this.body.velocity.z = forward.z * boostSpeed;

                } else {
                    // Passive Gliding (Drifting forward)
                    // If no input, keep current orientation but move slower
                    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.body.quaternion);
                    this.body.velocity.x = forward.x * baseGlideSpeed;
                    this.body.velocity.z = forward.z * baseGlideSpeed;
                }

                // 3. Stabilization (Prevent twisting)
                this.body.angularVelocity.set(0, 0, 0);
                break;

            case 'SURF':
                // Check for exit via JUMP
                if (this.input.keys.jump && !this.exhausted) {
                    this.exitSurf();
                    this.state = 'AIR';
                    this.body.velocity.y = 8;
                    this.input.jumpTapCount = 0;
                    this.hasReleasedJump = false;
                }
                // Check for exit via STOP or CROUCH RELEASE (optional, but good for control)
                else if (!this.input.keys.crouch) {
                    this.exitSurf();
                    this.state = grounded ? 'IDLE' : 'AIR';
                }

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
        if (!this.mesh || !this.bodyMesh || !this.leftHand || !this.rightHand) return;

        const time = Date.now() * 0.001;

        // Reset base transforms
        let targetRotX = 0;
        let targetRotY = 0;
        let targetRotZ = 0;
        let targetPosY = 0.6; // Default height

        // Hand targets (relative to body)
        let leftHandPos = new THREE.Vector3(-0.5, 0, 0);
        let rightHandPos = new THREE.Vector3(0.5, 0, 0);
        let leftHandRot = new THREE.Euler(0, 0, 0);
        let rightHandRot = new THREE.Euler(0, 0, 0);

        // --- STATE MACHINE VISUALS ---

        if (this.gliderMesh) this.gliderMesh.visible = false; // Hide by default

        switch (this.state) {
            case 'GUARD':
                // Body Upright
                targetRotX = 0;

                // Shield in front
                if (this.shieldGroup) {
                    this.shieldGroup.position.set(0, 0.2, 0.5); // In front of chest
                    this.shieldGroup.rotation.set(0, 0, 0);
                }
                break;

            case 'GLIDE':
                // Superman Pose
                targetRotX = Math.PI / 2; // Face down
                targetPosY = 0.0; // Align with hitbox center

                // Arms T-Pose / Wings
                leftHandPos.set(-0.8, 0, 0.2);
                rightHandPos.set(0.8, 0, 0.2);

                // Glide Particles (Wind Trail)
                if (Math.random() > 0.7) {
                    const offset = new THREE.Vector3((Math.random() - 0.5) * 1, 0, (Math.random() - 0.5) * 1);
                    this.spawnHitParticles(this.mesh.position.clone().add(offset));
                }

                if (this.gliderMesh) this.gliderMesh.visible = true;
                break;

            case 'DIVE':
                // Head Down
                targetRotX = -Math.PI / 2;
                targetPosY = 0.0;

                // Arms along body
                leftHandPos.set(-0.4, 0.5, 0);
                rightHandPos.set(0.4, 0.5, 0);

                // Trail Effect (Simple particles)
                if (Math.random() > 0.5) {
                    this.spawnHitParticles(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x00ffff); // Cyan
                }
                break;

            case 'SURF':
                // Skater Pose
                targetRotY = -Math.PI / 2; // Sideways
                targetRotX = -0.35; // Lean back (-20 deg)
                targetPosY = 0.3; // Crouch

                // Balance Arms
                leftHandPos.set(-0.6, 0.2, -0.2); // Back arm up
                rightHandPos.set(0.6, -0.1, 0.2); // Front arm down

                // Shield under feet (Re-parent to Root Mesh)
                if (this.shieldGroup && this.shieldGroup.parent !== this.mesh) {
                    this.mesh.attach(this.shieldGroup);
                    this.shieldGroup.position.set(0, -0.5, 0); // Under feet
                    this.shieldGroup.rotation.set(0, 0, 0); // Flat
                }
                break;

            default:
                // Reset Shield to Back (Re-parent to Body)
                if (this.shieldGroup && this.shieldGroup.parent !== this.bodyMesh) {
                    this.bodyMesh.attach(this.shieldGroup);
                    this.shieldGroup.position.set(0, 0.0, -0.35);
                    this.shieldGroup.rotation.set(0, 0, 0);
                }
                break;

                // Dynamic Balance
                const surfBob = Math.sin(time * 5) * 0.05;
                leftHandPos.y += surfBob;
                rightHandPos.y -= surfBob;
                break;

            case 'CLIMB':
                // Spiderman / Link Climb
                targetRotX = -0.2; // Slight lean into wall
                targetPosY = 0.6;

                // Alternating Reach
                if (this.input.keys.forward || this.input.keys.backward || this.input.keys.left || this.input.keys.right) {
                    const climbSpeed = 10;
                    leftHandPos.y = 0.5 + Math.sin(time * climbSpeed) * 0.4;
                    rightHandPos.y = 0.5 + Math.cos(time * climbSpeed) * 0.4;
                } else {
                    // Hold still
                    leftHandPos.y = 0.6;
                    rightHandPos.y = 0.6;
                }
                leftHandPos.z = 0.3; // Reach forward
                rightHandPos.z = 0.3;
                break;

            case 'SWIM':
                // Head above water
                targetRotX = Math.PI / 4; // 45 deg swimming

                // Bobbing
                const swimBob = Math.sin(time * 3) * 0.1;
                targetPosY = 0.2 + swimBob; // Lower body submerged

                // Breaststroke Arms
                const swimCycle = time * 3;
                leftHandPos.x = -0.5 + Math.sin(swimCycle) * 0.3;
                leftHandPos.z = Math.cos(swimCycle) * 0.3;
                rightHandPos.x = 0.5 - Math.sin(swimCycle) * 0.3;
                rightHandPos.z = Math.cos(swimCycle) * 0.3;
                break;

            case 'SPRINT':
                // Naruto Run / Dash
                targetRotX = 0.8; // ~45 deg forward lean
                targetPosY = 0.5;

                // Frantic Arms (Pumping)
                const runSpeed = 15;
                leftHandPos.z = Math.sin(time * runSpeed) * 0.6;
                leftHandPos.y = Math.cos(time * runSpeed) * 0.2;
                rightHandPos.z = Math.cos(time * runSpeed) * 0.6;
                rightHandPos.y = Math.sin(time * runSpeed) * 0.2;
                break;

            case 'RUN':
            case 'WALK':
                // Normal Run
                targetRotX = Math.min(this.currentSpeed * 0.1, 0.4);

                // Standard Arm Swing
                const walkSpeed = this.currentSpeed * 1.5;
                leftHandPos.z = Math.sin(time * walkSpeed) * 0.5;
                rightHandPos.z = Math.cos(time * walkSpeed) * 0.5;
                break;

            case 'IDLE':
            case 'AIR':
                // Hover Idle
                const hoverY = Math.sin(time * 3) * 0.05;
                targetPosY = 0.6 + hoverY;
                targetRotX = 0;

                // Breathing Arms
                leftHandPos.y = Math.sin(time * 2) * 0.02;
                rightHandPos.y = Math.cos(time * 2) * 0.02;
                break;
        }

        // --- APPLY TRANSFORMS (LERP for smoothness) ---
        const lerpFactor = dt * 10;

        // Body
        // Body
        // Only apply Y rotation if NOT surfing (Surf handles its own sideways rotation)
        if (this.state !== 'SURF') {
            this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, targetRotY, lerpFactor);
        } else {
            this.bodyMesh.rotation.y = targetRotY; // Snap or lerp to sideways
        }

        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetRotX, lerpFactor);
        this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, targetRotZ, lerpFactor);
        this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetPosY, lerpFactor);

        // Hands (Base Position + Animation Offset)
        // Note: Attack animation overrides right hand, so handle that separately

        if (this.isAttacking) {
            this.updateAttackVisuals(dt);

            // Apply Left Hand only
            this.leftHand.position.lerp(leftHandPos, lerpFactor);
        } else {
            this.leftHand.position.lerp(leftHandPos, lerpFactor);
            this.rightHand.position.lerp(rightHandPos, lerpFactor);

            // Reset rotations if not attacking
            this.rightHand.rotation.set(0, 0, 0);
            this.leftHand.rotation.set(0, 0, 0);
        }
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
        const theta = this.cameraState.theta;
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);

        return v;
    }





    getForwardVector() {
        if (!this.mesh) return new THREE.Vector3(0, 0, -1);
        const v = new THREE.Vector3(0, 0, -1);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        return v;
    }
}
