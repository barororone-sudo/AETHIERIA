// world/babylonWorldMutations.js
// Lightweight, cumulative world mutations driven by act changes and narrative
// world-state flags. All meshes are static and frozen after spawn.

import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';
import { getCurrentAct, getWorldSnapshot } from '../persistence/worldStateManager.js';
import { Events } from '../core/events.js';

const _mutations = [];
const _spawnedKeys = new Set();
const _materials = new Map();
let _scene = null;

const ACT_MUTATION_DEFS = {
  1: [
    { type: 'tower', x: 40, z: 40, color: [0.30, 0.20, 0.10], h: 8, r: 1.2 },
    { type: 'tower', x: -35, z: 30, color: [0.30, 0.20, 0.10], h: 6, r: 1.0 },
    { type: 'ruin', x: 20, z: -30, color: [0.40, 0.30, 0.20], h: 2, r: 3.0, rot: 0.55 },
  ],
  2: [
    { type: 'tower', x: 80, z: 60, color: [0.40, 0.25, 0.10], h: 12, r: 1.5 },
    { type: 'ruin', x: -60, z: -40, color: [0.35, 0.20, 0.10], h: 3, r: 4.0, rot: 0.35 },
    { type: 'pillar', x: 50, z: -50, color: [0.50, 0.30, 0.10], h: 5, r: 0.8 },
  ],
  3: [
    { type: 'root', x: -20, z: 60, color: [0.10, 0.30, 0.10], h: 4, r: 0.5, rot: -0.25 },
    { type: 'root', x: 30, z: 70, color: [0.10, 0.25, 0.10], h: 3, r: 0.4, rot: 0.25 },
    { type: 'altar', x: 0, z: 80, color: [0.20, 0.50, 0.20], h: 1.5, r: 2.5, emissive: 0.15 },
  ],
};

const FLAG_MUTATION_DEFS = {
  A1_LUMEN_WATER_HINT: [
    { type: 'water-glow', x: 8, z: 8, color: [0.20, 0.65, 1.00], h: 0.05, r: 5.0, emissive: 0.75 },
    { type: 'water-glow', x: -24, z: 28, color: [0.20, 0.65, 1.00], h: 0.05, r: 4.0, emissive: 0.65 },
  ],
  SKY_DOME_FIRST_CRACK: [
    { type: 'divine-shard', x: 35, z: 35, color: [0.80, 0.55, 1.00], h: 10, r: 0.8, emissive: 0.35, rot: 0.30 },
    { type: 'divine-shard', x: 72, z: 48, color: [0.75, 0.45, 1.00], h: 14, r: 1.0, emissive: 0.45, rot: -0.20 },
    { type: 'gravity-ring', x: 35, z: 35, color: [0.35, 0.75, 1.00], h: 0.05, r: 5.5, emissive: 0.55 },
    { type: 'fracture-ruin', x: 64, z: 20, color: [0.45, 0.36, 0.55], h: 3, r: 4.0, emissive: 0.10, rot: 0.80 },
  ],
  A1_ASH_GUARDIAN_DEFEATED: [
    { type: 'altar', x: 72, z: 48, color: [0.90, 0.72, 0.35], h: 1.3, r: 2.7, emissive: 0.35 },
  ],
  A2_IRONRAIN_STARTED: [
    { type: 'iron-spike', x: 90, z: 55, color: [0.55, 0.32, 0.18], h: 8, r: 0.45, rot: -0.30 },
    { type: 'iron-spike', x: 105, z: 60, color: [0.50, 0.28, 0.16], h: 13, r: 0.60, rot: 0.15 },
    { type: 'iron-spike', x: 120, z: 35, color: [0.48, 0.27, 0.15], h: 9, r: 0.45, rot: 0.35 },
  ],
  A2_LIGHTWATER_CONDUCTIVE: [
    { type: 'water-glow', x: 72, z: 86, color: [0.15, 0.90, 1.00], h: 0.05, r: 6.5, emissive: 0.95 },
    { type: 'conductive-pillar', x: 105, z: 60, color: [0.20, 0.80, 1.00], h: 5, r: 0.5, emissive: 0.45 },
  ],
  A2_RELAY_BLADES_ON: [
    { type: 'blade-arch', x: 120, z: 35, color: [0.58, 0.45, 0.35], h: 6, r: 2.2, emissive: 0.08 },
    { type: 'bridge', x: 126, z: 40, color: [0.42, 0.30, 0.23], h: 0.5, r: 8.0, rot: 0.55 },
  ],
  A2_UPPER_WORLD_SIGNAL_CONFIRMED: [
    { type: 'signal-spire', x: 88, z: -36, color: [0.75, 0.88, 1.00], h: 16, r: 0.65, emissive: 0.65 },
  ],
  A2_RELAY_DEAD_THUNDER_ON: [
    { type: 'thunder-coil', x: 132, z: -60, color: [0.45, 0.70, 1.00], h: 6, r: 3.0, emissive: 0.50 },
  ],
  A2_IRON_COLOSSUS_DEFEATED: [
    { type: 'colossus-memory', x: 166, z: 78, color: [0.70, 0.55, 0.42], h: 5, r: 4.0, emissive: 0.18, rot: -0.35 },
    { type: 'root', x: 30, z: 70, color: [0.18, 0.48, 0.24], h: 6, r: 0.75, emissive: 0.15, rot: 0.35 },
  ],
};

export function initWorldMutations(scene) {
  _scene = scene;
  Events.on('act:changed', ({ act }) => _applyMutationsUpTo(act));
  Events.on('world:flagSet', ({ key, value }) => {
    if (value) _applyFlagMutations(key);
  });

  _applyMutationsUpTo(getCurrentAct());
  const snapshot = getWorldSnapshot();
  for (const [key, value] of Object.entries(snapshot.flags ?? {})) {
    if (value) _applyFlagMutations(key);
  }
}

export function getWorldMutationDebug() {
  return {
    spawned: _mutations.length,
    keys: Array.from(_spawnedKeys),
  };
}

function _applyMutationsUpTo(act) {
  for (let a = 1; a <= act; a++) {
    const defs = ACT_MUTATION_DEFS[a];
    if (!defs) continue;
    for (let i = 0; i < defs.length; i++) {
      _spawnMutation(defs[i], `act_${a}_${i}`);
    }
  }
}

function _applyFlagMutations(flag) {
  const defs = FLAG_MUTATION_DEFS[flag];
  if (!defs) return;
  for (let i = 0; i < defs.length; i++) {
    _spawnMutation({ ...defs[i], flag }, `flag_${flag}_${i}`);
  }
}

function _spawnMutation(def, key) {
  if (!_scene || _spawnedKeys.has(key)) return;

  const y = getTerrainHeight(def.x, def.z);
  let mesh = null;

  if (def.type === 'tower' || def.type === 'pillar' || def.type === 'conductive-pillar' || def.type === 'signal-spire') {
    mesh = MeshBuilder.CreateCylinder(key, {
      height: def.h, diameter: def.r * 2, tessellation: 6,
    }, _scene);
    mesh.position.set(def.x, y + def.h / 2, def.z);
  } else if (def.type === 'ruin' || def.type === 'fracture-ruin' || def.type === 'bridge' || def.type === 'colossus-memory') {
    mesh = MeshBuilder.CreateBox(key, {
      width: def.r * 2, height: def.h, depth: def.type === 'bridge' ? 2.0 : def.r * 1.5,
    }, _scene);
    mesh.position.set(def.x, y + def.h / 2, def.z);
    mesh.rotation.y = def.rot ?? 0;
  } else if (def.type === 'root') {
    mesh = MeshBuilder.CreateCylinder(key, {
      height: def.h, diameterTop: 0.1, diameterBottom: def.r * 2, tessellation: 5,
    }, _scene);
    mesh.position.set(def.x, y + def.h / 2, def.z);
    mesh.rotation.z = def.rot ?? 0;
  } else if (def.type === 'altar' || def.type === 'water-glow' || def.type === 'gravity-ring') {
    mesh = MeshBuilder.CreateCylinder(key, {
      height: def.h, diameter: def.r * 2, tessellation: def.type === 'gravity-ring' ? 32 : 16,
    }, _scene);
    mesh.position.set(def.x, y + def.h / 2 + 0.04, def.z);
  } else if (def.type === 'divine-shard' || def.type === 'iron-spike') {
    mesh = MeshBuilder.CreateCylinder(key, {
      height: def.h, diameterTop: 0.05, diameterBottom: def.r * 2, tessellation: 5,
    }, _scene);
    mesh.position.set(def.x, y + def.h / 2, def.z);
    mesh.rotation.z = def.rot ?? 0;
  } else if (def.type === 'blade-arch' || def.type === 'thunder-coil') {
    mesh = MeshBuilder.CreateTorus(key, {
      diameter: def.r * 2, thickness: 0.18, tessellation: 24,
    }, _scene);
    mesh.position.set(def.x, y + def.h, def.z);
    mesh.rotation.x = Math.PI / 2;
  }

  if (!mesh) return;

  mesh.material = _getMaterial(def);
  mesh.isPickable = true;
  mesh.checkCollisions = true;
  mesh.metadata = {
    ...mesh.metadata,
    cameraCollider: true,
    worldStateFlag: def.flag ?? null,
    worldMutation: true,
  };
  mesh.freezeWorldMatrix();

  _spawnedKeys.add(key);
  _mutations.push(mesh);
}

function _getMaterial(def) {
  const colorKey = `${def.color.join(',')}:${def.emissive ?? 0}`;
  if (_materials.has(colorKey)) return _materials.get(colorKey);

  const color = Color3.FromArray(def.color);
  const mat = new StandardMaterial(`worldMutation_${_materials.size}`, _scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  mat.emissiveColor = def.emissive ? color.scale(def.emissive) : Color3.Black();
  mat.freeze();
  _materials.set(colorKey, mat);
  return mat;
}

