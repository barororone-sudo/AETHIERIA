// gameplay/rpgProgression.js
// XP, level, gated quests, inventory and narrative world-state rewards.

import { Events } from '../core/events.js';
import { CONFIG } from '../core/config.js';
import { QUEST_DEFS, ITEM_DEFS } from './storyData.js';
import { setMaxHp, heal } from './babylonPlayerHealth.js';
import { setItem, setQuest } from '../persistence/gameDatabase.js';
import { setWorldFlag, setAct } from '../persistence/worldStateManager.js';

const _prog = {
  xp:        0,
  level:     1,
  quests:    {},
  inventory: {},
};

let _eventsBound = false;

export function initProgression(saved = null) {
  const savedPlayer = saved?.player ?? saved;
  const savedQuests = Array.isArray(saved?.quests) ? saved.quests : [];
  const savedItems  = Array.isArray(saved?.inventory) ? saved.inventory : [];

  _prog.xp    = Number(savedPlayer?.xp ?? 0);
  _prog.level = Number(savedPlayer?.level ?? 1);
  _prog.quests = {};
  _prog.inventory = {};

  for (const row of savedQuests) {
    if (!row?.id || !QUEST_DEFS[row.id]) continue;
    _prog.quests[row.id] = {
      status: row.status ?? 'active',
      progress: row.progress ?? {},
    };
  }

  for (const row of savedItems) {
    if (!row?.id) continue;
    _prog.inventory[row.id] = Number(row.quantity ?? 0);
  }

  _applyLevelBonuses(_prog.level);
  _bindProgressionEvents();
  _activateInitialQuests();
  _unlockAvailableQuests();
}

function _bindProgressionEvents() {
  if (_eventsBound) return;
  _eventsBound = true;

  Events.on('enemy:died', ({ type, xp }) => {
    gainXp(xp ?? 0);
    _trackKill(type);
  });
}

function _activateInitialQuests() {
  for (const [id, def] of Object.entries(QUEST_DEFS)) {
    if (def.startsActive === true && !_prog.quests[id]) {
      activateQuest(id);
    }
  }
}

export function gainXp(amount) {
  _prog.xp += Math.max(0, Number(amount) || 0);
  const thresholds = CONFIG.progression.xpPerLevel;
  while (_prog.level < CONFIG.progression.maxLevel && _prog.xp >= thresholds[_prog.level]) {
    _prog.level++;
    _applyLevelBonuses(_prog.level);
    Events.emit('player:levelUp', { level: _prog.level });
  }
}

function _applyLevelBonuses(level) {
  const newMax = CONFIG.player.maxHp + (level - 1) * CONFIG.progression.hpPerLevel;
  setMaxHp(newMax);
}

export function activateQuest(id) {
  const def = QUEST_DEFS[id];
  if (!def) return false;
  if (_prog.quests[id]?.status === 'done') return false;
  if (_prog.quests[id]?.status === 'active') return false;
  if (!_prerequisitesMet(def)) return false;

  const progress = {};
  for (const step of def.steps) {
    if (step.type === 'pickup' && _prog.inventory[step.itemId]) {
      progress[step.id] = _prog.inventory[step.itemId];
    }
  }
  _prog.quests[id] = { status: 'active', progress };
  Events.emit('quest:updated', { questId: id, status: 'active' });
  setQuest(id, 'active', { progress, act: def.act }).catch(console.warn);
  return true;
}

export function completeQuest(id) {
  const def = QUEST_DEFS[id];
  if (!def) return false;
  if (!_prog.quests[id]) {
    _prog.quests[id] = { status: 'active', progress: {} };
  }
  if (_prog.quests[id].status === 'done') return false;

  for (const step of def.steps) {
    if (step.type === 'kill' || step.type === 'pickup') {
      _prog.quests[id].progress[step.id] = step.count ?? 1;
    } else {
      _prog.quests[id].progress[step.id] = true;
    }
  }
  _checkQuestComplete(id);
  return true;
}

export function trackProximity(x, z) {
  for (const [id, state] of Object.entries(_prog.quests)) {
    if (state.status !== 'active') continue;
    const def = QUEST_DEFS[id];
    if (!def) continue;

    for (const step of def.steps) {
      if (step.type !== 'proximity') continue;
      if (state.progress[step.id]) continue;
      const dx = x - step.x;
      const dz = z - step.z;
      if (Math.sqrt(dx * dx + dz * dz) <= step.radius) {
        state.progress[step.id] = true;
        Events.emit('quest:updated', { questId: id, status: 'active' });
        _checkQuestComplete(id);
      }
    }
  }
}

function _trackKill(enemyType) {
  for (const [id, state] of Object.entries(_prog.quests)) {
    if (state.status !== 'active') continue;
    const def = QUEST_DEFS[id];
    if (!def) continue;

    for (const step of def.steps) {
      if (step.type !== 'kill' || step.enemyType !== enemyType) continue;
      state.progress[step.id] = (state.progress[step.id] ?? 0) + 1;
      Events.emit('quest:updated', { questId: id, status: 'active' });
      _checkQuestComplete(id);
    }
  }
}

function _trackPickup(itemId, qty = 1) {
  for (const [id, state] of Object.entries(_prog.quests)) {
    if (state.status !== 'active') continue;
    const def = QUEST_DEFS[id];
    if (!def) continue;

    for (const step of def.steps) {
      if (step.type !== 'pickup' || step.itemId !== itemId) continue;
      state.progress[step.id] = (state.progress[step.id] ?? 0) + qty;
      Events.emit('quest:updated', { questId: id, status: 'active' });
      _checkQuestComplete(id);
    }
  }
}

function _checkQuestComplete(id) {
  const state = _prog.quests[id];
  const def   = QUEST_DEFS[id];
  if (!state || !def || state.status === 'done') return;

  const done = def.steps.every(step => {
    if (step.type === 'kill')      return (state.progress[step.id] ?? 0) >= step.count;
    if (step.type === 'pickup')    return (state.progress[step.id] ?? 0) >= (step.count ?? 1);
    if (step.type === 'proximity') return !!state.progress[step.id];
    return false;
  });

  if (!done) return;

  state.status = 'done';
  gainXp(def.reward?.xp ?? 0);
  for (const itemId of (def.reward?.items ?? [])) addItem(itemId, 1, { trackQuest: false });
  _applyNarrativeRewards(def);
  Events.emit('quest:completed', { questId: id });
  setQuest(id, 'done', { progress: state.progress, act: def.act }).catch(console.warn);
  _unlockAvailableQuests();
}

function _applyNarrativeRewards(def) {
  for (const flag of (def.worldFlags ?? [])) {
    setWorldFlag(flag, true).catch(console.warn);
    Events.emit('ui:notification', {
      text: `Monde modifie: ${flag.replace(/_/g, ' ')}`,
      duration: 2600,
    });
  }

  if (def.setAct) {
    setAct(def.setAct).catch(console.warn);
  }

  for (const next of (def.unlockQuests ?? [])) {
    activateQuest(next);
  }
}

function _unlockAvailableQuests() {
  for (const [id, def] of Object.entries(QUEST_DEFS)) {
    if (_prog.quests[id]) continue;
    if (def.startsActive === true || _prerequisitesMet(def)) {
      activateQuest(id);
    }
  }
}

function _prerequisitesMet(def) {
  const prerequisites = def.prerequisites ?? [];
  return prerequisites.every(id => _prog.quests[id]?.status === 'done');
}

export function addItem(itemId, qty = 1, options = {}) {
  const amount = Math.max(1, Number(qty) || 1);
  _prog.inventory[itemId] = (_prog.inventory[itemId] ?? 0) + amount;
  Events.emit('loot:picked', { itemId, qty: amount });
  setItem(itemId, ITEM_DEFS[itemId]?.type ?? 'misc', _prog.inventory[itemId]).catch(console.warn);
  if (options.trackQuest !== false) _trackPickup(itemId, amount);
}

export function useItem(itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def || !_prog.inventory[itemId]) return false;
  if (def.type === 'consumable' && def.healAmount) {
    heal(def.healAmount);
    _prog.inventory[itemId]--;
    if (_prog.inventory[itemId] <= 0) delete _prog.inventory[itemId];
    setItem(itemId, def.type, _prog.inventory[itemId] ?? 0).catch(console.warn);
    return true;
  }
  return false;
}

export function getProgression() {
  return {
    xp:        _prog.xp,
    level:     _prog.level,
    quests:    structuredClone(_prog.quests),
    inventory: { ..._prog.inventory },
  };
}

export function getInventory() {
  return { ..._prog.inventory };
}

export function getActiveQuests() {
  return Object.entries(_prog.quests)
    .filter(([, state]) => state.status === 'active')
    .map(([id]) => QUEST_DEFS[id])
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}
