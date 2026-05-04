// gameplay/babylonMiniBoss.js — mini-boss par acte, 3 phases

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { createDynamicCapsule, getWorld } from '../engine/babylon/physics.js';
import { getPlayerRoot }   from './babylonPlayerCharacter.js';
import { takeDamage }      from './babylonPlayerHealth.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { Events }          from '../core/events.js';
import { CONFIG }          from '../core/config.js';

const BOSS_DEFS = {
  1: { name: 'Gardien des Cendres', hp: 600,  color: new Color3(0.8, 0.4, 0.1), h: 2.8, r: 0.7, damage: 35, speed: 2.0, phases: [1.0, 0.6, 0.3] },
  2: { name: 'Colosse de Fer',      hp: 1000, color: new Color3(0.5, 0.5, 0.6), h: 3.5, r: 0.9, damage: 50, speed: 1.5, phases: [1.0, 0.55, 0.25] },
  3: { name: 'Gardien Corrompu',    hp: 900,  color: new Color3(0.2, 0.6, 0.2), h: 3.0, r: 0.8, damage: 42, speed: 1.8, phases: [1.0, 0.6, 0.25] },
};

let _boss   = null;
let _scene  = null;

export function initMiniBoss(scene) {
  _scene = scene;
}

export function spawnMiniBoss(act) {
  if (_boss?.isAlive) return; // déjà un boss actif
  const def = BOSS_DEFS[act];
  if (!def) return;

  // Spawn à 30u devant le joueur
  const player = getPlayerRoot();
  const spawnX = player ? player.position.x + 30 : 30;
  const spawnZ = player ? player.position.z : 0;
  const spawnY = getTerrainHeight(spawnX, spawnZ) + def.h / 2;

  // Mesh
  const root = MeshBuilder.CreateCapsule(`boss_act${act}`, {
    radius: def.r, height: def.h, subdivisions: 3, tessellation: 10,
  }, _scene);
  root.position.set(spawnX, spawnY, spawnZ);
  root.isPickable = false;

  const mat = new StandardMaterial(`boss_mat_${act}`, _scene);
  mat.diffuseColor  = def.color;
  mat.emissiveColor = def.color.scale(0.3);
  mat.specularColor = Color3.Black();
  root.material     = mat;

  // Barre HP
  const hpBar = _createBossHpBar(def.name, _scene);
  hpBar.parent = root;

  // Corps physique
  const halfH = def.h / 2 - def.r;
  const body  = createDynamicCapsule(spawnX, spawnY, spawnZ, def.r, halfH);

  _boss = {
    act, def, root, body, hpBar,
    hp: def.hp, maxHp: def.hp,
    isAlive: true,
    phase: 0,
    attackTimer: 0,
    aiTimer: 0,
    halfH,
  };

  _boss.takeDamage = (amt) => _bossTakeDamage(amt);

  Events.emit('boss:spawned', { act, name: def.name });
  return _boss;
}

function _createBossHpBar(name, scene) {
  const bar = MeshBuilder.CreatePlane('boss-hpbar', { width: 3.0, height: 0.3 }, scene);
  bar.position.y   = 2.5;
  bar.billboardMode = 7;
  bar.isPickable    = false;

  const tex = new DynamicTexture('boss-hptex', { width: 512, height: 48 }, scene);
  _drawBossHp(tex, name, 1);

  const mat = new StandardMaterial('boss-hpmat', scene);
  mat.diffuseTexture  = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  bar.material = mat;
  bar._tex     = tex;
  bar._name    = name;
  return bar;
}

function _drawBossHp(tex, name, pct) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 512, 48);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, 512, 48);
  // Barre
  const color = pct > 0.5 ? '#e84a4a' : pct > 0.25 ? '#e8a04a' : '#e8e84a';
  ctx.fillStyle = color;
  ctx.fillRect(4, 28, Math.max(0, (512 - 8) * pct), 16);
  // Nom
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(name, 256, 20);
  tex.update();
}

function _bossTakeDamage(amount) {
  if (!_boss?.isAlive) return;
  _boss.hp -= amount;

  // Flash
  if (_boss.root.material) {
    _boss.root.material.emissiveColor = new Color3(1, 0.3, 0.3);
    setTimeout(() => {
      if (_boss?.root?.material)
        _boss.root.material.emissiveColor = _boss.def.color.scale(0.3);
    }, 150);
  }

  // Mettre à jour barre HP
  if (_boss.hpBar?._tex)
    _drawBossHp(_boss.hpBar._tex, _boss.def.name, Math.max(0, _boss.hp / _boss.maxHp));

  // Vérifier changement de phase
  const pct = _boss.hp / _boss.maxHp;
  const phases = _boss.def.phases;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (pct <= phases[i] && _boss.phase < i + 1) {
      _boss.phase = i + 1;
      _onPhaseChange(_boss.phase);
      break;
    }
  }

  if (_boss.hp <= 0) _killBoss();
}

function _onPhaseChange(phase) {
  if (!_boss) return;
  // Accélérer et changer de couleur à chaque phase
  _boss.def.speed *= 1.3;
  _boss.def.damage = Math.round(_boss.def.damage * 1.2);
  _boss.root.material.emissiveColor = new Color3(0.8, 0.2, 0.8);
  setTimeout(() => {
    if (_boss?.root?.material)
      _boss.root.material.emissiveColor = _boss.def.color.scale(0.3);
  }, 500);
  Events.emit('boss:phaseChange', { phase, act: _boss.act });
}

function _killBoss() {
  if (!_boss) return;
  _boss.isAlive = false;
  _boss.root.dispose();
  getWorld()?.removeRigidBody(_boss.body);
  Events.emit('boss:died', { act: _boss.act });
  _boss = null;
}

// ── IA Update ──────────────────────────────────────────────────────────────

export function updateMiniBoss(dt) {
  if (!_boss?.isAlive) return;

  const player = getPlayerRoot();
  if (!player) return;

  _boss.aiTimer += dt;
  if (_boss.aiTimer < 1 / 30) return; // 30 Hz IA boss
  const adt = _boss.aiTimer;
  _boss.aiTimer = 0;

  const dx   = player.position.x - _boss.root.position.x;
  const dz   = player.position.z - _boss.root.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const vel  = _boss.body.linvel();

  // Toujours charger le joueur
  if (dist > _boss.def.r * 2) {
    const len = Math.sqrt(dx * dx + dz * dz);
    _boss.body.setLinvel({ x: (dx / len) * _boss.def.speed, y: vel.y, z: (dz / len) * _boss.def.speed }, true);
    _boss.root.rotation.y = Math.atan2(dx, dz);
  } else {
    _boss.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    // Attaque
    _boss.attackTimer -= adt;
    if (_boss.attackTimer <= 0) {
      _boss.attackTimer = 1.0 - _boss.phase * 0.15; // plus rapide par phase
      takeDamage(_boss.def.damage, 'boss');
      Events.emit('boss:attack', { act: _boss.act });
    }
  }

  // Sync mesh
  const t = _boss.body.translation();
  const terrainY = getTerrainHeight(t.x, t.z);
  _boss.body.setTranslation({ x: t.x, y: terrainY + _boss.halfH + _boss.def.r, z: t.z }, true);
  _boss.root.position.set(t.x, terrainY + _boss.halfH + _boss.def.r, t.z);
}

export function getActiveBoss() { return _boss; }
