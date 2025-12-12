// js/world/Waypoint.js
import * as THREE from 'three';

export class Waypoint {
    constructor(world, x, z, id, y = null) {
        this.world = world;
        this.game = world.game;
        this.position = new THREE.Vector3(x, y !== null ? y : 0, z);
        this.id = id || `waypoint_${Math.floor(x)}_${Math.floor(z)}`;
        this.isUnlocked = false;
        this.interactionRadius = 5; // Increased to match towers

        this.mesh = null;
        this.light = null;
        this.particles = null;
        this.mapIcon = null;

        this.init(y);
    }

    init(yOverride) {
        // 1. Snap to Ground (if no override provided)
        if (yOverride === null && this.world.terrainManager) {
            this.position.y = this.world.terrainManager.getGlobalHeight(this.position.x, this.position.z);
        }

        // 2. Visual: Larger Stone Pillar (More visible like towers)
        const geometry = new THREE.CylinderGeometry(0.8, 0.8, 4, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            emissive: 0xff0000, // Red when locked
            emissiveIntensity: 0.8, // Brighter
            roughness: 0.8,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y += 2; // Center at +2m height (taller)
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.world.scene.add(this.mesh);

        // 3. Brighter Light (More visible)
        this.light = new THREE.PointLight(0xff0000, 5, 20); // Increased intensity and range
        this.light.position.set(0, 3, 0);
        this.mesh.add(this.light);

        // 4. Larger Floating Rune Symbol
        const runeGeometry = new THREE.TorusGeometry(0.5, 0.08, 8, 16); // Larger rune
        const runeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        this.rune = new THREE.Mesh(runeGeometry, runeMaterial);
        this.rune.position.set(0, 3.5, 0); // Higher position
        this.rune.rotation.x = Math.PI / 2;
        this.mesh.add(this.rune);

        // 5. Register with WaypointManager
        if (this.game.waypointManager) {
            this.game.waypointManager.register(this.id, this.position, 'waypoint', this);
        }

        // 6. Register as Interactable
        if (this.world.interactables) {
            this.world.interactables.push(this);
        }

        // 7. Add to Map (defer if not ready)
        if (this.game.ui && this.game.ui.mapManager && this.game.ui.mapManager.iconLayer) {
            this.game.ui.mapManager.addWaypointIcon(this);
        } else {
            // Defer icon creation until map is ready
            if (!this.game._pendingWaypointIcons) this.game._pendingWaypointIcons = [];
            this.game._pendingWaypointIcons.push(this);
        }
    }

    update(dt) {
        if (!this.mesh) return;

        // Rotate rune
        if (this.rune) {
            this.rune.rotation.z += dt * 2;
        }

        // Pulsating glow
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        if (this.light) {
            this.light.intensity = this.isUnlocked ? 3 * pulse : 2 * pulse;
        }

        // Check for player proximity (show interact prompt)
        if (!this.isUnlocked && this.game.player && this.game.player.mesh) {
            const playerPos = this.game.player.mesh.position;
            const dist = this.position.distanceTo(playerPos);

            if (dist < this.interactionRadius) {
                this.showInteractPrompt();
            } else {
                this.hideInteractPrompt();
            }
        }
    }

    showInteractPrompt() {
        if (this.interactPrompt) {
            this.interactPrompt.style.display = 'block';
            return;
        }

        this.interactPrompt = document.createElement('div');
        this.interactPrompt.innerText = "[E] ACTIVER";
        Object.assign(this.interactPrompt.style, {
            position: 'fixed',
            top: '60%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '10px 20px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid #33ccff',
            borderRadius: '8px',
            zIndex: '5000',
            pointerEvents: 'none'
        });
        document.body.appendChild(this.interactPrompt);
    }

    hideInteractPrompt() {
        if (this.interactPrompt) {
            this.interactPrompt.style.display = 'none';
        }
    }

    interact() {
        if (this.isUnlocked) {
            // Already unlocked, maybe show teleport menu?
            if (this.game.ui) {
                this.game.ui.showToast("Point de passage déjà activé", 'info');
            }
            return;
        }

        console.log(`[Waypoint] Unlocking ${this.id}...`);
        this.isUnlocked = true;

        // Visual Change
        this.mesh.material.emissive.setHex(0x0033ff);
        this.mesh.material.emissiveIntensity = 1.0; // Brighter when unlocked
        this.light.color.setHex(0x33ccff);
        this.light.intensity = 6; // Brighter light

        // NOTE: Only towers reveal the map, waypoints are just teleport points

        if (this.rune) {
            this.rune.material.color.setHex(0x33ccff);
        }

        // Particle Burst
        this.spawnUnlockParticles();

        // Hide prompt
        this.hideInteractPrompt();
        if (this.interactPrompt) {
            this.interactPrompt.remove();
            this.interactPrompt = null;
        }

        // Register with WaypointManager
        if (this.game.waypointManager) {
            this.game.waypointManager.unlock(this.id);
        }
    }

    spawnUnlockParticles() {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(0, 1, 0); // Start at waypoint center
            velocities.push(
                (Math.random() - 0.5) * 2,
                Math.random() * 3,
                (Math.random() - 0.5) * 2
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0x33ccff,
            size: 0.3,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.mesh.add(this.particles);

        // Animate particles
        let time = 0;
        const animate = () => {
            if (!this.particles || time > 2) {
                if (this.particles) {
                    this.mesh.remove(this.particles);
                    this.particles = null;
                }
                return;
            }

            time += 0.016;
            const positions = this.particles.geometry.attributes.position.array;

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3 + 0] += velocities[i * 3 + 0] * 0.016;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.016;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;

                // Gravity
                velocities[i * 3 + 1] -= 9.8 * 0.016;
            }

            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.material.opacity = 1 - (time / 2);

            requestAnimationFrame(animate);
        };
        animate();
    }
}
