// core/assetLoader.js — Chargement centralisé des assets glTF + textures
// Batch loading via AssetsManager, single-load cache, progress callback

import { SceneLoader, Texture, CubeTexture, AssetsManager } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';  // Register glTF/glb loader plugin

const _meshCache = new Map();      // path → loaded root mesh (template)
const _textureCache = new Map();   // path → loaded texture
const _loading = new Map();        // path → promise (anti-double-load)

// ── Progress tracking ─────────────────────────────────────────────────────
let _onProgress = null;
let _totalAssets  = 0;
let _loadedAssets = 0;

export function setLoadProgressCallback(fn) { _onProgress = fn; }

function _reportProgress() {
  if (_onProgress && _totalAssets > 0) {
    _onProgress(_loadedAssets, _totalAssets);
  }
}

// ── Single mesh loader (cached) ───────────────────────────────────────────

/**
 * Charger un mesh glTF/glb — chaque path n'est chargé qu'UNE fois.
 * Les appels suivants retournent le mesh mis en cache.
 */
export async function loadGltfMesh(path, id, scene) {
  // Cache par path (pas par id) — un même fichier = un seul chargement
  if (_meshCache.has(path)) return _meshCache.get(path);

  // Éviter double-loading concurrent
  if (_loading.has(path)) return _loading.get(path);

  const promise = _doLoadGltf(path, id, scene);
  _loading.set(path, promise);

  try {
    const mesh = await promise;
    _meshCache.set(path, mesh);
    _loadedAssets++;
    _reportProgress();
    return mesh;
  } catch (e) {
    _loadedAssets++;
    _reportProgress();
    throw e;
  } finally {
    _loading.delete(path);
  }
}

async function _doLoadGltf(path, id, scene) {
  const dir  = path.substring(0, path.lastIndexOf('/') + 1);
  const file = path.substring(path.lastIndexOf('/') + 1);

  const result = await SceneLoader.ImportMeshAsync(null, dir, file, scene);

  if (result.meshes.length === 0) {
    throw new Error(`[assetLoader] Aucun mesh dans ${path}`);
  }

  let mainMesh = result.meshes[0];
  mainMesh.name = id;

  // Parenter les sous-meshes au root
  for (let i = 1; i < result.meshes.length; i++) {
    result.meshes[i].parent = mainMesh;
  }

  mainMesh._skeletons = result.skeletons || [];
  mainMesh._animationGroups = result.animationGroups || [];

  return mainMesh;
}

// ── Batch loader — charge N fichiers en parallèle avec progression ────────

/**
 * Charger une liste de fichiers glTF/glb en batch.
 * Retourne une Map<path, mesh>. Les fichiers déjà en cache sont réutilisés.
 * @param {Array<{path: string, id: string}>} items
 * @param {Scene} scene
 * @param {number} concurrency — nombre de chargements simultanés (défaut: 6)
 * @returns {Promise<Map<string, AbstractMesh>>}
 */
export async function batchLoadGltf(items, scene, concurrency = 6) {
  const results = new Map();
  const toLoad = [];

  // Séparer les fichiers en cache vs à charger
  for (const item of items) {
    if (_meshCache.has(item.path)) {
      results.set(item.path, _meshCache.get(item.path));
    } else {
      toLoad.push(item);
    }
  }

  _totalAssets += toLoad.length;
  _reportProgress();

  // Charger par lots de `concurrency`
  for (let i = 0; i < toLoad.length; i += concurrency) {
    const batch = toLoad.slice(i, i + concurrency);
    const promises = batch.map(item =>
      loadGltfMesh(item.path, item.id, scene)
        .then(mesh => { results.set(item.path, mesh); })
        .catch(e => {
          console.warn(`⚠️ Asset manquant: ${item.path}`, e.message || e);
        })
    );
    await Promise.all(promises);
  }

  return results;
}

// ── Texture PBR loader ────────────────────────────────────────────────────

export async function loadPbrTextures(basePath, scene) {
  const textures = {};
  const patterns = [
    { name: 'color', suffixes: ['_Color', '_BaseColor', '_Diffuse', '_color'] },
    { name: 'normal', suffixes: ['_Normal', '_NormalGL', '_normal'] },
    { name: 'roughness', suffixes: ['_Roughness', '_roughness'] },
    { name: 'ao', suffixes: ['_AmbientOcclusion', '_AO', '_ao'] },
  ];

  for (const pattern of patterns) {
    for (const suffix of pattern.suffixes) {
      for (const ext of ['_4K.png', '.png', '_4K.jpg', '.jpg']) {
        const path = basePath + suffix + ext;
        try {
          const tex = new Texture(path, scene);
          await new Promise((resolve, reject) => {
            tex.onLoadObservable.addOnce(() => resolve());
            setTimeout(reject, 3000);
          });
          textures[pattern.name] = tex;
          break;
        } catch (e) { /* continue */ }
      }
      if (textures[pattern.name]) break;
    }
  }
  return textures;
}

// ── Clone / Instance ──────────────────────────────────────────────────────

/**
 * Cloner un mesh (deep clone with material)
 */
export function cloneMesh(original, newName) {
  const clone = original.clone(newName);
  if (original.material) {
    clone.material = original.material.clone(newName + '_mat');
  }
  return clone;
}

/**
 * Créer une instance GPU (partage geometry + material)
 * Beaucoup plus léger qu'un clone — 1 draw call pour tous les instances du même template.
 * Pour les glTF, le root est souvent un TransformNode sans géométrie :
 * on clone le root et on instancie chaque enfant qui a de la géométrie.
 */
export function createInstance(original, newName) {
  // Si le mesh a directement de la géométrie, l'instancier
  if (original.geometry && original.createInstance) {
    return original.createInstance(newName);
  }

  // glTF : le root est un TransformNode, les enfants portent la géométrie
  const children = original.getChildMeshes(false);
  const geometryChildren = children.filter(c => c.geometry);

  if (geometryChildren.length > 0) {
    // Créer un clone léger du root (TransformNode), puis instancier chaque enfant
    const rootClone = original.clone(newName);
    if (!rootClone) return cloneMesh(original, newName);

    // Supprimer les children clonés et les remplacer par des instances
    const clonedChildren = rootClone.getChildMeshes(false);
    for (const clonedChild of clonedChildren) {
      // Trouver le child original correspondant
      const origChild = children.find(c => c.name === clonedChild.name);
      if (origChild && origChild.geometry && origChild.createInstance) {
        const inst = origChild.createInstance(newName + '_' + origChild.name);
        inst.parent = rootClone;
        inst.position.copyFrom(clonedChild.position);
        inst.rotation.copyFrom(clonedChild.rotation);
        inst.scaling.copyFrom(clonedChild.scaling);
        clonedChild.dispose();
      }
    }
    return rootClone;
  }

  // Dernier recours : clone complet
  return cloneMesh(original, newName);
}

// ── Debug / Reset ─────────────────────────────────────────────────────────

export function getAssetCacheState() {
  return {
    meshes: Array.from(_meshCache.keys()),
    textures: Array.from(_textureCache.keys()),
    loading: Array.from(_loading.keys()),
    loaded: _loadedAssets,
    total: _totalAssets,
  };
}

export function resetLoadProgress() {
  _totalAssets = 0;
  _loadedAssets = 0;
}

export function clearAssetCache() {
  for (const mesh of _meshCache.values()) {
    try { mesh.dispose(); } catch (e) {}
  }
  for (const tex of _textureCache.values()) {
    try { tex.dispose(); } catch (e) {}
  }
  _meshCache.clear();
  _textureCache.clear();
  _loading.clear();
  _totalAssets = 0;
  _loadedAssets = 0;
}
