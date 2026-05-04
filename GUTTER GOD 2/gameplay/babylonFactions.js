// gameplay/babylonFactions.js — 2 factions, alignement persisté

import { Events }            from '../core/events.js';
import { setWorldFlag, getWorldFlag } from '../persistence/worldStateManager.js';

export const FACTIONS = {
  guardians: { id: 'guardians', name: 'Gardiens du Sceau',      color: '#4a8fe8', icon: 'Ring1.png' },
  heirs:     { id: 'heirs',     name: 'Héritiers de la Rupture', color: '#e84a4a', icon: 'Ring2.png' },
};

const _state = {
  faction:   null,   // 'guardians' | 'heirs' | null
  alignment: 0,      // -100 (heirs) → +100 (guardians)
};

export function initFactions(savedFaction) {
  _state.faction   = savedFaction ?? null;
  _state.alignment = Number(getWorldFlag('faction.alignment') ?? 0);
}

export function getFaction()   { return _state.faction;   }
export function getAlignment() { return _state.alignment; }

export function shiftAlignment(amount) {
  _state.alignment = Math.max(-100, Math.min(100, _state.alignment + amount));
  setWorldFlag('faction.alignment', _state.alignment);

  // Auto-rejoindre une faction si alignement fort
  if (!_state.faction) {
    if (_state.alignment >= 50)  _joinFaction('guardians');
    if (_state.alignment <= -50) _joinFaction('heirs');
  }
}

export function chooseFaction(id) {
  if (!FACTIONS[id]) return;
  _joinFaction(id);
}

function _joinFaction(id) {
  _state.faction = id;
  setWorldFlag('player.faction', id);
  Events.emit('faction:changed', { faction: id, alignment: _state.alignment });
}
