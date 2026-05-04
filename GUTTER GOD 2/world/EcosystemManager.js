// world/EcosystemManager.js — Biome regions via Perlin noise (Genshin-style)
// Maps any world position to a biome using layered noise fields.
// Each biome defines: terrain colors (splatmap), asset kits, grass palette,
// fog/weather parameters, and ambient particle type.
//
// 10km world → 5 biomes in concentric/noise-driven regions.
// Transitions are smooth (blend zone ≈ 30-50u wide).

import { createNoise2D } from 'simplex-noise';
import { CONFIG }        from '../core/config.js';

// ── Noise generators (seeded) ────────────────────────────────────────────
const _biomeNoise    = createNoise2D(() => 0.42);   // primary biome field
const _biomeDetail   = createNoise2D(() => 0.73);   // detail variation
const _moistureNoise = createNoise2D(() => 0.15);   // moisture axis
const _tempNoise     = createNoise2D(() => 0.88);   // temperature axis

// ── Biome definitions — Genshin-style ecosystem rules ────────────────────
export const ECOSYSTEM = {
  grassland: {
    name:         'grassland',
    displayName:  'Plaines Verdoyantes',
    // Splatmap terrain colors
    grassColor:   [0.28, 0.55, 0.18],
    dirtColor:    [0.45, 0.35, 0.22],
    rockColor:    [0.50, 0.48, 0.42],
    // Asset placement rules
    treeDensity:    0.6,
    bushDensity:    0.8,
    rockDensity:    0.3,
    flowerDensity:  0.7,
    // Grass parameters
    grassDensity:   1.0,
    grassHeight:    [0.25, 0.60],
    grassPalette:   [[0.22, 0.55, 0.12], [0.30, 0.62, 0.15], [0.18, 0.48, 0.10]],
    // Atmosphere
    fogDensity:     0.012,
    fogColor:       [0.55, 0.65, 0.50],
    particleType:   'fireflies',
    ambientSound:   'forest',
  },
  ashlands: {
    name:         'ashlands',
    displayName:  'Terres Cendrées',
    grassColor:   [0.35, 0.28, 0.18],
    dirtColor:    [0.30, 0.22, 0.15],
    rockColor:    [0.40, 0.35, 0.28],
    treeDensity:    0.2,
    bushDensity:    0.15,
    rockDensity:    0.6,
    flowerDensity:  0.05,
    grassDensity:   0.3,
    grassHeight:    [0.15, 0.35],
    grassPalette:   [[0.35, 0.28, 0.18], [0.40, 0.30, 0.15]],
    fogDensity:     0.022,
    fogColor:       [0.35, 0.28, 0.22],
    particleType:   'embers',
    ambientSound:   'wind',
  },
  ironrain: {
    name:         'ironrain',
    displayName:  'Pluie de Fer',
    grassColor:   [0.20, 0.30, 0.22],
    dirtColor:    [0.25, 0.25, 0.28],
    rockColor:    [0.35, 0.38, 0.42],
    treeDensity:    0.15,
    bushDensity:    0.1,
    rockDensity:    0.8,
    flowerDensity:  0.02,
    grassDensity:   0.25,
    grassHeight:    [0.12, 0.30],
    grassPalette:   [[0.20, 0.30, 0.22], [0.18, 0.28, 0.25]],
    fogDensity:     0.030,
    fogColor:       [0.25, 0.28, 0.32],
    particleType:   'dust',
    ambientSound:   'rain',
  },
  rootblight: {
    name:         'rootblight',
    displayName:  'Racines Corrompues',
    grassColor:   [0.15, 0.42, 0.20],
    dirtColor:    [0.18, 0.25, 0.12],
    rockColor:    [0.30, 0.35, 0.28],
    treeDensity:    0.8,
    bushDensity:    0.9,
    rockDensity:    0.4,
    flowerDensity:  0.5,
    grassDensity:   0.85,
    grassHeight:    [0.30, 0.70],
    grassPalette:   [[0.15, 0.50, 0.20], [0.20, 0.55, 0.18], [0.12, 0.45, 0.25]],
    fogDensity:     0.028,
    fogColor:       [0.18, 0.25, 0.18],
    particleType:   'spores',
    ambientSound:   'swamp',
  },
  schism: {
    name:         'schism',
    displayName:  'Le Schisme',
    grassColor:   [0.22, 0.15, 0.28],
    dirtColor:    [0.15, 0.10, 0.18],
    rockColor:    [0.28, 0.22, 0.35],
    treeDensity:    0.1,
    bushDensity:    0.05,
    rockDensity:    0.7,
    flowerDensity:  0.01,
    grassDensity:   0.15,
    grassHeight:    [0.10, 0.25],
    grassPalette:   [[0.25, 0.20, 0.15], [0.30, 0.22, 0.12]],
    fogDensity:     0.035,
    fogColor:       [0.15, 0.10, 0.18],
    particleType:   'void_motes',
    ambientSound:   'void',
  },
};

// ── Biome order for noise mapping ────────────────────────────────────────
const BIOME_LIST = ['grassland', 'ashlands', 'ironrain', 'rootblight', 'schism'];

// ── Noise sampling scales ────────────────────────────────────────────────
const BIOME_SCALE   = 0.0008;  // large regions (~1200u = 1.2km per biome)
const DETAIL_SCALE  = 0.003;   // detail variation
const MOISTURE_SCALE = 0.001;
const TEMP_SCALE     = 0.0012;

// ── Cache — avoid recomputing same chunk biome ───────────────────────────
const _biomeCache = new Map();
const CACHE_RESOLUTION = 8;    // cache every 8 units

// ── Get biome at any world position ──────────────────────────────────────

export function getBiomeAtPosition(x, z) {
  // Quantize to cache resolution
  const qx = Math.floor(x / CACHE_RESOLUTION);
  const qz = Math.floor(z / CACHE_RESOLUTION);
  const key = (qx << 16) | (qz & 0xFFFF);

  if (_biomeCache.has(key)) return _biomeCache.get(key);

  const biome = _sampleBiome(x, z);
  _biomeCache.set(key, biome);

  // Limit cache size (LRU-lite: just prune if too big)
  if (_biomeCache.size > 50000) {
    const iter = _biomeCache.keys();
    for (let i = 0; i < 10000; i++) _biomeCache.delete(iter.next().value);
  }

  return biome;
}

function _sampleBiome(x, z) {
  // Distance from world center influences biome (concentric rings + noise)
  const dist = Math.sqrt(x * x + z * z);
  const distNorm = dist / 5000; // normalize to 0-1 over half-world

  // Primary noise field
  const n1 = _biomeNoise(x * BIOME_SCALE, z * BIOME_SCALE);         // -1..1
  const n2 = _biomeDetail(x * DETAIL_SCALE, z * DETAIL_SCALE) * 0.3; // subtle detail

  // Moisture & temperature axes (Whittaker-style)
  const moisture = _moistureNoise(x * MOISTURE_SCALE, z * MOISTURE_SCALE);
  const temp     = _tempNoise(x * TEMP_SCALE, z * TEMP_SCALE);

  // Combine into biome selection value
  const value = n1 + n2 + distNorm * 0.4;

  // Distance-based concentric tendency:
  // Center = grassland, mid = varied, far = schism
  if (distNorm < 0.15) return 'grassland';
  if (distNorm > 0.85) return 'schism';

  // Noise-driven selection
  if (value < -0.3) {
    return moisture > 0 ? 'rootblight' : 'ironrain';
  }
  if (value < 0.1) {
    return temp > 0.2 ? 'grassland' : 'rootblight';
  }
  if (value < 0.5) {
    return moisture < -0.2 ? 'ashlands' : 'grassland';
  }
  if (value < 0.8) {
    return temp < 0 ? 'ironrain' : 'ashlands';
  }

  return 'schism';
}

// ── Get biome blend weights (for smooth splatmap transitions) ────────────

export function getBiomeBlend(x, z) {
  // Sample biome at current position and 4 neighbors
  const center = getBiomeAtPosition(x, z);
  const right  = getBiomeAtPosition(x + CACHE_RESOLUTION, z);
  const up     = getBiomeAtPosition(x, z + CACHE_RESOLUTION);
  const left   = getBiomeAtPosition(x - CACHE_RESOLUTION, z);
  const down   = getBiomeAtPosition(x, z - CACHE_RESOLUTION);

  // If all same → pure biome (no blending needed)
  if (center === right && center === up && center === left && center === down) {
    return { primary: center, secondary: null, blend: 0 };
  }

  // Find secondary biome (most common neighbor that differs)
  const counts = {};
  for (const b of [right, up, left, down]) {
    if (b !== center) counts[b] = (counts[b] || 0) + 1;
  }
  const secondary = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const blend = secondary ? (counts[secondary] / 4) : 0;

  return { primary: center, secondary, blend };
}

// ── Get ecosystem rules for a biome ──────────────────────────────────────

export function getEcosystem(biomeName) {
  return ECOSYSTEM[biomeName] ?? ECOSYSTEM.grassland;
}

// ── Get asset density at position (combines biome + noise) ───────────────

export function getAssetDensity(x, z, assetType) {
  const biome = getBiomeAtPosition(x, z);
  const eco = ECOSYSTEM[biome];
  if (!eco) return 0.5;

  const densityKey = `${assetType}Density`;
  const baseDensity = eco[densityKey] ?? 0.5;

  // Add local noise variation (±30%)
  const localNoise = _biomeDetail(x * 0.01, z * 0.01) * 0.3;
  return Math.max(0, Math.min(1, baseDensity + localNoise));
}

// ── Debug ────────────────────────────────────────────────────────────────

export function getEcosystemDebug(x, z) {
  return {
    biome: getBiomeAtPosition(x, z),
    blend: getBiomeBlend(x, z),
    treeDensity: getAssetDensity(x, z, 'tree').toFixed(2),
    grassDensity: getAssetDensity(x, z, 'grass').toFixed(2),
    cacheSize: _biomeCache.size,
  };
}
