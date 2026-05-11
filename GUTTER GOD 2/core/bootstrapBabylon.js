// core/bootstrapBabylon.js — orchestration Phase 1

import { createEngine, createScene }          from '../engine/babylon/runtime.js';
import { initLighting, applyBiomeLighting, getSunLight, getAmbientLight } from '../engine/babylon/lighting.js';
import { initCamera, updateCamera, getCamera, getCameraDebug, disposeCamera } from '../engine/babylon/camera.js';
import { initPhysics, stepPhysics }            from '../engine/babylon/physics.js';
import { initPhysicsAdapter, getPhysicsQueryDebug } from '../engine/babylon/physicsAdapter.js';
import { createGameLoop, registerSystem, startLoop } from './loop.js';
import { initPerfOverlay }                     from './perf.js';
import { initReactiveAudio, getAudioDebugState } from './audio.js';
import { initWorldState, getCurrentAct, setAct, setWorldFlag, getWorldFlag, getWorldSnapshot } from '../persistence/worldStateManager.js';
import { loadGame, initSave, tickAutosave, newGame, hasSaveGame, saveGame } from '../persistence/save.js';
import { Events }                              from './events.js';
import { CONFIG }                              from './config.js';
import { getTimeScale }                        from './timeScale.js';
import { setGameFlowState, getGameFlowState }  from './gameFlowState.js';

import { getBiomeForAct, BIOMES }              from '../world/biomes.js';
import { initTerrain, updateTerrainAroundPlayer, applyTerrainBiome, getTerrainHeight, getTerrainDebug } from '../world/babylonTerrain.js';
import { initSky, updateSkyForBiome, getSkyMat } from '../world/babylonSky.js';
import { updateChunkStreamer, getChunkStreamerDebug } from '../world/babylonChunkStreamer.js';
import { getZoneAt, ZONE }                     from '../world/zoneMap.js';

import { initPlayerCharacter, syncPlayerMeshToPhysics, updatePlayerAnimation, getPlayerRoot, getPlayerBody, getPlayerAnim } from '../gameplay/babylonPlayerCharacter.js';
import { initTraversalInput, updateTraversal, getStamina, setStamina } from '../gameplay/babylonTraversal.js';
import { initCombatInput, updateCombat, setCombatEnemySource, getLockedTarget, isInBulletTime, getComboStep, processIncomingDamage } from '../gameplay/babylonCombat.js';
import { initSkills, initSkillInput, updateSkills } from '../gameplay/babylonSkills.js';
import { initDebugOverlay }                              from './debugOverlay.js';
import { initPlayerHealth, updateHealth, getHp, takeDamage, setIFrames, respawnPlayer, setCurrentHp, setDamageFilter, setPlayerBody } from '../gameplay/babylonPlayerHealth.js';
import { spawnEnemy, updateEnemies, getAllEnemies }   from '../gameplay/babylonEnemies.js';
import { initVfx }                             from '../gameplay/babylonVfx.js';
import { initFpsGuard, updateFpsGuard, getFpsGuardState } from '../engine/babylon/fpsGuard.js';
import { initWeaponSystem, addWeaponXP, equipWeapon, WEAPON_TYPES, initWeaponSwitchInput, unlockWeapon } from '../gameplay/weaponSystem.js';
import { initSpiderManCombat, updateWallClimb, updateWallRun, updateWebSwing, updateAerialState } from '../gameplay/spiderManCombat.js';
import { initHitStop, updateHitStop }          from '../gameplay/hitStop.js';
import { initDamageNumbers }                   from '../gameplay/damageNumbers.js';
import { initWeaponTrails, updateWeaponTrails } from '../gameplay/weaponTrails.js';
import { initProgression, trackProximity, addItem, gainXp, useItem, completeQuest, getProgression, getPrimaryQuestObjective } from '../gameplay/rpgProgression.js';
import { initQuestMapBridge, syncQuestMapTarget, getQuestMapBridgeDebug } from '../gameplay/questMapBridge.js';
import { initFactions, shiftAlignment, getAlignment, getFaction, chooseFaction } from '../gameplay/babylonFactions.js';
import { initInteraction, updateInteraction }  from '../gameplay/babylonInteraction.js';
import { initTeleportation, updateTeleportation, teleportPlayer, getTeleportationDebugState } from '../gameplay/babylonTeleportation.js';
import { initMiniBoss, spawnMiniBoss, updateMiniBoss } from '../gameplay/babylonMiniBoss.js';
import { initFinalBoss, updateFinalBoss, spawnFinalBoss } from '../gameplay/babylonFinalBoss.js';
import { initFactionConsequences }                     from '../gameplay/babylonFactionConsequences.js';

import { initHud, updateHp, updateStamina, refreshQuest, updateSkillHud, updateXpBar, updatePlayerStatuses } from '../ui/hud.js';
import { initPanels, openPanel }               from '../ui/panels.js';
import { showMainMenu }                        from '../ui/mainMenu.js';
import { initPauseMenu }                       from '../ui/pauseMenu.js';
import { initDeathScreen }                     from '../ui/deathScreen.js';
import { initUiNavigator }                     from '../ui/uiNavigator.js';
import { applyActTheme }                       from '../ui/theme.js';
import { initMinimap, updateMinimap, toggleWorldMap, isWorldMapOpen, closeWorldMap } from '../ui/minimap.js';
import { showNewGameIntro }                  from '../ui/storyIntro.js';
import { initBossResultScreen }             from '../ui/bossResultScreen.js';
import { initEconomy }                     from '../gameplay/economy.js';
import { createCamp, updateCamps }         from '../gameplay/enemyCamps.js';
import { spawnPhase8GStructures, registerPhase8GPOIs } from '../world/structures.js';
import { initMerchantUI }                  from '../ui/merchantUI.js';
import { initMapRevealCinematic }            from '../ui/mapRevealCinematic.js';
import { initTutorialGuide, getTutorialGuideState } from '../ui/tutorialGuide.js';
import { initCheckpoints, saveCheckpoint, tickCheckpointAuto, getLastCheckpoint, clearCheckpoints } from '../persistence/checkpoints.js';

import { spawnPhase2Interactables }            from '../world/phase2Interactables.js';
import { initWeather, setWeatherForAct }       from '../world/babylonWeather.js';
import { initWorldMutations }                  from '../world/babylonWorldMutations.js';
import { initLandmarks }                       from '../world/babylonLandmarks.js';
import { initFogOfWar, updateFogOfWar, getFogDebugState } from '../world/babylonFogOfWar.js';
import { initPhaseDTriggers, updatePhaseDTriggers } from '../world/phaseDTriggers.js';
import { initPhase4Triggers, updatePhase4Triggers } from '../world/phase4Triggers.js';
import { initPostProcess, applyActPostProcess }     from '../engine/babylon/postProcess.js';
import { initPBR }                                  from '../engine/babylon/pbrSetup.js';
import { initNPCSystem, updateNPCProximity, getNearestNPC, interactWithNPC } from '../gameplay/npcSystem.js';
import { loadWorldNPCs }                            from '../gameplay/npcLoader.js';
import { initDialogueUI }                           from '../ui/dialogueUI.js';
import { initCodex }                                from '../gameplay/codexSystem.js';
import { createWater, updateWater }                 from '../engine/babylon/waterShader.js';
import { initDayNight, updateDayNight }            from '../world/dayNightCycle.js';
import { initFauna, spawnBiomeFauna, updateFauna } from '../world/faunaSystem.js';
import { spawnChestsForRegion, updateChestProximity, tryOpenNearestChest } from '../world/chestSystem.js';
import { initArtifactSystem, ARTIFACT_DEFS, equipArtifact, getMutationState, rollLoot, applyMutationVisuals } from '../gameplay/artifactSystem.js';
import { initElementSystem }                        from '../gameplay/elementSystem.js';
import { initCraftingSystem }                        from '../gameplay/craftingSystem.js';
import { applyLootDrop, emitLootNotifications }      from '../gameplay/lootTables.js';

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
import { initWorldManager, updateWorldManager, getWorldDebug, getAllMapRegions, getMapRevealAreas, getMapTrackedTarget, setMapTrackedTarget, clearMapTrackedTarget } from '../world/WorldManager.js';
import { initObjectiveGuidance, updateObjectiveGuidance, getObjectiveGuidanceDebug } from '../world/objectiveGuidance.js';
import { initWorldStateFSM, transitionTo, updateWorldFSM, getWorldState, getWorldFSMDebug, WORLD_STATE, isSystemActive } from '../world/WorldStateFSM.js';
import { initInstancingSystem } from '../world/InstancingSystem.js';
import { initMonsterDistribution, getMonsterDistributionDebug } from '../world/MonsterDistribution.js';
import { updateRegionRegistry, getCurrentRegion } from '../world/RegionRegistry.js';
import { initPOISystem, spawnAllPOIs } from '../world/POISystem.js';
import { spawnWorldLandmarks } from '../world/WorldLandmarks.js';
import { initDungeonSystem, getActiveDungeon, getDungeonDefs } from '../world/DungeonSystem.js';
import { initFloatingIslands, getFloatingIslandsDebug } from '../world/FloatingIslands.js';

import { Vector3 }                             from '@babylonjs/core';

// ── État global ────────────────────────────────────────────────────────────

const _gameState = {
  player:    { hp: CONFIG.player.maxHp, xp: 0, level: 1, position: { x: 0, y: 2, z: 0 }, faction: null },
  inventory: [],
  quests:    [],
  world:     null,
};
let _worldStateProbeTimer = 0;

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
  const safeY = getTerrainHeight(position.x, position.z) + CONFIG.player.height / 2;
  const safePos = {
    x: position.x,
    y: safeY,
    z: position.z,
  };

  if (body) {
    body.setTranslation(safePos, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
  if (root) {
    root.position.set(safePos.x, safePos.y, safePos.z);
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

  // 1b. FPS guard — auto quality scaling for 60 FPS
  initFpsGuard(engine);

  // 2. Éclairage + PBR
  initLighting(scene);
  initPBR(scene);

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
  const spawnCfg = CONFIG.player.spawn ?? { x: 0, z: 0 };
  const initialPlayerPos = (menuChoice === 'new' || !saved?.player?.position)
    ? { x: spawnCfg.x, z: spawnCfg.z }
    : saved.player.position;

  // 7. Monde
  setLoadingText('Génération du terrain...');
  initTerrain(scene, biome);
  updateTerrainAroundPlayer(initialPlayerPos);
  initSky(scene, biome);
  applyBiomeLighting(biome.name);
  initGrass(scene);
  // Water shader — only create if terrain dips below water level
  createWater(scene);

  // Day/night cycle — drives sun, ambient, sky colors
  initDayNight(getSunLight(), getAmbientLight(), getSkyMat(), scene);

  // Fauna + chests
  initFauna();
  spawnBiomeFauna(scene, biome.name, spawnCfg.x, spawnCfg.z, 8);
  spawnChestsForRegion(scene, spawnCfg.x, spawnCfg.z, 100, 6);

  // 8. Joueur — spawn directement aligné sur le terrain.
  const spawnPos = new Vector3(
    initialPlayerPos.x,
    getTerrainHeight(initialPlayerPos.x, initialPlayerPos.z) + CONFIG.player.height / 2,
    initialPlayerPos.z,
  );
  await initPlayerCharacter(scene, spawnPos);
  _applyPlayerPosition(initialPlayerPos);

  initPlayerHealth();
  setPlayerBody(getPlayerBody());
  setDamageFilter(processIncomingDamage);
  setCurrentHp(saved?.player?.hp ?? CONFIG.player.maxHp);

  initProgression(saved ?? null);
  initFactions(saved?.player?.faction ?? null);

  // 9. Input
  initTraversalInput();
  initCombatInput(canvas, scene);
  initInteraction(scene);

  // 9b. Weapon system + combat juice + Spider-Man
  initWeaponSystem(scene);
  equipWeapon(WEAPON_TYPES.SWORD);
  initWeaponSwitchInput();
  unlockWeapon(WEAPON_TYPES.CLAYMORE);
  unlockWeapon(WEAPON_TYPES.LANCE);
  unlockWeapon(WEAPON_TYPES.BOW);
  unlockWeapon(WEAPON_TYPES.CATALYST);
  initHitStop();
  initDamageNumbers();
  initWeaponTrails(scene);
  initSpiderManCombat(scene, canvas);

  Events.on('combat:hit', ({ damage }) => {
    addWeaponXP(Math.floor(damage / 2));
  });

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
  
  // Enemies now spawn dynamically via MonsterDistribution + chunk streamer
  const enemySource = useFreePacks
    ? () => [...getAllEnemiesFreePacks(), ...getAllEnemies().filter(e => e.isAlive)]
    : getAllEnemies;
  setCombatEnemySource(enemySource);
  initSkills(enemySource);
  initSkillInput();

  // 11. VFX
  initVfx(scene);

  // 11b. Artifact + Element systems
  initArtifactSystem();
  initElementSystem();
  initCraftingSystem();

  // Loot on enemy kill — uses loot tables + artifact roll
  Events.on('enemy:died', ({ type, position, xp }) => {
    const enemyLevel = Math.ceil((xp ?? 40) / 40);
    const { xp: lootXp, items } = applyLootDrop(type, enemyLevel);
    emitLootNotifications(lootXp, items);
  });

  // 12. HUD + Panels + Theme
  applyActTheme(initialAct);
  initHud();
  initBossResultScreen();
  initEconomy();
  initMerchantUI();
  initPanels();
  initMinimap();
  initMapRevealCinematic();
  initTutorialGuide();
  refreshQuest();

  // 12b. NPC system + Dialogue UI + Codex
  initNPCSystem(scene);
  initDialogueUI();
  initCodex();
  setLoadingText('Chargement des NPCs...');
  await loadWorldNPCs(scene);

  // [F] key — talk to nearest NPC
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyF') {
      const npc = getNearestNPC();
      if (npc) {
        e.preventDefault();
        interactWithNPC(npc);
      }
    }
    // [E] fallback — open chest if no interactable
    if (e.code === 'KeyE') {
      const root = getPlayerRoot();
      if (root) tryOpenNearestChest(root.position);
    }
  });

  // 12c. Interactables Phase 2
  spawnPhase2Interactables();

  // 12c-bis. Enemy camps
  {
    const V = Vector3;
    createCamp(new V(40, 0, -80), 'outpost', scene);
    createCamp(new V(-60, 0, -40), 'camp', scene);
    createCamp(new V(90, 0, 20), 'fortress', scene);
    createCamp(new V(-30, 0, 60), 'outpost', scene);
  }

  // 12c-ter. Phase 8G: structures, villages, ruins, watchtowers
  spawnPhase8GStructures(scene);

  // 12c. Phase 3 — Météo, mutations, landmarks, triggers, post-process, mini-boss
  initWeather(scene);
  initWorldMutations(scene);
  initAct1VerticalSlice(scene);
  initLandmarks(scene, biome.name);
  initFogOfWar(scene);

  // AAA World systems — WorldManager + POI + Instancing + State FSM
  initWorldManager(scene);
  initWorldStateFSM();
  initInstancingSystem(scene);
  initPOISystem(scene);
  setLoadingText('Placement des tours et waypoints...');
  spawnAllPOIs(scene);
  registerPhase8GPOIs(scene);
  initQuestMapBridge();
  syncQuestMapTarget({ silent: true });
  setLoadingText('Génération des landmarks...');
  spawnWorldLandmarks(scene);
  initObjectiveGuidance(scene);

  // Dungeon system + Floating islands
  initDungeonSystem(scene);
  initFloatingIslands(scene);

  // Monster distribution — zone/biome-aware spawning via chunk streamer
  initMonsterDistribution(scene);

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
    applyTerrainBiome(biome);
    updateSkyForBiome(scene, biome);
    setWeatherForAct(act);
    if (useFreePacks) {
      initPropsFreePacks(scene, biome.name, true).catch((error) => {
        console.warn('[GUTTER GOD] Free-pack props preload failed for biome', biome?.name, error);
      });
    }
  });

  Events.on('biome:changed', ({ biome: biomeName }) => {
    const nextBiome = BIOMES[biomeName] ?? biome;
    biome = nextBiome;
    applyBiomeLighting(nextBiome.name);
    applyTerrainBiome(nextBiome);
    updateSkyForBiome(scene, nextBiome);
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
        : {
          x: spawnCfg.x,
          y: getTerrainHeight(spawnCfg.x, spawnCfg.z) + CONFIG.player.height / 2,
          z: spawnCfg.z,
        };

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
    if (flow === 'menu' || flow === 'loading' || flow === 'story' || flow === 'dead') return;

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

    if (e.code === 'Escape' && document.pointerLockElement) {
      document.exitPointerLock?.();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape' && isWorldMapOpen()) {
      closeWorldMap();
      return;
    }
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
    if (!isSystemActive('physics')) return;
    stepPhysics(dt);
  });

  registerSystem((dt) => {
    if (getGameFlowState() !== 'playing') return;

    const root = getPlayerRoot();
    if (!root) return;

    _worldStateProbeTimer -= dt;
    if (_worldStateProbeTimer <= 0) {
      _worldStateProbeTimer = 0.4;
      const zone = getZoneAt(root.position.x, root.position.z).zone;
      const fsmState = getWorldState();
      const inSettlement = zone === ZONE.SETTLEMENT_CORE || zone === ZONE.SETTLEMENT_EDGE;
      if (inSettlement && fsmState === WORLD_STATE.EXPLORING) {
        transitionTo(WORLD_STATE.SETTLEMENT, { duration: 0.35 });
      } else if (!inSettlement && fsmState === WORLD_STATE.SETTLEMENT) {
        transitionTo(WORLD_STATE.EXPLORING, { duration: 0.35 });
      }
    }

    // Traversal + sync physique
    updateTerrainAroundPlayer(root.position);
    const traversal = updateTraversal(dt, scene) ?? {};
    const { stamina } = traversal;
    syncPlayerMeshToPhysics();
    updatePlayerAnimation(dt, traversal);

    // Spider-Man acrobatics
    updateWallClimb(dt);
    updateWallRun(dt);
    updateWebSwing(dt);
    updateAerialState(traversal.isGrounded ?? true);

    // Caméra suit le joueur
    updateCamera(root.position, dt);

    // Combat + combat juice
    updateCombat(dt);
    updateSkills(dt);
    updateHitStop(dt);
    updateWeaponTrails(dt);

    // Santé
    updateHealth(dt);

    // Ennemis
    if (isSystemActive('enemies')) {
      if (useFreePacks) updateEnemiesFreePacks(dt);
      updateEnemies(dt);
      updateCamps(dt);
    }

    // Mini-boss
    if (useFreePacks) {
      if (isSystemActive('enemies')) updateMiniBossFreePacks(dt);
    } else {
      if (isSystemActive('enemies')) updateMiniBoss(dt);
    }

    // Boss final
    if (useFreePacks) {
      if (isSystemActive('enemies')) updateBossFinalFreePacks(dt);
    } else {
      if (isSystemActive('enemies')) updateFinalBoss(dt);
    }

    // Triggers Phase 3
    updatePhaseDTriggers(root.position, scene);

    // Triggers Phase 4
    updatePhase4Triggers(root.position, scene);

    // Interactions + NPC proximity
    updateInteraction(root.position);
    updateNPCProximity(root.position);

    // Téléportation
    updateTeleportation(root.position);

    // Brouillard de carte
    updateFogOfWar(root.position);

    // Grass wind + water animation
    if (isSystemActive('grass')) updateGrass(dt, root.position);
    updateWater(dt, root.position.y);

    // Day/night cycle + fauna + chests
    updateDayNight(dt);
    updateFauna(dt, root.position);
    updateChestProximity(root.position);

    // World VFX (ambient particles follow player)
    if (isSystemActive('weather')) updateWorldVfx(root.position);

    // World state FSM — smooth transitions between exploration/settlement/dungeon
    updateWorldFSM(dt);

    // WorldManager — biome transitions + POI proximity
    updateWorldManager(root.position);

    // Region names — display banner when entering new area
    updateRegionRegistry(root.position, dt);

    // Chunk streaming
    if (isSystemActive('chunkStream')) updateChunkStreamer(root.position, biome, scene);

    // Quêtes proximité
    trackProximity(root.position.x, root.position.z);
    updateObjectiveGuidance(root.position, dt);

    // HUD
    const hp = getHp();
    updateHp(hp.current, hp.max);
    if (stamina !== undefined) updateStamina(stamina, CONFIG.stamina.max);
    updateMinimap();
    updateSkillHud();
    updateXpBar();
    updatePlayerStatuses('player');

    // Mutation visuals — emissive glow from equipped artifacts
    applyMutationVisuals(root, scene);

    // FPS guard — auto quality scaling
    updateFpsGuard(dt);

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
  if (menuChoice === 'new' && !getWorldFlag('story.introSeen')) {
    setGameFlowState('story');
    await showNewGameIntro();
    await setWorldFlag('story.introSeen', true);
    await saveGame();
  }
  setGameFlowState('playing');
  transitionTo(WORLD_STATE.EXPLORING, { immediate: true });

  console.log('[GUTTER GOD] Phase 2 — bootstrap OK');
  if (typeof window !== 'undefined') {
    window.__bootstrapDone    = true;
    window.__takeDamage       = (amt) => takeDamage(amt, 'test');
    window.__setIFrames       = (dur) => setIFrames(dur);
    window.__addItem          = (id, qty) => addItem(id, qty);
    window.__useItem          = (id) => useItem(id);
    window.__gainXp           = (amt) => gainXp(amt);
    window.__completeQuest    = (id) => completeQuest(id);
    window.__getQuestObjective = () => getPrimaryQuestObjective();
    window.__syncQuestTarget  = (force = true) => syncQuestMapTarget({ force });
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
    window.__getPlayerAnim    = () => getPlayerAnim();
    window.__getLockedTarget  = () => getLockedTarget();
    window.__getAllEnemies    = () => enemySource();
    window.__getCameraDebug   = () => getCameraDebug();
    window.__getTutorialGuide = () => getTutorialGuideState();
    window.__getPhysicsQueryDebug = () => getPhysicsQueryDebug();
    window.__getTerrainHeight = (x, z) => getTerrainHeight(x, z);
    window.__getTerrainDebug  = () => getTerrainDebug();
    window.__getChunkStreamer = () => getChunkStreamerDebug();
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
    window.__getWorldFSM     = () => getWorldFSMDebug();
    window.__getWorldState   = () => getWorldState();
    window.__getWorldDebug   = () => getWorldDebug();
    window.__getMapRegions   = () => getAllMapRegions();
    window.__getMapReveals   = () => getMapRevealAreas();
    window.__getMapTracked   = () => getMapTrackedTarget();
    window.__trackMapTarget  = (id) => setMapTrackedTarget(id);
    window.__clearMapTarget  = () => clearMapTrackedTarget();
    window.__transitionTo    = (state) => transitionTo(state);
    window.__toggleFreePacks = (enabled) => { CONFIG.features.useFreePacks = enabled; console.log('FreePacks:', enabled); };
    window.__getMonsters    = () => getMonsterDistributionDebug();
    window.__getQuestMapBridge = () => getQuestMapBridgeDebug();
    window.__getObjectiveGuidance = () => getObjectiveGuidanceDebug();
    window.__getRegion      = () => getCurrentRegion();
    window.__getDungeon     = () => getActiveDungeon();
    window.__getDungeonDefs = () => getDungeonDefs();
    window.__enterDungeon   = (id) => Events.emit('dungeon:enter', { dungeonId: id });
    window.__exitDungeon    = () => Events.emit('dungeon:exit');
    window.__getIslands     = () => getFloatingIslandsDebug();
    window.__getFpsGuard    = () => getFpsGuardState();
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
