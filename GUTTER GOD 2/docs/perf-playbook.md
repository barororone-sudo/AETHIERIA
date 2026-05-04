# Perf Playbook — i7-1255U / Iris Xe / 16 Go RAM

## Profil hardware exact
- CPU : Intel i7-1255U (1.70 GHz base, 4.7 GHz boost, 10 cores / 12 threads)
- GPU : Intel Iris Xe Graphics (intégré, ~80 EU, mémoire partagée avec RAM)
- RAM : 16 Go (15.7 Go utilisable) — partagée CPU + GPU
- OS : Windows 64-bit

## Contraintes spécifiques Iris Xe
- Mémoire GPU partagée avec RAM : budget texture < 256 Mo total chargé
- Pas de shadow map > 512 (coût disproportionné sur GPU intégré)
- Pas de MSAA > 2x (préférer FXAA post-process si nécessaire)
- Pas de WebGL2 compute shaders (support instable Iris Xe)
- Draw calls < 200 par frame en gameplay normal
- Post-process : max 2 passes actives simultanément
- Geometry shaders : éviter (non optimisés GPU intégré)

## Budget frame (60 FPS = 16.6 ms)
| Système | Budget cible | Seuil alerte |
|---|---|---|
| Rendu Babylon | 7–9 ms | > 10 ms |
| Physique Rapier | 2–3 ms | > 4 ms |
| Gameplay + IA | 2–3 ms | > 4 ms |
| Streaming chunks | 1–2 ms | > 3 ms |
| Marge sécurité | 1–2 ms | — |

Fallback acceptable : 45 FPS (22 ms). Éviter spikes > 28 ms.

## Priorités d'optimisation (ROI décroissant)

1. **Instancing** — tout prop répété > 3 fois dans un chunk doit utiliser `InstancedMesh`
2. **Shadow map 512 fixe** — ne jamais augmenter, pas de PCF > 1 sample
3. **Culling agressif** — frustum culling + distance culling (unload chunks > 2 chunks)
4. **Densité herbe adaptative** — réduire si FPS < 50 (max 500 instances/chunk → 200)
5. **LOD ennemis** — throttle IA + simplifier mesh si > 10 ennemis actifs ou hors zone Near
6. **Texture budget** — audit `manifests.js` avant Phase 3, viser < 256 Mo total
7. **Post-process** — max 2 passes, pas de full-screen effects cumulatifs
8. **Audio lazy** — charger après premier input utilisateur uniquement

## Checklist rendu
- [ ] Instancing actif pour tous les props répétitifs
- [ ] Frustum culling activé (Babylon le fait par défaut, vérifier pas de `alwaysSelectAsActiveMesh`)
- [ ] Shadow map = 512, `useBlurExponentialShadowMap = false`
- [ ] MSAA ≤ 2x ou FXAA uniquement
- [ ] Pas de transparent objects inutiles (coûteux sur Iris Xe)
- [ ] Matériaux : limiter les variants (1 toon material par biome max)
- [ ] Textures : format compressé si possible (BC1/BC3 via Basis Universal)

## Checklist gameplay/simulation
- [ ] IA ennemis throttlée à 10 Hz hors zone Near (> 20 u du joueur)
- [ ] Pool VFX : réutiliser instances au lieu de créer/détruire chaque frame
- [ ] Rapier : colliders simples (box/capsule), pas de mesh collider sur ennemis
- [ ] Queries Rapier : cacher résultats, pas de raycast chaque frame si évitable
- [ ] Chunk streaming : unload asynchrone, pas de spike sur chargement

## Protocole de validation
1. Mesurer baseline FPS + draw calls dans la même scène avant modification
2. Appliquer une seule optimisation à la fois
3. Mesurer après : FPS moyen + 1% low + draw calls
4. Documenter résultat dans le commit
5. Confirmer pas de régression visuelle gameplay

## Seuils de dégradation contrôlée
Si FPS < 50 en gameplay :
- Réduire densité herbe de 50%
- Désactiver post-process secondaire (garder color grading, désactiver sharpen)
- Réduire distance de chargement chunks de 3x3 à 2x2

Si FPS < 40 :
- Désactiver herbe complètement
- Réduire shadow distance de 50%
- Throttle IA à 5 Hz
