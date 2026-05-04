// gameplay/babylonPlayerCharacter.js

import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { createDynamicCapsule } from '../engine/babylon/physics.js';
import { getShadowGenerator }   from '../engine/babylon/lighting.js';
import { setCameraTarget }      from '../engine/babylon/camera.js';
import { CONFIG }               from '../core/config.js';

let _root  = null;
let _body  = null;

// Hauteur totale capsule Rapier = 2*halfH + 2*radius
// Centre Rapier = milieu géométrique
// Mesh Babylon CreateCapsule : origine = centre aussi
// → pas d'offset Y nécessaire, on copie directement

export async function initPlayerCharacter(scene, spawnPos) {
  // Mesh visuel
  _root = MeshBuilder.CreateCapsule('player', {
    radius:       CONFIG.player.radius,
    height:       CONFIG.player.height,
    subdivisions: 2,
    tessellation: 8,
  }, scene);

  const mat = new StandardMaterial('player-mat', scene);
  mat.diffuseColor  = new Color3(0.25, 0.55, 1.0);
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  _root.material    = mat;
  _root.position.copyFrom(spawnPos);
  _root.isPickable  = false;
  getShadowGenerator()?.addShadowCaster(_root);

  // Corps Rapier
  // halfHeight pour Rapier = (hauteur totale / 2) - radius
  const halfH = CONFIG.player.height / 2 - CONFIG.player.radius;
  _body = createDynamicCapsule(
    spawnPos.x, spawnPos.y, spawnPos.z,
    CONFIG.player.radius, halfH,
  );

  // Friction maximale sur le sol pour éviter le glissement
  // (géré dans physics.js via setFriction)

  setCameraTarget(_root.position);
  return { root: _root, body: _body };
}

export function getPlayerRoot() { return _root; }
export function getPlayerBody() { return _body; }
export function getPlayerAnim() { return null;  }

export function syncPlayerMeshToPhysics() {
  if (!_root || !_body) return;
  const t = _body.translation();
  // Centre Rapier = centre mesh → copie directe
  _root.position.set(t.x, t.y, t.z);
}
