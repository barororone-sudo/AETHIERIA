import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Chunk {
    constructor(terrainManager, x, z) {
        this.tm = terrainManager;
        this.x = x;
        this.z = z;
        this.size = this.tm.chunkSize;
        this.resolution = this.tm.chunkResolution;

        this.worldX = x * this.size;
        this.worldZ = z * this.size;

        this.mesh = null;
        this.body = null;
        this.hasPhysics = false;
        this.instancedMeshes = []; // Store population meshes

        this.createVisual();
        this.createPhysics();
        this.populateChunk();
    }

    createVisual() {
        // Create Geometry
        const geometry = new THREE.PlaneGeometry(this.size, this.size, this.resolution - 1, this.resolution - 1);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(this.worldX + this.size / 2, 0, this.worldZ + this.size / 2); // Apply chunk offset

        const positions = geometry.attributes.position;
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            // World Coords (already translated by geometry.translate)
            const wx = x;
            const wz = z;

            // Get Height
            const y = this.tm.getGlobalHeight(wx, wz);
            positions.setY(i, y);

            // Get Biome and Color
            // Note: getBiome and getBiomeColor now expect world coordinates directly
            const biome = this.tm.getBiome(wx, wz); // Pass height for biome calculation
            const hex = this.tm.getBiomeColor(biome);

            // Add slight random noise to terrain color for texture
            const noise = (Math.random() * 0.1) - 0.05;
            color.setHex(hex);
            color.r += noise;
            color.g += noise;
            color.b += noise;

            colors.push(color.r, color.g, color.b);
        }

        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // OPTIMIZATION: Use Shared Material
        this.mesh = new THREE.Mesh(geometry, this.tm.assets.groundMaterial);
        this.mesh.name = 'terrainChunk';
        this.mesh.receiveShadow = true;
        this.tm.group.add(this.mesh);
    }

    createPhysics() {
        const res = this.resolution;
        const data = [];
        const elementSize = this.size / (res - 1);

        // Cannon Heightfield orientation is tricky.
        // It assumes local X, Y. We map Y to World -Z.
        // We iterate X then Z.

        for (let i = 0; i < res; i++) {
            const row = [];
            for (let j = 0; j < res; j++) {
                // Local grid points
                // WorldX = this.worldX + i * elementSize
                // WorldZ = this.worldZ + (res - 1 - j) * elementSize  <-- Flip Z for Cannon

                const wx = this.worldX + i * elementSize;
                const wz = this.worldZ + (res - 1 - j) * elementSize;

                const h = this.tm.getGlobalHeight(wx, wz);
                row.push(h);
            }
            data.push(row);
        }

        const shape = new CANNON.Heightfield(data, { elementSize });
        this.body = new CANNON.Body({ mass: 0, material: this.tm.world.slipperyMaterial });
        this.body.addShape(shape);

        // Position: Top-Left corner of the chunk in World Space
        // Cannon Heightfield origin is at (0,0,0) of the body.
        // We rotate -90 X.
        // So Body Local X+ is World X+. Body Local Y+ is World Z-.
        // We need Body Pos to be at (worldX, 0, worldZ + size).

        this.body.position.set(this.worldX, 0, this.worldZ + this.size);
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    }

    populateChunk() {
        // Use InstancedMesh for performance
        // We create local InstancedMeshes for this chunk. 
        // Ideally these should be global and we just add matrices, but Three.js InstancedMesh 
        // is fixed size. Dynamic batching is complex.
        // For simplicity: One InstancedMesh per object type PER CHUNK.

        const assets = this.tm.assets;
        const count = 20; // REDUCED COUNT (was 50) for Performance

        // Prepare Arrays
        const treeMatrices = [];
        const cactusMatrices = [];
        const rockMatrices = [];
        const buildingMatrices = [];
        const snowTreeMatrices = [];

        for (let i = 0; i < count; i++) {
            const lx = Math.random() * this.size;
            const lz = Math.random() * this.size;
            const wx = this.worldX + lx;
            const wz = this.worldZ + lz;

            const h = this.tm.getGlobalHeight(wx, wz);
            if (h < 2.5) continue; // No underwater

            const dummy = new THREE.Object3D();
            dummy.position.set(wx, h, wz);
            dummy.rotation.y = Math.random() * Math.PI * 2;

            // Updated Biome Logic Check (Calling new getBiome)
            const biome = this.tm.getBiome(wx, wz, h, 0);

            if (biome === 'FOREST') {
                // Tree
                const scale = 0.8 + Math.random() * 0.5;
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                treeMatrices.push(dummy.matrix.clone());
            } else if (biome === 'DESERT' || biome === 'BADLANDS') {
                // Cactus or Rock
                if (biome === 'DESERT' && Math.random() > 0.5) {
                    dummy.scale.set(1, 0.8 + Math.random(), 1);
                    dummy.updateMatrix();
                    cactusMatrices.push(dummy.matrix.clone());
                } else {
                    dummy.scale.setScalar(0.5 + Math.random());
                    dummy.updateMatrix();
                    rockMatrices.push(dummy.matrix.clone());
                }
            } else if (biome === 'CITY') {
                // Building
                // Snap to grid for city look?
                const gx = Math.round(wx / 5) * 5;
                const gz = Math.round(wz / 5) * 5;
                const gh = this.tm.getGlobalHeight(gx, gz);
                dummy.position.set(gx, gh + 0.5, gz); // Adjust y

                const height = 2 + Math.random() * 8; // Tall
                dummy.scale.set(3, height, 3);
                dummy.position.y += height / 2; // Center pivot

                dummy.updateMatrix();
                buildingMatrices.push(dummy.matrix.clone());
            } else if (biome === 'SNOW') {
                // Dead Tree or Rock
                if (Math.random() > 0.5) {
                    dummy.scale.setScalar(0.5 + Math.random());
                    dummy.updateMatrix();
                    rockMatrices.push(dummy.matrix.clone()); // Re-use rock
                } else {
                    // White Tree
                    dummy.scale.setScalar(0.7);
                    dummy.updateMatrix();
                    snowTreeMatrices.push(dummy.matrix.clone());
                }
            } else if (biome === 'PLAINS' || biome === 'HIGHLANDS') {
                // Sparse Trees
                if (Math.random() < 0.1) {
                    dummy.scale.setScalar(0.8);
                    dummy.updateMatrix();
                    treeMatrices.push(dummy.matrix.clone());
                }
            } else if (biome === 'SWAMP') {
                // Trees + Rock
                if (Math.random() < 0.3) {
                    dummy.scale.setScalar(0.6 + Math.random() * 0.3);
                    dummy.rotation.z = Math.random() * 0.2; // Crooked trees
                    dummy.updateMatrix();
                    treeMatrices.push(dummy.matrix.clone());
                }
            }
        }

        // Create Meshes
        this.createInstancedMesh(assets.treeLog, assets.matBrown, treeMatrices, 'logs');
        this.createInstancedMesh(assets.treeLeaves, assets.matGreen, treeMatrices, 'leaves', 1.5); // Offset leaves up

        this.createInstancedMesh(assets.cactus, assets.matCactus, cactusMatrices, 'cactus', 1.0);
        this.createInstancedMesh(assets.rock, assets.matDarkRock, rockMatrices, 'rocks');
        this.createInstancedMesh(assets.building, assets.matConcrete, buildingMatrices, 'buildings');

        // Snow Trees (White logs/leaves)
        this.createInstancedMesh(assets.treeLog, assets.matWhite, snowTreeMatrices, 'snowLogs');
        this.createInstancedMesh(assets.treeLeaves, assets.matWhite, snowTreeMatrices, 'snowLeaves', 1.5);
    }

    createInstancedMesh(geometry, material, matrices, name, yOffset = 0) {
        if (matrices.length === 0) return;

        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        mesh.name = name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        for (let i = 0; i < matrices.length; i++) {
            const mat = matrices[i].clone();
            if (yOffset !== 0) {
                // Extract position, add offset, recompose
                const pos = new THREE.Vector3();
                const rot = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                mat.decompose(pos, rot, scale);
                pos.y += yOffset * scale.y;
                mat.compose(pos, rot, scale);
            }
            mesh.setMatrixAt(i, mat);
        }

        this.tm.group.add(mesh);
        this.instancedMeshes.push(mesh);
    }

    enablePhysics(world) {
        if (!this.hasPhysics && this.body) {
            world.addBody(this.body);
            this.hasPhysics = true;
        }
    }

    disablePhysics(world) {
        if (this.hasPhysics && this.body) {
            world.removeBody(this.body);
            this.hasPhysics = false;
        }
    }

    destroy() {
        if (this.mesh) {
            this.tm.group.remove(this.mesh);
            this.mesh.geometry.dispose();
            // DO NOT dispose material (Shared)
        }
        if (this.body && this.hasPhysics) {
            this.tm.world.physicsWorld.removeBody(this.body);
        }

        // Cleanup Instanced Meshes
        this.instancedMeshes.forEach(mesh => {
            this.tm.group.remove(mesh);
            // DO NOT dispose geometry/material here (Shared Assets)
        });
        this.instancedMeshes = [];
    }
}
