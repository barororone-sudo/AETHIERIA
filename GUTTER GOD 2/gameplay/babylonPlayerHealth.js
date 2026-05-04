// gameplay/babylonPlayerHealth.js — HP, dégâts, mort, respawn

import { Events } from '../core/events.js';
import { CONFIG } from '../core/config.js';

const _hp = { current: CONFIG.player.maxHp, max: CONFIG.player.maxHp };
let _iFrameTimer  = 0;
let _isDead       = false;
let _onRespawn    = null;
let _damageFilter = null;

export function setDamageFilter(fn) { _damageFilter = fn; }

export function initPlayerHealth(onRespawnFn) {
  _onRespawn      = onRespawnFn;
  _hp.current     = CONFIG.player.maxHp;
  _hp.max         = CONFIG.player.maxHp;
  _isDead         = false;
  _iFrameTimer    = 0;
}

export function takeDamage(amount, source = 'enemy') {
  if (_isDead) return;
  if (_iFrameTimer > 0) return;

  const result = _damageFilter ? _damageFilter(amount) : { damage: amount, blocked: false, parried: false };

  if (result.parried) {
    Events.emit('player:parried', { rawDamage: amount, source });
    return;
  }

  _hp.current = Math.max(0, _hp.current - result.damage);
  Events.emit('player:damaged', {
    amount: result.damage,
    rawAmount: amount,
    blocked: result.blocked,
    source,
    hp: _hp.current,
  });

  if (_hp.current <= 0) {
    _isDead = true;
    Events.emit('player:died', {});
  }
}

export function heal(amount) {
  if (_isDead) return;
  _hp.current = Math.min(_hp.max, _hp.current + amount);
}

export function setIFrames(duration) {
  _iFrameTimer = duration ?? CONFIG.combat.iFrameDuration;
}

export function setMaxHp(max) {
  _hp.max     = max;
  _hp.current = Math.min(_hp.current, max);
}

export function updateHealth(dt) {
  if (_iFrameTimer > 0) _iFrameTimer -= dt;
}

export function respawnPlayer(healthRatio = 0.5) {
  const ratio = Math.max(0.1, Math.min(1, Number(healthRatio ?? 0.5)));
  _isDead     = false;
  _hp.current = Math.max(1, Math.floor(_hp.max * ratio));
  _iFrameTimer = 0;
  Events.emit('player:respawned', { hp: _hp.current, max: _hp.max });
  _onRespawn?.();
}

export function setCurrentHp(value) {
  const next = Math.max(0, Math.min(_hp.max, Number(value ?? _hp.current)));
  _hp.current = next;
  _isDead = next <= 0;
}

export function getHp()     { return { ..._hp }; }
export function isDead()    { return _isDead; }
export function hasIFrames(){ return _iFrameTimer > 0; }
