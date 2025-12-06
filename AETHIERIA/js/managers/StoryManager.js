import * as THREE from 'three';
import { Guardian } from '../Guardian.js';
import { EnemiesDb, getEnemyById } from '../data/EnemiesDb.js';
import { ItemsDb, getItemById } from '../data/ItemsDb.js';
import { QuestsDb, getQuestById } from '../data/QuestsDb.js';

const CONTEXT = {
    YEAR: 3042,
    EVENT: "La Chute",
    PLAYER_UNIT: "ECHO-7",
    MISSION: "Purger le Virus Malacor",
    ACTS: {
        ACT_1: "L'Éveil (Plaines)",
        ACT_2: "Les Ombres (Forêt)",
        ACT_3: "La Fournaise (Désert)",
        ACT_4: "Le Noyau (Montagne)"
    }
};

export class StoryManager {
    constructor(game) {
        this.game = game;
        this.context = CONTEXT;
        this.currentAct = 1;
        this.activeQuests = [];
        this.completedQuests = [];

        this.state = 'IDLE'; // IDLE, CINEMATIC, TUTORIAL, PLAYING
        this.tutorialStep = 0;
        this.tutorialTimer = 0;

        // Initialize UI integration
        // (UI methods are called on game.ui directly now)
    }

    startNewGameSequence() {
        console.log("Starting New Game Sequence...");
        this.state = 'CINEMATIC';
        this.game.player.isInTutorial = true;
        this.game.player.inputLocked = true; // Lock completely during cinematic

        // Phase 1: Cinematic
        // Sequence of texts
        this.playCinematicSequence([
            { text: "Système redémarré...", duration: 3000 },
            { text: `Année ${this.context.YEAR}. ${this.context.EVENT} a tout effacé.`, duration: 4000 },
            { text: `Unité : ${this.context.PLAYER_UNIT}. Statut : Opérationnel.`, duration: 3000 },
            { text: `Mission : ${this.context.MISSION}.`, duration: 3000 },
            { text: "Initialisation du protocole d'éveil...", duration: 3000 }
        ], () => {
            this.startTutorial();
        });
    }

    playCinematicSequence(sequence, onComplete) {
        let index = 0;
        const playNext = () => {
            if (index >= sequence.length) {
                if (onComplete) onComplete();
                return;
            }
            const item = sequence[index];
            this.game.ui.showCinematicText(item.text, item.duration);
            index++;
            setTimeout(playNext, item.duration + 1000); // +1s for fade/black gap
        };
        playNext();
    }

    startTutorial() {
        console.log("Starting Tutorial...");
        console.log("TUTORIAL STARTED - OVERLAY HIDDEN");

        // --- RADICAL FIX: TELEPORT PLAYER ---
        if (this.game.player && this.game.player.body) {
            // Teleport player in air to avoid under-map issues
            this.game.player.body.position.set(0, 20, 0);
            this.game.player.body.velocity.set(0, 0, 0);
            this.game.player.mesh.position.copy(this.game.player.body.position);
            console.log("PLAYER FORCE TELEPORT TO (0, 20, 0)");
        }

        this.game.ui.hideCinematicOverlay();
        // FAILSAFE: Force hide immediately in case transition gets stuck
        if (this.game.ui.cinematicOverlay) {
            this.game.ui.cinematicOverlay.style.display = 'none';
        }

        this.state = 'TUTORIAL';
        this.tutorialStep = 1;
        this.game.player.inputLocked = false; // Allow inputs
        this.game.player.isInTutorial = true; // But restict UI

        // Initial instruction
        this.showTutorialMessage("Utilisez Z, Q, S, D pour vous déplacer.");
    }

    update(dt) {
        // --- TUTORIAL LOGIC ---
        if (this.state === 'TUTORIAL') {
            this.updateTutorial(dt);
        }

        // --- ACT 1 LOGIC (Legacy + Integrated) ---
        if (this.state === 'PLAYING') {
            this.updateActLogic(dt);
        }

        // Animate Beam
        if (this.beam) {
            this.beam.rotation.y += dt;
            const s = 1 + Math.sin(this.game.clock.getElapsedTime() * 2) * 0.1;
            this.beam.scale.set(s, 1, s);
        }
    }

    updateTutorial(dt) {
        const input = this.game.input;

        switch (this.tutorialStep) {
            case 1: // Move
                if (input.keys.forward || input.keys.backward || input.keys.left || input.keys.right) {
                    this.tutorialTimer += dt;
                    if (this.tutorialTimer > 2.0) { // Move for 2 seconds
                        this.tutorialStep = 2;
                        this.tutorialTimer = 0;
                        this.showTutorialMessage("Bien. Appuyez sur ESPACE pour sauter.");
                    }
                }
                break;
            case 2: // Jump
                if (input.keys.jump) {
                    this.tutorialStep = 3;
                    this.showTutorialMessage("Maintenant, attaquez avec CLIC GAUCHE.");
                }
                break;
            case 3: // Attack
                if (this.game.player.combat && this.game.player.combat.isAttacking) {
                    this.tutorialStep = 4;
                    // End Tutorial
                    setTimeout(() => this.endTutorial(), 1000);
                }
                break;
        }
    }

    showTutorialMessage(text) {
        this.game.ui.showTutorialInstruction(text);
    }

    endTutorial() {
        console.log("Tutorial Completed.");
        this.state = 'PLAYING';
        this.game.player.isInTutorial = false;
        this.game.ui.hideTutorialInstruction();
        this.game.ui.showToast("Systèmes calibrés. Début de l'Acte 1.");

        // Start Narrative
        this.startAct1();
    }

    // --- NARRATIVE LOGIC (Ported from Story.js) ---

    startAct1() {
        this.game.ui.showTitle(this.context.ACTS.ACT_1); // Optional Visual

        // Initialize Quest 1
        const quest = getQuestById('quest_001');
        if (quest) {
            this.activeQuests.push(JSON.parse(JSON.stringify(quest)));
            this.activeQuests[0].state = 'IN_PROGRESS';

            // Set First Objective Marker
            this.updateObjectiveMarker(this.activeQuests[0].steps[0]);

            // Reveal Starting Zone (Tower 1 Area)
            // Reveal Starting Zone (Tower 1 Area)
            if (this.game.ui && this.game.ui.mapManager) {
                // Delayed reveal to ensure Map Texture is generated
                setTimeout(() => {
                    this.game.ui.mapManager.revealZone(0, 0, 250);
                }, 1000);
            }
        }
    }

    // ... (Skipping updateActLogic changes as it handles logic not markers)

    completeStep(quest, step) {
        if (step.isCompleted) return; // double safety
        step.isCompleted = true;

        console.log(`Quest Step Completed: ${quest.id} -> ${step.id}`);
        this.game.ui.showToast(`Objectif mis à jour : ${quest.title}`);
        this.game.ui.playSound('ui_ding');

        // Side Effects
        if (step.onComplete) {
            try {
                step.onComplete(this.game);
            } catch (err) {
                console.warn("Callback Error:", err);
            }
        }

        // Check Full Quest
        this.checkQuestCompletion(quest); // This handles completeQuest

        // If Quest NOT complete, Find Next Step and Update Marker
        if (quest.state === 'IN_PROGRESS') {
            const nextStep = quest.steps.find(s => !s.isCompleted);
            if (nextStep) {
                this.updateObjectiveMarker(nextStep);
            } else {
                this.removeObjectiveBeam();
            }
        }
    }

    // ...

    startAct2() {
        console.log("STARTING ACT 2: LES OMBRES");
        this.currentAct = 2;
        this.game.ui.showTitle(this.context.ACTS.ACT_2);

        // Add Quest 2
        const q2 = getQuestById('quest_002');
        if (q2) {
            const newQuest = JSON.parse(JSON.stringify(q2));
            newQuest.state = 'IN_PROGRESS';
            this.activeQuests.push(newQuest);
            this.game.ui.showToast(`Nouvelle Quête : ${newQuest.title}`);

            // Set Marker
            this.updateObjectiveMarker(newQuest.steps[0]);
        }
    }

    updateActLogic(dt) {
        if (!this.game.player?.mesh?.position) return;

        const q1 = this.activeQuests.find(q => q.id === 'quest_001');
        if (q1 && q1.state === 'IN_PROGRESS') {
            // Quest Logic (Simplified for brevity)
            if (!q1.steps[1].isCompleted) {
                const triggerZone = new THREE.Vector3(0, 0, -40);
                const dist = this.game.player.body.position.distanceTo(triggerZone);

                if (dist < 30 && !this.bossSpawned) {
                    this.bossSpawned = true; // Simple flag instead of separate state var
                    this.spawnGuardian();
                    if (this.beam) {
                        this.game.world.scene.remove(this.beam);
                        this.beam.geometry.dispose();
                    }
                }

                if (this.bossSpawned && this.guardian) {
                    if (this.guardian.isDead) {
                        this.finishAct1Boss();
                        q1.steps[1].isCompleted = true;
                    } else {
                        // Update Boss Bar
                        this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
                    }
                }
            }
        }
    }

    finishAct1Boss() {
        this.game.ui.hideBossBar();
        this.game.displaySubtitle("Menace neutralisée.");
    }

    spawnGuardian() {
        if (this.game.world.golem) {
            this.game.world.scene.remove(this.game.world.golem.mesh);
            this.game.world.physicsWorld.removeBody(this.game.world.golem.body);
        }
        this.guardian = new Guardian(this.game.world, new THREE.Vector3(0, 10, -40));
        this.game.world.enemies.push(this.guardian);
        this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
        this.game.displaySubtitle("ALERTE : Signature énergétique hostile détectée.");
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
    }

    removeObjectiveBeam() {
        if (this.beam) {
            this.game.world.scene.remove(this.beam);
            this.beam.geometry.dispose();
            this.beam.material.dispose();
            this.beam = null;
        }
        // Also remove map marker
        if (this.game.ui && this.game.ui.mapManager) {
            this.game.ui.mapManager.removeQuestMarker();
        }
    }

    updateObjectiveMarker(step) {
        this.removeObjectiveBeam(); // Clear previous

        if (step && step.targetPos) {
            const pos = new THREE.Vector3(step.targetPos.x, step.targetPos.y, step.targetPos.z);

            // 1. Create 3D Beam
            this.createObjectiveBeam(pos);

            // 2. Update Map Marker
            if (this.game.ui && this.game.ui.mapManager) {
                // Check if setQuestMarker exists (it should now)
                if (typeof this.game.ui.mapManager.setQuestMarker === 'function') {
                    this.game.ui.mapManager.setQuestMarker(pos.x, pos.z);
                }
            }
        }
    }

    // --- EVENT-DRIVEN QUEST SYSTEM ---

    /**
     * Notify the StoryManager of an event (e.g., ITEM_PICKUP, ENEMY_KILL, TALK).
     * @param {string} eventType - The type of event (e.g., 'ITEM_PICKUP')
     * @param {string} targetId - The ID of the target (e.g., 'sword_01')
     */
    /**
     * Notify the StoryManager of an event.
     */
    notify(eventType, targetId) {
        console.log(`Story Event: ${eventType} -> ${targetId}`);

        this.activeQuests.forEach(quest => {
            if (quest.state !== 'IN_PROGRESS') return;

            // Check Step
            quest.steps.forEach(step => {
                // If not done, match event logic
                if (!step.isCompleted) {
                    if (step.targetType === eventType && step.targetId === targetId) {
                        this.completeStep(quest, step);
                    }
                }
            });
        });
    }

    completeStep(quest, step) {
        if (step.isCompleted) return; // double safety
        step.isCompleted = true;

        console.log(`Quest Step Completed: ${quest.id} -> ${step.id}`);
        this.game.ui.showToast(`Objectif mis à jour : ${quest.title}`);
        this.game.ui.playSound('ui_ding');

        // Side Effects
        if (step.onComplete) {
            try {
                step.onComplete(this.game);
            } catch (err) {
                console.warn("Callback Error:", err);
            }
        }

        // Check Full Quest
        this.checkQuestCompletion(quest);

        // If Quest still in progress, update marker to next step
        if (quest.state === 'IN_PROGRESS') {
            const nextStep = quest.steps.find(s => !s.isCompleted);
            if (nextStep) {
                this.updateObjectiveMarker(nextStep);
            } else {
                this.removeObjectiveBeam();
            }
        } else {
            this.removeObjectiveBeam();
        }
    }

    checkQuestCompletion(quest) {
        const allCompleted = quest.steps.every(s => s.isCompleted);
        if (allCompleted) {
            this.completeQuest(quest);
        }
    }

    completeQuest(quest) {
        quest.state = 'COMPLETED';
        console.log(`Quest Completed: ${quest.title}`);

        // Big Toast / Sound
        this.game.ui.showToast(`QUÊTE TERMINÉE : ${quest.title}`);
        this.game.ui.playSound('quest_complete');

        this.completedQuests.push(quest);

        // Remove from active
        const idx = this.activeQuests.indexOf(quest);
        if (idx > -1) this.activeQuests.splice(idx, 1);

        // Rewards logic here... but skipping for brevity

        // Act Transition Logic
        if (quest.id === 'quest_001') {
            setTimeout(() => this.startAct2(), 3000);
        }
    }

    startAct2() {
        console.log("STARTING ACT 2: LES OMBRES");
        this.currentAct = 2;
        this.game.ui.showTitle(this.context.ACTS.ACT_2);

        // Add Quest 2
        const q2 = getQuestById('quest_002');
        if (q2) {
            const newQuest = JSON.parse(JSON.stringify(q2));
            newQuest.state = 'IN_PROGRESS';
            this.activeQuests.push(newQuest);
            this.game.ui.showToast(`Nouvelle Quête : ${newQuest.title}`);

            // Set Marker
            this.updateObjectiveMarker(newQuest.steps[0]);
        }
    }
}
