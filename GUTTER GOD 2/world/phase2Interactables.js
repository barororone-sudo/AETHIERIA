// world/phase2Interactables.js — objets interactables Phase 2

import { Vector3 }          from '@babylonjs/core';
import { spawnPickup, spawnFactionMarker, spawnLore } from '../gameplay/babylonInteraction.js';
import { getTerrainHeight } from './babylonTerrain.js';

export function spawnPhase2Interactables() {
  const h = getTerrainHeight;

  // ── Pickups ──────────────────────────────────────────────────────────────
  spawnPickup('health-potion',  new Vector3(  5, h( 5,  5) + 0.5,   5));
  spawnPickup('monster-core',   new Vector3( 15, h(15, 10) + 0.5,  10));
  spawnPickup('iron-shard',     new Vector3( -8, h(-8, 12) + 0.5,  12));
  spawnPickup('rune-fragment',  new Vector3( 30, h(30, -5) + 0.5,  -5));
  spawnPickup('memory-shard',   new Vector3( 45, h(45, 45) + 0.5,  45)); // archive
  spawnPickup('health-potion',  new Vector3(-20, h(-20, 8) + 0.5,   8));

  // ── Marqueurs faction ────────────────────────────────────────────────────
  spawnFactionMarker('guardians', new Vector3( 25, h(25, 20) + 0.5, 20), 'Avant-poste des Gardiens');
  spawnFactionMarker('heirs',     new Vector3(-25, h(-25,-15)+ 0.5,-15), 'Cache des Héritiers');

  // ── Lore ─────────────────────────────────────────────────────────────────
  spawnLore(
    'Les archives de Vael\'Dorn témoignent d\'une civilisation engloutie par ses propres ambitions. Les Veilleurs ont scellé la fracture — mais le sceau s\'effrite.',
    new Vector3(45, h(45, 45) + 1, 44),
  );
  spawnLore(
    'Fragment de journal : "Jour 47. Les cendres ne retombent plus. Quelque chose s\'est réveillé sous les ruines de l\'est."',
    new Vector3(-30, h(-30, 25) + 1, 25),
  );
}
