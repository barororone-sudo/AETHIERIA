// gameplay/babylonEnemiesFreePacks.js — Enemies from Quaternius glTF

import { loadGltfMesh, cloneMesh } from '../core/assetLoader.js';
import { Vector3, MeshBuilder, StandardMaterial, Color3, DynamicTexture } from '@babylonjs/core';
import { createDynamicCapsule, getWorld } from '../engine/babylon/physics.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { CONFIG } from '../core/config.js';
import { getPlayerRoot } from './babylonPlayerCharacter.js';
import { takeDamage } from './babylonPlayerHealth.js';
import { Events } from '../core/events.js';

const _enemyMeshCache = new Map(); // type → loaded mesh
const _enemies = [];
const AI_FAR_DT = 1 / CONFIG.perf.aiThrottleHz;

// Mapping types ennemis → modèles Quaternius glTF
const ENEMY_MESH_DEFS = {
  scout: {
    model: 'assets/free-packs/glTF/Goblin_Male.gltf',
    scale: 1.0,
    label: 'Scout',
  },
  armored: {
    model: 'assets/free-packs/glTF/Knight_Male.gltf',
    scale: 1.0,
    label: 'Armored',
  },
  elite: {
    model: 'assets/free-packs/glTF/Knight_Golden_Male.gltf',
    scale: 1.0,
    label: 'Elite',
  },
  mutant: {
    model: 'assets/free-packs/glTF/Zombie_Male.gltf',
    scale: 1.0,
    label: 'Mutant',
  },
};

let _scene = null;
let _useFreePacks = false;

export async function initEnemiesFreePacks(scene, useFreePacks = true) {
  _scene = scene;
  _useFreePacks = useFreePacks;

  if (!_useFreePacks) return;

  // Pré-charger les modèles ennemis
  for (const [type, def] of Object.entries(ENEMY_MESH_DEFS)) {
    try {
      const mesh = await loadGltfMesh(def.model, `enemy_tpl_${type}`, scene);
      mesh.scaling.scaleInPlace(def.scale);
      mesh.isPickable = false;
      _enemyMeshCache.set(type, mesh);
      console.log(`✅ Enemy model chargé: ${type}`);
    } catch (e) {
      console.warn(`⚠️ Enemy model manquant: ${type}`, e);
    }
  }
}

export async function spawnEnemyFreePacks(type, position, scene) {
  if (!_useFreePacks) return null;

  const cfg = CONFIG.enemies[type];
  const meshDef = ENEMY_MESH_DEFS[type];
  if (!cfg || !meshDef) return null;

  // Charger le modèle s'il ne l'est pas
  if (!_enemyMeshCache.has(type)) {
    try {
      const mesh = await loadGltfMesh(meshDef.model, `enemy_tpl_${type}`, scene);
      mesh.scaling.scaleInPlace(meshDef.scale);
      _enemyMeshCache.set(type, mesh);
    } catch (e) {
      console.warn(`Erreur chargement ennemi ${type}:`, e);
      return null;
    }
  }

  // Cloner le modèle chargé
  const template = _enemyMeshCache.get(type);
  const root = cloneMesh(template, `enemy_${type}_${_enemies.length}`);
  root.position.copyFrom(position);
  root.isPickable = false;

  // Créer la capsule physique
  const halfH = cfg.height / 2 - cfg.radius;
  const body = createDynamicCapsule(position.x, position.y, position.z, cfg.radius, halfH);

  // Créer l'objet ennemi
  const enemy = {
    type,
    root,
    body,
    mesh: root, // référence mesh pour compatibilité
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    xp: cfg.xp,
    detectRange: cfg.detectRange,
    attackRange: cfg.attackRange,
    damage: cfg.damage,
    isAlive: true,
    state: 'patrol',
    patrolOrigin: position.clone(),
    patrolTimer: 0,
    patrolTarget: null,
    attackTimer: 0,
    telegraphTimer: 0,
    staggerTimer: 0,
    aiTimer: Math.random() * 0.1,
    radius: cfg.radius,
    height: cfg.height,
    halfH,
  };

  const hpBar = _createHpBar(scene, cfg.height, type);
  hpBar.parent = root;
  enemy.hpBar = hpBar;
  enemy.takeDamage = (amt) => _hit(enemy, amt);

  _enemies.push(enemy);
  return enemy;
}

export function getAllEnemiesFreePacks() {
  return _enemies.filter(e => e.isAlive);
}

export function disposeEnemyFreePacks(enemy) {
  const idx = _enemies.indexOf(enemy);
  if (idx >= 0) _enemies.splice(idx, 1);
  _disposeEnemy(enemy);
}

function _createHpBar(scene, enemyHeight, type) {
  const bar = MeshBuilder.CreatePlane(`freepack_hpbar_${type}_${_enemies.length}`, { width: 1.0, height: 0.12 }, scene);
  bar.position.y = enemyHeight * 0.6 + 0.3;
  bar.billboardMode = 7;
  bar.isPickable = false;

  const tex = new DynamicTexture(`freepack_hptex_${type}_${_enemies.length}`, { width: 128, height: 16 }, scene);
  _drawHpBar(tex, 1);

  const mat = new StandardMaterial(`freepack_hpmat_${type}_${_enemies.length}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  bar.material = mat;
  bar._hpTex = tex;
  return bar;
}

function _drawHpBar(tex, pct) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 128, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = pct > 0.5 ? '#e84a4a' : pct > 0.25 ? '#e8a04a' : '#e8e84a';
  ctx.fillRect(2, 5, Math.max(0, 124 * pct), 6);
  tex.update();
}

function _hit(enemy, amount) {
  if (!enemy?.isAlive) return;
  enemy.hp -= amount;
  if (enemy.root?.material) {
    enemy.root.material.emissiveColor = new Color3(1, 0.35, 0.35);
    setTimeout(() => {
      if (enemy?.root?.material) enemy.root.material.emissiveColor = Color3.Black();
    }, 120);
  }
  if (enemy.hpBar?._hpTex) _drawHpBar(enemy.hpBar._hpTex, Math.max(0, enemy.hp / enemy.maxHp));
  if (enemy.hp <= 0) _kill(enemy);
}

function _kill(enemy) {
  enemy.isAlive = false;
  const pos = enemy.root.position.clone();
  _disposeEnemy(enemy);
  const idx = _enemies.indexOf(enemy);
  if (idx >= 0) _enemies.splice(idx, 1);
  Events.emit('enemy:died', { type: enemy.type, position: pos, xp: enemy.xp });
}

function _disposeEnemy(enemy) {
  try {
    enemy.hpBar?._hpTex?.dispose?.();
    enemy.hpBar?.material?.dispose?.();
    enemy.hpBar?.dispose?.();
    enemy.root?.getChildMeshes?.(false).forEach(child => child.dispose(false, true));
    enemy.root?.dispose?.(false, true);
    if (enemy.body) getWorld()?.removeRigidBody(enemy.body);
  } catch (e) {}
}

function _moveTo(e, target, speed) {
  const dx = target.x - e.root.position.x;
  const dz = target.z - e.root.position.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return;
  const vel = e.body.linvel();
  e.body.setLinvel({ x: (dx / len) * speed, y: vel.y, z: (dz / len) * speed }, true);
  e.root.rotation.y = Math.atan2(dx, dz);
}

function _ai(e, player, dist, dt) {
  if (e.staggerTimer > 0) {
    e.staggerTimer -= dt;
    const vel = e.body.linvel();
    e.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    return;
  }

  const vel = e.body.linvel();

  // ── PATROL → CHASE: aggro sphere check ──────────────────────────────
  if (e.state === 'patrol') {
    e.patrolTimer -= dt;
    if (e.patrolTimer <= 0) {
      e.patrolTimer = 2 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 6;
      e.patrolTarget = new Vector3(
        e.patrolOrigin.x + Math.cos(a) * r,
        e.patrolOrigin.y,
        e.patrolOrigin.z + Math.sin(a) * r,
      );
    }
    if (e.patrolTarget) _moveTo(e, e.patrolTarget, e.speed * 0.4);

    // Aggro sphere: player enters detection range → CHASE
    if (dist < e.detectRange) {
      e.state = 'chase';
      // Visual aggro feedback — brief red flash
      _flashEmissive(e, new Color3(1, 0.2, 0.1), 200);
      Events.emit('enemy:aggro', { type: e.type, position: e.root.position.clone() });
    }

  // ── CHASE: pursue player ────────────────────────────────────────────
  } else if (e.state === 'chase') {
    if (dist > e.detectRange * 1.8) { e.state = 'patrol'; return; }
    if (dist < e.attackRange) { e.state = 'attack'; return; }

    // Face player and run
    _moveTo(e, player.position, e.speed);

  // ── ATTACK: telegraph → strike ──────────────────────────────────────
  } else if (e.state === 'attack') {
    if (dist > e.attackRange * 1.6) { e.state = 'chase'; return; }

    // Stop moving during attack
    e.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);

    // Face player during attack
    const dx = player.position.x - e.root.position.x;
    const dz = player.position.z - e.root.position.z;
    e.root.rotation.y = Math.atan2(dx, dz);

    if (e.telegraphTimer > 0) {
      // Telegraph phase — flash orange warning
      e.telegraphTimer -= dt;
      _flashEmissive(e, new Color3(0.8, 0.4, 0), 0); // sustained
    } else if (e.attackTimer <= 0) {
      // Wind up → attack
      e.attackTimer = 1.2 + Math.random() * 0.4; // slight variation
      e.telegraphTimer = 0.45;
      _flashEmissive(e, Color3.Black(), 0);
      takeDamage(e.damage, e.type);
      Events.emit('enemy:attack', { type: e.type });
    } else {
      e.attackTimer -= dt;
    }
  }
}

function _flashEmissive(e, color, durationMs) {
  const targets = e.root.getChildMeshes?.(false) || [];
  if (targets.length === 0 && e.root.material) targets.push(e.root);
  for (const m of targets) {
    if (!m.material) continue;
    m.material.emissiveColor = color;
    if (durationMs > 0) {
      setTimeout(() => {
        if (m.material) m.material.emissiveColor = Color3.Black();
      }, durationMs);
    }
  }
}

export function updateEnemiesFreePacks(dt) {
  const player = getPlayerRoot();
  if (!player) return;

  for (const e of _enemies) {
    if (!e.isAlive) continue;
    const dist = Vector3.Distance(player.position, e.root.position);
    e.aiTimer += dt;
    const minDt = dist > CONFIG.perf.aiThrottleRange ? AI_FAR_DT : 1 / 60;
    if (e.aiTimer < minDt) continue;
    const adt = e.aiTimer;
    e.aiTimer = 0;
    _ai(e, player, dist, adt);

    const t = e.body.translation();
    const terrainY = getTerrainHeight(t.x, t.z);
    const targetY = terrainY + e.halfH + e.radius;
    e.body.setTranslation({ x: t.x, y: targetY, z: t.z }, true);
    e.root.position.set(t.x, targetY, t.z);
  }
}

Events.on('player:parried', () => {
  const player = getPlayerRoot();
  if (!player) return;
  let closest = null;
  let closestDist = Infinity;
  for (const e of _enemies) {
    if (!e.isAlive || e.state !== 'attack') continue;
    const d = Vector3.Distance(player.position, e.root.position);
    if (d < closestDist) { closestDist = d; closest = e; }
  }
  if (closest) {
    closest.staggerTimer = CONFIG.combat.parryStaggerDuration;
    closest.attackTimer  = 0;
    closest.telegraphTimer = 0;
    Events.emit('enemy:staggered', { type: closest.type });
  }
});

export function getEnemiesFreePacaksCacheState() {
  return {
    useFreePacks: _useFreePacks,
    modelsLoaded: Array.from(_enemyMeshCache.keys()),
    enemiesActive: _enemies.length,
  };
}
