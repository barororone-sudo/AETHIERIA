// Patch to add save/load methods to QuestManager
console.log('[PATCH] Quest save/load system loading...');

window.addEventListener('DOMContentLoaded', () => {
    // Wait for game to be initialized
    const checkGame = setInterval(() => {
        if (window.game && window.game.questManager) {
            clearInterval(checkGame);

            const qm = window.game.questManager;

            // Add getData method
            if (!qm.getData) {
                qm.getData = function () {
                    return {
                        activeQuests: this.activeQuests.map(q => ({
                            id: q.id,
                            steps: q.steps.map(s => ({ isCompleted: s.isCompleted }))
                        })),
                        completedQuests: this.completedQuests
                    };
                };
                console.log('[PATCH] QuestManager.getData() added');
            }

            // Add loadData method
            if (!qm.loadData) {
                qm.loadData = function (data) {
                    if (!data) return;

                    console.log('[QuestManager] Loading quest data...');

                    // Import getQuestById
                    import('../data/QuestsDb.js').then(module => {
                        const { getQuestById } = module;

                        // Restore completed quests
                        if (data.completedQuests) {
                            this.completedQuests = data.completedQuests;
                        }

                        // Restore active quests
                        if (data.activeQuests && data.activeQuests.length > 0) {
                            data.activeQuests.forEach(savedQuest => {
                                const questData = getQuestById(savedQuest.id);
                                if (questData) {
                                    // Restore step completion status
                                    savedQuest.steps.forEach((savedStep, index) => {
                                        if (questData.steps[index]) {
                                            questData.steps[index].isCompleted = savedStep.isCompleted;
                                        }
                                    });
                                    this.activeQuests.push(questData);
                                }
                            });

                            // Update UI for first active quest
                            if (this.activeQuests.length > 0) {
                                this.updateObjective();
                            }

                            console.log(`[QuestManager] Restored ${this.activeQuests.length} active quests`);
                        }
                    });
                };
                console.log('[PATCH] QuestManager.loadData() added');
            }

            console.log('[PATCH] ✅ Quest save/load system loaded');
        }
    }, 100);
});
