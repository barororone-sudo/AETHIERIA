// gameplay/babylonFinalBoss.js — Gutter God, boss final Act 5

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { createDynamicCapsule, getWorld } from '../engine/babylon/physics.js';
import { getPlayerRoot }    from './babylonPlayerCharacter.js';
import { takeDamage }       from './babylonPlayerHealth.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { Events }           from '../core/events.js';
import { getFaction }       from './babylonFactions.js';

const DEF = {
  name:   'Gutter God',
  hp:     3000,
  h:      4.0,
  r:      1.2,
  phases: [1.0, 0.6, 0.3],
  speed:  [1.8, 2.5, 3.5],
  damage: [60,  80,  110],
};

let _boss  = null;
let _scene = null;

export function initFinalBoss(scene) { _scene = scene; }

export function spawnFinalBoss() {
  if (_boss?.isAlive) return;

  const player = getPlayerRoot();
  const sx = player ? player.position.x + 40 : 40;
  const sz = player ? player.position.z : 0;
  const sy = getTerrainHeight(sx, sz) + DEF.h / 2;

  // Mesh — grand et imposant
  const root = MeshBuilder.CreateCapsule('final_boss', {
    radius: DEF.r, height: DEF.h, subdivisions: 4, tessellation: 12,
  }, _scene);
  root.position.set(sx, sy, sz);
  root.scaling.setAll(1.0);
  root.isPickable = false;

  const mat = new StandardMaterial('final_boss_mat', _scene);
  mat.diffuseColor  = new Color3(0.15, 0.05, 0.25);
  mat.emissiveColor = new Color3(0.4, 0.0, 0.6);
  mat.specularColor = Color3.Black();
  root.material     = mat;

  // Ailes décoratives
  const wingL = MeshBuilder.CreateBox('wing_l', { width: 3, height: 0.1, depth: 1.5 }, _scene);
  wingL.parent   = root;
  wingL.position = new Vector3(-2.5, 0.5, 0);
  wingL.rotation = new Vector3(0, 0, 0.4);
  wingL.material = mat;
  wingL.isPickable = false;

  const wingR = MeshBuilder.CreateBox('wing_r', { width: 3, height: 0.1, depth: 1.5 }, _scene);
  wingR.parent   = root;
  wingR.position = new Vector3(2.5, 0.5, 0);
  wingR.rotation = new Vector3(0, 0, -0.4);
  wingR.material = mat;
  wingR.isPickable = false;

  // Barre HP boss final
  const hpBar = _createHpBar(_scene);
  hpBar.parent = root;

  const halfH = DEF.h / 2 - DEF.r;
  const body  = createDynamicCapsule(sx, sy, sz, DEF.r, halfH);

  _boss = {
    root, body, hpBar, mat,
    hp: DEF.hp, maxHp: DEF.hp,
    isAlive: true,
    phase: 0,
    attackTimer: 0,
    zoneTimer: 0,
    aiTimer: 0,
    halfH,
  };

  _boss.takeDamage = (amt) => _hit(amt);

  Events.emit('boss:spawned', { act: 5, name: DEF.name });
  Events.emit('loot:picked', { itemId: '💀 Le Gutter God est apparu !' });
  return _boss;
}

function _createHpBar(scene) {
  const bar = MeshBuilder.CreatePlane('final_hpbar', { width: 5, height: 0.4 }, scene);
  bar.position.y    = 3.5;
  bar.billboardMode = 7;
  bar.isPickable    = false;

  const tex = new DynamicTexture('final_hptex', { width: 512, height: 48 }, scene);
  _drawHp(tex, 1);

  const mat = new StandardMaterial('final_hpmat', scene);
  mat.diffuseTexture  = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  bar.material = mat;
  bar._tex     = tex;
  return bar;
}

function _drawHp(tex, pct) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 512, 48);
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, 512, 48);
  // Barre violette → rouge
  const r = Math.round(150 + 105 * (1 - pct));
  const g = Math.round(0);
  const b = Math.round(200 * pct);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(4, 28, Math.max(0, (512 - 8) * pct), 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ GUTTER GOD ⚡', 256, 22);
  tex.update();
}

function _hit(amount) {
  if (!_boss?.isAlive) return;
  _boss.hp -= amount;

  // Flash
  _boss.mat.emissiveColor = new Color3(1, 0.5, 1);
  setTimeout(() => { if (_boss?.mat) _boss.mat.emissiveColor = new Color3(0.4, 0, 0.6); }, 120);

  if (_boss.hpBar?._tex) _drawHp(_boss.hpBar._tex, Math.max(0, _boss.hp / _boss.maxHp));

  // Changement de phase
  const pct = _boss.hp / _boss.maxHp;
  for (let i = DEF.phases.length - 1; i >= 0; i--) {
    if (pct <= DEF.phases[i] && _boss.phase < i + 1) {
      _boss.phase = i + 1;
      _phaseChange(_boss.phase);
      break;
    }
  }

  if (_boss.hp <= 0) _kill();
}

function _phaseChange(phase) {
  if (!_boss) return;
  // Couleur plus intense par phase
  const colors = [
    new Color3(0.4, 0, 0.6),
    new Color3(0.7, 0, 0.4),
    new Color3(1.0, 0, 0.2),
  ];
  _boss.mat.emissiveColor = colors[phase - 1] ?? colors[0];
  Events.emit('boss:phaseChange', { phase, act: 5 });
  Events.emit('loot:picked', { itemId: `⚡ Gutter God — Phase ${phase + 1} !` });
}

function _kill() {
  if (!_boss) return;
  _boss.isAlive = false;
  _boss.root.dispose();
  getWorld()?.removeRigidBody(_boss.body);
  Events.emit('boss:died', { act: 5 });
  // Déclencher l'écran de fin
  setTimeout(() => _showEndScreen(), 2000);
  _boss = null;
}

function _showEndScreen() {
  const faction = getFaction();
  const isGuardians = faction === 'guardians';

  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    background: isGuardians ? 'rgba(10,20,40,0.97)' : 'rgba(40,10,10,0.97)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    zIndex: '500', fontFamily: 'serif',
    animation: 'fadein 2s ease',
  });

  const style = document.createElement('style');
  style.textContent = '@keyframes fadein{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(style);

  const title = document.createElement('div');
  Object.assign(title.style, {
    color: isGuardians ? '#4a8fe8' : '#e84a4a',
    fontSize: '42px', fontWeight: '700',
    marginBottom: '24px', textShadow: '0 0 30px currentColor',
    letterSpacing: '4px',
  });
  title.textContent = isGuardians ? '— LE SCEAU EST RÉTABLI —' : '— LA RUPTURE EST LIBÉRÉE —';

  const sub = document.createElement('div');
  Object.assign(sub.style, { color: '#e8e0d0', fontSize: '18px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.8', marginBottom: '40px' });
  sub.textContent = isGuardians
    ? 'Les Gardiens du Sceau ont triomphé. La fracture est scellée pour une génération. Vael\'Dorn peut enfin reposer.'
    : 'Les Héritiers de la Rupture ont libéré l\'énergie ancienne. Le monde change. Une nouvelle ère commence dans le chaos.';

  const score = document.createElement('div');
  Object.assign(score.style, { color: '#e8c84a', fontSize: '14px', marginBottom: '32px' });
  score.textContent = `Faction : ${isGuardians ? 'Gardiens du Sceau' : 'Héritiers de la Rupture'}`;

  const btn = document.createElement('button');
  Object.assign(btn.style, {
    background: 'none', border: '1px solid rgba(255,255,255,0.3)',
    color: '#e8e0d0', padding: '12px 32px', fontSize: '14px',
    cursor: 'pointer', borderRadius: '4px', letterSpacing: '2px',
  });
  btn.textContent = 'RECOMMENCER';
  btn.addEventListener('click', () => location.reload());

  el.appendChild(title);
  el.appendChild(sub);
  el.appendChild(score);
  el.appendChild(btn);
  document.body.appendChild(el);
}

export function updateFinalBoss(dt) {
  if (!_boss?.isAlive) return;

  const player = getPlayerRoot();
  if (!player) return;

  _boss.aiTimer += dt;
  if (_boss.aiTimer < 1 / 30) return;
  const adt = _boss.aiTimer;
  _boss.aiTimer = 0;

  const dx   = player.position.x - _boss.root.position.x;
  const dz   = player.position.z - _boss.root.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const vel  = _boss.body.linvel();
  const spd  = DEF.speed[_boss.phase] ?? DEF.speed[0];
  const dmg  = DEF.damage[_boss.phase] ?? DEF.damage[0];

  if (dist > DEF.r * 2.5) {
    const len = dist;
    _boss.body.setLinvel({ x: (dx / len) * spd, y: vel.y, z: (dz / len) * spd }, true);
    _boss.root.rotation.y = Math.atan2(dx, dz);
  } else {
    _boss.body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    _boss.attackTimer -= adt;
    if (_boss.attackTimer <= 0) {
      _boss.attackTimer = Math.max(0.5, 1.2 - _boss.phase * 0.2);
      takeDamage(dmg, 'final_boss');
      Events.emit('boss:attack', { act: 5 });
    }
  }

  // Phase 3 — attaque en zone (dégâts périodiques si proche)
  if (_boss.phase >= 2) {
    _boss.zoneTimer -= adt;
    if (_boss.zoneTimer <= 0) {
      _boss.zoneTimer = 3.0;
      if (dist < 15) {
        takeDamage(30, 'zone');
        Events.emit('loot:picked', { itemId: '💥 Aura du Gutter God !' });
      }
    }
  }

  // Sync terrain
  const t = _boss.body.translation();
  const ty = getTerrainHeight(t.x, t.z);
  _boss.body.setTranslation({ x: t.x, y: ty + _boss.halfH + DEF.r, z: t.z }, true);
  _boss.root.position.set(t.x, ty + _boss.halfH + DEF.r, t.z);

  // Rotation lente
  _boss.root.rotation.y += adt * 0.5;
}

export function getFinalBoss() { return _boss; }
