import * as THREE from 'three';
import { Guardian } from './Guardian.js';

export class StoryManager {
    constructor(game) {
        this.game = game;
        this.state = 'PROLOGUE';

        this.initUI();
        this.startPrologue();
    }

    initUI() {
        this.subtitleContainer = document.createElement('div');
        this.subtitleContainer.style.position = 'absolute';
        this.subtitleContainer.style.bottom = '20%';
        this.subtitleContainer.style.width = '100%';
        this.subtitleContainer.style.textAlign = 'center';
        this.subtitleContainer.style.color = 'white';
        this.subtitleContainer.style.fontSize = '24px';
        this.subtitleContainer.style.textShadow = '0 0 10px black';
        this.subtitleContainer.style.fontFamily = 'serif';
        this.subtitleContainer.style.pointerEvents = 'none';
        this.subtitleContainer.style.opacity = '0';
        this.subtitleContainer.style.transition = 'opacity 1s';
        document.body.appendChild(this.subtitleContainer);
    }

    showSubtitle(text, duration = 5000) {
        this.subtitleContainer.innerText = text;
        this.subtitleContainer.style.opacity = '1';

        setTimeout(() => {
            this.subtitleContainer.style.opacity = '0';
        }, duration);
    }

    startPrologue() {
        // Voice / Text
        setTimeout(() => {
            this.showSubtitle("L'équilibre est rompu. Trouve l'Autel.", 6000);
        }, 1000);

        // Objective Beam
        this.createObjectiveBeam(new THREE.Vector3(0, 0, -40));
    }

    createObjectiveBeam(position) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 100, 8, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.beam = new THREE.Mesh(geometry, material);
        this.beam.position.copy(position);
        this.beam.position.y = 50;
        this.game.world.scene.add(this.beam);

        // Add light
        const light = new THREE.PointLight(0xFFD700, 2, 50);
        light.position.copy(position);
        light.position.y = 5;
        this.game.world.scene.add(light);
    }

    spawnGuardian() {
        // Remove Golem if exists
        if (this.game.world.golem) {
            this.game.world.scene.remove(this.game.world.golem.mesh);
            this.game.world.physicsWorld.removeBody(this.game.world.golem.body);
        }

        this.guardian = new Guardian(this.game.world, new THREE.Vector3(0, 10, -40));
        this.game.world.enemies.push(this.guardian);

        this.showSubtitle("Le Gardien s'éveille...", 4000);

        // Boss Bar
        this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
    }

    update(dt) {
        // Si le joueur n'est pas prêt, on ne fait rien
        if (!this.game.player || !this.game.player.mesh || !this.game.player.mesh.position || !this.game.player.body) return;

        // Check triggers
        if (this.state === 'PROLOGUE') {
            const dist = this.game.player.body.position.distanceTo(new THREE.Vector3(0, 0, -40));
            if (dist < 30) {
                this.state = 'BOSS_FIGHT';
                this.spawnGuardian();
                this.game.world.scene.remove(this.beam); // Remove beam
            }
        }

        if (this.state === 'BOSS_FIGHT') {
            if (this.guardian && !this.guardian.isDead) {
                this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
            } else if (this.guardian && this.guardian.isDead) {
                this.state = 'VICTORY';
                this.showSubtitle("L'équilibre est rétabli.", 8000);
                this.game.ui.hideBossBar();
            }
        }
    }
}
