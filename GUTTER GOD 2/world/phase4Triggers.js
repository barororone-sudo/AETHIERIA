// world/phase4Triggers.js — triggers Act 4 et 5

import { setAct, getCurrentAct } from '../persistence/worldStateManager.js';
import { setWeatherForAct }      from './babylonWeather.js';
import { updateSkyForBiome }     from './babylonSky.js';
import { getBiomeForAct }        from './biomes.js';
import { spawnFinalBoss }        from '../gameplay/babylonFinalBoss.js';
import { Events }                from '../core/events.js';

const TRIGGERS = [
  // Act 4 — Schisme
  { id: 'act4-start', act: 4, x:  0, z: 100, radius: 15, fired: false },
  // Act 5 — Convergence
  { id: 'act5-start', act: 5, x:  0, z:   0, radius: 8,  fired: false, requiresAct: 4 },
];

let _scene      = null;
let _currentAct = 1;
let _spawnFinalBoss = () => spawnFinalBoss();

export function initPhase4Triggers(scene) {
  _scene = scene;
  Events.on('act:changed', ({ act }) => { _currentAct = act; });
  _currentAct = getCurrentAct();
}

export function setFinalBossSpawnHandler(fn) {
  _spawnFinalBoss = typeof fn === 'function' ? fn : () => spawnFinalBoss();
}

export function updatePhase4Triggers(playerPos, scene) {
  for (const t of TRIGGERS) {
    if (t.fired) continue;
    if (t.act <= _currentAct) { t.fired = true; continue; }
    if (t.requiresAct && _currentAct < t.requiresAct) continue;

    const dx = playerPos.x - t.x;
    const dz = playerPos.z - t.z;
    if (Math.sqrt(dx * dx + dz * dz) <= t.radius) {
      t.fired = true;
      _trigger(t, scene);
    }
  }
}

async function _trigger(t, scene) {
  if (t.act === 4) {
    await setAct(4);
    const biome = getBiomeForAct(4);
    setWeatherForAct(4);
    updateSkyForBiome(scene, biome);
    Events.emit('act:changed', { act: 4 });
    Events.emit('loot:picked', { itemId: '⚡ Acte IV — Le Schisme des Veilleurs' });
  }

  if (t.act === 5) {
    await setAct(5);
    const biome = getBiomeForAct(5);
    setWeatherForAct(5);
    updateSkyForBiome(scene, biome);
    Events.emit('act:changed', { act: 5 });
    Events.emit('loot:picked', { itemId: '💀 Acte V — La Nuit du Gutter God' });
    // Spawner le boss final après 3s
    setTimeout(() => _spawnFinalBoss(), 3000);
  }
}
