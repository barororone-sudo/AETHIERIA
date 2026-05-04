# 📊 Analyse Comparative — Patterns Assets AAA vs Gutter God

**Référence**: Elden Ring, Dark Souls 3, Witcher 3, Kingdom Come: Deliverance  
**Framework**: Babylon.js v8.56.2 (vs Unreal/Unity/propriétaire)  
**Hardware Target**: i7-1255U Iris Xe (vs High-End PC)

---

## 🎮 Pattern 1: Gestion des Assets (Elden Ring)

### FromSoftware / Bandai Namco (Elden Ring)

```
ARCHITECTURE:
┌─────────────────────────┐
│  Asset Manager (Global) │
├─────────────────────────┤
│ - Load mesh (async)     │
│ - Cache + dedup         │
│ - Fallback primitives   │
│ - Quality LOD           │
└────────┬────────────────┘
         │
    ┌────▼────────────────────────┐
    │ Resource Pools:            │
    │ - Mesh pool                │
    │ - Material pool            │
    │ - Skeleton pool            │
    │ - Animation pool           │
    └────┬────────────────────────┘
         │
    ┌────▼──────────────┐
    │  Spawn Functions  │
    │ - SpawnEnemy()    │
    │ - SpawnProp()     │
    │ - SpawnBoss()     │
    └───────────────────┘
         │
    ALL USE SAME ASSET SYSTEM
    ↓
    No separate spawnEnemyPrimitive()
    No separate spawnEnemyAsset()
```

### Gutter God ACTUEL ❌

```
ARCHITECTURE:
┌────────────────────────────┐
│ Deux systèmes parallèles   │
├────────────────────────────┤
│ System A: Primitives       │
│ - spawnEnemy()             │
│ - spawnChunkProps()        │
│ - initMiniBoss()           │
│                            │
│ System B: Assets (UNUSED)  │
│ - spawnEnemyFreePacks()    │
│ - spawnChunkPropsFreePacks() ❌
│ - initMiniBossFreePacks()  ❌
└────────────────────────────┘

RÉSULTAT:
- System A activé TOUJOURS
- System B en RAM, jamais appelé
- Duplication logique
- Coûteux (maint + perf)
```

---

## 🔧 Pattern 2: Configuration Qualité (Witcher 3)

### CD Projekt Red (Witcher 3)

```javascript
// Single source of truth
const ASSET_QUALITY = {
  Ultra: {
    enemyLod: 'highPoly',
    propDensity: 1.0,
    shadowRes: 2048,
    useAssets: true,
  },
  High: {
    enemyLod: 'mediumPoly',
    propDensity: 0.7,
    shadowRes: 1024,
    useAssets: true,
  },
  Medium: {
    enemyLod: 'lowPoly',
    propDensity: 0.4,
    shadowRes: 512,
    useAssets: true,
  },
  Low: {
    enemyLod: 'simplified',
    propDensity: 0.2,
    shadowRes: 256,
    useAssets: false,  // Fallback simplifiés
  }
};

// UNE SEULE fonction spawn
function spawnEnemy(type, pos, config) {
  const quality = ASSET_QUALITY[CONFIG.graphicsLevel];
  const mesh = quality.useAssets 
    ? await loadAsset(type, quality.enemyLod)
    : createPrimitive(type);
  // ... render
}
```

### Gutter God ACTUEL ❌

```javascript
// Deux variables non-liées
CONFIG.features.useFreePacks = true|false;   // ???
CONFIG.graphics.assetQuality = undefined;     // ❌ Pas de système

// Deux fonctions complètement séparées
if (CONFIG.features.useFreePacks) {
  spawnEnemyFreePacks(...);
} else {
  spawnEnemy(...);  // Duplication!
}
```

---

## 📦 Pattern 3: Asset Streaming (Kingdom Come: Deliverance)

### Warhorse Studios

```javascript
// KCD — Streaming hautement granulaire
const ASSET_CATALOGUE = {
  'enemy/cuman_archer': {
    mesh: 'models/enemies/cuman_archer.glb',
    skeleton: 'skeletons/human.skel',
    animations: ['animations/walk.anim', 'animations/attack.anim'],
    materials: ['materials/cloth_01.mat', 'materials/skin_01.mat'],
    requiredTextures: 512,  // RAM estimate
    priority: 'normal',
  },
  'prop/wooden_barrel': {
    mesh: 'models/props/barrel.glb',
    physics: 'physics/barrel_physx.phy',
    requiredTextures: 64,
    priority: 'low',  // Load later
  },
};

async function loadAsset(id) {
  const def = ASSET_CATALOGUE[id];
  if (!def) return fallback();
  
  // Priority-based streaming
  const priority = def.priority;
  await scheduleLoad(def, priority);
  return cache.get(id);
}
```

### Gutter God ACTUEL ❌

```javascript
// Pas de catalogue centralisé
const BIOME_PROPS_FREE_PACKS = {
  grassland: [
    { type: 'CommonTree_1', 
      model: '...', 
      scale: 1.0 
    },
  ],
};

const ENEMY_MESH_DEFS = {
  scout: {
    model: '...',
    scale: 1.0,
    label: 'Scout',
  },
};

const MINIBOSS_DEFS = { /* separate */ };

// 3 définitions disjointes, pas de priority
```

---

## 🎯 Pattern 4: Spawner Unifiée (Dark Souls 3)

### From Software

```javascript
// Dark Souls 3 — Single spawn function
class EntitySpawner {
  static async spawn(type, position, config = {}) {
    const assetDef = ASSET_REGISTRY.get(type);
    if (!assetDef) throw new Error(`Unknown type: ${type}`);
    
    // Unified flow
    const asset = await this.loadAsset(assetDef, config.quality);
    const entity = new Entity(asset);
    entity.position = position;
    entity.physics = config.physics || assetDef.defaultPhysics;
    
    return entity;
  }
  
  static async loadAsset(def, qualityLevel) {
    // Quality-aware loading
    if (qualityLevel === 'high') {
      return await assetManager.load(def.meshHigh, true);
    } else {
      return await assetManager.load(def.meshLow, false);
    }
  }
}

// Usage (everywhere in code):
const enemy = await EntitySpawner.spawn('enemy/cuman', position);
const prop = await EntitySpawner.spawn('prop/barrel', position);
const boss = await EntitySpawner.spawn('boss/gutter_god', position);

// No duplication, single logic path
```

### Gutter God ACTUEL ❌

```javascript
// Deux chemin de code complètement séparés

// Path A (Primitives):
const enemy = spawnEnemy(type, position, scene);
const prop = spawnChunkProps(cx, cz, biome, scene);
const boss = spawnMiniBoss(position, scene);

// Path B (Assets):
const enemy = await spawnEnemyFreePacks(type, position, scene);
const prop = await spawnChunkPropsFreePacks(cx, cz, biome, scene);
const boss = await spawnMiniBossFreePacks(act, position, scene);

// Two code paths to maintain!
// Twice the bugs!
```

---

## 🚨 Pattern 5: Error Handling (AAA Standard)

### Best Practice (Unreal Engine 5)

```cpp
// Graceful degradation
ACharacter* SpawnCharacter(FString Type, FVector Position) {
  USkeletalMesh* Mesh = LoadAsset(Type);
  
  if (!Mesh) {
    // Fallback 1: Generic mesh
    Mesh = LoadAsset("Common/Humanoid_Simplified");
  }
  
  if (!Mesh) {
    // Fallback 2: Primitive
    Mesh = CreatePrimitiveMesh(PrimitiveType::Capsule);
  }
  
  if (!Mesh) {
    // Fallback 3: Warning + skip
    UE_LOG(Warning, L"Cannot spawn character");
    return nullptr;
  }
  
  ACharacter* Ch = CreateActor(Mesh);
  return Ch;
}
```

### Gutter God ACTUEL ❌

```javascript
// Current: If asset fails → nothing
try {
  const mesh = await loadGltfMesh(path, id, scene);
  // ...
} catch (e) {
  console.warn(`⚠️ Asset fail`, e);
  // ❌ No fallback!
  // Game continues with undefined mesh
  return null;
}
```

---

## 📊 Comparaison Structurée

| Aspect | Elden Ring | Witcher 3 | Gutter God |
|--------|-----------|-----------|-----------|
| **Asset Manager** | Centralisé ✅ | Centralisé ✅ | Disjointe ❌ |
| **Spawn Functions** | 1 unified ✅ | 1 per type ✅ | 6 (primitif + asset) ❌ |
| **Quality Config** | Intégré ✅ | Settings menu ✅ | useFreePacks ⚠️ |
| **Fallback Cascade** | 3+ niveaux ✅ | 2+ niveaux ✅ | 0 niveaux ❌ |
| **Asset Catalogue** | Centralisé ✅ | Par type ✅ | Fragmenté ❌ |
| **Performance Tuning** | Per-asset ✅ | Global + local ✅ | Aucun ❌ |
| **Code Maintenance** | Facile ✅ | Facile ✅ | Difficile ❌ |

---

## 🔴 Problem Patterns Identifiés

### Pattern Problème 1: Duplicate Spawn Functions

**Gutter God**:
- spawnEnemy() — Primitif
- spawnEnemyFreePacks() — Asset
- Même logique dupliquée

**Coûts**:
- 2x développement
- 2x tests
- 2x maintenance
- Bug diff entre les deux

**Solution AAA**: Une seule fonction avec param config

### Pattern Problème 2: Disconnected Config

**Gutter God**:
```javascript
CONFIG.features.useFreePacks = true;  // ???
// But doesn't affect:
//   - Chunk streamer (hard-coded spawnChunkProps)
//   - Bootstrap (mixed paths)
//   - Enemy spawn (wrong function called)
```

**Coûts**:
- Config useless
- Player pense ça marche
- Confuse debugging

**Solution AAA**: Config → Changes behavior everywhere

### Pattern Problème 3: Asset Paths Wrong

**Gutter God**:
```javascript
model: 'assets/.../glTF/Trees/CommonTree_1.gltf'
// Mais réalité:
// assets/.../glTF/CommonTree_1.gltf
```

**Coûts**:
- Assets chargent pas
- Silent fail (pas d'erreur visible)
- Dev temps perdu à debug

**Solution AAA**: Catalogue centralisé avec paths vérifiés

---

## ✅ Jeux Similaires — Étude de Cas

### Case 1: Elden Ring (Comparaison Plus Proche)

**Genre**: Open world RPG action
**Engine**: Unreal 5
**Asset System**: 
```
✅ Single asset manager for all entities
✅ Seamless quality scaling (Ultra/High/Medium/Low)
✅ All enemies use same spawn system (internal LOD)
✅ Fallback to simplified geometry on i7-1255U equivalent
✅ Zero duplication between paths
```

**Gutter God vs ER**:
```
ELDEN RING:
1. spawnEntity(type, quality, position)
   → Loads appropriate LOD
   → All paths unified
   → Config drives quality

GUTTER GOD (BROKEN):
1. if (useFreePacks) spawnEnemyFreePacks()
   else spawnEnemy()
   → Two paths
   → Config doesn't work
   → Paths hard-coded
```

### Case 2: Kingdom Come Deliverance

**Genre**: Historical RPG
**Engine**: Cryengine
**Asset System**:
```
✅ Asset catalogue with priorities
✅ Streaming based on proximity + priority
✅ Fallback system per asset
✅ Performance budgets per asset type
✅ Adaptive quality based on FPS
```

**Gutter God vs KCD**:
```
KINGDOM COME:
1. Asset catalogue with metadata
2. Priority-based loading
3. Automatic fallback
4. Performance monitoring

GUTTER GOD:
1. Asset defs scattered (Props/Enemies/Boss)
2. No priority
3. No fallback (silent fail)
4. No perf monitoring
```

---

## 🎯 Skill.md Analysis

### Requirement: "Feature jouable de bout en bout"

**Skill.md says**:
> "Feature jouable de bout en bout sans blocage"

**Gutter God Status**: ❌ FAIL
- Assets existent
- Code compile
- Mais jamais rendu à l'écran

**Comparable à**: Restaurant AAA qui prépare plat mais ne le sert jamais

### Requirement: "Aucune erreur build/runtime"

**Status**: ✅ PASS (Mais trompeur!)
- Build clean (0 errors)
- Runtime clean (0 crashes)
- But: Assets loaded to RAM, never used

**Comparable à**: Voiture avec moteur de F1 mais transmission coupée

### Requirement: "Paramètres clés exposés pour itération"

**Status**: ❌ FAIL
- CONFIG.features.useFreePacks existe
- Mais ne change rien au runtime
- Chunk streamer l'ignore
- Bootstrap ignore partiellement

**Comparable à**: Lumière on/off qui ne fait rien

---

## 🔄 Recommendation: Refactor to AAA Pattern

### OPTION A: Unified Spawner (Recommandé)

```javascript
// core/entitySpawner.js — NEW
class EntitySpawner {
  static async spawn(type, position, options = {}) {
    const quality = options.quality || CONFIG.graphics.assetQuality;
    
    if (quality === 'high' && CONFIG.features.useFreePacks) {
      // Use assets
      if (type.startsWith('enemy/')) {
        return await spawnEnemyFreePacks(type.split('/')[1], position, scene);
      } else if (type.startsWith('prop/')) {
        return await spawnChunkPropsFreePacks(...);
      } else if (type.startsWith('boss/')) {
        return await spawnMiniBossFreePacks(...);
      }
    } else {
      // Use primitives
      if (type.startsWith('enemy/')) {
        return spawnEnemy(type.split('/')[1], position, scene);
      } else if (type.startsWith('prop/')) {
        return spawnChunkProps(...);
      } else if (type.startsWith('boss/')) {
        return spawnMiniBoss(...);
      }
    }
  }
}

// Usage (everywhere):
const enemy = await EntitySpawner.spawn('enemy/scout', position);
const prop = await EntitySpawner.spawn('prop/tree', position);
const boss = await EntitySpawner.spawn('boss/act1', position);

// Single code path, config drives quality
```

### OPTION B: Quality Config System

```javascript
// core/config.js — ADD
graphics: {
  assetQuality: 'high',  // 'ultra' | 'high' | 'medium' | 'low'
  assetQualityMapping: {
    ultra: { useAssets: true, propsPerChunk: 40, shadow: 2048 },
    high: { useAssets: true, propsPerChunk: 25, shadow: 1024 },
    medium: { useAssets: false, propsPerChunk: 15, shadow: 512 },
    low: { useAssets: false, propsPerChunk: 8, shadow: 256 },
  },
},

// Accessible:
const cfg = CONFIG.graphics.assetQualityMapping[CONFIG.graphics.assetQuality];
const useAssets = cfg.useAssets;
const densityScale = cfg.propsPerChunk / CONFIG.world.propsPerChunk;
```

### OPTION C: Immediate Fix (3 hours)

Use current architecture but **make it work**:

1. Fix paths (Props chemins)
2. Add toggle calls (Chunk streamer, bootstrap)
3. Add fallback (try/catch)
4. Refactor later if time

---

## 📋 Checklist — AAA Best Practices

- [ ] Single asset manager ✅ (assetLoader.js existe)
- [ ] Unified spawn function ❌ (Dois créer EntitySpawner)
- [ ] Quality config ❌ (Dois créer mappings)
- [ ] Fallback cascade ❌ (Dois ajouter try/catch/fallback)
- [ ] Asset catalogue ⚠️ (Partiel, scattered)
- [ ] Performance budgets ❌ (Aucun)
- [ ] Logging/debug ⚠️ (Basique, console.log)
- [ ] Testing ✅ (8/8 tests)

---

## 🎬 Conclusion

### Gutter God vs AAA Studios

| Aspect | AAA (ER/W3) | Gutter God |
|--------|-------------|-----------|
| Architecture | Unified ✅ | Fragmenté ❌ |
| Config Impact | Complete ✅ | Partiel ❌ |
| Error Handling | Cascade ✅ | Silent fail ❌ |
| Asset Paths | Verified ✅ | Wrong ❌ |
| Duplication | Minimal ✅ | Maximal ❌ |
| Maintainability | Easy ✅ | Hard ❌ |

### Recommandation

**Court Terme (2-3h)**: Implémenter Plan Correction (fix chemins + appels)

**Moyen Terme (Session 7)**: Refactor to EntitySpawner pattern + Quality config

**Résultat Final**: System comparable AAA-indie pour asset management

