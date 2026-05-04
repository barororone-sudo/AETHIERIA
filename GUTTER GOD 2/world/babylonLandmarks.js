// world/babylonLandmarks.js — POI et landmarks par biome

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';

const LANDMARKS = {
  grassland: [
    { id: 'archive',   x:  45, z:  45, label: 'Archives de Vael\'Dorn', color: new Color3(0.8, 0.7, 0.2) },
    { id: 'watchtower',x:   0, z: -50, label: 'Tour de Guet',           color: new Color3(0.6, 0.5, 0.3) },
    { id: 'crossroads',x: -60, z: -60, label: 'Carrefour Maudit',       color: new Color3(0.5, 0.3, 0.5) },
  ],
  ironrain: [
    { id: 'iron-tower',x:  80, z:  60, label: 'Tour Majeure',           color: new Color3(0.5, 0.4, 0.3) },
  ],
  rootblight: [
    { id: 'sanctuary', x:   0, z:  80, label: 'Sanctuaire Corrompu',    color: new Color3(0.2, 0.6, 0.2) },
  ],
};

export function initLandmarks(scene, biomeName) {
  const defs = LANDMARKS[biomeName] ?? [];
  for (const def of defs) {
    _spawnLandmark(def, scene);
  }
}

function _spawnLandmark(def, scene) {
  const y = getTerrainHeight(def.x, def.z);

  // Pilier marqueur
  const pillar = MeshBuilder.CreateCylinder(`lm_${def.id}`, {
    height: 4, diameter: 0.4, tessellation: 6,
  }, scene);
  pillar.position.set(def.x, y + 2, def.z);
  pillar.isPickable = false;

  const mat = new StandardMaterial(`lm_mat_${def.id}`, scene);
  mat.emissiveColor = def.color;
  mat.disableLighting = true;
  pillar.material = mat;

  // Label flottant
  const plane = MeshBuilder.CreatePlane(`lm_label_${def.id}`, { width: 3, height: 0.5 }, scene);
  plane.position.set(def.x, y + 5, def.z);
  plane.billboardMode = 7;
  plane.isPickable    = false;

  const tex = new DynamicTexture(`lm_tex_${def.id}`, { width: 256, height: 48 }, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = `rgb(${Math.round(def.color.r*255)},${Math.round(def.color.g*255)},${Math.round(def.color.b*255)})`;
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(def.label, 128, 30);
  tex.update();

  const labelMat = new StandardMaterial(`lm_lmat_${def.id}`, scene);
  labelMat.diffuseTexture  = tex;
  labelMat.emissiveTexture = tex;
  labelMat.disableLighting = true;
  labelMat.useAlphaFromDiffuseTexture = true;
  plane.material = labelMat;
}
