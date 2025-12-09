import * as THREE from 'three';

export class SwordTrail {
    constructor(scene, color = 0x00FFFF, maxPoints = 20) {
        this.scene = scene;
        this.maxPoints = maxPoints;
        this.points = [];

        this.material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 🚀 PRE-ALLOCATE BUFFERS (Fixed Size)
        // Each point creates 2 vertices (base + tip)
        // Max triangles = (maxPoints - 1) * 2
        const maxVertices = maxPoints * 2;
        const maxTriangles = (maxPoints - 1) * 2;
        const maxIndices = maxTriangles * 3;

        // Pre-allocate typed arrays
        this.positionArray = new Float32Array(maxVertices * 3);
        this.uvArray = new Float32Array(maxVertices * 2);
        this.indexArray = new Uint16Array(maxIndices);

        // Create geometry with pre-allocated attributes
        const geometry = new THREE.BufferGeometry();
        this.positionAttribute = new THREE.BufferAttribute(this.positionArray, 3);
        this.uvAttribute = new THREE.BufferAttribute(this.uvArray, 2);

        geometry.setAttribute('position', this.positionAttribute);
        geometry.setAttribute('uv', this.uvAttribute);
        geometry.setIndex(new THREE.BufferAttribute(this.indexArray, 1));

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.visible = false; // Start hidden
        this.scene.add(this.mesh);

        // Track current vertex/index count
        this.currentVertexCount = 0;
        this.currentIndexCount = 0;
    }

    update(basePos, tipPos) {
        // Add new points
        this.points.unshift({ base: basePos.clone(), tip: tipPos.clone(), life: 1.0 });

        // Trim to max
        if (this.points.length > this.maxPoints) {
            this.points.pop();
        }

        // Update Geometry
        this.updateGeometry();
    }

    updateGeometry() {
        if (this.points.length < 2) {
            this.mesh.visible = false;
            return;
        }

        let vertexIndex = 0;
        let indexIndex = 0;
        let validPoints = 0;

        // 🔥 UPDATE EXISTING ARRAYS (No new allocations!)
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            p.life -= 0.1; // Fade out

            if (p.life <= 0) continue;

            // Write positions directly to pre-allocated array
            const vIdx = vertexIndex * 3;
            this.positionArray[vIdx + 0] = p.base.x;
            this.positionArray[vIdx + 1] = p.base.y;
            this.positionArray[vIdx + 2] = p.base.z;

            this.positionArray[vIdx + 3] = p.tip.x;
            this.positionArray[vIdx + 4] = p.tip.y;
            this.positionArray[vIdx + 5] = p.tip.z;

            // Write UVs
            const u = validPoints / (this.points.length - 1);
            const uvIdx = vertexIndex * 2;
            this.uvArray[uvIdx + 0] = u;
            this.uvArray[uvIdx + 1] = 0;
            this.uvArray[uvIdx + 2] = u;
            this.uvArray[uvIdx + 3] = 1;

            // Build indices for triangle strip
            if (validPoints > 0) {
                const baseIdx = (validPoints - 1) * 2;
                this.indexArray[indexIndex++] = baseIdx;
                this.indexArray[indexIndex++] = baseIdx + 1;
                this.indexArray[indexIndex++] = baseIdx + 2;

                this.indexArray[indexIndex++] = baseIdx + 1;
                this.indexArray[indexIndex++] = baseIdx + 3;
                this.indexArray[indexIndex++] = baseIdx + 2;
            }

            vertexIndex += 2;
            validPoints++;
        }

        // Remove dead points
        this.points = this.points.filter(p => p.life > 0);

        if (validPoints === 0) {
            this.mesh.visible = false;
            return;
        }

        // 🎯 UPDATE ATTRIBUTES (Mark as needing update)
        this.positionAttribute.needsUpdate = true;
        this.uvAttribute.needsUpdate = true;
        this.mesh.geometry.index.needsUpdate = true;

        // 🎯 SET DRAW RANGE (Only render valid vertices/indices)
        this.mesh.geometry.setDrawRange(0, indexIndex);

        // Compute normals for lighting
        this.mesh.geometry.computeVertexNormals();

        this.mesh.visible = true;
        this.currentVertexCount = vertexIndex;
        this.currentIndexCount = indexIndex;
    }

    reset() {
        this.points = [];
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.material.dispose();
            this.scene.remove(this.mesh);
        }
    }
}

