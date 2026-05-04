import { Events } from './events.js';
import { getBiomeForAct } from '../world/biomes.js';
import { loadAudioSettings, updateAudioSettings } from './audioSettings.js';
import { CONFIG } from './config.js';

const ACT_MUSIC = {
  1: 'assets/audio/music/act1_exploration.mp3',
  2: 'assets/audio/music/combat_general.mp3',
  3: 'assets/audio/music/combat_general.mp3',
  4: 'assets/audio/music/boss_battle.mp3',
  5: 'assets/audio/music/boss_battle.mp3',
};

const SFX_MAP = {
  hit: 'assets/audio/sfx/kenney_rpg_sfx/OGG/knifeSlice.ogg',
  dodge: 'assets/audio/sfx/kenney_rpg_sfx/OGG/footstep03.ogg',
  enemyDied: 'assets/audio/sfx/kenney_rpg_sfx/OGG/dropLeather.ogg',
  uiClick: 'assets/audio/sfx/kenney_rpg_sfx/OGG/menuSelect.wav',
  footGrass: 'assets/audio/sfx/kenney_rpg_sfx/OGG/footstep01.ogg',
  footStone: 'assets/audio/sfx/kenney_rpg_sfx/OGG/footstep02.ogg',
  footEarth: 'assets/audio/sfx/kenney_rpg_sfx/OGG/footstep03.ogg',
};

const FOOTSTEP_SURFACES = {
  grassland: 'footGrass',
  ashlands: 'footEarth',
  ironrain: 'footStone',
  rootblight: 'footEarth',
  schism: 'footStone',
};

const _state = {
  enabled: typeof window !== 'undefined' && typeof window.Audio !== 'undefined',
  initialized: false,
  unlocked: false,
  currentAct: 1,
  currentBiome: null,
  currentMusicKey: null,
  combatPulse: 0,
  bossActive: false,
  footstepTimer: 0,
  footstepPhase: 0,
  channels: {
    music: null,
    ambiance: null,
  },
  sfxPool: new Map(),
  listenersBound: false,
};

function _createLoopChannel(volume = 0.5) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.loop = true;
  audio.volume = volume;
  return audio;
}

function _safePlay(audio) {
  if (!audio) return;
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

function _switchLoop(channelName, src) {
  const channel = _state.channels[channelName];
  if (!channel || !src) return;
  if (channel.src.endsWith(src)) {
    _safePlay(channel);
    return;
  }
  channel.pause();
  channel.currentTime = 0;
  channel.src = src;
  _safePlay(channel);
}

function _playSfx(key, volume = 0.55) {
  if (!_state.enabled || !_state.unlocked) return;
  const src = SFX_MAP[key];
  if (!src) return;

  const settings = loadAudioSettings();
  const effectiveVolume = Math.max(0, Math.min(1, volume * settings.master * settings.sfx));
  if (effectiveVolume <= 0.01) return;

  let base = _state.sfxPool.get(src);
  if (!base) {
    base = new Audio(src);
    base.preload = 'none';
    _state.sfxPool.set(src, base);
  }

  const clip = base.cloneNode();
  clip.volume = effectiveVolume;
  _safePlay(clip);
}

function _applyForAct(act) {
  _state.currentAct = Number(act) || 1;
  const biome = getBiomeForAct(_state.currentAct);
  _state.currentBiome = biome?.name ?? null;

  const music = biome?.music ?? ACT_MUSIC[_state.currentAct] ?? ACT_MUSIC[1];
  const ambiance = biome?.ambiance ?? 'assets/audio/ambiance/forest.mp3';

  _state.currentMusicKey = music;
  _switchLoop('music', music, 'music');
  _switchLoop('ambiance', ambiance, 'ambiance');
}

function _setChannelVolume(channelName, value) {
  const channel = _state.channels[channelName];
  if (!channel) return;
  channel.volume = Math.max(0, Math.min(1, value));
}

function _syncVolumes() {
  const settings = loadAudioSettings();
  _setChannelVolume('music', settings.master * settings.music);
  _setChannelVolume('ambiance', settings.master * settings.ambiance);
}

function _resolveMusicSrc() {
  const biome = getBiomeForAct(_state.currentAct);
  const exploration = biome?.music ?? ACT_MUSIC[_state.currentAct] ?? ACT_MUSIC[1];
  const combat = ACT_MUSIC[_state.currentAct] ?? ACT_MUSIC[2];

  if (_state.bossActive || _state.currentAct >= 4) return 'assets/audio/music/boss_battle.mp3';
  if (_state.combatPulse > 0) return combat;
  return exploration;
}

function _updateMusicTrack() {
  const nextSrc = _resolveMusicSrc();
  if (!nextSrc) return;
  if (_state.currentMusicKey === nextSrc) return;
  _state.currentMusicKey = nextSrc;
  _switchLoop('music', nextSrc, 'music');
}

function _handleCombatPulse(delta = 1.0) {
  _state.combatPulse = Math.max(0, _state.combatPulse - delta);
}

function _surfaceForPosition(position = {}, biomeName = _state.currentBiome) {
  const x = Number(position.x ?? 0);
  const z = Number(position.z ?? 0);
  const h = Math.abs(Math.round((x * 0.12) + (z * 0.08))) % 10;

  if (biomeName === 'grassland') {
    if (h <= 2) return 'footGrass';
    if (h <= 6) return 'footEarth';
    return 'footStone';
  }

  if (biomeName === 'schism' || biomeName === 'ironrain') return 'footStone';
  return h > 6 ? 'footStone' : 'footEarth';
}

function _maybeFootstep(dt, context = {}) {
  const body = context.body;
  const flow = context.flowState ?? 'playing';
  if (flow !== 'playing') {
    _state.footstepTimer = 0;
    return;
  }

  if (!body) return;
  const grounded = !!context.grounded;
  if (!grounded) {
    _state.footstepTimer = 0;
    return;
  }

  const vel = body.linvel?.() ?? { x: 0, y: 0, z: 0 };
  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  if (speed < 1.0) {
    _state.footstepTimer = 0;
    return;
  }

  const stepRate = speed > 5.5 ? 0.26 : 0.38;
  _state.footstepTimer += dt;
  if (_state.footstepTimer < stepRate) return;

  _state.footstepTimer = 0;
  _state.footstepPhase++;
  const surface = _surfaceForPosition(context.position ?? body.translation?.() ?? {}, context.biomeName);
  const volume = speed > 5.5 ? 0.34 : 0.24;
  _playSfx(surface, volume);
}

function _bindGameplayAudio() {
  if (_state.listenersBound) return;
  _state.listenersBound = true;

  Events.on('act:changed', ({ act }) => _applyForAct(act));
  Events.on('combat:hit', () => _playSfx('hit', 0.58));
  Events.on('combat:dodge', () => _playSfx('dodge', 0.45));
  Events.on('enemy:died', () => _playSfx('enemyDied', 0.6));
  Events.on('boss:spawned', () => { _state.bossActive = true; _state.combatPulse = 8; });
  Events.on('boss:attack', () => { _state.bossActive = true; _state.combatPulse = 6; });
  Events.on('boss:phaseChange', () => { _state.bossActive = true; _state.combatPulse = 8; });
  Events.on('boss:died', ({ act }) => {
    _state.bossActive = false;
    _state.combatPulse = 0;
    if (Number(act) !== 5) return;
    const music = _state.channels.music;
    if (!music) return;
    music.loop = false;
    music.pause();
    music.currentTime = 0;
    music.src = 'assets/audio/music/victory.mp3';
    _safePlay(music);
  });
  Events.on('combat:hit', () => { _state.combatPulse = 4; });
  Events.on('combat:dodge', () => { _state.combatPulse = Math.max(_state.combatPulse, 1.5); });
  Events.on('enemy:attack', () => { _state.combatPulse = Math.max(_state.combatPulse, 3); });
  Events.on('ui:click', () => _playSfx('uiClick', 0.35));
  Events.on('settings:audioChanged', () => _syncVolumes());

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('button, input[type="range"], [role="button"]')) return;
    if (target.closest('canvas')) return;
    _playSfx('uiClick', 0.24);
  }, true);
}

function _unlockAndStart() {
  if (!_state.enabled || _state.unlocked) return;
  _state.unlocked = true;
  _applyForAct(_state.currentAct);
}

function _bindFirstInputUnlock() {
  const opts = { passive: true, once: true };
  const unlock = () => _unlockAndStart();
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('touchstart', unlock, opts);
}

export function initReactiveAudio(initialAct = 1) {
  if (_state.initialized || !_state.enabled) return;
  _state.initialized = true;
  _state.currentAct = Number(initialAct) || 1;

  _state.channels.music = _createLoopChannel(0.42);
  _state.channels.ambiance = _createLoopChannel(0.3);

  _bindGameplayAudio();
  _bindFirstInputUnlock();
  _syncVolumes();
}

export function updateReactiveAudio(dt, context = {}) {
  if (!_state.enabled) return;
  _handleCombatPulse(dt);
  _updateMusicTrack();
  _maybeFootstep(dt, context);
  _syncVolumes();
}

export function getAudioSettings() {
  return loadAudioSettings();
}

export function setAudioSettings(patch) {
  const next = updateAudioSettings(patch);
  Events.emit('settings:audioChanged', next);
  return next;
}

export function getAudioDebugState() {
  return {
    enabled: _state.enabled,
    initialized: _state.initialized,
    unlocked: _state.unlocked,
    currentAct: _state.currentAct,
    currentBiome: _state.currentBiome,
    music: _state.channels.music?.src ?? null,
    ambiance: _state.channels.ambiance?.src ?? null,
    settings: loadAudioSettings(),
    combatPulse: _state.combatPulse,
    bossActive: _state.bossActive,
  };
}
