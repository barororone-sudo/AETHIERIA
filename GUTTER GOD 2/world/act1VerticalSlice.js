// world/act1VerticalSlice.js
// Playable Act I vertical slice props: Auge-Basse well, lumen children site,
// and Nara's three cartography markers.

import {
  MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture,
} from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';
import { Events } from '../core/events.js';
import { spawnLore, spawnPickup } from '../gameplay/babylonInteraction.js';
import { getWorldSnapshot } from '../persistence/worldStateManager.js';

let _scene = null;
let _ready = false;

const _materials = new Map();
const _flagReactors = new Map();

const CARTOGRAPHY_MARKERS = [
  { id: 'north', x: 0, z: -50, label: 'Borne nord' },
  { id: 'east', x: 40, z: 40, label: 'Borne est' },
  { id: 'west', x: -60, z: -20, label: 'Borne ouest' },
];

export function initAct1VerticalSlice(scene) {
  if (_ready) return;
  _ready = true;
  _scene = scene;

  _spawnAugeBasseWell();
  _spawnChildrenLumenSite();
  _spawnCartographyMarkers();
  _spawnAct1LoreAndPickups();

  Events.on('world:flagSet', ({ key, value }) => {
    if (!value) return;
    _flagReactors.get(key)?.();
  });

  const snapshot = getWorldSnapshot();
  for (const [key, value] of Object.entries(snapshot.flags ?? {})) {
    if (value) _flagReactors.get(key)?.();
  }
}

export function getAct1VerticalSliceDebug() {
  const meshNames = _scene?.meshes?.map(m => m.name) ?? [];
  return {
    ready: _ready,
    markers: CARTOGRAPHY_MARKERS.map(m => m.id),
    hasWell: meshNames.includes('a1_well_base'),
    hasChildrenSite: meshNames.includes('a1_children_lumen_pool'),
    cartMarkerCount: meshNames.filter(n => n.startsWith('a1_cart_') && n.endsWith('_base')).length,
  };
}

function _spawnAugeBasseWell() {
  const x = 8;
  const z = 8;
  const y = getTerrainHeight(x, z);

  const base = MeshBuilder.CreateCylinder('a1_well_base', {
    height: 0.9, diameter: 3.2, tessellation: 12,
  }, _scene);
  base.position.set(x, y + 0.45, z);
  base.material = _mat('old-stone', [0.32, 0.30, 0.26]);
  _staticCollider(base);

  const rim = MeshBuilder.CreateTorus('a1_well_rim', {
    diameter: 3.2, thickness: 0.28, tessellation: 24,
  }, _scene);
  rim.position.set(x, y + 0.94, z);
  rim.material = _mat('old-stone-rim', [0.42, 0.38, 0.31]);
  _staticCollider(rim);

  const hole = MeshBuilder.CreateCylinder('a1_well_lumen_depth', {
    height: 0.08, diameter: 2.1, tessellation: 16,
  }, _scene);
  hole.position.set(x, y + 0.98, z);
  hole.material = _mat('well-depth', [0.02, 0.04, 0.06], [0.04, 0.16, 0.22]);
  _staticNoCollider(hole);

  const sign = _label('a1_well_label', 'Vieux puits', x, y + 2.6, z);
  _staticNoCollider(sign);

  _flagReactors.set('A1_WELL_REPAIRED', () => {
    hole.material = _mat('well-lumen-awake', [0.05, 0.25, 0.35], [0.08, 0.48, 0.75]);
  });
}

function _spawnChildrenLumenSite() {
  const x = -24;
  const z = 28;
  const y = getTerrainHeight(x, z);

  const pool = MeshBuilder.CreateCylinder('a1_children_lumen_pool', {
    height: 0.05, diameter: 5.5, tessellation: 24,
  }, _scene);
  pool.position.set(x, y + 0.05, z);
  pool.material = _mat('lumen-pool-dim', [0.05, 0.12, 0.16], [0.02, 0.12, 0.20]);
  _staticNoCollider(pool);

  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4;
    const orb = MeshBuilder.CreateSphere(`a1_child_lumen_orb_${i}`, {
      diameter: 0.32, segments: 8,
    }, _scene);
    orb.position.set(
      x + Math.cos(angle) * (1.1 + i * 0.28),
      y + 0.75 + i * 0.08,
      z + Math.sin(angle) * (1.1 + i * 0.28),
    );
    orb.material = _mat('lumen-orb-dim', [0.08, 0.32, 0.48], [0.05, 0.22, 0.34]);
    _staticNoCollider(orb);
  }

  const sign = _label('a1_children_label', 'Lueurs des enfants', x, y + 2.8, z);
  _staticNoCollider(sign);

  _flagReactors.set('A1_LUMEN_WATER_HINT', () => {
    pool.material = _mat('lumen-pool-awake', [0.08, 0.45, 0.85], [0.08, 0.55, 1.00]);
    for (const mesh of _scene.meshes) {
      if (mesh.name.startsWith('a1_child_lumen_orb_')) {
        mesh.material = _mat('lumen-orb-awake', [0.20, 0.65, 1.00], [0.18, 0.70, 1.00]);
      }
    }
  });
}

function _spawnCartographyMarkers() {
  for (const def of CARTOGRAPHY_MARKERS) {
    const y = getTerrainHeight(def.x, def.z);

    const base = MeshBuilder.CreateCylinder(`a1_cart_${def.id}_base`, {
      height: 0.5, diameter: 2.8, tessellation: 6,
    }, _scene);
    base.position.set(def.x, y + 0.25, def.z);
    base.material = _mat('cart-stone', [0.34, 0.33, 0.30]);
    _staticCollider(base);

    const pillar = MeshBuilder.CreateCylinder(`a1_cart_${def.id}_pillar`, {
      height: 3.2, diameterTop: 0.45, diameterBottom: 0.8, tessellation: 6,
    }, _scene);
    pillar.position.set(def.x, y + 2.1, def.z);
    pillar.material = _mat('cart-pillar', [0.42, 0.39, 0.34]);
    _staticCollider(pillar);

    const crystal = MeshBuilder.CreateSphere(`a1_cart_${def.id}_crystal`, {
      diameter: 0.65, segments: 8,
    }, _scene);
    crystal.position.set(def.x, y + 3.95, def.z);
    crystal.material = _mat('cart-crystal-dim', [0.12, 0.14, 0.18], [0.04, 0.06, 0.10]);
    _staticNoCollider(crystal);

    const ring = MeshBuilder.CreateTorus(`a1_cart_${def.id}_ring`, {
      diameter: 4.8, thickness: 0.08, tessellation: 24,
    }, _scene);
    ring.position.set(def.x, y + 0.08, def.z);
    ring.material = _mat('cart-ring', [0.18, 0.28, 0.36], [0.06, 0.16, 0.24]);
    _staticNoCollider(ring);

    const label = _label(`a1_cart_${def.id}_label`, def.label, def.x, y + 4.9, def.z);
    _staticNoCollider(label);
  }

  _flagReactors.set('A1_CARTOGRAPHY_TRIANGLE_ON', () => {
    for (const mesh of _scene.meshes) {
      if (mesh.name.includes('_crystal') && mesh.name.startsWith('a1_cart_')) {
        mesh.material = _mat('cart-crystal-awake', [0.25, 0.72, 1.00], [0.18, 0.62, 1.00]);
      }
      if (mesh.name.includes('_ring') && mesh.name.startsWith('a1_cart_')) {
        mesh.material = _mat('cart-ring-awake', [0.16, 0.50, 0.72], [0.10, 0.40, 0.70]);
      }
    }
  });
}

function _spawnAct1LoreAndPickups() {
  const h = getTerrainHeight;

  spawnLore(
    'Le puits ne descend pas vers une nappe naturelle. La pierre autour du conduit vibre comme une gorge qui respire.',
    new Vector3(9.8, h(9.8, 8.4) + 1.1, 8.4),
  );
  spawnLore(
    'Les dessins des enfants montrent tous la meme chose: un ciel avec une couture blanche.',
    new Vector3(-25.5, h(-25.5, 29) + 1.0, 29),
  );
  spawnPickup('lumen-sample', new Vector3(6, h(6, 9) + 0.5, 9));
}

function _label(name, text, x, y, z) {
  const plane = MeshBuilder.CreatePlane(name, { width: 3.4, height: 0.55 }, _scene);
  plane.position.set(x, y, z);
  plane.billboardMode = 7;
  plane.metadata = { ...plane.metadata, noFreeze: true };

  const tex = new DynamicTexture(`${name}_tex`, { width: 384, height: 64 }, _scene);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 384, 64);
  ctx.fillStyle = 'rgba(8,10,18,0.76)';
  ctx.fillRect(0, 0, 384, 64);
  ctx.fillStyle = '#8ddcff';
  ctx.font = 'bold 23px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, 192, 40);
  tex.update();

  const mat = new StandardMaterial(`${name}_mat`, _scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  plane.material = mat;
  return plane;
}

function _mat(key, diffuse, emissive = null) {
  const id = `${key}:${diffuse.join(',')}:${emissive?.join(',') ?? 'none'}`;
  if (_materials.has(id)) return _materials.get(id);

  const mat = new StandardMaterial(`act1_${key}_${_materials.size}`, _scene);
  mat.diffuseColor = Color3.FromArray(diffuse);
  mat.specularColor = Color3.Black();
  mat.emissiveColor = emissive ? Color3.FromArray(emissive) : Color3.Black();
  mat.freeze();
  _materials.set(id, mat);
  return mat;
}

function _staticCollider(mesh) {
  mesh.isPickable = true;
  mesh.checkCollisions = true;
  mesh.metadata = { ...mesh.metadata, cameraCollider: true, act1VerticalSlice: true };
  mesh.freezeWorldMatrix();
}

function _staticNoCollider(mesh) {
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.metadata = { ...mesh.metadata, act1VerticalSlice: true };
  if (!mesh.metadata.noFreeze) mesh.freezeWorldMatrix();
}
