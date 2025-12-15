import * as THREE from 'three';

export class ElaraHologram {
    constructor(game, position) {
        this.game = game;
        this.position = position;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        this.time = 0;
        this.initVisuals();

        // Add to scene
        this.game.world.scene.add(this.mesh);
    }

    initVisuals() {
        // 1. Core (Sphere of pure energy)
        const coreGeo = new THREE.IcosahedronGeometry(0.3, 2);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x00FFFF, // Cyan
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.mesh.add(this.core);

        // 2. Inner Ring (Gold - Divine Aspect)
        const ring1Geo = new THREE.TorusGeometry(0.5, 0.02, 16, 100);
        const ring1Mat = new THREE.MeshBasicMaterial({
            color: 0xFFD700, // Gold
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
        this.mesh.add(this.ring1);

        // 3. Outer Ring (Cyan - Tech/Prison Aspect)
        const ring2Geo = new THREE.TorusGeometry(0.8, 0.03, 16, 100);
        const ring2Mat = new THREE.MeshBasicMaterial({
            color: 0x0088AA,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
        this.ring2.rotation.x = Math.PI / 2;
        this.mesh.add(this.ring2);

        // 4. Aura Particles (Fragmented Soul)
        const particleCount = 50;
        const particleGeo = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            const z = (Math.random() - 0.5) * 2;
            positions.push(x, y, z);
        }
        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.05,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        this.particles = new THREE.Points(particleGeo, particleMat);
        this.mesh.add(this.particles);

        // 5. Point Light (Soft Glow)
        this.light = new THREE.PointLight(0x00FFFF, 1, 5);
        this.mesh.add(this.light);

        // 6. Interaction Indicator (Reusable HTML Element?? Or just 3D text?)
        // For now, let's omit the floating "E" and rely on the UI layer or StoryManager to handle generic interaction prompts
        // Or re-implement a simple one here if needed.
    }

    update(dt) {
        this.time += dt;

        // Core Pulse
        const scale = 1 + Math.sin(this.time * 2) * 0.1;
        this.core.scale.set(scale, scale, scale);

        // Ring Rotations
        this.ring1.rotation.x = this.time * 0.5;
        this.ring1.rotation.y = this.time * 0.3;

        this.ring2.rotation.x = Math.PI / 2 + Math.cos(this.time * 0.2) * 0.2;
        this.ring2.rotation.y += dt * 0.2;

        // Particles Drift
        this.particles.rotation.y -= dt * 0.1;

        // Float effect (Bobbing)
        this.mesh.position.y = this.position.y + Math.sin(this.time) * 0.2 + 1.5; // Hover 1.5m above ground
    }

    destroy() {
        this.game.world.scene.remove(this.mesh);
        // Dispose geometries/materials ideally
    }
}
