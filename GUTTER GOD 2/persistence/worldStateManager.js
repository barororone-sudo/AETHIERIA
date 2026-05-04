// persistence/worldStateManager.js
// Current act + persistent world flags. This is the runtime switchboard for
// narrative mutations such as the Sky Fracture and the Iron Rain.

import { setFlag, getAllFlags } from './gameDatabase.js';
import { Events } from '../core/events.js';

const _state = {
  currentAct: 1,
  flags: {},
};

export async function initWorldState() {
  const flags = await getAllFlags();
  _state.flags = { ...flags };

  if (_state.flags.WORLD_NORMAL == null) {
    _state.flags.WORLD_NORMAL = true;
    await setFlag('WORLD_NORMAL', true);
  }

  _state.currentAct = Number(_state.flags['world.act'] ?? 1);
}

export function getCurrentAct() {
  return _state.currentAct;
}

export async function setAct(act) {
  const nextAct = Math.max(1, Number(act) || 1);
  if (_state.currentAct === nextAct && _state.flags['world.act'] === nextAct) return;

  _state.currentAct = nextAct;
  _state.flags['world.act'] = nextAct;
  await setFlag('world.act', nextAct);
  Events.emit('act:changed', { act: nextAct });
}

export function getWorldFlag(key) {
  return _state.flags[key] ?? null;
}

export async function setWorldFlag(key, value = true) {
  if (!key) return;
  if (_state.flags[key] === value) return;

  _state.flags[key] = value;
  await setFlag(key, value);
  Events.emit('world:flagSet', { key, value });
}

export async function setWorldFlags(flags, value = true) {
  for (const key of flags ?? []) {
    await setWorldFlag(key, value);
  }
}

export function hasFlag(key) {
  return _state.flags[key] != null && _state.flags[key] !== false;
}

export function getWorldSnapshot() {
  return { currentAct: _state.currentAct, flags: { ..._state.flags } };
}

