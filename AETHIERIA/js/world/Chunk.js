// @ts-check
import * as THREE from 'three';
// @ts-ignore
import * as CANNON from 'cannon-es';

export class Chunk {
    /**
     * @param {import('./TerrainManager').TerrainManager} terrainManager
     * @param {number} x Chunk X Index
     * @param {number} z Chunk Z Index
     */
    constructor(terrainManager, x, z) {
        this.terrainManager = terrainManager;
        this.x = x;
        this.z = z;
        this.size = terrainManager.chunkSize;
        this.resolution = terrainManager.chunkResolution; // e.g. 33

        // World Position of the Chunk Center (for Visual) and Corner (for Physics)
        // Chunk X/Z are indices.
        // World Origin of Chunk (Top-Left Corner):
        this.worldX = x * this.size;
        this.worldZ = z * this.size;

        this.mesh = null;
        this.body = null;
        this.hasPhysics = false;
        /** @type {THREE.Line[]} */
        this.debugLines = [];

        // 1. Create Visual Mesh (The Truth: Global Height)
        this.createVisual();

        // 2. Create Physics Body (The Truth: Global Height)
        this.createPhysics();

        // 3. Debug Borders
        // const DEBUG_BORDERS = true;
        // if (DEBUG_BORDERS) this.createDebugBorders();
    }

    createVisual() {
        const segments = this.resolution - 1;
        const geometry = new THREE.PlaneGeometry(this.size, this.size, segments, segments);

        // CORNER PIVOT LOGIC (CORRECTED):
        // We want the mesh to cover [worldX, worldX + size] and [worldZ, worldZ + size].
        // Mesh Position will be (worldX, 0, worldZ).
        // So Local X must be [0, size].
        // Local Y (which becomes -World Z) must be [-size, 0].
        // Because Rot(-90 X) maps (x, y, z) -> (x, z, -y).
        // So World Z = -Local Y.
        // We want World Z to be [0, size] relative to origin.
        // So -Local Y must be [0, size].
        // So Local Y must be [-size, 0].

        geometry.translate(this.size / 2, -this.size / 2, 0);

        const posAttribute = geometry.attributes.position;

        for (let i = 0; i < posAttribute.count; i++) {
            const localX = posAttribute.getX(i);
            const localY = posAttribute.getY(i);

            // World Position of this vertex
            // Mesh is at (this.worldX, 0, this.worldZ)
            const wx = this.worldX + localX;
            // World Z = MeshZ + (-localY)
            const wz = this.worldZ - localY;

            // THE TRUTH
            const height = this.terrainManager.getGlobalHeight(wx, wz);

            // Set Z (which becomes World Y after rotation)
            // Rot(-90 X) maps Local Z -> World Y.
            // So we set Local Z = height.
            posAttribute.setZ(i, height);
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x55aa55,
            roughness: 0.8,
            flatShading: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // Rotate -90 X to make it flat
        this.mesh.rotation.x = -Math.PI / 2;

        // Position at Chunk Corner
        this.mesh.position.set(this.worldX, 0, this.worldZ);

        // Shadow
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;

        if (this.terrainManager.group) {
            this.terrainManager.group.add(this.mesh);
        } else {
            this.terrainManager.world.scene.add(this.mesh);
        }
    }

    createPhysics() {
        // Cannon Heightfield
        // Extents: Local X [0, size], Local Y [0, size].
        // Rot(-90 X) maps Local Y -> World -Z.
        // So Physics Body extends in World -Z.
        // We want to cover [worldZ, worldZ + size].
        // So we must position the Body at worldZ + size.
        // Then it extends to (worldZ + size) - size = worldZ.

        const resolution = this.resolution;
        const elementSize = this.size / (resolution - 1);
        const data = [];

        const startX = this.worldX;
        const startZ = this.worldZ + this.size;

        for (let i = 0; i < resolution; i++) {
            const row = [];
            for (let j = 0; j < resolution; j++) {
                // Calculate World Pos for this grid point
                // i is Local X. j is Local Y.
                // World X = BodyX + i * elem = startX + i * elem.
                // World Z = BodyZ - j * elem = startZ - j * elem. (Minus because Y -> -Z)

                const wx = startX + i * elementSize;
                const wz = startZ - j * elementSize;

                const height = this.terrainManager.getGlobalHeight(wx, wz);
                row.push(height);
            }
            data.push(row);
        }

        // Create Shape
        const heightfieldShape = new CANNON.Heightfield(data, {
            elementSize: elementSize
        });

        this.body = new CANNON.Body({ mass: 0, material: this.terrainManager.world.slipperyMaterial });
        this.body.addShape(heightfieldShape);

        // Rotate -90 X
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

        // Position
        this.body.position.set(startX, 0, startZ);

        // Do not add to world yet
    }

    enablePhysics(physicsWorld) {
        if (!this.hasPhysics && this.body) {
            physicsWorld.addBody(this.body);
            this.hasPhysics = true;
        }
    }

    disablePhysics(physicsWorld) {
        if (this.hasPhysics && this.body) {
            physicsWorld.removeBody(this.body);
            this.hasPhysics = false;
        }
    }

    createDebugBorders() {
        // Draw red lines at corners of the mesh extents
        // Extents: [worldX - s/2, worldX + s/2], [worldZ - s/2, worldZ + s/2]
        const s2 = this.size / 2;
        const corners = [
            [this.worldX - s2, this.worldZ - s2],
            [this.worldX + s2, this.worldZ - s2],
            [this.worldX + s2, this.worldZ + s2],
            [this.worldX - s2, this.worldZ + s2]
        ];

        const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });

        corners.forEach(([x, z]) => {
            const h = this.terrainManager.getGlobalHeight(x, z);
            const pts = [
                new THREE.Vector3(x, h, z),
                new THREE.Vector3(x, h + 5, z) // 5m pole
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(geo, mat);
            this.terrainManager.world.scene.add(line);
            this.debugLines.push(line);
        });
    }

    destroy() {
        if (this.mesh) {
            if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                this.mesh.material.dispose();
            }
        }
        if (this.body && this.hasPhysics) {
            // Should be removed by TerrainManager, but safety check
            // We don't have access to physicsWorld here easily unless passed.
            // Assuming TerrainManager handles disablePhysics before destroy.
        }

        this.debugLines.forEach(l => {
            if (l.parent) l.parent.remove(l);
            l.geometry.dispose();
        });
    }
}
