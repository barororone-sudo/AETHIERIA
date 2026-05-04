# Acte I - Les Cendres Calmes

## Resume

Duree cible: 20 a 30 heures.

Biome principal: grassland contamine, collines, ruines basses, villages de puisatiers, vallees de cendre douce.

Fonction narrative: faire croire au joueur qu'il commence une aventure de survie locale, puis reveler que le ciel entier est une construction artificielle.

Grande decouverte: la Fracture du Ciel.

Changement de monde majeur: apres l'Archive de Vael-Dorn, une ligne blanche fend le dome. Le ciel bleu devient violet par endroits, l'eau devient lumineuse, des debris divins tombent, des ruines caches apparaissent et la gravite devient instable autour de certains fragments.

## Pacing global

| Bloc | Temps cible | Contenu |
|---|---:|---|
| Introduction et village | 2-3 h | tutoriel, premiere menace, premiers liens PNJ |
| Exploration grassland | 4-6 h | chunks ouverts, camps, premiers secrets |
| Enquete sur Vael-Dorn | 5-7 h | archives, factions, donjon 1 |
| Fracture du Ciel | 2-3 h | set piece, mutation monde, nouveaux systemes |
| Apres-Fracture | 5-8 h | quetes secondaires mutees, anomalies, mini-donjons |
| Finale Acte I | 3-5 h | assaut, mini-boss, choix de divulgation |

Temps critique minimal: 12-15 h.
Temps avec side quests majeures: 22-26 h.
Completion large: 28-32 h.

## Lieux principaux

### Auge-Basse

Premier village. Maisons en planches, toits de metal recupere, moulins a eau sale, cloches fabriquees avec des morceaux de machines divines. Les habitants appellent le ciel "le Drap Bleu".

Etat avant Fracture:
- lumiere douce;
- ruisseaux ternes;
- habitants fatigues mais stables;
- rumeurs de monstres dans les collines.

Etat apres Fracture:
- les puits brillent la nuit;
- certains enfants entendent des voix dans l'eau;
- des routes deviennent dangereuses a cause de la gravite faible;
- les Gardiens du Sceau imposent un couvre-feu.

### Vael-Dorn

Ruine souterraine sous le plateau. Ancienne station de drainage divine. Le joueur y decouvre que le monde est sous un dome et que les rivieres sont des conduits de memoire.

Gameplay:
- premier vrai donjon;
- puzzles d'eau lumineuse;
- combats dans des salles qui changent de gravite;
- premiere activation world state majeure.

### Les Collines du Suif

Zone ouverte de depart. Herbe grasse, pierres blanches, arbres tordus. Les ennemis patrouillent autour de carcasses tombees du ciel longtemps avant le debut du jeu.

### Le Puisard des Saints Rates

Micro-donjon optionnel. Ancien lieu de culte ou les habitants priaient des machines cassees. Sert a preparer la revelation que la religion locale est basee sur des restes techniques.

### Le Chantier des Anges

Zone qui apparait apres la Fracture. Des debris tombent et forment une architecture nouvelle. Ce n'etait pas sur la carte avant.

## Personnages majeurs

### Nara

Cartographe d'Auge-Basse. Elle ne croit pas aux dieux, mais croit aux cartes. Elle devient l'ancre emotionnelle de l'Acte I.

Arc:
- veut prouver que les tremblements viennent d'une faille naturelle;
- comprend que ses cartes sont fausses parce que le monde bouge volontairement;
- peut devenir la premiere alliee technique du joueur.

Role gameplay:
- donne la carte;
- marque les anomalies;
- debloque les tours de vue locales.

### Mael le Puisatier

Chef pragmatique du village. Il cache des morts recentes pour eviter la panique.

Arc:
- demande au joueur de reparer les puits;
- s'oppose a la revelation publique;
- peut sauver ou sacrifier une partie du village selon les choix secondaires.

### Soeur Eliane

Gardienne du Sceau. Calme, severe, protectrice. Elle sait que le ciel est faux, mais pense que le mensonge sauve des vies.

Arc:
- aide le joueur contre les monstres;
- tente de fermer Vael-Dorn;
- devient un contact majeur pour la faction du Sceau.

### Ix

Messager des Heritiers de la Rupture. Il apparait apres les premiers signes de lumiere bleue chez le joueur.

Arc:
- pousse le joueur a ouvrir les archives;
- ne dit pas toute la verite;
- considere les morts civiles comme un prix acceptable.

### L'Archiviste Sans Bouche

Machine-PNJ dans Vael-Dorn. Elle parle par sous-titres et vibrations. Elle appelle le joueur "cle de vidange".

Fonction:
- donne la revelation centrale;
- declenche la Fracture;
- annonce qu'il existe cinq tours de verrouillage.

## Quetes principales

### A1_MQ01 - Le bruit sous le puits

Objectif: aider Mael a reparer un puits bloque par une creature.

Gameplay:
- tutoriel mouvement;
- premier combat;
- premiere recolte;
- interaction avec eau sale.

Revelation: le puits ne descend pas vers une nappe naturelle, mais vers une conduite taillee dans une matiere inconnue.

World state:
- `A1_WELL_REPAIRED`
- Auge-Basse ouvre ses marchands basiques.

Temps cible: 45-75 min.

### A1_MQ02 - Les enfants qui brillent

Objectif: retrouver trois enfants partis voir "les lucioles sous la pierre".

Gameplay:
- exploration des Collines du Suif;
- pistage;
- mini-camp ennemi;
- choix de route courte dangereuse ou route longue sure.

Revelation: les enfants ont vu une eau bleue sortir d'une dalle, et cette eau reagit a la presence du joueur.

World state:
- `A1_LUMEN_WATER_HINT`
- premiers ruisseaux ont une emissivite faible la nuit.

Temps cible: 60-90 min.

### A1_MQ03 - Carte d'un monde trop petit

Objectif: aider Nara a activer trois bornes de cartographie.

Gameplay:
- escalade;
- glide court;
- combat patrol;
- decouverte de panorama.

Revelation: les bornes dessinent une courbe parfaite au-dessus du monde, comme si la carte etait imprimee dans une sphere.

World state:
- `A1_CARTOGRAPHY_TRIANGLE_ON`
- affichage de trois POI sur la carte.

Temps cible: 90-120 min.

### A1_MQ04 - Le sceau sur la langue

Objectif: escorter Soeur Eliane jusqu'a un autel interdit.

Gameplay:
- escorte active;
- defense contre vagues;
- premiere rencontre avec Gardiens du Sceau.

Revelation: les Gardiens connaissent les conduites sous le monde et appellent Vael-Dorn "la bouche".

World state:
- `A1_GUARDIANS_CONTACT`
- reputation initiale Sceau +1 si Eliane survit sans etre mise a terre.

Temps cible: 75-105 min.

### A1_MQ05 - Le voleur de ciel

Objectif: poursuivre Ix, qui a vole un fragment de borne.

Gameplay:
- course/poursuite;
- combat contre scouts;
- choix de capturer Ix ou l'ecouter.

Revelation: les Heritiers disent que le ciel est "un couvercle peint".

World state:
- `A1_RUPTURE_CONTACT`
- debloque rumeurs Heritiers dans les camps.

Temps cible: 60-90 min.

### A1_MQ06 - Vael-Dorn s'ouvre

Objectif: rassembler trois clefs de drainage pour ouvrir l'entree de Vael-Dorn.

Gameplay:
- trois sous-objectifs ouverts;
- un mini-donjon;
- un duel d'elite;
- puzzle de flux d'eau.

Revelation: chaque clef est faite dans une matiere osseuse divine.

World state:
- `A1_DRAIN_KEYS_COMPLETE`
- entree Vael-Dorn visible et active.

Temps cible: 2-3 h.

### A1_MQ07 - L'Archive qui respire

Objectif: explorer Vael-Dorn.

Gameplay:
- donjon principal;
- alternance combat/puzzle;
- salles de gravite faible;
- boss intermediaire: Le Moissonneur de Boue.

Revelation: le monde est un Gutter, une decharge divine sous dome.

World state:
- `A1_VAEL_DORN_ARCHIVE_READ`
- l'Archiviste Sans Bouche reconnait le joueur.

Temps cible: 2-3 h.

### A1_MQ08 - La Fracture du Ciel

Objectif: survivre a l'activation involontaire du moteur-coeur.

Gameplay:
- set piece;
- fuite verticale;
- plateformes qui se deplacent;
- fragments qui tombent;
- retour au monde ouvert modifie.

Revelation: le joueur est une cle de vidange vivante. Le dome reagit a son energie bleue.

World state majeur:
- `SKY_DOME_FIRST_CRACK`
- skybox fracturee;
- eau lumineuse niveau 1;
- activation meshes `fractured` et `divine-debris`;
- anomalies de gravite autour des debris;
- nouveaux ennemis "veilleurs fissures".

Temps cible: 60-90 min.

### A1_MQ09 - Ceux qui veulent refermer

Objectif: choisir qui aider en premier apres la Fracture: Eliane, Ix ou Mael.

Gameplay:
- trois urgences simultanees;
- le joueur ne peut en resoudre que deux parfaitement;
- consequence hub.

Branches:
- aider Eliane: moins d'anomalies pres du village, mais Heritiers hostiles;
- aider Ix: nouvelle route vers Chantier des Anges, mais panique au village;
- aider Mael: plus de survivants civils, mais perte d'une archive.

World state:
- `A1_POST_FRACTURE_PRIORITY_GUARDIAN`
- `A1_POST_FRACTURE_PRIORITY_RUPTURE`
- `A1_POST_FRACTURE_PRIORITY_CIVILIAN`

Temps cible: 2-3 h.

### A1_MQ10 - Le Gardien des Cendres

Objectif: vaincre le mini-boss qui sort du premier debris divin.

Gameplay:
- preparation en monde ouvert;
- assaut sur le Chantier des Anges;
- mini-boss trois phases;
- gestion d'arene avec poches de gravite.

Boss: Gardien des Cendres.

Phases:
- 100%: attaques lentes, slam circulaire;
- 60%: invoque veilleurs fissures;
- 30%: casse l'arene, oblige glide et repositionnement.

Revelation: le boss n'attaque pas par haine. Il essaie de reparer la Fracture en tuant la cle vivante: le joueur.

World state:
- `A1_ASH_GUARDIAN_DEFEATED`
- debris stabilises;
- premier fragment de Verrou Celeste obtenu.

Temps cible: 2-3 h.

### A1_MQ11 - Dire ou cacher

Objectif: decider comment annoncer la verite a Auge-Basse.

Options:
- tout dire publiquement;
- laisser Eliane filtrer l'information;
- donner les preuves a Ix;
- mentir pour maintenir le calme.

Consequences:
- modifie les dialogues du hub;
- change prix marchands;
- oriente reputation Sceau/Rupture;
- prepare Acte II.

World state:
- `A1_TRUTH_PUBLIC`
- `A1_TRUTH_GUARDED`
- `A1_TRUTH_RUPTURED`
- `A1_TRUTH_BURIED`

Temps cible: 45-75 min.

## Arcs secondaires majeurs

### A1_SQ_CHILDREN - Les enfants du filtre

Duree: 2-3 h.

Pitch: les enfants sauves dans MQ02 continuent d'entendre des voix dans l'eau lumineuse.

Etapes:
1. retrouver leurs dessins;
2. suivre une voix sous un pont;
3. choisir entre detruire une memoire toxique ou la rendre a sa famille;
4. debloquer une fontaine de soin faible pres du village.

World state:
- `A1_CHILDREN_VOICES_CALMED`
- ou `A1_CHILDREN_MEMORY_RELEASED`

Impact: change l'ambiance nocturne d'Auge-Basse.

### A1_SQ_NARA - Les cartes qui mentent

Duree: 3-4 h.

Pitch: Nara veut refaire toute sa carte apres avoir compris que le monde est artificiel.

Etapes:
1. scanner trois anomalies;
2. proteger Nara pendant une mesure;
3. entrer dans une "zone sans nord";
4. choisir de publier ou cacher la carte.

Impact:
- carte plus precise;
- nouveaux POI;
- si carte publique, plus de PNJ aventuriers meurent dans les anomalies mais les marchands vendent des cartes.

### A1_SQ_MAEL - Le prix du calme

Duree: 2-4 h.

Pitch: Mael a cache des corps contamines par l'eau bleue.

Etapes:
1. trouver le charnier;
2. interroger les familles;
3. bruler, enterrer ou exposer les corps;
4. affronter une creature nee du mensonge.

Impact:
- confiance du village;
- Mael peut rester chef, demissionner ou devenir informateur du Sceau.

### A1_SQ_RUST - Les cloches de rouille

Duree: 3-5 h.

Pitch: un Mandeur de Rouille collectionne sept morceaux de cloche tombes de temples divins.

Etapes:
- chaque morceau est dans un micro-donjon;
- la cloche complete peut apaiser ou attirer les debris.

Choix final:
- donner la cloche au marchand: meilleur equipement;
- la donner au village: moins d'attaques nocturnes;
- la donner aux Heritiers: plus d'anomalies mais routes secretes.

### A1_SQ_SEAL - Les mensonges utiles

Duree: 2-3 h.

Pitch: Eliane demande de detruire trois preuves pour eviter la panique.

Consequence:
- facilite la stabilite du hub;
- ferme certaines lignes de dialogue;
- augmente Sceau.

### A1_SQ_RUPTURE - Les portes qui n'existent pas

Duree: 2-4 h.

Pitch: Ix montre au joueur des portes invisibles qui apparaissent seulement quand l'eau lumineuse est proche.

Consequence:
- debloque shortcuts;
- augmente Rupture;
- expose des civils a une zone dangereuse.

## Secrets de world state

| Flag | Declencheur | Effet visible |
|---|---|---|
| `A1_SECRET_SKY_SEAM_01` | Atteindre le plus haut pic avant MQ08 | une ligne blanche tres faible apparait au coucher du soleil |
| `A1_SECRET_WATER_MEMORY_01` | Boire l'eau lumineuse apres MQ08 | flash memoire, buff stamina court, risque de spawn |
| `A1_SECRET_BELL_COMPLETE` | Finir la cloche de rouille | modifie attaques nocturnes |
| `A1_SECRET_CARTOGRAPHER_TRUTH` | Publier la carte de Nara | PNJ explorateurs apparaissent en monde ouvert |
| `A1_SECRET_GRAVITY_GARDEN` | Stabiliser 3 poches de gravite | jardin flottant accessible |
| `A1_SECRET_ASH_NAME` | Lire 5 steles du Gardien | le boss a une ligne de dialogue speciale |

## Finale de l'Acte I

Le joueur bat le Gardien des Cendres et obtient le premier fragment de Verrou Celeste. L'Archiviste explique que quatre autres tours stabilisent le dome. Une de ces tours, au nord-est, vient de se rallumer sous l'effet de la Fracture.

Derniere image:
- la nuit tombe;
- une pluie de petites particules metalliques commence;
- les habitants pensent que c'est de la cendre;
- Nara tend la main;
- une particule traverse sa paume et s'enfonce dans le sol comme une graine de fer.

Transition vers Acte II: La Pluie de Fer.

