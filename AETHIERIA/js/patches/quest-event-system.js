// Patch pour ajouter la logique de quête spécifique dans StoryManager
// Ce script intercepte triggerEvent et ajoute la logique switch/case

console.log('[PATCH] Quest event system patch loaded');

// Attendre que le jeu soit initialisé
window.addEventListener('DOMContentLoaded', () => {
    const checkStoryManager = setInterval(() => {
        if (window.game && window.game.story) {
            clearInterval(checkStoryManager);

            // Sauvegarder la méthode originale
            const originalTriggerEvent = window.game.story.triggerEvent.bind(window.game.story);

            // Remplacer par une version avec logique de quête spécifique
            window.game.story.triggerEvent = function (eventType, data = {}) {
                console.log(`[PATCH] Story Event: ${eventType}`, data);

                // === QUEST-SPECIFIC LOGIC (Script Quête 1: "Le Réveil") ===
                const activeQuest = this.activeQuests.find(q => q.state === 'IN_PROGRESS');

                if (activeQuest && activeQuest.id === 'quest_001') {
                    const currentStep = activeQuest.steps.find(s => !s.isCompleted);

                    if (currentStep) {
                        switch (currentStep.id) {
                            case 'STEP_FIND_WEAPON':
                                if (eventType === 'OPEN_CHEST') {
                                    console.log('[PATCH] ✅ OPEN_CHEST detected for STEP_FIND_WEAPON');

                                    // Validation
                                    if (this.game.ui.playSound) this.game.ui.playSound('ui_ding');
                                    if (this.game.ui.showToast) this.game.ui.showToast("✅ Objectif atteint : Arme trouvée !");

                                    // Compléter l'étape
                                    this.completeStep(activeQuest, currentStep);

                                    // Passer à l'étape suivante
                                    const nextStep = activeQuest.steps.find(s => s.id === 'STEP_EQUIP_WEAPON');
                                    if (nextStep && this.game.ui.showToast) {
                                        this.game.ui.showToast("🎯 Nouvel objectif : Équipez l'arme");
                                    }

                                    // Sauvegarde automatique
                                    if (this.game.saveManager) {
                                        this.game.saveManager.save();
                                        console.log('[PATCH] 💾 Auto-save triggered');
                                    }
                                    return; // Sortir pour éviter le traitement générique
                                }
                                break;

                            case 'STEP_EQUIP_WEAPON':
                                if (eventType === 'EQUIP_WEAPON') {
                                    console.log('[PATCH] 🎉 EQUIP_WEAPON detected for STEP_EQUIP_WEAPON');

                                    // Validation
                                    if (this.game.ui.playSound) this.game.ui.playSound('quest_complete');
                                    if (this.game.ui.showToast) this.game.ui.showToast("🎉 QUÊTE TERMINÉE !");

                                    // Donner XP au joueur
                                    if (this.game.player && this.game.player.levelManager) {
                                        this.game.player.levelManager.addXp(100);
                                        console.log("[PATCH] 💫 +100 XP awarded!");
                                    }

                                    // Compléter l'étape
                                    this.completeStep(activeQuest, currentStep);

                                    // Sauvegarde automatique
                                    if (this.game.saveManager) {
                                        this.game.saveManager.save();
                                        console.log('[PATCH] 💾 Auto-save triggered');
                                    }
                                    return; // Sortir pour éviter le traitement générique
                                }
                                break;
                        }
                    }
                }

                // Appeler la méthode originale pour le traitement générique
                originalTriggerEvent(eventType, data);

                // Sauvegarde automatique après chaque progression de quête
                if (this.game.saveManager) {
                    this.game.saveManager.save();
                }
            };

            console.log('[PATCH] Quest event system successfully patched');
        }
    }, 100);
});
