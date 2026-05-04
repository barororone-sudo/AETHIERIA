// world/babylonWorldVfx.js — Ambient 3D VFX for immersive world
// Campfire smoke at POIs, biome-specific atmospherics (fireflies, dust, spores)
// Iris Xe budget: max 4 particle systems active at once, 50-100 particles each

import {
  ParticleSystem, Texture, Color4, Vector3,
  MeshBuilder, GPUParticleSystem,
} from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';

let _scene = null;
const _systems = [];      // active particle systems
const _campfires = [];    // campfire emitter positions

// ── Biome particle configs ───────────────────────────────────────────────
const BIOME_PARTICLES = {
  grassland: {
    type: 'fireflies',
    color1: new Color4(0.6, 0.9, 0.3, 0.8),
    color2: new Color4(0.3, 0.7, 0.1, 0.0),
    colorDead: new Color4(0.1, 0.3, 0.0, 0.0),
    minSize: 0.03,
    maxSize: 0.08,
    rate: 15,
    lifetime: { min: 2, max: 5 },
    speed: { min: 0.1, max: 0.4 },
    gravity: { x: 0, y: 0.05, z: 0 },
    emitBox: { min: new Vector3(-15, 0.5, -15), max: new Vector3(15, 4, 15) },
  },
  ashlands: {
    type: 'embers',
    color1: new Color4(1.0, 0.5, 0.1, 0.9),
    color2: new Color4(0.8, 0.2, 0.0, 0.0),
    colorDead: new Color4(0.2, 0.05, 0.0, 0.0),
    minSize: 0.02,
    maxSize: 0.06,
    rate: 25,
    lifetime: { min: 1.5, max: 4 },
    speed: { min: 0.2, max: 0.8 },
    gravity: { x: 0, y: 0.15, z: 0 },
    emitBox: { min: new Vector3(-20, 0, -20), max: new Vector3(20, 2, 20) },
  },
  ironrain: {
    type: 'dust',
    color1: new Color4(0.5, 0.5, 0.6, 0.4),
    color2: new Color4(0.3, 0.3, 0.4, 0.0),
    colorDead: new Color4(0.1, 0.1, 0.15, 0.0),
    minSize: 0.04,
    maxSize: 0.12,
    rate: 12,
    lifetime: { min: 3, max: 7 },
    speed: { min: 0.05, max: 0.2 },
    gravity: { x: 0.02, y: -0.01, z: 0.01 },
    emitBox: { min: new Vector3(-18, 0.3, -18), max: new Vector3(18, 5, 18) },
  },
  rootblight: {
    type: 'spores',
    color1: new Color4(0.3, 0.8, 0.4, 0.7),
    color2: new Color4(0.1, 0.5, 0.2, 0.0),
    colorDead: new Color4(0.0, 0.2, 0.1, 0.0),
    minSize: 0.03,
    maxSize: 0.1,
    rate: 20,
    lifetime: { min: 2, max: 6 },
    speed: { min: 0.08, max: 0.3 },
    gravity: { x: 0, y: 0.08, z: 0 },
    emitBox: { min: new Vector3(-16, 0.2, -16), max: new Vector3(16, 3, 16) },
  },
  schism: {
    type: 'void_motes',
    color1: new Color4(0.6, 0.2, 0.8, 0.8),
    color2: new Color4(0.3, 0.0, 0.5, 0.0),
    colorDead: new Color4(0.1, 0.0, 0.15, 0.0),
    minSize: 0.02,
    maxSize: 0.07,
    rate: 18,
    lifetime: { min: 1.5, max: 4 },
    speed: { min: 0.1, max: 0.5 },
    gravity: { x: 0, y: 0.1, z: 0 },
    emitBox: { min: new Vector3(-18, 0, -18), max: new Vector3(18, 4, 18) },
  },
};

// ── Smoke config for campfires ───────────────────────────────────────────
const SMOKE_CONFIG = {
  color1: new Color4(0.4, 0.35, 0.3, 0.5),
  color2: new Color4(0.2, 0.18, 0.15, 0.0),
  colorDead: new Color4(0.1, 0.1, 0.1, 0.0),
  minSize: 0.1,
  maxSize: 0.4,
  rate: 8,
  lifetime: { min: 1.5, max: 3 },
  speed: { min: 0.3, max: 0.8 },
};

// ── Init ─────────────────────────────────────────────────────────────────

export function initWorldVfx(scene, biomeName) {
  _scene = scene;

  // Ambient biome particles (follows player)
  _createBiomeParticles(biomeName);

  console.log(`[WORLD VFX] Init for ${biomeName} — ${_systems.length} particle systems`);
}

// ── Campfire smoke at POI fire pits ──────────────────────────────────────

export function addCampfireSmoke(x, z) {
  if (!_scene) return;
  if (_campfires.length >= 4) return; // budget limit

  const y = getTerrainHeight(x, z) + 0.3;
  const emitter = new Vector3(x, y, z);

  const ps = new ParticleSystem(`smoke_${x}_${z}`, 30, _scene);
  ps.createPointEmitter(new Vector3(0, 1, 0), new Vector3(0, 1, 0));
  ps.emitter = emitter;

  ps.color1     = SMOKE_CONFIG.color1;
  ps.color2     = SMOKE_CONFIG.color2;
  ps.colorDead  = SMOKE_CONFIG.colorDead;
  ps.minSize    = SMOKE_CONFIG.minSize;
  ps.maxSize    = SMOKE_CONFIG.maxSize;
  ps.minLifeTime = SMOKE_CONFIG.lifetime.min;
  ps.maxLifeTime = SMOKE_CONFIG.lifetime.max;
  ps.emitRate    = SMOKE_CONFIG.rate;
  ps.minEmitPower = SMOKE_CONFIG.speed.min;
  ps.maxEmitPower = SMOKE_CONFIG.speed.max;
  ps.gravity     = new Vector3(0.05, 0.6, 0.02); // drift up + slight wind
  ps.blendMode   = ParticleSystem.BLENDMODE_STANDARD;

  ps.start();
  _systems.push(ps);
  _campfires.push({ x, z, ps });
}

// ── Biome atmospheric particles ──────────────────────────────────────────

function _createBiomeParticles(biomeName) {
  const config = BIOME_PARTICLES[biomeName];
  if (!config) return;

  // Create a particle system that follows the player (we'll update emitter pos)
  const ps = new ParticleSystem(`biome_${biomeName}`, 80, _scene);
  ps.createBoxEmitter(
    new Vector3(0, 0.1, 0),    // direction1
    new Vector3(0, 0.3, 0),    // direction2
    config.emitBox.min,         // minEmitBox
    config.emitBox.max,         // maxEmitBox
  );

  // Emitter will be updated to player position each frame
  ps.emitter = Vector3.Zero();

  ps.color1     = config.color1;
  ps.color2     = config.color2;
  ps.colorDead  = config.colorDead;
  ps.minSize    = config.minSize;
  ps.maxSize    = config.maxSize;
  ps.minLifeTime = config.lifetime.min;
  ps.maxLifeTime = config.lifetime.max;
  ps.emitRate    = config.rate;
  ps.minEmitPower = config.speed.min;
  ps.maxEmitPower = config.speed.max;
  ps.gravity     = new Vector3(config.gravity.x, config.gravity.y, config.gravity.z);
  ps.blendMode   = ParticleSystem.BLENDMODE_ADD;

  // Fireflies flicker
  if (config.type === 'fireflies' || config.type === 'void_motes') {
    ps.minAngularSpeed = -0.5;
    ps.maxAngularSpeed = 0.5;
  }

  ps.start();
  ps._isBiomeParticle = true;
  _systems.push(ps);
}

// ── Update — move biome particles to follow player ───────────────────────

export function updateWorldVfx(playerPos) {
  if (!playerPos) return;
  for (const ps of _systems) {
    if (ps._isBiomeParticle && ps.emitter instanceof Vector3) {
      ps.emitter.x = playerPos.x;
      ps.emitter.y = playerPos.y + 1;
      ps.emitter.z = playerPos.z;
    }
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────

export function disposeWorldVfx() {
  for (const ps of _systems) {
    ps.stop();
    ps.dispose();
  }
  _systems.length = 0;
  _campfires.length = 0;
}

export function getWorldVfxDebugState() {
  return {
    systems: _systems.length,
    campfires: _campfires.length,
    totalParticles: _systems.reduce((s, ps) => s + (ps.getActiveCount?.() ?? 0), 0),
  };
}
