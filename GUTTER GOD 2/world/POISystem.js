// world/POISystem.js — Interactive Points of Interest (Genshin/BotW style)
// Base class + TowerPOI (map reveal) + WaypointPOI (fast travel)
//
// Architecture: extensible class hierarchy
//   BasePOI → TowerPOI    (climb → interact → fog of war lifted)
//           → WaypointPOI (approach → auto-activate → fast travel unlocked)
//           → [custom]    (extend BasePOI for shrines, chests, NPCs, etc.)

import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  DynamicTexture, GlowLayer, Animation,
} from '@babylonjs/core';
import { getTerrainHeight }       from './babylonTerrain.js';
import { registerPOI }            from './WorldManager.js';
import { Events }                 from '../core/events.js';
import { CONFIG }                 from '../core/config.js';

let _scene    = null;
let _glowLayer = null;

// ── Init ─────────────────────────────────────────────────────────────────

export function initPOISystem(scene) {
  _scene = scene;

  // Shared glow layer for POI effects (reuse if exists)
  _glowLayer = scene.getGlowLayerByName?.('poiGlow');
  if (!_glowLayer) {
    _glowLayer = new GlowLayer('poiGlow', scene, {
      mainTextureSamples: 2,
      blurKernelSize: 32,
    });
    _glowLayer.intensity = 0.6;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  BASE POI — abstract parent for all interactive structures
// ══════════════════════════════════════════════════════════════════════════

export class BasePOI {
  constructor({ id, type, label, x, z, discoverRange = 50, activateRange = 15 }) {
    this.id             = id;
    this.type           = type;
    this.label          = label;
    this.x              = x;
    this.z              = z;
    this.y              = getTerrainHeight(x, z);
    this.discoverRange  = discoverRange;
    this.activateRange  = activateRange;
    this.isActivated    = false;
    this.isDiscovered   = false;
    this.meshes         = [];        // all meshes belonging to this POI
    this._currentDist   = Infinity;
  }

  /** Called when player first comes within discoverRange */
  onDiscover(playerPos, dist) {
    this.isDiscovered = true;
  }

  /** Called every proximity tick when player is within activateRange and not yet activated */
  onNearby(playerPos, dist) {
    // Override in subclass
  }

  /** Activate this POI */
  activate() {
    if (this.isActivated) return;
    this.isActivated = true;
    Events.emit('poi:activated', { id: this.id, type: this.type, label: this.label });
  }

  /** Build the 3D meshes for this POI */
  build(scene) {
    // Override in subclass
  }

  /** Dispose all meshes */
  dispose() {
    for (const m of this.meshes) {
      try { m.dispose(); } catch (e) {}
    }
    this.meshes = [];
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  TOWER POI — Revelation tower (climb to top → reveal map region)
// ══════════════════════════════════════════════════════════════════════════

export class TowerPOI extends BasePOI {
  constructor({ id, label, x, z, revealRadius = 200, height = 18 }) {
    super({ id, type: 'tower', label, x, z, discoverRange: 80, activateRange: 4 });
    this.revealRadius = revealRadius;
    this.towerHeight  = height;
    this._beacon      = null;
    this._beaconMat   = null;
  }

  build(scene) {
    const baseY = this.y;

    // ── Tower base (stone cylinder) ──────────────────────────────────
    const base = MeshBuilder.CreateCylinder(`tower_base_${this.id}`, {
      diameter: 4.5,
      height: 2.0,
      tessellation: 8,
    }, scene);
    base.position.set(this.x, baseY + 1.0, this.z);
    const baseMat = new StandardMaterial(`tower_baseMat_${this.id}`, scene);
    baseMat.diffuseColor = new Color3(0.45, 0.42, 0.38);
    baseMat.specularColor = Color3.Black();
    base.material = baseMat;
    base.isPickable = false;
    this.meshes.push(base);

    // ── Tower body (tall tapered cylinder) ───────────────────────────
    const body = MeshBuilder.CreateCylinder(`tower_body_${this.id}`, {
      diameterTop: 2.5,
      diameterBottom: 4.0,
      height: this.towerHeight,
      tessellation: 8,
    }, scene);
    body.position.set(this.x, baseY + 2.0 + this.towerHeight / 2, this.z);
    const bodyMat = new StandardMaterial(`tower_bodyMat_${this.id}`, scene);
    bodyMat.diffuseColor = new Color3(0.55, 0.50, 0.45);
    bodyMat.specularColor = new Color3(0.1, 0.1, 0.1);
    body.material = bodyMat;
    body.isPickable = false;
    this.meshes.push(body);

    // ── Observation platform ─────────────────────────────────────────
    const platform = MeshBuilder.CreateCylinder(`tower_platform_${this.id}`, {
      diameter: 5.5,
      height: 0.5,
      tessellation: 8,
    }, scene);
    platform.position.set(this.x, baseY + 2.0 + this.towerHeight + 0.25, this.z);
    platform.material = baseMat;
    platform.isPickable = false;
    this.meshes.push(platform);

    // ── Beacon (inactive — becomes active on reveal) ─────────────────
    this._beacon = MeshBuilder.CreateSphere(`tower_beacon_${this.id}`, {
      diameter: 1.5,
      segments: 8,
    }, scene);
    this._beacon.position.set(this.x, baseY + 2.0 + this.towerHeight + 1.5, this.z);
    this._beaconMat = new StandardMaterial(`tower_beaconMat_${this.id}`, scene);
    this._beaconMat.emissiveColor = new Color3(0.15, 0.12, 0.10); // dim when inactive
    this._beaconMat.disableLighting = true;
    this._beaconMat.alpha = 0.6;
    this._beacon.material = this._beaconMat;
    this._beacon.isPickable = false;
    this.meshes.push(this._beacon);

    // ── Label billboard ──────────────────────────────────────────────
    const label = _createLabel(scene, this.label, this.id);
    label.position.set(this.x, baseY + 2.0 + this.towerHeight + 3.5, this.z);
    this.meshes.push(label);
  }

  onNearby(playerPos, dist) {
    if (this.isActivated) return;

    // Check if player is near the top (climbed the tower)
    const topY = this.y + 2.0 + this.towerHeight;
    if (playerPos.y >= topY - 2.0 && dist < this.activateRange) {
      this.activate();
    }
  }

  activate() {
    if (this.isActivated) return;
    super.activate();

    // Light up the beacon
    if (this._beaconMat) {
      this._beaconMat.emissiveColor = new Color3(0.2, 0.7, 1.0);
      this._beaconMat.alpha = 1.0;
    }

    // Add beacon to glow layer
    if (this._beacon && _glowLayer) {
      _glowLayer.addIncludedOnlyMesh(this._beacon);
    }

    // Emit tower reveal event
    Events.emit('poi:towerRevealed', {
      id: this.id,
      label: this.label,
      x: this.x,
      z: this.z,
      revealRadius: this.revealRadius,
    });

    // UI notification
    Events.emit('ui:notification', {
      text: `Tour révélée : ${this.label}`,
      icon: 'tower',
      duration: 4000,
    });

    // Dramatic reveal animation — pulse the beacon
    _pulseBeacon(this._beacon, this._beaconMat);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  WAYPOINT POI — Teleportation point (approach → activate → fast travel)
// ══════════════════════════════════════════════════════════════════════════

export class WaypointPOI extends BasePOI {
  constructor({ id, label, x, z }) {
    super({ id, type: 'waypoint', label, x, z, discoverRange: 40, activateRange: 15 });
    this._pillar    = null;
    this._crystal   = null;
    this._crystalMat = null;
    this._ring      = null;
    this._ringMat   = null;
    this._activated = false;
  }

  build(scene) {
    const baseY = this.y;

    // ── Stone pedestal ───────────────────────────────────────────────
    const pedestal = MeshBuilder.CreateCylinder(`wp_pedestal_${this.id}`, {
      diameter: 3.0,
      height: 0.6,
      tessellation: 6,
    }, scene);
    pedestal.position.set(this.x, baseY + 0.3, this.z);
    const pedMat = new StandardMaterial(`wp_pedMat_${this.id}`, scene);
    pedMat.diffuseColor = new Color3(0.5, 0.48, 0.44);
    pedMat.specularColor = Color3.Black();
    pedestal.material = pedMat;
    pedestal.isPickable = false;
    this.meshes.push(pedestal);

    // ── Central pillar ───────────────────────────────────────────────
    this._pillar = MeshBuilder.CreateCylinder(`wp_pillar_${this.id}`, {
      diameterTop: 0.3,
      diameterBottom: 0.6,
      height: 3.0,
      tessellation: 6,
    }, scene);
    this._pillar.position.set(this.x, baseY + 2.1, this.z);
    this._pillar.material = pedMat;
    this._pillar.isPickable = false;
    this.meshes.push(this._pillar);

    // ── Crystal (inactive = dim gray, active = bright blue) ──────────
    this._crystal = MeshBuilder.CreateIcoSphere(`wp_crystal_${this.id}`, {
      radius: 0.45,
      subdivisions: 2,
    }, scene);
    this._crystal.position.set(this.x, baseY + 4.0, this.z);
    this._crystalMat = new StandardMaterial(`wp_crystalMat_${this.id}`, scene);
    this._crystalMat.emissiveColor = new Color3(0.12, 0.10, 0.08); // dim
    this._crystalMat.disableLighting = true;
    this._crystalMat.alpha = 0.5;
    this._crystal.material = this._crystalMat;
    this._crystal.isPickable = false;
    this.meshes.push(this._crystal);

    // ── Ground ring (activation zone indicator) ──────────────────────
    this._ring = MeshBuilder.CreateTorus(`wp_ring_${this.id}`, {
      diameter: 5.0,
      thickness: 0.08,
      tessellation: 24,
    }, scene);
    this._ring.position.set(this.x, baseY + 0.05, this.z);
    this._ringMat = new StandardMaterial(`wp_ringMat_${this.id}`, scene);
    this._ringMat.emissiveColor = new Color3(0.08, 0.06, 0.05);
    this._ringMat.disableLighting = true;
    this._ringMat.alpha = 0.3;
    this._ring.material = this._ringMat;
    this._ring.isPickable = false;
    this.meshes.push(this._ring);

    // ── Label ────────────────────────────────────────────────────────
    const label = _createLabel(scene, this.label, this.id);
    label.position.set(this.x, baseY + 5.5, this.z);
    this.meshes.push(label);
  }

  onNearby(playerPos, dist) {
    if (this.isActivated) return;

    // Auto-activate when player is within 15m
    if (dist < this.activateRange) {
      this.activate();
    }
  }

  activate() {
    if (this.isActivated) return;
    super.activate();

    // Light up the crystal
    if (this._crystalMat) {
      this._crystalMat.emissiveColor = new Color3(0.1, 0.5, 1.0);
      this._crystalMat.alpha = 1.0;
    }

    // Light up the ring
    if (this._ringMat) {
      this._ringMat.emissiveColor = new Color3(0.05, 0.3, 0.7);
      this._ringMat.alpha = 0.6;
    }

    // Glow
    if (this._crystal && _glowLayer) {
      _glowLayer.addIncludedOnlyMesh(this._crystal);
    }

    Events.emit('ui:notification', {
      text: `Point de voyage activé : ${this.label}`,
      icon: 'waypoint',
      duration: 3500,
    });

    // Subtle pulse animation on crystal
    _pulseBeacon(this._crystal, this._crystalMat);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  POI PLACEMENT — generates towers & waypoints across the world
// ══════════════════════════════════════════════════════════════════════════

// Tower positions — strategic high-ground locations across 10km world
const TOWER_DEFS = [
  { id: 'tower_central',    label: 'Tour du Commencement',   x: 0,     z: -50,   revealRadius: 250 },
  { id: 'tower_north',      label: 'Tour du Nord',           x: 20,    z: -200,  revealRadius: 300 },
  { id: 'tower_east',       label: 'Tour des Vents',         x: 250,   z: 30,    revealRadius: 280 },
  { id: 'tower_west',       label: 'Tour Oubliée',           x: -220,  z: -80,   revealRadius: 260 },
  { id: 'tower_south',      label: 'Tour des Cendres',       x: -30,   z: 280,   revealRadius: 300 },
  { id: 'tower_ashlands',   label: 'Tour Calcinée',          x: 350,   z: -300,  revealRadius: 250 },
  { id: 'tower_rootblight', label: 'Tour Corrompue',         x: -350,  z: 250,   revealRadius: 280 },
  { id: 'tower_schism',     label: 'Tour du Schisme',        x: 0,     z: -500,  revealRadius: 350 },
];

// Waypoint positions — scattered teleportation nodes
const WAYPOINT_DEFS = [
  { id: 'wp_spawn',     label: 'Camp de Base',        x: 5,     z: 5     },
  { id: 'wp_ruins',     label: 'Ruines Anciennes',    x: 45,    z: 45    },
  { id: 'wp_crossroad', label: 'Carrefour',           x: -60,   z: -60   },
  { id: 'wp_grove',     label: 'Bosquet Sacré',       x: 100,   z: -30   },
  { id: 'wp_quarry',    label: 'Carrière Abandonnée', x: -120,  z: 80    },
  { id: 'wp_bridge',    label: 'Pont Brisé',          x: 180,   z: 120   },
  { id: 'wp_oasis',     label: 'Oasis du Désert',     x: 280,   z: -150  },
  { id: 'wp_cavern',    label: 'Entrée des Cavernes', x: -200,  z: -200  },
  { id: 'wp_summit',    label: 'Col de la Montagne',  x: 50,    z: -350  },
  { id: 'wp_haven',     label: 'Refuge Caché',        x: -280,  z: 180   },
  { id: 'wp_rift',      label: 'Bord du Gouffre',     x: 100,   z: -450  },
  { id: 'wp_shrine',    label: 'Sanctuaire Perdu',    x: -100,  z: 350   },
];

export function spawnAllPOIs(scene) {
  if (!_scene) _scene = scene;

  let towerCount = 0;
  let waypointCount = 0;

  // Spawn towers
  for (const def of TOWER_DEFS) {
    const tower = new TowerPOI(def);
    tower.build(scene);
    registerPOI(tower);
    towerCount++;
  }

  // Spawn waypoints
  for (const def of WAYPOINT_DEFS) {
    const wp = new WaypointPOI(def);
    wp.build(scene);
    registerPOI(wp);
    waypointCount++;
  }

  console.log(`[POI] Spawned ${towerCount} towers + ${waypointCount} waypoints`);
  return { towers: towerCount, waypoints: waypointCount };
}

// ══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════

function _createLabel(scene, text, id) {
  const plane = MeshBuilder.CreatePlane(`poi_label_${id}`, { width: 3, height: 0.5 }, scene);
  plane.billboardMode = 7; // BILLBOARD_ALL
  plane.isPickable = false;

  const tex = new DynamicTexture(`poi_tex_${id}`, { width: 256, height: 40 }, scene, false);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 256, 40);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 256, 40);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 27);
  tex.update();

  const mat = new StandardMaterial(`poi_labelMat_${id}`, scene);
  mat.diffuseTexture  = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  plane.material = mat;

  return plane;
}

function _pulseBeacon(mesh, mat) {
  if (!mesh || !_scene) return;

  let t = 0;
  const origColor = mat.emissiveColor.clone();
  const brightColor = new Color3(
    Math.min(1, origColor.r * 3),
    Math.min(1, origColor.g * 3),
    Math.min(1, origColor.b * 3),
  );

  const obs = _scene.onBeforeRenderObservable.add(() => {
    t += _scene.getEngine().getDeltaTime() / 1000;

    // 3 pulses over 1.5 seconds
    const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
    mat.emissiveColor = Color3.Lerp(origColor, brightColor, pulse);
    mesh.scaling.setAll(1 + pulse * 0.2);

    if (t > 1.5) {
      mat.emissiveColor = origColor;
      mesh.scaling.setAll(1);
      _scene.onBeforeRenderObservable.remove(obs);
    }
  });
}
