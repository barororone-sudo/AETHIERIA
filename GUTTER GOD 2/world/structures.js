// world/structures.js - Phase 8G: modular structures, settlements, ruins, towers.

import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  PointLight,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';
import { spawnChest } from './chestSystem.js';
import { appendCities, appendPOIs } from './zoneMap.js';
import { registerPOI, setMapTrackedTargetData } from './WorldManager.js';
import { getRapier, getWorld } from '../engine/babylon/physics.js';
import { Events } from '../core/events.js';

export const PHASE8G_VILLAGES = [
  {
    id: 'village_nara',
    name: 'Village de Nara',
    act: 1,
    x: 12,
    z: -98,
    radius: 28,
    center: 'fountain',
    houseCount: 6,
    palette: 'grassland',
    bridge: true,
    towerId: 'tower_nara_signal',
    npcSlots: [
      { id: 'npc_mael', role: 'quest_giver', x: 8, z: -103 },
      { id: 'npc_forge', role: 'blacksmith', x: 25, z: -95 },
      { id: 'npc_elara', role: 'merchant', x: 13, z: -82 },
      { id: 'npc_garde', role: 'villager', x: 1, z: -92 },
      { id: 'npc_mirelle', role: 'villager', x: 22, z: -110 },
    ],
  },
  {
    id: 'village_ironwatch',
    name: 'Ironwatch',
    act: 2,
    x: 180,
    z: -130,
    radius: 30,
    center: 'statue',
    houseCount: 5,
    palette: 'iron',
    towerId: 'tower_ironwatch_signal',
    npcSlots: [
      { id: 'npc_iron_captain', role: 'quest_giver', x: 178, z: -136 },
      { id: 'npc_iron_smith', role: 'blacksmith', x: 193, z: -126 },
      { id: 'npc_iron_merchant', role: 'merchant', x: 171, z: -118 },
      { id: 'npc_iron_guard', role: 'villager', x: 166, z: -135 },
      { id: 'npc_iron_refugee', role: 'villager', x: 187, z: -112 },
    ],
  },
  {
    id: 'village_ember_hollow',
    name: 'Ember Hollow',
    act: 3,
    x: -170,
    z: -160,
    radius: 28,
    center: 'bonfire',
    houseCount: 5,
    palette: 'ash',
    towerId: 'tower_ember_signal',
    npcSlots: [
      { id: 'npc_ember_seer', role: 'quest_giver', x: -169, z: -166 },
      { id: 'npc_ember_smith', role: 'blacksmith', x: -156, z: -158 },
      { id: 'npc_alchemist', role: 'alchemist', x: -180, z: -149 },
      { id: 'npc_ember_miner', role: 'villager', x: -184, z: -166 },
      { id: 'npc_ember_runner', role: 'villager', x: -160, z: -145 },
    ],
  },
];

const PHASE8G_RUINS = [
  { id: 'ruin_nara_well', act: 1, x: -38, z: -142, label: 'Puits effondre de Nara', secret: true },
  { id: 'ruin_old_shrine', act: 1, x: -20, z: 70, label: 'Sanctuaire bas' },
  { id: 'ruin_iron_gate', act: 2, x: 228, z: -104, label: 'Porte de fer', secret: true },
  { id: 'ruin_iron_archives', act: 2, x: 132, z: -180, label: 'Archives rouillees' },
  { id: 'ruin_ash_chapel', act: 3, x: -220, z: -132, label: 'Chapelle des cendres', secret: true },
  { id: 'ruin_ember_crossing', act: 3, x: -126, z: -204, label: 'Passage brule' },
];

const PHASE8G_TOWERS = [
  { id: 'tower_nara_signal', label: 'Tour de Nara', x: 42, z: -138, revealRadius: 240 },
  { id: 'tower_ironwatch_signal', label: 'Tour d Ironwatch', x: 206, z: -158, revealRadius: 280 },
  { id: 'tower_ember_signal', label: 'Tour d Ember Hollow', x: -142, z: -182, revealRadius: 260 },
];

const _matsByScene = new WeakMap();
const _spawnedScenes = new WeakSet();
const _registeredPOIScenes = new WeakSet();
const _towerRuntime = new Map();

function _mat(scene, name, diffuse, options = {}) {
  const m = new StandardMaterial(`phase8g_${name}`, scene);
  m.diffuseColor = diffuse;
  m.specularColor = Color3.Black();
  if (options.emissive) m.emissiveColor = options.emissive;
  if (options.alpha !== undefined) {
    m.alpha = options.alpha;
    m.useAlphaFromDiffuseTexture = true;
  }
  if (options.disableLighting) m.disableLighting = true;
  return m;
}

function _getMats(scene) {
  if (_matsByScene.has(scene)) return _matsByScene.get(scene);
  const mats = {
    stone: _mat(scene, 'stone', new Color3(0.43, 0.42, 0.38)),
    brokenStone: _mat(scene, 'broken_stone', new Color3(0.34, 0.35, 0.34)),
    plaster: _mat(scene, 'plaster', new Color3(0.58, 0.53, 0.44)),
    wood: _mat(scene, 'wood', new Color3(0.42, 0.27, 0.14)),
    darkWood: _mat(scene, 'dark_wood', new Color3(0.23, 0.15, 0.10)),
    roof: _mat(scene, 'roof', new Color3(0.48, 0.17, 0.10)),
    ironRoof: _mat(scene, 'iron_roof', new Color3(0.30, 0.31, 0.34)),
    ashRoof: _mat(scene, 'ash_roof', new Color3(0.24, 0.19, 0.17)),
    path: _mat(scene, 'path', new Color3(0.53, 0.48, 0.36), { alpha: 0.78 }),
    water: _mat(scene, 'water', new Color3(0.26, 0.55, 0.78), {
      emissive: new Color3(0.02, 0.12, 0.18),
      alpha: 0.56,
    }),
    vine: _mat(scene, 'vine', new Color3(0.17, 0.42, 0.14), {
      emissive: new Color3(0.02, 0.06, 0.02),
      alpha: 0.76,
    }),
    ember: _mat(scene, 'ember', new Color3(0.72, 0.23, 0.08), {
      emissive: new Color3(0.65, 0.15, 0.04),
    }),
    window: _mat(scene, 'window', new Color3(0.9, 0.67, 0.22), {
      emissive: new Color3(0.64, 0.42, 0.10),
      alpha: 0.86,
      disableLighting: true,
    }),
    lore: _mat(scene, 'lore_wood', new Color3(0.35, 0.23, 0.12)),
    secret: _mat(scene, 'secret_wall', new Color3(0.30, 0.31, 0.28), {
      emissive: new Color3(0.04, 0.02, 0.02),
    }),
  };
  _matsByScene.set(scene, mats);
  return mats;
}

function _rng(seedText = 'phase8g') {
  let seed = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

function _local(cx, cz, dx, dz, rotY = 0) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return { x: cx + dx * c - dz * s, z: cz + dx * s + dz * c };
}

function _createStaticBoxCollider(x, y, z, hx, hy, hz, rotY = 0) {
  const world = getWorld();
  const RAPIER = getRapier();
  if (!world || !RAPIER) return null;

  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(x, y, z)
    .setRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) });
  const body = world.createRigidBody(bodyDesc);
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
  return body;
}

function _box(scene, name, dims, x, y, z, rotY, mat, collider = true) {
  const mesh = MeshBuilder.CreateBox(name, dims, scene);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY || 0;
  mesh.material = mat;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.metadata = { ...(mesh.metadata || {}), phase8g: true, staticDecor: true };
  if (collider) {
    _createStaticBoxCollider(
      x,
      y,
      z,
      (dims.width || 1) / 2,
      (dims.height || 1) / 2,
      (dims.depth || 1) / 2,
      rotY || 0,
    );
  }
  return mesh;
}

function _groundPatch(scene, name, x, z, width, depth, rotY, mat) {
  const y = getTerrainHeight(x, z) + 0.025;
  const g = MeshBuilder.CreateGround(name, { width, height: depth }, scene);
  g.position.set(x, y, z);
  g.rotation.y = rotY || 0;
  g.material = mat;
  g.isPickable = false;
  g.metadata = { ...(g.metadata || {}), phase8g: true, path: true };
  return g;
}

function _createWindow(scene, x, y, z, rotY, mats, nightGroup) {
  const win = MeshBuilder.CreatePlane('phase8g_window', { width: 0.7, height: 0.52 }, scene);
  win.position.set(x, y, z);
  win.rotation.y = rotY;
  win.material = mats.window;
  win.isPickable = false;
  nightGroup.windows.push(win);
  return win;
}

function _house(scene, cx, cz, rotY, options, nightGroup) {
  const mats = _getMats(scene);
  const rng = options.rng;
  const width = 4.8 + rng() * 1.2;
  const depth = 4.2 + rng() * 1.0;
  const h = 2.6 + rng() * 0.5;
  const wall = options.palette === 'grassland' ? mats.plaster : mats.stone;
  const roofMat = options.palette === 'iron' ? mats.ironRoof : options.palette === 'ash' ? mats.ashRoof : mats.roof;
  const parts = [];

  const wallDepth = 0.28;
  const doorW = 1.25;
  const frontZ = -depth / 2;
  const backZ = depth / 2;
  const sideX = width / 2;

  const back = _local(cx, cz, 0, backZ, rotY);
  parts.push(_box(scene, 'phase8g_house_back', { width, height: h, depth: wallDepth }, back.x, getTerrainHeight(back.x, back.z) + h / 2, back.z, rotY, wall));

  const left = _local(cx, cz, -sideX, 0, rotY);
  parts.push(_box(scene, 'phase8g_house_left', { width: depth, height: h, depth: wallDepth }, left.x, getTerrainHeight(left.x, left.z) + h / 2, left.z, rotY + Math.PI / 2, wall));

  const right = _local(cx, cz, sideX, 0, rotY);
  parts.push(_box(scene, 'phase8g_house_right', { width: depth, height: h, depth: wallDepth }, right.x, getTerrainHeight(right.x, right.z) + h / 2, right.z, rotY + Math.PI / 2, wall));

  const frontSegmentW = (width - doorW) / 2;
  for (const dx of [-(doorW / 2 + frontSegmentW / 2), doorW / 2 + frontSegmentW / 2]) {
    const p = _local(cx, cz, dx, frontZ, rotY);
    parts.push(_box(scene, 'phase8g_house_front', { width: frontSegmentW, height: h, depth: wallDepth }, p.x, getTerrainHeight(p.x, p.z) + h / 2, p.z, rotY, wall));
  }

  const door = _local(cx, cz, 0, frontZ - 0.03, rotY);
  parts.push(_box(scene, 'phase8g_house_door', { width: doorW, height: 1.7, depth: 0.08 }, door.x, getTerrainHeight(door.x, door.z) + 0.85, door.z, rotY, mats.darkWood, false));

  const roofY = getTerrainHeight(cx, cz) + h + 0.16;
  parts.push(_box(scene, 'phase8g_house_roof_slab', { width: width + 0.8, height: 0.18, depth: depth + 0.8 }, cx, roofY, cz, rotY, roofMat, false));
  const cap = MeshBuilder.CreateCylinder('phase8g_house_roof_cap', {
    diameterTop: 0,
    diameterBottom: Math.max(width, depth) + 1.0,
    height: 1.3,
    tessellation: 4,
  }, scene);
  cap.position.set(cx, roofY + 0.72, cz);
  cap.rotation.y = rotY + Math.PI / 4;
  cap.material = roofMat;
  cap.isPickable = false;
  cap.metadata = { phase8g: true, staticDecor: true };
  parts.push(cap);

  const w1 = _local(cx, cz, sideX + 0.05, -0.6, rotY);
  const w2 = _local(cx, cz, -sideX - 0.05, 0.8, rotY);
  _createWindow(scene, w1.x, getTerrainHeight(w1.x, w1.z) + 1.55, w1.z, rotY + Math.PI / 2, mats, nightGroup);
  _createWindow(scene, w2.x, getTerrainHeight(w2.x, w2.z) + 1.55, w2.z, rotY - Math.PI / 2, mats, nightGroup);

  return parts;
}

function _stair(scene, cx, cz, rotY, steps = 6) {
  const mats = _getMats(scene);
  const parts = [];
  for (let i = 0; i < steps; i++) {
    const p = _local(cx, cz, 0, i * 0.42, rotY);
    const y = getTerrainHeight(p.x, p.z) + 0.08 + i * 0.08;
    parts.push(_box(scene, 'phase8g_stair_step', { width: 2.0, height: 0.16, depth: 0.42 }, p.x, y, p.z, rotY, mats.stone));
  }
  return parts;
}

function _bridge(scene, cx, cz, rotY) {
  const mats = _getMats(scene);
  const parts = [];
  for (let i = -2; i <= 2; i++) {
    const p = _local(cx, cz, i * 0.55, 0, rotY);
    parts.push(_box(scene, 'phase8g_bridge_plank', { width: 0.45, height: 0.12, depth: 6.2 }, p.x, getTerrainHeight(p.x, p.z) + 0.18, p.z, rotY, mats.wood));
  }
  for (const dx of [-1.55, 1.55]) {
    const p = _local(cx, cz, dx, 0, rotY);
    parts.push(_box(scene, 'phase8g_bridge_rail', { width: 0.14, height: 0.24, depth: 6.4 }, p.x, getTerrainHeight(p.x, p.z) + 0.6, p.z, rotY, mats.darkWood));
  }
  return parts;
}

function _createFountain(scene, cx, cz, nightGroup) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(cx, cz);
  const parts = [];
  const basin = MeshBuilder.CreateCylinder('phase8g_fountain_basin', { diameter: 3.1, height: 0.55, tessellation: 18 }, scene);
  basin.position.set(cx, y + 0.27, cz);
  basin.material = mats.stone;
  basin.isPickable = false;
  _createStaticBoxCollider(cx, y + 0.27, cz, 1.55, 0.28, 1.55, 0);
  parts.push(basin);

  const water = MeshBuilder.CreateCylinder('phase8g_fountain_water', { diameter: 2.45, height: 0.08, tessellation: 18 }, scene);
  water.position.set(cx, y + 0.61, cz);
  water.material = mats.water;
  water.isPickable = false;
  parts.push(water);

  const spout = MeshBuilder.CreateCylinder('phase8g_fountain_spout', { diameter: 0.22, height: 1.35, tessellation: 8 }, scene);
  spout.position.set(cx, y + 1.15, cz);
  spout.material = mats.stone;
  spout.isPickable = false;
  parts.push(spout);

  for (let i = 0; i < 5; i++) {
    const drop = MeshBuilder.CreateSphere('phase8g_water_drop', { diameter: 0.08, segments: 6 }, scene);
    drop.position.set(cx, y + 1.85 + i * 0.08, cz);
    drop.material = mats.water;
    drop.isPickable = false;
    const a = (i / 5) * Math.PI * 2;
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001 + i;
      drop.position.x = cx + Math.cos(a + t) * 0.18;
      drop.position.z = cz + Math.sin(a + t) * 0.18;
      drop.position.y = y + 1.35 + ((t * 0.7 + i * 0.17) % 0.8);
    });
    parts.push(drop);
  }

  const light = new PointLight('phase8g_fountain_light', new Vector3(cx, y + 1.3, cz), scene);
  light.diffuse = new Color3(0.45, 0.65, 1.0);
  light.intensity = 0.18;
  light.range = 8;
  nightGroup.lights.push({ light, day: 0.1, night: 0.55 });
  return parts;
}

function _createStatue(scene, cx, cz) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(cx, cz);
  const parts = [];
  parts.push(_box(scene, 'phase8g_statue_base', { width: 1.8, height: 0.55, depth: 1.8 }, cx, y + 0.28, cz, 0, mats.stone));
  const body = MeshBuilder.CreateCapsule('phase8g_statue_body', { radius: 0.42, height: 2.5 }, scene);
  body.position.set(cx, y + 1.75, cz);
  body.scaling.set(1.0, 1.15, 1.0);
  body.material = mats.brokenStone;
  body.isPickable = false;
  _createStaticBoxCollider(cx, y + 1.5, cz, 0.55, 1.25, 0.55, 0);
  parts.push(body);
  return parts;
}

function _createBonfire(scene, cx, cz, nightGroup) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(cx, cz);
  const parts = [];
  parts.push(_box(scene, 'phase8g_bonfire_log_a', { width: 2.1, height: 0.18, depth: 0.22 }, cx, y + 0.18, cz, 0.7, mats.darkWood));
  parts.push(_box(scene, 'phase8g_bonfire_log_b', { width: 2.1, height: 0.18, depth: 0.22 }, cx, y + 0.22, cz, -0.7, mats.darkWood));
  const flame = MeshBuilder.CreateCylinder('phase8g_bonfire_flame', { diameterTop: 0, diameterBottom: 1.0, height: 1.6, tessellation: 7 }, scene);
  flame.position.set(cx, y + 1.0, cz);
  flame.material = mats.ember;
  flame.isPickable = false;
  parts.push(flame);
  const light = new PointLight('phase8g_bonfire_light', new Vector3(cx, y + 1.7, cz), scene);
  light.diffuse = new Color3(1.0, 0.42, 0.13);
  light.intensity = 0.9;
  light.range = 18;
  nightGroup.lights.push({ light, day: 0.35, night: 1.25 });
  scene.onBeforeRenderObservable.add(() => {
    flame.scaling.y = 0.88 + Math.sin(performance.now() * 0.008) * 0.08;
    light.intensity = light.metadata?.targetIntensity ?? light.intensity;
  });
  return parts;
}

function _registerNightLighting(scene, group) {
  if (!scene.metadata) scene.metadata = {};
  if (!scene.metadata.phase8GLighting) {
    scene.metadata.phase8GLighting = [];
    Events.on('daynight:update', ({ isNight, isDusk, isDawn }) => {
      const groups = scene.metadata?.phase8GLighting || [];
      const nightFactor = isNight ? 1 : (isDusk || isDawn ? 0.65 : 0.18);
      for (const g of groups) {
        for (const entry of g.lights) {
          entry.light.intensity = entry.day + (entry.night - entry.day) * nightFactor;
          entry.light.metadata = { ...(entry.light.metadata || {}), targetIntensity: entry.light.intensity };
        }
        for (const win of g.windows) {
          if (win.material) {
            win.material.emissiveColor = new Color3(0.18 + 0.55 * nightFactor, 0.12 + 0.34 * nightFactor, 0.03);
            win.material.alpha = 0.42 + 0.46 * nightFactor;
          }
        }
      }
    });
  }
  scene.metadata.phase8GLighting.push(group);
}

export function createVillage(scene, cx, cz, name = 'Village', options = {}) {
  const mats = _getMats(scene);
  const rng = options.rng || _rng(`${name}_${cx}_${cz}`);
  const parts = [];
  const nightGroup = { lights: [], windows: [] };
  const count = options.houseCount || 5;
  const radius = options.radius || 15;
  const palette = options.palette || 'grassland';

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.24 + rng() * 0.16;
    const dist = radius * (0.62 + rng() * 0.22);
    const hx = cx + Math.cos(angle) * dist;
    const hz = cz + Math.sin(angle) * dist;
    const rotY = Math.atan2(cx - hx, cz - hz);
    parts.push(..._house(scene, hx, hz, rotY, { rng, palette }, nightGroup));
    const pathMid = _local(cx, cz, Math.cos(angle) * dist * 0.45, Math.sin(angle) * dist * 0.45, 0);
    _groundPatch(scene, 'phase8g_village_path', pathMid.x, pathMid.z, 3.0, dist * 0.82, -angle + Math.PI / 2, mats.path);
  }

  _groundPatch(scene, 'phase8g_village_square', cx, cz, radius * 0.95, radius * 0.95, 0, mats.path);

  if (options.center === 'statue') {
    parts.push(..._createStatue(scene, cx, cz));
  } else if (options.center === 'bonfire') {
    parts.push(..._createBonfire(scene, cx, cz, nightGroup));
  } else {
    parts.push(..._createFountain(scene, cx, cz, nightGroup));
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.35;
    const tx = cx + Math.cos(a) * radius * 0.52;
    const tz = cz + Math.sin(a) * radius * 0.52;
    const ty = getTerrainHeight(tx, tz);
    parts.push(_box(scene, 'phase8g_lantern_post', { width: 0.12, height: 2.15, depth: 0.12 }, tx, ty + 1.08, tz, 0, mats.darkWood, true));
    const lantern = _box(scene, 'phase8g_lantern_box', { width: 0.38, height: 0.42, depth: 0.38 }, tx, ty + 2.28, tz, 0, mats.window, false);
    parts.push(lantern);
    const light = new PointLight('phase8g_lantern_light', new Vector3(tx, ty + 2.25, tz), scene);
    light.diffuse = new Color3(1.0, 0.62, 0.24);
    light.intensity = 0.32;
    light.range = 12;
    nightGroup.lights.push({ light, day: 0.14, night: 0.95 });
  }

  if (options.bridge) {
    parts.push(..._bridge(scene, cx - radius * 0.62, cz + radius * 0.12, Math.PI * 0.35));
  }

  _registerNightLighting(scene, nightGroup);
  Events.emit('structure:village', {
    id: options.id,
    name,
    act: options.act,
    position: new Vector3(cx, getTerrainHeight(cx, cz), cz),
    npcSlots: options.npcSlots || [],
  });
  return parts;
}

function _brokenWall(scene, x, z, rotY, rng) {
  const mats = _getMats(scene);
  const h = 1.0 + rng() * 1.8;
  const y = getTerrainHeight(x, z);
  const wall = _box(scene, 'phase8g_broken_wall', { width: 4.0, height: h, depth: 0.35 }, x, y + h / 2, z, rotY, mats.brokenStone);
  for (let i = 0; i < 3; i++) {
    const p = _local(x, z, (rng() - 0.5) * 3.6, (rng() - 0.5) * 1.4, rotY);
    _box(scene, 'phase8g_rubble', { width: 0.35 + rng() * 0.55, height: 0.18 + rng() * 0.22, depth: 0.32 + rng() * 0.4 }, p.x, getTerrainHeight(p.x, p.z) + 0.12, p.z, rng() * Math.PI, mats.brokenStone, false);
  }
  return wall;
}

function _pillar(scene, x, z, height, rotZ = 0) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(x, z);
  const p = MeshBuilder.CreateCylinder('phase8g_pillar', { diameter: 0.45, height, tessellation: 9 }, scene);
  p.position.set(x, y + height / 2, z);
  p.rotation.z = rotZ;
  p.material = mats.stone;
  p.isPickable = false;
  _createStaticBoxCollider(x, y + height / 2, z, 0.25, height / 2, 0.25, 0);
  return p;
}

function _loreSign(scene, x, z, label) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(x, z);
  const post = _box(scene, 'phase8g_lore_post', { width: 0.12, height: 1.25, depth: 0.12 }, x, y + 0.62, z, 0, mats.darkWood);
  const sign = MeshBuilder.CreatePlane('phase8g_lore_sign', { width: 2.3, height: 0.8 }, scene);
  sign.position.set(x, y + 1.35, z);
  sign.rotation.y = Math.PI;
  sign.isPickable = false;

  const tex = new DynamicTexture(`phase8g_lore_tex_${label}`, { width: 512, height: 192 }, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = '#392413';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#b88a50';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 176);
  ctx.fillStyle = '#f0d6a0';
  ctx.font = 'bold 34px serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 256, 72);
  ctx.font = '24px serif';
  ctx.fillText('Archive fragmentee du Gutter', 256, 122);
  tex.update();

  const mat = new StandardMaterial(`phase8g_lore_sign_mat_${label}`, scene);
  mat.diffuseTexture = tex;
  mat.specularColor = Color3.Black();
  sign.material = mat;
  return [post, sign];
}

export function createRuins(scene, cx, cz, options = {}) {
  const mats = _getMats(scene);
  const rng = options.rng || _rng(`${options.id || 'ruin'}_${cx}_${cz}`);
  const parts = [];
  const wallCount = 6 + Math.floor(rng() * 4);

  for (let i = 0; i < wallCount; i++) {
    const a = (i / wallCount) * Math.PI * 2 + rng() * 0.4;
    const r = 4 + rng() * 7;
    parts.push(_brokenWall(scene, cx + Math.cos(a) * r, cz + Math.sin(a) * r, a + Math.PI / 2, rng));
  }

  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    const x = cx + Math.cos(a) * (2 + rng() * 5);
    const z = cz + Math.sin(a) * (2 + rng() * 5);
    const p = _pillar(scene, x, z, 2.2 + rng() * 1.4, Math.PI / 2 + (rng() - 0.5) * 0.4);
    p.rotation.y = rng() * Math.PI;
    parts.push(p);
  }

  const archA = _local(cx, cz, -1.6, -4.2, 0);
  const archB = _local(cx, cz, 1.6, -4.2, 0);
  parts.push(_pillar(scene, archA.x, archA.z, 3.0));
  parts.push(_pillar(scene, archB.x, archB.z, 3.0));
  parts.push(_box(scene, 'phase8g_ruin_arch_lintel', { width: 4.0, height: 0.4, depth: 0.55 }, cx, getTerrainHeight(cx, cz - 4.2) + 3.1, cz - 4.2, 0, mats.stone));

  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    const x = cx + Math.cos(a) * (4 + rng() * 5);
    const z = cz + Math.sin(a) * (4 + rng() * 5);
    const vine = MeshBuilder.CreatePlane('phase8g_ruin_vine', { width: 1.3, height: 1.0 }, scene);
    vine.position.set(x, getTerrainHeight(x, z) + 1.2 + rng() * 0.7, z);
    vine.rotation.y = rng() * Math.PI * 2;
    vine.material = mats.vine;
    vine.isPickable = false;
    parts.push(vine);
  }

  parts.push(..._loreSign(scene, cx + 2.4, cz + 1.8, options.label || 'Ruines'));
  spawnChest(scene, cx + (rng() - 0.5) * 5, cz + (rng() - 0.5) * 5, rng() < 0.35 ? 'precious' : 'rare');

  if (options.secret) {
    const sx = cx - 4.2;
    const sz = cz + 3.6;
    const secret = _box(scene, 'phase8g_secret_wall', { width: 2.8, height: 2.0, depth: 0.38 }, sx, getTerrainHeight(sx, sz) + 1.0, sz, Math.PI * 0.15, mats.secret);
    secret.metadata = {
      ...(secret.metadata || {}),
      destructible: true,
      hint: 'Mur fissure - une attaque lourde devrait le briser',
    };
    spawnChest(scene, sx - 1.8, sz + 1.6, 'legendary');
    parts.push(secret);
  }

  Events.emit('structure:ruins', {
    id: options.id,
    label: options.label,
    act: options.act,
    position: new Vector3(cx, getTerrainHeight(cx, cz), cz),
  });
  return parts;
}

export function createWatchtower(scene, cx, cz, options = {}) {
  const mats = _getMats(scene);
  const y = getTerrainHeight(cx, cz);
  const parts = [];
  const height = options.height || 10;

  const base = MeshBuilder.CreateCylinder('phase8g_watchtower_body', { diameter: 4.1, height, tessellation: 12 }, scene);
  base.position.set(cx, y + height / 2, cz);
  base.material = mats.stone;
  base.isPickable = false;
  base.receiveShadows = true;
  _createStaticBoxCollider(cx, y + height / 2, cz, 2.05, height / 2, 2.05, 0);
  parts.push(base);

  const platform = MeshBuilder.CreateCylinder('phase8g_watchtower_platform', { diameter: 5.4, height: 0.32, tessellation: 12 }, scene);
  platform.position.set(cx, y + height + 0.16, cz);
  platform.material = mats.wood;
  platform.isPickable = false;
  parts.push(platform);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = _local(cx, cz, Math.cos(a) * 2.55, Math.sin(a) * 2.55, 0);
    parts.push(_box(scene, 'phase8g_watchtower_rail', { width: 0.12, height: 1.0, depth: 0.12 }, p.x, y + height + 0.82, p.z, a, mats.darkWood, false));
  }

  parts.push(..._stair(scene, cx + 2.65, cz, Math.PI / 2, 12));

  const beacon = MeshBuilder.CreateSphere('phase8g_watchtower_beacon', { diameter: 1.0, segments: 10 }, scene);
  beacon.position.set(cx, y + height + 1.65, cz);
  const beaconMat = mats.ember.clone(`phase8g_watchtower_beacon_mat_${options.id || cx}_${cz}`);
  beaconMat.emissiveColor = new Color3(0.55, 0.12, 0.03);
  beacon.material = beaconMat;
  beacon.isPickable = false;
  beacon.metadata = {
    phase8g: true,
    type: 'watchtower_beacon',
    towerId: options.id,
    revealRadius: options.revealRadius || 240,
  };
  parts.push(beacon);

  const fire = new PointLight('phase8g_watchtower_fire', new Vector3(cx, y + height + 1.65, cz), scene);
  fire.diffuse = new Color3(1.0, 0.5, 0.14);
  fire.intensity = 0.65;
  fire.range = 32;
  scene.onBeforeRenderObservable.add(() => {
    const pulse = 0.82 + Math.sin(performance.now() * 0.006 + cx) * 0.16;
    beacon.scaling.setAll(pulse);
    fire.intensity = 0.58 + pulse * 0.22;
  });

  Events.emit('structure:watchtower', {
    id: options.id,
    label: options.label || 'Tour de guet',
    x: cx,
    z: cz,
    y: y + height,
    revealRadius: options.revealRadius || 240,
  });

  if (options.id) {
    _towerRuntime.set(options.id, {
      id: options.id,
      label: options.label || 'Tour de guet',
      x: cx,
      z: cz,
      y,
      height,
      beacon,
      beaconMat,
      fire,
      revealRadius: options.revealRadius || 240,
      activated: false,
    });
  }
  return parts;
}

function _registerStructureZones() {
  appendCities(PHASE8G_VILLAGES.map(v => ({
    id: v.id,
    name: v.name,
    x: v.x,
    z: v.z,
    coreRadius: Math.max(20, v.radius * 0.86),
    edgeRadius: Math.max(34, v.radius * 1.35),
  })));

  appendPOIs([
    ...PHASE8G_VILLAGES.map(v => ({
      id: v.id,
      name: v.name,
      x: v.x,
      z: v.z,
      radius: v.radius,
      type: 'village',
      act: v.act,
    })),
    ...PHASE8G_RUINS.map(r => ({
      id: r.id,
      name: r.label,
      x: r.x,
      z: r.z,
      radius: 13,
      type: 'ruin',
      act: r.act,
    })),
    ...PHASE8G_TOWERS.map(t => ({
      id: t.id,
      name: t.label,
      x: t.x,
      z: t.z,
      radius: 12,
      type: 'tower',
    })),
  ]);
}

export function spawnPhase8GStructures(scene) {
  if (!scene || _spawnedScenes.has(scene)) {
    return { villages: 0, ruins: 0, towers: 0, skipped: true };
  }

  _spawnedScenes.add(scene);
  _registerStructureZones();

  for (const village of PHASE8G_VILLAGES) {
    createVillage(scene, village.x, village.z, village.name, {
      ...village,
      rng: _rng(village.id),
    });
  }

  for (const ruin of PHASE8G_RUINS) {
    createRuins(scene, ruin.x, ruin.z, {
      ...ruin,
      rng: _rng(ruin.id),
    });
  }

  for (const tower of PHASE8G_TOWERS) {
    createWatchtower(scene, tower.x, tower.z, tower);
  }

  Events.emit('phase8g:spawned', {
    villages: PHASE8G_VILLAGES.length,
    ruins: PHASE8G_RUINS.length,
    towers: PHASE8G_TOWERS.length,
  });

  console.log(`[Phase8G] Spawned ${PHASE8G_VILLAGES.length} villages, ${PHASE8G_RUINS.length} ruins, ${PHASE8G_TOWERS.length} watchtowers`);
  return {
    villages: PHASE8G_VILLAGES.length,
    ruins: PHASE8G_RUINS.length,
    towers: PHASE8G_TOWERS.length,
  };
}

function _activatePhase8GTower(tower) {
  if (!tower || tower.activated) return;
  tower.activated = true;
  if (tower.beaconMat) {
    tower.beaconMat.emissiveColor = new Color3(0.18, 0.68, 1.0);
    tower.beaconMat.diffuseColor = new Color3(0.25, 0.55, 0.95);
  }
  if (tower.fire) {
    tower.fire.diffuse = new Color3(0.34, 0.78, 1.0);
    tower.fire.intensity = 1.25;
    tower.fire.range = 42;
  }
  Events.emit('poi:activated', {
    id: tower.id,
    type: 'tower',
    label: tower.label,
  });
  Events.emit('poi:towerRevealed', {
    id: tower.id,
    label: tower.label,
    x: tower.x,
    z: tower.z,
    revealRadius: tower.revealRadius,
  });
  Events.emit('map:towerReveal', {
    id: tower.id,
    label: tower.label,
    x: tower.x,
    z: tower.z,
    revealRadius: tower.revealRadius,
  });
  Events.emit('ui:notification', {
    text: `Tour revelee : ${tower.label}`,
    icon: 'tower',
    duration: 4000,
  });
}

export function registerPhase8GPOIs(scene) {
  if (!scene || _registeredPOIScenes.has(scene)) {
    return { towers: 0, villages: 0, skipped: true };
  }
  _registeredPOIScenes.add(scene);

  let towers = 0;
  for (const def of PHASE8G_TOWERS) {
    const runtime = _towerRuntime.get(def.id);
    const poi = {
      id: def.id,
      type: 'tower',
      label: def.label,
      x: def.x,
      z: def.z,
      y: getTerrainHeight(def.x, def.z),
      revealRadius: def.revealRadius,
      discoverRange: 90,
      activateRange: 8,
      isActivated: false,
      isDiscovered: false,
      meshes: runtime?.beacon ? [runtime.beacon] : [],
      onDiscover() {
        Events.emit('ui:notification', { text: `${def.label} decouverte`, duration: 2200 });
      },
      onNearby(playerPos, dist) {
        const topY = this.y + (runtime?.height || 10);
        const atTop = playerPos.y >= topY - 2.0 && dist < this.activateRange;
        const atBase = playerPos.y <= this.y + 4.0 && dist < this.activateRange;
        if (atTop || atBase) this.activate();
      },
      activate() {
        if (this.isActivated) return;
        this.isActivated = true;
        _activatePhase8GTower(runtime);
      },
      restoreActivation() {
        this.isActivated = true;
        this.isDiscovered = true;
        _activatePhase8GTower(runtime);
      },
    };
    registerPOI(poi);
    towers++;
  }

  let villages = 0;
  for (const village of PHASE8G_VILLAGES) {
    const tower = PHASE8G_TOWERS.find(t => t.id === village.towerId);
    registerPOI({
      id: village.id,
      type: 'settlement',
      label: village.name,
      x: village.x,
      z: village.z,
      y: getTerrainHeight(village.x, village.z),
      discoverRange: Math.max(70, village.radius * 2.4),
      activateRange: 0,
      isActivated: false,
      isDiscovered: false,
      meshes: [],
      onDiscover() {
        Events.emit('ui:notification', { text: `Village decouvert : ${village.name}`, duration: 3000 });
        if (tower) {
          setMapTrackedTargetData({
            id: tower.id,
            type: 'tower',
            source: 'phase8g',
            label: tower.label,
            x: tower.x,
            z: tower.z,
            radius: 8,
          }, { silent: false });
        }
      },
      onNearby() {},
      activate() {},
      restoreActivation() { this.isDiscovered = true; },
    });
    villages++;
  }

  let ruins = 0;
  for (const ruin of PHASE8G_RUINS) {
    registerPOI({
      id: ruin.id,
      type: 'ruin',
      label: ruin.label,
      x: ruin.x,
      z: ruin.z,
      y: getTerrainHeight(ruin.x, ruin.z),
      discoverRange: 55,
      activateRange: 0,
      isActivated: false,
      isDiscovered: false,
      meshes: [],
      onDiscover() {
        Events.emit('ui:notification', {
          text: ruin.secret ? `Ruine secrete reperee : ${ruin.label}` : `Ruine decouverte : ${ruin.label}`,
          duration: 3000,
        });
      },
      onNearby() {},
      activate() {},
      restoreActivation() { this.isDiscovered = true; },
    });
    ruins++;
  }

  return { towers, villages, ruins };
}

export function getPhase8GVillages() {
  return PHASE8G_VILLAGES.map(v => ({ ...v, npcSlots: v.npcSlots.map(s => ({ ...s })) }));
}

export function getPhase8GNPCSlots() {
  return PHASE8G_VILLAGES.flatMap(v => v.npcSlots.map(slot => ({
    ...slot,
    villageId: v.id,
    villageName: v.name,
    act: v.act,
  })));
}
