# GUTTER GOD — Plan Directeur
**Version : 2.0 — Révisé après audit complet assets + contraintes hardware**
**Hardware cible : Intel i7-1255U (1.70 GHz) / 16 Go RAM / 64-bit**

---

## 1. Vision et contrat de production

- Cible produit : action-RPG 3D stylisé, nerveux, lisible, web-only, usage local non publié
- Cible machine : Intel i7-1255U / Iris Xe intégrée, 16 Go RAM, 1080p
- Objectif performance : 60 FPS stables, 45 FPS minimum acceptable
- Moteur runtime : **Babylon.js** pour tout le gameplay/rendu production
- Three.js : **lab/ uniquement** — expérimentations shaders, jamais en production
- Physique : Rapier via bridge Babylon
- Priorité absolue : sensation de jeu + stabilité avant inflation de contenu

---

## 2. Stack technique (verrouillée)

| Rôle | Outil |
|---|---|
| Rendu 3D runtime | `@babylonjs/core` + `@babylonjs/loaders` |
| Physique | `@dimforge/rapier3d-compat` |
| Terrain procédural | `simplex-noise` |
| Persistance locale | `dexie` (IndexedDB) |
| Build / dev server | `vite` (es2022, manualChunks vendors) |
| UI HUD | HTML/CSS natif |
| Format assets | glTF 2.0 / GLB |
| Three.js | **lab/ uniquement** — jamais importé hors `/lab/` |

**Règle absolue :** `import * as THREE` est interdit hors de `/lab/`.
Babylon.js et Three.js ne partagent jamais un canvas, renderer ou scene graph.

---

## 3. Budget frame cible (60 FPS = 16.6 ms) — i7-1255U

| Système | Budget |
|---|---|
| Rendu Babylon | 7–9 ms |
| Physique Rapier | 2–3 ms |
| Gameplay + IA | 2–3 ms |
| Streaming chunks | 1–2 ms |
| Marge de sécurité | 1–2 ms |

**Règles hardware spécifiques i7-1255U / Iris Xe :**
- GPU intégré : pas de shadow map > 512, pas de MSAA > 2x
- Limiter les draw calls à < 200 par frame en gameplay normal
- Pas de post-process cumulatif > 2 passes actives simultanément
- Instancing obligatoire pour tout prop répété > 3 fois dans un chunk
- Texture budget total chargé en mémoire : < 256 Mo
- Pas de WebGL2 compute shaders (non supporté Iris Xe stable)

---

## 4. Architecture modulaire

```
GUTTER GOD 2/
  index.html                    ← importe uniquement bootstrapBabylon.js
  core/
    bootstrapBabylon.js         ← bootstrap principal (Babylon.js)
    config.js                   ← toutes les constantes tunables
    events.js                   ← bus d'événements global
    loop.js                     ← createGameLoop (à brancher dans bootstrap)
    perf.js                     ← overlay perf runtime
  engine/
    babylon/
      runtime.js                ← engine Babylon + render loop
      camera.js                 ← caméra third-person
      lighting.js               ← lumières + ombres (shadow map 512)
      physics.js                ← bridge Rapier
      postProcess.js            ← color grading par acte (max 2 passes)
      toonMaterial.js           ← toon-PBR hybride
  world/
    babylonChunkStreamer.js     ← streaming chunks autour du joueur
    babylonTerrain.js           ← terrain procédural simplex-noise
    babylonProps.js             ← props instanciés (instancing obligatoire)
    babylonLandmarks.js         ← POI et landmarks
    babylonSky.js               ← sky dome + HDRI
    babylonGrass.js             ← herbe vertex shader (densité adaptative)
    babylonWeather.js           ← météo par acte
    babylonWorldMutations.js    ← mutations monde cumulatives par acte
    biomes.js                   ← définitions des 5 biomes
    phase1Triggers.js           ← triggers Act 1 / grassland
    phase2Interactables.js      ← objets interactables Phase 2
    phaseDTriggers.js           ← triggers Actes 2 & 3
  gameplay/
    babylonTraversal.js         ← mouvement, stamina, saut, glide
    babylonCombat.js            ← lock-on, combo 3 coups, dodge, bullet-time
    babylonEnemies.js           ← 4 types (scout/armored/elite/mutant)
    babylonPlayerCharacter.js   ← mesh joueur + animations (UAL1 + UAL2)
    babylonPlayerHealth.js      ← HP, dégâts, mort, respawn
    babylonFactions.js          ← 2 factions, alignement persisté
    babylonInteraction.js       ← interactables (pickup, faction, lore)
    babylonProximityTriggers.js ← système de triggers de proximité
    babylonMiniBoss.js          ← mini-boss par acte (3 phases)
    babylonVfx.js               ← hit flash, loot pop, dodge trail, death
    rpgProgression.js           ← XP, level, quêtes, inventaire
    storyData.js                ← toutes les quêtes + items (5 actes)
    animationState.js           ← machine à états animations
    data.js                     ← loot tables, QUEST_DEFS
  ui/
    hud.js                      ← HUD complet (HP, stamina, quête, minimap, FPS)
    hud.css                     ← design system Dark-Anime
    panels.js                   ← inventaire (I), journal (J), carte (M), settings (P)
    minimap.js                  ← minimap canvas
    notifications.js            ← notifications flottantes
    theme.js                    ← tokens CSS par acte
  persistence/
    gameDatabase.js             ← API Dexie (IndexedDB)
    worldStateManager.js        ← acte courant + flags monde
    save.js                     ← save/load complet
    settings.js                 ← paramètres utilisateur
  assets/
    loaders.js                  ← chargeurs glTF/textures (lazy loading)
    manifests.js                ← manifeste assets runtime
  lab/                          ← Three.js UNIQUEMENT
    shaders/
    biomes/
    fx/
```

### Règles de séparation (non négociables)
- `core/` : pas de logique métier combat/quête
- `gameplay/` : publie des états, pas des détails de rendu
- `world/` : fournit contexte et services monde
- `ui/` : lit l'état et déclenche des intents, sans logique métier lourde

---

## 5. Phases de développement

| Phase | Nom | Statut |
|---|---|---|
| Phase 0 | Fondation stable | ✅ Documentée — à implémenter |
| Phase 1 | Vertical slice jouable | 🔲 À implémenter |
| Phase 2 | Systèmes core approfondis | 🔲 À implémenter |
| Phase 3 | Monde évolutif et Actes 2–3 | 🔲 À implémenter |
| Phase 4 | Actes 4–5 et fin de jeu | 🔲 À implémenter |
| Phase 5 | Polish et optimisation finale | 🔲 À implémenter |

---

## 6. Détail des phases

### Phase 0 — Fondation stable

**Objectif :** base buildable, moteur unique, architecture posée.

**À implémenter :**
- `index.html` + `core/bootstrapBabylon.js` minimal
- `engine/babylon/runtime.js` : engine Babylon, canvas, render loop
- `engine/babylon/lighting.js` : lumière directionnelle + shadow map 512
- `engine/babylon/camera.js` : caméra third-person basique
- `engine/babylon/physics.js` : init Rapier, gravity
- `core/config.js` : toutes les constantes (vitesses, HP, stamina, etc.)
- `core/events.js` : bus d'événements global (emit/on/off)
- `core/loop.js` : createGameLoop branché dans bootstrap
- `core/perf.js` : overlay FPS/ms visible en dev
- `persistence/gameDatabase.js` : init Dexie, tables quêtes/inventaire/world
- `persistence/worldStateManager.js` : acte courant, flags monde
- `persistence/save.js` : autosave 60s + save sur beforeunload

**Sortie mesurable :** `npm run dev` démarre, canvas noir avec overlay FPS, pas d'erreur console.

---

### Phase 1 — Vertical slice jouable

**Objectif :** boucle de jeu complète sur le biome grassland.

**Assets utilisés :**
- Joueur : `UAL2_Standard.glb` (combat) + `UAL1_Standard.glb` (locomotion)
- Terrain : `Grass005_2K-JPG` (Color, NormalGL, Roughness, AO)
- Props : `CommonTree_1/3.gltf`, `Bush_Common.gltf`, `Rock_Medium_1/2.gltf`, `Mushroom_Common.gltf`, `Fern_1.gltf`
- HDRI : `overcast_soil_puresky_2k.hdr`
- Ennemis : `Goblin_Male.gltf` (scout), `Knight_Male.gltf` (armored)
- SFX : Kenney Impact Sounds + RPG Audio + Interface Sounds
- Musique : `act1_exploration.mp3`
- Ambiance : `forest.mp3`

**À implémenter :**
- `world/babylonTerrain.js` : terrain simplex-noise, texture grassland
- `world/babylonChunkStreamer.js` : 3x3 chunks autour joueur, unload à distance > 2 chunks
- `world/babylonProps.js` : instancing props grassland (arbres, rochers, buissons)
- `world/babylonSky.js` : sky dome + HDRI overcast
- `world/babylonGrass.js` : herbe vertex shader, densité max 500 instances/chunk
- `world/biomes.js` : définitions 5 biomes (grassland, ashlands, ironrain, rootblight, schism)
- `world/phase1Triggers.js` : triggers de proximité grassland
- `gameplay/babylonPlayerCharacter.js` : chargement UAL1+UAL2, mesh joueur
- `gameplay/animationState.js` : états idle/run/sprint/jump/fall/attack/dodge
- `gameplay/babylonTraversal.js` : WASD/ZQSD, sprint, saut, glide
- `gameplay/babylonCombat.js` : lock-on Tab, combo 3 coups, dodge K, bullet-time
- `gameplay/babylonEnemies.js` : scout + armored, patrol + chase, telegraph
- `gameplay/babylonPlayerHealth.js` : HP, dégâts, mort, respawn
- `gameplay/babylonVfx.js` : hit flash, loot pop, dodge trail, death dissolve
- `gameplay/rpgProgression.js` : XP, level, quêtes Act 1
- `gameplay/storyData.js` : quêtes act1 + grassland
- `gameplay/data.js` : loot tables
- `ui/hud.js` + `ui/hud.css` : HP, stamina, quête active, minimap, FPS, lock-on reticule
- `ui/minimap.js` : canvas minimap
- `ui/notifications.js` : notifications flottantes
- `assets/loaders.js` : chargement lazy glTF + textures
- `assets/manifests.js` : manifeste assets Phase 1

**Sortie mesurable :** joueur se déplace, combat 2 types d'ennemis, quête Act 1 complétable, 60 FPS en grassland.

---

### Phase 2 — Systèmes core approfondis

**Objectif :** factions, interactions, inventaire utilisable, save/load robuste.

**Assets supplémentaires :**
- Ennemis : `Zombie_Male.gltf` (mutant)
- Icônes inventaire : Crystal1–5, Mineral, Armor_Metal, Potion1_Filled_Red, etc.
- SFX : Kenney Interface Sounds (ui_open, ui_close, confirm, select)

**À implémenter :**
- `gameplay/babylonFactions.js` : Gardiens du Sceau / Héritiers de la Rupture
- `gameplay/babylonInteraction.js` : pickups, marqueurs faction, lore
- `world/phase2Interactables.js` : objets interactables Phase 2
- `ui/panels.js` : inventaire (I), journal (J), carte (M), settings (P)
- `ui/theme.js` : tokens CSS par acte (`--act-accent`, etc.)
- Quêtes Phase 2 : `mutant-hunter`, `faction-contact`

**Sortie mesurable :** inventaire fonctionnel, factions persistées, save/load complet sans perte.

---

### Phase 3 — Monde évolutif et Actes 2–3

**Objectif :** transitions d'actes visibles, météo, mutations monde, mini-boss.

**Assets supplémentaires :**
- Terrain ashlands : `Ground103_2K-JPG`
- Terrain ironrain : `Rock064_2K-PNG`
- Props ashlands : `DeadTree_1/3.gltf`, `TwistedTree_1.gltf`, `Rock_Medium_3.gltf`
- Props ironrain : `DeadTree_2.gltf`, `TwistedTree_2.gltf`
- Props rootblight : `TwistedTree_3/5.gltf`, `DeadTree_4.gltf`, `Mushroom_Laetiporus.gltf`
- Castle Kit GLB : `rocks-large.glb`, `tower-square-base.glb`, `wall-narrow.glb`
- Mini-boss : `Orc.gltf` (Act 1), `Yeti.gltf` (Act 2), `Demon.gltf` (Act 3) — Ultimate Monsters
- HDRI nuit : `moonlit_golf_2k.hdr`
- Musique : `combat_general.mp3`, `boss_battle.mp3`

**À implémenter :**
- `world/babylonWeather.js` : cendres/pluie/brouillard/spores/fracture par acte
- `world/babylonWorldMutations.js` : mutations cumulatives par acte
- `world/babylonLandmarks.js` : POI et landmarks par biome
- `world/phaseDTriggers.js` : triggers Actes 2 & 3
- `engine/babylon/postProcess.js` : color grading par acte (max 2 passes)
- `gameplay/babylonMiniBoss.js` : mini-boss 3 phases par acte
- Quêtes Act 2 : `act2-tower`, `act2-armored`, `act2-flooded`
- Quêtes Act 3 : `act3-sanctuary`, `act3-mutants`, `act3-roots`

**Correction obligatoire :** `ACT_BIOME_MAP` dans `biomes.js` :
```js
// CORRECT
const ACT_BIOME_MAP = { 1: 'grassland', 2: 'ironrain', 3: 'rootblight', 4: 'schism', 5: 'schism' };
```

**Sortie mesurable :** transitions d'actes visibles, mini-boss battable, 60 FPS maintenus.

---

### Phase 4 — Actes 4–5 et fin de jeu

**Objectif :** choix de faction avec conséquences monde, quêtes finales, boss final.

**Assets supplémentaires :**
- PNJ marchands : `Knight_Golden_Male.gltf`, `Wizard.gltf`, `OldClassy_Male.gltf`
- Élites territoriaux : réutiliser meshes existants (scaling + tint couleur)
- Boss final : `Dragon.gltf` (Flying/glTF) — Ultimate Monsters
- Landmarks village : Medieval Village MegaKit glTF (Wall, Door, Roof modulaires)
- Terrain schism : `Rock064_2K-PNG` (intensifié, tint rouge via shader)

**À implémenter :**
- Quêtes Act 4 : `act4-faction`, `act4-revelation`, `act4-commerce`
- Conséquences faction : `worldStateManager.setFlag('route.north.blocked')` / `route.south.blocked`
- 3 élites territoriaux : type `elite_territorial` dans `babylonEnemies.js`
- Boss final dans `babylonMiniBoss.js` : 3 phases, Dragon.gltf, ≤ 3 ms budget
- Écran de fin différent selon faction (sceller / libérer)
- Quêtes Act 5 : `act5-elites`, `act5-assault`

**Contrainte perf boss :** boss final ≤ 3 ms dans le budget frame. Pas de nouveaux shaders non budgétés.

**Sortie mesurable :** choix faction → conséquence monde visible. Boss final battable. Écran de fin affiché.

---

### Phase 5 — Polish et optimisation finale

**Objectif :** qualité perçue finale, performance consolidée, build candidate stable.

**Nettoyage technique (en premier) :**
- Supprimer `docs/ULTIMATE_RPG_EXECUTION_PLAN.md` (obsolète, fusionné ici)
- Supprimer `assets/external/microsoft/fast-main/` (inutile pour le jeu)
- Vérifier que `assets/models/*.obj` sont remplacés par les GLB définitifs
- Confirmer shadow map à 512 dans `config.js`
- Brancher `core/loop.js` dans `bootstrapBabylon.js` si pas encore fait

**Audio réactif :**
- SFX combat : frappe, esquive, hit ennemi (Kenney Impact + RPG Audio)
- Ambiance biome : boucle audio par biome (forest.mp3 / dungeon.mp3)
- Musique : 1 track par acte (act1_exploration, combat_general, boss_battle, victory)
- Chargement lazy après premier input utilisateur (évite blocage démarrage)

**Optimisation profonde (ordre d'exécution) :**
1. Vérifier instancing props répétitifs dans `babylonProps.js`
2. Confirmer shadow map 512 + pas de MSAA > 2x
3. Profiler avec overlay perf : identifier systèmes > 3 ms
4. LOD ennemis hors zone Near si count > 10
5. Densité herbe adaptative selon FPS mesuré (réduire si < 50 FPS)

**Pass visuel final :**
- Post-process par acte : profil distinct pour chaque acte
- Toon materials : vérifier `updateAllToonMaterials` appelé dans la loop
- Fog par biome : cohérence avec valeurs dans `biomes.js`

**Checklist de sortie Phase 5 :**
- [ ] `ACT_BIOME_MAP` corrigé et cohérent
- [ ] `core/loop.js` branché dans le bootstrap
- [ ] Animations sans pop sur idle/run/attack/dodge
- [ ] SFX combat présents sur frappe, esquive, mort ennemi
- [ ] Ambiance audio active sur au moins 3 biomes
- [ ] 60 FPS maintenus dans toutes les zones testées
- [ ] Aucune erreur console en session de 30 minutes
- [ ] `npm run build` propre, assets copiés correctement
- [ ] Draw calls < 200 en gameplay normal

---

## 7. Systèmes gameplay — référence technique

### 7.1 Combat (`babylonCombat.js`)

| Paramètre | Valeur |
|---|---|
| Combo steps | 3 (18/24/32 dmg) |
| Lock-on range | 16 u |
| Lock break | 20 u |
| Dodge cost stamina | 16 |
| I-frames durée | 0.22 s |
| Bullet-time scale | 0.32 |
| Fatigue durée | 1.8 s |

### 7.2 Traversal (`babylonTraversal.js`)

| Paramètre | Valeur |
|---|---|
| Walk speed | 4.2 u/s |
| Sprint speed | 7.3 u/s |
| Jump speed | 8.7 u/s |
| Glide fall speed | -2.25 u/s |
| Stamina max | 100 |
| Stamina drain sprint | 20/s |
| Stamina regen | 14/s |

### 7.3 Ennemis (`babylonEnemies.js`)

| Type | HP | Vitesse | XP | Détection | Mesh |
|---|---|---|---|---|---|
| scout | 80 | 3.2 | 40 | 18 u | Goblin_Male.gltf |
| armored | 180 | 1.8 | 80 | 14 u | Knight_Male.gltf |
| elite | 320 | 2.4 | 150 | 22 u | Knight_Golden_Male.gltf |
| mutant | 140 | 2.6 | 70 | 16 u | Zombie_Male.gltf |
| elite_territorial | 500 | 2.8 | 250 | 24 u | mesh existant + scale 1.3 |

### 7.4 Mini-boss (`babylonMiniBoss.js`)

| Acte | Nom | HP | Mesh | Phases |
|---|---|---|---|---|
| 1 | Gardien des Cendres | 600 | Orc.gltf (Big) | 100% / 60% / 30% |
| 2 | Colosse de Fer | 1000 | Yeti.gltf (Big) | 100% / 55% / 25% |
| 3 | Gardien Corrompu | 900 | Demon.gltf (Big) | 100% / 60% / 25% |
| 5 | Gutter God (boss final) | 3000 | Dragon.gltf (Flying) | 100% / 60% / 30% |

---

## 8. Trame narrative — 5 actes

| Acte | Nom | Biome | Mini-boss | Déclencheur |
|---|---|---|---|---|
| I | Les Cendres Calmes | grassland | Gardien des Cendres | Archive souterraine de Vael'Dorn |
| II | La Pluie de Fer | ironrain | Colosse de Fer | Réactivation tour majeure |
| III | Les Racines Profanées | rootblight | Gardien Corrompu | Purge sanctuaire corrompu |
| IV | Le Schisme des Veilleurs | schism | — | Choix de faction + révélation |
| V | La Nuit du Gutter God | schism (intensifié) | Gutter God | Convergence 5 reliques |

---

## 9. Direction artistique

**Piliers :**
- Lisibilité stylisée : formes nettes, valeurs lisibles, silhouettes claires
- Ambiance sombre : brume, contraste, lumières directionnelles dramatiques
- Monde vivant : vent, particules météo, mutations cumulatives

**Shaders actifs (budget Iris Xe) :**
- Toon-PBR hybride (`toonMaterial.js`) — 1 shader variant par biome max
- Post-process custom par acte : max 2 passes simultanées (saturation + vignette)
- Height fog dynamique par biome
- Wind vertex deformation herbe (vertex shader léger, pas de geometry shader)

**Règle absolue :** jamais sacrifier la lisibilité des timings de combat pour l'effet visuel.

---

## 10. Risques et mitigation

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Iris Xe saturée par les ombres | Haute | Haute | Shadow map 512 fixe, pas de PCF > 1 sample |
| Draw calls > 200 en zone dense | Haute | Haute | Instancing obligatoire, culling agressif |
| Boss final > 3 ms | Moyenne | Haute | Budget strict, pas de nouveaux shaders |
| Audio bloque le chargement | Faible | Moyen | Lazy load après premier input |
| Scope creep Acte 5 | Haute | Haute | Acte 5 = boss + 3 élites + 2 quêtes. Rien de plus. |
| ACT_BIOME_MAP incohérent | Certaine | Moyen | Corriger dès Phase 3 |
| Mémoire texture > 256 Mo | Moyenne | Haute | Audit manifests.js avant Phase 3 |

---

## 11. Gouvernance exécution

- Une priorité majeure active à la fois
- Chaque incrément : objectif → implémentation → playtest → tuning → validation perf
- Toute feature livrée avec mesure avant/après (FPS + draw calls)
- Toute dette acceptée avec ticket + échéance
- Aucune feature AAA non budgétée en perf

---

## 12. Actions immédiates (avant Phase 0)

Dans cet ordre :

1. Créer `index.html` + `core/bootstrapBabylon.js` minimal
2. Créer `core/config.js` avec toutes les constantes
3. Créer `core/events.js` bus d'événements
4. Créer `engine/babylon/runtime.js` + `lighting.js` + `camera.js` + `physics.js`
5. Créer `persistence/gameDatabase.js` + `worldStateManager.js` + `save.js`
6. Valider : `npm run dev` démarre, canvas visible, overlay FPS actif
