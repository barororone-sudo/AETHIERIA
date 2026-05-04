# Acte II - La Pluie de Fer

## Resume

Duree cible: 20 a 30 heures.

Biome principal: ironrain, plateaux metalliques, tours de verrouillage, rivieres lumineuses conductrices, champs de debris.

Fonction narrative: passer du choc cosmique a la comprehension systemique. Le joueur apprend que le Gutter n'est pas seulement une prison: c'est une machine qui traite les restes divins. La Fracture a rallume une tour majeure, et cette tour transforme la pluie en metal vivant.

Grande decouverte: les dieux n'ont pas abandonne le Gutter. Ils l'utilisent encore.

Changement de monde majeur: la Tour d'Orval se reactive. La pluie de fer commence. Certaines zones deviennent magnetiques, les armes attirent la foudre, les ponts de fer se deplacent, les rivieres lumineuses conduisent l'energie, et les ruines peuvent etre alimentees.

## Pacing global

| Bloc | Temps cible | Contenu |
|---|---:|---|
| Migration depuis Auge-Basse | 2-3 h | consequences Acte I, route nord-est |
| Arrivee en Ironrain | 4-6 h | nouveau biome, pluie dangereuse, camp mobile |
| Guerre froide des factions | 4-6 h | Sceau vs Rupture, choix tactiques |
| Reactivation des relais | 5-7 h | trois donjons/relais, puzzles d'energie |
| Verite sur la machine | 3-5 h | archives vivantes, revelation divine |
| Finale Colosse de Fer | 3-5 h | assaut tour, boss, mutation durable |

Temps critique minimal: 13-16 h.
Temps avec side quests majeures: 23-27 h.
Completion large: 30-34 h.

## Changement de gameplay par rapport a Acte I

L'Acte II doit sentir que le monde a monte d'un cran:
- plus de verticalite;
- glide plus utile;
- zones de gravite instable plus frequentes;
- poches magnetiques qui influencent les projectiles et certains objets;
- ennemis plus blindes;
- routes qui changent selon les relais actives;
- importance plus forte du choix Sceau/Rupture.

## Lieux principaux

### La Route des Cendres Hautes

Transition entre grassland et ironrain. Elle montre les consequences Acte I:
- refugies d'Auge-Basse;
- debris encore fumants;
- patrouilles du Sceau;
- graffitis des Heritiers;
- marchands qui vendent des "casques de pluie" inutiles.

### Camp du Paratonnerre

Hub mobile de l'Acte II. Construit sous un ancien paratonnerre divin. Le camp se deplace legerement apres certaines quetes, donnant une impression de front vivant.

Avant reactivation:
- camp fatigue;
- pluie rare;
- ponts casses.

Apres reactivation:
- etincelles constantes;
- armuriers plus riches;
- blesses par metal vivant;
- nouveaux ateliers.

### La Tour d'Orval

Tour majeure de verrouillage. Elle perce presque le dome. Son sommet est invisible dans les nuages de fer. Elle a ete concue pour aspirer les lois physiques cassees et les recycler.

Gameplay:
- dungeon vertical;
- ascenseurs magnetiques;
- circuits d'eau lumineuse;
- boss final d'acte.

### Les Champs de Lames

Plaine ou la pluie de fer plante des aiguilles dans le sol. Les aiguilles creent des labyrinthes temporaires.

World state:
- avant certains relais, le chemin change souvent;
- apres stabilisation, des routes permanentes apparaissent.

### La Forge Sans Main

Donjon optionnel majeur. Une forge automatique fabrique encore des armes pour une guerre divine terminee.

## Personnages majeurs

### Nara

Elle accompagne le joueur si elle a survecu/ete soutenue Acte I.

Arc Acte II:
- passe de cartographe a ingenieure de terrain;
- cree un appareil pour predire les pluies de fer;
- peut perdre confiance si le joueur cache trop de verites.

### Soeur Eliane

Devient commandante locale des Gardiens du Sceau.

Arc:
- veut utiliser Orval pour refermer la Fracture;
- cache que la fermeture pourrait noyer certains villages sous l'eau lumineuse;
- reste sincere dans sa peur du chaos.

### Ix

Devient plus dangereux.

Arc:
- veut surcharger Orval pour agrandir la Fracture;
- promet une route vers le monde d'en haut;
- commence a entendre une voix venant du dome.

### Brann Oxydal

Forgeron du Camp du Paratonnerre. Il sait travailler le metal vivant.

Arc:
- cherche son frere avale par la Forge Sans Main;
- peut fabriquer le premier vrai equipement anti-pluie;
- deteste les deux factions.

### La Voix d'Orval

IA divine de la tour. Elle ne ment pas, mais elle pense en fonctions.

Ligne centrale: "Le Gutter fonctionne. Les pertes locales sont acceptables."

## Quetes principales

### A2_MQ01 - La premiere pluie

Objectif: escorter des refugies vers le Camp du Paratonnerre pendant une pluie de fer faible.

Gameplay:
- protection de groupe;
- apprendre les abris;
- premiers ennemis blindes.

Revelation: la pluie ne tombe pas du ciel, elle est expulsee par une tour.

World state:
- `A2_IRONRAIN_STARTED`
- meteo ironrain active dans le biome.

Temps cible: 75-105 min.

### A2_MQ02 - Le camp sous l'aiguille

Objectif: aider Brann a reparer le paratonnerre du camp.

Gameplay:
- recolte ciblee;
- defense d'atelier;
- puzzle simple de conduction avec eau lumineuse.

Revelation: l'eau lumineuse conduit les ordres de la tour.

World state:
- `A2_LIGHTWATER_CONDUCTIVE`
- atelier Acte II ouvert.

Temps cible: 60-90 min.

### A2_MQ03 - Deux plans pour une tour

Objectif: assister a une reunion entre Eliane et Ix, qui echoue.

Gameplay:
- dialogue interactif;
- attaque surprise;
- choix de sauver documents Sceau ou relais Heritiers.

Revelation: les deux factions veulent Orval, mais aucune ne comprend completement son role.

World state:
- `A2_FACTION_SPLIT_VISIBLE`
- reputation ajuste selon sauvetage.

Temps cible: 60-90 min.

### A2_MQ04 - Le relais des Lames

Objectif: stabiliser le premier relais dans les Champs de Lames.

Gameplay:
- navigation dans labyrinthe d'aiguilles;
- ennemis rapides;
- puzzle magnetique;
- mini-boss: Capitaine Ferrique.

Revelation: les relais ne controlent pas seulement la pluie, ils trient les corps et les souvenirs.

World state:
- `A2_RELAY_BLADES_ON`
- une route stable apparait dans les Champs de Lames.

Temps cible: 2-3 h.

### A2_MQ05 - Le frere de la forge

Objectif: entrer dans la Forge Sans Main pour trouver le frere de Brann.

Gameplay:
- donjon industriel;
- plateformes;
- ennemis armures;
- choix sauver le frere ou recuperer le coeur de forge intact.

Revelation: la forge fabrique des soldats avec des souvenirs de morts.

World state:
- `A2_FORGE_HEART_TAKEN`
- ou `A2_FORGE_SURVIVOR_SAVED`

Temps cible: 2-3 h.

### A2_MQ06 - L'eau qui se souvient du ciel

Objectif: suivre une riviere lumineuse jusqu'a une memoire pre-dome.

Gameplay:
- exploration calme puis combat;
- sequence narrative interactive;
- puzzle de flux.

Revelation: avant le Gutter, certains dieux ont tente de sauver leurs erreurs au lieu de les jeter. Ils ont perdu.

World state:
- `A2_PRE_DOME_MEMORY_FOUND`
- debloque dialogues profonds avec Eliane/Ix.

Temps cible: 90-120 min.

### A2_MQ07 - Le relais des Noyes

Objectif: reactiver un relais sous une zone inondee d'eau lumineuse.

Gameplay:
- traversal aquatique leger ou plateformes;
- ennemis memoire;
- choix de purifier ou drainer.

Branches:
- purifier: moins d'ennemis, plus de memoires PNJ;
- drainer: route rapide, ressources rares, perte narrative.

World state:
- `A2_RELAY_DROWNED_PURIFIED`
- ou `A2_RELAY_DROWNED_DRAINED`

Temps cible: 2-3 h.

### A2_MQ08 - Ceux d'en haut regardent

Objectif: enqueter sur un signal venu du dome.

Gameplay:
- infiltration dans poste du Sceau ou camp Heritier selon reputation;
- decodeur avec Nara;
- attaque d'un observateur celeste.

Revelation majeure: le monde d'en haut existe encore. Il surveille le Gutter et envoie des ordres a Orval.

World state:
- `A2_UPPER_WORLD_SIGNAL_CONFIRMED`
- skybox montre de breves silhouettes au-dessus de la Fracture.

Temps cible: 2 h.

### A2_MQ09 - Le relais du Tonnerre Mort

Objectif: activer le troisieme relais dans un cimetiere de machines.

Gameplay:
- grande zone ouverte;
- boss environnemental;
- puzzles de foudre;
- glide entre carcasses.

Revelation: le tonnerre mort est une ancienne arme divine recyclee en meteo.

World state:
- `A2_RELAY_DEAD_THUNDER_ON`
- acces au pied de la Tour d'Orval.

Temps cible: 2-3 h.

### A2_MQ10 - Orval demande un nom

Objectif: entrer dans la tour et repondre a l'identification de la Voix d'Orval.

Gameplay:
- dungeon vertical partie 1;
- tests de combat;
- tests de memoire;
- choix du nom symbolique du joueur.

Choix de nom:
- Cle;
- Erreur;
- Vivant;
- Dieu du Fond.

Ce choix peut etre cosmetique/narratif mais doit revenir en Acte IV.

World state:
- `A2_ORVAL_PLAYER_NAMED`

Temps cible: 90-120 min.

### A2_MQ11 - Refermer ou surcharger

Objectif: choisir une methode temporaire pour controler Orval.

Options:
- plan Eliane: refermer partiellement la Fracture;
- plan Ix: surcharger pour ouvrir plus;
- plan Nara/Brann: stabiliser sans obeir aux factions.

Consequence:
- modifie finale;
- modifie meteo;
- modifie dialogue boss;
- prepare choix Acte IV.

World state:
- `A2_ORVAL_PLAN_SEAL`
- `A2_ORVAL_PLAN_BREAK`
- `A2_ORVAL_PLAN_STABILIZE`

Temps cible: 60-90 min.

### A2_MQ12 - Le Colosse de Fer

Objectif: vaincre le protecteur d'Orval.

Boss: Colosse de Fer.

Phases:
- 100%: marche lourde, bras marteau, pluie de fer;
- 55%: attire les armes et debris, cree murs magnetiques;
- 25%: ouvre son torse, expose un coeur de memoires, arene verticale.

Revelation: le Colosse contient les souvenirs de milliers de prisonniers du Gutter qui ont choisi de devenir une barriere pour empecher le monde d'en haut de vider la decharge sur les vivants.

Choix final:
- eteindre le Colosse: Orval devient controlable, mais moins protegee;
- l'apaiser: Orval reste semi-autonome, pluie moins forte;
- le surcharger: Fracture agrandie, nouvelles routes dangereuses.

World state:
- `A2_IRON_COLOSSUS_DEFEATED`
- plus une variante selon choix.

Temps cible: 2-4 h.

## Arcs secondaires majeurs

### A2_SQ_BRANN - Le metal a memoire

Duree: 3-5 h.

Pitch: Brann apprend a forger avec du metal vivant, mais chaque arme conserve une emotion de son ancien porteur.

Etapes:
1. recolter trois alliages;
2. tester l'arme;
3. entendre la memoire dans l'arme;
4. choisir purifier ou conserver l'emotion.

Recompense:
- arme Acte II;
- variante stable ou instable.

### A2_SQ_NARA - La carte de pluie

Duree: 3-4 h.

Pitch: Nara construit une carte qui predit les pluies de fer.

Impact:
- donne des alertes meteo;
- reduit morts civiles;
- si vendue aux Mandeurs, augmente economie mais les factions militarisent la carte.

### A2_SQ_ELIANE - Les villages a sacrifier

Duree: 3-5 h.

Pitch: Eliane veut evacuer deux villages, mais n'a des ressources que pour un.

Choix:
- sauver le village proche du Sceau;
- sauver le village neutre;
- organiser une troisieme route plus difficile.

Impact:
- forte consequence reputation;
- PNJ refugies dans le camp.

### A2_SQ_IX - La porte dans l'orage

Duree: 3-5 h.

Pitch: Ix affirme qu'une tempete peut ouvrir un passage vers "dehors".

Revelation:
- le passage montre seulement une couche superieure du Gutter, pas le vrai ciel;
- Ix ment peut-etre, ou il est lui-meme trompe.

Impact:
- route secrete;
- anomalies plus fortes si terminee cote Rupture.

### A2_SQ_MANDEURS - Le prix du tonnerre

Duree: 2-4 h.

Pitch: les Mandeurs vendent des paratonnerres defectueux a des refugies.

Choix:
- exposer le scandale;
- les forcer a reparer;
- accepter un arrangement pour financer le camp.

Impact:
- economie camp;
- confiance civils;
- ressources rares.

### A2_SQ_MEMORY - Les soldats qui demandent pardon

Duree: 4-5 h.

Pitch: certains ennemis de fer contiennent des memoires humaines et demandent au joueur de les achever ou les liberer.

Impact:
- change type de spawns dans une zone;
- debloque une priere/musique au camp;
- prepare theme Acte III.

## Secrets de world state

| Flag | Declencheur | Effet visible |
|---|---|---|
| `A2_SECRET_IRONRAIN_SHELTER_NET` | Reparer 5 abris | PNJ voyageurs survivent aux pluies |
| `A2_SECRET_FORGE_SINGS` | Conserver 3 armes a memoire | la Forge Sans Main chante la nuit |
| `A2_SECRET_ORVAL_SHADOW` | Observer la tour depuis 4 angles | silhouette au-dessus du dome visible |
| `A2_SECRET_MAGNET_GARDEN` | Stabiliser aiguilles de fer | champ de plateformes flottantes |
| `A2_SECRET_COLOSSUS_NAMES` | Lire 8 plaques du Colosse | option "apaiser" plus facile |
| `A2_SECRET_NARA_TRUST` | Ne jamais mentir a Nara | elle propose la troisieme voie Acte II |

## Finale de l'Acte II

Apres le Colosse, la Tour d'Orval arrete la pluie totale mais ne revient jamais a la normale. Le joueur comprend que le Gutter est maintenu par des machines conscientes, et que ces machines recoivent encore des ordres du monde d'en haut.

Derniere image:
- Orval envoie un rayon pale vers la Fracture;
- la Fracture ne se referme pas;
- elle repond;
- sous les plaines lointaines, des racines geantes bougent;
- l'eau lumineuse devient verte dans certaines zones.

Transition vers Acte III: Les Racines Profanees.

