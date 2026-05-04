// gameplay/babylonCombat.js

import { Vector3, Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { getPlayerRoot, getPlayerBody } from './babylonPlayerCharacter.js';
import { setIFrames, isDead }           from './babylonPlayerHealth.js';
import { getStamina, drainStamina }      from './babylonTraversal.js';
import { setTimeScale, getTimeScale }   from '../core/timeScale.js';
import { Events }                       from '../core/events.js';
import { CONFIG }                       from '../core/config.js';

// ── État combat ────────────────────────────────────────────────────────────
const _c = {
  target:          null,   // ennemi locké
  comboStep:       0,      // 0, 1, 2
  comboTimer:      0,      // fenêtre pour enchaîner
  attackCooldown:  0,      // délai entre coups
  fatigueTimer:    0,      // pause après combo complet
  dodgeTimer:      0,      // cooldown dodge
  bulletActive:    false,
  bulletTimer:     0,
  blocking:        false,
  parryTimer:      0,
  parryCooldown:   0,
  parrySuccess:    false,
};

// Marqueur visuel lock-on (anneau autour de l'ennemi)
let _lockRing = null;
let _scene    = null;

// Source ennemis injectée depuis bootstrap
let _getEnemies = () => [];
export function setCombatEnemySource(fn) { _getEnemies = fn; }

// ── Init ───────────────────────────────────────────────────────────────────
export function initCombatInput(canvas, scene) {
  _scene = scene;

  window.addEventListener('keydown', e => {
    if (e.code === 'Tab')  { e.preventDefault(); _lockOn(); }
    if (e.code === 'KeyK') _dodge();
    if (e.code === 'KeyF') _startBlock();
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'KeyF') _stopBlock();
  });

  canvas.addEventListener('mousedown', e => {
    if (!document.pointerLockElement) return; // pointer lock requis
    if (e.button === 0) _attack();
    if (e.button === 2) _bulletTime();
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

// ── Lock-on ────────────────────────────────────────────────────────────────
function _lockOn() {
  // Déverrouiller si déjà locké
  if (_c.target) {
    _clearLock();
    return;
  }

  const root    = getPlayerRoot();
  if (!root) return;

  const enemies = _getEnemies();
  let   best    = null;
  let   bestD   = CONFIG.combat.lockOnRange;

  for (const e of enemies) {
    if (!e.isAlive || !e.root) continue;
    const d = Vector3.Distance(root.position, e.root.position);
    if (d < bestD) { bestD = d; best = e; }
  }

  if (!best) return;

  _c.target = best;

  // Créer l'anneau visuel autour de l'ennemi
  if (_scene) {
    _lockRing = MeshBuilder.CreateTorus('lock-ring', {
      diameter: 1.4, thickness: 0.06, tessellation: 24,
    }, _scene);
    _lockRing.parent    = best.root;
    _lockRing.position.y = 0;
    _lockRing.isPickable = false;
    const mat = new StandardMaterial('lock-mat', _scene);
    mat.emissiveColor   = new Color3(1, 0.85, 0);
    mat.disableLighting = true;
    _lockRing.material  = mat;
  }

  Events.emit('combat:lockOn', { target: best });
}

function _clearLock() {
  _c.target = null;
  _lockRing?.dispose();
  _lockRing = null;
  Events.emit('combat:lockOff', {});
}

// ── Attaque ────────────────────────────────────────────────────────────────
function _attack() {
  if (isDead() || _c.attackCooldown > 0 || _c.fatigueTimer > 0) return;

  const root = getPlayerRoot();
  if (!root) return;

  const cfg = CONFIG.combat;

  // Avancer le combo
  if (_c.comboTimer > 0) {
    _c.comboStep = (_c.comboStep + 1) % cfg.comboDamage.length;
  } else {
    _c.comboStep = 0;
  }
  _c.comboTimer    = cfg.comboWindow;
  _c.attackCooldown = 0.30;

  const dmg = cfg.comboDamage[_c.comboStep];

  // Feedback visuel combo sur le HUD
  Events.emit('combat:comboStep', { step: _c.comboStep, dmg });

  // Déterminer les cibles
  const enemies = _getEnemies();
  let   hits    = [];

  if (_c.target?.isAlive) {
    // Avec lock-on : distance horizontale seulement (ignore différence Y)
    const dx = _c.target.root.position.x - root.position.x;
    const dz = _c.target.root.position.z - root.position.z;
    const dHoriz = Math.sqrt(dx * dx + dz * dz);
    if (dHoriz <= cfg.attackRange * 2.5) hits = [_c.target];
  } else {
    // Sans lock-on : cône devant, distance horizontale
    hits = enemies.filter(e => {
      if (!e.isAlive || !e.root) return false;
      const dx = e.root.position.x - root.position.x;
      const dz = e.root.position.z - root.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (d > cfg.attackRange) return false;
      const forward = new Vector3(-Math.sin(root.rotation.y), 0, -Math.cos(root.rotation.y));
      const toEnemy = new Vector3(dx, 0, dz).normalize();
      return Vector3.Dot(toEnemy, forward) > 0.2;
    });
  }

  for (const e of hits) {
    e.takeDamage?.(dmg);
    Events.emit('combat:hit', { target: e, damage: dmg, step: _c.comboStep });
  }

  // Pas de hit — flash blanc pour indiquer l'attaque quand même
  if (hits.length === 0) {
    Events.emit('combat:miss', { step: _c.comboStep });
  }

  // Fatigue après combo complet (3e coup)
  if (_c.comboStep === cfg.comboDamage.length - 1) {
    _c.fatigueTimer = cfg.fatigueDuration;
    _c.comboStep    = 0;
    _c.comboTimer   = 0;
  }
}

// ── Dodge ──────────────────────────────────────────────────────────────────
function _dodge() {
  if (isDead() || _c.dodgeTimer > 0) return;
  if (getStamina() < CONFIG.combat.dodgeStaminaCost) return;

  const body = getPlayerBody();
  const root = getPlayerRoot();
  if (!body || !root) return;

  const vel = body.linvel();
  const len = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  // Direction : mouvement actuel ou arrière si immobile
  const dx = len > 0.5 ? vel.x / len : -Math.sin(root.rotation.y);
  const dz = len > 0.5 ? vel.z / len : -Math.cos(root.rotation.y);

  body.setLinvel({ x: dx * 11, y: 0.8, z: dz * 11 }, true);
  setIFrames(CONFIG.combat.iFrameDuration);
  _c.dodgeTimer = 0.55;

  Events.emit('combat:dodge', {});
}

// ── Block / Parry ──────────────────────────────────────────────────────────
function _startBlock() {
  if (isDead() || _c.blocking) return;
  _c.blocking = true;
  if (_c.parryCooldown <= 0) {
    _c.parryTimer = CONFIG.combat.parryWindow;
  }
  Events.emit('combat:block', { active: true });
}

function _stopBlock() {
  if (!_c.blocking) return;
  _c.blocking     = false;
  _c.parryTimer   = 0;
  _c.parrySuccess = false;
  Events.emit('combat:block', { active: false });
}

export function processIncomingDamage(rawDamage) {
  if (!_c.blocking) return { damage: rawDamage, blocked: false, parried: false };

  if (_c.parryTimer > 0) {
    _c.parrySuccess  = true;
    _c.parryTimer    = 0;
    _c.parryCooldown = CONFIG.combat.parryCooldown;
    Events.emit('combat:parry', { damage: rawDamage });
    return { damage: 0, blocked: false, parried: true };
  }

  const staminaCost = CONFIG.combat.blockStaminaDrain;
  if (getStamina() < staminaCost) {
    _stopBlock();
    return { damage: rawDamage, blocked: false, parried: false };
  }

  drainStamina(staminaCost);
  const reduced = Math.round(rawDamage * (1 - CONFIG.combat.blockDamageReduction));
  Events.emit('combat:blocked', { rawDamage, reducedDamage: reduced });
  return { damage: reduced, blocked: true, parried: false };
}

// ── Bullet-time ────────────────────────────────────────────────────────────
function _bulletTime() {
  if (isDead()) return;
  if (_c.bulletActive) {
    _stopBulletTime();
    return;
  }
  _c.bulletActive = true;
  _c.bulletTimer  = CONFIG.combat.bulletTimeDuration;

  setTimeScale(CONFIG.combat.bulletTimeScale);

  Events.emit('combat:bulletTime', { active: true });
}

function _stopBulletTime() {
  _c.bulletActive = false;
  _c.bulletTimer  = 0;
  setTimeScale(1.0);
  Events.emit('combat:bulletTime', { active: false });
}

// ── Update ─────────────────────────────────────────────────────────────────
export function updateCombat(dt) {
  if (_c.comboTimer    > 0) _c.comboTimer    -= dt;
  if (_c.attackCooldown> 0) _c.attackCooldown -= dt;
  if (_c.fatigueTimer  > 0) _c.fatigueTimer  -= dt;
  if (_c.dodgeTimer    > 0) _c.dodgeTimer    -= dt;
  if (_c.parryTimer    > 0) _c.parryTimer    -= dt;
  if (_c.parryCooldown > 0) _c.parryCooldown -= dt;

  // Bullet-time timeout
  if (_c.bulletActive) {
    _c.bulletTimer -= dt / getTimeScale();
    if (_c.bulletTimer <= 0) _stopBulletTime();
  }

  // Faire tourner l'anneau lock-on
  if (_lockRing) _lockRing.rotation.y += dt * 2;

  // Vérifier validité de la cible lockée
  if (_c.target) {
    const root = getPlayerRoot();
    if (root) {
      const dx = _c.target.root.position.x - root.position.x;
      const dz = _c.target.root.position.z - root.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (!_c.target.isAlive || d > CONFIG.combat.lockBreakRange) _clearLock();
    } else if (!_c.target.isAlive) {
      _clearLock();
    }
  }
}

export function getLockedTarget() { return _c.target;       }
export function isInBulletTime()  { return _c.bulletActive; }
export function getComboStep()    { return _c.comboStep;    }
export function isBlocking()      { return _c.blocking;     }
export function isParryActive()   { return _c.parryTimer > 0; }
