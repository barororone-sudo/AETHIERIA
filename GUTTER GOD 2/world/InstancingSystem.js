// world/InstancingSystem.js — Mass GPU instancing for 10km+ worlds
// Manages thin instance buffers for props across all loaded chunks.
// Goal: 60 FPS on Iris Xe with thousands of visible instances.
//
// Architecture:
//   Template registry → per-chunk instance buffers → LOD distance culling
//   Each template = 1 draw call for ALL instances of that model across chunks.

import { Matrix, Vector3, Mesh } from '@babylonjs/core';
import { getTerrainHeight }      from './babylonTerrain.js';
import { CONFIG }                from '../core/config.js';

// ── Template registry ────────────────────────────────────────────────────
// template id → { mesh, instanceData: Map<chunkKey, Float32Array>, dirty }
const _templates = new Map();

// ── Chunk tracking ───────────────────────────────────────────────────────
const _chunkInstances = new Map();  // chunkKey → Set<templateId>

// ── Performance budgets ──────────────────────────────────────────────────
const MAX_INSTANCES_PER_TEMPLATE = 4000;  // cap per model type
const MAX_TOTAL_INSTANCES        = 15000; // global cap
const LOD_HIDE_DISTANCE          = 120;   // beyond this: don't instance at all
const LOD_REDUCE_DISTANCE        = 60;    // beyond this: skip 50% of instances

let _totalInstances = 0;
let _scene = null;
const _tmpMatrix = new Matrix();
const _tmpScale = new Vector3(1, 1, 1);
const _tmpPosition = new Vector3();

// ── Init ─────────────────────────────────────────────────────────────────

export function initInstancingSystem(scene) {
  _scene = scene;
  console.log('[InstancingSystem] Init — budget: ' +
    MAX_TOTAL_INSTANCES + ' instances, LOD hide @ ' + LOD_HIDE_DISTANCE + 'u');
}

// ── Register a mesh as an instancing template ────────────────────────────

export function registerTemplate(templateId, mesh) {
  if (_templates.has(templateId)) return;

  // Make the template invisible — only thin instances render
  mesh.isVisible = false;
  mesh.isPickable = false;

  // Ensure geometry is shareable
  if (!mesh.geometry) {
    console.warn(`[Instancing] Template ${templateId} has no geometry`);
    return;
  }

  _templates.set(templateId, {
    mesh,
    chunkData: new Map(),  // chunkKey → { matrices: Float32Array, count: number }
    totalCount: 0,
    dirty: false,
  });
}

// ── Add instances for a chunk ────────────────────────────────────────────

export function addChunkInstances(chunkKey, templateId, positions, rotations, scales) {
  const tpl = _templates.get(templateId);
  if (!tpl) return 0;

  const count = positions.length;
  if (count === 0) return 0;

  // Budget check
  if (tpl.totalCount + count > MAX_INSTANCES_PER_TEMPLATE) return 0;
  if (_totalInstances + count > MAX_TOTAL_INSTANCES) return 0;

  // Build matrix buffer
  const matrices = new Float32Array(count * 16);
  for (let i = 0; i < count; i++) {
    const pos = positions[i];
    const rot = rotations?.[i] ?? { x: 0, y: 0, z: 0 };
    const scl = scales?.[i] ?? { x: 1, y: 1, z: 1 };
    _tmpScale.set(scl.x, scl.y, scl.z);
    _tmpPosition.set(pos.x, pos.y, pos.z);

    Matrix.ComposeToRef(
      _tmpScale,
      null,  // no quaternion — use euler below
      _tmpPosition,
      _tmpMatrix,
    );

    // Apply Y rotation manually into the matrix
    const cosR = Math.cos(rot.y);
    const sinR = Math.sin(rot.y);
    const m = _tmpMatrix.m;
    const sx = scl.x, sz = scl.z;
    m[0]  = sx * cosR;
    m[2]  = sx * sinR;
    m[8]  = -sz * sinR;
    m[10] = sz * cosR;

    _tmpMatrix.copyToArray(matrices, i * 16);
  }

  // Store
  tpl.chunkData.set(chunkKey, { matrices, count });
  tpl.totalCount += count;
  tpl.dirty = true;
  _totalInstances += count;

  // Track chunk → templates
  if (!_chunkInstances.has(chunkKey)) _chunkInstances.set(chunkKey, new Set());
  _chunkInstances.get(chunkKey).add(templateId);

  return count;
}

// ── Remove chunk instances ───────────────────────────────────────────────

export function removeChunkInstances(chunkKey) {
  const templates = _chunkInstances.get(chunkKey);
  if (!templates) return;

  for (const templateId of templates) {
    const tpl = _templates.get(templateId);
    if (!tpl) continue;

    const data = tpl.chunkData.get(chunkKey);
    if (data) {
      tpl.totalCount -= data.count;
      _totalInstances -= data.count;
      tpl.chunkData.delete(chunkKey);
      tpl.dirty = true;
    }
  }

  _chunkInstances.delete(chunkKey);
}

// ── Rebuild dirty instance buffers ───────────────────────────────────────

export function flushInstances() {
  for (const [id, tpl] of _templates) {
    if (!tpl.dirty) continue;
    tpl.dirty = false;

    // Merge all chunk matrices into one buffer
    const totalCount = tpl.totalCount;

    if (totalCount === 0) {
      // Clear instances
      tpl.mesh.isVisible = false;
      tpl.mesh.thinInstanceCount = 0;
      continue;
    }

    const merged = new Float32Array(totalCount * 16);
    let offset = 0;

    for (const [, data] of tpl.chunkData) {
      merged.set(data.matrices, offset);
      offset += data.count * 16;
    }

    tpl.mesh.isVisible = true;
    tpl.mesh.thinInstanceSetBuffer('matrix', merged, 16, false);
  }
}

// ── LOD update — hide/show templates by player distance ──────────────────

export function updateInstancingLOD(playerPos) {
  // Currently LOD is chunk-based via ChunkStreamer
  // This provides additional per-template distance culling
  for (const [id, tpl] of _templates) {
    if (tpl.totalCount === 0) continue;

    // Check if template mesh center is too far
    // (Templates span multiple chunks, so we just check visibility flag)
    // Full LOD would require splitting buffers, which is expensive.
    // Instead, rely on chunk streaming to manage loaded range.
    tpl.mesh.isVisible = tpl.totalCount > 0;
  }
}

// ── Utility: generate instance positions for a chunk ─────────────────────

export function generateChunkPositions(cx, cz, density, minDist, seed) {
  const chunkSize = CONFIG.world.chunkSize;
  const positions = [];

  // Seeded RNG
  let rngVal = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const rng = () => { rngVal = (rngVal * 9301 + 49297) % 233280; return rngVal / 233280; };

  const count = Math.round(density * CONFIG.world.propsPerChunk);
  const minDistSq = minDist * minDist;

  for (let i = 0; i < count; i++) {
    const x = cx * chunkSize + rng() * chunkSize;
    const z = cz * chunkSize + rng() * chunkSize;
    const y = getTerrainHeight(x, z);

    // Distance check against existing positions
    let tooClose = false;
    for (const p of positions) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < minDistSq) { tooClose = true; break; }
    }
    if (tooClose) continue;

    positions.push({ x, y, z });
  }

  return positions;
}

// ── Debug ────────────────────────────────────────────────────────────────

export function getInstancingDebug() {
  const templateStats = [];
  for (const [id, tpl] of _templates) {
    templateStats.push({
      id,
      instances: tpl.totalCount,
      chunks: tpl.chunkData.size,
    });
  }

  return {
    totalInstances: _totalInstances,
    maxBudget: MAX_TOTAL_INSTANCES,
    usage: (_totalInstances / MAX_TOTAL_INSTANCES * 100).toFixed(1) + '%',
    templates: templateStats.length,
    templateDetails: templateStats,
  };
}
