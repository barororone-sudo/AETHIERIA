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

        // 2. Radial Sectors (8 Zones)
        const angle = Math.atan2(z, x); // -PI to PI
        // Normalize to 0-360 deg approx
        const deg = (angle * 180 / Math.PI + 360) % 360;

        // 8 Sectors of 45 degrees
        // Sector 0 (East): 337.5 to 22.5
        // Sector 1 (NE): 22.5 to 67.5
        // ...

        const sector = Math.round(deg / 45) % 8;

        switch (sector) {
            case 0: return 'FOREST';        // East
            case 1: return 'MOUNTAIN';      // North-East
            case 2: return 'SNOW';          // North
            case 3: return 'HIGHLANDS';     // North-West (New)
            case 4: return 'PLAINS';        // West
            case 5: return 'BADLANDS';      // South-West (New)
            case 6: return 'DESERT';        // South
            case 7: return 'SWAMP';         // South-East (New)
        }
        return 'PLAINS';
    }

    /**
     * FBM (Fractal Brownian Motion) Height Calculation
     */
    getGlobalHeight(x, z) {
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;

        // Get Base Biome from Coordinates (Reuse logic loosely or call getBiome with dummy height)
        // We need the biome to determine height parameters *before* we calculate height.
        // Circular dependency? No, getBiome uses height for SNOW override only.
        // Let's copy the sector logic for parameters.

        const angle = Math.atan2(z, x);
        const deg = (angle * 180 / Math.PI + 360) % 360;
        const sector = Math.round(deg / 45) % 8;

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
        }

        // Topography Settings
        let amplitude = 10;
        let frequency = 0.01;
        let octaves = 3;
        let baseHeight = 5;

        switch (biomeType) {
            case 'DESERT':
                amplitude = 15; frequency = 0.005; octaves = 4; baseHeight = 5;
                break;
            case 'FOREST':
                amplitude = 20; frequency = 0.01; octaves = 4; baseHeight = 8;
                break;
            case 'PLAINS':
                amplitude = 8; frequency = 0.005; octaves = 3; baseHeight = 5;
                break;
            case 'SNOW': // Ice plains essentially, mountains handled by global noise add
                amplitude = 15; frequency = 0.01; octaves = 4; baseHeight = 10;
                break;
            case 'MOUNTAIN':
                amplitude = 80; frequency = 0.008; octaves = 5; baseHeight = 20;
                break;
            case 'HIGHLANDS':
                amplitude = 40; frequency = 0.006; octaves = 4; baseHeight = 30; // High plateau
                break;
            case 'BADLANDS':
                amplitude = 30; frequency = 0.01; octaves = 5; baseHeight = 15; // Mesa Terraces
                // Mesas often have flat tops, we might need custom noise, but FBM is okay for now.
                break;
            case 'SWAMP':
                amplitude = 3; frequency = 0.02; octaves = 2; baseHeight = 1; // Very flat, low
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

        // Global Mountain Pass (Add extra height in Mountain/Snow zones strongly)
        if (biomeType === 'MOUNTAIN' || biomeType === 'SNOW') {
            const mNoise = Utils.Noise.perlin2(x * 0.005, z * 0.005);
            if (mNoise > 0) y += mNoise * 50;
        }

        // Mesa Terracing Effect for Badlands
        if (biomeType === 'BADLANDS') {
            // Quantize height levels
            y = Math.floor(y / 8) * 8;
        }

        y += baseHeight;

        // Flatten Valleys / Water (Swamp should be near water level)
        if (y < 2) y = THREE.MathUtils.lerp(y, 1, 0.5);
        if (biomeType === 'SWAMP' && y < 3) y = 1.5; // Force water level

        return Math.max(0.5, y);
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
                color.b -= noise * 0.1;
                break;
            case 'MOUNTAIN':
                color.setHex(0x555555); // Dark Grey
                color.r += noise; color.g += noise; color.b += noise;
                break;
            case 'HIGHLANDS':
                color.setHex(0x8da336); // Olive Green
                color.r += noise;
                break;
            case 'BADLANDS':
                color.setHex(0xd2691e); // Chocolate/Terracotta
                color.r += noise * 0.5;
                break;
            case 'SWAMP':
                color.setHex(0x2f4f4f); // Dark Slate Gray (Muddy Green)
                color.g += noise * 0.5;
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
