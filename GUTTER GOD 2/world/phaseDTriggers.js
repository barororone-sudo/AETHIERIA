// world/phaseDTriggers.js — triggers de proximité Actes 2 & 3

import { Vector3 }          from '@babylonjs/core';
import { setAct }           from '../persistence/worldStateManager.js';
import { setWeatherForAct } from './babylonWeather.js';
import { updateSkyForBiome } from './babylonSky.js';
import { getBiomeForAct }   from './biomes.js';
import { Events }           from '../core/events.js';

const TRIGGERS = [
  // Acte 2 — réactivation tour majeure
  {
    id: 'act2-tower', act: 2,
    x: 80, z: 60, radius: 12,
    label: 'Tour Majeure — Acte II commence',
    fired: false,
  },
  // Acte 3 — sanctuaire corrompu
  {
    id: 'act3-sanctuary', act: 3,
    x: 0, z: 80, radius: 12,
    label: 'Sanctuaire Corrompu — Acte III commence',
    fired: false,
  },
];

let _scene    = null;
let _currentAct = 1;

export function initPhaseDTriggers(scene) {
  _scene = scene;
  Events.on('act:changed', ({ act }) => { _currentAct = act; });
}

export function updatePhaseDTriggers(playerPos, scene) {
  for (const t of TRIGGERS) {
    if (t.fired) continue;
    if (t.act <= _currentAct) { t.fired = true; continue; } // déjà passé

    const dx = playerPos.x - t.x;
    const dz = playerPos.z - t.z;
    if (Math.sqrt(dx * dx + dz * dz) <= t.radius) {
      t.fired = true;
      _triggerActTransition(t.act, scene);
    }
  }
}

async function _triggerActTransition(act, scene) {
  await setAct(act);
  const biome = getBiomeForAct(act);
  setWeatherForAct(act);
  updateSkyForBiome(scene, biome);
  Events.emit('act:changed', { act });

  // Notification HUD
  Events.emit('loot:picked', { itemId: `⚡ Acte ${act} — ${_actName(act)}` });
}

function _actName(act) {
  return ['', 'Les Cendres Calmes', 'La Pluie de Fer', 'Les Racines Profanées', 'Le Schisme', 'La Nuit du Gutter God'][act] ?? '';
}
