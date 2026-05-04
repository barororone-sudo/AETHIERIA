// world/narrativeVignettes.js — Passive storytelling through environmental set-pieces
// Rule of Three: 1 anchor (large), 2-3 medium props, 4-6 micro-details
// Each vignette tells a mini-story through prop arrangement

import { batchLoadGltf, createInstance } from '../core/assetLoader.js';
import { getTerrainHeight } from './babylonTerrain.js';
import { snapToTerrain } from './terrainSnapping.js';
import { addShadowCaster } from '../engine/babylon/lighting.js';

// ── Asset paths ──────────────────────────────────────────────────────────
const SNM = 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/';
const KNK = 'assets/free-packs/Kenney_Nature_Kit/Models/GLTF format/';
const FPM = 'assets/free-packs/Fantasy Props MegaKit[Standard]/Exports/glTF/';
const KSK = 'assets/free-packs/Kenney_Survival_Kit/Models/GLB format/';
const KPK = 'assets/free-packs/Kenney_Pirate_Kit/Models/GLB format/';
const KFT = 'assets/free-packs/Kenney_Fantasy_Town/Models/GLB format/';
const KCK = 'assets/free-packs/Kenney_Castle_Kit/Models/GLB format/';

// ── Vignette definitions ─────────────────────────────────────────────────
// Each vignette is a self-contained story scene.
// Rotations use slight randomness to avoid grid effect.
// yOff: Y offset for terrain embedding

const VIGNETTE_DEFS = {

  // ── "Abandoned Campsite" — Someone left in a hurry ──
  abandoned_camp: {
    biomes: ['grassland', 'ashlands', 'rootblight'],
    anchor: { model: KSK + 'campfire-pit.glb', scale: 1.2, dx: 0, dz: 0, yOff: -0.05 },
    medium: [
      { model: KSK + 'tent.glb',      scale: 1.0, dx: -3, dz: -1, ry: 0.4, yOff: 0 },
      { model: KNK + 'log.glb',       scale: 1.0, dx: 1.5, dz: 1.5, ry: 0.8, yOff: -0.1 },
      { model: KNK + 'log.glb',       scale: 0.9, dx: -1, dz: 2, ry: 2.3, yOff: -0.1 },
    ],
    details: [
      { model: KSK + 'bedroll.glb',   scale: 1.0, dx: -2.5, dz: 0.5, ry: 0.6, yOff: 0 },
      { model: KSK + 'barrel.glb',    scale: 0.8, dx: 2.5, dz: -0.5, ry: 0, yOff: 0 },
      { model: FPM + 'SmallBottle.gltf', scale: 0.7, dx: 0.5, dz: 0.3, ry: 1.2, yOff: 0 },
      { model: KNK + 'stone_smallA.glb', scale: 0.8, dx: 0.8, dz: -0.4, ry: 0, yOff: -0.06 },
      { model: KNK + 'stone_smallB.glb', scale: 0.7, dx: -0.5, dz: -0.6, ry: 1.8, yOff: -0.06 },
    ],
  },

  // ── "Overturned Cart" — Ambush aftermath ──
  overturned_cart: {
    biomes: ['grassland', 'ironrain'],
    anchor: { model: KPK + 'crate.glb', scale: 1.5, dx: 0, dz: 0, ry: 0.3, yOff: 0 },
    medium: [
      { model: KPK + 'barrel.glb',   scale: 1.0, dx: 2, dz: 1, ry: 0, yOff: 0 },
      { model: KPK + 'barrel.glb',   scale: 0.9, dx: 2.5, dz: 0, ry: 1.2, yOff: 0 },
      { model: KPK + 'crate.glb',    scale: 0.8, dx: -1.5, dz: 2, ry: 0.7, yOff: 0 },
    ],
    details: [
      { model: FPM + 'Barrel_Apples.gltf', scale: 0.7, dx: -2, dz: -0.5, ry: 2.1, yOff: 0 },
      { model: KNK + 'stone_smallA.glb',   scale: 0.6, dx: 1, dz: -1, ry: 0, yOff: -0.06 },
      { model: FPM + 'Torch_Metal.gltf',   scale: 0.8, dx: 3, dz: 1.5, ry: 1.5, yOff: 0 },
      { model: KNK + 'stump_round.glb',    scale: 0.8, dx: -3, dz: 1, ry: 0, yOff: -0.1 },
    ],
  },

  // ── "Ruined Outpost" — Stone ruins with scattered debris ──
  ruined_outpost: {
    biomes: ['ironrain', 'schism', 'ashlands'],
    anchor: { model: KCK + 'wall-half.glb', scale: 1.1, dx: 0, dz: 0, ry: 0, yOff: 0 },
    medium: [
      { model: KCK + 'wall-half.glb', scale: 0.9, dx: 3, dz: 0, ry: 0.15, yOff: 0 },
      { model: KCK + 'rocks-large.glb', scale: 1.0, dx: -2, dz: 2, ry: 0.5, yOff: -0.15 },
    ],
    details: [
      { model: KCK + 'rocks-small.glb',  scale: 0.8, dx: 1.5, dz: 2, ry: 0, yOff: -0.1 },
      { model: KCK + 'rocks-small.glb',  scale: 0.7, dx: 4, dz: 1, ry: 1.3, yOff: -0.1 },
      { model: KNK + 'rock_tallA.glb',   scale: 0.6, dx: -3, dz: -1, ry: 0.8, yOff: -0.15 },
      { model: FPM + 'Candle_1.gltf',    scale: 0.6, dx: 1, dz: -0.5, ry: 0, yOff: 0 },
    ],
  },

  // ── "Mushroom Circle" — Fairy ring, mystical ──
  mushroom_circle: {
    biomes: ['rootblight', 'grassland'],
    anchor: { model: SNM + 'Mushroom_Laetiporus.gltf', scale: 1.5, dx: 0, dz: 0, yOff: -0.03 },
    medium: [
      { model: KNK + 'mushroom_redGroup.glb', scale: 1.2, dx: 2, dz: 1, ry: 0, yOff: -0.02 },
      { model: KNK + 'mushroom_tanGroup.glb', scale: 1.2, dx: -1.5, dz: 2, ry: 1.0, yOff: -0.02 },
      { model: SNM + 'Mushroom_Common.gltf',  scale: 1.0, dx: -2, dz: -1, ry: 2.5, yOff: -0.02 },
    ],
    details: [
      { model: SNM + 'Clover_1.gltf', scale: 0.8, dx: 1, dz: -1, ry: 0, yOff: -0.02 },
      { model: SNM + 'Clover_2.gltf', scale: 0.8, dx: -0.5, dz: -1.5, ry: 1.3, yOff: -0.02 },
      { model: SNM + 'Petal_1.gltf',  scale: 0.6, dx: 0.5, dz: 1.5, ry: 0.7, yOff: 0 },
      { model: SNM + 'Petal_2.gltf',  scale: 0.6, dx: -1, dz: 0.5, ry: 2.1, yOff: 0 },
      { model: SNM + 'Fern_1.gltf',   scale: 0.7, dx: 2.5, dz: -0.5, ry: 0, yOff: -0.03 },
    ],
  },

  // ── "Ritual Stones" — Dark circle, something happened here ──
  ritual_stones: {
    biomes: ['schism', 'ashlands'],
    anchor: { model: KNK + 'rock_tallA.glb', scale: 1.4, dx: 0, dz: 0, yOff: -0.2 },
    medium: [
      { model: KNK + 'rock_tallB.glb', scale: 1.1, dx: 3, dz: 0, ry: 0.5, yOff: -0.2 },
      { model: KNK + 'rock_tallC.glb', scale: 1.0, dx: -2.5, dz: 1.5, ry: -0.3, yOff: -0.2 },
      { model: KNK + 'rock_tallA.glb', scale: 0.9, dx: 0, dz: 3, ry: 1.0, yOff: -0.2 },
    ],
    details: [
      { model: FPM + 'CandleStick_Triple.gltf', scale: 0.8, dx: 0, dz: 1, ry: 0, yOff: 0 },
      { model: FPM + 'Chalice.gltf',   scale: 0.7, dx: 0.5, dz: 0.5, ry: 0, yOff: 0 },
      { model: SNM + 'Pebble_Round_1.gltf', scale: 0.8, dx: 1.5, dz: 1, ry: 0, yOff: -0.08 },
      { model: SNM + 'Pebble_Round_2.gltf', scale: 0.8, dx: -1.5, dz: -0.5, ry: 1.4, yOff: -0.08 },
    ],
  },

  // ── "Treasure Stash" — Hidden pirate cache ──
  treasure_stash: {
    biomes: ['grassland', 'ironrain'],
    anchor: { model: KPK + 'chest.glb', scale: 1.2, dx: 0, dz: 0, ry: 0.2, yOff: 0 },
    medium: [
      { model: KPK + 'barrel.glb',    scale: 0.9, dx: -2, dz: 0.5, ry: 0, yOff: 0 },
      { model: KPK + 'crate.glb',     scale: 0.8, dx: 1.5, dz: -0.5, ry: 0.4, yOff: 0 },
    ],
    details: [
      { model: FPM + 'SmallBottle.gltf', scale: 0.6, dx: 0.5, dz: 0.5, ry: 0.8, yOff: 0 },
      { model: FPM + 'Potion_1.gltf',    scale: 0.5, dx: -0.5, dz: 0.3, ry: 0, yOff: 0 },
      { model: KNK + 'stone_smallB.glb', scale: 0.5, dx: 2, dz: 1, ry: 0, yOff: -0.06 },
      { model: SNM + 'Plant_1.gltf',     scale: 0.6, dx: -2.5, dz: -0.5, ry: 0, yOff: -0.03 },
    ],
  },

  // ── "Scholar's Rest" — Books and candles under a tree ──
  scholars_rest: {
    biomes: ['grassland', 'rootblight'],
    anchor: { model: FPM + 'BookStand.gltf', scale: 1.0, dx: 0, dz: 0, ry: 0.2, yOff: 0 },
    medium: [
      { model: FPM + 'Shelf_Arch.gltf', scale: 0.8, dx: -2, dz: 0, ry: 0.1, yOff: 0 },
      { model: FPM + 'Bench.gltf',      scale: 0.8, dx: 1.5, dz: 1, ry: -0.3, yOff: 0 },
    ],
    details: [
      { model: FPM + 'Candle_1.gltf',       scale: 0.7, dx: 0.3, dz: -0.3, ry: 0, yOff: 0 },
      { model: FPM + 'Candle_1.gltf',       scale: 0.6, dx: -0.4, dz: 0.2, ry: 0, yOff: 0 },
      { model: FPM + 'Potion_2.gltf',       scale: 0.5, dx: 1, dz: 0, ry: 1.1, yOff: 0 },
      { model: FPM + 'SmallBottle.gltf',    scale: 0.5, dx: -1, dz: 0.5, ry: 0, yOff: 0 },
      { model: SNM + 'Bush_Common_Flowers.gltf', scale: 0.7, dx: 2.5, dz: -1, ry: 0, yOff: -0.03 },
    ],
  },

  // ── "Watchtower Ruin" — Collapsed tower with guard remains ──
  watchtower_ruin: {
    biomes: ['ironrain', 'schism'],
    anchor: { model: KCK + 'tower-square.glb', scale: 0.8, dx: 0, dz: 0, ry: 0, yOff: 0 },
    medium: [
      { model: KCK + 'wall.glb',       scale: 0.8, dx: 3, dz: 0, ry: 0.1, yOff: 0 },
      { model: KCK + 'rocks-large.glb', scale: 1.0, dx: -3, dz: 2, ry: 0.7, yOff: -0.15 },
      { model: KCK + 'flag.glb',       scale: 0.8, dx: 0, dz: 0, ry: 0, yOff: 0 },
    ],
    details: [
      { model: FPM + 'WeaponStand.gltf', scale: 0.7, dx: 2, dz: 2, ry: -0.4, yOff: 0 },
      { model: FPM + 'Torch_Metal.gltf', scale: 0.8, dx: 4, dz: 1, ry: 0, yOff: 0 },
      { model: KCK + 'rocks-small.glb',  scale: 0.6, dx: -1.5, dz: 3, ry: 2.0, yOff: -0.1 },
    ],
  },

  // ── "Fishing Spot" — Peaceful cove ──
  fishing_spot: {
    biomes: ['grassland'],
    anchor: { model: KNK + 'campfire_stones.glb', scale: 1.0, dx: 0, dz: 0, yOff: -0.05 },
    medium: [
      { model: KNK + 'log.glb',         scale: 1.0, dx: 1.5, dz: 1, ry: 0.5, yOff: -0.1 },
      { model: KSK + 'barrel.glb',      scale: 0.9, dx: -2, dz: 0, ry: 0, yOff: 0 },
    ],
    details: [
      { model: KNK + 'stump_round.glb', scale: 0.7, dx: 2.5, dz: -0.5, ry: 0, yOff: -0.1 },
      { model: FPM + 'Barrel.gltf',     scale: 0.6, dx: -2.5, dz: 1, ry: 0.8, yOff: 0 },
      { model: KNK + 'stone_smallA.glb', scale: 0.6, dx: 0.5, dz: -1, ry: 0, yOff: -0.06 },
      { model: SNM + 'Plant_1.gltf',    scale: 0.6, dx: -1.5, dz: -1, ry: 0, yOff: -0.03 },
    ],
  },
};

// ── State ────────────────────────────────────────────────────────────────
const _meshes = [];
let _scene = null;

// ── Vignette placement map — deterministic positions across the world ────
// Spread vignettes evenly, avoiding POI areas and spawn zone

function _generateVignettePositions(biomeName, seed = 42) {
  const positions = [];
  const rng = _rng(`vig_${biomeName}_${seed}`);

  // Get all vignettes valid for this biome
  const validTypes = Object.entries(VIGNETTE_DEFS)
    .filter(([_, def]) => def.biomes.includes(biomeName))
    .map(([key]) => key);

  if (validTypes.length === 0) return positions;

  // Place 12-18 vignettes across the 192u × 192u map
  const count = 12 + Math.floor(rng() * 7);
  const placed = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      const x = (rng() - 0.5) * 170; // -85..85
      const z = (rng() - 0.5) * 170;

      // Skip spawn zone (20u radius)
      if (x * x + z * z < 400) continue;

      // Min distance from other vignettes (25u)
      let tooClose = false;
      for (const p of placed) {
        const ddx = x - p.x;
        const ddz = z - p.z;
        if (ddx * ddx + ddz * ddz < 625) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const type = validTypes[Math.floor(rng() * validTypes.length)];
      const rotation = rng() * Math.PI * 2; // random scene orientation

      positions.push({ x, z, type, rotation });
      placed.push({ x, z });
      break;
    }
  }

  return positions;
}

// ── Init — collect all models, batch load, spawn vignettes ───────────────

export async function initNarrativeVignettes(scene, biomeName) {
  _scene = scene;

  // Collect all unique model paths needed
  const seen = new Set();
  const batchItems = [];

  for (const [_, def] of Object.entries(VIGNETTE_DEFS)) {
    if (!def.biomes.includes(biomeName)) continue;
    const allModels = [def.anchor, ...def.medium, ...def.details];
    for (const m of allModels) {
      if (!seen.has(m.model)) {
        seen.add(m.model);
        batchItems.push({ path: m.model, id: `vig_${m.model.split('/').pop()}` });
      }
    }
  }

  if (batchItems.length === 0) return;

  console.log(`[VIGNETTES] Loading ${batchItems.length} models for ${biomeName}...`);
  const loaded = await batchLoadGltf(batchItems, scene, 6);

  // Generate positions and spawn
  const positions = _generateVignettePositions(biomeName);

  let spawnedCount = 0;
  for (const pos of positions) {
    const def = VIGNETTE_DEFS[pos.type];
    if (!def) continue;

    const spawnedInVignette = _spawnVignette(pos, def, loaded, scene);
    spawnedCount += spawnedInVignette;
  }

  console.log(`[VIGNETTES] ${spawnedCount} meshes in ${positions.length} vignettes`);
}

function _spawnVignette(pos, def, loadedMap, scene) {
  let count = 0;
  const cosR = Math.cos(pos.rotation);
  const sinR = Math.sin(pos.rotation);

  // Helper: rotate offset around vignette center
  function rotatedPos(dx, dz) {
    return {
      x: pos.x + dx * cosR - dz * sinR,
      z: pos.z + dx * sinR + dz * cosR,
    };
  }

  // Spawn anchor (shadow caster)
  count += _spawnVignetteItem(def.anchor, pos, rotatedPos, loadedMap, scene, true);

  // Spawn medium props
  for (const m of def.medium) {
    count += _spawnVignetteItem(m, pos, rotatedPos, loadedMap, scene, false);
  }

  // Spawn details
  for (const d of def.details) {
    count += _spawnVignetteItem(d, pos, rotatedPos, loadedMap, scene, false);
  }

  return count;
}

function _spawnVignetteItem(item, pos, rotatedPos, loadedMap, scene, isShadowCaster) {
  const template = loadedMap.get(item.model);
  if (!template) return 0;

  try {
    const rp = rotatedPos(item.dx || 0, item.dz || 0);
    const py = getTerrainHeight(rp.x, rp.z) + (item.yOff || 0);

    const mesh = template.clone(`vig_${pos.type}_${item.dx}_${item.dz}`);
    mesh.position.set(rp.x, py, rp.z);

    // Natural rotation: scene rotation + prop rotation + slight random jitter
    const jitter = (Math.random() - 0.5) * 0.12; // ±0.06 radians (~3°)
    mesh.rotation.y = pos.rotation + (item.ry || 0) + jitter;

    mesh.scaling.scaleInPlace(item.scale || 1.0);
    mesh.setEnabled(true);
    mesh.isPickable = false;

    // Shadow only on anchor pieces
    if (isShadowCaster) {
      try { addShadowCaster(mesh); } catch (e) {}
    }

    _meshes.push(mesh);
    return 1;
  } catch (e) {
    return 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function _rng(seed) {
  let value = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function getVignettesDebugState() {
  return { meshes: _meshes.length };
}
