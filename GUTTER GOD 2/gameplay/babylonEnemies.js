// gameplay/babylonEnemies.js

import { Vector3, MeshBuilder, StandardMaterial, Color3, DynamicTexture } from '@babylonjs/core';
import { createDynamicCapsule, getWorld } from '../engine/babylon/physics.js';
import { getPlayerRoot }   from './babylonPlayerCharacter.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { takeDamage }      from './babylonPlayerHealth.js';
import { Events }          from '../core/events.js';
import { CONFIG }          from '../core/config.js';

// Apparence par type
const TYPE_DEF = {
  scout:   { color: new Color3(0.85, 0.15, 0.15), h: 1.6, r: 0.32, label: 'Scout'   },
  armored: { color: new Color3(0.20, 0.20, 0.80), h: 1.9, r: 0.38, label: 'Armored' },
  elite:   { color: new Color3(0.85, 0.65, 0.05), h: 2.0, r: 0.40, label: 'Elite'   },
  mutant:  { color: new Color3(0.15, 0.70, 0.25), h: 1.8, r: 0.36, label: 'Mutant'  },
  archer:  { color: new Color3(0.70, 0.20, 0.70), h: 1.7, r: 0.30, label: 'Archer'  },
};

const _enemies = [];

// ── Pool de projectiles ───────────────────────────────────────────────────
const MAX_PROJECTILES = 20;
const _projectiles = [];
let _projScene = null;
let _projMat = null;

function _getProjectile() {
  for (const p of _projectiles) {
    if (!p.active) return p;
  }
  if (_projectiles.length >= MAX_PROJECTILES) return null;
  if (!_projScene) return null;

  if (!_projMat) {
    _projMat = new StandardMaterial('proj-mat', _projScene);
    _projMat.diffuseColor = new Color3(1, 0.3, 0.1);
    _projMat.emissiveColor = new Color3(1, 0.4, 0.15);
    _projMat.disableLighting = true;
  }

  const mesh = MeshBuilder.CreateSphere(`proj_${_projectiles.length}`, { diameter: 0.3, segments: 4 }, _projScene);
  mesh.material = _projMat;
  mesh.isPickable = false;
  mesh.setEnabled(false);

  const proj = { mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0, damage: 0 };
  _projectiles.push(proj);
  return proj;
}

function _fireProjectile(from, target, speed, damage) {
  const proj = _getProjectile();
  if (!proj) return;

  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dz = target.z - from.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  proj.vx = (dx / len) * speed;
  proj.vy = (dy / len) * speed;
  proj.vz = (dz / len) * speed;
  proj.damage = damage;
  proj.life = 3.0;
  proj.active = true;
  proj.mesh.position.set(from.x, from.y, from.z);
  proj.mesh.setEnabled(true);
}

function _updateProjectiles(dt) {
  const player = getPlayerRoot();
  if (!player) return;

  for (const p of _projectiles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; p.mesh.setEnabled(false); continue; }

    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;

    const d = Vector3.Distance(p.mesh.position, player.position);
    if (d < 1.0) {
      takeDamage(p.damage, 'archer');
      Events.emit('enemy:attack', { type: 'archer' });
      p.active = false;
      p.mesh.setEnabled(false);
    }
  }
}

// ── Spawn ──────────────────────────────────────────────────────────────────

export function spawnEnemy(type, position, scene) {
  const cfg = CONFIG.enemies[type];
  const def = TYPE_DEF[type];
  if (!cfg || !def) return null;

  // Corps
  const root = MeshBuilder.CreateCapsule(`e_${type}_${_enemies.length}`, {
    radius: def.r, height: def.h, subdivisions: 2, tessellation: 8,
  }, scene);
  const mat = new StandardMaterial(`em_${_enemies.length}`, scene);
  mat.diffuseColor  = def.color;
  mat.specularColor = Color3.Black();
  root.material     = mat;
  root.position.copyFrom(position);
  root.isPickable   = false;
  if (!_projScene) _projScene = scene;

  // Indicateur directionnel (triangle devant)
  const arrow = MeshBuilder.CreateCylinder(`ea_${_enemies.length}`, {
    height: 0.3, diameterTop: 0, diameterBottom: 0.25, tessellation: 3,
  }, scene);
  arrow.parent    = root;
  arrow.position  = new Vector3(0, def.h * 0.3, def.r + 0.05);
  arrow.rotation.x = Math.PI / 2;
  const arrowMat  = new StandardMaterial(`eam_${_enemies.length}`, scene);
  arrowMat.emissiveColor = new Color3(1, 1, 0);
  arrow.material  = arrowMat;
  arrow.isPickable = false;

  // Barre HP au-dessus
  const hpBar = _createHpBar(scene, def.h);
  hpBar.parent = root;

  // Corps physique
  const halfH = def.h / 2 - def.r;
  const body  = createDynamicCapsule(position.x, position.y, position.z, def.r, halfH);

  const enemy = {
    type, root, body, hpBar,
    hp: cfg.hp, maxHp: cfg.hp,
    speed: cfg.speed, xp: cfg.xp,
    detectRange: cfg.detectRange,
    attackRange: cfg.attackRange,
    damage: cfg.damage,
    isAlive: true,
    state: 'patrol',
    patrolOrigin: position.clone(),
    patrolTimer: 0, patrolTarget: null,
    attackTimer: 0, telegraphTimer: 0, staggerTimer: 0,
    aiTimer: Math.random() * 0.1,
    halfH,
    radius: def.r,   // stocker le radius pour la sync mesh
  };

  enemy.takeDamage = (amt) => _hit(enemy, amt);
  _enemies.push(enemy);
  return enemy;
}

function _createHpBar(scene, enemyHeight) {
  const bar = MeshBuilder.CreatePlane('hpbar', { width: 1.0, height: 0.12 }, scene);
  bar.position.y   = enemyHeight * 0.6 + 0.3;
  bar.billboardMode = 7; // face caméra
  bar.isPickable    = false;

  const tex = new DynamicTexture('hptex', { width: 128, height: 16 }, scene);
  _drawHpBar(tex, 1);
  const mat = new StandardMaterial('hpmat', scene);
  mat.diffuseTexture  = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  bar.material = mat;
  bar._hpTex   = tex;
  return bar;
}

function _drawHpBar(tex, pct) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 128, 16);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = pct > 0.5 ? '#4ae84a' : pct > 0.25 ? '#e8c84a' : '#e84a4a';
  ctx.fillRect(2, 2, Math.max(0, (128 - 4) * pct), 12);
  tex.update();
}

// ── Dégâts ─────────────────────────────────────────────────────────────────

function _hit(enemy, amount) {
  if (!enemy.isAlive) return;
  enemy.hp -= amount;

  // Flash
  if (enemy.root.material) {
    enemy.root.material.emissiveColor = new Color3(1, 0.2, 0.2);
    setTimeout(() => { if (enemy.root?.material) enemy.root.material.emissiveColor = Color3.Black(); }, 120);
  }

  // Mettre à jour barre HP
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
    enemy.root?.material?.dispose?.();
    enemy.root?.dispose?.(false, true);
    if (enemy.body) getWorld()?.removeRigidBody(enemy.body);
  } catch (e) {}
}

// ── IA ─────────────────────────────────────────────────────────────────────

const AI_FAR_DT = 1 / CONFIG.perf.aiThrottleHz;

export function updateEnemies(dt) {
  const player = getPlayerRoot();
  if (!player) return;

  _updateProjectiles(dt);

  for (const e of _enemies) {
    if (!e.isAlive) continue;
    const dist = Vector3.Distance(player.position, e.root.position);
    e.aiTimer += dt;
    const minDt = dist > CONFIG.perf.aiThrottleRange ? AI_FAR_DT : 1 / 60;
    if (e.aiTimer < minDt) continue;
    const adt = e.aiTimer; e.aiTimer = 0;
    _ai(e, player, dist, adt);
    // Sync mesh — coller au terrain comme le joueur
    const t        = e.body.translation();
    const terrainY = getTerrainHeight(t.x, t.z);
    const targetY  = terrainY + e.halfH + e.radius;
    // Forcer la position Y sur le terrain
    e.body.setTranslation({ x: t.x, y: targetY, z: t.z }, true);
    e.root.position.set(t.x, targetY, t.z);
  }
}

function _ai(e, player, dist, dt) {
  if (e.staggerTimer > 0) {
    e.staggerTimer -= dt;
    const vel = e.body.linvel();
    e.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    if (e.root.material) e.root.material.emissiveColor = new Color3(0.2, 0.2, 0.8);
    return;
  }

  const vel = e.body.linvel();

  if (e.state === 'patrol') {
    e.patrolTimer -= dt;
    if (e.patrolTimer <= 0) {
      e.patrolTimer  = 2 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 6;
      e.patrolTarget = new Vector3(e.patrolOrigin.x + Math.cos(a) * r, e.patrolOrigin.y, e.patrolOrigin.z + Math.sin(a) * r);
    }
    if (e.patrolTarget) _moveTo(e, e.patrolTarget, e.speed * 0.4);
    if (dist < e.detectRange) e.state = 'chase';

  } else if (e.state === 'chase') {
    if (dist > e.detectRange * 1.5) { e.state = 'patrol'; return; }
    if (dist < e.attackRange)       { e.state = 'attack'; return; }
    _moveTo(e, player.position, e.speed);

  } else if (e.state === 'attack') {
    if (e.type === 'archer') {
      _aiArcherAttack(e, player, dist, dt);
    } else {
      if (dist > e.attackRange * 1.4) { e.state = 'chase'; return; }
      e.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        if (e.root.material) e.root.material.emissiveColor = new Color3(0.8, 0.4, 0);
      } else if (e.attackTimer <= 0) {
        e.attackTimer    = 1.4;
        e.telegraphTimer = 0.5;
        if (e.root.material) e.root.material.emissiveColor = Color3.Black();
        takeDamage(e.damage, e.type);
        Events.emit('enemy:attack', { type: e.type });
      } else {
        e.attackTimer -= dt;
      }
    }
  }
}

function _aiArcherAttack(e, player, dist, dt) {
  const cfg = CONFIG.enemies.archer;
  const vel = e.body.linvel();

  if (dist > e.attackRange * 1.3) { e.state = 'chase'; return; }

  // Fuir si le joueur est trop proche
  if (dist < cfg.fleeRange) {
    const dx = e.root.position.x - player.position.x;
    const dz = e.root.position.z - player.position.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    e.body.setLinvel({ x: (dx / len) * e.speed * 1.3, y: vel.y, z: (dz / len) * e.speed * 1.3 }, true);
    e.root.rotation.y = Math.atan2(-dx, -dz);
    return;
  }

  // Strafe latéral pour esquiver si à bonne distance
  if (dist < cfg.optimalRange * 1.3 && dist > cfg.fleeRange) {
    const dx = player.position.x - e.root.position.x;
    const dz = player.position.z - e.root.position.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const side = (Math.floor(performance.now() / 2000) % 2 === 0) ? 1 : -1;
    const sx = -dz / len * side;
    const sz = dx / len * side;
    e.body.setLinvel({ x: sx * e.speed * 0.6, y: vel.y, z: sz * e.speed * 0.6 }, true);
    e.root.rotation.y = Math.atan2(dx, dz);
  } else {
    e.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    const dx = player.position.x - e.root.position.x;
    const dz = player.position.z - e.root.position.z;
    e.root.rotation.y = Math.atan2(dx, dz);
  }

  // Tir de projectile
  if (e.telegraphTimer > 0) {
    e.telegraphTimer -= dt;
    if (e.root.material) e.root.material.emissiveColor = new Color3(0.9, 0.2, 0.9);
  } else if (e.attackTimer <= 0) {
    e.attackTimer = 1.8;
    e.telegraphTimer = 0.4;
    if (e.root.material) e.root.material.emissiveColor = Color3.Black();
    const from = e.root.position.clone();
    from.y += e.halfH * 0.8;
    _fireProjectile(from, player.position, cfg.projectileSpeed, e.damage);
    Events.emit('enemy:attack', { type: 'archer' });
  } else {
    e.attackTimer -= dt;
  }
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

export function getAllEnemies() { return _enemies; }
export function clearEnemies()  { _enemies.forEach(e => _disposeEnemy(e)); _enemies.length = 0; }
