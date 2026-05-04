// engine/babylon/postProcess.js — color grading par acte

import {
  ColorCorrectionPostProcess,
  ImageProcessingPostProcess,
} from '@babylonjs/core';

let _imgProcess = null;

const ACT_PROFILES = {
  1: { contrast: 1.1, exposure: 1.0, saturation: 1.1, vignetteWeight: 1.5, vignetteColor: { r:0,g:0,b:0 } },
  2: { contrast: 1.2, exposure: 0.9, saturation: 0.8, vignetteWeight: 2.0, vignetteColor: { r:0.1,g:0.05,b:0 } },
  3: { contrast: 1.15,exposure: 0.85,saturation: 0.7, vignetteWeight: 2.5, vignetteColor: { r:0,g:0.05,b:0 } },
  4: { contrast: 1.3, exposure: 0.8, saturation: 0.6, vignetteWeight: 3.0, vignetteColor: { r:0.05,g:0,b:0.1} },
  5: { contrast: 1.4, exposure: 0.75,saturation: 0.5, vignetteWeight: 3.5, vignetteColor: { r:0.1,g:0,b:0 } },
};

export function initPostProcess(camera, scene) {
  // Une seule passe ImageProcessing — budget Iris Xe
  _imgProcess = new ImageProcessingPostProcess('imgProcess', 1.0, camera);
  _imgProcess.imageProcessingConfiguration.isEnabled = true;
  _imgProcess.imageProcessingConfiguration.vignetteEnabled = true;
  _imgProcess.imageProcessingConfiguration.vignetteBlendMode = 1;

  applyActPostProcess(1);
}

export function applyActPostProcess(act) {
  if (!_imgProcess) return;
  const p = ACT_PROFILES[act] ?? ACT_PROFILES[1];
  const cfg = _imgProcess.imageProcessingConfiguration;

  cfg.contrast   = p.contrast;
  cfg.exposure   = p.exposure;
  cfg.colorCurvesEnabled = false; // trop lourd pour Iris Xe

  // Saturation via colorGradingEnabled = false (on garde simple)
  cfg.vignetteWeight = p.vignetteWeight;
}
