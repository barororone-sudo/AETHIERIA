// core/audioSettings.js — volume/audio preferences partagés

const STORAGE_KEY = 'gg2.audioSettings';

const DEFAULTS = {
  master: 0.8,
  music: 0.55,
  sfx: 0.7,
  ambiance: 0.45,
};

export function loadAudioSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      master: Number(parsed.master ?? DEFAULTS.master),
      music: Number(parsed.music ?? DEFAULTS.music),
      sfx: Number(parsed.sfx ?? DEFAULTS.sfx),
      ambiance: Number(parsed.ambiance ?? DEFAULTS.ambiance),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(next) {
  const current = loadAudioSettings();
  const merged = {
    master: clamp01(next?.master ?? current.master),
    music: clamp01(next?.music ?? current.music),
    sfx: clamp01(next?.sfx ?? current.sfx),
    ambiance: clamp01(next?.ambiance ?? current.ambiance),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function updateAudioSettings(patch) {
  return saveAudioSettings({ ...loadAudioSettings(), ...patch });
}

export function resetAudioSettings() {
  return saveAudioSettings(DEFAULTS);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}
