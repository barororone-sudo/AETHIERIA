# GUTTER GOD 2 — Prompts Complets Pour Exécuter Toute la Roadmap

Utilise ces prompts un par un dans Copilot/ChatGPT/Claude pour implémenter chaque bloc du plan.
Chaque prompt est écrit pour être directement copié-collé.

---

## Règles Globales (à coller avant chaque prompt si besoin)

```text
Contexte projet:
- Jeu: GUTTER GOD 2 (action-RPG 3D, Babylon.js + Rapier + Vite)
- Cible perf: Intel i7-1255U / Iris Xe, 60 FPS cible
- Contrainte: pas de Three.js hors /lab/
- Contrainte: changements incrémentaux, sans casser l'existant

Exigences de sortie:
1) Lire et modifier uniquement les fichiers nécessaires.
2) Préserver le style de code existant.
3) Ajouter tests ou checks quand pertinent.
4) Fournir un résumé des changements + fichiers touchés.
5) Exécuter build/tests après modifications et corriger les erreurs introduites.
```

---

## PHASE 1 — Game Flow, Menus, Mort, Audio

### Prompt 1.1 — Menu principal + navigation
```text
Implémente un vrai menu principal pour GUTTER GOD 2.
Objectifs:
- Ajouter un écran titre avant l'entrée en jeu.
- Boutons: Nouvelle partie, Continuer, Paramètres, Quitter (désactivé si web).
- Intégration propre avec le bootstrap existant.
- Continuer charge la sauvegarde si elle existe, sinon nouvelle partie.
- UI responsive desktop/mobile.

Contraintes:
- Réutiliser les patterns existants de ui/.
- Ne pas casser le démarrage actuel du jeu.
- Ajouter un état global simple "menu|loading|playing|paused|dead".

Livrables:
- Code complet prêt à build.
- Liste des fichiers modifiés.
- Vérification manuelle: entrée jeu fonctionne et retour menu possible.
```

### Prompt 1.2 — Pause menu (ESC)
```text
Ajoute un menu pause complet.
Objectifs:
- Touche ESC: toggle pause/reprise.
- Pendant pause: gameplay/physique/IA stoppés (ou dt=0), rendu possible.
- Menu pause: Reprendre, Sauvegarder, Paramètres, Retour menu principal.

Détails:
- Éviter les fuites d'inputs (pas d'attaque en cliquant l'UI).
- Afficher visuellement l'état PAUSE.
- Si déjà en menu principal, ESC ne lance pas pause.

Validation:
- Tester transitions playing -> paused -> playing.
- Aucun crash sur ouverture/fermeture répétée.
```

### Prompt 1.3 — Écran de mort + respawn checkpoint
```text
Implémente la boucle de mort.
Objectifs:
- Quand HP <= 0: passer en état DEAD.
- Afficher écran "YOU DIED" avec options: Réapparaître, Charger sauvegarde, Retour menu.
- Ajouter checkpoints simples (position + acte + timestamp).
- Réapparition au dernier checkpoint valide avec HP partiel configurable.

Contraintes:
- Intégrer proprement avec babylonPlayerHealth.js et save/load existants.
- Éviter softlock après mort.

Validation:
- Simuler mort en debug.
- Vérifier respawn et reprise gameplay.
```

### Prompt 1.4 — Audio V1 (spatial + états)
```text
Mets en place Audio V1 orienté immersion.
Objectifs:
- Ajouter SFX: pas, impacts, esquive, UI click.
- Pas dynamiques selon matériau sol (terre/pierre/herbe au minimum).
- Musique adaptative: exploration <-> combat.
- Volume master/music/sfx dans paramètres + persisté.

Contraintes perf:
- Préchargement raisonnable, éviter spam playback.
- Limiter instances audio simultanées.

Validation:
- Vérifier transitions audio sans coupure brutale.
- Vérifier persistance des volumes.
```

---

## PHASE 2 — Combat Avancé + IA

### Prompt 2.1 — Parry + block
```text
Ajoute un système de défense active.
Objectifs:
- Block maintenu: réduit dégâts, consomme stamina.
- Parry timing: fenêtre courte qui stagger l'ennemi.
- Feedback visuel/sonore distinct block vs parry réussi.

Détails techniques:
- Ajouter états combat côté joueur (blocking, parryWindow, parrySuccess).
- Ajouter réaction côté ennemis (staggerTimer, interruption attaque).
- Exposer données au HUD.

Validation:
- Cas tests: parry parfait, block simple, stamina vide.
```

### Prompt 2.2 — Compétences actives (cooldowns)
```text
Implémente 3 compétences actives joueur:
1) Heavy Strike (gros dégâts mono cible)
2) Dash Slash (mobilité offensive)
3) Shockwave (zone courte)

Exigences:
- Cooldown individuel par compétence.
- Coût stamina ou mana.
- Raccourcis clavier configurables.
- UI cooldown claire dans le HUD.

Validation:
- Impossible de lancer si coût/cooldown non valide.
- Pas de conflit avec combo de base.
```

### Prompt 2.3 — Ennemis distance + projectiles
```text
Ajoute un archétype ennemi à distance.
Objectifs:
- Nouveau type: Archer (ou Mage).
- IA: garde la distance optimale, kite léger, tire projectiles.
- Projectiles avec hitbox, vitesse, durée de vie.
- Possibilité d'esquiver/parry certains projectiles.

Contraintes:
- Intégration dans spawn système existant.
- Perf safe (pooling projectiles recommandé).

Validation:
- Spawns mixtes mêlée/distance fonctionnels.
```

### Prompt 2.4 — Coordination IA en groupe
```text
Améliore l'IA de groupe.
Objectifs:
- Éviter que tous les ennemis attaquent en même temps.
- Rôles simples: engage, flank, pressure.
- Système de "tour d'attaque" léger basé sur cooldown de groupe.

Validation:
- Combats plus lisibles et moins chaotiques.
- Pas de freeze IA quand beaucoup d'ennemis.
```

---

## PHASE 3 — RPG, Loot, Crafting, Économie

### Prompt 3.1 — Inventaire robuste + équipement
```text
Refactorise/complète le système d'inventaire.
Objectifs:
- Slots: arme, casque, armure, bottes, accessoire.
- Stats dérivées du gear (attaque, défense, crit, etc.).
- Équiper/déséquiper via UI panel.
- Sauvegarde/chargement complet de l'équipement.

Validation:
- Reconnexion: équipement intact.
- Stats recalculées sans erreur.
```

### Prompt 3.2 — Rareté loot + génération stats
```text
Ajoute un système de loot avec rareté.
Objectifs:
- Tiers: commun, peu commun, rare, épique, légendaire.
- Génération d'affixes simples (ex: +% crit, +HP, +stamina regen).
- Drop tables par type d'ennemi.
- Tooltip détaillé en UI.

Validation:
- Distribution probabiliste cohérente.
- Aucun item invalide généré.
```

### Prompt 3.3 — Crafting V1
```text
Implémente Crafting V1.
Objectifs:
- Ressources monde: minerai, bois, tissu, essence.
- Recettes: arme de base, potion, upgrade armure.
- Interface crafting dans panels.
- Consommation correcte des ressources.

Validation:
- Craft impossible si ressources insuffisantes.
- Résultat item correctement ajouté à l'inventaire.
```

### Prompt 3.4 — Marchands + économie
```text
Ajoute un système marchand.
Objectifs:
- PNJ marchand avec inventaire dynamique.
- Achat/vente avec monnaie.
- Prix influencés par rareté + coefficient acte.
- Feedback clair (transaction réussie/échouée).

Validation:
- Transactions atomiques (pas de duplication d'items).
- Sauvegarde de la monnaie et stock marchand.
```

---

## PHASE 4 — Level Design Intentionnel + Narration

### Prompt 4.1 — POI handcrafted injectés dans le procédural
```text
Intègre des POI conçus à la main dans le monde procédural.
Objectifs:
- Types de POI: camp bandit, ruine, sanctuaire.
- Génération contrôlée (distance minimale entre POI, pas de chevauchement).
- Spawns cohérents autour des POI (ennemis, loot, interactables).

Contraintes:
- Respecter chunk streaming existant.
- Maintenir perf stable.

Validation:
- Les POI apparaissent de manière crédible et variée.
```

### Prompt 4.2 — Donjons instanciés
```text
Implémente un système de donjons instanciés.
Objectifs:
- Entrées de donjons dans le monde ouvert.
- Chargement d'une scène/zone dédiée (instance).
- Progression interne simple: entrée -> objectifs -> boss -> sortie.
- Retour propre au monde ouvert.

Validation:
- Pas de perte d'état joueur/inventaire lors des transitions.
```

### Prompt 4.3 — Dialogues PNJ + choix
```text
Crée un système de dialogues à choix.
Objectifs:
- UI dialogue avec portrait/nom/texte.
- Choix du joueur (accepter/refuser/poser question).
- Branching simple avec conséquences (faction/récompense).
- Connexion aux quêtes existantes.

Validation:
- Les choix persistent.
- Quêtes se déclenchent correctement.
```

### Prompt 4.4 — Pipeline narratif minimal
```text
Structure le pipeline narratif pour Actes 1-2.
Objectifs:
- Uniformiser format données de quêtes, dialogues, triggers.
- Ajouter vérifications de cohérence (IDs, dépendances, récompenses).
- Ajouter outil debug pour suivre progression narrative en runtime.

Validation:
- Aucune quête orpheline.
- Debug overlay narratif lisible.
```

---

## PHASE 5 — Polish, Juice, Optimisation

### Prompt 5.1 — Hit feel avancé
```text
Ajoute du game feel sur les impacts.
Objectifs:
- Hit stop court sur impacts lourds.
- Camera shake contextuel.
- Flash/frame feedback sur coup critique.
- VFX d'impact selon type d'arme.

Validation:
- Feedback percutant sans nausée ni surcharge visuelle.
```

### Prompt 5.2 — VFX avancés + readability
```text
Améliore les VFX en gardant la lisibilité.
Objectifs:
- Trails d'arme, sparks, ground slash, death burst.
- Qualité VFX adaptative selon perf.
- Prioriser lisibilité des télégraphes ennemis.

Validation:
- VFX n'obstruent pas la lecture des attaques.
```

### Prompt 5.3 — Cinématiques légères boss
```text
Implémente des mini-cinématiques d'intro boss.
Objectifs:
- Contrôle caméra scripté 3-6 secondes.
- Lock input joueur pendant intro.
- Skip possible après 1ère vision.

Validation:
- Transitions fluides intro -> combat.
- Aucun blocage contrôle après cinématique.
```

### Prompt 5.4 — Pass perf final
```text
Fais une passe d'optimisation finale orientée i7-1255U / Iris Xe.
Objectifs:
- Mesurer draw calls, CPU frame time, GPU bottlenecks.
- Optimiser chunks, instancing, LOD, pooling.
- Établir profil qualité Low/Medium/High.

Livrables:
- Rapport perf avant/après.
- Paramètres recommandés par défaut.
- Liste des hotspots restants.
```

---

## Prompts de Contrôle Qualité (à lancer après chaque phase)

### Prompt QA-1 — Validation fonctionnelle
```text
Fais une revue complète de la phase implémentée.
- Liste bugs bloquants, majeurs, mineurs.
- Repro steps précis.
- Proposition de correctifs prioritaires.
- Vérification que rien de la phase précédente n'a régressé.
```

### Prompt QA-2 — Revue architecture
```text
Analyse l'architecture des changements récents.
- Détecte couplages excessifs, dette technique, duplications.
- Propose refactorings minimaux et sûrs.
- Donne un plan concret en 3 étapes max.
```

### Prompt QA-3 — Stabilisation release
```text
Prépare une mini-release stable.
- Corriger bugs critiques.
- Nettoyer logs/debug temporaires.
- Mettre à jour docs utilisateur + changelog.
- Vérifier build de production et tests.
```

---

## Ordre d'exécution recommandé

1) Prompts 1.1 -> 1.4
2) QA-1 + QA-2
3) Prompts 2.1 -> 2.4
4) QA-1 + QA-2
5) Prompts 3.1 -> 3.4
6) QA-1 + QA-2
7) Prompts 4.1 -> 4.4
8) QA-1 + QA-2
9) Prompts 5.1 -> 5.4
10) QA-1 + QA-2 + QA-3

---

## Prompt Méta (pour exécuter par sprint de 1 semaine)

```text
Agis comme lead dev gameplay sur GUTTER GOD 2.
Objectif du sprint: [COLLER ICI 1 bloc ex: Prompt 2.1 + 2.2]

Contraintes:
- Ne pas casser les phases déjà validées.
- Priorité à la stabilité, puis qualité de sensation, puis contenu.
- Livrer en petites PR logiques.

Sortie attendue:
1) Plan technique (court)
2) Implémentation complète
3) Tests/checks exécutés
4) Résumé des fichiers modifiés
5) Risques restants
```
