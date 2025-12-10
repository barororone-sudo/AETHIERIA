// @ts-check
import * as THREE from 'three';
// @ts-ignore
import * as CANNON from 'cannon-es';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ErrorHandler } from './utils/ErrorHandler.js';
import { AssetLoader } from './managers/AssetLoader.js';
import { Renderer } from './Renderer.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { UIManager } from './UI.js';
import { SaveManager } from './managers/SaveManager.js';
import { WaypointManager } from './managers/WaypointManager.js';
import { AudioManager } from './AudioManager.js';
import { DebugManager } from './Debug.js';
import { DialogueManager } from './managers/DialogueManager.js';
import { StoryManager } from './managers/StoryManager.js';
import { DataManager } from './managers/DataManager.js';
import { Input } from './Input.js';
import { Utils } from './Utils.js';
import { CombatUI } from './ui/CombatUI.js';
import { ParticleManager } from './managers/ParticleManager.js';
import { LootManager } from './managers/LootManager.js';

// Initialize Error Handler FIRST
ErrorHandler.init();

export class Game {
    constructor() {
        /** @type {THREE.Clock} */ this.clock = new THREE.Clock();

        /** @type {Renderer} */ this.renderer = new Renderer();
        // Tone Mapping for Vibrant Colors
        this.renderer.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.instance.toneMappingExposure = 0.6; // Reduced from 0.8

        /** @type {THREE.PerspectiveCamera} */ this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Managers (Init Order Matters)
        /** @type {Input} */ this.input = new Input();
        /** @type {DataManager} */ this.data = new DataManager(this);
        /** @type {SaveManager} */ this.saveManager = new SaveManager(this);
        /** @type {WaypointManager} */ this.waypointManager = new WaypointManager(this); // Added WaypointManager
        /** @type {UIManager} */ this.ui = new UIManager(this);
        /** @type {AudioManager} */ this.audio = new AudioManager();
        /** @type {DebugManager} */ this.debug = new DebugManager(this);
        /** @type {DialogueManager} */ this.dialogueManager = new DialogueManager(this);
        /** @type {CombatUI} */ this.combatUI = new CombatUI(this);
        /** @type {LootManager} */ this.lootManager = new LootManager(this);
        /** @type {ParticleManager|null} */ this.particles = null; // Kept as null, initialized later

        // Asset Loader
        /** @type {AssetLoader} */ this.loader = new AssetLoader(this);

        // Game Objects (Will be init after load)
        /** @type {World|null} */ this.world = null;
        /** @type {Player|null} */ this.player = null;
        /** @type {StoryManager|null} */ this.story = null;
        /** @type {EffectComposer|null} */ this.composer = null;

        this.isRunning = false;
        this.isPaused = false; // Pause Flag
        this.isDebugMode = false;
        /** @type {THREE.Mesh[]} */
        this.debugMeshes = [];

        // --- ECO MODE PROPERTIES ---
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.isTabHidden = false;


        // this.animate = this.animate.bind(this); // Temporarily commented - method defined later


        // --- ECO MODE LISTENER ---
        document.addEventListener('visibilitychange', () => {
            this.isTabHidden = document.hidden;
            if (this.isTabHidden) {
                console.log("Game hidden: Eco Mode ON (1 FPS)");
                this.targetFPS = 1; // 1 FPS in background
                this.frameInterval = 1000 / this.targetFPS;
                if (this.audio) this.audio.mute(); // Optional: mute audio
            } else {
                console.log("Game visible: Eco Mode OFF (60 FPS)");
                this.targetFPS = 60; // 60 FPS in foreground
                this.frameInterval = 1000 / this.targetFPS;
                if (this.audio) this.audio.unmute();
                this.lastFrameTime = performance.now(); // Reset to avoid jump
            }
        });

        // Handle window resize for camera
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.instance.setSize(window.innerWidth, window.innerHeight);
            if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
        });

        // F3 Debug Toggle
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                this.isDebugMode = !this.isDebugMode;
                console.log("Debug Mode:", this.isDebugMode);
                if (!this.isDebugMode) {
                    // Clear debug meshes
                    if (this.debugMeshes) {
                        this.debugMeshes.forEach(m => {
                            if (this.world) this.world.scene.remove(m);
                        });
                        this.debugMeshes = [];
                    }
                }
            }
        });
    }

    async init() {
        try {
            // Wait for assets (0-80%)
            await this.loader.loadAll();
            this.loader.updateProgress(85);

            // Init Game Logic
            this.world = new World(this);
            this.player = new Player(this, this.camera);
            this.player.world = this.world; // Link World to Player
            if (this.player.combat) this.player.combat.init(); // Init Combat (Pools)

            this.story = new StoryManager(this);

            // Phase 2: Initialization
            if (this.world) this.world.init();
            if (this.world) this.particles = new ParticleManager(this.world.scene);

            this.loader.updateProgress(90);

            // Init Minimap (Heavy Operation)
            // Use setTimeout to allow UI to render the 90% state before freezing
            await new Promise(resolve => setTimeout(resolve, 50));
            this.ui.initMinimap();
            this.loader.updateProgress(100);

            // Phase 3: Profile Selection
            const slotsInfo = await this.saveManager.getSlotsInfo();
            this.ui.createSlotSelectionUI(slotsInfo);

            this.loader.updateProgress(100);

            // Force Hide Loading Screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 500);
            }

            // --- POST PROCESSING ---
            this.initPostProcessing();

        } catch (e) {
            ErrorHandler.showError("Initialization Failed", "main.js", 0, 0, e);
        }
    }

    /**
     * @param {boolean} continueSave
     */
    async start(continueSave) {
        if (continueSave) {
            if (!await this.saveManager.load()) {
                alert("No save found!");
                return;
            }
        } else {
            this.saveManager.reset();
            await this.saveManager.save(); // Create initial save immediately
        }

        this.ui.hideMainMenu();

        // Show Game HUD (HP, XP, etc.)
        const gameUI = document.getElementById('game-ui');
        if (gameUI) gameUI.style.display = 'block';

        // Hide Loading Screen if it's still there
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }

        this.isRunning = true;

        if (!continueSave) {
            // New Game -> Cinematic + Tutorial
            if (this.story) this.story.startNewGameSequence();
        } else {
            this.ui.hideCinematicOverlay();
        }

        this.ui.showMinimap(); // Show Map only when game starts

        // --- KICKSTART GAME LOOP ---
        console.log("STARTING GAME LOOP...");
        this.animate(0);
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer.instance);

        if (!this.world) return;
        const renderPass = new RenderPass(this.world.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom (Glow) - Optimized for "Magical" Anime look
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.7; // Slightly lower threshold to catch more highlights
        bloomPass.strength = 0.2;  // Reduced from 0.3
        bloomPass.radius = 0.8;    // Wider spread for soft glow
        this.composer.addPass(bloomPass);

        // Output Pass (Tone Mapping correction)
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    updatePhysicsDebug() {
        if (!this.isDebugMode || !this.world) return;

        if (!this.debugMeshes) this.debugMeshes = [];

        let meshIndex = 0;
        const bodies = this.world.physicsWorld.bodies;

        for (const body of bodies) {
            for (const shape of body.shapes) {
                let mesh = this.debugMeshes[meshIndex];
                if (!mesh) {
                    // Create new wireframe mesh
                    let geo;
                    if (shape.type === CANNON.Shape.types.BOX) {
                        const he = shape.halfExtents;
                        geo = new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
                    } else if (shape.type === CANNON.Shape.types.SPHERE) {
                        geo = new THREE.SphereGeometry(shape.radius, 8, 8);
                    } else {
                        // Default box for others
                        geo = new THREE.BoxGeometry(1, 1, 1);
                    }
                    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                    mesh = new THREE.Mesh(geo, mat);
                    this.world.scene.add(mesh);
                    this.debugMeshes.push(mesh);
                }

                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
                mesh.visible = true;
                meshIndex++;
            }
        }

        for (let i = meshIndex; i < this.debugMeshes.length; i++) {
            this.debugMeshes[i].visible = false;
        }
    }

    /**
     * @param {number} currentTime
     */
    animate(currentTime) {
        if (!this.isRunning) return;

        requestAnimationFrame(this.animate.bind(this));

        // --- FPS THROTTLE ---
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed < this.frameInterval) return;
        this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

        let dt = this.clock.getDelta();
        if (dt > 0.1) dt = 0.1;

        if (this.isPaused) {
            if (this.ui) this.ui.update(dt);
            if (this.world) this.renderer.instance.render(this.world.scene, this.camera);
            return;
        }

        // Logic Updates
        let timeScale = 1;
        if (this.player) {
            const playerScale = this.player.update(dt);
            if (typeof playerScale === 'number') timeScale = playerScale;
        }

        try {
            if (this.world) this.world.update(dt * timeScale, this.player ? this.player.body : null);
        } catch (e) {
            console.warn("Erreur World:", e);
        }

        this.updatePhysicsDebug();

        try {
            if (this.ui) this.ui.update(dt);
            if (this.combatUI) this.combatUI.update(dt);
            if (this.lootManager) this.lootManager.update(dt);
            if (this.particles) this.particles.update(dt);
            if (this.story) this.story.update(dt);
            if (this.dialogueManager) this.dialogueManager.update(dt);
        } catch (e) { }

        // Render
        if (this.composer) {
            this.composer.render();
        } else if (this.world) {
            this.renderer.instance.render(this.world.scene, this.camera);
        }
    }

    dispose() {
        this.isRunning = false;
        if (this.renderer && this.renderer.instance) {
            this.renderer.instance.dispose();
            this.renderer.instance.forceContextLoss();
        }
        if (this.composer) {
            this.composer.dispose();
        }
        if (this.world) {
            this.world.scene.traverse((object) => {
                // @ts-ignore
                if (object.geometry) object.geometry.dispose();
                // @ts-ignore
                if (object.material) {
                    // @ts-ignore
                    if (Array.isArray(object.material)) {
                        // @ts-ignore
                        object.material.forEach(m => m.dispose());
                    } else {
                        // @ts-ignore
                        object.material.dispose();
                    }
                }
            });
        }
        console.log("Game Resources Disposed");
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    // @ts-ignore
    window.game = new Game();
    // @ts-ignore
    window.game.init();
});
