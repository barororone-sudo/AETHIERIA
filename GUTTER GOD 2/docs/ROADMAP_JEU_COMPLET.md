# GUTTER GOD 2 — Roadmap d'Expansion (De Moteur à Jeu Complet)

Cette roadmap détaille les prochaines étapes de développement pour transformer la base technique actuelle (moteur procédural, déplacement, combat basique) en un véritable Action-RPG complet et profond.

---

## Phase 1 : Game Flow et Habillage (Le Cadre)
Avant d'ajouter du contenu, il faut que le jeu ressemble à un jeu, avec un début, un milieu et une fin (ou une mort).
- [ ] **Menus Principaux :** Création de l'écran-titre ("GUTTER GOD"), Menu de Pause (Échap) et paramètres (volume, sensibilité).
- [ ] **Boucle de Mort :** Écran "YOU DIED", animation de mort fluide, et réapparition à des points de contrôle (feux de camp/sanctuaires).
- [ ] **Design Sonore (V1) :** Spatialisation audio, bruits de pas dynamiques selon le sol, cris des ennemis, et transition musicale Exploration ↔ Combat.

## Phase 2 : Profondeur des Combats et IA
Le "spam attack" ne suffit pas, les combats doivent nécessiter de la stratégie.
- [ ] **Défense Active :** Implémentation du système de Parade (Parry) avec fenêtre de timing pour déstabiliser l'ennemi, et du Blocage (Bouclier/Arme) qui consomme la Stamina.
- [ ] **Spécialisations (Magie/Skills) :** Ajout de compétences avec des temps de recharge (Cooldowns) ou une jauge de ressource (Mana/Rage). Exemple : attaque lourde chargée, dash magique, sort de zone.
- [ ] **Diversité Bestiaire :** 
  - Ennemis à distance (Archers, Mages avec projectiles esquivables).
  - Ennemis furtifs ou volants (Patrouilles qui donnent l'alerte).
  - Comportements tactiques (les ennemis reculent si le joueur spamme, ou attaquent en groupe de façon coordonnée).

## Phase 3 : Systèmes RPG, Loot et Crafting
Le joueur doit avoir envie de farmer et d'explorer pour devenir plus fort.
- [ ] **Inventaire Visuel (Équipement 3D) :** Changer d'arme (épée classique vs grande hache) ou d'armure modifie le modèle 3D du personnage in-game.
- [ ] **Système de Loot & Rareté :** Les ennemis lâchent du butin (Blanc/Commun, Vert/Peu Commun, Bleu/Rare, Violet/Épique) avec des statistiques générées aléatoirement (+X% de dégâts de feu, +X HP).
- [ ] **Économie :** Ajout de matériaux récoltables (minerais, plantes) dans l'environnement procédural. Ajout d'une interface de fabrication (Crafting) pour améliorer les armes.
- [ ] **Marchands :** Des PNJ spécifiques permettant d'acheter/vendre le butin avec un système de pièces d'or ou d'âmes.

## Phase 4 : Level Design Intentionnel et Narration
Rompre la monotonie de la génération procédurale avec du "fait-main".
- [ ] **Points d'Intérêt (POI) :** Le générateur de monde doit injecter des camps de bandits, des ruines ou des tours structurées, construits avec le *Free Pack*.
- [ ] **Donjons Instanciés :** Des zones fermées (grottes, châteaux) chargées séparément du monde ouvert, avec des énigmes, de la verticalité, et un boss à la fin.
- [ ] **PNJ et Système de Dialogues :** Implémentation de PNJ pacifiques, avec une UI de boîte de texte et un arbre de choix de dialogues (Accepter quête / Refuser / Demander plus d'infos).

## Phase 5 : "Juice" et Polish (Sensation de Jeu)
Rendre chaque action percutante et visuellement gratifiante.
- [ ] **Hit Feel :** *Hit stops* (la caméra et l'animation figent pendant quelques millisecondes sur un gros coup critique), secousses de caméra (Camera Shake) proportionnelles aux impacts.
- [ ] **VFX Avancés :** Effets de particules (sang, étincelles magiques, trainées d'armes améliorées).
- [ ] **Séquences Cinématiques :** De très courtes scènes scriptées pour introduire les combats de Boss.
- [ ] **Polissage UI :** Animations fluides dans les menus, alertes de loot bien intégrées, indicateurs de dégâts flottants "damage numbers" esthétiques.