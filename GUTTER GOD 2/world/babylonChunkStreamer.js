// world/babylonChunkStreamer.js — streaming chunks synchrone + grass + LOD
// LOD: near chunks get full detail, far chunks freeze rendering
// INTEGRATED: EcosystemManager — each chunk gets biome-specific content

import { CONFIG }                              from '../core/config.js';
import { spawnChunkProps, despawnChunkProps }  from './babylonProps.js';
import { spawnChunkPropsFreePacks, despawnChunkPropsFreePacks } from './babylonPropsFreePacks.js';
import { spawnChunkGrass, despawnChunkGrass }  from './babylonGrass.js';
import { getBiomeAtPosition, getAssetDensity, getEcosystem } from './EcosystemManager.js';
import { Events }                              from '../core/events.js';
import { BIOMES }                              from './biomes.js';

const _loaded  = new Set();
const _pending = []; // file d'attente — 1 chunk spawné par frame max

// Track chunk meshes for LOD management
const _chunkMeshes = new Map(); // key → { props: [], frozen: bool }

const _density = {
  scale: 1.0,
  lowStreak: 0,
  highStreak: 0,
  initialized: false,
};

function _bindAdaptiveDensity() {
  if (_density.initialized) return;
  _density.initialized = true;

  Events.on('perf:fps', ({ fps }) => {
    if (fps < 40) {
      _density.lowStreak += 1;
      _density.highStreak = 0;
      if (_density.lowStreak >= 2) _density.scale = 0.35;
      return;
    }

    if (fps < 50) {
      _density.lowStreak += 1;
      _density.highStreak = 0;
      if (_density.lowStreak >= 2) _density.scale = 0.5;
      return;
    }

    if (fps < 55) {
      _density.lowStreak += 1;
      _density.highStreak = 0;
      if (_density.lowStreak >= 2) _density.scale = 0.7;
      return;
    }

    _density.highStreak += 1;
    _density.lowStreak = 0;
    if (_density.highStreak >= 3) _density.scale = 1.0;
  });
}

function _key(cx, cz)      { return `${cx}_${cz}`; }
function _fromKey(k)       { const [cx,cz] = k.split('_').map(Number); return {cx,cz}; }
function _worldToChunk(x,z){ const cs = CONFIG.world.chunkSize; return { cx: Math.floor(x/cs), cz: Math.floor(z/cs) }; }

// LOD thresholds (in chunks distance)
const LOD_FREEZE_DIST = 2; // chunks beyond this distance: freeze world matrix updates

let _lodTickCounter = 0;
const LOD_TICK_INTERVAL = 30; // check LOD every 30 frames

// ── Resolve biome for a chunk center ─────────────────────────────────────
// Uses EcosystemManager to sample biome at chunk world position,
// then maps to the biomes.js definition for prop/grass compatibility.

function _getChunkBiome(cx, cz) {
  const chunkCenterX = (cx + 0.5) * CONFIG.world.chunkSize;
  const chunkCenterZ = (cz + 0.5) * CONFIG.world.chunkSize;
  const biomeName = getBiomeAtPosition(chunkCenterX, chunkCenterZ);

  // Get ecosystem rules (density, grass palette, etc.)
  const eco = getEcosystem(biomeName);

  // Map to biomes.js definition (props, fog, lighting compatibility)
  const biomeDef = BIOMES[biomeName] ?? BIOMES.grassland;

  // Compute biome-modulated density scale
  const treeDensity  = getAssetDensity(chunkCenterX, chunkCenterZ, 'tree');
  const grassDensity = getAssetDensity(chunkCenterX, chunkCenterZ, 'grass');

  return {
    biome: biomeDef,
    biomeName,
    eco,
    treeDensity,
    grassDensity,
  };
}

export function updateChunkStreamer(playerPos, biome, scene) {
  _bindAdaptiveDensity();

  const { cx: pcx, cz: pcz } = _worldToChunk(playerPos.x, playerPos.z);
  const R  = CONFIG.world.chunkLoadRadius;
  const RU = CONFIG.world.chunkUnloadRadius;

  // Enqueue les chunks manquants
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      const k = _key(pcx + dx, pcz + dz);
      if (!_loaded.has(k) && !_pending.includes(k)) {
        _pending.push(k);
      }
    }
  }

  // Spawner 1 chunk par frame (évite les spikes)
  if (_pending.length > 0) {
    const k = _pending.shift();
    const { cx, cz } = _fromKey(k);
    _loaded.add(k);

    // ── EcosystemManager integration ─────────────────────────────────
    // Resolve biome per-chunk instead of using the global Act biome.
    // This gives each chunk biome-appropriate props and grass.
    const chunkBiome = _getChunkBiome(cx, cz);

    // Density scale combines adaptive FPS scaling with biome density
    const biomeDensityMod = chunkBiome.treeDensity;
    const effectiveDensity = _density.scale * biomeDensityMod;

    let props = null;
    if (CONFIG.features.useFreePacks) {
      props = spawnChunkPropsFreePacks(cx, cz, chunkBiome.biome, scene, effectiveDensity);
    } else {
      spawnChunkProps(cx, cz, chunkBiome.biome, scene, effectiveDensity);
    }

    // Grass: use biome-specific density and palette
    const grassDensityMod = chunkBiome.grassDensity;
    const grassScale = _density.scale * grassDensityMod;
    spawnChunkGrass(cx, cz, chunkBiome.biomeName, grassScale);

    // Track for LOD
    if (props) {
      _chunkMeshes.set(k, { props, frozen: false });
    }
  }

  // LOD: freeze/unfreeze chunks based on distance (every N frames)
  _lodTickCounter++;
  if (_lodTickCounter >= LOD_TICK_INTERVAL) {
    _lodTickCounter = 0;
    _updateLOD(pcx, pcz);
  }

  // Décharger les chunks trop loin
  for (const k of [..._loaded]) {
    const { cx, cz } = _fromKey(k);
    if (Math.abs(cx - pcx) > RU || Math.abs(cz - pcz) > RU) {
      if (CONFIG.features.useFreePacks) {
        despawnChunkPropsFreePacks(cx, cz);
      } else {
        despawnChunkProps(cx, cz);
      }
      despawnChunkGrass(cx, cz);
      _loaded.delete(k);
      _chunkMeshes.delete(k);
    }
  }
}

// ── LOD management — freeze far meshes to save GPU ───────────────────────

function _updateLOD(pcx, pcz) {
  for (const [k, data] of _chunkMeshes) {
    const { cx, cz } = _fromKey(k);
    const dist = Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz));
    const shouldFreeze = dist >= LOD_FREEZE_DIST;

    if (shouldFreeze !== data.frozen) {
      data.frozen = shouldFreeze;
      if (data.props) {
        for (const mesh of data.props) {
          if (!mesh || mesh.isDisposed?.()) continue;
          try {
            mesh.freezeWorldMatrix();
            // Freeze child meshes too (glTF multi-mesh)
            const children = mesh.getChildMeshes?.(false) || [];
            for (const child of children) {
              if (shouldFreeze) {
                child.freezeWorldMatrix?.();
              } else {
                child.unfreezeWorldMatrix?.();
              }
            }
            if (!shouldFreeze) {
              mesh.unfreezeWorldMatrix?.();
            }
          } catch (e) {}
        }
      }
    }
  }
}
