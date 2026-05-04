// gameplay/babylonTeleportation.js — Portals de téléportation interactifs

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { Events } from '../core/events.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { registerPortal } from './babylonInteraction.js';

const _portals = [];
let _scene = null;
let _activatedPortals = new Set(); // Pour tracer les portails activés

// ────────────────────────────────────────────────────────────────────────────
// Définition des portails par acte/biome
// ────────────────────────────────────────────────────────────────────────────

const PORTAL_DEFS = {
  grassland: [
    {
      id: 'portal-grassland-1',
      name: 'Portail des Herbes',
      x: 80, z: 80,
      targetBiome: 'rootblight',
      targetX: 0, targetZ: 80,
      color: new Color3(0.3, 0.8, 0.5),
    },
  ],
  rootblight: [
    {
      id: 'portal-root-1',
      name: 'Retour aux Herbes',
      x: 0, z: 80,
      targetBiome: 'grassland',
      targetX: 80, targetZ: 80,
      color: new Color3(0.2, 0.6, 0.2),
    },
    {
      id: 'portal-root-2',
      name: 'Vers le Schisme',
      x: -80, z: -80,
      targetBiome: 'schism',
      targetX: 0, targetZ: 100,
      color: new Color3(0.7, 0.2, 0.7),
    },
  ],
  schism: [
    {
      id: 'portal-schism-1',
      name: 'Retour à la Racine',
      x: 0, z: 100,
      targetBiome: 'rootblight',
      targetX: -80, targetZ: -80,
      color: new Color3(0.5, 0.2, 0.8),
    },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Initialisation
// ────────────────────────────────────────────────────────────────────────────

export function initTeleportation(scene, biomeName) {
  _scene = scene;
  const defs = PORTAL_DEFS[biomeName] ?? [];
  for (const def of defs) {
    _spawnPortal(def);
  }
}

export function spawnPortalManual(portalDef) {
  if (!_scene) return null;
  return _spawnPortal(portalDef);
}

// ────────────────────────────────────────────────────────────────────────────
// Spawn portail
// ────────────────────────────────────────────────────────────────────────────

function _spawnPortal(def) {
  const y = getTerrainHeight(def.x, def.z);

  // Toroid mesh pour le portail
  const portal = MeshBuilder.CreateTorus(
    `portal_${def.id}`,
    { diameter: 2.5, thickness: 0.3, tessellation: 16 },
    _scene
  );
  portal.position.set(def.x, y + 1.2, def.z);

  // Matériau avec émission pour briller
  const mat = new StandardMaterial(`portal_mat_${def.id}`, _scene);
  mat.emissiveColor = def.color;
  mat.disableLighting = true;
  mat.alpha = 0.9;
  portal.material = mat;

  // Animation de rotation
  let t = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    t += _scene.getEngine().getDeltaTime() / 1000;
    portal.rotation.y = t * 1.5;
    portal.rotation.z = Math.sin(t * 0.8) * 0.3;
    portal.position.y = y + 1.2 + Math.sin(t * 2) * 0.15;
  });

  // Aura flottante (particules visuelles)
  const aura = MeshBuilder.CreateSphere(
    `portal_aura_${def.id}`,
    { diameter: 3, segments: 8 },
    _scene
  );
  aura.position.copyFrom(portal.position);
  const auraMat = new StandardMaterial(`portal_aura_mat_${def.id}`, _scene);
  auraMat.emissiveColor = def.color;
  auraMat.wireframe = true;
  auraMat.disableLighting = true;
  auraMat.alpha = 0.2;
  aura.material = auraMat;

  let t2 = 0;
  const obs2 = _scene.onBeforeRenderObservable.add(() => {
    t2 += _scene.getEngine().getDeltaTime() / 1000;
    aura.position.copyFrom(portal.position);
    aura.scaling.set(1 + Math.sin(t2 * 2) * 0.2, 1 + Math.sin(t2 * 2) * 0.2, 1 + Math.sin(t2 * 2) * 0.2);
  });

  // Label
  const plane = MeshBuilder.CreatePlane(`portal_label_${def.id}`, { width: 3, height: 0.5 }, _scene);
  plane.position.set(def.x, y + 3.5, def.z);
  plane.billboardMode = 7;

  const tex = new DynamicTexture(`portal_tex_${def.id}`, { width: 256, height: 48 }, _scene);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = `rgb(${Math.round(def.color.r * 255)},${Math.round(def.color.g * 255)},${Math.round(def.color.b * 255)})`;
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, 128, 30);
  tex.update();

  const labelMat = new StandardMaterial(`portal_lmat_${def.id}`, _scene);
  labelMat.diffuseTexture = tex;
  labelMat.emissiveTexture = tex;
  labelMat.disableLighting = true;
  labelMat.useAlphaFromDiffuseTexture = true;
  plane.material = labelMat;

  const portalObj = {
    id: def.id,
    name: def.name,
    mesh: portal,
    aura,
    label: plane,
    obs,
    obs2,
    position: { x: def.x, y, z: def.z },
    targetBiome: def.targetBiome,
    targetPos: { x: def.targetX, y: getTerrainHeight(def.targetX, def.targetZ) + 2, z: def.targetZ },
    color: def.color,
    activated: false,
  };

  _portals.push(portalObj);

  // Enregistrer auprès du système d'interaction
  try {
    registerPortal(portalObj);
  } catch (e) {
    // L'interaction peut ne pas être initialisée; ignorer silencieusement
  }

  return portalObj;
}

// ────────────────────────────────────────────────────────────────────────────
// Interaction avec le joueur
// ────────────────────────────────────────────────────────────────────────────

export function updateTeleportation(playerPos) {
  for (const portal of _portals) {
    const d = Vector3.Distance(playerPos, portal.mesh.position);
    if (d < 2.0) {
      // En range — blink visual effect
      if (!portal.activated) {
        portal.activated = true;
        _activatePortal(portal);
      }
    } else {
      portal.activated = false;
    }
  }
}

function _activatePortal(portal) {
  // Pulse visual pour montrer activation
  const originalAlpha = portal.mesh.material.alpha;
  portal.mesh.material.alpha = 1.0;

  Events.emit('portal:detected', { portalId: portal.id, portalName: portal.name });
}

export function teleportPlayer(playerBody, portalId) {
  const portal = _portals.find(p => p.id === portalId);
  if (!portal || !playerBody) return false;

  // Téléporter le joueur
  const target = portal.targetPos;
  playerBody.setTranslation(
    { x: target.x, y: target.y, z: target.z },
    true // wake
  );

  // Event pour que le système de monde réagisse (changement biome, etc.)
  Events.emit('player:teleported', {
    portalId,
    targetBiome: portal.targetBiome,
    targetPos: target,
  });

  _activatedPortals.add(portal.id);

  // Visual feedback — pulse de couleur
  const mat = portal.mesh.material;
  const originalEmissive = mat.emissiveColor.clone();
  mat.emissiveColor = new Color3(1, 1, 1);
  setTimeout(() => {
    mat.emissiveColor = originalEmissive;
  }, 200);

  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Requêtes
// ────────────────────────────────────────────────────────────────────────────

export function getPortalNearby(playerPos, radius = 2.0) {
  for (const portal of _portals) {
    const d = Vector3.Distance(playerPos, portal.mesh.position);
    if (d < radius) return portal;
  }
  return null;
}

export function getAllPortals() {
  return [..._portals];
}

export function getActivatedPortals() {
  return Array.from(_activatedPortals);
}

export function getTeleportationDebugState() {
  return {
    portalCount: _portals.length,
    activatedCount: _activatedPortals.size,
    portals: _portals.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      targetBiome: p.targetBiome,
      activated: _activatedPortals.has(p.id),
    })),
  };
}
