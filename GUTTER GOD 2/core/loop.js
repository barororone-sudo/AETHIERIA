// core/loop.js — game loop centralisée

import { Events } from './events.js';
import { CONFIG } from './config.js';
import { scaleDelta } from './timeScale.js';

let _systems = [];
let _lastTime = 0;
let _frameCount = 0;
let _fpsAccum = 0;
let _running = false;

export function createGameLoop(engine, scene) {
  engine.runRenderLoop(() => {
    if (!_running) return;

    const now = performance.now();
    const rawDt = Math.min((now - _lastTime) / 1000, 0.05);
    _lastTime = now;
    const dt = scaleDelta(rawDt);

    // Mise à jour de tous les systèmes enregistrés
    for (let i = 0; i < _systems.length; i++) {
      _systems[i](dt);
    }

    // Render la scène — OBLIGATOIRE sinon écran noir
    scene.render();

    // Mesure FPS toutes les secondes
    _fpsAccum += dt;
    _frameCount++;
    if (_fpsAccum >= 1.0) {
      const fps = Math.round(_frameCount / _fpsAccum);
      const ms  = Math.round((_fpsAccum / _frameCount) * 1000);
      Events.emit('perf:fps', { fps, ms });
      _frameCount = 0;
      _fpsAccum   = 0;
    }
  });
}

export function registerSystem(updateFn) {
  _systems.push(updateFn);
}

export function unregisterSystem(updateFn) {
  _systems = _systems.filter(s => s !== updateFn);
}

export function startLoop() {
  _lastTime = performance.now();
  _running  = true;
}

export function stopLoop() {
  _running = false;
}
