// world/WorldManager.js — Open-world orchestrator (10km+ scale)
// Manages chunk streaming, biome assignment, POI registry, and map state.
// Designed for Genshin/BotW scale: 312×312 chunks at 32u each = 10km world.
//
// Architecture:
//   WorldManager → EcosystemManager (biome at position)
//                → InstancingSystem (mass thin instances)
//                → POI registry (towers, waypoints, etc.)
//                → ChunkStreamer (load/unload terrain + props + grass)

import { CONFIG }                from '../core/config.js';
import { Events }                from '../core/events.js';
import { getTerrainHeight }      from './babylonTerrain.js';
import { getBiomeAtPosition }    from './EcosystemManager.js';
import { applyBiomeLighting }    from '../engine/babylon/lighting.js';

// ── World constants ──────────────────────────────────────────────────────
const WORLD_SIZE        = 10000;                         // 10km total
const CHUNK_SIZE        = CONFIG.world.chunkSize;        // 32u
const CHUNKS_ACROSS     = Math.ceil(WORLD_SIZE / CHUNK_SIZE); // 312
const HALF_WORLD        = WORLD_SIZE / 2;

// Streaming radii (in chunks)
const LOAD_RADIUS       = CONFIG.world.chunkLoadRadius;  // near chunks: full detail
const UNLOAD_RADIUS     = CONFIG.world.chunkUnloadRadius;
const FAR_LOAD_RADIUS   = Math.min(LOAD_RADIUS + 2, 4); // far chunks: reduced detail

// ── State ────────────────────────────────────────────────────────────────
const _state = {
  initialized: false,
  scene: null,
  playerChunkX: 0,
  playerChunkZ: 0,
  currentBiome: 'grassland',
  loadedChunks: new Map(),    // key → { biome, lod, meshes }
  pendingLoad: [],
  pendingUnload: [],
  frameCounter: 0,
};

// ── POI Registry ─────────────────────────────────────────────────────────
const _pois = {
  all:        new Map(),     // id → POI instance
  towers:     [],            // TowerPOI[]
  waypoints:  [],            // WaypointPOI[]
  custom:     [],            // extensible
  activated:  new Set(),     // ids of activated POIs
  discovered: new Set(),     // ids of discovered (within range) POIs
};

// ── Fast travel list (for UI/map) ────────────────────────────────────────
const _fastTravel = [];

// ── Init ─────────────────────────────────────────────────────────────────

export function initWorldManager(scene) {
  _state.scene = scene;
  _state.initialized = true;

  // Listen for POI events
  Events.on('poi:activated', ({ id }) => {
    _pois.activated.add(id);
    const poi = _pois.all.get(id);
    if (poi?.type === 'waypoint') {
      _fastTravel.push({
        id: poi.id,
        label: poi.label,
        x: poi.x,
        z: poi.z,
        y: getTerrainHeight(poi.x, poi.z),
      });
      Events.emit('fastTravel:updated', { list: getFastTravelList() });
    }
  });

  Events.on('poi:towerRevealed', ({ id, x, z, revealRadius }) => {
    Events.emit('map:towerReveal', { id, x, z, revealRadius });
  });

  console.log(`[WorldManager] Init — ${CHUNKS_ACROSS}×${CHUNKS_ACROSS} chunks (${WORLD_SIZE}m world)`);
}

// ── Main update — called every frame ─────────────────────────────────────

export function updateWorldManager(playerPos) {
  if (!_state.initialized) return;

  const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
  const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

  // Detect biome transition
  const biome = getBiomeAtPosition(playerPos.x, playerPos.z);
  if (biome !== _state.currentBiome) {
    _state.currentBiome = biome;
    applyBiomeLighting(biome);
    Events.emit('biome:changed', { biome });
  }

  // Store player chunk
  _state.playerChunkX = pcx;
  _state.playerChunkZ = pcz;

  // Update POI proximity checks (every 15 frames to save CPU)
  _state.frameCounter++;
  if (_state.frameCounter % 15 === 0) {
    _updatePOIProximity(playerPos);
  }
}

// ── POI proximity ────────────────────────────────────────────────────────

function _updatePOIProximity(playerPos) {
  for (const [id, poi] of _pois.all) {
    const dx = poi.x - playerPos.x;
    const dz = poi.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Discovery range
    if (dist < poi.discoverRange && !_pois.discovered.has(id)) {
      _pois.discovered.add(id);
      poi.onDiscover?.(playerPos, dist);
      Events.emit('poi:discovered', { id, type: poi.type, label: poi.label });
    }

    // Activation range
    if (dist < poi.activateRange && !_pois.activated.has(id)) {
      poi.onNearby?.(playerPos, dist);
    }

    // Update distance for LOD/effects
    poi._currentDist = dist;
  }
}

// ── POI Registration API ─────────────────────────────────────────────────

export function registerPOI(poi) {
  _pois.all.set(poi.id, poi);
  if (poi.type === 'tower')    _pois.towers.push(poi);
  if (poi.type === 'waypoint') _pois.waypoints.push(poi);
  if (poi.type !== 'tower' && poi.type !== 'waypoint') _pois.custom.push(poi);
}

export function getPOI(id) {
  return _pois.all.get(id);
}

export function getAllPOIs() {
  return Array.from(_pois.all.values());
}

export function getActivatedPOIs() {
  return Array.from(_pois.activated);
}

export function isPOIActivated(id) {
  return _pois.activated.has(id);
}

// ── Fast Travel ──────────────────────────────────────────────────────────

export function getFastTravelList() {
  return [..._fastTravel];
}

export function fastTravelTo(id) {
  const entry = _fastTravel.find(e => e.id === id);
  if (!entry) return false;

  Events.emit('fastTravel:teleport', {
    x: entry.x,
    y: entry.y + CONFIG.player.height,
    z: entry.z,
    label: entry.label,
  });
  return true;
}

// ── Queries ──────────────────────────────────────────────────────────────

export function getCurrentBiome() {
  return _state.currentBiome;
}

export function getWorldSize() {
  return WORLD_SIZE;
}

export function getPlayerChunk() {
  return { cx: _state.playerChunkX, cz: _state.playerChunkZ };
}

export function getWorldDebug() {
  return {
    worldSize: WORLD_SIZE,
    chunksAcross: CHUNKS_ACROSS,
    currentBiome: _state.currentBiome,
    playerChunk: `${_state.playerChunkX},${_state.playerChunkZ}`,
    poisTotal: _pois.all.size,
    poisActivated: _pois.activated.size,
    poisDiscovered: _pois.discovered.size,
    towers: _pois.towers.length,
    waypoints: _pois.waypoints.length,
    fastTravelPoints: _fastTravel.length,
  };
}
