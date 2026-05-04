// persistence/save.js — save/load complet

import {
  setPlayerData, getPlayerData,
  setItem, getAllItems,
  setQuest, getAllQuests,
  resetAllData,
} from './gameDatabase.js';
import { getWorldSnapshot, initWorldState, setWorldFlag, setAct } from './worldStateManager.js';
import { Events } from '../core/events.js';
import { CONFIG } from '../core/config.js';

let _autosaveTimer = 0;
let _getGameState  = null; // injecté par le bootstrap
let _applyGameState = null;

// ── Initialisation ─────────────────────────────────────────────────────────

export function initSave(getStateFn, applyStateFn) {
  _getGameState   = getStateFn;
  _applyGameState = applyStateFn;

  window.addEventListener('beforeunload', () => {
    saveGame();
  });
}

// ── Autosave tick (appelé depuis la game loop) ─────────────────────────────

export function tickAutosave(dt) {
  _autosaveTimer += dt;
  if (_autosaveTimer >= CONFIG.persistence.autosaveInterval) {
    _autosaveTimer = 0;
    saveGame();
  }
}

// ── Save ───────────────────────────────────────────────────────────────────

export async function saveGame() {
  if (!_getGameState) return;

  const state = _getGameState();

  // Joueur
  await setPlayerData('hp',    state.player.hp);
  await setPlayerData('xp',    state.player.xp);
  await setPlayerData('level', state.player.level);
  await setPlayerData('pos',   JSON.stringify(state.player.position));
  await setPlayerData('faction', state.player.faction ?? null);

  // Inventaire
  for (const item of state.inventory) {
    await setItem(item.id, item.type ?? 'misc', item.quantity, item);
  }

  // Quêtes
  for (const quest of state.quests) {
    await setQuest(quest.id, quest.status, quest);
  }

  Events.emit('save:done', {});
}

// ── Load ───────────────────────────────────────────────────────────────────

export async function loadGame() {
  await initWorldState();

  const player    = await getPlayerData();
  const items     = await getAllItems();
  const quests    = await getAllQuests();
  const world     = getWorldSnapshot();

  const state = {
    player: {
      hp:       Number(player.hp   ?? CONFIG.player.maxHp),
      xp:       Number(player.xp   ?? 0),
      level:    Number(player.level ?? 1),
      position: player.pos ? JSON.parse(player.pos) : { x: 0, y: 2, z: 0 },
      faction:  player.faction ?? null,
    },
    inventory: items,
    quests,
    world,
  };

  _applyGameState?.(state);
  return state;
}

export async function hasSaveGame() {
  const player = await getPlayerData();
  return (
    player.hp !== undefined ||
    player.xp !== undefined ||
    player.level !== undefined ||
    player.pos !== undefined ||
    player.faction !== undefined
  );
}

// ── Nouvelle partie ────────────────────────────────────────────────────────

export async function newGame() {
  await resetAllData();
  await initWorldState();
}
