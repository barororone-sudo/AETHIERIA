---
name: rpg-action-3d-master
description: "Concevoir et implémenter un gameplay RPG action-aventure 3D en vue 3e personne immersive, optimisé pour matériel milieu de gamme. Utiliser quand on veut un mix qualité AAA (exploration, combat, progression, sensation manette/clavier, performance) copie des licences existantes possible car pas de publication du jeux."
argument-hint: "Feature ou système cible (ex: combat lock-on, exploration, quête, donjon, loot, traversal)"
user-invocable: true
disable-model-invocation: false
---

# RPG Action 3D Master Workflow

## Outcome

Produire des features jouables, immersives et performantes pour un RPG action-aventure 3D en 3e personne, avec une boucle de gameplay claire et des critères de qualité vérifiables.

## Guardrails

- Ne pas copier d'assets, noms, maps ou mécaniques propriétaires exactes.
- S'inspirer des meilleures pratiques (lisibilité combat, exploration gratifiante, progression claire), pas du clonage.
- Prioriser la sensation de jeu et la stabilité avant la quantité de contenu.

## Hardware Profile Target

Profil cible (machine utilisateur):

- CPU: Intel i7-1255U
- RAM: 16 Go
- OS 64 bits, x64

Objectif perfs recommandé:

- Dev target: 60 FPS stable en 1080p (ou 45+ FPS stable si scène lourde)
- Frame pacing régulier (éviter stutter perceptible)
- Temps de chargement et hot-reload rapides

Voir [Perf Playbook](./references/perf-playbook.md).

## Trigger Keywords

RPG, action-aventure, 3rd person, immersive, combat, lock-on, stamina, exploration, quête, donjon, loot, open world, performance, optimisation, fluidité.

## Core Workflow

1. Cadrer la feature

- Définir: but joueur, entrée utilisateur, feedback attendu (visuel/son/UI), et condition de succès.
- Écrire une user story courte: "Quand je fais X, il se passe Y, et je ressens Z".

2. Vertical slice minimal

- Implémenter la version la plus petite jouable en premier.
- Inclure contrôles + feedback + règle de victoire/échec.

3. Gameplay feel pass

- Ajuster timings, vitesses, accélérations, inertie, hit windows, camera lag, lisibilité des états.
- Ajouter feedback prioritaire: anticipation, impact, recovery, signal de réussite/échec.

4. Systémisation

- Convertir constantes magiques en paramètres ajustables.
- Séparer logique gameplay, rendu, et data config.

5. Performance pass (obligatoire)

- Mesurer FPS/frame-time avant/après.
- Réduire coût GPU/CPU avec LOD, culling, instancing, batching, update throttling, simplification shaders.

6. Validation qualité

- Vérifier critères de la section "Definition of Done".
- Build propre, tests manuels complets, pas de régression majeure.

## Decision Branches

### Si le gameplay semble "mou"

- Réduire latence perçue d'entrée.
- Augmenter contrastes d'animation (accel/decel/impact).
- Renforcer feedback immédiat (VFX évoluer+ audio hooks + UI hit confirm).

### Si le combat est illisible

- Clarifier silhouettes et couleurs d'équipe/hostile.
- Réduire clutter à l'écran.
- Ajouter télégraphes d'attaque et fenêtres de dodge/parry cohérentes.

### Si l'exploration est vide

- Ajouter points d'intérêt tous les 20-45s de déplacement.
- Créer micro-récompenses régulières (collectibles, lore, défis courts).
- Introduire landmarks forts pour l'orientation.

### Si les perfs chutent

- Diminuer shadow map, draw distance, densité végétation.
- Remplacer géométrie répétitive par instancing.
- Déplacer calculs coûteux hors tick principal.
- Dégrader qualité visuelle de manière contrôlée, sans casser la lisibilité gameplay.

## Definition of Done

- Feature jouable de bout en bout sans blocage.
- Entrées réactives et sensation cohérente.
- Feedback clair sur actions importantes.
- Aucune erreur build/runtime critique.
- Performance conforme au profil cible (ou fallback documenté).
- Paramètres clés exposés pour itération rapide.

## Output Format For Agent Responses

Quand cette skill est invoquée, produire:

1. Résumé de la feature ciblée (1 paragraphe)
2. Plan d'implémentation en étapes concrètes
3. Changements de code/fichiers
4. Vérifications gameplay
5. Vérifications performance
6. Prochaines itérations (3 max)

## Example Prompts

- /rpg-action-3d-master "Implémente un lock-on caméra + strafe combat lisible et fluide"
- /rpg-action-3d-master "Fais une boucle exploration -> combat -> loot -> upgrade en vertical slice"
- /rpg-action-3d-master "Optimise la végétation et les ombres pour i7-1255U 16Go"
