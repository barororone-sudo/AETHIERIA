// core/bootstrapBabylon.js — orchestration Phase 1

import { createEngine, createScene }          from '../engine/babylon/runtime.js';
import { initLighting, applyBiomeLighting }    from '../engine/babylon/lighting.js';
import { initCamera, updateCamera, getCamera, getCameraDebug } from '../engine/babylon/camera.js';
import { initPhysics, stepPhysics }            from '../engine/babylon/physics.js';
import { initPhysicsAdapter, getPhysicsQueryDebug } from '../engine/babylon/physicsAdapter.js';
import { createGameLoop, registerSystem, startLoop } from './loop.js';
import { initPerfOverlay }                     from './perf.js';
import { initReactiveAudio, getAudioDebugState } from './audio.js';
import { initWorldState, getCurrentAct, setAct, setWorldFlag, getWorldSnapshot } from '../persistence/worldStateManager.js';
import { loadGame, initSave, tickAutosave, newGame, hasSaveGame, saveGame } from '../persistence/save.js';
import { Events }                              from './events.js';
import { CONFIG }                              from './config.js';
import { getTimeScale }                        from './timeScale.js';
import { setGameFlowState, getGameFlowState }  from './gameFlowState.js';

import { getBiomeForAct }                      from '../world/biomes.js';
import { initTerrain, getTerrainHeight }       from '../world/babylonTerrain.js';
import { initSky, updateSkyForBiome }          from '../world/babylonSky.js';
import { updateChunkStreamer }                  from '../world/babylonChunkStreamer.js';

import { initPlayerCharacter, syncPlayerMeshToPhysics, getPlayerRoot, getPlayerBody } from '../gameplay/babylonPlayerCharacter.js';
import { initTraversalInput, updateTraversal, getStamina, setStamina } from '../gameplay/babylonTraversal.js';
import { initCombatInput, updateCombat, setCombatEnemySource, getLockedTarget, isInBulletTime, getComboStep, processIncomingDamage } from '../gameplay/babylonCombat.js';
import { initSkills, initSkillInput, updateSkills } from '../gameplay/babylonSkills.js';
import { initDebugOverlay }                              from './debugOverlay.js';
import { initPlayerHealth, updateHealth, getHp, takeDamage, setIFrames, respawnPlayer, setCurrentHp, setDamageFilter } from '../gameplay/babylonPlayerHealth.js';
import { spawnEnemy, updateEnemies, getAllEnemies }   from '../gameplay/babylonEnemies.js';
import { initVfx }                             from '../gameplay/babylonVfx.js';
import { initProgression, trackProximity, addItem, gainXp, useItem, completeQuest, getProgression } from '../gameplay/rpgProgression.js';
import { initFactions, shiftAlignment, getAlignment, getFaction, chooseFaction } from '../gameplay/babylonFactions.js';
import { initInteraction, updateInteraction }  from '../gameplay/babylonInteraction.js';
import { initTeleportation, updateTeleportation, teleportPlayer, getTeleportationDebugState } from '../gameplay/babylonTeleportation.js';
import { initMiniBoss, spawnMiniBoss, updateMiniBoss } from '../gameplay/babylonMiniBoss.js';
import { initFinalBoss, updateFinalBoss, spawnFinalBoss } from '../gameplay/babylonFinalBoss.js';
import { initFactionConsequences }                     from '../gameplay/babylonFactionConsequences.js';

import { initHud, updateHp, updateStamina, refreshQuest, updateSkillHud } from '../ui/hud.js';
import { initPanels, openPanel }               from '../ui/panels.js';
import { showMainMenu }                        from '../ui/mainMenu.js';
import { initPauseMenu }                       from '../ui/pauseMenu.js';
import { initDeathScreen }                     from '../ui/deathScreen.js';
import { initUiNavigator }                     from '../ui/uiNavigator.js';
import { applyActTheme }                       from '../ui/theme.js';
import { initMinimap, updateMinimap, toggleWorldMap } from '../ui/minimap.js';
import { initCheckpoints, saveCheckpoint, tickCheckpointAuto, getLastCheckpoint, clearCheckpoints } from '../persistence/checkpoints.js';

import { spawnPhase2Interactables }            from '../world/phase2Interactables.js';
import { initWeather, setWeatherForAct }       from '../world/babylonWeather.js';
import { initWorldMutations }                  from '../world/babylonWorldMutations.js';
import { initLandmarks }                       from '../world/babylonLandmarks.js';
import { initFogOfWar, updateFogOfWar, getFogDebugState } from '../world/babylonFogOfWar.js';
import { initPhaseDTriggers, updatePhaseDTriggers } from '../world/phaseDTriggers.js';
import { initPhase4Triggers, updatePhase4Triggers } from '../world/phase4Triggers.js';
import { initPostProcess, applyActPostProcess }     from '../engine/babylon/postProcess.js';

// Grass system (BotW/Genshin style)
import { initGrass, updateGrass } from '../world/babylonGrass.js';

// Loading screen + progress
import { showLoadingScreen, updateLoadingProgress, setLoadingText, hideLoadingScreen } from '../ui/loadingScreen.js';
import { setLoadProgressCallback, resetLoadProgress } from '../core/assetLoader.js';

// Free-packs asset loaders (Phase 5)
import { initPropsFreePacks } from '../world/babylonPropsFreePacks.js';
import { initEnemiesFreePacks, spawnEnemyFreePacks, getAllEnemiesFreePacks, updateEnemiesFreePacks } from '../gameplay/babylonEnemiesFreePacks.js';
import { initMiniBossFreePacks, spawnMiniBossFreePacks, spawnBossFinalFreePacks, updateMiniBossFreePacks, updateBossFinalFreePacks } from '../gameplay/babylonMiniBossFreePacks.js';
import { setFinalBossSpawnHandler } from '../world/phase4Triggers.js';

// World building systems (Senior Level Design)
import { initNarrativeVignettes } from '../world/narrativeVignettes.js';
import { initWorldVfx, updateWorldVfx } from '../world/babylonWorldVfx.js';
import { initAct1VerticalSlice, getAct1VerticalSliceDebug } from '../world/act1VerticalSlice.js';

// Phase AAA — World Manager, Ecosystem, Instancing, POI
import { initWorldManager, updateWorldManager, getWorldDebug } from '../world/WorldManager.js';
import { initInstancingSystem } from '../world/InstancingSystem.js';
import { initPOISystem, spawnAllPOIs } from '../world/POISystem.js';
import { spawnWorldLandmarks } from '../world/WorldLandmarks.js';

import { Vector3 }                             from '@babylonjs/core';

// ── État global ────────────────────────────────────────────────────────────

const _gameState = {
  player:    { hp: CONFIG.player.maxHp, xp: 0, level: 1, position: { x: 0, y: 2, z: 0 }, faction: null },
  inventory: [],
  quests:    [],
  world:     null,
};

function getState() {
  const progression = getProgression();
  _gameState.player.xp = progression.xp;
  _gameState.player.level = progression.level;
  _gameState.inventory = Object.entries(progression.inventory).map(([id, quantity]) => ({ id, quantity }));
  _gameState.quests = Object.entries(progression.quests).map(([id, state]) => ({ id, ...state }));
  return _gameState;
}
function applyState(state) {
  Object.assign(_gameState, state);
  if (state.player) Object.assign(_gameState.player, state.player);
}

function _applyPlayerPosition(position) {
  if (!position) return;
  const body = getPlayerBody();
  const root = getPlayerRoot();
  if (body) {
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
  if (root) {
    root.position.set(position.x, position.y, position.z);
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function bootstrap() {
  setGameFlowState('menu');

  const canContinue = await hasSaveGame();
  const menuChoice = await showMainMenu({ hasSave: canContinue });
  setGameFlowState('loading');

  // Afficher l'écran de chargement avec barre de progression
  showLoadingScreen();
  setLoadProgressCallback((loaded, total) => {
    updateLoadingProgress(loaded, total);
  });
  resetLoadProgress();

  if (menuChoice === 'new') {
    await newGame();
  }

  setLoadingText('Initialisation du moteur...');

  // 1. Moteur + scène
  const engine = createEngine();
  const scene  = createScene();
  const canvas = document.getElementById('render-canvas');
  initPhysicsAdapter(scene);

  // 2. Éclairage
  initLighting(scene);

  // 3. Caméra
  initCamera(scene, canvas);

  // 4. Physique
  setLoadingText('Initialisation de la physique...');
  await initPhysics();

  // 5. Persistance
  await initWorldState();
  initSave(getState, applyState);
  const saved = await loadGame();
  initCheckpoints();

  // 6. Biome courant
  const initialAct = getCurrentAct();
  let biome = getBiomeForAct(initialAct);

  // 7. Monde
  setLoadingText('Génération du terrain...');
  initTerrain(scene, biome);
  initSky(scene, biome);
  applyBiomeLighting(biome.name);
  initGrass(scene);

  // 8. Joueur — spawn à y=0 (zone plate), physique le pose sur le sol
  const spawnPos = new Vector3(0, 3, 0);
  await initPlayerCharacter(scene, spawnPos);
  if (saved?.player?.position) {
    _applyPlayerPosition(saved.player.position);
  }

  initPlayerHealth();
  setDamageFilter(processIncomingDamage);
  setCurrentHp(saved?.player?.hp ?? CONFIG.player.maxHp);

  initProgression(saved ?? null);
  initFactions(saved?.player?.faction ?? null);

  // 9. Input
  initTraversalInput();
  initCombatInput(canvas, scene);
  initInteraction(scene);

  // 10. Ennemis de test (grassland)
  const useFreePacks = CONFIG.features.useFreePacks; // Config pour basculer
  
  // Initialiser les systèmes free-packs — batch loading avec progression
  if (useFreePacks) {
    setLoadingText('Chargement des ennemis...');
    await initEnemiesFreePacks(scene, true);
    setLoadingText('Chargement des props et POIs...');
    await initPropsFreePacks(scene, biome.name, true);
    setLoadingText('Chargement des vignettes narratives...');
    await initNarrativeVignettes(scene, biome.name);
    setLoadingText('Initialisation des VFX monde...');
    initWorldVfx(scene, biome.name);
    setLoadingText('Chargement des boss...');
    await initMiniBossFreePacks(scene, true);
  }
  
  const enemySpawns = [
    { type: 'scout',   x:  12, z:  8  },
    { type: 'scout',   x: -10, z:  15 },
    { type: 'scout',   x:  20, z: -5  },
    { type: 'armored', x:  5,  z: -18 },
    { type: 'armored', x: -15, z: -10 },
    { type: 'archer',  x:  25, z:  12 },
    { type: 'archer',  x: -18, z: -20 },
    // Act I vertical slice objectives.
    { type: 'scout',   x:  11, z:   8 },
    { type: 'scout',   x: -25, z:  30 },
    { type: 'scout',   x: -18, z:  24 },
  ];
  for (const s of enemySpawns) {
    const pos = new Vector3(s.x, getTerrainHeight(s.x, s.z) + 2, s.z);
    if (useFreePacks) {
      const spawned = await spawnEnemyFreePacks(s.type, pos, scene);
      if (!spawned) spawnEnemy(s.type, pos, scene);
    } else {
      spawnEnemy(s.type, pos, scene);
    }
  }
  const enemySource = useFreePacks
    ? () => [...getAllEnemiesFreePacks(), ...getAllEnemies().filter(e => e.isAlive)]
    : getAllEnemies;
  setCombatEnemySource(enemySource);
  initSkills(enemySource);
  initSkillInput();

  // 11. VFX
  initVfx(scene);

  // 12. HUD + Panels + Theme
  applyActTheme(initialAct);
  initHud();
  initPanels();
  initMinimap();
  refreshQuest();

  // 12b. Interactables Phase 2
  spawnPhase2Interactables();

  // 12c. Phase 3 — Météo, mutations, landmarks, triggers, post-process, mini-boss
  initWeather(scene);
  initWorldMutations(scene);
  initAct1VerticalSlice(scene);
  initLandmarks(scene, biome.name);
  initFogOfWar(scene);

  // AAA World systems — WorldManager + POI + Instancing
  initWorldManager(scene);
  initInstancingSystem(scene);
  initPOISystem(scene);
  setLoadingText('Placement des tours et waypoints...');
  spawnAllPOIs(scene);
  setLoadingText('Génération des landmarks...');
  spawnWorldLandmarks(scene);

  initTeleportation(scene, 'grassland');
  initPhaseDTriggers(scene);
  if (!useFreePacks) {
    initMiniBoss(scene);
    initFinalBoss(scene);
  }
  initFactionConsequences(scene);
  initPhase4Triggers(scene);
  setFinalBossSpawnHandler(() => {
    if (!useFreePacks) {
      spawnFinalBoss();
      return;
    }
    const player = getPlayerRoot();
    const x = player ? player.position.x + 40 : 40;
    const z = player ? player.position.z : 0;
    const y = getTerrainHeight(x, z) + 2;
    spawnBossFinalFreePacks(new Vector3(x, y, z), scene);
  });

  // Post-process
  const cam = getCamera();
  if (cam) initPostProcess(cam, scene);
  applyActPostProcess(initialAct);

  // Écouter les changements d'acte pour mettre à jour le thème
  Events.on('act:changed', ({ act }) => {
    biome = getBiomeForAct(act);
    applyActTheme(act);
    applyActPostProcess(act);
    applyBiomeLighting(biome.name);
    updateSkyForBiome(scene, biome);
    setWeatherForAct(act);
    if (useFreePacks) {
      initPropsFreePacks(scene, biome.name, true).catch((error) => {
        console.warn('[GUTTER GOD] Free-pack props preload failed for biome', biome?.name, error);
      });
    }
  });

  // Fast travel via waypoints
  Events.on('fastTravel:teleport', ({ x, y, z, label }) => {
    _applyPlayerPosition({ x, y, z });
    Events.emit('ui:notification', { text: `Téléporté à : ${label}`, duration: 2500 });
  });

  // Écouter les téléportations via portails
  Events.on('portal:used', ({ portalId }) => {
    const playerBody = getPlayerBody();
    if (playerBody) {
      teleportPlayer(playerBody, portalId);
    }
  });

  // 13. Game loop — passer la scène pour le render
  createGameLoop(engine, scene);

  const pauseMenu = initPauseMenu({
    onResume: () => {
      if (getGameFlowState() !== 'paused') return;
      setGameFlowState('playing');
      pauseMenu.hide();
    },
    onSave: async () => {
      Events.emit('save:requested', { source: 'pause-menu' });
      await saveGame();
    },
    onReturnToMainMenu: () => {
      window.location.reload();
    },
  });

  const deathScreen = initDeathScreen({
    canLoad: canContinue,
    onRespawn: async () => {
      const checkpoint = getLastCheckpoint();
      const pos = checkpoint
        ? { x: checkpoint.x, y: checkpoint.y, z: checkpoint.z }
        : { x: 0, y: getTerrainHeight(0, 0) + 2, z: 0 };

      if (checkpoint?.act && checkpoint.act !== getCurrentAct()) {
        await setAct(checkpoint.act);
      }

      _applyPlayerPosition(pos);
      respawnPlayer(CONFIG.player.respawnHpRatio ?? 0.5);
      setGameFlowState('playing');
      deathScreen.hide();
    },
    onLoadSave: async () => {
      const loaded = await loadGame();
      if (loaded?.player?.position) {
        _applyPlayerPosition(loaded.player.position);
      }
      respawnPlayer(1);
      setCurrentHp(loaded?.player?.hp ?? CONFIG.player.maxHp);
      setGameFlowState('playing');
      deathScreen.hide();
    },
    onReturnToMainMenu: () => {
      window.location.reload();
    },
  });

  Events.on('player:died', async () => {
    if (getGameFlowState() === 'dead') return;
    pauseMenu.hide();
    setGameFlowState('dead');
    deathScreen.setCanLoad(await hasSaveGame());
    deathScreen.show();
  });

  const togglePause = () => {
    const flow = getGameFlowState();
    if (flow === 'menu' || flow === 'loading' || flow === 'dead') return;

    if (flow === 'paused') {
      setGameFlowState('playing');
      pauseMenu.hide();
      return;
    }

    setGameFlowState('paused');
    pauseMenu.show();
  };

  window.addEventListener('keydown', (e) => {
    const pauseCodes = new Set(['Escape', 'F10', 'KeyO']);
    if (!pauseCodes.has(e.code)) return;

    e.preventDefault();
    e.stopPropagation();
    togglePause();
  }, true);

  initUiNavigator({
    openPanel,
    toggleMap: () => toggleWorldMap(),
    togglePause,
    returnToMainMenu: () => window.location.reload(),
  });

  registerSystem((dt) => {
    if (getGameFlowState() !== 'playing') return;
    stepPhysics();
  });

  registerSystem((dt) => {
    if (getGameFlowState() !== 'playing') return;

    const root = getPlayerRoot();
    if (!root) return;

    // Traversal + sync physique
    const { stamina } = updateTraversal(dt, scene) ?? {};
    syncPlayerMeshToPhysics();

    // Caméra suit le joueur
    updateCamera(root.position, dt);

    // Combat
    updateCombat(dt);
    updateSkills(dt);

    // Santé
    updateHealth(dt);

    // Ennemis
    if (useFreePacks) updateEnemiesFreePacks(dt);
    updateEnemies(dt);

    // Mini-boss
    if (useFreePacks) {
      updateMiniBossFreePacks(dt);
    } else {
      updateMiniBoss(dt);
    }

    // Boss final
    if (useFreePacks) {
      updateBossFinalFreePacks(dt);
    } else {
      updateFinalBoss(dt);
    }

    // Triggers Phase 3
    updatePhaseDTriggers(root.position, scene);

    // Triggers Phase 4
    updatePhase4Triggers(root.position, scene);

    // Interactions
    updateInteraction(root.position);

    // Téléportation
    updateTeleportation(root.position);

    // Brouillard de carte
    updateFogOfWar(root.position);

    // Grass wind animation
    updateGrass(dt, root.position);

    // World VFX (ambient particles follow player)
    updateWorldVfx(root.position);

    // WorldManager — biome transitions + POI proximity
    updateWorldManager(root.position);

    // Chunk streaming
    updateChunkStreamer(root.position, biome, scene);

    // Quêtes proximité
    trackProximity(root.position.x, root.position.z);

    // HUD
    const hp = getHp();
    updateHp(hp.current, hp.max);
    if (stamina !== undefined) updateStamina(stamina, CONFIG.stamina.max);
    updateMinimap();
    updateSkillHud();

    _gameState.player.position = {
      x: root.position.x,
      y: root.position.y,
      z: root.position.z,
    };
    _gameState.player.hp = hp.current;
    _gameState.player.faction = getFaction();
  });

  registerSystem((dt) => {
    if (getGameFlowState() !== 'playing') return;
    const root = getPlayerRoot();
    if (!root) return;

    const checkpoint = tickCheckpointAuto(dt, root.position, getCurrentAct(), {
      minSeconds: 12,
      minDistance: 22,
    });

    if (checkpoint) {
      Events.emit('checkpoint:saved', checkpoint);
    }
  });

  registerSystem((dt) => tickAutosave(dt));

  // 14. Debug overlay (F1)
  initDebugOverlay();

  // 15. Overlay perf
  initPerfOverlay();

  // 16. Audio réactif Phase 5 (lazy unlock au premier input utilisateur)
  initReactiveAudio(initialAct);

  // 15. Démarrer
  setLoadingText('Prêt !');
  hideLoadingScreen();
  startLoop();
  setGameFlowState('playing');

  console.log('[GUTTER GOD] Phase 2 — bootstrap OK');
  if (typeof window !== 'undefined') {
    window.__bootstrapDone    = true;
    window.__takeDamage       = (amt) => takeDamage(amt, 'test');
    window.__setIFrames       = (dur) => setIFrames(dur);
    window.__addItem          = (id, qty) => addItem(id, qty);
    window.__useItem          = (id) => useItem(id);
    window.__gainXp           = (amt) => gainXp(amt);
    window.__completeQuest    = (id) => completeQuest(id);
    window.__setWorldFlag     = (key, value = true) => setWorldFlag(key, value);
    window.__getWorldSnapshot = () => getWorldSnapshot();
    window.__setAct           = (act) => setAct(act);
    window.__getAct1Slice     = () => getAct1VerticalSliceDebug();
    window.__shiftAlignment   = (amt) => shiftAlignment(amt);
    window.__getAlignment     = () => getAlignment();
    window.__getFaction       = () => getFaction();
    window.__emitEvent        = (ev, data) => Events.emit(ev, data);
    // APIs gameplay réel
    window.__getPlayerBody    = () => getPlayerBody();
    window.__getPlayerRoot    = () => getPlayerRoot();
    window.__getLockedTarget  = () => getLockedTarget();
    window.__getAllEnemies    = () => enemySource();
    window.__getCameraDebug   = () => getCameraDebug();
    window.__getPhysicsQueryDebug = () => getPhysicsQueryDebug();
    window.__getTerrainHeight = (x, z) => getTerrainHeight(x, z);
    window.__getConfig      = () => CONFIG;
    window.__getTimeScale   = () => getTimeScale();
    window.__setStamina     = (v) => setStamina(v);
    window.__spawnBoss      = (act) => {
      if (!useFreePacks) return spawnMiniBoss(act);
      const player = getPlayerRoot();
      const x = player ? player.position.x + 30 : 30;
      const z = player ? player.position.z : 0;
      const y = getTerrainHeight(x, z) + 2;
      return spawnMiniBossFreePacks(act, new Vector3(x, y, z), scene);
    };
    window.__spawnFinalBoss  = () => {
      if (!useFreePacks) return spawnFinalBoss();
      const player = getPlayerRoot();
      const x = player ? player.position.x + 40 : 40;
      const z = player ? player.position.z : 0;
      const y = getTerrainHeight(x, z) + 2;
      return spawnBossFinalFreePacks(new Vector3(x, y, z), scene);
    };
    window.__chooseFaction   = (id) => chooseFaction(id);
    window.__getAudioState   = () => getAudioDebugState();
    window.__getTeleportState = () => getTeleportationDebugState();
    window.__getFogState     = () => getFogDebugState();
    window.__teleportPlayer  = (portalId) => teleportPlayer(getPlayerBody(), portalId);
    // Free-packs debug APIs
    window.__toggleFreePacks = (enabled) => { CONFIG.features.useFreePacks = enabled; console.log('FreePacks:', enabled); };
    window.__returnToMainMenu = () => window.location.reload();
    window.__saveCheckpoint = () => {
      const root = getPlayerRoot();
      if (!root) return null;
      return saveCheckpoint(root.position, getCurrentAct());
    };
    window.__getCheckpoint = () => getLastCheckpoint();
    window.__clearCheckpoint = () => clearCheckpoints();
    window.__getAssetCache   = () => { 
      try {
        const { getAssetCacheState } = require('../core/assetLoader.js');
        return getAssetCacheState();
      } catch (e) {
        return { error: 'Asset loader not available' };
      }
    };
  }
}

bootstrap().catch(err => {
  console.error('[GUTTER GOD] Bootstrap failed:', err);
});
