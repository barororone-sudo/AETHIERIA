
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ========================================
// 🌐 PLAYER MODEL URL (Local Asset)
// ========================================
export const PLAYER_MODEL_URL = 'assets/hero.glb';

// Fallback if hero.glb fails to load
const FALLBACK_MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb';

// ========================================
// 🎬 EXTERNAL ANIMATIONS FOR READY PLAYER ME
// Using Mixamo animations - Free humanoid animations compatible with RPM
// ========================================
export const ANIM_IDLE_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb';
export const ANIM_RUN_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb';
export const ANIM_ATTACK_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb';

// ========================================
// ⚔️ WEAPON ASSETS (KayKit - Stable GitHub URLs)
// ========================================
export const WEAPON_SWORD_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/main/Assets/gltf/sword_long.gltf';
export const WEAPON_BOW_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Prototype-Bits-1.0/main/Assets/gltf/Bow.gltf';

// ========================================
// 🌲 ENVIRONMENT ASSETS (KayKit - Stable GitHub URLs)
// ========================================
export const ENV_TREE_PINE_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/Assets/gltf/tree_pine_large.gltf';
export const ENV_ROCK_MOSS_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/Assets/gltf/rock_large.gltf';
export const PROP_CHEST_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/main/Assets/gltf/chest_common.gltf';

export class AssetLoader {
    constructor(game) {
        this.game = game;
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.audioLoader = new THREE.AudioLoader(this.manager);
        this.gltfLoader = new GLTFLoader(this.manager);

        this.assets = {
            textures: {},
            audio: {},
            data: {},
            models: {},
            animations: {}
        };

        this.setupUI();
    }

    setupUI() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.getElementById('loading-bar-fill');

        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal) * 80;
            if (this.progressBar) this.progressBar.style.width = `${progress}%`;
        };

        this.manager.onLoad = () => {
            console.log("AssetLoader: All assets loaded.");
        };
    }

    updateProgress(percent) {
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
    }

    async loadRemoteCharacter() {
        console.log('🌐 Loading player model from:', PLAYER_MODEL_URL);

        return new Promise((resolve) => {
            this.gltfLoader.load(
                PLAYER_MODEL_URL,
                (gltf) => {
                    console.log('✅ Player model loaded successfully!');
                    if (gltf.animations && gltf.animations.length > 0) {
                        console.log('📦 Embedded animations found:', gltf.animations.map(a => a.name));
                    } else {
                        console.log('📦 No embedded animations (will use procedural or external animations)');
                    }
                    this.assets.models.hero = gltf;
                    resolve(gltf);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total) * 100;
                        console.log(`⏳ Loading: ${percent.toFixed(1)}%`);
                    }
                },
                (error) => {
                    console.warn('⚠️ Failed to load PLAYER_MODEL_URL:', error.message);
                    console.log('🔄 Trying fallback model...');

                    this.gltfLoader.load(
                        FALLBACK_MODEL_URL,
                        (gltf) => {
                            console.log('✅ Fallback model loaded!');
                            this.assets.models.hero = gltf;
                            resolve(gltf);
                        },
                        undefined,
                        (fallbackError) => {
                            console.error('❌ Fallback model also failed:', fallbackError.message);
                            console.log('🔴 Will use cube fallback');
                            resolve(null);
                        }
                    );
                }
            );
        });
    }

    async loadExternalAnimations() {
        console.log('🎬 Loading external animations for Ready Player Me...');

        const animUrls = {
            'anim_idle': ANIM_IDLE_URL,
            'anim_run': ANIM_RUN_URL,
            'anim_attack': ANIM_ATTACK_URL
        };

        const loadAnim = (key, url) => {
            return new Promise((resolve) => {
                this.gltfLoader.load(
                    url,
                    (gltf) => {
                        if (gltf.animations && gltf.animations.length > 0) {
                            this.assets.animations[key] = gltf.animations;
                            console.log(`✅ Loaded ${key}:`, gltf.animations.map(a => a.name));
                        } else {
                            console.warn(`⚠️ No animations found in ${key}`);
                        }
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`❌ Failed to load ${key}:`, error.message);
                        resolve();
                    }
                );
            });
        };

        const promises = Object.entries(animUrls).map(([key, url]) => loadAnim(key, url));
        await Promise.all(promises);
        console.log('🎬 External animations loading complete');
    }

    async loadWeaponsAndEnvironment() {
        console.log('⚔️ Loading weapons and environment assets (KayKit)...');

        const assetUrls = {
            'weapon_sword': WEAPON_SWORD_URL,
            'weapon_bow': WEAPON_BOW_URL,
            'env_tree_pine': ENV_TREE_PINE_URL,
            'env_rock_moss': ENV_ROCK_MOSS_URL,
            'prop_chest': PROP_CHEST_URL
        };

        const loadAsset = (key, url) => {
            return new Promise((resolve) => {
                this.gltfLoader.load(
                    url,
                    (gltf) => {
                        this.assets.models[key] = gltf;
                        console.log(`✅ Loaded ${key} from KayKit`);
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`❌ Failed to load ${key}:`, error.message);
                        resolve();
                    }
                );
            });
        };

        const promises = Object.entries(assetUrls).map(([key, url]) => loadAsset(key, url));
        await Promise.all(promises);
        console.log('⚔️ Weapons and environment assets loading complete');
    }

    async loadAll() {
        const textureUrls = {
            'hero_face': './assets/hero_face.png',
            'hero_outfit': './assets/hero_outfit.png',
            'monster_mask': './assets/monster_mask.png'
        };

        const loadTexture = (key, url) => {
            return new Promise((resolve) => {
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
                        resolve(null);
                    }
                );
            });
        };

        const promises = Object.entries(textureUrls).map(([key, url]) => loadTexture(key, url));

        // Add remote character loading
        promises.push(this.loadRemoteCharacter());

        // Add external animations loading
        promises.push(this.loadExternalAnimations());

        // Add weapons and environment assets loading
        // DISABLED: All KayKit URLs return 404 errors
        // promises.push(this.loadWeaponsAndEnvironment());

        await Promise.all(promises);
    }
}
