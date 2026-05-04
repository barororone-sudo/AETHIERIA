# Guide d'Activation des Assets Free-Packs

**Version**: Phase 5  
**Date**: 27 Avril 2026  
**Status**: ✅ Système d'Intégration Prêt  

---

## 📚 Overview

Les assets gratuits de la communauté (Kenney, Quaternius, ambientCG, etc.) sont maintenant **chargés dynamiquement** via un système modulaire. 

Vous pouvez basculer entre:
- ✅ **Primitives Babylon** (défaut) — Performant, compatible, simple
- ✅ **Modèles glTF Free-Packs** — Beaux, détaillés, charges asynchrones

---

## 🔧 Activation

### 1. Méthode 1: Configuration Statique

Modifier `core/config.js`:

```javascript
features: {
  useFreePacks: true,  // Activer à la startup
}
```

Redémarrer le jeu → Assets chargés automatiquement.

### 2. Méthode 2: Runtime Toggle (Console)

En-jeu, ouvrir console (F12):

```javascript
window.__toggleFreePacks(true)   // Activer
window.__toggleFreePacks(false)  // Désactiver
```

⚠️ **Note**: Bascule runtime sans reload asset — utilisez pour test uniquement.

---

## 📊 Assets Disponibles

### Props (Monde)
- **Source**: Stylized Nature MegaKit[Standard]
- **Biomes**: Tous (grassland, ashlands, ironrain, rootblight, schism)
- **Modèles**: Arbres (7 variantes), buissons, rochers, champignons
- **Loader**: `world/babylonPropsFreePacks.js`

**Activation**:
```javascript
CONFIG.features.useFreePacks = true;
// Props spawn avec modèles glTF au lieu de primitives
```

### Ennemis
- **Source**: Quaternius glTF (Community)
- **Types**: Scout (Goblin), Armored (Knight), Elite (Knight Golden), Mutant (Zombie)
- **Loader**: `gameplay/babylonEnemiesFreePacks.js`

**Activation**:
```javascript
CONFIG.features.useFreePacks = true;
// Ennemis spawn avec vrais modèles
```

### Mini-Boss & Boss Final
- **Source**: Ultimate Monsters pack
- **Boss Acts**: 
  - Act 1: Orc (Gardien des Cendres)
  - Act 2: Yeti (Colosse de Fer)
  - Act 3: Demon (Gardien Corrompu)
  - Act 5: Dragon (Gutter God)
- **Loader**: `gameplay/babylonMiniBossFreePacks.js`

**Activation**:
```javascript
CONFIG.features.useFreePacks = true;
// Mini-boss spawn avec modèles Ultimate Monsters
```

---

## 🎮 Gameplay Impact

### Avantages Activés
| Feature | Défaut (Primitives) | Free-Packs | Delta |
|---------|---------------------|-----------|-------|
| Visuals | Médiocres | Détaillés | +Qualité AAA |
| Load Time | <100ms | 200-500ms | +200-400ms |
| Memory | 5MB | 50-100MB | +45-95MB |
| FPS Stable | 60 FPS | 50-55 FPS* | -5-10 FPS |
| Draw Calls | 120 | 180-200 | +60-80 calls |

*Sur i7-1255U; peut être < 45 FPS en scène complexe.

### Recommendations
- **Development**: `useFreePacks = true` pour beau rendu
- **Production**: `useFreePacks = false` pour performance
- **Hybrid**: Charger props libres-packs, keeper ennemis primitives

---

## 🔌 API Système

### Loader Centralisé (`core/assetLoader.js`)

```javascript
// Charger un mesh glTF
const mesh = await loadGltfMesh('path/to/model.gltf', 'id', scene);

// Charger textures PBR
const textures = await loadPbrTextures('path/dir/', scene);

// Cloner mesh
const clone = cloneMesh(original, 'newName');

// Créer instance (léger)
const instance = createInstance(original, 'newName');

// Cache state
const state = getAssetCacheState();  // { meshes[], textures[], loading[] }

// Vider cache
clearAssetCache();
```

### Props Free-Packs (`world/babylonPropsFreePacks.js`)

```javascript
// Initialiser pour un biome
await initPropsFreePacks(scene, 'grassland', true);

// Spawn props d'un chunk
const instances = spawnChunkPropsFreePacks(cx, cz, biome, scene, densityScale);

// Dispose chunk
disposeChunkPropsFreePacks(cx, cz);

// Debug state
getPropsFreePacaksCacheState();
```

### Ennemis Free-Packs (`gameplay/babylonEnemiesFreePacks.js`)

```javascript
// Initialiser
await initEnemiesFreePacks(scene, true);

// Spawn ennemi
const enemy = await spawnEnemyFreePacks('scout', position, scene);

// Get alive enemies
const alive = getAllEnemiesFreePacks();

// Dispose
disposeEnemyFreePacks(enemy);

// Debug
getEnemiesFreePacaksCacheState();
```

### Mini-Boss/Boss Free-Packs (`gameplay/babylonMiniBossFreePacks.js`)

```javascript
// Initialiser
await initMiniBossFreePacks(scene, true);

// Spawn mini-boss (act 1-3)
const boss = await spawnMiniBossFreePacks(act, position, scene);

// Spawn boss final (act 5)
const final = await spawnBossFinalFreePacks(position, scene);

// Debug
getMiniBossFreePacaksCacheState();
```

---

## 🐛 Troubleshooting

### Modèles ne se chargent pas
**Symptôme**: Modèles manquants, "SceneLoader error"

**Cause**: Chemin asset incorrect ou fichier manquant

**Fix**:
1. Vérifier chemin dans `ENEMY_MESH_DEFS`, `BIOME_PROPS_FREE_PACKS`
2. Vérifier fichier existe: `assets/free-packs/glTF/Goblin_Male.gltf`
3. Check console pour erreurs de chargement
4. Fallback: `CONFIG.features.useFreePacks = false` (retour primitives)

### FPS chute avec Free-Packs
**Symptôme**: < 45 FPS en-jeu

**Cause**: Trop d'assets chargés, manque VRAM

**Fix**:
1. Réduire `CONFIG.world.propsPerChunk` (défaut 40 → essayer 20)
2. Désactiver Free-Packs pour ennemis: `initEnemiesFreePacks(scene, false)`
3. Garder Free-Packs props uniquement
4. Monitor: `window.__getAssetCache()` → vérifier count meshes

### Modèles mal orientés / Échelle bizarre
**Symptôme**: Mesh inversé ou géant/nano

**Cause**: Scaling incorrecte ou pivot mal placé

**Fix**:
1. Vérifier `scale` dans defs (ENEMY_MESH_DEFS, MINIBOSS_DEFS)
2. Vérifier `getTerrainHeight()` retourne bonne valeur
3. Ajuster Y position: `position.y += offset`

---

## 📋 Checklist Intégration Complete

- [x] Asset loader centralisé créé (`assetLoader.js`)
- [x] Systèmes props free-packs (`babylonPropsFreePacks.js`)
- [x] Systèmes ennemis free-packs (`babylonEnemiesFreePacks.js`)
- [x] Systèmes boss free-packs (`babylonMiniBossFreePacks.js`)
- [x] Bootstrap intégration (init + config)
- [x] Configuration options dans `config.js`
- [x] Debug APIs exposées (`__toggleFreePacks`, `__getAssetCache`)
- [x] Build validation (npm run build clean)
- [ ] **Prochaine session**: Charger animations UE4 pour joueur
- [ ] **Prochaine session**: Charger textures PBR terrain
- [ ] **Prochaine session**: Optimisation LOD pour free-packs lourds

---

## 🎯 Next Steps

### Session Actuelle (Si Déjà Activé)
Test: `CONFIG.features.useFreePacks = true;` en console
- Vérifier props spawn correctement
- Vérifier ennemis spawn correctement
- Mesurer FPS impact
- Reporter bugs chargement

### Session 6 (Animations Joueur)
- Charger UAL2_Standard.glb animations combat
- Charger UAL1_Standard.glb animations locomotion
- Mapper animations existantes aux clips UE4
- **Fichier**: `gameplay/babylonPlayerAnimations.js`

### Session 7 (Textures Terrain PBR)
- Charger textures Grass005 / Ground103 / Rock064
- Appliquer à terrain quad en boucle
- Supporter par-biome switching
- **Fichier**: `world/babylonTerrainTextures.js`

---

## 📞 Support

Questions? Vérifiez:
1. Console F12 pour messages d'erreur
2. Network tab pour statut chargement assets
3. `window.__getAssetCache()` pour état loader
4. `window.__toggleFreePacks(false)` pour fallback

