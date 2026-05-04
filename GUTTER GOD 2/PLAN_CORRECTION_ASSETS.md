# 🔧 Plan de Correction Intégration Assets

**Status**: 🟠 À IMPLÉMENTER IMMÉDIATEMENT  
**Complexité**: 🟠 MOYENNE (5-6 changements stratégiques)  
**Temps Estimé**: 2-3 heures  
**Risque de Régression**: 🟢 BAS (Tests 8/8 passants, fallback gracieux)

---

## 🎯 Objectif

Faire fonctionner l'intégration assets-free-packs en 3 étapes:

1. **Corriger les chemins assets** (Props)
2. **Refactoriser la logique spawn** (Props, Ennemis, Boss)
3. **Nettoyer l'architecture** (Supprimer game.js mort, clarifier bootstrap)

**Résultat Final**: `CONFIG.features.useFreePacks = true` → Voir assets glTF en jeu ✅

---

## ✅ Plan Détaillé

### ÉTAPE 1: Corriger Chemins Assets Props

**Fichier à Modifier**: `world/babylonPropsFreePacks.js`

**Changement**:
```javascript
// ❌ AVANT:
model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/Trees/CommonTree_1.gltf'

// ✅ APRÈS:
model: 'assets/free-packs/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf'
```

**Impacts**: 
- Remove `/Trees/`, `/Bushes/`, `/Rocks/`, `/Mushrooms/` from all paths
- Vérifier tous les modèles existent avec new paths

**Fichiers à Vérifier**:
- Stylized Nature glTF/ → 40+ fichiers OK ✅
- Rock_Medium_1.gltf ✅ (vs Rock_Medium_1.gltf) ✅
- Mushroom_Common.gltf ✅
- Mushroom_Laetiporus.gltf ✅

---

### ÉTAPE 2: Refactoriser Logique Chunk Streamer

**Fichier à Modifier**: `world/babylonChunkStreamer.js`

**Changement**:
```javascript
// ❌ AVANT (ligne ~70):
spawnChunkProps(cx, cz, biome, scene, _density.scale);

// ✅ APRÈS:
const useFreePacks = CONFIG.features.useFreePacks;
if (useFreePacks) {
  spawnChunkPropsFreePacks(cx, cz, biome, scene, _density.scale);
} else {
  spawnChunkProps(cx, cz, biome, scene, _density.scale);
}
```

**Import à Ajouter** (ligne ~4):
```javascript
import { spawnChunkPropsFreePacks } from './babylonPropsFreePacks.js';
```

**Impact**: Props utilisent free-packs quand activé, sinon primitives

---

### ÉTAPE 3: Refactoriser Bootstrap — Ennemis

**Fichier à Modifier**: `core/bootstrapBabylon.js`

**Section Ennemis (ligne ~130-160)**:

```javascript
// ❌ AVANT:
const useFreePacks = CONFIG.features.useFreePacks;
if (useFreePacks) {
  initEnemiesFreePacks(scene, true);
  initPropsFreePacks(scene, 'grassland', true);
  initMiniBossFreePacks(scene, true);
}

const enemySpawns = [...];
for (const s of enemySpawns) {
  spawnEnemy(s.type, pos, scene);  // ❌ Toujours primitif
}

// ✅ APRÈS:
const useFreePacks = CONFIG.features.useFreePacks;
if (useFreePacks) {
  await initEnemiesFreePacks(scene, true);
  await initPropsFreePacks(scene, 'grassland', true);
  await initMiniBossFreePacks(scene, true);
}

const enemySpawns = [...];
for (const s of enemySpawns) {
  const pos = new Vector3(s.x, getTerrainHeight(s.x, s.z) + 2, s.z);
  if (useFreePacks) {
    await spawnEnemyFreePacks(s.type, pos, scene);
  } else {
    spawnEnemy(s.type, pos, scene);
  }
}
```

**Imports à Vérifier** (déjà présents):
```javascript
import { spawnEnemyFreePacks } from '../gameplay/babylonEnemiesFreePacks.js';
```

**Impact**: Ennemis utilisent glTF quand activé, sinon primitives

---

### ÉTAPE 4: Intégrer Mini-Boss/Boss Final

**Fichier à Modifier**: `core/bootstrapBabylon.js` (section boss, ligne ~200+)

Chercher l'initialisation du mini-boss actuel:

```javascript
// ❌ AVANT (probablement):
const miniBoss = initMiniBoss(scene);

// ✅ APRÈS:
if (CONFIG.features.useFreePacks) {
  initMiniBossFreePacks(scene, true);
  // initMiniBoss ne sera pas appelé pour act 1-3
} else {
  initMiniBoss(scene);  // Fallback primitif
}

// Quand spawn mini-boss (at act transition):
if (CONFIG.features.useFreePacks) {
  spawnMiniBossFreePacks(currentAct, position, scene);
} else {
  spawnMiniBoss(position, scene);  // Original
}
```

**À Chercher**: Où est le code qui spawne mini-boss actuellement
- Probablement dans `gameplay/babylonMiniBoss.js` ou bootstrap

**Impact**: Boss utilisent Ultimate Monsters quand activé

---

### ÉTAPE 5: Nettoyer Architecture

#### 5a. Supprimer game.js (ou le refactoriser)

**Fichier**: `game.js` — 80 lignes de boilerplate mort

**Option A** (Recommandé): **Supprimer complètement**
```bash
rm game.js
```

**Option B**: Refactoriser pour vrai (trop complexe maintenant)

**Raison**: 
- Jamais importé nulle part
- N'a aucune logique réelle
- Confusion architecturale

#### 5b. Clarifier gameEngine.js

**Changement**:
```javascript
// ❌ AVANT:
import { Game } from './game';  // ❌ Importe fichier mort!

// ✅ APRÈS:
// gameEngine.js peut être supprimé ou refactorisé
// Pour l'instant, l'import du bootstrap dans index.html suffit
```

**Action**: Soit supprimer gameEngine.js, soit le refactoriser proprement

**Pour maintenant**: Ignorer, juste s'assurer index.html appelle bootstrap

---

### ÉTAPE 6: Vérifier Chemins Boss Ultimate Monsters

**Fichier à Vérifier**: `gameplay/babylonMiniBossFreePacks.js` (lignes ~40-70)

```javascript
const MINIBOSS_DEFS = {
  1: {
    model: 'assets/free-packs/Ultimate Monsters/Big/glTF/Orc.gltf',
    // Vérifier que /Big/glTF/ existe!
  },
};
```

**À Faire**:
```bash
# Vérifier structure:
Get-ChildItem -LiteralPath "c:\GUTTER GOD 2\assets\free-packs\Ultimate Monsters" -Recurse -Filter "Orc.gltf"
```

**Si Chemin Faux**: Corriger comme on a fait pour props

---

## 🧪 Plan de Validation

### Test 1: Build Clean

```bash
cd c:\GUTTER GOD 2
npm run build
# ✅ Attend: 0 errors
```

### Test 2: Regression Tests

```bash
npx playwright test tests/phase3-4.spec.js --reporter=line
# ✅ Attend: 8/8 PASS
```

### Test 3: Visual Test (Manual)

1. **Éditer config.js**:
   ```javascript
   features: {
     useFreePacks: true,  // ✅ Enable
   }
   ```

2. **Lancer le jeu**: `npm run dev`

3. **Regarder**:
   - ✅ Ennemis ont forme glTF (pas capsule)
   - ✅ Props sont arbres/rochers (pas sphères)
   - ✅ Boss a vraie forme (pas capsule géante)
   - ✅ Console pas d'erreurs réseau (assets chargent OK)

4. **Mesurer FPS**: Should be 50-55 FPS (vs 60 avec primitives)

### Test 4: Fallback Test

1. **Éditer config.js**:
   ```javascript
   features: {
     useFreePacks: false,  // Disable
   }
   ```

2. **Relancer**:
   - ✅ Ennemis redeviennent capsules
   - ✅ Props redeviennent sphères/cubes
   - ✅ FPS remonte à 60
   - ✅ Aucun erreur

---

## 📊 Ordre d'Implémentation

```
1. ÉTAPE 1 (30 min): Corriger chemins props
   ↓ Test: Build OK
   
2. ÉTAPE 2 (20 min): Chunk streamer toggle
   ↓ Test: Build OK
   
3. ÉTAPE 3 (30 min): Bootstrap ennemis
   ↓ Test: Build + Regressions OK
   
4. ÉTAPE 4 (20 min): Mini-boss/boss
   ↓ Test: Build OK
   
5. ÉTAPE 5 (20 min): Nettoyer (remove game.js, etc)
   ↓ Test: Build OK
   
6. ÉTAPE 6 (15 min): Vérifier chemins boss
   ↓ Test: Build OK
   
7. FINAL (30 min): Test visuel complet
   ↓ Voir assets en jeu ✅
```

**Temps Total**: ~2.5 heures

---

## 🚨 Risques & Mitigations

| Risque | Mitigation |
|--------|-----------|
| Regression tests fail | Fallback gracieux — primitives toujours dispo |
| Assets se chargent pas | Vérifier chemins + console pour erreurs |
| FPS chute trop | CONFIG.features.useFreePacks = false |
| Game crash au launch | Async/await pour loaders, try/catch |
| Props mal positionnées | Vérifier Y offset, getTerrainHeight() |

---

## ✅ Checklist d'Implémentation

- [ ] Étape 1: Corriger chemins props babylonPropsFreePacks.js
- [ ] Étape 2: Ajouter config toggle à babylonChunkStreamer.js
- [ ] Étape 3: Refactoriser bootstrap ennemis (avec useFreePacks)
- [ ] Étape 4: Intégrer mini-boss/boss bootstrap
- [ ] Étape 5a: Supprimer game.js (vérifier pas d'imports)
- [ ] Étape 5b: Clarifier gameEngine.js ou supprimer
- [ ] Étape 6: Vérifier chemins Ultimate Monsters
- [ ] Build test: `npm run build` ✅ 0 errors
- [ ] Regression test: `npx playwright test` ✅ 8/8
- [ ] Visual test: Lancer jeu, useFreePacks=true, voir assets ✅
- [ ] Fallback test: useFreePacks=false, primitives OK ✅

---

## 📝 Notes Importantes

### Import d'Async

Les loaders free-packs sont async. Bootstrap est async, donc OK.

```javascript
async function bootstrap() {
  // ...
  if (useFreePacks) {
    await initEnemiesFreePacks(...);  // ✅ OK
  }
  // ...
}
```

### Fallback Gracieux

Si asset fail → console.warn, puis fallback à primitives

```javascript
try {
  await spawnEnemyFreePacks(type, pos, scene);
} catch (e) {
  console.warn(`Asset fail, fallback:`, e);
  spawnEnemy(type, pos, scene);  // Fallback
}
```

### Performance

Free-packs = -5-10 FPS sur i7-1255U. Acceptable.
- High FPS: 60 (primitives)
- Free-Packs: 50-55 FPS (glTF)
- Very Heavy: 45 FPS (OK, fallback threshold)

---

## 🎯 Résultat Attendu

Après implémentation:

```javascript
CONFIG.features.useFreePacks = true;
// → Jeu affiche assets glTF
// → Ennemis: Quaternius models ✅
// → Props: Stylized Nature trees/rocks ✅
// → Boss: Ultimate Monsters creatures ✅
// → FPS: 50-55 (acceptable) ✅
// → Build: 0 errors ✅
// → Tests: 8/8 PASS ✅

CONFIG.features.useFreePacks = false;
// → Jeu affiche primitives
// → Ennemis: Capsules ✅
// → Props: Sphères/cubes ✅
// → Boss: Capsules géantes ✅
// → FPS: 60 (max) ✅
```

