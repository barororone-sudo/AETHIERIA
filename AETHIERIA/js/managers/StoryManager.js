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

    hideTutorialInstruction() {
        if (this.tutorialOverlay) this.tutorialOverlay.style.opacity = '0';
    }

    // --- LEVELING UI ---

    initXpBar() {
        this.xpContainer = document.createElement('div');
        this.xpContainer.id = 'xp-container';
        this.xpContainer.style.position = 'absolute';
        this.xpContainer.style.bottom = '0';
        this.xpContainer.style.left = '0';
        this.xpContainer.style.width = '100%';
        this.xpContainer.style.height = '6px';
        this.xpContainer.style.background = 'rgba(0,0,0,0.5)';
        this.xpContainer.style.zIndex = '900'; // Below UI elements but above game

        this.xpBar = document.createElement('div');
        this.xpBar.style.width = '0%';
        this.xpBar.style.height = '100%';
        this.xpBar.style.background = 'linear-gradient(90deg, #9b59b6, #f1c40f)'; // Purple to Gold
        this.xpBar.style.transition = 'width 0.5s ease-out';
        this.xpBar.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.5)';

        this.xpContainer.appendChild(this.xpBar);
        document.body.appendChild(this.xpContainer);
    }

    updateXpBar(current, max, level) {
        if (!this.xpContainer) this.initXpBar();
        const pct = Math.min(100, (current / max) * 100);
        this.xpBar.style.width = `${pct}%`;
    }

    showLevelUpToast(level) {
        const toast = document.createElement('div');
        toast.innerHTML = `<h1 style="color: #ffd700; font-size: 60px; margin: 0; text-shadow: 0 0 30px #ffaa00;">NIVEAU ${level} !</h1><p style="color: white; font-size: 20px;">Stats augmentées</p>`;
        toast.style.position = 'absolute';
        toast.style.top = '30%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%) scale(0.5)';
        toast.style.opacity = '0';
        toast.style.textAlign = 'center';
        toast.style.zIndex = '10000';
        toast.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        document.body.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, -50%) scale(1.0)';
        });

        // Play Sound?
        // if (this.game.audio) this.game.audio.playSound('levelup');

        // Remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
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

            // Update Quest Tracker UI
            this.updateQuestTracker();

            // Reveal Starting Zone (Tower 1 Area)
            /* REMOVED: Automatic Reveal. Player must activate the Tower.
            if (this.game.ui && this.game.ui.mapManager) {
                // Delayed reveal to ensure Map Texture is generated
                setTimeout(() => {
                    this.game.ui.mapManager.revealZone(0, 0, 250);
                }, 1000);
            }
            */
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
                    this.spawnGuardian();
                }
            }
        }

        // Zone Checks
        this.checkZoneEntry(this.game.player.mesh.position);
    }

    checkZoneEntry(pos) {
        // Forest Zone: x: -100 to -300, z: 50 to 250
        if (pos.x < -100 && pos.x > -300 && pos.z > 50 && pos.z < 250) {
            if (!this.enteredForest && this.currentAct === 2) {
                this.enteredForest = true;
                this.game.displaySubtitle("L'air est lourd ici... La Forêt des Murmures.");
                this.notify('ENTER_ZONE', 'forest_whispers');
            }
        }
    }

    finishAct1Boss() {
        this.game.ui.hideBossBar();
        this.game.displaySubtitle("Menace neutralisée.");
    }

    spawnGuardian() {
        if (this.bossSpawned) return; // Prevention
        this.bossSpawned = true;

        // Aggressive Cleanup: Remove any existing Golem or Guardian to prevent duplicates
        if (this.game.world.enemies) {
            for (let i = this.game.world.enemies.length - 1; i >= 0; i--) {
                const enemy = this.game.world.enemies[i];
                // Check by name or position proximity
                if (enemy.name === 'Golem' || enemy.name === 'Guardian' || enemy.name === 'Gardien') {
                    if (enemy.mesh) this.game.world.scene.remove(enemy.mesh);
                    if (enemy.body) this.game.world.physicsWorld.removeBody(enemy.body);
                    this.game.world.enemies.splice(i, 1);
                    console.log(`Cleaned up residual enemy: ${enemy.name}`);
                }
            }
        }
        this.game.world.golem = null; // Clear direct ref

        this.guardian = new Guardian(this.game.world, new THREE.Vector3(0, 10, -40));
        this.game.world.enemies.push(this.guardian);
        this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
        this.game.displaySubtitle("ALERTE : Signature énergétique hostile détectée.");
    }

    createObjectiveBeam(position) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 200, 8, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.beam = new THREE.Mesh(geometry, material);
        this.beam.position.copy(position);
        this.beam.position.y = 100; // Half height
        this.game.world.scene.add(this.beam);
    }

    triggerMapReveal(x, z) {
        if (!this.game.ui) return;

        // 1. UI Animation (Flash + Unlock)
        if (this.game.ui.playMapUnlockAnimation) {
            this.game.ui.playMapUnlockAnimation();
        }

        // 2. Reveal Zone on Map
        if (this.game.ui.revealRegion) {
            this.game.ui.revealRegion(x, z, 1000);
        }

        // 3. Dialogue
        if (this.game.dialogueManager) {
            this.game.dialogueManager.startDialogue('lumina_act1_end');
        }
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

    /**
     * Update Quest Tracker UI with current quest objective
     */
    updateQuestTracker() {
        const tracker = document.getElementById('quest-tracker');
        if (!tracker) return;

        // Find active quest
        const activeQuest = this.activeQuests.find(q => q.state === 'IN_PROGRESS');

        if (!activeQuest) {
            // No active quest, hide tracker
            tracker.classList.remove('visible');
            return;
        }

        // Find current step
        const currentStep = activeQuest.steps.find(s => !s.isCompleted);

        if (!currentStep) {
            // All steps completed but quest not marked complete yet
            tracker.classList.remove('visible');
            return;
        }

        // Update UI
        const titleEl = tracker.querySelector('.quest-title');
        const objectiveEl = tracker.querySelector('.quest-objective');

        if (titleEl) titleEl.textContent = activeQuest.title.toUpperCase();
        if (objectiveEl) objectiveEl.textContent = currentStep.description;

        // Show tracker with animation
        tracker.classList.add('visible');
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
    /**
     * Unified Event System for Quests.
     * @param {string} eventType - e.g. 'OPEN_CHEST', 'EQUIP_WEAPON'
     * @param {Object} data - Context data, e.g. { tier: 1 } or { id: 'sword_starter' }
     */
    triggerEvent(eventType, data = {}) {
        console.log(`Story Event: ${eventType}`, data);

        this.activeQuests.forEach(quest => {
            if (quest.state !== 'IN_PROGRESS') return;

            // Sequential Logic: Only check current step
            const currentStep = quest.steps.find(s => !s.isCompleted);
            if (!currentStep) return;

            // Check Match
            if (currentStep.targetType === eventType) {
                let match = false;

                // 'any' wildcard or specific ID match
                if (currentStep.targetId === 'any') {
                    match = true;
                } else if (data.id && currentStep.targetId === data.id) {
                    match = true;
                } else if (data.tier && currentStep.targetId === `tier_${data.tier}`) {
                    // Example matching logic if needed
                    match = true;
                }

                if (match) {
                    this.completeStep(quest, currentStep);
                }
            }
        });
    }

    // Alias for legacy calls if any remain
    notify(eventType, targetId) {
        this.triggerEvent(eventType, { id: targetId });
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

        // Update Quest Tracker UI
        this.updateQuestTracker();
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

        // Rewards logic
        if (quest.rewards && quest.rewards.exp) {
            if (this.game.player.levelManager) {
                this.game.player.levelManager.addXp(quest.rewards.exp);
            }
        }

        // Act Transition Logic
        if (quest.id === 'quest_001') {
            setTimeout(() => this.startAct2(), 3000);
        }
    }

    startAct2() {
        console.log("STARTING ACT 2: LES OMBRES");
        this.currentAct = 2;
        this.game.ui.showTitle("ACTE II", this.context.ACTS.ACT_2);

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
    // --- SAVE / LOAD SYSTEM ---

    getData() {
        return {
            state: this.state,
            currentAct: this.currentAct,
            activeQuests: this.activeQuests,
            completedQuests: this.completedQuests,
            bossSpawned: this.bossSpawned || false,
            guardianHp: this.guardian ? this.guardian.hp : null,
            tutorialStep: this.tutorialStep // Save Tutorial Step
        };
    }

    loadData(data) {
        if (!data) return;

        this.state = data.state || 'IDLE';

        // If restoring persistent data
        if (data.currentAct) this.currentAct = data.currentAct;
        if (data.activeQuests) this.activeQuests = data.activeQuests;
        if (data.completedQuests) this.completedQuests = data.completedQuests;
        if (data.bossSpawned) this.bossSpawned = data.bossSpawned;
        if (data.tutorialStep) this.tutorialStep = data.tutorialStep;

        // Restore Tutorial UI
        if (this.state === 'TUTORIAL') {
            this.game.player.isInTutorial = true;
            this.game.ui.hideCinematicOverlay();

            if (this.tutorialStep === 1) this.game.ui.showTutorialInstruction("Utilisez Z, Q, S, D pour vous déplacer.");
            else if (this.tutorialStep === 2) this.game.ui.showTutorialInstruction("Bien. Appuyez sur ESPACE pour sauter.");
            else if (this.tutorialStep === 3) this.game.ui.showTutorialInstruction("Maintenant, attaquez avec CLIC GAUCHE.");
        }

        // Re-initialize Quest State
        if (this.state === 'PLAYING') {
            console.log("Restoring Quest State...");

            // Re-spawn Boss if needed
            if (this.bossSpawned && !this.guardian && this.activeQuests.find(q => q.id === 'quest_001' && q.state === 'IN_PROGRESS')) {
                // If boss was spawned but not dead (checked via quest step), respawn him
                const q1 = this.activeQuests.find(q => q.id === 'quest_001');
                if (!q1.steps[1].isCompleted) {
                    this.spawnGuardian();
                    // Restore HP
                    if (data.guardianHp && this.guardian) {
                        this.guardian.hp = data.guardianHp;
                        this.game.ui.updateBossBar(this.guardian.hp, this.guardian.maxHp, "Gardien Ancestral");
                    }
                }
            }

            // Restore Markers for Active Quests
            this.activeQuests.forEach(quest => {
                if (quest.state === 'IN_PROGRESS') {
                    const currentStep = quest.steps.find(s => !s.isCompleted);
                    if (currentStep) {
                        this.updateObjectiveMarker(currentStep);
                    }
                }
            });
        }
    }
}
