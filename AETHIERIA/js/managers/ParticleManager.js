import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = []; // { mesh, velocity, life }

        // Pre-create generic geometries/materials to share?
        this.boxGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        this.bloodMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    }

    emit(position, type = 'blood', count = 5) {
        let mat = this.bloodMat;
        if (type === 'metal') mat = this.sparkMat;
        else if (type === 'slime') mat = new THREE.MeshBasicMaterial({ color: 0x44ff44 }); // Green blood

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.position.copy(position);

            // Random scatter
            mesh.position.x += (Math.random() - 0.5) * 0.2;
            mesh.position.y += (Math.random() - 0.5) * 0.2;
            mesh.position.z += (Math.random() - 0.5) * 0.2;

            // Random Velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() * 2) + 2, // Upwards pop
                (Math.random() - 0.5) * 4
            );

            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 1.0 });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            // Physics (Gravity)
            p.velocity.y -= 9.8 * dt;

            p.mesh.position.x += p.velocity.x * dt;
            p.mesh.position.y += p.velocity.y * dt;
            p.mesh.position.z += p.velocity.z * dt;

            // Floor check (Simple y=0 or ground?)
            if (p.mesh.position.y < 0) {
                p.mesh.position.y = 0;
                p.velocity.set(0, 0, 0); // Stop
            }

            p.mesh.scale.setScalar(p.life); // Shrink
        }
    }
}
