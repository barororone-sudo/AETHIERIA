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
            confirm: false,
            p: false
        };

        this.init();

        // Tap Counting
        this.lastJumpTime = 0;
        this.jumpTapCount = 0;
    }

    init() {
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onKey(e, isDown) {
        if (e.repeat) return; // Ignore key repeats
        // console.log(`Key: ${e.code}, Down: ${isDown}`);

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
            case 'KeyF':
                this.keys.interact = isDown;
                break;
            case 'KeyP':
                this.keys.p = isDown;
                break;
            case 'Enter':
            case 'Space':
                this.keys.confirm = isDown;
                if (e.code === 'Space') this.keys.jump = isDown; // Keep Jump on Space too
                break;
        }
    }
}
