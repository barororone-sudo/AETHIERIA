// world/babylonGrass.js — BotW / Genshin Impact stylized grass system
// GPU thin-instanced cross-billboard grass. Static matrices (no per-frame update).
// Zone-aware density: lush in clearings, sparse in settlements/rocky areas.
// Wind baked as random lean. Iris Xe friendly.

import {
  MeshBuilder, Vector3, Matrix, Color3, Color4,
  StandardMaterial, Mesh, VertexBuffer,
} from '@babylonjs/core';
import { CONFIG }          from '../core/config.js';
import { getTerrainHeight } from './babylonTerrain.js';
import { getGrassDensityForZone } from './zoneMap.js';

// ── Config ────────────────────────────────────────────────────────────────
const GRASS_PER_CHUNK     = CONFIG.world.grassPerChunk || 250;
const CHUNK_SIZE          = CONFIG.world.chunkSize;
const BLADE_W             = 0.10;
const BLADE_H_MIN         = 0.25;
const BLADE_H_MAX         = 0.60;

// ── State ─────────────────────────────────────────────────────────────────
let _scene       = null;
let _grassMat    = null;
let _bladeMesh   = null;
const _chunks    = new Map();

// ── Biome grass palettes ─────────────────────────────────────────────────
const BIOME_PALETTE = {
  grassland:  [
    [0.22, 0.55, 0.12], [0.30, 0.62, 0.15], [0.18, 0.48, 0.10],
    [0.35, 0.58, 0.20], [0.28, 0.50, 0.08],
  ],
  ashlands:   [[0.35, 0.28, 0.18], [0.40, 0.30, 0.15], [0.30, 0.25, 0.12]],
  ironrain:   [[0.20, 0.30, 0.22], [0.18, 0.28, 0.25], [0.15, 0.25, 0.20]],
  rootblight: [[0.15, 0.50, 0.20], [0.20, 0.55, 0.18], [0.12, 0.45, 0.25], [0.25, 0.60, 0.22]],
  schism:     [[0.25, 0.20, 0.15], [0.30, 0.22, 0.12]],
};

// ── Init ──────────────────────────────────────────────────────────────────

export function initGrass(scene) {
  _scene = scene;

  _grassMat = new StandardMaterial('grassMat', scene);
  _grassMat.diffuseColor  = new Color3(0.28, 0.55, 0.18);
  _grassMat.specularColor = Color3.Black();
  _grassMat.emissiveColor = new Color3(0.06, 0.12, 0.03);
  _grassMat.backFaceCulling = false;

  _bladeMesh = _createBladeTemplate(scene);
  console.log('[GRASS] Init OK (zone-aware)');
}

function _createBladeTemplate(scene) {
  const hw = BLADE_W / 2;
  const positions = [];
  const uvs = [];
  const indices = [];
  const colors = [];

  // 2 intersecting quads (cross-billboard)
  for (let q = 0; q < 2; q++) {
    const angle = (q * Math.PI) / 2; // 0° and 90°
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const bx = hw * cosA;
    const bz = hw * sinA;
    const base = q * 4;

    positions.push(
      -bx, 0, -bz,    bx, 0, bz,    bx, 1, bz,    -bx, 1, -bz,
    );
    uvs.push(0, 0,  1, 0,  1, 1,  0, 1);
    indices.push(
      base, base+1, base+2,  base, base+2, base+3,
      base, base+2, base+1,  base, base+3, base+2,
    );
    colors.push(
      0.5, 0.7, 0.3, 1,   0.5, 0.7, 0.3, 1,
      0.85, 0.95, 0.45, 1,  0.85, 0.95, 0.45, 1,
    );
  }

  const normals = new Float32Array(positions.length);
  for (let i = 0; i < positions.length / 3; i++) normals[i * 3 + 1] = 1;

  const blade = new Mesh('grassBlade', scene);
  blade.setVerticesData(VertexBuffer.PositionKind, new Float32Array(positions));
  blade.setVerticesData(VertexBuffer.UVKind, new Float32Array(uvs));
  blade.setVerticesData(VertexBuffer.NormalKind, normals);
  blade.setVerticesData(VertexBuffer.ColorKind, new Float32Array(colors));
  blade.setIndices(indices);
  blade.material = _grassMat;
  blade.isVisible = false;
  blade.isPickable = false;

  return blade;
}

// ── Chunk spawn / despawn — static matrices, zone-aware density ──────────

export function spawnChunkGrass(cx, cz, biomeName, densityScale = 1) {
  if (!_bladeMesh || !_scene) return;

  const key = `${cx}:${cz}`;
  if (_chunks.has(key)) return;

  const palette = BIOME_PALETTE[biomeName] || BIOME_PALETTE.grassland;

  // Sample zone density at chunk center for base count
  const chunkCenterX = (cx + 0.5) * CHUNK_SIZE;
  const chunkCenterZ = (cz + 0.5) * CHUNK_SIZE;
  const zoneDensity = getGrassDensityForZone(chunkCenterX, chunkCenterZ);

  const count = Math.max(10, Math.round(GRASS_PER_CHUNK * densityScale * zoneDensity));

  const rng = _rng(`grass_${cx}_${cz}`);

  // Pre-allocate for max count, we'll trim unused
  const matrices = new Float32Array(count * 16);
  const colors = new Float32Array(count * 4);
  let actual = 0;

  for (let i = 0; i < count; i++) {
    const px = cx * CHUNK_SIZE + rng() * CHUNK_SIZE;
    const pz = cz * CHUNK_SIZE + rng() * CHUNK_SIZE;

    // Skip immediate spawn pad (radius 3 around origin — not 12)
    if (px * px + pz * pz < 9) continue;

    // Per-blade zone density check — skip some blades in sparse zones
    const bladeDensity = getGrassDensityForZone(px, pz);
    if (rng() > bladeDensity) continue;

    const py = getTerrainHeight(px, pz);

    // Taller blades in clearings (lush), shorter in rocky/settlement
    const heightMult = bladeDensity > 0.8 ? 1.0 : 0.7 + bladeDensity * 0.3;
    const h = (BLADE_H_MIN + rng() * (BLADE_H_MAX - BLADE_H_MIN)) * heightMult;

    // Random rotation + baked wind lean
    const ry = rng() * Math.PI;
    const cosR = Math.cos(ry);
    const sinR = Math.sin(ry);
    const leanX = (rng() - 0.5) * 0.2; // baked wind lean
    const leanZ = (rng() - 0.5) * 0.15;

    const off = actual * 16;
    // Column-major 4x4 with shear for lean
    matrices[off + 0]  = h * cosR;
    matrices[off + 1]  = 0;
    matrices[off + 2]  = h * sinR;
    matrices[off + 3]  = 0;
    matrices[off + 4]  = leanX * h;  // shear X
    matrices[off + 5]  = h;
    matrices[off + 6]  = leanZ * h;  // shear Z
    matrices[off + 7]  = 0;
    matrices[off + 8]  = -h * sinR;
    matrices[off + 9]  = 0;
    matrices[off + 10] = h * cosR;
    matrices[off + 11] = 0;
    matrices[off + 12] = px;
    matrices[off + 13] = py;
    matrices[off + 14] = pz;
    matrices[off + 15] = 1;

    const col = palette[Math.floor(rng() * palette.length)];
    colors[actual * 4]     = col[0];
    colors[actual * 4 + 1] = col[1];
    colors[actual * 4 + 2] = col[2];
    colors[actual * 4 + 3] = 1.0;

    actual++;
  }

  if (actual === 0) return; // no grass in this chunk (e.g. settlement core)

  // Trim buffers to actual count
  const finalMatrices = actual < count ? matrices.slice(0, actual * 16) : matrices;
  const finalColors   = actual < count ? colors.slice(0, actual * 4) : colors;

  const chunkMesh = _bladeMesh.clone(`grass_${key}`);
  chunkMesh.makeGeometryUnique();
  chunkMesh.isVisible = true;
  chunkMesh.material = _grassMat;
  chunkMesh.isPickable = false;

  chunkMesh.thinInstanceSetBuffer('matrix', finalMatrices, 16, false);
  chunkMesh.thinInstanceSetBuffer('color', finalColors, 4, false);

  _chunks.set(key, chunkMesh);
}

export function despawnChunkGrass(cx, cz) {
  const key = `${cx}:${cz}`;
  const mesh = _chunks.get(key);
  if (!mesh) return;
  mesh.dispose();
  _chunks.delete(key);
}

// ── Update — no-op now (static grass) ─────────────────────────────────────

export function updateGrass(dt, playerPos) {
  // Static grass — nothing to update per frame
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _rng(seed) {
  let value = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function getGrassDebugState() {
  return { chunksActive: _chunks.size };
}
