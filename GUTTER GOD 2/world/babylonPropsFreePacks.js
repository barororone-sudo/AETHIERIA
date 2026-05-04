// world/babylonPropsFreePacks.js — Zone-based world building system
// Structured prop placement: settlement → path → forest/clearing/rocky → wild
// Layered: Base terrain → Nature → Structures → Details
// GPU instancing, batch loading, terrain-aligned Y offsets

import { batchLoadGltf, createInstance } from '../core/assetLoader.js';
import { Vector3 } from '@babylonjs/core';
import { CONFIG } from '../core/config.js';
import { getTerrainHeight } from './babylonTerrain.js';
import { getTerrainSlope } from './terrainSnapping.js';
import { getZoneAt, registerPOIs, ZONE } from './zoneMap.js';
import { snapPropToTerrain } from './terrainSnapping.js';
import { addShadowCaster } from '../engine/babylon/lighting.js';
import { addCampfireSmoke } from './babylonWorldVfx.js';

const _propTemplates = new Map(); // biome → Map<type, mesh>
const _chunks = new Map();        // chunkId → [instances]

// ── Asset path constants ─────────────────────────────────────────────────
const SNM = 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/';
const KNK = 'assets/free-packs/Kenney_Nature_Kit/Models/GLTF format/';
const FPM = 'assets/free-packs/Fantasy Props MegaKit[Standard]/Exports/glTF/';
const MVK = 'assets/free-packs/Medieval Village MegaKit[Standard]/glTF/';
const KFT = 'assets/free-packs/Kenney_Fantasy_Town/Models/GLB format/';
const KCK = 'assets/free-packs/Kenney_Castle_Kit/Models/GLB format/';
const KSK = 'assets/free-packs/Kenney_Survival_Kit/Models/GLB format/';
const KPK = 'assets/free-packs/Kenney_Pirate_Kit/Models/GLB format/';

// ── Asset categories (for Y-offset and spacing rules) ────────────────────
const CAT = {
  TREE:      'tree',
  BUSH:      'bush',
  FLOWER:    'flower',
  ROCK:      'rock',
  PEBBLE:    'pebble',
  MUSHROOM:  'mushroom',
  STUMP:     'stump',
  PLANT:     'plant',
  STRUCTURE: 'structure',
  FURNITURE: 'furniture',
  DETAIL:    'detail',
  PATH_PROP: 'path_prop',
};

// Y-offset per category — embeds props into terrain for natural look
const Y_OFFSET = {
  [CAT.TREE]:      0,
  [CAT.BUSH]:      -0.03,
  [CAT.FLOWER]:    -0.02,
  [CAT.ROCK]:      -0.18,    // partially buried
  [CAT.PEBBLE]:    -0.08,    // half-buried
  [CAT.MUSHROOM]:  -0.02,
  [CAT.STUMP]:     -0.1,
  [CAT.PLANT]:     -0.03,
  [CAT.STRUCTURE]: 0,
  [CAT.FURNITURE]: 0,
  [CAT.DETAIL]:    0,
  [CAT.PATH_PROP]: -0.05,
};

// Min distance² per category
const MIN_DIST_SQ = {
  [CAT.TREE]:      20,   // ~4.5u between trees
  [CAT.BUSH]:       6,   // ~2.5u
  [CAT.FLOWER]:     1.5, // ~1.2u — can be dense
  [CAT.ROCK]:      10,   // ~3.2u
  [CAT.PEBBLE]:     2,   // ~1.4u
  [CAT.MUSHROOM]:   2,
  [CAT.STUMP]:      8,
  [CAT.PLANT]:      3,
  [CAT.STRUCTURE]: 16,
  [CAT.FURNITURE]:  4,
  [CAT.DETAIL]:     2,
  [CAT.PATH_PROP]:  6,
};

// ── Biome prop definitions with categories and zone affinity ─────────────
// zone_affinity: which zones this prop can appear in (null = any zone)
// w: weight for random selection within its zone

const BIOME_PROPS = {
  grassland: [
    // ── LAYER 1: Trees (Nature) ──
    { type: 'CommonTree_1', model: SNM + 'CommonTree_1.gltf', scale: 1.0, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'CommonTree_2', model: SNM + 'CommonTree_2.gltf', scale: 1.0, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'CommonTree_3', model: SNM + 'CommonTree_3.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'CommonTree_4', model: SNM + 'CommonTree_4.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'CommonTree_5', model: SNM + 'CommonTree_5.gltf', scale: 1.0, cat: CAT.TREE, w: 1, zones: [ZONE.FOREST] },
    { type: 'Pine_1',       model: SNM + 'Pine_1.gltf',       scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'Pine_2',       model: SNM + 'Pine_2.gltf',       scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'Pine_3',       model: SNM + 'Pine_3.gltf',       scale: 1.0, cat: CAT.TREE, w: 1, zones: [ZONE.FOREST] },
    { type: 'kn_tree_default',      model: KNK + 'tree_default.glb',      scale: 1.2, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD, ZONE.SETTLEMENT_EDGE] },
    { type: 'kn_tree_default_dark', model: KNK + 'tree_default_dark.glb', scale: 1.2, cat: CAT.TREE, w: 1, zones: [ZONE.FOREST] },
    { type: 'kn_tree_oak',          model: KNK + 'tree_oak.glb',          scale: 1.2, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD, ZONE.SETTLEMENT_EDGE] },
    { type: 'kn_tree_oak_dark',     model: KNK + 'tree_oak_dark.glb',     scale: 1.2, cat: CAT.TREE, w: 1, zones: [ZONE.FOREST] },

    // ── LAYER 2: Bushes & Plants (Nature) ──
    { type: 'Bush_Common',         model: SNM + 'Bush_Common.gltf',         scale: 1.0, cat: CAT.BUSH, w: 4, zones: [ZONE.FOREST, ZONE.WILD, ZONE.SETTLEMENT_EDGE] },
    { type: 'Bush_Common_Flowers', model: SNM + 'Bush_Common_Flowers.gltf', scale: 1.0, cat: CAT.BUSH, w: 2, zones: [ZONE.CLEARING, ZONE.SETTLEMENT_EDGE] },
    { type: 'Plant_1',     model: SNM + 'Plant_1.gltf',     scale: 0.8, cat: CAT.PLANT, w: 3, zones: [ZONE.FOREST, ZONE.CLEARING, ZONE.WILD] },
    { type: 'Plant_1_Big', model: SNM + 'Plant_1_Big.gltf', scale: 0.8, cat: CAT.PLANT, w: 1, zones: [ZONE.FOREST] },
    { type: 'Fern_1',      model: SNM + 'Fern_1.gltf',      scale: 0.9, cat: CAT.PLANT, w: 4, zones: [ZONE.FOREST, ZONE.CLEARING, ZONE.WILD] },
    { type: 'Clover_1',    model: SNM + 'Clover_1.gltf',    scale: 0.7, cat: CAT.PLANT, w: 3, zones: [ZONE.CLEARING, ZONE.FOREST] },
    { type: 'Clover_2',    model: SNM + 'Clover_2.gltf',    scale: 0.7, cat: CAT.PLANT, w: 3, zones: [ZONE.CLEARING, ZONE.FOREST] },

    // ── LAYER 3: Flowers (Detail) ──
    { type: 'Flower_3_Group',  model: SNM + 'Flower_3_Group.gltf',  scale: 0.8, cat: CAT.FLOWER, w: 3, zones: [ZONE.CLEARING, ZONE.SETTLEMENT_EDGE] },
    { type: 'Flower_3_Single', model: SNM + 'Flower_3_Single.gltf', scale: 0.7, cat: CAT.FLOWER, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'Flower_4_Group',  model: SNM + 'Flower_4_Group.gltf',  scale: 0.8, cat: CAT.FLOWER, w: 3, zones: [ZONE.CLEARING, ZONE.SETTLEMENT_EDGE] },
    { type: 'Flower_4_Single', model: SNM + 'Flower_4_Single.gltf', scale: 0.7, cat: CAT.FLOWER, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'kn_flower_purpleA', model: KNK + 'flower_purpleA.glb', scale: 1.0, cat: CAT.FLOWER, w: 3, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'kn_flower_redA',    model: KNK + 'flower_redA.glb',    scale: 1.0, cat: CAT.FLOWER, w: 3, zones: [ZONE.CLEARING] },
    { type: 'kn_flower_yellowA', model: KNK + 'flower_yellowA.glb', scale: 1.0, cat: CAT.FLOWER, w: 3, zones: [ZONE.CLEARING] },

    // ── LAYER 4: Rocks (Base) ──
    { type: 'Rock_Medium_1',   model: SNM + 'Rock_Medium_1.gltf',   scale: 1.0, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY, ZONE.FOREST, ZONE.WILD] },
    { type: 'Rock_Medium_2',   model: SNM + 'Rock_Medium_2.gltf',   scale: 1.0, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'kn_rock_largeA',  model: KNK + 'rock_largeA.glb',      scale: 1.0, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
    { type: 'Pebble_Round_1',  model: SNM + 'Pebble_Round_1.gltf',  scale: 0.6, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.PATH, ZONE.WILD] },
    { type: 'Pebble_Round_2',  model: SNM + 'Pebble_Round_2.gltf',  scale: 0.6, cat: CAT.PEBBLE, w: 2, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Pebble_Square_1', model: SNM + 'Pebble_Square_1.gltf', scale: 0.6, cat: CAT.PEBBLE, w: 2, zones: [ZONE.ROCKY, ZONE.PATH] },
    { type: 'kn_stone_smallA', model: KNK + 'stone_smallA.glb',     scale: 1.0, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.PATH, ZONE.WILD] },
    { type: 'kn_stone_smallB', model: KNK + 'stone_smallB.glb',     scale: 1.0, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.PATH, ZONE.WILD] },

    // ── Mushrooms ──
    { type: 'Mushroom_Common',      model: SNM + 'Mushroom_Common.gltf',     scale: 0.8, cat: CAT.MUSHROOM, w: 2, zones: [ZONE.FOREST] },
    { type: 'kn_mushroom_redGroup', model: KNK + 'mushroom_redGroup.glb',    scale: 1.0, cat: CAT.MUSHROOM, w: 2, zones: [ZONE.FOREST] },
    { type: 'kn_mushroom_tanGroup', model: KNK + 'mushroom_tanGroup.glb',    scale: 1.0, cat: CAT.MUSHROOM, w: 2, zones: [ZONE.FOREST] },

    // ── Stumps & Logs ──
    { type: 'kn_stump_round', model: KNK + 'stump_round.glb', scale: 1.0, cat: CAT.STUMP, w: 1, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'kn_log',         model: KNK + 'log.glb',         scale: 1.0, cat: CAT.STUMP, w: 1, zones: [ZONE.FOREST, ZONE.CLEARING] },

    // ── Settlement edge props ──
    { type: 'kn_campfire_stones', model: KNK + 'campfire_stones.glb', scale: 1.0, cat: CAT.FURNITURE, w: 1, zones: [ZONE.SETTLEMENT_EDGE] },
    { type: 'RockPath_Round_Small_1', model: SNM + 'RockPath_Round_Small_1.gltf', scale: 1.0, cat: CAT.PATH_PROP, w: 2, zones: [ZONE.PATH, ZONE.SETTLEMENT_EDGE] },
    { type: 'RockPath_Round_Small_2', model: SNM + 'RockPath_Round_Small_2.gltf', scale: 1.0, cat: CAT.PATH_PROP, w: 2, zones: [ZONE.PATH, ZONE.SETTLEMENT_EDGE] },
  ],

  ashlands: [
    // Trees (dead/twisted)
    { type: 'DeadTree_1', model: SNM + 'DeadTree_1.gltf', scale: 1.0, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'DeadTree_2', model: SNM + 'DeadTree_2.gltf', scale: 1.0, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'DeadTree_3', model: SNM + 'DeadTree_3.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'DeadTree_4', model: SNM + 'DeadTree_4.gltf', scale: 0.9, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.ROCKY] },
    { type: 'DeadTree_5', model: SNM + 'DeadTree_5.gltf', scale: 1.0, cat: CAT.TREE, w: 1, zones: [ZONE.ROCKY] },
    { type: 'TwistedTree_1', model: SNM + 'TwistedTree_1.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'TwistedTree_2', model: SNM + 'TwistedTree_2.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    // Rocks
    { type: 'Rock_Medium_1',    model: SNM + 'Rock_Medium_1.gltf',    scale: 1.4, cat: CAT.ROCK, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Rock_Medium_3',    model: SNM + 'Rock_Medium_3.gltf',    scale: 1.2, cat: CAT.ROCK, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Pebble_Square_3',  model: SNM + 'Pebble_Square_3.gltf',  scale: 0.9, cat: CAT.PEBBLE, w: 4, zones: [ZONE.ROCKY, ZONE.WILD, ZONE.CLEARING] },
    { type: 'Pebble_Square_4',  model: SNM + 'Pebble_Square_4.gltf',  scale: 0.9, cat: CAT.PEBBLE, w: 4, zones: [ZONE.ROCKY, ZONE.WILD, ZONE.CLEARING] },
    { type: 'Pebble_Round_3',   model: SNM + 'Pebble_Round_3.gltf',   scale: 0.8, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'kn_rock_tallA',    model: KNK + 'rock_tallA.glb',        scale: 1.3, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY] },
    { type: 'kn_rock_tallB',    model: KNK + 'rock_tallB.glb',        scale: 1.3, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY] },
    // Stumps
    { type: 'kn_stump_old',     model: KNK + 'stump_old.glb',         scale: 1.0, cat: CAT.STUMP, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'kn_stump_oldTall', model: KNK + 'stump_oldTall.glb',     scale: 1.0, cat: CAT.STUMP, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    // Settlement props
    { type: 'ks_campfire_pit', model: KSK + 'campfire-pit.glb', scale: 1.0, cat: CAT.FURNITURE, w: 1, zones: [ZONE.SETTLEMENT_EDGE, ZONE.CLEARING] },
    { type: 'ks_tent',         model: KSK + 'tent.glb',         scale: 1.0, cat: CAT.STRUCTURE, w: 0.5, zones: [ZONE.SETTLEMENT_EDGE] },
    { type: 'ks_barrel_open',  model: KSK + 'barrel-open.glb',  scale: 1.0, cat: CAT.FURNITURE, w: 1, zones: [ZONE.SETTLEMENT_EDGE] },
  ],

  ironrain: [
    // Twisted trees
    { type: 'TwistedTree_1', model: SNM + 'TwistedTree_1.gltf', scale: 1.1, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'TwistedTree_2', model: SNM + 'TwistedTree_2.gltf', scale: 1.1, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'TwistedTree_3', model: SNM + 'TwistedTree_3.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'TwistedTree_4', model: SNM + 'TwistedTree_4.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'TwistedTree_5', model: SNM + 'TwistedTree_5.gltf', scale: 1.0, cat: CAT.TREE, w: 1, zones: [ZONE.FOREST, ZONE.ROCKY] },
    { type: 'DeadTree_2',    model: SNM + 'DeadTree_2.gltf',    scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'DeadTree_3',    model: SNM + 'DeadTree_3.gltf',    scale: 1.0, cat: CAT.TREE, w: 1, zones: [ZONE.ROCKY] },
    // Rocks (dominant in ironrain)
    { type: 'Rock_Medium_1',   model: SNM + 'Rock_Medium_1.gltf',   scale: 1.5, cat: CAT.ROCK, w: 3, zones: [ZONE.ROCKY, ZONE.FOREST, ZONE.WILD] },
    { type: 'Rock_Medium_2',   model: SNM + 'Rock_Medium_2.gltf',   scale: 1.5, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Rock_Medium_3',   model: SNM + 'Rock_Medium_3.gltf',   scale: 1.5, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY] },
    { type: 'Pebble_Square_5', model: SNM + 'Pebble_Square_5.gltf', scale: 1.0, cat: CAT.PEBBLE, w: 4, zones: [ZONE.ROCKY, ZONE.WILD, ZONE.PATH] },
    { type: 'Pebble_Square_6', model: SNM + 'Pebble_Square_6.gltf', scale: 1.0, cat: CAT.PEBBLE, w: 4, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'kn_rock_largeB',  model: KNK + 'rock_largeB.glb',      scale: 1.4, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
    { type: 'kn_rock_largeC',  model: KNK + 'rock_largeC.glb',      scale: 1.4, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
    // Ruins (castle kit)
    { type: 'kc_wall',         model: KCK + 'wall.glb',         scale: 1.0, cat: CAT.STRUCTURE, w: 0.5, zones: [ZONE.SETTLEMENT_EDGE, ZONE.ROCKY] },
    { type: 'kc_wall_half',    model: KCK + 'wall-half.glb',    scale: 1.0, cat: CAT.STRUCTURE, w: 0.5, zones: [ZONE.SETTLEMENT_EDGE, ZONE.ROCKY] },
    { type: 'kc_tower_square', model: KCK + 'tower-square.glb', scale: 0.9, cat: CAT.STRUCTURE, w: 0.1, zones: [ZONE.SETTLEMENT_EDGE] },
    { type: 'kc_rocks_large',  model: KCK + 'rocks-large.glb',  scale: 1.2, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
  ],

  rootblight: [
    // Twisted trees
    { type: 'TwistedTree_3', model: SNM + 'TwistedTree_3.gltf', scale: 1.1, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'TwistedTree_4', model: SNM + 'TwistedTree_4.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'TwistedTree_5', model: SNM + 'TwistedTree_5.gltf', scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'DeadTree_4',    model: SNM + 'DeadTree_4.gltf',    scale: 0.9, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.ROCKY] },
    // Mushrooms (dominant in rootblight)
    { type: 'Mushroom_Common',      model: SNM + 'Mushroom_Common.gltf',      scale: 1.0, cat: CAT.MUSHROOM, w: 4, zones: [ZONE.FOREST, ZONE.CLEARING, ZONE.WILD] },
    { type: 'Mushroom_Laetiporus',  model: SNM + 'Mushroom_Laetiporus.gltf',  scale: 1.1, cat: CAT.MUSHROOM, w: 3, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'kn_mushroom_redGroup', model: KNK + 'mushroom_redGroup.glb',     scale: 1.3, cat: CAT.MUSHROOM, w: 3, zones: [ZONE.FOREST, ZONE.CLEARING] },
    { type: 'kn_mushroom_tanGroup', model: KNK + 'mushroom_tanGroup.glb',     scale: 1.3, cat: CAT.MUSHROOM, w: 3, zones: [ZONE.FOREST, ZONE.CLEARING] },
    { type: 'kn_mushroom_red',      model: KNK + 'mushroom_red.glb',          scale: 1.2, cat: CAT.MUSHROOM, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    { type: 'kn_mushroom_tan',      model: KNK + 'mushroom_tan.glb',          scale: 1.2, cat: CAT.MUSHROOM, w: 2, zones: [ZONE.CLEARING, ZONE.WILD] },
    // Plants
    { type: 'Plant_7',     model: SNM + 'Plant_7.gltf',     scale: 0.9, cat: CAT.PLANT, w: 3, zones: [ZONE.FOREST, ZONE.CLEARING] },
    { type: 'Plant_7_Big', model: SNM + 'Plant_7_Big.gltf', scale: 0.9, cat: CAT.PLANT, w: 1, zones: [ZONE.FOREST] },
    { type: 'Fern_1',      model: SNM + 'Fern_1.gltf',      scale: 1.0, cat: CAT.PLANT, w: 4, zones: [ZONE.FOREST, ZONE.CLEARING, ZONE.WILD] },
    { type: 'Clover_1',    model: SNM + 'Clover_1.gltf',    scale: 0.8, cat: CAT.PLANT, w: 3, zones: [ZONE.CLEARING, ZONE.FOREST] },
    { type: 'Clover_2',    model: SNM + 'Clover_2.gltf',    scale: 0.8, cat: CAT.PLANT, w: 3, zones: [ZONE.CLEARING] },
    // Petals (detail)
    { type: 'Petal_1', model: SNM + 'Petal_1.gltf', scale: 0.5, cat: CAT.FLOWER, w: 2, zones: [ZONE.CLEARING, ZONE.FOREST] },
    { type: 'Petal_2', model: SNM + 'Petal_2.gltf', scale: 0.5, cat: CAT.FLOWER, w: 2, zones: [ZONE.CLEARING] },
    { type: 'Petal_3', model: SNM + 'Petal_3.gltf', scale: 0.5, cat: CAT.FLOWER, w: 2, zones: [ZONE.CLEARING] },
    // Rocks
    { type: 'Rock_Medium_2',  model: SNM + 'Rock_Medium_2.gltf',  scale: 1.0, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Rock_Medium_3',  model: SNM + 'Rock_Medium_3.gltf',  scale: 1.0, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
    { type: 'Pebble_Round_4', model: SNM + 'Pebble_Round_4.gltf', scale: 0.7, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Pebble_Round_5', model: SNM + 'Pebble_Round_5.gltf', scale: 0.7, cat: CAT.PEBBLE, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
  ],

  schism: [
    // Dead trees
    { type: 'DeadTree_5',    model: SNM + 'DeadTree_5.gltf',    scale: 1.0, cat: CAT.TREE, w: 3, zones: [ZONE.FOREST, ZONE.WILD, ZONE.ROCKY] },
    { type: 'DeadTree_1',    model: SNM + 'DeadTree_1.gltf',    scale: 1.1, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.WILD] },
    { type: 'DeadTree_3',    model: SNM + 'DeadTree_3.gltf',    scale: 1.0, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    { type: 'TwistedTree_4', model: SNM + 'TwistedTree_4.gltf', scale: 1.2, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST, ZONE.ROCKY] },
    { type: 'TwistedTree_5', model: SNM + 'TwistedTree_5.gltf', scale: 1.2, cat: CAT.TREE, w: 2, zones: [ZONE.FOREST] },
    // Rocks (dominant in schism)
    { type: 'Rock_Medium_1',   model: SNM + 'Rock_Medium_1.gltf',   scale: 1.6, cat: CAT.ROCK, w: 3, zones: [ZONE.ROCKY, ZONE.WILD, ZONE.FOREST] },
    { type: 'Rock_Medium_3',   model: SNM + 'Rock_Medium_3.gltf',   scale: 1.6, cat: CAT.ROCK, w: 3, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Pebble_Square_1', model: SNM + 'Pebble_Square_1.gltf', scale: 1.0, cat: CAT.PEBBLE, w: 5, zones: [ZONE.ROCKY, ZONE.WILD, ZONE.CLEARING] },
    { type: 'Pebble_Square_2', model: SNM + 'Pebble_Square_2.gltf', scale: 1.0, cat: CAT.PEBBLE, w: 5, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'Pebble_Round_1',  model: SNM + 'Pebble_Round_1.gltf',  scale: 1.0, cat: CAT.PEBBLE, w: 4, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'kn_rock_tallC',   model: KNK + 'rock_tallC.glb',       scale: 1.5, cat: CAT.ROCK, w: 2, zones: [ZONE.ROCKY] },
    { type: 'kn_rock_largeA',  model: KNK + 'rock_largeA.glb',      scale: 1.5, cat: CAT.ROCK, w: 1, zones: [ZONE.ROCKY] },
    // Ruins
    { type: 'kc_wall_half',   model: KCK + 'wall-half.glb',   scale: 0.8, cat: CAT.STRUCTURE, w: 0.3, zones: [ZONE.SETTLEMENT_EDGE, ZONE.ROCKY] },
    { type: 'kc_rocks_small', model: KCK + 'rocks-small.glb', scale: 1.0, cat: CAT.PEBBLE, w: 1, zones: [ZONE.ROCKY, ZONE.WILD] },
    { type: 'kp_crate',       model: KPK + 'crate.glb',       scale: 1.0, cat: CAT.FURNITURE, w: 0.5, zones: [ZONE.SETTLEMENT_EDGE] },
    { type: 'kp_barrel',      model: KPK + 'barrel.glb',      scale: 1.0, cat: CAT.FURNITURE, w: 0.5, zones: [ZONE.SETTLEMENT_EDGE] },
  ],
};

// ── POI definitions — structured set-dressing ────────────────────────────
// Each POI has a center, radius, and coherently placed props in layers

const POI_DEFS = [
  // ── Grassland village ──
  {
    x: 50, z: 50, radius: 12, name: 'Village',
    // Layer: Structures (walls, roofs)
    structures: [
      { model: MVK + 'Wall_Plaster_Door_Round.gltf', scale: 1.0, dx: 0, dz: 0, ry: 0 },
      { model: MVK + 'Wall_Plaster_Straight.gltf',   scale: 1.0, dx: 3, dz: 0, ry: 0 },
      { model: MVK + 'Wall_Plaster_Straight.gltf',   scale: 1.0, dx: -3, dz: 0, ry: Math.PI },
      { model: MVK + 'Wall_Plaster_Straight.gltf',   scale: 1.0, dx: 0, dz: -3, ry: Math.PI / 2 },
      { model: MVK + 'Roof_2x4_RoundTile.gltf',      scale: 1.0, dx: 0, dz: 0, ry: 0 },
    ],
    // Layer: Furniture (inside/around structures)
    furniture: [
      { model: FPM + 'Bench.gltf',        scale: 0.8, dx: -4, dz: 3, ry: 1.57 },
      { model: FPM + 'Barrel.gltf',       scale: 0.8, dx: 5, dz: 1, ry: 0 },
      { model: FPM + 'Barrel.gltf',       scale: 0.8, dx: 5.4, dz: 2, ry: 0.8 },
      { model: FPM + 'Crate_Wooden.gltf', scale: 0.8, dx: 5, dz: -1, ry: 0.4 },
      { model: FPM + 'Crate_Wooden.gltf', scale: 0.7, dx: 5.5, dz: -0.5, ry: 1.1 },
    ],
    // Layer: Details (small decoration)
    details: [
      { model: KNK + 'campfire_stones.glb', scale: 1.0, dx: -2, dz: 6, ry: 0 },
      { model: FPM + 'Torch_Metal.gltf',    scale: 1.0, dx: -1, dz: -1, ry: 0 },
      { model: FPM + 'Torch_Metal.gltf',    scale: 1.0, dx: 4, dz: -1, ry: 0 },
    ],
  },

  // ── Fantasy town square ──
  {
    x: -60, z: 40, radius: 14, name: 'Fantasy Town',
    structures: [
      { model: KFT + 'wall-door.glb',      scale: 1.2, dx: 0, dz: 0, ry: 0 },
      { model: KFT + 'wall-block.glb',     scale: 1.2, dx: 3, dz: 0, ry: 0 },
      { model: KFT + 'wall-block.glb',     scale: 1.2, dx: -3, dz: 0, ry: 0 },
      { model: KFT + 'roof-flat.glb',      scale: 1.2, dx: 0, dz: 0, ry: 0 },
    ],
    furniture: [
      { model: KFT + 'stall.glb',          scale: 1.0, dx: -5, dz: 5, ry: 0 },
      { model: KFT + 'stall.glb',          scale: 1.0, dx: 5, dz: 5, ry: Math.PI },
      { model: KFT + 'fountain-round.glb', scale: 1.0, dx: 0, dz: 8, ry: 0 },
    ],
    details: [
      { model: KFT + 'lantern.glb',        scale: 1.0, dx: -3, dz: 7, ry: 0 },
      { model: KFT + 'lantern.glb',        scale: 1.0, dx: 3, dz: 7, ry: 0 },
      { model: KFT + 'lantern.glb',        scale: 1.0, dx: -6, dz: 3, ry: 0 },
    ],
  },

  // ── Blacksmith camp ──
  {
    x: 30, z: -40, radius: 10, name: 'Blacksmith',
    structures: [
      { model: FPM + 'Anvil.gltf',         scale: 1.0, dx: 0, dz: 0, ry: 0 },
      { model: FPM + 'Workbench.gltf',     scale: 1.0, dx: 2.5, dz: 0, ry: 0 },
    ],
    furniture: [
      { model: FPM + 'Barrel.gltf',        scale: 0.8, dx: -2, dz: 2, ry: 0 },
      { model: FPM + 'Barrel_Apples.gltf', scale: 0.8, dx: -2, dz: 3.2, ry: 0.7 },
      { model: FPM + 'WeaponStand.gltf',   scale: 1.0, dx: 3.5, dz: 2.5, ry: -0.5 },
      { model: FPM + 'WeaponStand.gltf',   scale: 1.0, dx: 4.5, dz: 2.5, ry: -0.3 },
    ],
    details: [
      { model: FPM + 'Torch_Metal.gltf',   scale: 1.0, dx: -3, dz: -1, ry: 0 },
      { model: FPM + 'Torch_Metal.gltf',   scale: 1.0, dx: 5, dz: -1, ry: 0 },
      { model: KSK + 'campfire-pit.glb',   scale: 1.0, dx: 0, dz: 5, ry: 0 },
    ],
  },

  // ── Survival outpost ──
  {
    x: -40, z: -50, radius: 10, name: 'Survival Outpost',
    structures: [
      { model: KSK + 'tent.glb',           scale: 1.2, dx: 0, dz: 0, ry: 0 },
      { model: KSK + 'tent.glb',           scale: 1.0, dx: 5, dz: -2, ry: 1.0 },
    ],
    furniture: [
      { model: KSK + 'workbench.glb',      scale: 1.0, dx: -3, dz: 1, ry: 0.8 },
      { model: KSK + 'chest.glb',          scale: 1.0, dx: 2, dz: -1, ry: 0 },
      { model: KSK + 'barrel.glb',         scale: 1.0, dx: -3, dz: 3, ry: 0 },
      { model: KSK + 'barrel.glb',         scale: 1.0, dx: -2.5, dz: 3.5, ry: 0.5 },
    ],
    details: [
      { model: KSK + 'campfire-stand.glb', scale: 1.0, dx: 3, dz: 3, ry: 0 },
      { model: KSK + 'bedroll.glb',        scale: 1.0, dx: 1, dz: -2, ry: 1.2 },
      { model: KSK + 'bedroll.glb',        scale: 1.0, dx: 6, dz: -3, ry: 0.8 },
    ],
  },

  // ── Castle watchtower ──
  {
    x: 70, z: -30, radius: 12, name: 'Castle Watchtower',
    structures: [
      { model: KCK + 'tower-square.glb',   scale: 1.0, dx: 0, dz: 0, ry: 0 },
      { model: KCK + 'wall.glb',           scale: 1.0, dx: 4, dz: 0, ry: 0 },
      { model: KCK + 'wall.glb',           scale: 1.0, dx: -4, dz: 0, ry: 0 },
      { model: KCK + 'wall.glb',           scale: 1.0, dx: 0, dz: -4, ry: Math.PI / 2 },
      { model: KCK + 'gate.glb',           scale: 1.0, dx: 0, dz: 4, ry: Math.PI / 2 },
    ],
    furniture: [],
    details: [
      { model: KCK + 'flag.glb',           scale: 1.0, dx: 0, dz: 0, ry: 0 },
      { model: KCK + 'flag.glb',           scale: 1.0, dx: 4, dz: 0, ry: 0 },
    ],
  },

  // ── Pirate cove ──
  {
    x: -70, z: -20, radius: 12, name: 'Pirate Cove',
    structures: [
      { model: KPK + 'ship-wreck.glb',     scale: 1.0, dx: 0, dz: 0, ry: 0.3 },
    ],
    furniture: [
      { model: KPK + 'barrel.glb',         scale: 1.0, dx: 5, dz: 2, ry: 0 },
      { model: KPK + 'barrel.glb',         scale: 1.0, dx: 5.5, dz: 3, ry: 0.8 },
      { model: KPK + 'barrel.glb',         scale: 1.0, dx: -4, dz: 4, ry: 1.2 },
      { model: KPK + 'crate.glb',          scale: 1.0, dx: 4, dz: 4, ry: 0 },
      { model: KPK + 'crate.glb',          scale: 0.9, dx: 4.5, dz: 4.5, ry: 0.6 },
      { model: KPK + 'chest.glb',          scale: 1.0, dx: 6, dz: 1, ry: -0.2 },
    ],
    details: [
      { model: KPK + 'cannon-mobile.glb',  scale: 1.0, dx: -3, dz: 3, ry: 0.5 },
      { model: KPK + 'cannon-mobile.glb',  scale: 1.0, dx: -5, dz: 1, ry: -0.3 },
    ],
  },

  // ── Alchemy hut ──
  {
    x: 20, z: 60, radius: 8, name: 'Alchemy Hut',
    structures: [
      { model: FPM + 'Cauldron.gltf',          scale: 1.0, dx: 0, dz: 0, ry: 0 },
    ],
    furniture: [
      { model: FPM + 'BookStand.gltf',         scale: 1.0, dx: -2, dz: 0, ry: 0.5 },
      { model: FPM + 'Shelf_Arch.gltf',        scale: 1.0, dx: -3, dz: 2, ry: 0 },
      { model: FPM + 'Shelf_Arch.gltf',        scale: 1.0, dx: -3, dz: -2, ry: Math.PI },
    ],
    details: [
      { model: FPM + 'Potion_1.gltf',          scale: 1.0, dx: 1, dz: 0, ry: 0 },
      { model: FPM + 'Potion_2.gltf',          scale: 1.0, dx: 1.3, dz: 0.3, ry: 0 },
      { model: FPM + 'Potion_4.gltf',          scale: 1.0, dx: 1.6, dz: 0, ry: 0 },
      { model: FPM + 'Candle_1.gltf',          scale: 0.8, dx: 0, dz: 2, ry: 0 },
      { model: FPM + 'Candle_1.gltf',          scale: 0.8, dx: 2, dz: 2, ry: 0 },
      { model: FPM + 'SmallBottle.gltf',       scale: 0.8, dx: -1, dz: 1, ry: 0 },
    ],
  },

  // ── Ruined shrine ──
  {
    x: -20, z: 70, radius: 10, name: 'Ruined Shrine',
    structures: [
      { model: KFT + 'pillar-stone.glb',       scale: 1.3, dx: -3, dz: -3, ry: 0 },
      { model: KFT + 'pillar-stone.glb',       scale: 1.3, dx:  3, dz: -3, ry: 0 },
      { model: KFT + 'pillar-stone.glb',       scale: 1.3, dx: -3, dz:  3, ry: 0 },
      { model: KFT + 'pillar-stone.glb',       scale: 1.3, dx:  3, dz:  3, ry: 0 },
    ],
    furniture: [
      { model: FPM + 'Chalice.gltf',           scale: 1.2, dx: 0, dz: 0, ry: 0 },
    ],
    details: [
      { model: FPM + 'CandleStick_Triple.gltf', scale: 1.0, dx: -1.5, dz: 0, ry: 0 },
      { model: FPM + 'CandleStick_Triple.gltf', scale: 1.0, dx:  1.5, dz: 0, ry: 0 },
      { model: FPM + 'Candle_1.gltf',           scale: 0.7, dx: 0, dz: -1.5, ry: 0 },
      { model: FPM + 'Candle_1.gltf',           scale: 0.7, dx: 0, dz: 1.5, ry: 0 },
    ],
  },
];

const _poiMeshes = [];
let _scene = null;
let _useFreePacks = false;

// ── Density per zone type ────────────────────────────────────────────────
const ZONE_DENSITY = {
  [ZONE.SETTLEMENT_CORE]: 0,       // no random props, only POI set-dressing
  [ZONE.SETTLEMENT_EDGE]: 0.6,     // moderate: some crates, bushes, paths
  [ZONE.PATH]:            0.35,    // sparse: pebbles, path stones
  [ZONE.FOREST]:          1.3,     // dense: lots of trees and undergrowth
  [ZONE.CLEARING]:        0.8,     // moderate: flowers and small plants
  [ZONE.ROCKY]:           0.7,     // moderate: rocks dominant
  [ZONE.WILD]:            0.6,     // base density
};

// ── Init — batch load all biome templates + POIs ─────────────────────────

export async function initPropsFreePacks(scene, biomeName, useFreePacks = true) {
  _scene = scene;
  _useFreePacks = useFreePacks;
  if (!_useFreePacks) return;

  // Register POIs for zone system
  registerPOIs(POI_DEFS);

  // Collect ALL unique model paths for this biome + POIs
  const propDefs = BIOME_PROPS[biomeName] || [];
  const batchItems = [];
  const seen = new Set();

  // Biome props
  for (const def of propDefs) {
    if (!seen.has(def.model)) {
      seen.add(def.model);
      batchItems.push({ path: def.model, id: `tpl_${def.type}` });
    }
  }

  // POI models (all layers)
  for (const poi of POI_DEFS) {
    const allModels = [
      ...(poi.structures || []),
      ...(poi.furniture || []),
      ...(poi.details || []),
    ];
    for (const m of allModels) {
      if (!seen.has(m.model)) {
        seen.add(m.model);
        batchItems.push({ path: m.model, id: `poi_${m.model.split('/').pop()}` });
      }
    }
  }

  console.log(`[PROPS] Batch loading ${batchItems.length} unique models...`);

  // Batch load all at once (6 concurrent)
  const loaded = await batchLoadGltf(batchItems, scene, 6);

  // Build template map for this biome
  if (!_propTemplates.has(biomeName)) {
    _propTemplates.set(biomeName, new Map());
  }
  const tplMap = _propTemplates.get(biomeName);

  for (const def of propDefs) {
    const mesh = loaded.get(def.model);
    if (mesh && !tplMap.has(def.type)) {
      mesh.scaling.scaleInPlace(def.scale);
      mesh.setEnabled(false); // hide template
      mesh.isPickable = false;
      tplMap.set(def.type, mesh);
    }
  }

  console.log(`[PROPS] ${tplMap.size}/${propDefs.length} templates ready`);

  // Spawn POIs using layered system
  await _spawnPOIs(scene, loaded);
}

// ── POI spawning — layered: structures → furniture → details ─────────────

// Find the flattest position near (cx, cz) within searchRadius
function _findFlatSpot(cx, cz, searchRadius = 25) {
  let bestX = cx, bestZ = cz;
  let bestSlope = getTerrainSlope(cx, cz);
  const step = 5;
  for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
    for (let dz = -searchRadius; dz <= searchRadius; dz += step) {
      const sx = cx + dx, sz = cz + dz;
      const s = getTerrainSlope(sx, sz);
      if (s < bestSlope) {
        bestSlope = s;
        bestX = sx;
        bestZ = sz;
      }
    }
  }
  return { x: bestX, z: bestZ, slope: bestSlope };
}

async function _spawnPOIs(scene, loadedMap) {
  for (const poi of POI_DEFS) {
    // Auto-reposition POI to flattest nearby spot
    const flat = _findFlatSpot(poi.x, poi.z, 30);
    const poiX = flat.x;
    const poiZ = flat.z;
    const poiSlope = flat.slope;

    if (poiSlope > 0.44) {  // ~25° — still too steep even after searching
      console.log(`[PROPS] Skipping POI "${poi.name}" — no flat ground found (best ${(poiSlope * 180 / Math.PI).toFixed(0)}°)`);
      continue;
    }

    if (poiX !== poi.x || poiZ !== poi.z) {
      console.log(`[PROPS] Relocated POI "${poi.name}" from (${poi.x},${poi.z}) to (${poiX},${poiZ}) — slope ${(poiSlope * 180 / Math.PI).toFixed(0)}°`);
    }

    const layers = [
      { items: poi.structures || [], label: 'struct', cat: 'structure' },
      { items: poi.furniture || [],  label: 'furn',   cat: 'furniture' },
      { items: poi.details || [],    label: 'detail', cat: 'detail' },
    ];

    for (const layer of layers) {
      for (const m of layer.items) {
        const template = loadedMap.get(m.model);
        if (!template) continue;

        try {
          const px = poiX + m.dx;
          const pz = poiZ + m.dz;

          // Per-item slope check
          const itemSlope = getTerrainSlope(px, pz);
          const maxSlope = MAX_SLOPE[layer.cat] ?? 0.52;
          if (itemSlope > maxSlope) continue;

          const mesh = template.clone(`poi_${poi.name}_${layer.label}_${m.dx}_${m.dz}`);
          mesh.rotation.y = m.ry || 0;
          mesh.scaling.scaleInPlace(m.scale);

          // Terrain snapping with slope alignment
          snapPropToTerrain(mesh, px, pz, layer.cat, 0);

          mesh.setEnabled(true);
          mesh.isPickable = false;

          // Shadow casting on structures (main visual anchors)
          if (layer.label === 'struct') {
            try { addShadowCaster(mesh); } catch (e) {}
          }

          _poiMeshes.push(mesh);

          // VFX: campfire smoke on fire-related POI items
          const modelName = m.model.toLowerCase();
          if (modelName.includes('campfire') || modelName.includes('fire')) {
            addCampfireSmoke(px, pz);
          }
        } catch (e) {
          // skip broken POI element
        }
      }
    }
  }
  console.log(`[PROPS] ${_poiMeshes.length} POI meshes placed (layered, snapped, shadows)`);
}

// ── Chunk spawn — zone-aware placement ───────────────────────────────────

const SPAWN_EXCLUSION = 400; // 20u² autour de (0,0) — keep spawn clear

// Max slope (radians) for prop placement per category
// ~30° for trees, ~45° for rocks, ~25° for structures
const MAX_SLOPE = {
  [CAT.TREE]:      0.52,   // ~30°
  [CAT.BUSH]:      0.60,   // ~35°
  [CAT.FLOWER]:    0.52,   // ~30°
  [CAT.ROCK]:      0.78,   // ~45°
  [CAT.PEBBLE]:    0.78,   // ~45°
  [CAT.MUSHROOM]:  0.52,   // ~30°
  [CAT.STUMP]:     0.52,   // ~30°
  [CAT.PLANT]:     0.60,   // ~35°
  [CAT.STRUCTURE]: 0.35,   // ~20°
  [CAT.FURNITURE]: 0.44,   // ~25°
  [CAT.DETAIL]:    0.60,   // ~35°
  [CAT.PATH_PROP]: 0.52,   // ~30°
};

export function spawnChunkPropsFreePacks(cx, cz, biome, scene, densityScale = 1) {
  if (!_useFreePacks) return null;

  const chunkId = `${cx}:${cz}`;
  if (_chunks.has(chunkId)) return _chunks.get(chunkId);

  const propDefs = BIOME_PROPS[biome?.name] || [];
  if (propDefs.length === 0) return null;

  const instances = [];
  const baseCount = CONFIG.world.propsPerChunk;
  const rng = _rng(`chunk_${cx}_${cz}`);
  const templates = _propTemplates.get(biome?.name) || new Map();
  if (templates.size === 0) { _chunks.set(chunkId, instances); return instances; }

  // Sample zone at chunk center for overall density
  const chunkCenterX = (cx + 0.5) * CONFIG.world.chunkSize;
  const chunkCenterZ = (cz + 0.5) * CONFIG.world.chunkSize;
  const chunkZone = getZoneAt(chunkCenterX, chunkCenterZ);
  const zoneDensity = ZONE_DENSITY[chunkZone.zone] ?? 0.6;

  // Settlement core = no random props at all (only POI set-dressing)
  if (chunkZone.zone === ZONE.SETTLEMENT_CORE) {
    _chunks.set(chunkId, instances);
    return instances;
  }

  const count = Math.max(3, Math.round(baseCount * densityScale * zoneDensity));

  const placed = []; // track placed positions for distance check
  let attempts = 0;
  const maxAttempts = count * 4;

  for (let i = 0; i < count && attempts < maxAttempts; attempts++) {
    const px = cx * CONFIG.world.chunkSize + rng() * CONFIG.world.chunkSize;
    const pz = cz * CONFIG.world.chunkSize + rng() * CONFIG.world.chunkSize;

    // Skip spawn area
    if (px * px + pz * pz < SPAWN_EXCLUSION) continue;

    // Get zone at this specific position
    const posZone = getZoneAt(px, pz);

    // No random props inside settlement core
    if (posZone.zone === ZONE.SETTLEMENT_CORE) continue;

    // Filter props valid for this zone
    const validProps = propDefs.filter(d => {
      if (!d.zones) return true;
      return d.zones.includes(posZone.zone);
    });

    if (validProps.length === 0) continue;

    // Weighted random selection from valid props
    const totalWeight = validProps.reduce((s, d) => s + (d.w || 1), 0);
    let roll = rng() * totalWeight;
    let propDef = validProps[0];
    for (const d of validProps) {
      roll -= (d.w || 1);
      if (roll <= 0) { propDef = d; break; }
    }

    const template = templates.get(propDef.type);
    if (!template) continue;

    // Check min distance based on category
    const minDSq = MIN_DIST_SQ[propDef.cat] || 4;
    let tooClose = false;
    for (const p of placed) {
      const ddx = px - p.x;
      const ddz = pz - p.z;
      const dist2 = ddx * ddx + ddz * ddz;
      // Use the larger of both items' min distances
      const reqDist = Math.max(minDSq, MIN_DIST_SQ[p.cat] || 4);
      if (dist2 < reqDist) { tooClose = true; break; }
    }
    if (tooClose) continue;

    // Check near POIs — respect POI radius
    let insidePoi = false;
    for (const poi of POI_DEFS) {
      const ddx = px - poi.x;
      const ddz = pz - poi.z;
      const poiR = poi.radius || 8;
      if (ddx * ddx + ddz * ddz < poiR * poiR) { insidePoi = true; break; }
    }
    if (insidePoi) continue;

    // Slope check — skip props on terrain too steep for their category
    const slope = getTerrainSlope(px, pz);
    const maxSlope = MAX_SLOPE[propDef.cat] ?? 0.60;
    if (slope > maxSlope) continue;

    // Y-offset for category
    const yOff = Y_OFFSET[propDef.cat] || 0;

    try {
      const instance = createInstance(template, `prop_${chunkId}_${i}`);
      instance.rotation.y = rng() * Math.PI * 2;

      // Scale variation per category
      let scaleVar;
      switch (propDef.cat) {
        case CAT.TREE:      scaleVar = 0.8 + rng() * 0.4; break;  // 0.8–1.2
        case CAT.ROCK:      scaleVar = 0.7 + rng() * 0.6; break;  // 0.7–1.3
        case CAT.BUSH:      scaleVar = 0.75 + rng() * 0.5; break; // 0.75–1.25
        case CAT.FLOWER:    scaleVar = 0.8 + rng() * 0.4; break;
        case CAT.STRUCTURE: scaleVar = 0.95 + rng() * 0.1; break; // almost uniform
        default:            scaleVar = 0.8 + rng() * 0.4; break;
      }
      instance.scaling.scaleInPlace(scaleVar);

      // Terrain snapping — align to slope per category
      snapPropToTerrain(instance, px, pz, propDef.cat, yOff);

      instance.isPickable = false;

      instances.push(instance);
      placed.push({ x: px, z: pz, cat: propDef.cat });
      i++;
    } catch (e) {
      // skip
    }
  }

  _chunks.set(chunkId, instances);
  return instances;
}

export function disposeChunkPropsFreePacks(cx, cz) {
  const chunkId = `${cx}:${cz}`;
  const instances = _chunks.get(chunkId);
  if (!instances) return;
  for (const inst of instances) {
    try { inst.dispose(); } catch (e) {}
  }
  _chunks.delete(chunkId);
}

export function despawnChunkPropsFreePacks(cx, cz) {
  disposeChunkPropsFreePacks(cx, cz);
}

function _rng(seed) {
  let value = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function getPropsFreePacaksCacheState() {
  return {
    useFreePacks: _useFreePacks,
    templatesLoaded: Array.from(_propTemplates.keys()),
    chunksActive: _chunks.size,
    poisSpawned: _poiMeshes.length,
  };
}
