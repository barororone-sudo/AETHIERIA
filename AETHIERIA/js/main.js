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
import { AudioManager } from './AudioManager.js';
import { DebugManager } from './Debug.js';
import { DialogueManager } from './managers/DialogueManager.js';
import { StoryManager } from './Story.js';
import { DataManager } from './managers/DataManager.js';
import { Input } from './Input.js';

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
        /** @type {UIManager} */ this.ui = new UIManager(this);
        /** @type {AudioManager} */ this.audio = new AudioManager();
        /** @type {DebugManager} */ this.debug = new DebugManager(this);
        /** @type {DialogueManager} */ this.dialogueManager = new DialogueManager(this);

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
        this.animate = this.animate.bind(this);

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
            // Wait for assets
            await this.loader.loadAll();

            // Init Game Logic
            this.world = new World(this);
            this.player = new Player(this, this.camera);

            this.story = new StoryManager(this);

            // Phase 2: Initialization
            this.ui.initMinimap(); // Init Minimap BEFORE World so Towers can register
            if (this.world) this.world.init();

            // --- POST PROCESSING ---
            this.initPostProcessing();

            // Start Audio on interaction
            document.addEventListener('click', () => {
                if (this.isRunning) this.audio.startMusic();
            }, { once: true });

            // this.startGame(false); // Removed to allow Main Menu interaction

        } catch (e) {
            ErrorHandler.showError("Initialization Failed", "main.js", 0, 0, e);
        }
    }

    /**
     * @param {boolean} continueSave
     */
    startGame(continueSave) {
        if (continueSave) {
            if (!this.saveManager.load()) {
                alert("No save found!");
                return;
            }
        } else {
            this.saveManager.reset();
        }

        this.ui.hideMainMenu();
        this.ui.showMinimap(); // Show Map only when game starts
        this.isRunning = true;
        this.animate();
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

        // Simple pool or recreate? Recreate is slow but easy.
        // Let's reuse.
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

                // Sync position/rotation
                // Body pos + Shape offset (simplified, assuming center)
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
                mesh.visible = true;
                meshIndex++;
            }
        }

        // Hide unused
        for (let i = meshIndex; i < this.debugMeshes.length; i++) {
            this.debugMeshes[i].visible = false;
        }
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(this.animate);

        let dt = this.clock.getDelta();
        if (dt > 0.1) dt = 0.1; // Clamp dt to prevent physics explosion on tab switch

        // If Paused, skip logic updates but keep rendering (and UI)
        if (this.isPaused) {
            if (this.ui) this.ui.update();
            // Render with Composer (Post-Processing)
            if (this.composer) {
                this.composer.render();
            } else if (this.world) {
                this.renderer.instance.render(this.world.scene, this.camera);
            }
            return;
        }

        // Player updates and returns timeScale (for Bullet Time)
        let timeScale = 1;
        if (this.player) {
            timeScale = this.player.update(dt);
        }

        // World updates with scaled time (physics, enemies)
        try {
            if (this.world) this.world.update(dt * timeScale, this.player ? this.player.body : null);
        } catch (e) {
            console.warn("Erreur World:", e);
        }

        // Physics Debug
        this.updatePhysicsDebug();

        try {
            if (this.ui) this.ui.update(dt);
        } catch (e) {
            console.warn("Erreur UI:", e);
        }

        try {
            if (this.story) this.story.update(dt);
        } catch (e) {
            console.warn("Erreur Story:", e);
        }

        // Render with Composer (Post-Processing)
        if (this.composer) {
            this.composer.render();
        } else if (this.world) {
            this.renderer.instance.render(this.world.scene, this.camera);
        }
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    // @ts-ignore
    window.game = new Game();
    // @ts-ignore
    window.game.init();
});
