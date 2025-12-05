import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { Utils } from '../Utils.js';

export class TerrainManager {
    constructor(world) {
        this.world = world;
        this.chunkSize = 64;
        this.chunkResolution = 33; // Vertices per edge
        this.renderDistance = 2; // Radius
        this.unloadDistance = 3;

        this.chunks = new Map();
        this.group = new THREE.Group();
        this.world.scene.add(this.group);

        // Initialize Noise
        if (Utils.Noise && Utils.Noise.init) {
            Utils.Noise.init();
        }

        // Shared Geometries/Materials for Population (Performance)
        this.assets = this.createAssets();
    }

    createAssets() {
        // Simple geometries for InstancedMesh
        return {
            treeLog: new THREE.CylinderGeometry(0.2, 0.3, 1.5, 5),
            treeLeaves: new THREE.ConeGeometry(1.5, 3, 5),
            cactus: new THREE.CylinderGeometry(0.3, 0.3, 2, 6),
            rock: new THREE.DodecahedronGeometry(0.8, 0),
            building: new THREE.BoxGeometry(1, 1, 1), // Scaled dynamically

            matBrown: new THREE.MeshStandardMaterial({ color: 0x5C4033 }),
            matGreen: new THREE.MeshStandardMaterial({ color: 0x2E8B57 }),
            matCactus: new THREE.MeshStandardMaterial({ color: 0x6B8E23 }),
            matGrey: new THREE.MeshStandardMaterial({ color: 0x808080 }),
            matDarkRock: new THREE.MeshStandardMaterial({ color: 0x444444 }),
            matWhite: new THREE.MeshStandardMaterial({ color: 0xFFFFFF }),
            matConcrete: new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.2,
                map: this.createBuildingTexture()
            })
        };
    }

    createBuildingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Background (Concrete)
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, 64, 64);

        // Windows (Lit)
        ctx.fillStyle = '#ffffaa'; // Yellow light
        // Draw grid of windows
        for (let y = 4; y < 64; y += 12) {
            for (let x = 4; x < 64; x += 12) {
                if (Math.random() > 0.3) { // Some lights off
                    ctx.fillRect(x, y, 6, 8);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter; // Pixelated look
        return tex;
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    /**
     * Get Moisture Value (-1 to 1)
     * Low Frequency Noise
     */
    getMoisture(x, z) {
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;
        return Utils.Noise.perlin2(x * 0.001, z * 0.001);
    }

    /**
     * Get Biome based on Height and Moisture
     * @returns {string} Biome Type
     */
    getBiome(x, z, height, moisture) {
        // 1. Altitude Overrides
        if (height > 45) return 'SNOW';
        if (height > 35) return 'MOUNTAIN'; // Transition to snow

        // 2. City Pocket (Rare noise check)
        // High frequency noise mask for cities
        const cityNoise = Utils.Noise.perlin2(x * 0.01, z * 0.01);
        if (cityNoise > 0.7 && moisture > -0.2 && moisture < 0.2) return 'CITY';

        // 3. Moisture based
        if (moisture < -0.3) return 'DESERT';
        if (moisture > 0.4) return 'FOREST';

        return 'PLAINS';
    }

    /**
     * FBM (Fractal Brownian Motion) Height Calculation
     */
    getGlobalHeight(x, z) {
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;

        const moisture = this.getMoisture(x, z);

        // Determine "Base Biome" for topography settings (ignoring height for now)
        let biomeType = 'PLAINS';
        if (moisture < -0.3) biomeType = 'DESERT';
        else if (moisture > 0.4) biomeType = 'FOREST';

        // City check for topography (needs to be flat)
        const cityNoise = Utils.Noise.perlin2(x * 0.01, z * 0.01);
        if (cityNoise > 0.7 && moisture > -0.2 && moisture < 0.2) biomeType = 'CITY';


        // Topography Settings
        let amplitude = 10;
        let frequency = 0.01;
        let octaves = 3;
        let baseHeight = 0;

        switch (biomeType) {
            case 'DESERT':
                amplitude = 15; // Higher Dunes
                frequency = 0.005;
                octaves = 4; // More detail
                baseHeight = 5;
                break;
            case 'FOREST':
                amplitude = 25; // Hilly
                frequency = 0.01;
                octaves = 5;
                baseHeight = 10;
                break;
            case 'PLAINS':
                amplitude = 12; // Rolling hills
                frequency = 0.008;
                octaves = 4;
                baseHeight = 5;
                break;
            case 'CITY':
                amplitude = 2; // Flat foundation
                frequency = 0.005;
                octaves = 1;
                baseHeight = 8;
                break;
        }

        // Apply FBM
        let y = 0;
        let amp = amplitude;
        let freq = frequency;

        for (let i = 0; i < octaves; i++) {
            y += Utils.Noise.perlin2(x * freq, z * freq) * amp;
            amp *= 0.5;
            freq *= 2.0;
        }

        // Mountain Pass (Global)
        // Add large mountains regardless of biome if noise is high enough?
        // Or blend in mountains based on a separate "Mountain Map"?
        // Let's use a global "Mountain Noise"
        const mountainNoise = Utils.Noise.perlin2(x * 0.003, z * 0.003);
        if (mountainNoise > 0.5) {
            // Blend into mountains
            const t = (mountainNoise - 0.5) / 0.5; // 0 to 1
            const mountainH = Utils.Noise.perlin2(x * 0.01, z * 0.01) * 60 + 20;
            y = THREE.MathUtils.lerp(y, mountainH, t);
        }

        y += baseHeight;

        // Flatten Valleys / Water
        if (y < 2) y = THREE.MathUtils.lerp(y, 1, 0.5);

        return Math.max(0.5, y); // Minimum height
    }

    getBiomeColor(x, z, height, moisture) {
        const biome = this.getBiome(x, z, height, moisture);
        const color = new THREE.Color();

        // Jitter
        const noise = Utils.Noise.perlin2(x * 0.2, z * 0.2) * 0.1;

        switch (biome) {
            case 'DESERT':
                color.setHex(0xe6c288); // Sand
                color.r += noise * 0.5;
                break;
            case 'FOREST':
                color.setHex(0x2d4a2d); // Dark Green
                color.g += noise;
                break;
            case 'PLAINS':
                color.setHex(0x55aa55); // Grass
                color.g += noise;
                color.r += noise * 0.5;
                break;
            case 'SNOW':
                color.setHex(0xffffff); // White
                color.b -= noise * 0.1; // Blueish tint
                break;
            case 'MOUNTAIN':
                color.setHex(0x666666); // Grey
                color.r += noise;
                color.g += noise;
                color.b += noise;
                break;
            case 'CITY':
                color.setHex(0x888888); // Concrete
                // Grid pattern hint?
                if (Math.abs(x % 10) < 1 || Math.abs(z % 10) < 1) {
                    color.setHex(0x555555); // Road
                }
                break;
            default:
                color.setHex(0xff00ff); // Error
        }

        return color;
    }

    update(playerPos) {
        if (!playerPos) return;

        const cx = Math.round(playerPos.x / this.chunkSize);
        const cz = Math.round(playerPos.z / this.chunkSize);

        // Load
        for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                if (!this.chunks.has(key)) {
                    this.chunks.set(key, new Chunk(this, x, z));
                }
            }
        }

        // Unload
        for (const [key, chunk] of this.chunks) {
            const dist = Math.sqrt((chunk.x - cx) ** 2 + (chunk.z - cz) ** 2);
            if (dist > this.unloadDistance) {
                chunk.destroy();
                this.chunks.delete(key);
            }
        }

        // Physics (3x3)
        for (const [key, chunk] of this.chunks) {
            const dx = Math.abs(chunk.x - cx);
            const dz = Math.abs(chunk.z - cz);
            if (dx <= 1 && dz <= 1) chunk.enablePhysics(this.world.physicsWorld);
            else chunk.disablePhysics(this.world.physicsWorld);
        }
    }

    // Alias
    getHeightAt(x, z) { return this.getGlobalHeight(x, z); }

    getBiomeAt(x, z) {
        const height = this.getGlobalHeight(x, z);
        const moisture = this.getMoisture(x, z);
        return this.getBiome(x, z, height, moisture);
    }
}
