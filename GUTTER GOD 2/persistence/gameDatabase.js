// persistence/gameDatabase.js — API Dexie (IndexedDB)

import Dexie from 'dexie';
import { CONFIG } from '../core/config.js';

const db = new Dexie(CONFIG.persistence.dbName);

db.version(CONFIG.persistence.dbVersion).stores({
  quests:    'id, status, act',
  inventory: 'id, type, quantity',
  worldFlags:'key',
  player:    'key',
  settings:  'key',
});

// ── Quêtes ─────────────────────────────────────────────────────────────────

export async function getQuest(id) {
  return db.quests.get(id);
}

export async function setQuest(id, status, data = {}) {
  await db.quests.put({ id, status, ...data });
}

export async function getAllQuests() {
  return db.quests.toArray();
}

// ── Inventaire ─────────────────────────────────────────────────────────────

export async function getItem(id) {
  return db.inventory.get(id);
}

export async function setItem(id, type, quantity, data = {}) {
  await db.inventory.put({ id, type, quantity, ...data });
}

export async function getAllItems() {
  return db.inventory.toArray();
}

export async function clearInventory() {
  await db.inventory.clear();
}

// ── World flags ────────────────────────────────────────────────────────────

export async function getFlag(key) {
  const row = await db.worldFlags.get(key);
  return row?.value ?? null;
}

export async function setFlag(key, value) {
  await db.worldFlags.put({ key, value });
}

export async function getAllFlags() {
  const rows = await db.worldFlags.toArray();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// ── Joueur ─────────────────────────────────────────────────────────────────

export async function getPlayerData() {
  const rows = await db.player.toArray();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function setPlayerData(key, value) {
  await db.player.put({ key, value });
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const row = await db.settings.get(key);
  return row?.value ?? defaultValue;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ── Reset complet ──────────────────────────────────────────────────────────

export async function resetAllData() {
  await Promise.all([
    db.quests.clear(),
    db.inventory.clear(),
    db.worldFlags.clear(),
    db.player.clear(),
  ]);
}

export { db };
