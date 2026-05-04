// gameplay/animationState.js — machine à états animations

const STATES = {
  IDLE:    'idle',
  WALK:    'walk',
  SPRINT:  'sprint',
  JUMP:    'jump',
  FALL:    'fall',
  LAND:    'land',
  ATTACK:  'attack',
  DODGE:   'dodge',
  HURT:    'hurt',
  DEAD:    'dead',
};

export { STATES };

export class AnimationStateMachine {
  constructor(animationGroups) {
    this._groups  = {};
    this._current = null;
    this._locked  = false; // bloque les transitions pendant une anim one-shot

    // Indexer les groupes par nom normalisé
    for (const ag of animationGroups) {
      const key = ag.name.toLowerCase();
      this._groups[key] = ag;
    }
  }

  play(state, loop = true, blendSpeed = 0.1) {
    if (this._current === state) return;
    if (this._locked) return;

    // Stopper l'anim courante
    const prev = this._groups[this._current];
    if (prev) prev.stop();

    this._current = state;
    const ag = this._groups[state];
    if (!ag) return;

    ag.start(loop, 1.0, ag.from, ag.to, false);

    // One-shot : déverrouiller à la fin
    if (!loop) {
      this._locked = true;
      ag.onAnimationGroupEndObservable.addOnce(() => {
        this._locked  = false;
        this._current = null;
      });
    }
  }

  playOneShot(state, onEnd) {
    if (this._locked) return;
    const prev = this._groups[this._current];
    if (prev) prev.stop();

    this._current = state;
    const ag = this._groups[state];
    if (!ag) { onEnd?.(); return; }

    this._locked = true;
    ag.start(false, 1.0, ag.from, ag.to, false);
    ag.onAnimationGroupEndObservable.addOnce(() => {
      this._locked  = false;
      this._current = null;
      onEnd?.();
    });
  }

  getCurrent() { return this._current; }
  isLocked()   { return this._locked;  }

  stopAll() {
    Object.values(this._groups).forEach(ag => ag.stop());
    this._current = null;
    this._locked  = false;
  }
}
