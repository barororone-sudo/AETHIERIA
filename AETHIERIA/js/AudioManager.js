// js/AudioManager.js
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.initialized = false;
        this.sfx = null;

        this.init();
    }

    init() {
        // Sound Bank
        // Using Phaser 3 Examples 'fx_mixdown' audio sprite for reliability.
        const spriteUrl = 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/audio/SoundEffects/fx_mixdown.ogg';
        const musicUrl = 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/audio/oedipus_wizball_highscore.ogg';

        // Sprite Definition (from fx_mixdown.json)
        this.sfx = new Howl({
            src: [spriteUrl],
            sprite: {
                step: [19000, 300],   // 'squit' (19s - 19.3s) - Using as step (squishy/dirt)
                sword: [17000, 1000], // 'shot' (17s - 18s) - Using as sword swing (whoosh-like)
                hit: [3000, 500]      // 'boss hit' (3s - 3.5s) - Using as impact
            },
            volume: 0.5,
            preload: true,
            onloaderror: (id, err) => {
                console.warn(`AudioManager: Failed to load SFX sprite (${spriteUrl}):`, err);
            }
        });

        // Music (Loop)
        this.music = new Howl({
            src: [musicUrl],
            html5: true, // Stream
            loop: true,
            volume: 0.3,
            onloaderror: (id, err) => {
                console.warn(`AudioManager: Failed to load music (${musicUrl}):`, err);
            }
        });

        this.initialized = true;
        console.log("AudioManager Initialized (Howler.js Sprites)");
    }

    playSFX(id) {
        if (!this.initialized || !this.sfx) return;

        // Variation
        const rate = 0.9 + Math.random() * 0.2; // 0.9 - 1.1
        // Howler sprite play returns an ID, we can chain rate to it if needed, 
        // but rate() on the global howl object affects all sounds if not scoped.
        // For sprites, we usually just play. To pitch shift a specific instance, it's trickier with sprites in Howler 2.
        // But we can try setting rate on the instance.
        const soundId = this.sfx.play(id);
        this.sfx.rate(rate, soundId);
    }

    startMusic() {
        if (this.music && !this.music.playing()) {
            this.music.play();
        }
    }

    stopMusic() {
        if (this.music) {
            this.music.stop();
        }
    }
}
