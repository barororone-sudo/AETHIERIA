// engine/babylon/physics.js — bridge Rapier

import * as RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../../core/config.js';

let _world  = null;
let _rapier = null;

export async function initPhysics() {
  await RAPIER.init();
  _rapier = RAPIER;

  _world = new RAPIER.World({ x: 0, y: CONFIG.physics.gravity, z: 0 });

  return _world;
}

export function stepPhysics() {
  _world?.step();
}

export function getWorld()  { return _world;  }
export function getRapier() { return _rapier; }

// ── Helpers création de corps ──────────────────────────────────────────────

export function createStaticBox(x, y, z, hw, hh, hd) {
  const desc = _rapier.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const body = _world.createRigidBody(desc);
  const col  = _rapier.ColliderDesc.cuboid(hw, hh, hd);
  _world.createCollider(col, body);
  return body;
}

export function createDynamicCapsule(x, y, z, radius, halfHeight) {
  const desc = _rapier.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z)
    .lockRotations(); // empêche le joueur de tomber
  const body = _world.createRigidBody(desc);
  const col  = _rapier.ColliderDesc.capsule(halfHeight, radius)
    .setFriction(0.0)        // friction gérée manuellement dans traversal
    .setRestitution(0.0);    // pas de rebond
  _world.createCollider(col, body);
  return body;
}

export function createKinematicCapsule(x, y, z, radius, halfHeight) {
  const desc = _rapier.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(x, y, z);
  const body = _world.createRigidBody(desc);
  const col  = _rapier.ColliderDesc.capsule(halfHeight, radius);
  _world.createCollider(col, body);
  return body;
}
