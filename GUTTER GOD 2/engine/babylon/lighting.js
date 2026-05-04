// engine/babylon/lighting.js — lumières + ombres + biome micro-climate

import {
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Vector3,
  Color3,
} from '@babylonjs/core';
import { CONFIG } from '../../core/config.js';

let _shadowGenerator = null;
let _ambient = null;
let _sun = null;

// ── Biome lighting presets — micro-climate per biome ─────────────────────
const BIOME_LIGHTING = {
  grassland: {
    ambientIntensity: 0.45,
    ambientDiffuse:   new Color3(0.8, 0.85, 1.0),
    groundColor:      new Color3(0.25, 0.2, 0.12),
    sunIntensity:     1.2,
    sunDiffuse:       new Color3(1.0, 0.95, 0.85),
    sunDirection:     new Vector3(-0.5, -1.0, -0.3),
    shadowDarkness:   0.4,
  },
  ashlands: {
    ambientIntensity: 0.3,
    ambientDiffuse:   new Color3(0.6, 0.45, 0.35),
    groundColor:      new Color3(0.15, 0.1, 0.06),
    sunIntensity:     0.8,
    sunDiffuse:       new Color3(0.9, 0.6, 0.35),
    sunDirection:     new Vector3(-0.3, -0.8, -0.5),
    shadowDarkness:   0.6,
  },
  ironrain: {
    ambientIntensity: 0.28,
    ambientDiffuse:   new Color3(0.45, 0.5, 0.6),
    groundColor:      new Color3(0.1, 0.1, 0.15),
    sunIntensity:     0.7,
    sunDiffuse:       new Color3(0.6, 0.65, 0.75),
    sunDirection:     new Vector3(-0.6, -0.7, -0.4),
    shadowDarkness:   0.55,
  },
  rootblight: {
    ambientIntensity: 0.32,
    ambientDiffuse:   new Color3(0.35, 0.55, 0.4),
    groundColor:      new Color3(0.08, 0.15, 0.08),
    sunIntensity:     0.75,
    sunDiffuse:       new Color3(0.7, 0.85, 0.6),
    sunDirection:     new Vector3(-0.4, -0.9, -0.3),
    shadowDarkness:   0.5,
  },
  schism: {
    ambientIntensity: 0.2,
    ambientDiffuse:   new Color3(0.3, 0.2, 0.4),
    groundColor:      new Color3(0.05, 0.03, 0.08),
    sunIntensity:     0.5,
    sunDiffuse:       new Color3(0.5, 0.3, 0.6),
    sunDirection:     new Vector3(-0.2, -1.0, -0.2),
    shadowDarkness:   0.7,
  },
};

export function initLighting(scene) {
  // Lumière ambiante hémisphérique
  _ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  _ambient.intensity    = 0.45;
  _ambient.diffuse      = new Color3(0.8, 0.85, 1.0);
  _ambient.groundColor  = new Color3(0.25, 0.2, 0.12);

  // Lumière directionnelle principale (soleil)
  _sun = new DirectionalLight('sun', new Vector3(-0.5, -1.0, -0.3), scene);
  _sun.intensity = 1.2;
  _sun.diffuse   = new Color3(1.0, 0.95, 0.85);
  _sun.specular  = new Color3(0.3, 0.3, 0.3);

  // Shadow map 512 fixe — contrainte Iris Xe
  _shadowGenerator = new ShadowGenerator(CONFIG.render.shadowMapSize, _sun);
  _shadowGenerator.useExponentialShadowMap = true;
  _shadowGenerator.darkness = 0.4;
  _shadowGenerator.bias     = 0.001;

  return { ambient: _ambient, sun: _sun, shadowGenerator: _shadowGenerator };
}

/**
 * Apply biome-specific lighting preset for micro-climate effect
 */
export function applyBiomeLighting(biomeName) {
  const preset = BIOME_LIGHTING[biomeName] ?? BIOME_LIGHTING.grassland;

  if (_ambient) {
    _ambient.intensity   = preset.ambientIntensity;
    _ambient.diffuse     = preset.ambientDiffuse;
    _ambient.groundColor = preset.groundColor;
  }

  if (_sun) {
    _sun.intensity = preset.sunIntensity;
    _sun.diffuse   = preset.sunDiffuse;
    _sun.direction = preset.sunDirection;
  }

  if (_shadowGenerator) {
    _shadowGenerator.darkness = preset.shadowDarkness;
  }
}

export function getShadowGenerator() {
  return _shadowGenerator;
}

export function addShadowCaster(mesh) {
  _shadowGenerator?.addShadowCaster(mesh, true);
}
