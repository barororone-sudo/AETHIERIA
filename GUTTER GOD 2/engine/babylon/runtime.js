// engine/babylon/runtime.js — engine Babylon + scène principale

import {
  Engine,
  Scene,
  Color4,
} from '@babylonjs/core';
import { CONFIG } from '../../core/config.js';

let _engine = null;
let _scene  = null;

export function createEngine() {
  const canvas = document.getElementById('render-canvas');

  _engine = new Engine(canvas, CONFIG.render.antialias, {
    preserveDrawingBuffer: false,
    stencil:               true,
    disableWebGL2Support:  false,
    powerPreference:       'high-performance',
  });

  // Adapter la résolution au canvas
  _engine.setHardwareScalingLevel(1.0);

  window.addEventListener('resize', () => _engine.resize());

  return _engine;
}

export function createScene() {
  _scene = new Scene(_engine);
  _scene.clearColor = new Color4(0.05, 0.05, 0.08, 1.0);
  if (typeof window !== 'undefined') window.__scene = _scene;

  // Optimisations Iris Xe
  _scene.autoClear          = true;
  _scene.autoClearDepthAndStencil = true;
  _scene.skipPointerMovePicking   = true; // évite raycasts inutiles sur mousemove

  return _scene;
}

export function getEngine() { return _engine; }
export function getScene()  { return _scene;  }
