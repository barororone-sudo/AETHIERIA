import * as THREE from 'three';
import { Utils } from '../Utils.js';

export class ForestGenerator {
    constructor(world) {
        this.world = world;
        this.scene = world.scene;
        this.terrain = world.terrainManager;

        // --- SHARED ASSETS (Geometries & Materials) ---
        // PINE
        this.geoPineTrunk = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
        this.matPineTrunk = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
        this.geoPineLeaves = new THREE.ConeGeometry(3, 8, 8);
        this.matPineLeaves = new THREE.MeshToonMaterial({ color: 0x1a472a });

        // PALM
        this.geoPalmTrunk = new THREE.CylinderGeometry(0.3, 0.5, 5, 6);
        this.matPalmTrunk = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        this.geoPalmLeaves = new THREE.ConeGeometry(3.5, 1, 7); // Flattened cone for abstraction
        this.matPalmLeaves = new THREE.MeshToonMaterial({ color: 0x228B22 });

        // ROCKS
        this.geoRock = new THREE.DodecahedronGeometry(1, 0);
        this.matRockGrey = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        this.matRockLava = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0xff4400, emissiveIntensity: 0.2, roughness: 0.9 });

        // CRYSTAL
        this.geoCrystal = new THREE.OctahedronGeometry(1, 0);
        this.matCrystal = new THREE.MeshStandardMaterial({ color: 0xFF00FF, emissive: 0x440044, metalness: 0.5, roughness: 0.1 });

        // ICE
        this.geoIce = new THREE.ConeGeometry(1, 4, 4);
        this.matIce = new THREE.MeshStandardMaterial({ color: 0xCCFFFF, transparent: true, opacity: 0.8, roughness: 0.1 });

        this.activeChunks = new Map();
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    loadChunk(chunkX, chunkZ, biome) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (this.activeChunks.has(key)) return;

        const meshes = this.generateChunk(chunkX, chunkZ, biome);
        meshes.forEach(m => this.scene.add(m));
        this.activeChunks.set(key, meshes);
    }

    unloadChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (!this.activeChunks.has(key)) return;

        const meshes = this.activeChunks.get(key);
        meshes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            // Do NOT dispose material as it is shared
        });
        this.activeChunks.delete(key);
    }

    /**
     * Generates a chunk of instanced decorations.
     * @param {number} chunkX World X of chunk center (or corner)
     * @param {number} chunkZ World Z of chunk center
     * @param {string} biome Biome type
     * @returns {Array<THREE.InstancedMesh>} List of meshes to add/remove from scene
     */
    generateChunk(chunkX, chunkZ, biome) {
        const meshes = [];
        const dummy = new THREE.Object3D();
        const range = 50; // Use fixed range or passed size

        // Config based on Biome
        let treeType = null;
        let rockType = 'GREY';
        let treeCount = 0;
        let rockCount = 10;

        switch (biome) {
            case 'FOREST': treeType = 'PINE'; treeCount = 20; rockCount = 15; break;
            case 'JUNGLE': treeType = 'PALM'; treeCount = 30; rockCount = 10; break;
            case 'ICE':
            case 'SNOW': treeType = 'ICE_SPIKE'; treeCount = 15; rockCount = 20; break;
            case 'CRYSTAL': treeType = 'CRYSTAL'; treeCount = 20; rockCount = 5; break;
            case 'FIRE':
            case 'LAVA': rockType = 'LAVA'; treeCount = 0; rockCount = 25; break;
            case 'GOLD': rockType = 'GOLD'; treeCount = 0; rockCount = 10; break;
            default: treeCount = 5; rockCount = 20; break;
        }

        // --- TREES ---
        if (treeCount > 0) {
            let tGeo, tMat, lGeo, lMat;

            if (treeType === 'PINE') {
                tGeo = this.geoPineTrunk; tMat = this.matPineTrunk;
                lGeo = this.geoPineLeaves; lMat = this.matPineLeaves;
            } else if (treeType === 'PALM') {
                tGeo = this.geoPalmTrunk; tMat = this.matPalmTrunk;
                lGeo = this.geoPalmLeaves; lMat = this.matPalmLeaves;
            } else if (treeType === 'ICE_SPIKE') {
                // Single mesh structure for Ice
                const iceMesh = new THREE.InstancedMesh(this.geoIce, this.matIce, treeCount);
                this.populatemesh(iceMesh, treeCount, chunkX, chunkZ, range, 2.0, dummy, 0.5, 2.0);
                meshes.push(iceMesh);
                treeType = null; // Done
            } else if (treeType === 'CRYSTAL') {
                const crysMesh = new THREE.InstancedMesh(this.geoCrystal, this.matCrystal, treeCount);
                this.populatemesh(crysMesh, treeCount, chunkX, chunkZ, range, 1.5, dummy, 1.0, 2.0);
                meshes.push(crysMesh);
                treeType = null; // Done
            }

            // Dual-Mesh Trees (Trunk + Leaves)
            if (treeType === 'PINE' || treeType === 'PALM') {
                const trunks = new THREE.InstancedMesh(tGeo, tMat, treeCount);
                const leaves = new THREE.InstancedMesh(lGeo, lMat, treeCount);

                for (let i = 0; i < treeCount; i++) {
                    const { x, y, z, scale } = this.getRandomPos(chunkX, chunkZ, range);
                    if (y === null) {
                        // Hide if invalid
                        dummy.position.set(0, -500, 0);
                        dummy.updateMatrix();
                        trunks.setMatrixAt(i, dummy.matrix);
                        leaves.setMatrixAt(i, dummy.matrix);
                        continue;
                    }

                    // Trunk
                    dummy.position.set(x, y + 2 * scale, z);
                    dummy.scale.set(scale, scale, scale);
                    dummy.rotation.set(0, Math.random() * Math.PI, 0);
                    dummy.updateMatrix();
                    trunks.setMatrixAt(i, dummy.matrix);

                    // Leaves
                    // Offset y based on type
                    const leafOffset = treeType === 'PINE' ? 4 * scale : 3.5 * scale;
                    dummy.position.set(x, y + 2 * scale + leafOffset, z);
                    dummy.updateMatrix();
                    leaves.setMatrixAt(i, dummy.matrix);
                }
                trunks.instanceMatrix.needsUpdate = true;
                leaves.instanceMatrix.needsUpdate = true;
                trunks.castShadow = true;
                trunks.receiveShadow = true;
                leaves.castShadow = true;
                leaves.receiveShadow = true;

                meshes.push(trunks, leaves);
            }
        }

        // --- ROCKS ---
        if (rockCount > 0) {
            let rMat = this.matRockGrey;
            if (rockType === 'LAVA') rMat = this.matRockLava;
            // Gold rock? reusing grey for now or add gold mat

            const rocks = new THREE.InstancedMesh(this.geoRock, rMat, rockCount);
            this.populatemesh(rocks, rockCount, chunkX, chunkZ, range, 0.5, dummy, 0.8, 1.5);
            rocks.castShadow = true;
            rocks.receiveShadow = true;
            meshes.push(rocks);
        }

        return meshes;
    }

    /**
     * Helper to populate a single InstancedMesh with random positions
     */
    populatemesh(mesh, count, cx, cz, range, yOffset, dummy, minScale = 1, maxScale = 1) {
        for (let i = 0; i < count; i++) {
            const { x, y, z, scale } = this.getRandomPos(cx, cz, range, minScale, maxScale);
            if (y === null) {
                dummy.position.set(0, -500, 0);
                dummy.updateMatrix();
            } else {
                dummy.position.set(x, y + yOffset * scale, z);
                dummy.scale.set(scale, scale, scale);
                dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                dummy.updateMatrix();
            }
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }

    getRandomPos(cx, cz, range, minScale = 0.5, maxScale = 1.2) {
        const x = cx + (Math.random() - 0.5) * range;
        const z = cz + (Math.random() - 0.5) * range;
        let y = 0;

        if (this.terrain) {
            y = this.terrain.getGlobalHeight(x, z);
            if (y < 2.2) return { x, y: null, z, scale: 1 }; // Water check
        }

        const scale = minScale + Math.random() * (maxScale - minScale);
        return { x, y, z, scale };
    }

    // Legacy method mostly for compatibility or specific calls
    generate() {
        // No-op or call generateChunk for initial area
        console.log("ForestGenerator: Dynamic generation now handled by LevelManager.");
    }
}
