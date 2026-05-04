// persistence/checkpoints.js — checkpoints simples (position, acte, timestamp)

const CHECKPOINT_KEY = 'gg2.lastCheckpoint';

let _lastCheckpoint = null;
let _accumTime = 0;
let _lastSavedPos = null;

function _distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function _toCheckpoint(position, act) {
  return {
    x: Number(position.x),
    y: Number(position.y),
    z: Number(position.z),
    act: Number(act ?? 1),
    timestamp: Date.now(),
  };
}

function _persist(checkpoint) {
  _lastCheckpoint = checkpoint;
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

export function initCheckpoints() {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    _lastCheckpoint = raw ? JSON.parse(raw) : null;
  } catch {
    _lastCheckpoint = null;
  }
  _accumTime = 0;
  _lastSavedPos = _lastCheckpoint ? { x: _lastCheckpoint.x, y: _lastCheckpoint.y, z: _lastCheckpoint.z } : null;
}

export function clearCheckpoints() {
  _lastCheckpoint = null;
  _lastSavedPos = null;
  _accumTime = 0;
  localStorage.removeItem(CHECKPOINT_KEY);
}

export function getLastCheckpoint() {
  return _lastCheckpoint ? { ..._lastCheckpoint } : null;
}

export function saveCheckpoint(position, act) {
  if (!position) return null;
  const next = _toCheckpoint(position, act);
  _persist(next);
  _lastSavedPos = { x: next.x, y: next.y, z: next.z };
  return next;
}

export function tickCheckpointAuto(dt, position, act, options = {}) {
  if (!position) return null;

  const minSeconds = Number(options.minSeconds ?? 10);
  const minDistance = Number(options.minDistance ?? 16);
  const minDistanceSq = minDistance * minDistance;

  _accumTime += dt;
  if (_accumTime < minSeconds) return null;

  if (_lastSavedPos && _distanceSq(position, _lastSavedPos) < minDistanceSq) {
    return null;
  }

  _accumTime = 0;
  return saveCheckpoint(position, act);
}
