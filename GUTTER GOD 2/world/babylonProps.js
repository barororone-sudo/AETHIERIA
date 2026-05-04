// world/babylonProps.js — props procéduraux légers (primitives Babylon)
// Les glTF seront réactivés en Phase 5 après optimisation LOD

import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { CONFIG }          from '../core/config.js';
import { getTerrainHeight } from './babylonTerrain.js';

// ── Templates de props par type ────────────────────────────────────────────
// Un seul mesh source par type, cloné en instances

const _templates = {}; // type → mesh source
const _chunks    = new Map(); // clé → [instances]

const PROP_TYPES = {
  // grassland
  tree:     { color: new Color3(0.15, 0.45, 0.12), h: 3.0, r: 0.25, type: 'tree'   },
  bush:     { color: new Color3(0.20, 0.55, 0.18), h: 0.8, r: 0.55, type: 'sphere' },
  rock:     { color: new Color3(0.45, 0.42, 0.38), h: 0.6, r: 0.50, type: 'box'    },
  mushroom: { color: new Color3(0.75, 0.25, 0.20), h: 0.5, r: 0.20, type: 'sphere' },
  // ashlands / ironrain
  deadtree: { color: new Color3(0.30, 0.25, 0.20), h: 2.5, r: 0.18, type: 'tree'   },
  boulder:  { color: new Color3(0.35, 0.32, 0.30), h: 1.0, r: 0.80, type: 'box'    },
};

const BIOME_PROPS = {
  grassland:  ['tree','tree','bush','rock','mushroom'],
  ashlands:   ['deadtree','deadtree','boulder','rock'],
  ironrain:   ['deadtree','boulder','rock'],
  rootblight: ['deadtree','bush','mushroom','rock'],
  schism:     ['deadtree','boulder'],
};

const CAMERA_BLOCKING_TYPES = new Set(['tree', 'rock', 'deadtree', 'boulder']);

function _markCameraCollider(root, enabled = true) {
  if (!root) return;
  root.isPickable = enabled;
  root.checkCollisions = enabled;
  root.metadata = {
    ...(root.metadata ?? {}),
    cameraCollider: enabled,
    staticDecor: true,
  };
}

// ── Créer les templates une seule fois ────────────────────────────────────

function _getTemplate(typeName, scene) {
  if (_templates[typeName]) return _templates[typeName];

  const def = PROP_TYPES[typeName];
  let mesh;

  if (def.type === 'tree') {
    // Tronc + feuillage
    const trunk = MeshBuilder.CreateCylinder(`tpl_trunk_${typeName}`, {
      height: def.h, diameterTop: def.r * 0.4, diameterBottom: def.r,
      tessellation: 5,
    }, scene);
    const leaves = MeshBuilder.CreateSphere(`tpl_leaves_${typeName}`, {
      diameter: def.r * 5, segments: 4,
    }, scene);
    leaves.parent   = trunk;
    leaves.position.y = def.h * 0.7;

    const mT = new StandardMaterial(`tpl_mat_trunk_${typeName}`, scene);
    mT.diffuseColor = new Color3(0.35, 0.22, 0.12);
    mT.specularColor = Color3.Black();
    trunk.material  = mT;

    const mL = new StandardMaterial(`tpl_mat_leaves_${typeName}`, scene);
    mL.diffuseColor  = def.color;
    mL.specularColor = Color3.Black();
    leaves.material  = mL;

    trunk.setEnabled(false);
    trunk.isPickable = false;
    leaves.isPickable = false;
    mesh = trunk;

  } else if (def.type === 'sphere') {
    mesh = MeshBuilder.CreateSphere(`tpl_${typeName}`, {
      diameter: def.r * 2, segments: 4,
    }, scene);
    const m = new StandardMaterial(`tpl_mat_${typeName}`, scene);
    m.diffuseColor  = def.color;
    m.specularColor = Color3.Black();
    mesh.material   = m;
    mesh.setEnabled(false);
    mesh.isPickable = false;

  } else { // box
    mesh = MeshBuilder.CreateBox(`tpl_${typeName}`, {
      width: def.r * 2, height: def.h, depth: def.r * 1.5,
    }, scene);
    const m = new StandardMaterial(`tpl_mat_${typeName}`, scene);
    m.diffuseColor  = def.color;
    m.specularColor = Color3.Black();
    mesh.material   = m;
    mesh.setEnabled(false);
    mesh.isPickable = false;
  }

  _templates[typeName] = mesh;
  return mesh;
}

// ── RNG déterministe ───────────────────────────────────────────────────────

function _rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Spawn / despawn ────────────────────────────────────────────────────────

export function spawnChunkProps(cx, cz, biome, scene, densityScale = 1) {
  const key = `${cx}_${cz}`;
  if (_chunks.has(key)) return;

  const cs       = CONFIG.world.chunkSize;
  const count    = Math.max(6, Math.round(CONFIG.world.propsPerChunk * densityScale));
  const rng      = _rng(cx * 73856093 ^ cz * 19349663);
  const typeList = BIOME_PROPS[biome.name] ?? BIOME_PROPS.grassland;
  const instances = [];

  for (let i = 0; i < count; i++) {
    const typeName = typeList[Math.floor(rng() * typeList.length)];
    const tpl      = _getTemplate(typeName, scene);
    if (!tpl) continue;

    const lx = (rng() - 0.5) * cs;
    const lz = (rng() - 0.5) * cs;
    const wx = cx * cs + lx;
    const wz = cz * cs + lz;
    const wy = getTerrainHeight(wx, wz);

    const inst       = tpl.createInstance(`prop_${key}_${i}`);
    inst.position.set(wx, wy, wz);
    inst.rotation.y  = rng() * Math.PI * 2;
    const sc         = 0.7 + rng() * 0.6;
    inst.scaling.setAll(sc);
    if (CAMERA_BLOCKING_TYPES.has(typeName)) {
      _markCameraCollider(inst, true);
    } else {
      inst.isPickable = false;
    }
    instances.push(inst);
  }

  _chunks.set(key, instances);
}

export function despawnChunkProps(cx, cz) {
  const key = `${cx}_${cz}`;
  const insts = _chunks.get(key);
  if (!insts) return;
  insts.forEach(i => i.dispose());
  _chunks.delete(key);
}
