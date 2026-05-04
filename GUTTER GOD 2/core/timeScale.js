let _scale = 1.0;

export function setTimeScale(scale) {
  _scale = Math.max(0.01, Math.min(2.0, scale));
}

export function getTimeScale() {
  return _scale;
}

export function scaleDelta(rawDt) {
  return rawDt * _scale;
}
