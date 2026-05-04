// world/WorldLandmarks.js — Natural & architectural landmarks (AAA open world)
// Massive visual structures that define the skyline and guide exploration.
// Inspired by: Genshin statues, BotW shrines, Crimson Desert vistas.
//
// Categories:
//   NATURAL:  Arches, pillars, crystal formations, giant trees, waterfalls
//   RUINS:    Temples, collapsed bridges, ancient gates, observatory domes
//   MARKERS:  Statue of the Seven style — heal points + lore

import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  DynamicTexture, GlowLayer,
} from '@babylonjs/core';
import { getTerrainHeight }       from './babylonTerrain.js';
import { registerPOI, isPOIActivated } from './WorldManager.js';
import { BasePOI }                from './POISystem.js';
import { Events }                 from '../core/events.js';

let _scene = null;

// ══════════════════════════════════════════════════════════════════════════
//  STATUE POI — Heal + lore (like Statue of the Seven)
// ══════════════════════════════════════════════════════════════════════════

class StatuePOI extends BasePOI {
  constructor(def) {
    super({ id: def.id, type: 'statue', label: def.label, x: def.x, z: def.z,
            discoverRange: 60, activateRange: 5 });
    this.healAmount = def.healAmount ?? 50;
    this.lore       = def.lore ?? '';
  }

  build(scene) {
    const y = this.y;

    // Circular platform
    const base = MeshBuilder.CreateCylinder(`statue_base_${this.id}`, {
      diameter: 6, height: 0.8, tessellation: 12,
    }, scene);
    base.position.set(this.x, y + 0.4, this.z);
    const baseMat = new StandardMaterial(`statue_baseMat_${this.id}`, scene);
    baseMat.diffuseColor = new Color3(0.6, 0.55, 0.48);
    baseMat.specularColor = new Color3(0.1, 0.1, 0.1);
    base.material = baseMat;
    base.isPickable = false;
    this.meshes.push(base);

    // Central figure (abstract humanoid — tall tapered box)
    const figure = MeshBuilder.CreateBox(`statue_fig_${this.id}`, {
      width: 1.0, height: 5.0, depth: 0.8,
    }, scene);
    figure.position.set(this.x, y + 3.4, this.z);
    const figMat = new StandardMaterial(`statue_figMat_${this.id}`, scene);
    figMat.diffuseColor = new Color3(0.75, 0.72, 0.65);
    figMat.specularColor = new Color3(0.15, 0.15, 0.15);
    figure.material = figMat;
    figure.isPickable = false;
    this.meshes.push(figure);

    // Halo ring above
    const halo = MeshBuilder.CreateTorus(`statue_halo_${this.id}`, {
      diameter: 2.5, thickness: 0.12, tessellation: 24,
    }, scene);
    halo.position.set(this.x, y + 6.5, this.z);
    const haloMat = new StandardMaterial(`statue_haloMat_${this.id}`, scene);
    haloMat.emissiveColor = new Color3(0.15, 0.10, 0.08);
    haloMat.disableLighting = true;
    haloMat.alpha = 0.5;
    halo.material = haloMat;
    halo.isPickable = false;
    this.meshes.push(halo);
    this._halo = halo;
    this._haloMat = haloMat;

    // Label
    const label = _makeLabel(scene, this.label, this.id);
    label.position.set(this.x, y + 8, this.z);
    this.meshes.push(label);
  }

  onNearby(playerPos, dist) {
    if (this.isActivated) return;
    if (dist < this.activateRange) this.activate();
  }

  activate() {
    if (this.isActivated) return;
    super.activate();

    if (this._haloMat) {
      this._haloMat.emissiveColor = new Color3(0.3, 0.8, 0.4);
      this._haloMat.alpha = 0.9;
    }

    // Heal player
    Events.emit('player:heal', { amount: this.healAmount });
    Events.emit('ui:notification', {
      text: `${this.label} — Soins reçus`,
      icon: 'statue',
      duration: 3500,
    });
    if (this.lore) {
      Events.emit('ui:lore', { text: this.lore });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  NATURAL LANDMARK — Giant stone arches, crystal pillars, ancient trees
// ══════════════════════════════════════════════════════════════════════════

function _buildNaturalArch(scene, x, z, id) {
  const y = getTerrainHeight(x, z);
  const meshes = [];

  // Left pillar
  const leftPillar = MeshBuilder.CreateCylinder(`arch_L_${id}`, {
    diameterTop: 2.5, diameterBottom: 3.5, height: 14, tessellation: 6,
  }, scene);
  leftPillar.position.set(x - 4, y + 7, z);
  leftPillar.rotation.z = 0.15; // slight lean
  const pillarMat = new StandardMaterial(`arch_mat_${id}`, scene);
  pillarMat.diffuseColor = new Color3(0.52, 0.48, 0.42);
  pillarMat.specularColor = Color3.Black();
  leftPillar.material = pillarMat;
  leftPillar.isPickable = false;
  meshes.push(leftPillar);

  // Right pillar
  const rightPillar = leftPillar.clone(`arch_R_${id}`);
  rightPillar.position.set(x + 4, y + 7, z);
  rightPillar.rotation.z = -0.15;
  meshes.push(rightPillar);

  // Arch bridge
  const bridge = MeshBuilder.CreateBox(`arch_bridge_${id}`, {
    width: 11, height: 2.5, depth: 3.5,
  }, scene);
  bridge.position.set(x, y + 14.5, z);
  bridge.rotation.z = 0.03;
  bridge.material = pillarMat;
  bridge.isPickable = false;
  meshes.push(bridge);

  return meshes;
}

function _buildCrystalFormation(scene, x, z, id) {
  const y = getTerrainHeight(x, z);
  const meshes = [];

  const crystalMat = new StandardMaterial(`crystal_mat_${id}`, scene);
  crystalMat.diffuseColor = new Color3(0.3, 0.6, 0.8);
  crystalMat.emissiveColor = new Color3(0.05, 0.15, 0.25);
  crystalMat.specularColor = new Color3(0.5, 0.5, 0.5);
  crystalMat.alpha = 0.85;

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 1.5 + Math.random() * 2;
    const height = 4 + Math.random() * 8;

    const crystal = MeshBuilder.CreateCylinder(`crystal_${id}_${i}`, {
      diameterTop: 0.1, diameterBottom: 0.8 + Math.random() * 0.6,
      height, tessellation: 5,
    }, scene);
    crystal.position.set(
      x + Math.cos(angle) * dist,
      y + height / 2,
      z + Math.sin(angle) * dist,
    );
    crystal.rotation.x = (Math.random() - 0.5) * 0.3;
    crystal.rotation.z = (Math.random() - 0.5) * 0.3;
    crystal.material = crystalMat;
    crystal.isPickable = false;
    meshes.push(crystal);
  }

  return meshes;
}

function _buildGiantTree(scene, x, z, id) {
  const y = getTerrainHeight(x, z);
  const meshes = [];

  // Massive trunk
  const trunk = MeshBuilder.CreateCylinder(`gtree_trunk_${id}`, {
    diameterTop: 2.5, diameterBottom: 5.0, height: 20, tessellation: 8,
  }, scene);
  trunk.position.set(x, y + 10, z);
  const trunkMat = new StandardMaterial(`gtree_trunkMat_${id}`, scene);
  trunkMat.diffuseColor = new Color3(0.35, 0.25, 0.15);
  trunkMat.specularColor = Color3.Black();
  trunk.material = trunkMat;
  trunk.isPickable = false;
  meshes.push(trunk);

  // Canopy (large sphere)
  const canopy = MeshBuilder.CreateSphere(`gtree_canopy_${id}`, {
    diameter: 18, segments: 8,
  }, scene);
  canopy.position.set(x, y + 22, z);
  canopy.scaling.y = 0.6; // flatten
  const canopyMat = new StandardMaterial(`gtree_canopyMat_${id}`, scene);
  canopyMat.diffuseColor = new Color3(0.15, 0.45, 0.12);
  canopyMat.specularColor = Color3.Black();
  canopy.material = canopyMat;
  canopy.isPickable = false;
  meshes.push(canopy);

  // Roots (sprawling cylinders)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const root = MeshBuilder.CreateCylinder(`gtree_root_${id}_${i}`, {
      diameterTop: 0.3, diameterBottom: 1.2, height: 6, tessellation: 5,
    }, scene);
    root.position.set(
      x + Math.cos(angle) * 3.5,
      y + 1.5,
      z + Math.sin(angle) * 3.5,
    );
    root.rotation.x = Math.cos(angle) * 0.7;
    root.rotation.z = Math.sin(angle) * 0.7;
    root.material = trunkMat;
    root.isPickable = false;
    meshes.push(root);
  }

  return meshes;
}

function _buildRuinedTemple(scene, x, z, id) {
  const y = getTerrainHeight(x, z);
  const meshes = [];

  const stoneMat = new StandardMaterial(`temple_mat_${id}`, scene);
  stoneMat.diffuseColor = new Color3(0.55, 0.50, 0.45);
  stoneMat.specularColor = Color3.Black();

  // Foundation
  const foundation = MeshBuilder.CreateBox(`temple_found_${id}`, {
    width: 12, height: 1.0, depth: 8,
  }, scene);
  foundation.position.set(x, y + 0.5, z);
  foundation.material = stoneMat;
  foundation.isPickable = false;
  meshes.push(foundation);

  // Columns (some standing, some fallen)
  const colPositions = [
    [-4, 0, -2.5], [-4, 0, 2.5], [4, 0, -2.5], [4, 0, 2.5],
    [0, 0, -2.5], [0, 0, 2.5],
  ];
  for (let i = 0; i < colPositions.length; i++) {
    const [cx, cy, cz] = colPositions[i];
    const standing = Math.random() > 0.3;
    const col = MeshBuilder.CreateCylinder(`temple_col_${id}_${i}`, {
      diameter: 0.8, height: standing ? 6 : 5, tessellation: 8,
    }, scene);
    if (standing) {
      col.position.set(x + cx, y + 4, z + cz);
    } else {
      // Fallen column
      col.position.set(x + cx + 1, y + 0.5, z + cz);
      col.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    }
    col.material = stoneMat;
    col.isPickable = false;
    meshes.push(col);
  }

  // Broken roof fragment
  const roof = MeshBuilder.CreateBox(`temple_roof_${id}`, {
    width: 8, height: 0.5, depth: 5,
  }, scene);
  roof.position.set(x - 1, y + 6.5, z);
  roof.rotation.z = 0.15;
  roof.rotation.x = -0.08;
  roof.material = stoneMat;
  roof.isPickable = false;
  meshes.push(roof);

  return meshes;
}

// ══════════════════════════════════════════════════════════════════════════
//  SPAWN ALL LANDMARKS
// ══════════════════════════════════════════════════════════════════════════

const LANDMARK_DEFS = [
  // Natural arches — dramatic silhouettes
  { type: 'arch',    x:  80,  z: -80  },
  { type: 'arch',    x: -150, z:  120 },
  { type: 'arch',    x:  300, z: -200 },

  // Crystal formations — glowing beacons
  { type: 'crystal', x:  60,  z:  120 },
  { type: 'crystal', x: -100, z: -150 },
  { type: 'crystal', x:  200, z:  180 },
  { type: 'crystal', x: -250, z: -100 },

  // Giant ancient trees — canopy landmarks
  { type: 'tree',    x:  130, z:  50  },
  { type: 'tree',    x: -80,  z:  200 },
  { type: 'tree',    x:  250, z: -80  },

  // Ruined temples — exploration goals
  { type: 'temple',  x:  40,  z: -130 },
  { type: 'temple',  x: -180, z: -40  },
  { type: 'temple',  x:  180, z:  250 },
  { type: 'temple',  x: -300, z:  300 },
];

const STATUE_DEFS = [
  { id: 'statue_origin',   label: 'Statue de l\'Éveil',       x: 15,    z: -15,
    lore: 'Celui qui s\'éveille ici connaîtra le chemin.', healAmount: 80 },
  { id: 'statue_grove',    label: 'Statue du Bosquet',         x: 100,   z: 50,
    lore: 'Les racines murmurent aux marcheurs solitaires.', healAmount: 60 },
  { id: 'statue_ridge',    label: 'Statue des Crêtes',         x: -120,  z: -100,
    lore: 'Du sommet, tout paraît insignifiant.', healAmount: 70 },
  { id: 'statue_desert',   label: 'Statue du Désert Cramoisi', x: 280,   z: -250,
    lore: 'Le sable se souvient de ceux qui osent.', healAmount: 90 },
  { id: 'statue_rift',     label: 'Statue du Gouffre',         x: 0,     z: -400,
    lore: 'Ne regarde pas en bas.', healAmount: 100 },
  { id: 'statue_oasis',    label: 'Statue de l\'Oasis',        x: -200,  z: 200,
    lore: 'L\'eau est un mensonge, la vie est vraie.', healAmount: 75 },
];

export function spawnWorldLandmarks(scene) {
  _scene = scene;
  let count = 0;

  // Natural landmarks
  for (let i = 0; i < LANDMARK_DEFS.length; i++) {
    const def = LANDMARK_DEFS[i];
    const id = `landmark_${def.type}_${i}`;

    let meshes = [];
    switch (def.type) {
      case 'arch':    meshes = _buildNaturalArch(scene, def.x, def.z, id); break;
      case 'crystal': meshes = _buildCrystalFormation(scene, def.x, def.z, id); break;
      case 'tree':    meshes = _buildGiantTree(scene, def.x, def.z, id); break;
      case 'temple':  meshes = _buildRuinedTemple(scene, def.x, def.z, id); break;
    }
    count += meshes.length;
  }

  // Statues (interactive)
  for (const def of STATUE_DEFS) {
    const statue = new StatuePOI(def);
    statue.build(scene);
    registerPOI(statue);
    count += statue.meshes.length;
  }

  console.log(`[WorldLandmarks] Spawned ${LANDMARK_DEFS.length} landmarks + ${STATUE_DEFS.length} statues (${count} meshes)`);
  return count;
}

// ── Helper ───────────────────────────────────────────────────────────────

function _makeLabel(scene, text, id) {
  const plane = MeshBuilder.CreatePlane(`lm_label_${id}`, { width: 3.5, height: 0.5 }, scene);
  plane.billboardMode = 7;
  plane.isPickable = false;

  const tex = new DynamicTexture(`lm_tex_${id}`, { width: 280, height: 40 }, scene, false);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 280, 40);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, 280, 40);
  ctx.fillStyle = '#e8d8a0';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, 140, 27);
  tex.update();

  const mat = new StandardMaterial(`lm_labelMat_${id}`, scene);
  mat.diffuseTexture  = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  plane.material = mat;
  return plane;
}
