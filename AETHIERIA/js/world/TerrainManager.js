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
            // OPTIMIZATION: Shared Material for Terrain Chunks
            groundMaterial: new THREE.MeshBasicMaterial({
                vertexColors: true,
                side: THREE.FrontSide
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
     * Get Biome based on X, Z coordinates (10 Zones Grid)
     * Map Width: ~4000 (-2000 to 2000)
     * Map Depth: ~4000 (-2000 to 2000)
     * Columns: 5 (800 units wide)
     * Rows: 2 (2000 units deep)
     * @returns {string} Biome Type
     */
    getBiome(x, z) {
        // Grid 5x2
        // Col Index: 0..4 (West to East)
        const col = Math.floor((x + 2000) / 800);
        // Row Index: 0 (North/Z<0) or 1 (South/Z>0)
        const row = z < 0 ? 0 : 1;

        // Clamp
        const c = Math.max(0, Math.min(4, col));

        // BIOME MAP
        // North (Row 0): ICE | SNOW | AIR | LIGHTNING | CRYSTAL
        // South (Row 1): FOREST | JUNGLE | GOLD | FIRE | LAVA

        if (row === 0) {
            if (c === 0) return 'ICE';
            if (c === 1) return 'SNOW';
            if (c === 2) return 'AIR';
            if (c === 3) return 'LIGHTNING';
            return 'CRYSTAL';
        } else {
            if (c === 0) return 'FOREST'; // Starting Area (approx x=-1000)
            if (c === 1) return 'JUNGLE';
            if (c === 2) return 'GOLD';
            if (c === 3) return 'FIRE';
            return 'LAVA';
        }
    }

    /**
     * @param {string} biome 
     * @returns {number} Hex Color
     */
    getBiomeColor(biome) {
        switch (biome) {
            case 'ICE': return 0xaaddff; // Pale Blue
            case 'SNOW': return 0xffffff; // White
            case 'AIR': return 0xdddddd; // Light Grey (Clouds)
            case 'LIGHTNING': return 0x4b0082; // Indigo/Dark Purple
            case 'CRYSTAL': return 0xff69b4; // Hot Pink
            case 'FOREST': return 0x228b22; // Forest Green
            case 'JUNGLE': return 0x006400; // Dark Green
            case 'GOLD': return 0xffd700; // Gold
            case 'FIRE': return 0xff4500; // Orange Red
            case 'LAVA': return 0x1a0500; // Very Dark Red/Black
            default: return 0x555555; // Grey Fallback
        }
    }
    /**
     * Get Biome based on Radial Sector
     * DEPRECATED: Removing to favor the 2x5 Grid System matching World.js
     */
    // getBiome(x, z, height, moisture) { ... } REMOVED

    /**
     * FBM (Fractal Brownian Motion) Height Calculation
     */
    getGlobalHeight(x, z) {
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;

        // Use the Grid Biome Logic
        const biomeType = this.getBiome(x, z);

        // Topography Settings
        let amplitude = 10;
        let frequency = 0.01;
        let octaves = 3;
        let baseHeight = 5;

        // Customize per Biome
        switch (biomeType) {
            case 'ICE': // Flat Sheet
                amplitude = 5; frequency = 0.005; octaves = 2; baseHeight = 2; break;
            case 'SNOW': // Rolling Hills
                amplitude = 20; frequency = 0.008; octaves = 3; baseHeight = 10; break;
            case 'AIR': // High Peaks / Sky Islands feel
                amplitude = 80; frequency = 0.005; octaves = 5; baseHeight = 40; break;
            case 'LIGHTNING': // Jagged
                amplitude = 40; frequency = 0.015; octaves = 4; baseHeight = 15; break;
            case 'CRYSTAL': // Spiky
                amplitude = 30; frequency = 0.02; octaves = 5; baseHeight = 10; break;

            case 'FOREST': // Standard
                amplitude = 15; frequency = 0.01; octaves = 3; baseHeight = 8; break;
            case 'JUNGLE': // Dense/Rough
                amplitude = 30; frequency = 0.015; octaves = 4; baseHeight = 10; break;
            case 'GOLD': // Golden Plains / Dunes
                amplitude = 10; frequency = 0.005; octaves = 2; baseHeight = 15; break;
            case 'FIRE': // Chaotic
                amplitude = 50; frequency = 0.01; octaves = 5; baseHeight = 20; break;
            case 'LAVA': // Volcanic Crater / Low
                amplitude = 25; frequency = 0.01; octaves = 4; baseHeight = 5; break;
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
