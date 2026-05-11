// world/zoneMap.js — Zone classification system for coherent world building
// Determines zone type at any world position for structured prop placement.
// Zones: settlement_core, settlement_edge, path, forest, clearing, rocky, wild

import { createNoise2D } from 'simplex-noise';

// ── Zone types ───────────────────────────────────────────────────────────
export const ZONE = {
  SETTLEMENT_CORE: 'settlement_core',   // Inside POI — only structures
  SETTLEMENT_EDGE: 'settlement_edge',   // Around POI — crates, paths, lanterns
  PATH:            'path',              // Between POIs — rock paths, minimal trees
  FOREST:          'forest',            // Dense trees, bushes, ferns
  CLEARING:        'clearing',          // Open — flowers, grass, stumps
  ROCKY:           'rocky',             // Rocks, pebbles, dead trees
  WILD:            'wild',              // Default mixed biome props
};

// ── POI registry (shared with props) ─────────────────────────────────────
let _pois = [];

export function registerPOIs(pois) {
  _pois = pois;
}

export function appendPOIs(pois) {
  const existing = new Set(_pois.map(p => p.id || p.name));
  for (const poi of pois || []) {
    const key = poi.id || poi.name;
    if (key && existing.has(key)) continue;
    _pois.push(poi);
    if (key) existing.add(key);
  }
}

// ── City districts — larger settlement zones for multi-POI cities ────────
// Cities define a center + radius that overrides individual POI radii.
// Inside a city, the zone is always SETTLEMENT_CORE/EDGE with larger radii.
let _cities = [];

/**
 * Register city definitions for expanded settlement zones.
 * @param {Array<{x:number, z:number, coreRadius:number, edgeRadius:number, name:string}>} cities
 */
export function registerCities(cities) {
  _cities = cities;
}

export function appendCities(cities) {
  const existing = new Set(_cities.map(c => c.id || c.name));
  for (const city of cities || []) {
    const key = city.id || city.name;
    if (key && existing.has(key)) continue;
    _cities.push(city);
    if (key) existing.add(key);
  }
}

// ── Noise for zone variation ─────────────────────────────────────────────
const _zoneNoise  = createNoise2D(() => 0.42);   // deterministic seed
const _zoneNoise2 = createNoise2D(() => 0.73);   // secondary layer

// ── Zone query ───────────────────────────────────────────────────────────

/**
 * Returns the zone type and influence factor at a world position.
 * @param {number} x - World X
 * @param {number} z - World Z
 * @returns {{ zone: string, influence: number, nearestPoi: object|null, poiDist: number }}
 *   - zone: one of ZONE constants
 *   - influence: 0..1 how strongly this zone applies (for density scaling)
 *   - nearestPoi: nearest POI definition or null
 *   - poiDist: distance to nearest POI
 */
export function getZoneAt(x, z) {
  // ── Check city zones first (larger settlement radii) ───────────────
  for (const city of _cities) {
    const cdx = x - city.x;
    const cdz = z - city.z;
    const cityDist = Math.sqrt(cdx * cdx + cdz * cdz);

    if (cityDist < city.coreRadius) {
      return { zone: ZONE.SETTLEMENT_CORE, influence: 1.0, nearestPoi: city, poiDist: cityDist };
    }
    if (cityDist < city.edgeRadius) {
      const t = 1.0 - (cityDist - city.coreRadius) / (city.edgeRadius - city.coreRadius);
      return { zone: ZONE.SETTLEMENT_EDGE, influence: t, nearestPoi: city, poiDist: cityDist };
    }
  }

  // ── Distance to nearest POI ────────────────────────────────────────
  let nearestPoi = null;
  let poiDist = Infinity;

  for (const poi of _pois) {
    const dx = x - poi.x;
    const dz = z - poi.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < poiDist) {
      poiDist = d;
      nearestPoi = poi;
    }
  }

  // ── Settlement zones (proximity to POI) ────────────────────────────
  if (poiDist < 8) {
    return { zone: ZONE.SETTLEMENT_CORE, influence: 1.0, nearestPoi, poiDist };
  }

  if (poiDist < 18) {
    // Smooth falloff: 1.0 at 8u → 0.0 at 18u
    const t = 1.0 - (poiDist - 8) / 10;
    return { zone: ZONE.SETTLEMENT_EDGE, influence: t, nearestPoi, poiDist };
  }

  // ── Path zone — between two nearby POIs ────────────────────────────
  if (_pois.length >= 2 && poiDist < 40) {
    const pathDist = _distToNearestPath(x, z);
    if (pathDist < 3.5) {
      const t = 1.0 - pathDist / 3.5;
      return { zone: ZONE.PATH, influence: t, nearestPoi, poiDist };
    }
  }

  // ── Natural zones — noise-driven ───────────────────────────────────
  const scale = 0.018;
  const n1 = _zoneNoise(x * scale, z * scale);             // -1..1
  const n2 = _zoneNoise2(x * scale * 2.5, z * scale * 2.5); // detail

  const combined = n1 * 0.7 + n2 * 0.3; // -1..1

  // Thresholds for zone classification
  if (combined > 0.35) {
    // Forest: dense vegetation
    const influence = Math.min(1.0, (combined - 0.35) / 0.4);
    return { zone: ZONE.FOREST, influence: 0.6 + influence * 0.4, nearestPoi, poiDist };
  }

  if (combined < -0.35) {
    // Rocky: sparse, harsh
    const influence = Math.min(1.0, (-combined - 0.35) / 0.4);
    return { zone: ZONE.ROCKY, influence: 0.5 + influence * 0.5, nearestPoi, poiDist };
  }

  if (combined > 0.05 && combined <= 0.35) {
    // Clearing: open meadow
    return { zone: ZONE.CLEARING, influence: 0.7, nearestPoi, poiDist };
  }

  // Default: wild / mixed
  return { zone: ZONE.WILD, influence: 0.6, nearestPoi, poiDist };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Minimum distance from point (x,z) to the line segment between each pair
 * of "nearby" POIs (within 80u of each other).
 */
function _distToNearestPath(x, z) {
  let minDist = Infinity;

  for (let i = 0; i < _pois.length; i++) {
    for (let j = i + 1; j < _pois.length; j++) {
      const a = _pois[i];
      const b = _pois[j];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const abLen = Math.sqrt(abx * abx + abz * abz);
      if (abLen > 80) continue; // only connect nearby POIs

      // Project point onto segment
      const apx = x - a.x;
      const apz = z - a.z;
      let t = (apx * abx + apz * abz) / (abLen * abLen);
      t = Math.max(0, Math.min(1, t));

      const closestX = a.x + t * abx;
      const closestZ = a.z + t * abz;
      const dx = x - closestX;
      const dz = z - closestZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) minDist = dist;
    }
  }

  return minDist;
}

/**
 * Get grass density multiplier for this zone
 */
export function getGrassDensityForZone(x, z) {
  const { zone } = getZoneAt(x, z);
  switch (zone) {
    case ZONE.SETTLEMENT_CORE: return 0.15;  // almost no grass inside structures
    case ZONE.SETTLEMENT_EDGE: return 0.5;   // some grass at edges
    case ZONE.PATH:            return 0.3;   // trampled path
    case ZONE.FOREST:          return 0.6;   // shaded forest floor
    case ZONE.CLEARING:        return 1.2;   // lush meadow
    case ZONE.ROCKY:           return 0.3;   // sparse on rocks
    case ZONE.WILD:            return 0.8;
    default:                   return 0.8;
  }
}
