# Phase 5 Amélioration & Correction Plan

## 1. Implémentation Actuelle ✅

### Assets Intégrés
- ✅ Modèles 3D (Kenney kits, Fantasy Props, etc.)
- ✅ Textures PBR (Normal, Roughness, Metallic maps)
- ✅ Système audio réactif (musique, ambiance, SFX)
- ✅ VFX: particules, shaders, post-processing

### Systèmes de Gameplay
- ✅ Traversal (WASD + stick, stamina, esquive)
- ✅ Combat (lock-on, combos, dodge-parry)
- ✅ Santé/dégâts (HP bar, iframes, poisons)
- ✅ Progression RPG (XP, level, items, quêtes)
- ✅ Factions (alignment, conséquences narratives)
- ✅ Ennemis (scouts, armored, mini-boss, final-boss)

### Nouvelles Features (Phase 5 - Session)
- ✅ Système de téléportation (portails)
- ✅ Fog of War avec révélation progressive
- ✅ Events système pour portails
- ✅ Intégration avec interaction system

---

## 2. Points Critiques Manquants (Skill.md Workflow)

### A. Feedback & Sensation de Jeu 🔴
**Problème**: Le gameplay peut sembler "mou" sans feedback immédiat

**À Implémenter**:
1. **Hit feedback** (visual + audio + screen shake)
   - ✅ SFX existe mais hit screen shake manquant
   - À ajouter: `world/vfx.js` — impulse camera on hit
   
2. **Anticipation/Impact/Recovery** sur animations
   - Vérifier que player attack anim a 3 phases claires
   - Ajouter visual telegraph sur ennemis (2-3 frames avant attaque)
   - Feedback récupération après dodge (invulnerabilité visible)

3. **Télégraphes d'attaque** (ennemi → joueur)
   - À créer: `gameplay/enemyTelegraph.js`
   - Afficher direction/timing attaque (outline rouge, VFX warning)
   - Fenêtres dodge/parry visibles (UI timing indicator)

### B. Lisibilité Gameplay 🔴
**Problème**: Combat peut être confus, exploration vide, états ambigus

**À Implémenter**:
1. **Clarté silhouettes & couleurs**
   - ✅ Ennemis rouges, joueur bleu, mais UI state pas assez clair
   - À ajouter: health bar flottant + faction badge sur tous ennemis
   - Border color: hostile=red, friendly=green, neutral=yellow

2. **Réduction clutter écran**
   - HUD actuellement: stamina, HP, quest, minimap
   - À simplifier: masquer éléments non-critiques en combat
   - Toggle via Settings (accessibility)

3. **États joueur visibles**
   - Locked-target: highlight cible + glow autour
   - In-combat: screen border VFX
   - Stunned/Poisoned: shader effect sur joueur
   - À créer: `gameplay/playerState.js` — status effects visuels

### C. Exploration Non-Engageante 🔴
**Problème**: Monde vaste mais peu de micro-récompenses

**À Implémenter** (15-45s de marche = un POI):
1. **Collectibles dynamiques**
   - Crafting mats: mushrooms, bones, ore
   - À ajouter: `world/collectibles.js`
   - Spawn par biome, visual feedback (glow), SFX ramassage
   
2. **Défis courts/récompenses**
   - Arènes de combat mini (3 vagues → loot)
   - Énigmes simples (4 piédestaux, trouver pattern)
   - À créer: `gameplay/arenas.js` + `gameplay/puzzles.js`

3. **Lore découvrable**
   - ✅ Existe mais seulement au-dessus landmarks
   - À améliorer: Plus de lore bones (tombes, ruines, notes)
   - Chacun avec lore:read event → progression de l'histoire cachée

### D. Performance Dégradation 🟡
**Problème**: Adaptabilité mais manque de visibilité des seuils

**À Améliorer**:
1. **Performance telemetry détaillé**
   - ✅ FPS émis mais draw calls, texture memory pas tracés
   - À ajouter: `core/perfTelemetry.js`
   - Exporter: FPS, frame-time, draw calls, triangle count, texture memory
   
2. **Dégradation progressive contrôlée**
   - ✅ Props density existe, mais shader quality pas adaptatif
   - À ajouter: Shadow quality, LOD tiers, post-process disable threshold
   
3. **Console de debug perf**
   - F1 overlay bon mais manque graph temps réel
   - À créer: graphique FPS + frame-time history

### E. Config & Paramètres 🟡
**Problème**: Constantes magiques disséminées, difficile à régler

**À Centraliser**:
1. **Tous les parametres gameplay dans CONFIG**
   - Combat: damage, stamina costs, dodge window
   - Enemies: spawn rates, AI thresholds
   - Audio: volumes, fade times
   - À faire: Vérifier que `core/config.js` cover ALL magic numbers

2. **Settings UI**
   - À créer: `ui/settingsPanel.js`
   - Slider: volume, difficulty, graphics quality
   - Persistence via localStorage

---

## 3. Plan Implémentation Priorité 1-3

### Priority 1 (Critique — Sensation de Jeu)
⏱ 4-6 heures

1. **Hit Feedback Complet** 
   - Screen shake on player hit, enemy hit, parry
   - SFX pool expansion (additional hit sounds)
   - Visual splash (blood/spark vfx)
   - File: `gameplay/hitFeedback.js`

2. **Enemy Telegraph System**
   - Pre-attack indicator (2 frames warning)
   - Attack trajectory line
   - Dodge window visual timer
   - File: `gameplay/enemyTelegraph.js`

3. **Player Status Visuals**
   - Shader overlay: poison (green), stun (blue), iframes (white flash)
   - Locked-target glow circle
   - File: `gameplay/playerStateVisuals.js`

### Priority 2 (Engagement — Exploration)
⏱ 3-4 heures

1. **Collectibles System**
   - Mushrooms, stones, bones spawn procedurally
   - Loot tables per biome
   - File: `world/collectibles.js`

2. **Mini-Arena Triggers**
   - Teleport arena on proximity (e.g., stone circle)
   - 3-wave enemy spawn, defeat = loot
   - File: `gameplay/arenas.js`

3. **Lore Bones**
   - Spawner lore items in ruins/graves
   - Custom labels per zone
   - File: `world/loreCollectibles.js`

### Priority 3 (Robustness — Performance & Config)
⏱ 2-3 heures

1. **Performance Telemetry Dashboard**
   - Track: draw calls, triangle count, texture memory
   - Real-time graph
   - File: `core/perfTelemetry.js`

2. **Settings UI Panel**
   - Volume, difficulty, graphics preset
   - Persist localStorage
   - File: `ui/settingsPanel.js`

3. **CONFIG Audit**
   - Review all numeric constants
   - Move to CONFIG object
   - Document defaults

---

## 4. Corrections Requises 🐛

### Bug: Portails peuvent être utilisés plusieurs fois
**État**: registerPortal() ajoute au _interactables sans vérification unicité
**Fix**: Implémenter portal state dans teleportation.js, flag used:true

### Bug: FOW mesh pas désactivée efficacement
**État**: _fogMesh opacity change sans culling
**Fix**: Ajouter LOD ou displacement texture pour fog reveal

### Issue: Audio peut jouer en headless
**État**: registerPortal() sans try-catch
**Fix**: ✅ Déjà fait dans audio.js mais à vérifier partout

### Issue: Portail spawn position terrain pas syncé
**État**: Portail peut flotter si getTerrainHeight() appelle avant terrain init
**Fix**: Vérifier que initTerrain() avant initTeleportation() dans bootstrap

---

## 5. Métriques de Qualité (Definition of Done)

### ✅ À Vérifier
- [ ] Toutes features jouables E2E sans crash
- [ ] Build clean (npm run build → EXIT_CODE 0)
- [ ] Tests régression passent (8/8 phase tests)
- [ ] 60 FPS stable sur i7-1255U (ou 45+ avec fallback clair)
- [ ] Aucun console error sur 30 min session gameplay
- [ ] Paramètres clés exposés dans window.__* pour test
- [ ] Feedback audio/visual sur 95%+ interactions
- [ ] Map révélation smooth (pas popping zones)
- [ ] Portails sont re-utilisables ou one-shot (décidé)
- [ ] Fog of War peut être désactivé pour test

### 🎯 Success Criteria
- Joueur sent l'impact de ses actions (hit, dodge, parry)
- Exploration gratifiante (collectible tous les 20-30s)
- Performance adaptive et stable
- Jeu jouable 1h sans bugs critiques

---

## 6. Fichiers à Créer (Summary)

1. `gameplay/hitFeedback.js` — Screen shake, vfx splash
2. `gameplay/enemyTelegraph.js` — Attack warning
3. `gameplay/playerStateVisuals.js` — Status effect shaders
4. `world/collectibles.js` — Mushrooms, bones, ore
5. `gameplay/arenas.js` — Mini-arena triggers
6. `world/loreCollectibles.js` — Lore items in world
7. `core/perfTelemetry.js` — Performance dashboard
8. `ui/settingsPanel.js` — Settings UI

---

## 7. Fichiers à Modifier (Summary)

1. ✅ `core/bootstrapBabylon.js` — init teleport, fog (DONE)
2. ✅ `gameplay/babylonInteraction.js` — portal interaction (DONE)
3. ✅ `gameplay/babylonTeleportation.js` — portal system (DONE)
4. ✅ `world/babylonFogOfWar.js` — fog system (DONE)
5. `core/config.js` — audit & centralize constants
6. `gameplay/babylonEnemies.js` — telegraph hooks
7. `gameplay/babylonPlayerHealth.js` — status effect integration
8. `world/babylonTerrain.js` — ensure height sync

---

## 8. Prochaines Étapes (Après Validation Build)

1. **Session 2**: Priority 1 (Hit Feedback + Telegraph)
   - Ajouter screen shake + VFX feedback
   - Implémer enemy telegraph warning
   - Valider sensation de combat

2. **Session 3**: Priority 2 (Exploration Engagement)
   - Collectibles system
   - Mini-arena challenges
   - Lore bones placements

3. **Session 4**: Priority 3 + Polish
   - Performance telemetry
   - Settings UI
   - Final balance pass

---

## 9. Notes Technique

- **Event System**: Utiliser Events.on/emit pour toutes les interactions (déjà fait)
- **Shader Effects**: Babylon PostProcess pour status effects (efficient)
- **Performance**: Garder draw calls < 200, textures < 256MB
- **Audio**: Lazy-load, pool SFX pour effects multiples
- **Config**: Centraliser TOUS les nombres (pas de magic numbers en inline)

