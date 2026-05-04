# GUTTER GOD - Index Quetes Et World State

Ce fichier sert de pont entre narration et implementation. Les IDs peuvent etre repris dans `gameplay/storyData.js`, `gameplay/QuestEngine.ts` ou `world/WorldStateManager.ts`.

## Etats globaux principaux

| ID | Acte | Type | Effet attendu |
|---|---:|---|---|
| `WORLD_NORMAL` | 1 | base | ciel bleu faux, eau non emissive, ruines fracturees cachees |
| `A1_LUMEN_WATER_HINT` | 1 | hint | certains points d'eau brillent faiblement la nuit |
| `A1_VAEL_DORN_ARCHIVE_READ` | 1 | story | archives de Vael-Dorn lues, dialogues factions etendus |
| `SKY_DOME_FIRST_CRACK` | 1 | major | skybox fracturee, eau emissive, debris divins actifs, gravite locale |
| `A1_ASH_GUARDIAN_DEFEATED` | 1 | boss | Chantier des Anges stabilise, fragment de Verrou Celeste obtenu |
| `A2_IRONRAIN_STARTED` | 2 | biome | meteo pluie de fer active dans ironrain |
| `A2_LIGHTWATER_CONDUCTIVE` | 2 | system | eau lumineuse utilisee pour puzzles/conduction |
| `A2_RELAY_BLADES_ON` | 2 | dungeon | route stable dans Champs de Lames |
| `A2_RELAY_DROWNED_PURIFIED` | 2 | branch | zone noyee apaisee, plus de memoires PNJ |
| `A2_RELAY_DROWNED_DRAINED` | 2 | branch | zone noyee drainee, plus de ressources, moins de memoires |
| `A2_UPPER_WORLD_SIGNAL_CONFIRMED` | 2 | major | silhouettes/ordres du monde d'en haut visibles par moments |
| `A2_RELAY_DEAD_THUNDER_ON` | 2 | dungeon | acces Tour d'Orval |
| `A2_ORVAL_PLAN_SEAL` | 2 | choice | finale orientee Sceau, Fracture reduite localement |
| `A2_ORVAL_PLAN_BREAK` | 2 | choice | finale orientee Rupture, anomalies augmentees |
| `A2_ORVAL_PLAN_STABILIZE` | 2 | choice | troisieme voie, stabilite imparfaite |
| `A2_IRON_COLOSSUS_DEFEATED` | 2 | boss | Acte II termine, Orval semi-active |

## Quetes principales Acte I

| ID | Nom | Duree cible | Debloque |
|---|---|---:|---|
| `A1_MQ01` | Le bruit sous le puits | 45-75 min | hub basique |
| `A1_MQ02` | Les enfants qui brillent | 60-90 min | indice eau lumineuse |
| `A1_MQ03` | Carte d'un monde trop petit | 90-120 min | carte POI |
| `A1_MQ04` | Le sceau sur la langue | 75-105 min | contact Sceau |
| `A1_MQ05` | Le voleur de ciel | 60-90 min | contact Rupture |
| `A1_MQ06` | Vael-Dorn s'ouvre | 2-3 h | entree donjon |
| `A1_MQ07` | L'Archive qui respire | 2-3 h | revelation Gutter |
| `A1_MQ08` | La Fracture du Ciel | 60-90 min | world state majeur |
| `A1_MQ09` | Ceux qui veulent refermer | 2-3 h | priorite post-fracture |
| `A1_MQ10` | Le Gardien des Cendres | 2-3 h | fragment Verrou Celeste |
| `A1_MQ11` | Dire ou cacher | 45-75 min | branche Acte II |

## Quetes secondaires Acte I

| ID | Nom | Duree cible | Impact |
|---|---|---:|---|
| `A1_SQ_CHILDREN` | Les enfants du filtre | 2-3 h | fontaine de soin ou memoire liberee |
| `A1_SQ_NARA` | Les cartes qui mentent | 3-4 h | POI et verite publique |
| `A1_SQ_MAEL` | Le prix du calme | 2-4 h | statut politique du village |
| `A1_SQ_RUST` | Les cloches de rouille | 3-5 h | attaques nocturnes/routes/equipement |
| `A1_SQ_SEAL` | Les mensonges utiles | 2-3 h | reputation Sceau |
| `A1_SQ_RUPTURE` | Les portes qui n'existent pas | 2-4 h | shortcuts et anomalies |

## Quetes principales Acte II

| ID | Nom | Duree cible | Debloque |
|---|---|---:|---|
| `A2_MQ01` | La premiere pluie | 75-105 min | biome ironrain actif |
| `A2_MQ02` | Le camp sous l'aiguille | 60-90 min | atelier Acte II |
| `A2_MQ03` | Deux plans pour une tour | 60-90 min | conflit factions |
| `A2_MQ04` | Le relais des Lames | 2-3 h | route Champs de Lames |
| `A2_MQ05` | Le frere de la forge | 2-3 h | forge ou survivant |
| `A2_MQ06` | L'eau qui se souvient du ciel | 90-120 min | memoire pre-dome |
| `A2_MQ07` | Le relais des Noyes | 2-3 h | branche purifier/drainer |
| `A2_MQ08` | Ceux d'en haut regardent | 2 h | signal monde superieur |
| `A2_MQ09` | Le relais du Tonnerre Mort | 2-3 h | acces Orval |
| `A2_MQ10` | Orval demande un nom | 90-120 min | nom symbolique joueur |
| `A2_MQ11` | Refermer ou surcharger | 60-90 min | choix finale |
| `A2_MQ12` | Le Colosse de Fer | 2-4 h | fin Acte II |

## Quetes secondaires Acte II

| ID | Nom | Duree cible | Impact |
|---|---|---:|---|
| `A2_SQ_BRANN` | Le metal a memoire | 3-5 h | arme stable/instable |
| `A2_SQ_NARA` | La carte de pluie | 3-4 h | alertes meteo |
| `A2_SQ_ELIANE` | Les villages a sacrifier | 3-5 h | refugies et reputation |
| `A2_SQ_IX` | La porte dans l'orage | 3-5 h | route secrete/anomalies |
| `A2_SQ_MANDEURS` | Le prix du tonnerre | 2-4 h | economie camp |
| `A2_SQ_MEMORY` | Les soldats qui demandent pardon | 4-5 h | spawns et ambiance |

## Tags implementation

Tags de meshes recommandes:
- `worldState:fractured`
- `worldState:divine-debris`
- `worldState:ironrain`
- `worldState:orval-active`
- `worldState:lumen-water`
- `worldState:gravity-pocket`
- `worldState:route-stable`
- `worldState:route-broken`

Tags de materiaux recommandes:
- `mat:water-lumen`
- `mat:sky-normal`
- `mat:sky-fractured`
- `mat:iron-wet`
- `mat:memory-ghost`

## Regles de chargement

Pour tenir la perf:
- les world states ne doivent pas charger tout le monde d'un coup;
- chaque flag active seulement les meshes du chunk charge;
- les props repetes restent Thin Instances;
- les changements de materiaux doivent reutiliser des materiaux partages;
- les effets sky/water doivent etre des variations de parametres, pas de nouveaux post-process lourds.

## Priorite de production

Ordre recommande:

1. Implementer `SKY_DOME_FIRST_CRACK` visuel.
2. Ajouter `A1_MQ01` a `A1_MQ03` comme vertical slice.
3. Ajouter Vael-Dorn en donjon court.
4. Brancher `A1_MQ08` pour prouver la mutation monde.
5. Ajouter `A2_IRONRAIN_STARTED` comme meteo simple.
6. Ajouter un relais Acte II avec route qui s'ouvre.

