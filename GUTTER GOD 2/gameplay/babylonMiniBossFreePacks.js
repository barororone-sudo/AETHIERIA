// gameplay/babylonMiniBossFreePacks.js — Mini-boss from Ultimate Monsters

import { loadGltfMesh, cloneMesh } from '../core/assetLoader.js';
import { Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { createDynamicCapsule } from '../engine/babylon/physics.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { CONFIG } from '../core/config.js';
import { getPlayerRoot } from './babylonPlayerCharacter.js';
import { takeDamage } from './babylonPlayerHealth.js';
import { Events } from '../core/events.js';
import { getFaction } from './babylonFactions.js';

const _miniBossMeshCache = new Map(); // act → loaded mesh

const MINIBOSS_DEFS = {
  1: {
    model: 'assets/free-packs/Ultimate Monsters/Big/glTF/Orc.gltf',
    name: 'Gardien des Cendres',
    scale: 1.3,
  },
  2: {
    model: 'assets/free-packs/Ultimate Monsters/Big/glTF/Yeti.gltf',
    name: 'Colosse de Fer',
    scale: 1.2,
  },
  3: {
    model: 'assets/free-packs/Ultimate Monsters/Big/glTF/Demon.gltf',
    name: 'Gardien Corrompu',
    scale: 1.4,
  },
};

const BOSS_FINAL_DEF = {
  model: 'assets/free-packs/Ultimate Monsters/Flying/glTF/Dragon.gltf',
  name: 'Gutter God',
  scale: 2.0,
};

let _scene = null;
let _useFreePacks = false;
let _miniBoss = null;
let _finalBoss = null;

export async function initMiniBossFreePacks(scene, useFreePacks = true) {
  _scene = scene;
  _useFreePacks = useFreePacks;

  if (!_useFreePacks) return;

  // Pré-charger les mini-boss
  for (const [act, def] of Object.entries(MINIBOSS_DEFS)) {
    try {
      const mesh = await loadGltfMesh(def.model, `miniboss_tpl_${act}`, scene);
      mesh.scaling.scaleInPlace(def.scale);
      mesh.isPickable = false;
      _miniBossMeshCache.set(Number(act), mesh);
      console.log(`✅ Mini-boss model chargé (Act ${act}): ${def.name}`);
    } catch (e) {
      console.warn(`⚠️ Mini-boss model manquant (Act ${act}):`, e);
    }
  }

  // Pré-charger le boss final
  try {
    const mesh = await loadGltfMesh(BOSS_FINAL_DEF.model, 'boss_final_tpl', scene);
    mesh.scaling.scaleInPlace(BOSS_FINAL_DEF.scale);
    mesh.isPickable = false;
    _miniBossMeshCache.set('final', mesh);
    console.log(`✅ Boss final model chargé: ${BOSS_FINAL_DEF.name}`);
  } catch (e) {
    console.warn(`⚠️ Boss final model manquant:`, e);
  }
}

export async function spawnMiniBossFreePacks(act, position, scene) {
  if (!_useFreePacks) return null;

  const def = MINIBOSS_DEFS[act];
  if (!def) return null;

  // Charger si nécessaire
  if (!_miniBossMeshCache.has(act)) {
    try {
      const mesh = await loadGltfMesh(def.model, `miniboss_tpl_${act}`, scene);
      mesh.scaling.scaleInPlace(def.scale);
      _miniBossMeshCache.set(act, mesh);
    } catch (e) {
      console.warn(`Erreur chargement miniboss ${act}:`, e);
      return null;
    }
  }

  const template = _miniBossMeshCache.get(act);
  const root = cloneMesh(template, `miniboss_${act}`);
  root.position.copyFrom(position);
  root.isPickable = false;

  // Physique
  const cfg = CONFIG.miniBoss[act] || CONFIG.miniBoss[1];
  const halfH = cfg.height / 2 - cfg.radius;
  const body = createDynamicCapsule(position.x, position.y, position.z, cfg.radius, halfH);

  const miniBoss = {
    act,
    name: def.name,
    root,
    body,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    damage: cfg.damage,
    state: 'idle',
    isAlive: true,
    phase: 0,
    attackTimer: 0,
    aiTimer: 0,
    def,
  };

  _miniBoss = miniBoss;
  return miniBoss;
}

export async function spawnBossFinalFreePacks(position, scene) {
  if (!_useFreePacks) return null;

  // Charger si nécessaire
  if (!_miniBossMeshCache.has('final')) {
    try {
      const mesh = await loadGltfMesh(BOSS_FINAL_DEF.model, 'boss_final_tpl', scene);
      mesh.scaling.scaleInPlace(BOSS_FINAL_DEF.scale);
      _miniBossMeshCache.set('final', mesh);
    } catch (e) {
      console.warn(`Erreur chargement boss final:`, e);
      return null;
    }
  }

  const template = _miniBossMeshCache.get('final');
  const root = cloneMesh(template, 'boss_final');
  root.position.copyFrom(position);
  root.isPickable = false;

  // Physique
  const cfg = CONFIG.finalBoss;
  const halfH = cfg.height / 2 - cfg.radius;
  const body = createDynamicCapsule(position.x, position.y, position.z, cfg.radius, halfH);

  _finalBoss = {
    name: BOSS_FINAL_DEF.name,
    root,
    body,
    hp: cfg.hp,
    maxHp: cfg.hp,
    phase: 1,
    isAlive: true,
    attackTimer: 0,
    zoneTimer: 0,
    aiTimer: 0,
    speed: cfg.speed,
    damage: cfg.damage,
    radius: cfg.radius,
  };

  return _finalBoss;
}

export function getMiniBossFreePacks() {
  return _miniBoss;
}

export function getBossFinalFreePacks() {
  return _finalBoss;
}

export function updateMiniBossFreePacks(dt) {
  if (!_miniBoss?.isAlive) return;

  const player = getPlayerRoot();
  if (!player) return;

  _miniBoss.aiTimer += dt;
  if (_miniBoss.aiTimer < 1 / 30) return;
  const adt = _miniBoss.aiTimer;
  _miniBoss.aiTimer = 0;

  const dx = player.position.x - _miniBoss.root.position.x;
  const dz = player.position.z - _miniBoss.root.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const vel = _miniBoss.body.linvel();
  const speed = _miniBoss.speed ?? 1.5;

  if (dist > (_miniBoss.def?.r ?? 0.8) * 2) {
    const len = Math.max(dist, 0.001);
    _miniBoss.body.setLinvel({ x: (dx / len) * speed, y: vel.y, z: (dz / len) * speed }, true);
    _miniBoss.root.rotation.y = Math.atan2(dx, dz);
  } else {
    _miniBoss.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    _miniBoss.attackTimer -= adt;
    if (_miniBoss.attackTimer <= 0) {
      _miniBoss.attackTimer = Math.max(0.6, 1.0 - _miniBoss.phase * 0.15);
      takeDamage(_miniBoss.damage, 'boss');
      Events.emit('boss:attack', { act: _miniBoss.act });
    }
  }

  const pct = _miniBoss.hp / _miniBoss.maxHp;
  const phases = _miniBoss.def?.phases ?? [1.0, 0.6, 0.3];
  for (let i = phases.length - 1; i >= 0; i--) {
    if (pct <= phases[i] && _miniBoss.phase < i + 1) {
      _miniBoss.phase = i + 1;
      _miniBoss.speed *= 1.3;
      _miniBoss.damage = Math.round(_miniBoss.damage * 1.2);
      Events.emit('boss:phaseChange', { phase: _miniBoss.phase, act: _miniBoss.act });
      break;
    }
  }

  const t = _miniBoss.body.translation();
  const terrainY = getTerrainHeight(t.x, t.z);
  const targetY = terrainY + _miniBoss.halfH + (_miniBoss.def?.r ?? 0.8);
  _miniBoss.body.setTranslation({ x: t.x, y: targetY, z: t.z }, true);
  _miniBoss.root.position.set(t.x, targetY, t.z);
}

export function updateBossFinalFreePacks(dt) {
  if (!_finalBoss?.isAlive) return;

  const player = getPlayerRoot();
  if (!player) return;

  _finalBoss.aiTimer += dt;
  if (_finalBoss.aiTimer < 1 / 30) return;
  const adt = _finalBoss.aiTimer;
  _finalBoss.aiTimer = 0;

  const dx = player.position.x - _finalBoss.root.position.x;
  const dz = player.position.z - _finalBoss.root.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const vel = _finalBoss.body.linvel();
  const spd = _finalBoss.speed[_finalBoss.phase] ?? _finalBoss.speed[0];
  const dmg = _finalBoss.damage[_finalBoss.phase] ?? _finalBoss.damage[0];

  if (dist > (_finalBoss.radius ?? 1.2) * 2.5) {
    const len = Math.max(dist, 0.001);
    _finalBoss.body.setLinvel({ x: (dx / len) * spd, y: vel.y, z: (dz / len) * spd }, true);
    _finalBoss.root.rotation.y = Math.atan2(dx, dz);
  } else {
    _finalBoss.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    _finalBoss.attackTimer -= adt;
    if (_finalBoss.attackTimer <= 0) {
      _finalBoss.attackTimer = Math.max(0.5, 1.2 - _finalBoss.phase * 0.2);
      takeDamage(dmg, 'final_boss');
      Events.emit('boss:attack', { act: 5 });
    }
  }

  if (_finalBoss.phase >= 2) {
    _finalBoss.zoneTimer -= adt;
    if (_finalBoss.zoneTimer <= 0) {
      _finalBoss.zoneTimer = 2.5;
      takeDamage(Math.round(dmg * 0.4), 'final_boss_zone');
      Events.emit('boss:zoneAttack', { act: 5 });
    }
  }

  const t = _finalBoss.body.translation();
  const terrainY = getTerrainHeight(t.x, t.z);
  const targetY = terrainY + _finalBoss.halfH + (_finalBoss.radius ?? 1.2);
  _finalBoss.body.setTranslation({ x: t.x, y: targetY, z: t.z }, true);
  _finalBoss.root.position.set(t.x, targetY, t.z);
}

export function getMiniBossFreePacksDebugState() {
  return {
    faction: getFaction(),
    miniBossAlive: _miniBoss?.isAlive ?? false,
    finalBossAlive: _finalBoss?.isAlive ?? false,
  };
}

export function getMiniBossFreePacaksCacheState() {
  return {
    useFreePacks: _useFreePacks,
    modelsLoaded: Array.from(_miniBossMeshCache.keys()),
    miniBossActive: _miniBoss?.isAlive || false,
    bossActive: _finalBoss?.isAlive || false,
  };
}
