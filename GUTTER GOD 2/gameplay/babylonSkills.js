import { Vector3 } from '@babylonjs/core';
import { getPlayerRoot, getPlayerBody } from './babylonPlayerCharacter.js';
import { isDead } from './babylonPlayerHealth.js';
import { getStamina, drainStamina } from './babylonTraversal.js';
import { Events } from '../core/events.js';
import { CONFIG } from '../core/config.js';

let _getEnemies = () => [];
let _cooldowns = {};

export function initSkills(enemySourceFn) {
  _getEnemies = enemySourceFn;
  for (const id of Object.keys(CONFIG.combat.skills)) {
    _cooldowns[id] = 0;
  }
}

export function initSkillInput() {
  window.addEventListener('keydown', e => {
    const skills = CONFIG.combat.skills;
    for (const [id, cfg] of Object.entries(skills)) {
      if (e.code === cfg.key) { e.preventDefault(); _useSkill(id); return; }
    }
  });
}

function _useSkill(id) {
  if (isDead()) return;
  const cfg = CONFIG.combat.skills[id];
  if (!cfg) return;
  if (_cooldowns[id] > 0) {
    Events.emit('skill:cooldown', { id, remaining: _cooldowns[id] });
    return;
  }
  if (getStamina() < cfg.staminaCost) {
    Events.emit('skill:noStamina', { id });
    return;
  }

  drainStamina(cfg.staminaCost);
  _cooldowns[id] = cfg.cooldown;

  switch (id) {
    case 'heavyStrike': _heavyStrike(cfg); break;
    case 'dashSlash':   _dashSlash(cfg);   break;
    case 'shockwave':   _shockwave(cfg);   break;
  }

  Events.emit('skill:used', { id, cooldown: cfg.cooldown });
}

function _heavyStrike(cfg) {
  const root = getPlayerRoot();
  if (!root) return;

  const enemies = _getEnemies();
  const forward = new Vector3(-Math.sin(root.rotation.y), 0, -Math.cos(root.rotation.y));

  const hits = enemies.filter(e => {
    if (!e.isAlive || !e.root) return false;
    const dx = e.root.position.x - root.position.x;
    const dz = e.root.position.z - root.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > cfg.range) return false;
    const toEnemy = new Vector3(dx, 0, dz).normalize();
    return Vector3.Dot(toEnemy, forward) > 0.3;
  });

  for (const e of hits) {
    e.takeDamage?.(cfg.damage);
    Events.emit('combat:hit', { target: e, damage: cfg.damage, skill: 'heavyStrike' });
  }

  Events.emit('skill:heavyStrike', { hits: hits.length });
}

function _dashSlash(cfg) {
  const root = getPlayerRoot();
  const body = getPlayerBody();
  if (!root || !body) return;

  const forward = new Vector3(-Math.sin(root.rotation.y), 0, -Math.cos(root.rotation.y));
  body.setLinvel({ x: forward.x * cfg.dashSpeed, y: 1.0, z: forward.z * cfg.dashSpeed }, true);

  setTimeout(() => {
    const enemies = _getEnemies();
    const pos = root.position;
    const hits = enemies.filter(e => {
      if (!e.isAlive || !e.root) return false;
      const d = Vector3.Distance(pos, e.root.position);
      return d <= cfg.range;
    });
    for (const e of hits) {
      e.takeDamage?.(cfg.damage);
      Events.emit('combat:hit', { target: e, damage: cfg.damage, skill: 'dashSlash' });
    }
    Events.emit('skill:dashSlash', { hits: hits.length });
  }, cfg.dashDuration * 1000);
}

function _shockwave(cfg) {
  const root = getPlayerRoot();
  if (!root) return;

  const enemies = _getEnemies();
  const hits = enemies.filter(e => {
    if (!e.isAlive || !e.root) return false;
    return Vector3.Distance(root.position, e.root.position) <= cfg.radius;
  });

  for (const e of hits) {
    e.takeDamage?.(cfg.damage);
    if (e.body) {
      const dx = e.root.position.x - root.position.x;
      const dz = e.root.position.z - root.position.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      e.body.setLinvel({ x: (dx / len) * 8, y: 5, z: (dz / len) * 8 }, true);
    }
    Events.emit('combat:hit', { target: e, damage: cfg.damage, skill: 'shockwave' });
  }

  Events.emit('skill:shockwave', { hits: hits.length });
}

export function updateSkills(dt) {
  for (const id of Object.keys(_cooldowns)) {
    if (_cooldowns[id] > 0) _cooldowns[id] -= dt;
  }
}

export function getSkillCooldowns() {
  const result = {};
  const skills = CONFIG.combat.skills;
  for (const [id, cfg] of Object.entries(skills)) {
    result[id] = {
      remaining: Math.max(0, _cooldowns[id] ?? 0),
      total: cfg.cooldown,
      ready: (_cooldowns[id] ?? 0) <= 0,
      label: cfg.label,
      key: cfg.key.replace('Digit', ''),
    };
  }
  return result;
}
