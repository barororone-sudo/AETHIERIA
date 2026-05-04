// world/babylonSky.js

import { MeshBuilder, StandardMaterial, Color3, Color4 } from '@babylonjs/core';
import { Events } from '../core/events.js';
import { getWorldSnapshot } from '../persistence/worldStateManager.js';

let _scene = null;
let _skyMesh = null;
let _skyMat = null;
let _currentBiome = null;
let _eventsBound = false;

const SKY_COLORS = {
  grassland:  { top: new Color3(0.35, 0.55, 0.85), horizon: new Color3(0.65, 0.78, 0.92) },
  ashlands:   { top: new Color3(0.20, 0.15, 0.12), horizon: new Color3(0.50, 0.35, 0.22) },
  ironrain:   { top: new Color3(0.15, 0.18, 0.25), horizon: new Color3(0.35, 0.38, 0.45) },
  rootblight: { top: new Color3(0.10, 0.18, 0.12), horizon: new Color3(0.25, 0.38, 0.28) },
  schism:     { top: new Color3(0.08, 0.05, 0.12), horizon: new Color3(0.22, 0.12, 0.28) },
};

const WORLD_SKY_COLORS = {
  fractured: { top: new Color3(0.32, 0.10, 0.58), horizon: new Color3(0.55, 0.28, 0.70) },
  upperSignal: { top: new Color3(0.05, 0.09, 0.18), horizon: new Color3(0.28, 0.36, 0.55) },
};

export function initSky(scene, biome) {
  _scene = scene;
  _currentBiome = biome;
  const colors = SKY_COLORS[biome.name] ?? SKY_COLORS.grassland;

  scene.clearColor = new Color4(colors.horizon.r, colors.horizon.g, colors.horizon.b, 1);

  _skyMesh = MeshBuilder.CreateSphere('sky', { diameter: 800, segments: 8, sideOrientation: 1 }, scene);
  _skyMesh.infiniteDistance = true;
  _skyMesh.isPickable = false;

  _skyMat = new StandardMaterial('sky-mat', scene);
  _skyMat.diffuseColor = colors.top;
  _skyMat.emissiveColor = colors.top;
  _skyMat.backFaceCulling = false;
  _skyMat.disableLighting = true;
  _skyMesh.material = _skyMat;

  scene.fogMode = 3;
  scene.fogDensity = biome.fogDensity;
  scene.fogColor = new Color3(colors.horizon.r, colors.horizon.g, colors.horizon.b);

  _bindWorldSkyEvents();
  _applySnapshotSky();
  return _skyMesh;
}

export function updateSkyForBiome(scene, biome) {
  _currentBiome = biome;
  _applySnapshotSky();
}

export function getSkyDebug() {
  const snapshot = getWorldSnapshot();
  return {
    fractured: Boolean(snapshot.flags.SKY_DOME_FIRST_CRACK),
    upperSignal: Boolean(snapshot.flags.A2_UPPER_WORLD_SIGNAL_CONFIRMED),
    biome: _currentBiome?.name ?? 'none',
  };
}

function _bindWorldSkyEvents() {
  if (_eventsBound) return;
  _eventsBound = true;
  Events.on('world:flagSet', ({ key, value }) => {
    if (!value) return;
    if (key === 'SKY_DOME_FIRST_CRACK' || key === 'A2_UPPER_WORLD_SIGNAL_CONFIRMED') {
      _applySnapshotSky();
    }
  });
  Events.on('act:changed', () => _applySnapshotSky());
}

function _applySnapshotSky() {
  if (!_scene || !_skyMat || !_currentBiome) return;

  const snapshot = getWorldSnapshot();
  let colors = SKY_COLORS[_currentBiome.name] ?? SKY_COLORS.grassland;

  if (snapshot.flags.SKY_DOME_FIRST_CRACK) {
    colors = WORLD_SKY_COLORS.fractured;
  }
  if (snapshot.flags.A2_UPPER_WORLD_SIGNAL_CONFIRMED) {
    colors = WORLD_SKY_COLORS.upperSignal;
  }

  _skyMat.diffuseColor = colors.top;
  _skyMat.emissiveColor = colors.top;
  _scene.fogColor = new Color3(colors.horizon.r, colors.horizon.g, colors.horizon.b);
  _scene.clearColor = new Color4(colors.horizon.r, colors.horizon.g, colors.horizon.b, 1);
  _scene.fogDensity = _currentBiome.fogDensity;
}

