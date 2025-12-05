// js/Renderer.js
import * as THREE from 'three';

export class Renderer {
    constructor() {
        this.instance = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });

        this.instance.setSize(window.innerWidth, window.innerHeight);
        this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.instance.shadowMap.enabled = true;
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone Mapping for realistic lighting
        this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.instance.toneMappingExposure = 1.0;

        // Color Space
        this.instance.outputColorSpace = THREE.SRGBColorSpace;

        const container = document.getElementById('game-container') || document.body;
        container.appendChild(this.instance.domElement);

        window.addEventListener('resize', this.onResize.bind(this));
    }

    onResize() {
        this.instance.setSize(window.innerWidth, window.innerHeight);
        this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    render(scene, camera) {
        this.instance.render(scene, camera);
    }
}
