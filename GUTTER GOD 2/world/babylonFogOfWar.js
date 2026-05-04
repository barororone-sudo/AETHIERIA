// world/babylonFogOfWar.js — Fog of War et système de révélation de carte

import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';
import { Events } from '../core/events.js';

const _fog = {
  enabled: true,
  revealedAreas: new Set(), // IDs d'areas révélées
  chunkReveals: new Map(),  // Maps chunk coords → révélation partielle
  revealRadius: 45,         // Rayon de révélation autour du joueur
};

let _scene = null;
let _fogMesh = null;
let _fogMaterial = null;

// ────────────────────────────────────────────────────────────────────────────
// Zones pré-définies qui peuvent être révélées
// ────────────────────────────────────────────────────────────────────────────

const REVEAL_ZONES = [
  // Grassland
  { id: 'zone-grass-1', x: 45, z: 45, radius: 20, label: 'Archives' },
  { id: 'zone-grass-2', x: 0, z: -50, radius: 15, label: 'Tour de Guet' },
  { id: 'zone-grass-3', x: -60, z: -60, radius: 18, label: 'Carrefour' },
  // Rootblight
  { id: 'zone-root-1', x: 0, z: 80, radius: 22, label: 'Sanctuaire' },
  { id: 'zone-root-2', x: -80, z: -80, radius: 20, label: 'Cœur Pourri' },
  // Schism
  { id: 'zone-schism-1', x: 0, z: 100, radius: 25, label: 'Convergence' },
];

// ────────────────────────────────────────────────────────────────────────────
// Initialisation
// ────────────────────────────────────────────────────────────────────────────

export function initFogOfWar(scene) {
  _scene = scene;
  if (!_fog.enabled) return;

  // Créer le maillage brouillard (plane couvrant la zone de jeu)
  _fogMesh = MeshBuilder.CreateGround('fog-mesh', { width: 500, height: 500 }, _scene);
  _fogMesh.position.y = 0.01; // Légèrement au-dessus du sol
  _fogMesh.isPickable = false;

  // Matériau avec texture dynamique pour le brouillard
  _fogMaterial = new StandardMaterial('fog-mat', _scene);
  _fogMaterial.emissiveColor = new Color3(0.15, 0.12, 0.18);
  _fogMaterial.disableLighting = true;
  _fogMaterial.alpha = 0.7;
  _fogMesh.material = _fogMaterial;

  // Émettre l'event d'initialisation du brouillard
  Events.emit('fog:initialized', { enabled: true, revealRadius: _fog.revealRadius });
}

// ────────────────────────────────────────────────────────────────────────────
// Révélation dynamique
// ────────────────────────────────────────────────────────────────────────────

export function updateFogOfWar(playerPos) {
  if (!_fog.enabled || !_fogMesh) return;

  // Vérifier quelles zones révéler (trous dans le brouillard)
  for (const zone of REVEAL_ZONES) {
    const d = Vector3.Distance(playerPos, new Vector3(zone.x, 0, zone.z));
    
    // Si le joueur est assez proche, révéler la zone
    if (d < zone.radius + _fog.revealRadius) {
      if (!_fog.revealedAreas.has(zone.id)) {
        _revealZone(zone);
      }
    }
  }
}

function _revealZone(zone) {
  _fog.revealedAreas.add(zone.id);

  // Visual feedback — pulse de couleur sur le brouillard
  const originalColor = _fogMaterial.emissiveColor.clone();
  _fogMaterial.emissiveColor = new Color3(0.3, 0.25, 0.4);
  
  setTimeout(() => {
    _fogMaterial.emissiveColor = originalColor;
  }, 300);

  // Event pour notifier la révélation
  Events.emit('map:revealed', { zoneId: zone.id, label: zone.label });
}

// ────────────────────────────────────────────────────────────────────────────
// Création de trous de révélation (holes)
// ────────────────────────────────────────────────────────────────────────────

export function createRevealHole(position, radius = 15, label = 'Trou de Révélation') {
  if (!_scene) return null;

  // Créer un trou visuel avec une sphère qui enlève le brouillard
  const hole = MeshBuilder.CreateSphere(
    `reveal-hole-${_fog.revealedAreas.size}`,
    { diameter: radius * 2, segments: 16 },
    _scene
  );
  hole.position.copyFrom(position);
  hole.position.y = 0.05;

  const holeMat = new StandardMaterial(`hole-mat-${_fog.revealedAreas.size}`, _scene);
  holeMat.emissiveColor = new Color3(0.2, 0.35, 0.5);
  holeMat.wireframe = true;
  holeMat.disableLighting = true;
  holeMat.alpha = 0.3;
  hole.material = holeMat;
  hole.isPickable = false;

  // Label flottant
  const labelPlane = MeshBuilder.CreatePlane(
    `hole-label-${_fog.revealedAreas.size}`,
    { width: 2, height: 0.4 },
    _scene
  );
  labelPlane.position.set(position.x, position.y + 2, position.z);
  labelPlane.billboardMode = 7;

  const tex = new DynamicTexture(`hole-tex-${_fog.revealedAreas.size}`, { width: 200, height: 40 }, _scene);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, 200, 40);
  ctx.fillStyle = '#4a7dd8';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, 100, 26);
  tex.update();

  const labelMat = new StandardMaterial(`hole-lmat-${_fog.revealedAreas.size}`, _scene);
  labelMat.diffuseTexture = tex;
  labelMat.emissiveTexture = tex;
  labelMat.disableLighting = true;
  labelMat.useAlphaFromDiffuseTexture = true;
  labelPlane.material = labelMat;

  const holeObj = {
    mesh: hole,
    label: labelPlane,
    position,
    radius,
    label: label,
  };

  return holeObj;
}

// ────────────────────────────────────────────────────────────────────────────
// Contrôle du brouillard
// ────────────────────────────────────────────────────────────────────────────

export function setFogEnabled(enabled) {
  _fog.enabled = enabled;
  if (_fogMesh) {
    _fogMesh.setEnabled(enabled);
  }
  Events.emit('fog:toggled', { enabled });
}

export function isFogEnabled() {
  return _fog.enabled;
}

export function setRevealRadius(radius) {
  _fog.revealRadius = radius;
  Events.emit('fog:radiusChanged', { radius });
}

export function getRevealRadius() {
  return _fog.revealRadius;
}

// ────────────────────────────────────────────────────────────────────────────
// Debug et requêtes
// ────────────────────────────────────────────────────────────────────────────

export function getRevealedZones() {
  return Array.from(_fog.revealedAreas);
}

export function isZoneRevealed(zoneId) {
  return _fog.revealedAreas.has(zoneId);
}

export function getFogDebugState() {
  return {
    enabled: _fog.enabled,
    revealRadius: _fog.revealRadius,
    revealedCount: _fog.revealedAreas.size,
    revealedZones: Array.from(_fog.revealedAreas),
    totalZones: REVEAL_ZONES.length,
    zones: REVEAL_ZONES.map(z => ({
      id: z.id,
      label: z.label,
      revealed: _fog.revealedAreas.has(z.id),
      position: { x: z.x, z: z.z },
      radius: z.radius,
    })),
  };
}
