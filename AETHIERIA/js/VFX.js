import * as THREE from 'three';

export class SwordTrail {
    constructor(scene, color = 0x00FFFF, maxPoints = 20) {
        this.scene = scene;
        this.maxPoints = maxPoints;
        this.points = [];
        this.mesh = null;
        this.material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    update(basePos, tipPos) {
        // Add new points
        this.points.unshift({ base: basePos.clone(), tip: tipPos.clone(), life: 1.0 });

        // Trim
        if (this.points.length > this.maxPoints) {
            this.points.pop();
        }

        // Update Geometry
        this.updateGeometry();
    }

    updateGeometry() {
        if (this.points.length < 2) return;

        // Create/Update Mesh
        if (!this.mesh) {
            const geometry = new THREE.BufferGeometry();
            this.mesh = new THREE.Mesh(geometry, this.material);
            this.mesh.frustumCulled = false; // Always render
            this.scene.add(this.mesh);
        }

        const positions = [];
        const uvs = [];
        const indices = [];

        // Build Strip
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            p.life -= 0.1; // Fade out

            if (p.life <= 0) continue;

            positions.push(p.base.x, p.base.y, p.base.z);
            positions.push(p.tip.x, p.tip.y, p.tip.z);

            const u = i / (this.points.length - 1);
            uvs.push(u, 0);
            uvs.push(u, 1);

            if (i < this.points.length - 1) {
                const baseIndex = i * 2;
                indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
            }
        }

        // Remove dead points
        this.points = this.points.filter(p => p.life > 0);

        if (positions.length === 0) {
            this.mesh.visible = false;
            return;
        }

        this.mesh.visible = true;
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.mesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        this.mesh.geometry.setIndex(indices);
        this.mesh.geometry.computeVertexNormals();
    }

    reset() {
        this.points = [];
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }
}
