// gameplay/babylonFactionConsequences.js — conséquences monde selon faction

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { getFaction }       from './babylonFactions.js';
import { setWorldFlag, hasFlag } from '../persistence/worldStateManager.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { Events }           from '../core/events.js';

let _scene = null;
const _objects = [];

export function initFactionConsequences(scene) {
  _scene = scene;
  Events.on('faction:changed', ({ faction }) => _applyConsequences(faction));
  // Appliquer si déjà une faction
  const f = getFaction();
  if (f) _applyConsequences(f);
}

function _applyConsequences(faction) {
  // Nettoyer les anciens objets
  _objects.forEach(o => o.dispose?.());
  _objects.length = 0;

  if (faction === 'guardians') {
    // Route nord débloquée, route sud bloquée
    setWorldFlag('route.north.blocked', false);
    setWorldFlag('route.south.blocked', true);
    _spawnBarrier(0, -80, '#4a8fe8', 'Route Sud — Bloquée par les Gardiens');
    _spawnAltar(25, 20, '#4a8fe8', 'Autel des Gardiens');
    Events.emit('loot:picked', { itemId: '🛡 Gardiens du Sceau — Route Nord ouverte' });
  } else if (faction === 'heirs') {
    // Route sud débloquée, route nord bloquée
    setWorldFlag('route.north.blocked', true);
    setWorldFlag('route.south.blocked', false);
    _spawnBarrier(0, 80, '#e84a4a', 'Route Nord — Bloquée par les Héritiers');
    _spawnAltar(-25, -15, '#e84a4a', 'Autel des Héritiers');
    Events.emit('loot:picked', { itemId: '⚔ Héritiers de la Rupture — Route Sud ouverte' });
  }
}

function _spawnBarrier(x, z, color, label) {
  const y = getTerrainHeight(x, z);
  // Mur de barrière
  const barrier = MeshBuilder.CreateBox(`barrier_${x}_${z}`, {
    width: 20, height: 4, depth: 0.5,
  }, _scene);
  barrier.position.set(x, y + 2, z);
  const mat = new StandardMaterial(`barrier_mat_${x}`, _scene);
  mat.diffuseColor  = Color3.FromHexString(color);
  mat.emissiveColor = Color3.FromHexString(color).scale(0.4);
  mat.alpha         = 0.7;
  barrier.material  = mat;
  barrier.isPickable = false;
  _objects.push(barrier);

  // Label
  const plane = MeshBuilder.CreatePlane(`barrier_label_${x}`, { width: 6, height: 0.6 }, _scene);
  plane.position.set(x, y + 5, z);
  plane.billboardMode = 7;
  plane.isPickable    = false;
  const tex = new DynamicTexture(`barrier_tex_${x}`, { width: 512, height: 48 }, _scene);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = color;
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, 256, 30);
  tex.update();
  const lmat = new StandardMaterial(`barrier_lmat_${x}`, _scene);
  lmat.diffuseTexture  = tex;
  lmat.emissiveTexture = tex;
  lmat.disableLighting = true;
  lmat.useAlphaFromDiffuseTexture = true;
  plane.material = lmat;
  _objects.push(plane);
}

function _spawnAltar(x, z, color, label) {
  const y = getTerrainHeight(x, z);
  const altar = MeshBuilder.CreateCylinder(`altar_${x}`, {
    height: 1.5, diameter: 4, tessellation: 8,
  }, _scene);
  altar.position.set(x, y + 0.75, z);
  const mat = new StandardMaterial(`altar_mat_${x}`, _scene);
  mat.diffuseColor  = Color3.FromHexString(color);
  mat.emissiveColor = Color3.FromHexString(color).scale(0.5);
  altar.material    = mat;
  altar.isPickable  = false;
  _objects.push(altar);
}
