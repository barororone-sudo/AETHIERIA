// engine/babylon/physicsAdapter.js — query layer for camera/ground physics.
// Keeps gameplay code independent from the concrete backend (Rapier now, Havok later).

import { Ray, Vector3 } from '@babylonjs/core';
import { getTerrainGroundAt, isTerrainCollider } from '../../world/babylonTerrain.js';

let _scene = null;

const _cameraRayOrigin = new Vector3();
const _cameraRayDir = new Vector3(0, 0, 1);
const _cameraRay = new Ray(_cameraRayOrigin, _cameraRayDir, 1);

const _groundResult = {
  hit: false,
  y: 0,
  normal: null,
  source: 'height-function',
  distance: 0,
};

const _debug = {
  groundY: 0,
  groundSource: 'none',
  cameraHit: false,
  cameraHitDistance: 0,
  cameraHitMesh: '',
};

export function initPhysicsAdapter(scene) {
  _scene = scene;
}

export function raycastGround(x, z, options = {}) {
  const result = getTerrainGroundAt(_scene, x, z, {
    rayStartY: options.rayStartY,
    rayLength: options.rayLength,
    result: options.result ?? _groundResult,
  });

  _debug.groundY = result.y;
  _debug.groundSource = result.source;
  return result;
}

export function raycastCameraCollision(origin, direction, maxDistance, predicate = _defaultCameraPredicate) {
  if (!_scene) return null;

  _cameraRayOrigin.copyFrom(origin);
  _cameraRayDir.copyFrom(direction);
  _cameraRay.length = maxDistance;

  const hit = _scene.pickWithRay(_cameraRay, predicate, true);
  const hasHit = Boolean(hit?.hit);

  _debug.cameraHit = hasHit;
  _debug.cameraHitDistance = hasHit ? hit.distance : 0;
  _debug.cameraHitMesh = hasHit ? hit.pickedMesh?.name ?? '' : '';

  return hasHit ? hit : null;
}

export function getPhysicsQueryDebug() {
  return { ..._debug };
}

function _defaultCameraPredicate(mesh) {
  if (!mesh || mesh.isDisposed?.() || !mesh.isEnabled?.()) return false;
  if (mesh.name === 'player' || mesh.metadata?.player) return false;
  return isTerrainCollider(mesh) || mesh.metadata?.cameraCollider === true || mesh.checkCollisions === true;
}
