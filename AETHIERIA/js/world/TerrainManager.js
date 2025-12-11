import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { Utils } from '../Utils.js';

export class TerrainManager {
    constructor(world) {
        this.world = world;
        this.chunkSize = 64;
        this.chunkResolution = 65; // High Res (1 vertex per meter) to prevent physics holes
        this.renderDistance = 2; // Radius
        this.unloadDistance = 3;

        this.chunks = new Map();
        this.group = new THREE.Group();
        this.group.name = 'terrainGroup'; // Essential for Raycasting
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
            }),

            // OPTIMIZATION: Shared Material for Terrain Chunks
            groundMaterial: new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
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
    /**
     * Get Biome based on Radial Sector
     */
    getBiome(x, z, height, moisture) {
        // 1. Altitude Overrides (Global Peaks)
        if (height > 55) return 'SNOW'; // Higher peaks

        // 2. Radial Sectors (10 Zones for Expansion)
        const angle = Math.atan2(z, x); // -PI to PI
        const deg = (angle * 180 / Math.PI + 360) % 360;

        // 10 Sectors of 36 degrees
        const sector = Math.round(deg / 36) % 10;

        switch (sector) {
            case 0: return 'FOREST';
            case 1: return 'MOUNTAIN';
            case 2: return 'SNOW';
            case 3: return 'HIGHLANDS';
            case 4: return 'PLAINS';
            case 5: return 'BADLANDS';
            case 6: return 'DESERT';
            case 7: return 'SWAMP';
            case 8: return 'VOLCANO'; // New
            case 9: return 'JUNGLE';  // New
        }
        return 'PLAINS';
    }

    /**
     * FBM (Fractal Brownian Motion) Height Calculation
     */
    getGlobalHeight(x, z) {
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;

        const angle = Math.atan2(z, x);
        const deg = (angle * 180 / Math.PI + 360) % 360;
        const sector = Math.round(deg / 36) % 10; // Updated to 10

        let biomeType = 'PLAINS';
        switch (sector) {
            case 0: biomeType = 'FOREST'; break;
            case 1: biomeType = 'MOUNTAIN'; break;
            case 2: biomeType = 'SNOW'; break;
            case 3: biomeType = 'HIGHLANDS'; break;
            case 4: biomeType = 'PLAINS'; break;
            case 5: biomeType = 'BADLANDS'; break;
            case 6: biomeType = 'DESERT'; break;
            case 7: biomeType = 'SWAMP'; break;
            case 8: biomeType = 'VOLCANO'; break;
            case 9: biomeType = 'JUNGLE'; break;
        }

        // Topography Settings
        let amplitude = 10;
        let frequency = 0.01;
        let octaves = 3;
        let baseHeight = 5;

        switch (biomeType) {
            case 'DESERT':
                amplitude = 15; frequency = 0.005; octaves = 4; baseHeight = 5; break;
            case 'FOREST':
                amplitude = 20; frequency = 0.01; octaves = 4; baseHeight = 8; break;
            case 'PLAINS':
                amplitude = 8; frequency = 0.005; octaves = 3; baseHeight = 5; break;
            case 'SNOW':
                amplitude = 15; frequency = 0.01; octaves = 4; baseHeight = 10; break;
            case 'MOUNTAIN':
                amplitude = 80; frequency = 0.008; octaves = 5; baseHeight = 20; break;
            case 'HIGHLANDS':
                amplitude = 40; frequency = 0.006; octaves = 4; baseHeight = 30; break;
            case 'BADLANDS':
                amplitude = 30; frequency = 0.01; octaves = 5; baseHeight = 15; break;
            case 'SWAMP':
                amplitude = 3; frequency = 0.02; octaves = 2; baseHeight = 1; break;
            case 'VOLCANO':
                amplitude = 60; frequency = 0.01; octaves = 5; baseHeight = 25; // High & jagged
                break;
            case 'JUNGLE':
                amplitude = 25; frequency = 0.015; octaves = 4; baseHeight = 10; // Dense variation
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

        // Global Mountain Pass
        if (biomeType === 'MOUNTAIN' || biomeType === 'SNOW' || biomeType === 'VOLCANO') {
            const mNoise = Utils.Noise.perlin2(x * 0.005, z * 0.005);
            if (mNoise > 0) y += mNoise * 50;
        }

        // Mesa Terracing
        if (biomeType === 'BADLANDS') {
            y = Math.floor(y / 8) * 8;
        }

        // Volcano Crater Logic? (Simple version: just high)

        y += baseHeight;

        // Flatten Valleys
        if (y < 2) y = THREE.MathUtils.lerp(y, 1, 0.5);
        if (biomeType === 'SWAMP' && y < 3) y = 1.5;

        return Math.max(0.5, y);
    }

    getBiomeColor(x, z, height, moisture) {
        const biome = this.getBiome(x, z, height, moisture);
        const color = new THREE.Color();

        // Jitter
        const noise = Utils.Noise.perlin2(x * 0.2, z * 0.2) * 0.1;

        switch (biome) {
            case 'DESERT': color.setHex(0xe6c288); color.r += noise * 0.5; break;
            case 'FOREST': color.setHex(0x2d4a2d); color.g += noise; break;
            case 'PLAINS': color.setHex(0x55aa55); color.g += noise; color.r += noise * 0.5; break;
            case 'SNOW': color.setHex(0xffffff); color.b -= noise * 0.1; break;
            case 'MOUNTAIN': color.setHex(0x555555); color.r += noise; break;
            case 'HIGHLANDS': color.setHex(0x8da336); color.r += noise; break;
            case 'BADLANDS': color.setHex(0xd2691e); color.r += noise * 0.5; break;
            case 'SWAMP': color.setHex(0x2f4f4f); color.g += noise * 0.5; break;
            case 'VOLCANO':
                color.setHex(0x221111); // Dark Obsidian/Ash
                color.r += noise * 0.5; // Reddish tint
                if (height > 60) color.setHex(0xffaa00); // Lava caps?
                break;
            case 'JUNGLE':
                color.setHex(0x006600); // Vibrant Deep Green
                color.g += noise;
                break;
            default: color.setHex(0xff00ff);
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
