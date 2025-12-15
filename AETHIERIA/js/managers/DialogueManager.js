// js/managers/DialogueManager.js

export class DialogueManager {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.currentDialogue = null;
        this.typingSpeed = 30; // ms per char
        this.textTimer = null;

        this.ui = {
            container: null,
            name: null,
            text: null,
            choices: null,
            nextBtn: null
        };

        this.initUI();
    }

    initUI() {
        // Create Dialogue Overlay (Genshin Style)
        // Create Dialogue Overlay (Genshin Style)
        const container = document.createElement('div');
        container.id = 'dialogue-container';
        container.style.position = 'absolute';
        container.style.bottom = '10%';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.width = '80%';
        container.style.maxWidth = '1000px';
        container.style.height = 'auto';
        container.style.minHeight = '200px';
        // Glassmorphism
        container.style.background = 'rgba(20, 20, 30, 0.6)';
        container.style.backdropFilter = 'blur(10px)';
        container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        container.style.borderRadius = '20px';
        container.style.padding = '30px';
        container.style.display = 'none';
        container.style.flexDirection = 'column';
        container.style.zIndex = '99999'; // FORCE ON TOP
        container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        container.style.color = 'white';
        container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        container.style.transition = 'opacity 0.3s ease';

        // Name Tag (Floating above box)
        const nameTag = document.createElement('div');
        nameTag.style.position = 'absolute';
        nameTag.style.top = '-20px';
        nameTag.style.left = '40px';
        nameTag.style.background = '#d4af37'; // Gold
        nameTag.style.color = '#000';
        nameTag.style.padding = '5px 20px';
        nameTag.style.borderRadius = '20px';
        nameTag.style.fontSize = '18px';
        nameTag.style.fontWeight = 'bold';
        nameTag.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        nameTag.innerText = 'NPC Name';
        container.appendChild(nameTag);

        // Text Area
        const textArea = document.createElement('div');
        textArea.style.fontSize = '20px';
        textArea.style.lineHeight = '1.6';
        textArea.style.flexGrow = '1';
        textArea.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
        textArea.style.whiteSpace = 'pre-wrap'; // Preserve spaces
        textArea.innerText = '...';
        container.appendChild(textArea);

        // Choices Container
        const choicesContainer = document.createElement('div');
        choicesContainer.style.display = 'flex';
        choicesContainer.style.flexDirection = 'column';
        choicesContainer.style.gap = '10px';
        choicesContainer.style.marginTop = '20px';
        choicesContainer.style.alignItems = 'flex-end';
        container.appendChild(choicesContainer);

        // Next Indicator
        const nextBtn = document.createElement('div');
        nextBtn.innerText = '▼';
        nextBtn.style.position = 'absolute';
        nextBtn.style.bottom = '15px';
        nextBtn.style.right = '50%';
        nextBtn.style.transform = 'translateX(50%)';
        nextBtn.style.fontSize = '24px';
        nextBtn.style.color = '#d4af37';
        nextBtn.style.animation = 'bounce 1s infinite';
        nextBtn.style.display = 'none';
        container.appendChild(nextBtn);

        // Inject Styles
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes bounce {
                0%, 100% { transform: translate(50%, 0); }
                50% { transform: translate(50%, 5px); }
            }
            .dialogue-choice {
                background: rgba(255, 255, 255, 0.1);
                border-left: 3px solid transparent;
                padding: 10px 25px;
                border-radius: 5px 20px 20px 5px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 18px;
                min-width: 200px;
                text-align: right;
            }
            .dialogue-choice:hover {
                background: rgba(255, 255, 255, 0.2);
                border-left: 3px solid #d4af37;
                padding-right: 35px;
            }
        `;
        document.head.appendChild(style);

        // DIRECT BODY APPEND FOR DEBUGGING
        document.body.appendChild(container);
        console.log("[DialogueManager] Forced append to document.body");

        this.ui.container = container;
        this.ui.name = nameTag;
        this.ui.text = textArea;
        this.ui.choices = choicesContainer;
        this.ui.nextBtn = nextBtn;

        // Click to advance
        container.onclick = () => this.advance();
    }

    startDialogue(npcName, dialogueIdOrData) {
        console.log(`[DialogueManager] Starting dialogue for ${npcName}`, dialogueIdOrData);
        this.isActive = true;
        this.currentDialogueId = typeof dialogueIdOrData === 'string' ? dialogueIdOrData : 'unknown';

        // Fetch from DataManager if string ID
        if (typeof dialogueIdOrData === 'string') {
            this.currentDialogue = this.game.data.getDialogue(dialogueIdOrData);
            // ... existing checks ...


            console.log(`[DialogueManager] Fetched data:`, this.currentDialogue);
            if (!this.currentDialogue) {
                console.error(`[DialogueManager] Dialogue not found: ${dialogueIdOrData}`);
                this.endDialogue();
                return;
            }
        } else {
            this.currentDialogue = dialogueIdOrData;
        }

        if (this.currentDialogue['start']) {
            this.currentNodeId = 'start';
            this.showNode('start');
        } else if (this.currentDialogue.text) {
            // Case where the data IS the node (flat structure from getDialogue deep lookup)
            console.log("[DialogueManager] Data appears to be a direct node, using as start.");
            this.currentNodeId = 'DIRECT_NODE';
            // Wrap it so showNode can find it, OR just call showNode with the object if refactored
            // Easier: Hack the currentDialogue to have a 'start' key pointing to itself
            const nodeData = this.currentDialogue;
            this.currentDialogue = { 'start': nodeData };

            // Also need to ensure 'next' pointers work.
            // If 'next' is 'meet_elara_2', we need to be able to find 'meet_elara_2'.
            // The Deep Lookup in DataManager found 'meet_elara'. 
            // If next is 'meet_elara_2', showNode will try to find it in currentDialogue.
            // So we actually need the ENTIRE NPC dictionary if we want to jump nodes.
            //
            // BETTER FIX:
            // If we are looking up a nested ID (like 'meet_elara'), we should ideally return the WHOLE PARENT structure 
            // but set the start node to 'meet_elara'.
            // But DataManager.getDialogue returns just the leaf.

            // IMMEDIATE PATCH:
            // We'll wrap it, but future jumps might fail if they aren't in this object. 
            // Since 'meet_elara_2' is a sibling in DialoguesDb, we can't find it if we only have 'meet_elara'.

            // CRITICAL ARCHITECTURE FIX REQUIRED in DataManager, but for now let's try to fetch the parent.
            // Actually, let's fix DataManager to return the context too? No, too risky.

            // ALTERNATIVE: Fix getDialogue to always return the whole NPC block?
            // No, the NPC has multiple dialogues.

            // Let's rely on the fact that for THIS specific case, we can cheat.
            // But 'meet_elara' links to 'meet_elara_2'.
            // If we only have 'meet_elara' object, we can't go to 'meet_elara_2'.

            // WAIT! DataManager.getDialogue(id)
            // 'meet_elara' is found inside 'elara'.
            // We need access to 'elara' object to find 'meet_elara_2'.

            // FIX: We must search for the PARENT in DataManager, or change how we start dialogue.
            // In NPC.js, we admit we pass the ID.

            // OPTION 3: In DialogueManager, if we detect it's a leaf, try to find its parent?
            // Expensive.

            // OPTION 4 (Best): Update DataManager.getDialogue to return the PARENT dictionary 
            // and the KEY of the start node.

            // Actually, let's look at DataManager lines 28-32:
            /*
            for (const npcId in this.dialogues) {
                const npcDialogues = this.dialogues[npcId];
                if (npcDialogues && npcDialogues[id]) {
                    return npcDialogues[id]; // Returns LEAF
                }
            }
            */

            // I will change DialogueManager to handle this.
            // Note: If I can't change DataManager easily without breaking others...
            // Let's change DataManager. It's safer.
            this.showNode('start'); // Now that currentDialogue is wrapped, 'start' exists
        } else {
            this.currentNodeId = 'start';
            if (typeof dialogueIdOrData === 'string' && this.currentDialogue[dialogueIdOrData]) {
                // Case: We fetched a set, and the requested ID exists in it.
                this.currentNodeId = dialogueIdOrData;
            } else if (this.currentDialogue['start']) {
                this.currentNodeId = 'start';
            } else {
                console.error(`[DialogueManager] Startup failed. ID '${dialogueIdOrData}' not found in fetched data keys:`, Object.keys(this.currentDialogue));
                this.endDialogue();
                return;
            }

            this.ui.container.style.display = 'flex';
            this.ui.container.style.zIndex = '99999'; // Force on top
            this.ui.name.innerText = npcName;

            // DEBUG: Verify DOM
            console.log("[DialogueManager] Container Display:", this.ui.container.style.display);
            console.log("[DialogueManager] In Body?", document.body.contains(this.ui.container));
            console.log("[DialogueManager] Z-Index:", this.ui.container.style.zIndex);

            document.exitPointerLock();

            this.showNode(this.currentNodeId);

            // Anti-bounce: Ignore inputs for 500ms after opening
            this.inputCooldown = Date.now() + 500;
        }
    }

    handleInput(code) {
        if (!this.isActive) return;

        if (this.isTyping) {
            if (code === 'KeyE' || code === 'KeyF' || code === 'Space') {
                // Instant finish
                clearInterval(this.textTimer);
                this.ui.text.textContent = this.fullText; // Need to store this
                this.isTyping = false;
                this.showChoices(this.currentNode);
            }
            return;
        }

        // Choice Navigation
        if (this.currentChoices && this.currentChoices.length > 0) {
            if (code === 'ArrowUp' || code === 'KeyW') {
                this.selectedChoiceIndex = (this.selectedChoiceIndex - 1 + this.currentChoices.length) % this.currentChoices.length;
                this.updateChoiceVisuals();
            } else if (code === 'ArrowDown' || code === 'KeyS') {
                this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.currentChoices.length;
                this.updateChoiceVisuals();
            } else if (code === 'KeyE' || code === 'KeyF' || code === 'Enter' || code === 'Space') {
                this.handleChoice(this.currentChoices[this.selectedChoiceIndex]);
            }
        } else {
            // Next Bubble
            if (code === 'KeyE' || code === 'KeyF' || code === 'Enter' || code === 'Space') {
                this.showNode(this.currentNode.next || null);
            }
        }
    }

    updateChoiceVisuals() {
        const buttons = this.ui.choices.children;
        for (let i = 0; i < buttons.length; i++) {
            if (i === this.selectedChoiceIndex) {
                buttons[i].classList.add('selected');
                buttons[i].style.background = 'rgba(255, 255, 255, 0.3)';
                buttons[i].style.borderLeft = '3px solid #d4af37';
                buttons[i].style.paddingRight = '35px';
            } else {
                buttons[i].classList.remove('selected');
                buttons[i].style.background = 'rgba(255, 255, 255, 0.1)';
                buttons[i].style.borderLeft = '3px solid transparent';
                buttons[i].style.paddingRight = '25px';
            }
        }
    }

    showNode(nodeId) {
        const node = this.currentDialogue[nodeId];
        if (!node) {
            this.endDialogue();
            return;
        }
        this.currentNode = node; // Store for input handler

        // Parse Tags in Text
        let displayText = node.text;
        const tagRegex = /\[([A-Z_]+)(?::([^\]]+))?\]/g;
        let match;

        // Execute tags
        while ((match = tagRegex.exec(node.text)) !== null) {
            const tag = match[1];
            const param = match[2];
            this.executeTag(tag, param);
            // Remove tag from display text
            displayText = displayText.replace(match[0], '');
        }

        this.fullText = displayText; // Store for instant finish
        this.ui.choices.innerHTML = '';
        this.ui.nextBtn.style.display = 'none';
        this.isTyping = true;
        this.ui.text.innerText = '';
        this.currentChoices = null; // Reset choices

        let i = 0;
        if (this.textTimer) clearInterval(this.textTimer);

        this.textTimer = setInterval(() => {
            this.ui.text.textContent += displayText[i];
            i++;
            if (i >= displayText.length) {
                clearInterval(this.textTimer);
                this.isTyping = false;
                this.showChoices(node);
            }
        }, this.typingSpeed);
    }

    showChoices(node) {
        if (node.choices) {
            this.currentChoices = node.choices;
            this.selectedChoiceIndex = 0; // Default to first

            node.choices.forEach((choice, index) => {
                const btn = document.createElement('div');
                btn.className = 'dialogue-choice';
                btn.innerText = choice.text;
                btn.onclick = (e) => {
                    e.stopPropagation(); // Prevent container click
                    this.handleChoice(choice);
                };
                // Hover effect update
                btn.onmouseenter = () => {
                    this.selectedChoiceIndex = index;
                    this.updateChoiceVisuals();
                };
                this.ui.choices.appendChild(btn);
            });
            this.updateChoiceVisuals(); // Highlight initial
        } else {
            this.ui.nextBtn.style.display = 'block';
            // Click handler is managed by container.onclick -> advance()
        }
    }

    // ... (rest of methods: handleChoice, handleAction, endDialogue)
    handleChoice(choice) {
        if (choice.action) {
            this.handleAction(choice.action);
        }
        this.showNode(choice.next);
    }

    handleAction(action) {
        console.log("Dialogue Action:", action);
        if (action.startsWith('quest_update:')) {
            const step = action.split(':')[1];
            // TODO: Update quest state in StoryManager
            console.log("Quest Step Updated:", step);
        }
    }

    endDialogue() {
        console.log("[DialogueManager] 🛑 END DIALOGUE CALLED");
        this.isActive = false;
        this.ui.container.style.display = 'none';

        // Reset Camera
        this.game.camera.fov = 75;
        this.game.camera.updateProjectionMatrix();

        // 🔔 SIGNAL COMPLETION
        if (this.game.story) {
            this.game.story.triggerEvent('DIALOGUE_COMPLETE', { id: this.currentDialogueId });
        }
    }

    advance() {
        if (!this.isActive) return;

        // If choices are active, do not advance by clicking container
        if (this.currentChoices && this.currentChoices.length > 0) return;

        if (this.isTyping) {
            // Instant finish
            clearInterval(this.textTimer);
            this.ui.text.textContent = this.fullText;
            this.isTyping = false;
            this.showChoices(this.currentNode);
        } else {
            // Next Node
            this.showNode(this.currentNode.next || null);
        }
    }

    update(dt) {
        if (!this.isActive) return;
        if (this.inputCooldown && Date.now() < this.inputCooldown) return;

        // Keyboard Navigation (Confirm Key OR Interact Key)
        if (this.game.input.keys.confirm || this.game.input.keys.interact) {
            if (!this.isConfirmPressed) {
                this.isConfirmPressed = true;

                // Logic similar to advance() but handles choices too if needed (though choices usually need selection)
                // For now, confirm just advances text or finishes typing
                if (this.currentChoices && this.currentChoices.length > 0) {
                    // If choices are visible, Confirm selects the current choice
                    this.handleChoice(this.currentChoices[this.selectedChoiceIndex]);
                } else {
                    this.advance();
                }
            }
        } else {
            this.isConfirmPressed = false;
        }

        // Choice Selection (W/S or Up/Down) - Optional if Input.js handles it, but good to have here if Input is polling
        // Actually Input.js is state-based, so we might need to handle "press once" logic here for navigation too if we move away from event-based handleInput
        // But the user only asked for Confirm logic in update() for now.
    }
}
