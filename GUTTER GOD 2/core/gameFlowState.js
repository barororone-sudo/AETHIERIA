// core/gameFlowState.js — état global du flow de jeu

import { Events } from './events.js';

const ALLOWED = new Set(['menu', 'loading', 'playing', 'paused', 'dead']);
let _state = 'menu';

export function getGameFlowState() {
  return _state;
}

export function setGameFlowState(nextState) {
  if (!ALLOWED.has(nextState)) return;
  if (_state === nextState) return;
  _state = nextState;
  Events.emit('gameflow:changed', { state: _state });
}
