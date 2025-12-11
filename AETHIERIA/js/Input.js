// js/Input.js

export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            crouch: false, // Ctrl
            sprint: false,  // Shift
            interact: false,
            skill: false,    // E - Special Skill
            confirm: false,
            p: false,
            map: false,
            lock: false
        };

        this.init();

        // Tap Counting
        this.lastJumpTime = 0;
        this.jumpTapCount = 0;
        this.onToggleMap = null; // Callback for Map Toggle
    }

    init() {
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));

        // Fullscreen toggle (F11 or F)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey && !e.altKey)) {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });

        // Mouse Wheel (Weapon Switch)
        window.addEventListener('wheel', (e) => {
            if (this.onScroll) {
                // Normalize delta: positive (down) = +1, negative (up) = -1
                this.onScroll(Math.sign(e.deltaY));
            }
        }, { passive: true });
    }

    onKey(e, isDown) {
        if (e.repeat) return; // Ignore key repeats

        switch (e.code) {
            case 'KeyW':
            case 'KeyZ':
                this.keys.forward = isDown;
                break;
            case 'KeyS':
                this.keys.backward = isDown;
                break;
            case 'KeyA':
            case 'KeyQ':
                this.keys.left = isDown;
                break;
            case 'KeyD':
                this.keys.right = isDown;
                break;
            case 'Space':
                this.keys.jump = isDown;
                if (isDown) {
                    const now = Date.now();
                    if (now - this.lastJumpTime < 300) {
                        this.jumpTapCount++;
                    } else {
                        this.jumpTapCount = 1;
                    }
                    this.lastJumpTime = now;
                }
                break;
            case 'ControlLeft':
            case 'ControlRight':
                this.keys.crouch = isDown;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = isDown;
                break;
            case 'KeyE':
                this.keys.interact = isDown;
                break;
            case 'KeyU':
                this.keys.skill = isDown;
                break;
            case 'KeyP':
                this.keys.p = isDown;
                break;
            case 'Enter':
                this.keys.confirm = isDown;
                break;
            case 'Tab':
                e.preventDefault();
                this.keys.lock = isDown;
                break;
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen request failed:', err);
            });
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    /**
     * Check if currently in fullscreen
     */
    isFullscreen() {
        return !!document.fullscreenElement;
    }
}
