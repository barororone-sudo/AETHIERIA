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
        container.style.zIndex = '1000';
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

        document.body.appendChild(container);

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

        // Fetch from DataManager if string ID
        if (typeof dialogueIdOrData === 'string') {
            this.currentDialogue = this.game.data.getDialogue(dialogueIdOrData);
            console.log(`[DialogueManager] Fetched data:`, this.currentDialogue);
            if (!this.currentDialogue) {
                console.error(`[DialogueManager] Dialogue not found: ${dialogueIdOrData}`);
                this.endDialogue();
                return;
            }
        } else {
            this.currentDialogue = dialogueIdOrData;
        }

        this.currentNodeId = 'start';

        this.ui.container.style.display = 'flex';
        this.ui.container.style.zIndex = '2000'; // Force on top
        this.ui.name.innerText = npcName;

        document.exitPointerLock();

        this.showNode(this.currentNodeId);
    }

    handleInput(code) {
        if (!this.isActive) return;

        if (this.isTyping) {
            if (code === 'KeyF' || code === 'Space') {
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
            } else if (code === 'KeyF' || code === 'Enter' || code === 'Space') {
                this.handleChoice(this.currentChoices[this.selectedChoiceIndex]);
            }
        } else {
            // Next Bubble
            if (code === 'KeyF' || code === 'Enter' || code === 'Space') {
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
        this.isActive = false;
        this.ui.container.style.display = 'none';
        // Reset Camera
        this.game.camera.fov = 75;
        this.game.camera.updateProjectionMatrix();
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
}
