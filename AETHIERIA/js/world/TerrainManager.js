import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { Utils } from '../Utils.js';

export class TerrainManager {
    constructor(world) {
        this.world = world;
        this.chunkSize = 64;
        this.chunkResolution = 32; // Power of 2 recommended for some algos, but 32 segments -> 33 vertices?
        // Three.js PlaneGeometry(size, size, segments, segments) creates (segments+1)^2 vertices.
        // Cannon Heightfield expects matrix of size [nx, ny].
        // If we want 1:1, we should match vertices.
        // Let's say segments = 32. Vertices = 33.
        // So resolution should be 33?
        // Let's stick to segments = 32 in Chunk.js, so resolution (vertices) is 33.
        // Wait, user said "generateHeightData(size, resolution)".
        // If resolution is the number of data points, then PlaneGeometry segments should be resolution - 1.
        this.chunkResolution = 33;
        this.noiseScale = 0.1;
        this.maxHeight = 20;

        this.chunks = new Map(); // Key: "x,z", Value: Chunk
        this.renderDistance = 2; // Radius in chunks to load
        this.unloadDistance = 3; // Radius in chunks to unload

        // Initialize Noise
        if (Utils.Noise && Utils.Noise.init) {
            Utils.Noise.init();
        }

        this.group = new THREE.Group();
        this.world.scene.add(this.group);
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    /**
     * THE TRUTH: Global Height Function
     * @param {number} x World X
     * @param {number} z World Z
     * @returns {number} Height at (x, z)
     */
    getGlobalHeight(x, z) {
        // Multi-octave Perlin Noise
        const scale1 = 0.02;
        const scale2 = 0.05;
        const scale3 = 0.1;

        let y = 0;

        // Ensure Noise is ready
        if (!Utils.Noise || !Utils.Noise.perlin2) return 0;

        // Base Hills
        y += Utils.Noise.perlin2(x * scale1, z * scale1) * 20;

        // Detail
        y += Utils.Noise.perlin2(x * scale2, z * scale2) * 5;

        // Micro Detail
        y += Utils.Noise.perlin2(x * scale3, z * scale3) * 1;

        // Normalize / Offset
        y += 5;

        // Flatten valleys
        if (y < 0) y = y * 0.5;

        return y;
    }

    // Alias for compatibility if needed, but we should use getGlobalHeight everywhere
    getHeightAt(x, z) {
        return this.getGlobalHeight(x, z);
    }

    update(playerPos) {
        if (!playerPos) return;
        // console.log("TerrainManager update", playerPos);

        const pX = playerPos.x;
        const pZ = playerPos.z;

        // Current Chunk Coordinates
        const cx = Math.round(pX / this.chunkSize);
        const cz = Math.round(pZ / this.chunkSize);

        // 1. Load Chunks in Range
        for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(this, x, z);
                    this.chunks.set(key, chunk);
                    console.log(`Created Chunk ${key}`);
                }
            }
        }

        // 2. Unload Far Chunks
        for (const [key, chunk] of this.chunks) {
            const dist = Math.sqrt((chunk.x - cx) ** 2 + (chunk.z - cz) ** 2);
            if (dist > this.unloadDistance) {
                chunk.destroy();
                this.chunks.delete(key);
            }
        }

        // 3. Update Physics (Only center chunk)
        // Optimization: Only the chunk directly under the player gets physics
        // Or maybe the 3x3 grid around player to prevent falling through edges?
        // User asked for "Seul le Chunk sous les pieds du joueur".
        // Let's be safe and do the one under feet.

        // Actually, player might be on the edge. 
        // Let's do the one under feet, and maybe neighbors if very close to edge?
        // For now, strict adherence to instruction: "Seul le Chunk sous les pieds du joueur"
        // But "sous les pieds" might mean the one containing the position.

        // Note: My chunk coordinates are rounded (nearest center). 
        // Real grid index is floor((pos + size/2) / size)? 
        // Chunk at (0,0) covers -32 to 32.
        // Math.round(0/64) = 0. Correct.
        // Math.round(31/64) = 0. Correct.
        // Math.round(33/64) = 1. Correct.

        // 3. Update Physics (3x3 Grid around player)
        // Enabling only the center chunk causes falling through when crossing borders.
        // We enable the 3x3 grid (radius 1) to ensure seamless transition.

        for (const [key, chunk] of this.chunks) {
            const dx = Math.abs(chunk.x - cx);
            const dz = Math.abs(chunk.z - cz);

            // Enable physics if within 1 chunk distance (3x3 grid)
            if (dx <= 1 && dz <= 1) {
                chunk.enablePhysics(this.world.physicsWorld);
            } else {
                chunk.disablePhysics(this.world.physicsWorld);
            }
        }
    }
}
