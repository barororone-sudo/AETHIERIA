# 🔧 Changements Exacts à Implémenter

**Format**: Avant → Après avec contexte  
**Priorité**: Ordre d'exécution  
**Risque**: Fallback sur chaque changement

---

## CHANGEMENT 1: Props Paths (Très Important)

**Fichier**: `world/babylonPropsFreePacks.js`  
**Lignes**: 10-40 (définition BIOME_PROPS_FREE_PACKS)

### Section GRASSLAND

**AVANT** (ligne ~14):
```javascript
  grassland: [
    { type: 'CommonTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/CommonTree_1.gltf', scale: 1.0 },
    { type: 'CommonTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/CommonTree_2.gltf', scale: 1.0 },
    { type: 'Bush_Common', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Bushes/Bush_Common.gltf', scale: 1.0 },
    { type: 'Rock_Medium_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rocks/Rock_Medium_1.gltf', scale: 1.0 },
    { type: 'Mushroom_Common', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Mushrooms/Mushroom_Common.gltf', scale: 0.8 },
  ],
```

**APRÈS**:
```javascript
  grassland: [
    { type: 'CommonTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf', scale: 1.0 },
    { type: 'CommonTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/CommonTree_2.gltf', scale: 1.0 },
    { type: 'Bush_Common', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Bush_Common.gltf', scale: 1.0 },
    { type: 'Rock_Medium_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rock_Medium_1.gltf', scale: 1.0 },
    { type: 'Mushroom_Common', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Mushroom_Common.gltf', scale: 0.8 },
  ],
```

**Changements**: 
- `/Trees/` → supprimé
- `/Bushes/` → supprimé
- `/Rocks/` → supprimé
- `/Mushrooms/` → supprimé

### Section ASHLANDS

**AVANT** (ligne ~20):
```javascript
  ashlands: [
    { type: 'DeadTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/DeadTree_1.gltf', scale: 1.0 },
    { type: 'DeadTree_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/DeadTree_3.gltf', scale: 1.0 },
    { type: 'TwistedTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/TwistedTree_1.gltf', scale: 1.0 },
    { type: 'Rock_Medium_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rocks/Rock_Medium_3.gltf', scale: 1.2 },
  ],
```

**APRÈS**:
```javascript
  ashlands: [
    { type: 'DeadTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/DeadTree_1.gltf', scale: 1.0 },
    { type: 'DeadTree_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/DeadTree_3.gltf', scale: 1.0 },
    { type: 'TwistedTree_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_1.gltf', scale: 1.0 },
    { type: 'Rock_Medium_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rock_Medium_3.gltf', scale: 1.2 },
  ],
```

### Section IRONRAIN

**AVANT** (ligne ~25):
```javascript
  ironrain: [
    { type: 'DeadTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/DeadTree_2.gltf', scale: 1.0 },
    { type: 'TwistedTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/TwistedTree_2.gltf', scale: 1.0 },
    { type: 'Rock_Medium_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rocks/Rock_Medium_1.gltf', scale: 1.5 },
  ],
```

**APRÈS**:
```javascript
  ironrain: [
    { type: 'DeadTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/DeadTree_2.gltf', scale: 1.0 },
    { type: 'TwistedTree_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_2.gltf', scale: 1.0 },
    { type: 'Rock_Medium_1', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rock_Medium_1.gltf', scale: 1.5 },
  ],
```

### Section ROOTBLIGHT

**AVANT** (ligne ~30):
```javascript
  rootblight: [
    { type: 'TwistedTree_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/TwistedTree_3.gltf', scale: 1.0 },
    { type: 'DeadTree_4', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/DeadTree_4.gltf', scale: 0.9 },
    { type: 'Mushroom_Laetiporus', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Mushrooms/Mushroom_Laetiporus.gltf', scale: 1.1 },
    { type: 'Rock_Medium_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rocks/Rock_Medium_2.gltf', scale: 1.0 },
  ],
```

**APRÈS**:
```javascript
  rootblight: [
    { type: 'TwistedTree_3', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_3.gltf', scale: 1.0 },
    { type: 'DeadTree_4', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/DeadTree_4.gltf', scale: 0.9 },
    { type: 'Mushroom_Laetiporus', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Mushroom_Laetiporus.gltf', scale: 1.1 },
    { type: 'Rock_Medium_2', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Rock_Medium_2.gltf', scale: 1.0 },
  ],
```

### Section SCHISM

**AVANT** (ligne ~35):
```javascript
  schism: [
    { type: 'DeadTree_5', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/DeadTree_5.gltf', scale: 1.0 },
    { type: 'TwistedTree_4', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/TwistedTree_4.gltf', scale: 1.0 },
  ],
```

**APRÈS**:
```javascript
  schism: [
    { type: 'DeadTree_5', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/DeadTree_5.gltf', scale: 1.0 },
    { type: 'TwistedTree_4', model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_4.gltf', scale: 1.0 },
  ],
```

---

## CHANGEMENT 2: Chunk Streamer Toggle

**Fichier**: `world/babylonChunkStreamer.js`  
**Ligne**: ~3 (imports) + ~70 (spawnChunkProps call)

### Ajouter Import (ligne ~3)

**AVANT**:
```javascript
import { CONFIG }                              from '../core/config.js';
import { spawnChunkProps, despawnChunkProps }  from './babylonProps.js';
import { Events }                              from '../core/events.js';
```

**APRÈS**:
```javascript
import { CONFIG }                              from '../core/config.js';
import { spawnChunkProps, despawnChunkProps }  from './babylonProps.js';
import { spawnChunkPropsFreePacks, despawnChunkPropsFreePacks } from './babylonPropsFreePacks.js';
import { Events }                              from '../core/events.js';
```

### Modifier Spawn Call (ligne ~70)

**AVANT**:
```javascript
  // Spawner 1 chunk par frame (évite les spikes)
  if (_pending.length > 0) {
    const k = _pending.shift();
    const { cx, cz } = _fromKey(k);
    _loaded.add(k);
    spawnChunkProps(cx, cz, biome, scene, _density.scale);
  }
```

**APRÈS**:
```javascript
  // Spawner 1 chunk par frame (évite les spikes)
  if (_pending.length > 0) {
    const k = _pending.shift();
    const { cx, cz } = _fromKey(k);
    _loaded.add(k);
    
    if (CONFIG.features.useFreePacks) {
      spawnChunkPropsFreePacks(cx, cz, biome, scene, _density.scale);
    } else {
      spawnChunkProps(cx, cz, biome, scene, _density.scale);
    }
  }
```

### Modifier Despawn Call (ligne ~85)

**AVANT**:
```javascript
  // Décharger les chunks trop loin
  for (const k of [..._loaded]) {
    const { cx, cz } = _fromKey(k);
    if (Math.abs(cx - pcx) > RU || Math.abs(cz - pcz) > RU) {
      despawnChunkProps(cx, cz);
      _loaded.delete(k);
    }
  }
```

**APRÈS**:
```javascript
  // Décharger les chunks trop loin
  for (const k of [..._loaded]) {
    const { cx, cz } = _fromKey(k);
    if (Math.abs(cx - pcx) > RU || Math.abs(cz - pcz) > RU) {
      if (CONFIG.features.useFreePacks) {
        despawnChunkPropsFreePacks(cx, cz);
      } else {
        despawnChunkProps(cx, cz);
      }
      _loaded.delete(k);
    }
  }
```

---

## CHANGEMENT 3: Bootstrap Ennemis

**Fichier**: `core/bootstrapBabylon.js`  
**Lignes**: ~130-160 (section ennemis)

### AVANT (section ennemis):
```javascript
  // 10. Ennemis de test (grassland)
  const useFreePacks = CONFIG.features.useFreePacks; // Config pour basculer
  
  // Initialiser les systèmes free-packs en arrière-plan (async)
  if (useFreePacks) {
    initEnemiesFreePacks(scene, true);
    initPropsFreePacks(scene, 'grassland', true);
    initMiniBossFreePacks(scene, true);
  }
  
  const enemySpawns = [
    { type: 'scout',   x:  12, z:  8  },
    { type: 'scout',   x: -10, z:  15 },
    { type: 'scout',   x:  20, z: -5  },
    { type: 'armored', x:  5,  z: -18 },
    { type: 'armored', x: -15, z: -10 },
  ];
  for (const s of enemySpawns) {
    const pos = new Vector3(s.x, getTerrainHeight(s.x, s.z) + 2, s.z);
    spawnEnemy(s.type, pos, scene);
  }
  setCombatEnemySource(getAllEnemies);
```

### APRÈS:
```javascript
  // 10. Ennemis de test (grassland)
  const useFreePacks = CONFIG.features.useFreePacks; // Config pour basculer
  
  // Initialiser les systèmes free-packs en arrière-plan (async)
  if (useFreePacks) {
    await initEnemiesFreePacks(scene, true);
    await initPropsFreePacks(scene, 'grassland', true);
    await initMiniBossFreePacks(scene, true);
  }
  
  const enemySpawns = [
    { type: 'scout',   x:  12, z:  8  },
    { type: 'scout',   x: -10, z:  15 },
    { type: 'scout',   x:  20, z: -5  },
    { type: 'armored', x:  5,  z: -18 },
    { type: 'armored', x: -15, z: -10 },
  ];
  for (const s of enemySpawns) {
    const pos = new Vector3(s.x, getTerrainHeight(s.x, s.z) + 2, s.z);
    if (useFreePacks) {
      try {
        await spawnEnemyFreePacks(s.type, pos, scene);
      } catch (e) {
        console.warn(`Free-pack spawn fail, fallback:`, e);
        spawnEnemy(s.type, pos, scene);
      }
    } else {
      spawnEnemy(s.type, pos, scene);
    }
  }
  setCombatEnemySource(getAllEnemies);
```

**Changements**:
1. Ajouter `await` aux init calls
2. Wraper spawnEnemyFreePacks dans if + try/catch
3. Fallback à spawnEnemy si asset fail

---

## CHANGEMENT 4: Boss/Mini-Boss (Chercher d'abord)

**Fichier à Chercher**: `core/bootstrapBabylon.js`  
**Chercher**: "initMiniBoss" ou "spawnMiniBoss"

**Une fois trouvé, appliquer pattern similaire**:

```javascript
// AVANT (example):
initMiniBoss(scene);
// ... later ...
spawnMiniBoss(position, scene);

// APRÈS:
if (useFreePacks) {
  await initMiniBossFreePacks(scene, true);
} else {
  initMiniBoss(scene);
}

// ... at spawn time:
if (useFreePacks) {
  await spawnMiniBossFreePacks(currentAct, position, scene);
} else {
  spawnMiniBoss(position, scene);
}
```

---

## CHANGEMENT 5 (Optionnel): Nettoyer game.js

**Fichier**: `game.js`  
**Action**: Vérifier qu'il n'est importé nulle part

```bash
# Chercher tous les imports:
grep -r "from.*game.js" "c:\GUTTER GOD 2"
grep -r "import.*Game" "c:\GUTTER GOD 2"
```

**Si no results**: Safe à supprimer ou laisser

**Si results**: Comment le fichier ou refactor

---

## CHANGEMENT 6 (Optionnel): Vérifier Boss Paths

**Fichier**: `gameplay/babylonMiniBossFreePacks.js`  
**Lignes**: ~40-70 (MINIBOSS_DEFS)

**Vérifier que ces fichiers existent**:

```bash
Test-Path "c:\GUTTER GOD 2\assets\free-packs\Ultimate Monsters\*\Orc.gltf"
Test-Path "c:\GUTTER GOD 2\assets\free-packs\Ultimate Monsters\*\Yeti.gltf"
Test-Path "c:\GUTTER GOD 2\assets\free-packs\Ultimate Monsters\*\Demon.gltf"
Test-Path "c:\GUTTER GOD 2\assets\free-packs\Ultimate Monsters\*\Dragon.gltf"
```

**Si tous existent**: OK, pas de changement

**Si plusieurs manquent**: 
- Ajuster les chemins dans MINIBOSS_DEFS
- Ou fallback au boss primitif

---

## Ordre d'Exécution Recommandé

```
1. CHANGEMENT 1 (Props paths) — 15 min
   ↓ Build + test
   
2. CHANGEMENT 2 (Chunk streamer) — 10 min
   ↓ Build + test
   
3. CHANGEMENT 3 (Bootstrap ennemis) — 20 min
   ↓ Build + regression tests
   
4. CHANGEMENT 4 (Boss) — 15 min
   ↓ Build + test
   
5. CHANGEMENT 5 (Cleanup game.js) — 5 min
   
6. CHANGEMENT 6 (Verify boss paths) — 10 min
   
7. FINAL TEST — 20 min
   - Visual test: CONFIG.useFreePacks = true
   - Fallback test: CONFIG.useFreePacks = false
   - FPS measurement
```

**Total**: ~95 minutes

---

## ✅ Validation Checklist

### Après Changement 1:
- [ ] Build: `npm run build` = OK
- [ ] Syntax: No errors in babylonPropsFreePacks.js

### Après Changement 2:
- [ ] Build: `npm run build` = OK
- [ ] Chunk streamer imports spawnChunkPropsFreePacks

### Après Changement 3:
- [ ] Build: `npm run build` = OK
- [ ] Regression tests: `npx playwright test` = 8/8 PASS
- [ ] Bootstrap has useFreePacks condition for enemies

### Après Changement 4:
- [ ] Build: `npm run build` = OK
- [ ] Mini-boss/Boss has free-packs condition

### Après Changement 5:
- [ ] game.js not imported anywhere (optional)

### Après Changement 6:
- [ ] Boss asset paths verified or adjusted

### FINAL:
- [ ] Launch game, CONFIG.useFreePacks = true
- [ ] See glTF assets instead of primitives ✅
- [ ] FPS: 50-55 (acceptable) ✅
- [ ] No console errors ✅
- [ ] Fallback test: useFreePacks = false, primitives return ✅

