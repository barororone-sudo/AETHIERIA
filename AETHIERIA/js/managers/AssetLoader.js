
import * as THREE from 'three';

export class AssetLoader {
    constructor(game) {
        this.game = game;
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.audioLoader = new THREE.AudioLoader(this.manager);

        this.assets = {
            textures: {},
            audio: {},
            data: {}
        };

        this.setupUI();
    }

    setupUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('loading-bar-fill');

        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            // Assets are 0-80% of total load
            const progress = (itemsLoaded / itemsTotal) * 80;
            if (this.progressBar) this.progressBar.style.width = `${progress}%`;
        };

        this.manager.onLoad = () => {
            // Do not hide here. Wait for Game Init.
            console.log("AssetLoader: All assets loaded.");
        };
    }

    updateProgress(percent) {
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
    }

    async loadAll() {
        const textureUrls = {
            'hero_face': './assets/hero_face.png',
            'hero_outfit': './assets/hero_outfit.png',
            'monster_mask': './assets/monster_mask.png'
        };

        const loadTexture = (key, url) => {
            return new Promise((resolve, reject) => {
                this.textureLoader.load(
                    url,
                    (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        this.assets.textures[key] = texture;
                        resolve(texture);
                    },
                    undefined,
                    (err) => {
                        console.warn(`Failed to load texture: ${url}`, err);
                        // Resolve anyway to not block game start, maybe use a placeholder?
                        resolve(null);
                    }
                );
            });
        };

        const promises = Object.entries(textureUrls).map(([key, url]) => loadTexture(key, url));

        await Promise.all(promises);

        // Artificial delay if needed, or just finish
        // Artificial delay if needed, or just finish
        // Do not hide here. Wait for Game Init.
    }
}
