// js/Renderer.js
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
// @ts-ignore
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Renderer {
    constructor() {
        this.instance = new THREE.WebGLRenderer({
            antialias: false, // Composer handles AA usually, or use SMAAPass. False for performance with Bloom.
            powerPreference: "high-performance",
            stencil: false,
            depth: true
        });

        this.instance.setSize(window.innerWidth, window.innerHeight);
        this.instance.setPixelRatio(1.0); // FORCED 1.0 for Performance (User reported 12 FPS)
        this.instance.shadowMap.enabled = true;
        this.instance.shadowMap.type = THREE.BasicShadowMap; // Faster Shadows

        // Tone Mapping for realistic lighting
        this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.instance.toneMappingExposure = 1.0;
        this.instance.outputColorSpace = THREE.SRGBColorSpace;

        // DOM
        const container = document.getElementById('game-container') || document.body;
        this.instance.domElement.id = 'game-canvas';
        Object.assign(this.instance.domElement.style, {
            position: 'absolute', top: '0', left: '0', zIndex: '0', outline: 'none'
        });
        container.appendChild(this.instance.domElement);

        this.scene = null;
        this.camera = null;
        this.composer = null;
        // this.outlinePass = null; // Disabled for FPS

        window.addEventListener('resize', this.onResize.bind(this));
    }

    initPostProcessing(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.composer = new EffectComposer(this.instance);

        // 1. Render Pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // 2. Outline Pass (DISABLED for FPS)
        // this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera);
        // this.composer.addPass(this.outlinePass);

        // 3. Bloom Pass (Glow)
        // Resolution, Strength, Radius, Threshold
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
        bloomPass.strength = 0.4;
        bloomPass.radius = 0.4; // "Dreamy" look
        bloomPass.threshold = 0.8; // Only very bright things glow
        this.composer.addPass(bloomPass);

        // 4. Output Pass (Color Grading)
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.instance.setSize(width, height);
        this.instance.setPixelRatio(1.0); // FORCED 1.0

        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    render(scene, camera) {
        // Init composer only once we have scene/camera
        if (!this.composer) {
            this.initPostProcessing(scene, camera);
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.instance.render(scene, camera);
        }
    }

    /**
     * Add object to Outline Pass (e.g. enemies, player)
     */
    addOutline(object) {
        if (this.outlinePass && object) {
            if (!this.outlinePass.selectedObjects.includes(object)) {
                this.outlinePass.selectedObjects.push(object);
            }
        }
    }

    removeOutline(object) {
        if (this.outlinePass && object) {
            const index = this.outlinePass.selectedObjects.indexOf(object);
            if (index > -1) {
                this.outlinePass.selectedObjects.splice(index, 1);
            }
        }
    }
}
