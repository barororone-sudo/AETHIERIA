import { QuestsDb, getQuestById } from '../data/QuestsDb.js';

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.activeQuests = [];
        this.completedQuests = [];
    }

    /**
     * Activate a quest
     */
    activateQuest(questId) {
        const questData = getQuestById(questId);
        if (!questData) {
            console.warn(`[QuestManager] Quest ${questId} not found`);
            return false;
        }

        // Check prereq
        if (questData.prereq && !this.completedQuests.includes(questData.prereq)) {
            console.warn(`[QuestManager] Prereq ${questData.prereq} not completed`);
            return false;
        }

        // Check if already active
        if (this.activeQuests.find(q => q.id === questId)) {
            console.warn(`[QuestManager] Quest ${questId} already active`);
            return false;
        }

        // Clone quest data
        const quest = JSON.parse(JSON.stringify(questData));
        quest.state = 'ACTIVE';
        quest.startTime = Date.now();
        this.activeQuests.push(quest);

        console.log(`[QuestManager] ✅ Activated: ${quest.title}`);

        // Update UI
        if (this.game.ui) {
            this.game.ui.showQuestUpdate(quest.title, 'STARTED');
            this.updateObjective();
        }

        return true;
    }

    /**
     * Update HUD objective display
     */
    updateObjective() {
        const activeQuest = this.getActiveQuest();
        if (!activeQuest || !this.game.ui) return;

        const currentStep = activeQuest.steps.find(s => !s.isCompleted);
        if (currentStep) {
            this.game.ui.updateObjective(currentStep.description);

            // Create visual marker if step has a position
            if (currentStep.targetPos) {
                this.createObjectiveMarker(currentStep.targetPos);
            }
        }
    }

    /**
     * Create visual objective marker (beam of light)
     */
    createObjectiveMarker(position) {
        // Remove old marker
        this.removeObjectiveMarker();

        // Wait a bit for world to be ready
        setTimeout(() => {
            if (!this.game.world || !this.game.world.scene) {
                console.warn('[QuestManager] World not ready for marker');
                return;
            }

            const THREE = window.THREE;
            if (!THREE) {
                console.warn('[QuestManager] THREE not available');
                return;
            }

            // Create beam of light
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 200, 8, 1, true);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            this.objectiveBeam = new THREE.Mesh(geometry, material);
            this.objectiveBeam.position.set(position.x, 100, position.z);
            this.game.world.scene.add(this.objectiveBeam);

            // Animate the beam
            this.animateBeam();

            console.log(`[QuestManager] ✨ Objective marker created at (${position.x}, ${position.z})`);
        }, 500);
    }

    /**
     * Animate objective beam
     */
    animateBeam() {
        if (!this.objectiveBeam) return;

        const animate = () => {
            if (!this.objectiveBeam) return;

            this.objectiveBeam.rotation.y += 0.01;
            const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
            this.objectiveBeam.scale.set(scale, 1, scale);

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Remove objective marker
     */
    removeObjectiveMarker() {
        if (this.objectiveBeam && this.game.world && this.game.world.scene) {
            this.game.world.scene.remove(this.objectiveBeam);
            if (this.objectiveBeam.geometry) this.objectiveBeam.geometry.dispose();
            if (this.objectiveBeam.material) this.objectiveBeam.material.dispose();
            this.objectiveBeam = null;
        }
    }

    /**
     * Check quest progress based on game events
     */
    checkQuestProgress(eventType, data = {}) {
        const activeQuest = this.getActiveQuest();
        if (!activeQuest) return;

        const currentStep = activeQuest.steps.find(s => !s.isCompleted);
        if (!currentStep) return;

        let match = false;

        // Check if event matches step type
        switch (currentStep.type) {
            case 'COLLECT_ITEM':
                if (eventType === 'COLLECT_ITEM' && currentStep.targetId === data.itemId) {
                    match = true;
                }
                break;

            case 'KILL_ENEMY':
            case 'KILL_BOSS':
                if (eventType === 'KILL_ENEMY' && currentStep.targetId === data.enemyId) {
                    match = true;
                }
                break;

            case 'TALK_NPC':
                if (eventType === 'TALK_NPC' && currentStep.targetId === data.npcId) {
                    match = true;
                }
                break;

            case 'ENTER_ZONE':
                if (eventType === 'ENTER_ZONE' && currentStep.targetId === data.zoneId) {
                    match = true;
                }
                break;
        }

        if (match) {
            if (currentStep.targetCount) {
                // Count-based objective
                currentStep.currentCount = (currentStep.currentCount || 0) + 1;
                console.log(`[QuestManager] Progress: ${currentStep.currentCount}/${currentStep.targetCount}`);

                if (currentStep.currentCount >= currentStep.targetCount) {
                    this.completeStep(activeQuest, currentStep);
                } else {
                    // Update UI with progress
                    this.updateObjective();
                }
            } else {
                // Single objective
                this.completeStep(activeQuest, currentStep);
            }
        }
    }

    /**
     * Complete a quest step
     */
    completeStep(quest, step) {
        step.isCompleted = true;
        console.log(`[QuestManager] ✅ Step completed: ${step.description}`);

        // Sound removed - audio.play() not available

        // Check if all steps completed
        const allComplete = quest.steps.every(s => s.isCompleted);
        if (allComplete) {
            this.removeObjectiveMarker();
            this.completeQuest(quest.id);
        } else {
            // Move to next step
            this.updateObjective();
            if (this.game.ui) {
                this.game.ui.showQuestUpdate(quest.title, 'UPDATED');
            }
        }
    }

    /**
     * Complete a quest
     */
    completeQuest(questId) {
        const questIndex = this.activeQuests.findIndex(q => q.id === questId);
        if (questIndex === -1) return;

        const quest = this.activeQuests[questIndex];
        quest.state = 'COMPLETED';
        quest.endTime = Date.now();

        this.completedQuests.push(questId);
        this.activeQuests.splice(questIndex, 1);

        console.log(`[QuestManager] 🎉 Quest completed: ${quest.title}`);

        // Give rewards
        this.giveRewards(quest.rewards);

        // Show completion UI
        if (this.game.ui) {
            this.game.ui.showQuestUpdate(quest.title, 'COMPLETED');
            this.updateObjective(); // Update to next quest or clear
        }

        // Sound removed - audio.play() not available

        // Auto-activate next quest
        if (quest.onComplete && quest.onComplete.unlocks) {
            const nextQuestIds = Array.isArray(quest.onComplete.unlocks)
                ? quest.onComplete.unlocks
                : [quest.onComplete.unlocks];

            setTimeout(() => {
                nextQuestIds.forEach(id => this.activateQuest(id));
            }, 1000);
        }
    }

    /**
     * Give quest rewards to player
     */
    giveRewards(rewards) {
        if (!rewards) return;

        const player = this.game.player;
        if (!player) return;

        // Experience
        if (rewards.exp && player.gainExp) {
            player.gainExp(rewards.exp);
            console.log(`[QuestManager] +${rewards.exp} XP`);
        }

        // Gold
        if (rewards.gold) {
            player.gold = (player.gold || 0) + rewards.gold;
            console.log(`[QuestManager] +${rewards.gold} Gold`);
        }

        // Items
        if (rewards.items && player.inventory) {
            rewards.items.forEach(itemId => {
                player.inventory.addItem(itemId, 1);
                console.log(`[QuestManager] +Item: ${itemId}`);
            });
        }
    }

    /**
     * Get current active quest
     */
    getActiveQuest() {
        return this.activeQuests[0] || null;
    }

    /**
     * Get all active quests
     */
    getActiveQuests() {
        return this.activeQuests;
    }

    /**
     * Check if quest is completed
     */
    isQuestCompleted(questId) {
        return this.completedQuests.includes(questId);
    }

    /**
     * Save data
     */
    getData() {
        return {
            activeQuests: this.activeQuests,
            completedQuests: this.completedQuests
        };
    }

    /**
     * Load data
     */
    loadData(data) {
        if (!data) return;
        this.activeQuests = data.activeQuests || [];
        this.completedQuests = data.completedQuests || [];

        // Update UI after load
        if (this.activeQuests.length > 0) {
            this.updateObjective();
        }
    }
}
