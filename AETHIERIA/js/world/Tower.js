import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Tower {
    constructor(world, x, z, id, y = 0) {
        this.world = world;
        this.game = world.game;
        this.position = new THREE.Vector3(x, y, z);
        this.id = id || `tower_${Math.floor(x)}_${Math.floor(z)}`;
        this.isUnlocked = false;
        this.interactionRadius = 5;

        this.mesh = null;
        this.body = null;
        this.icon = null;
        this.interactBtn = null;

        this.init();
    }

    init() {
        // 1. Visuals
        const geometry = new THREE.CylinderGeometry(1, 1.5, 10, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            emissive: 0x550000,
            roughness: 0.5,
            metalness: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y += 5; // Center is 5m up (height 10)
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.world.scene.add(this.mesh);

        // 2. Physics
        const shape = new CANNON.Cylinder(1, 1.5, 10, 8);
        this.body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(this.position.x, this.position.y + 5, this.position.z),
            shape: shape
        });
        this.world.physicsWorld.addBody(this.body);

        // 3. Light
        this.light = new THREE.PointLight(0xff0000, 5, 20);
        this.light.position.set(0, 6, 0);
        this.mesh.add(this.light);

        // 4. Register
        if (this.game.ui && this.game.ui.mapManager) {
            this.game.ui.mapManager.addTowerIcon(this, this.id);
        }
        if (this.world.towers) {
            this.world.towers.push(this);
        }
        if (this.world.interactables) {
            this.world.interactables.push(this);
        }

        // 5. Register with WaypointManager (Fast Travel)
        if (this.game.waypointManager) {
            this.game.waypointManager.register(this.id, this.position, 'tower', this);
        }

        // 6. BEAM VISUAL (Faisceau Lumineux)
        // Tall, thin cylinder, transparent, additive blending
        const beamGeo = new THREE.CylinderGeometry(2.5, 2.5, 800, 16, 1, true); // OpenEnded
        beamGeo.translate(0, 400, 0); // Base at 0, goes up 800
        this.beamMat = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Default RED
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.beamMesh = new THREE.Mesh(beamGeo, this.beamMat);
        this.beamMesh.position.y = 10; // Start from top of tower
        this.mesh.add(this.beamMesh);
    }

    update(dt) {
        // Pulse Beam
        if (this.beamMat) {
            const t = Date.now() * 0.002;
            const base = this.isUnlocked ? 0.5 : 0.3;
            this.beamMat.opacity = base + Math.sin(t) * 0.1;
        }

        if (this.isUnlocked) return;

        if (!this.game.player || !this.game.player.mesh) return;

        const playerPos = this.game.player.mesh.position;
        const dist = this.position.distanceTo(playerPos);

        if (dist < this.interactionRadius) {
            this.showInteractButton();
        } else {
            this.hideInteractButton();
        }
    }

    showInteractButton() {
        if (this.interactBtn) {
            this.interactBtn.style.display = 'block';
            return;
        }
        this.interactBtn = document.createElement('button');
        this.interactBtn.id = 'interact-btn';
        this.interactBtn.innerText = "[E] ACTIVER";
        Object.assign(this.interactBtn.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid gold',
            borderRadius: '10px',
            cursor: 'pointer',
            zIndex: '10000',
            boxShadow: '0 0 20px gold'
        });
        this.interactBtn.onclick = () => this.triggerCinematic();
        document.body.appendChild(this.interactBtn);
    }

    hideInteractButton() {
        if (this.interactBtn) {
            this.interactBtn.style.display = 'none';
        }
    }

    interact() {
        this.triggerCinematic();
    }

    triggerCinematic() {
        if (this.isUnlocked) return;
        this.isUnlocked = true;

        // console.log("ACTIVATION TOUR");
        this.hideInteractButton();

        // Register unlock with WaypointManager
        if (this.game.waypointManager) {
            this.game.waypointManager.unlock(this.id);
        }

        // 1. HIDE UI
        if (this.game.ui) {
            // Hide specific UI elements or a main container
            // Assuming we can hide the main UI container or specific parts
            const uiContainer = document.getElementById('ui-container');
            if (uiContainer) uiContainer.style.display = 'none';
            // Also hide minimap temporarily? No, maybe show it being revealed?
            // Let's hide minimap for the cinematic view
            if (this.game.ui.mapManager) this.game.ui.mapManager.hide();
        }

        // 2. CAMERA FLY TO (Simple Tween)
        const startPos = this.game.camera.position.clone();
        const startRot = this.game.camera.quaternion.clone();

        // Target: High above tower, looking down
        const targetPos = this.position.clone().add(new THREE.Vector3(0, 30, 30));
        const dummyCam = new THREE.Object3D();
        dummyCam.position.copy(targetPos);
        dummyCam.lookAt(this.position);
        const targetRot = dummyCam.quaternion;

        this.game.player.inputLocked = true; // Lock Player

        // Notify Story
        if (this.game.story) {
            this.game.story.notify('INTERACT', this.id);
        }

        let progress = 0;
        const duration = 2.0; // 2 seconds fly

        const animate = () => {
            progress += this.game.clock.getDelta() / duration;
            if (progress > 1) progress = 1;

            // Interpolate Position
            this.game.camera.position.lerpVectors(startPos, targetPos, progress);
            this.game.camera.quaternion.slerpQuaternions(startRot, targetRot, progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.onCinematicArrived();
            }
        };
        animate();
    }

    onCinematicArrived() {
        // 3. OPEN MAP & ANIMATE REVEAL
        if (this.game.ui.mapManager) {
            // Open Big Map
            this.game.ui.mapManager.toggleMap(true);
            this.game.ui.mapManager.show(); // Ensure visible

            this.game.ui.mapManager.show(); // Ensure visible

            // Trigger Animation (1.5s duration)
            // Animate to ZONE radius (400) - Reduced for progression
            this.game.ui.mapManager.animateReveal(this.position.x, this.position.z, 400, 1.5, () => {
                this.game.ui.mapManager.unlockTower(this);
            });
        }

        // Visual Change
        this.mesh.material.color.setHex(0x33ccff);
        this.mesh.material.emissive.setHex(0x004466);
        this.light.color.setHex(0x33ccff);

        // BEAM TURNS BLUE
        if (this.beamMat) {
            this.beamMat.color.setHex(0x33ccff);
            this.beamMat.opacity = 0.5; // Make it a bit brighter when unlocked
        }

        // Show Text "ZONE DÉVOILÉE"
        const text = document.createElement('div');
        text.innerText = "ZONE DÉVOILÉE";
        Object.assign(text.style, {
            position: 'fixed',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '60px',
            fontWeight: 'bold',
            color: '#33ccff',
            textShadow: '0 0 20px #00aaff',
            zIndex: '20000',
            opacity: '0',
            transition: 'opacity 0.5s'
        });
        document.body.appendChild(text);

        // Fade In Text
        requestAnimationFrame(() => text.style.opacity = '1');

        // Sequence:
        // 0s: Map Opens, Reveal Starts
        // 1.5s: Reveal Done
        // 3.5s: Close Map, Hide Text, Restore UI

        setTimeout(() => {
            // Fade out text
            text.style.opacity = '0';

            // Close Map
            if (this.game.ui.mapManager) {
                this.game.ui.mapManager.toggleMap(false);
            }

            setTimeout(() => text.remove(), 500);
            this.finishCinematic();
        }, 3500);
    }

    finishCinematic() {
        // Restore UI
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) uiContainer.style.display = 'block';

        if (this.game.ui.mapManager) {
            this.game.ui.mapManager.show();
            // Optional: Open Big Map to show result?
            // this.game.ui.mapManager.toggleMap(true); 
        }

        this.game.player.inputLocked = false;
    }
}
