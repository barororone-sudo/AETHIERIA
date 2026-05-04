# GUTTER GOD — Asset Catalogue
**Version 2.0 — Audit complet des fichiers réels dans free-packs/**
**Tous les chemins sont vérifiés et exacts**

---

## PERSONNAGES

### Joueur
| Usage | Fichier | Chemin |
|---|---|---|
| Animations combat (idle, attaque, dodge, stagger, glide) | UAL2_Standard.glb | `free-packs/Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb` |
| Animations locomotion (walk, jog, sprint, jump, fall, land) | UAL1_Standard.glb | `free-packs/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb` |
| Mannequin féminin (optionnel) | Mannequin_F.glb | `free-packs/Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Female Mannequin/Unreal-Godot/Mannequin_F.glb` |

### Ennemis (Quaternius glTF — free-packs/glTF/)
| Type ennemi | Mesh assigné | Fichier |
|---|---|---|
| scout | Goblin | `free-packs/glTF/Goblin_Male.gltf` |
| armored | Knight | `free-packs/glTF/Knight_Male.gltf` |
| elite | Knight Golden | `free-packs/glTF/Knight_Golden_Male.gltf` |
| mutant | Zombie | `free-packs/glTF/Zombie_Male.gltf` |
| elite_territorial (Phase 4) | Knight Golden (scale 1.3x) | `free-packs/glTF/Knight_Golden_Male.gltf` |

### Mini-boss (Ultimate Monsters — free-packs/Ultimate Monsters/)
| Acte | Nom | Mesh | Chemin |
|---|---|---|---|
| 1 | Gardien des Cendres | Orc.gltf | `free-packs/Ultimate Monsters/Big/glTF/Orc.gltf` |
| 2 | Colosse de Fer | Yeti.gltf | `free-packs/Ultimate Monsters/Big/glTF/Yeti.gltf` |
| 3 | Gardien Corrompu | Demon.gltf | `free-packs/Ultimate Monsters/Big/glTF/Demon.gltf` |
| 5 | Gutter God (boss final) | Dragon.gltf | `free-packs/Ultimate Monsters/Flying/glTF/Dragon.gltf` |

### Squelettes KayKit (réserve Phase 4)
| Mesh | Chemin |
|---|---|
| Skeleton_Warrior.glb | `free-packs/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Warrior.glb` |
| Skeleton_Mage.glb | `free-packs/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Mage.glb` |
| Skeleton_Rogue.glb | `free-packs/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Rogue.glb` |
| Skeleton_Minion.glb | `free-packs/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Minion.glb` |
| Animations générales | `free-packs/KayKit_Skeletons_1.1_FREE/Animations/gltf/Rig_Medium/Rig_Medium_General.glb` |
| Animations locomotion | `free-packs/KayKit_Skeletons_1.1_FREE/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb` |

### PNJ marchands (Phase 4 — free-packs/glTF/)
| Rôle | Mesh | Fichier |
|---|---|---|
| Marchand Gardiens | Knight_Golden_Male | `free-packs/glTF/Knight_Golden_Male.gltf` |
| Marchand Héritiers | Wizard | `free-packs/glTF/Wizard.gltf` |
| Marchand neutre | OldClassy_Male | `free-packs/glTF/OldClassy_Male.gltf` |

### Réserve personnages disponibles (non utilisés)
Goblin_Female, Elf, Ninja_Male/Female, Viking_Male/Female, Witch, Pirate_Male/Female, Soldier_Male/Female, BlueSoldier_Male/Female, Casual_*, Chef_*, Doctor_*, Kimono_*, Suit_*, Worker_*, Cowboy_*, Alpaca, Bull, Cow, Deer, Donkey, Fox, Horse, Husky, Pug, ShibaInu, Stag, Wolf

---

## TEXTURES TERRAIN

| Biome | Pack | Fichiers utilisés | Chemin |
|---|---|---|---|
| grassland | Grass005_2K-JPG | Color, NormalGL, Roughness, AO | `free-packs/Grass005_2K-JPG/` |
| ashlands | Ground103_2K-JPG | Color, NormalGL, Roughness, AO | `free-packs/Ground103_2K-JPG/` |
| ironrain | Rock064_2K-PNG | Color, NormalGL, Roughness, AO | `free-packs/Rock064_2K-PNG/` |
| rootblight | Ground103_2K-JPG | Color, NormalGL, Roughness, AO | `free-packs/Ground103_2K-JPG/` |
| schism | Rock064_2K-PNG | Color, NormalGL, Roughness, AO | `free-packs/Rock064_2K-PNG/` |

**Réserve textures (non utilisées) :**
- `free-packs/Ice003_2K-PNG/` — zones glacées optionnelles
- `free-packs/Lava004_2K-PNG/` — zones de lave optionnelles
- `free-packs/Snow014_2K-PNG/` — zones enneigées optionnelles

---

## PROPS MONDE 3D

### Stylized Nature MegaKit (free-packs/Stylized Nature MegaKit[Standard]/glTF/)

| Biome | Props utilisés | Fichiers |
|---|---|---|
| grassland | Arbres, buissons, rochers, champignons, fougères | CommonTree_1/2/3/4/5.gltf, Bush_Common.gltf, Rock_Medium_1/2.gltf, Mushroom_Common.gltf, Fern_1.gltf |
| ashlands | Arbres morts, arbres tordus, rochers | DeadTree_1/3.gltf, TwistedTree_1.gltf, Rock_Medium_3.gltf |
| ironrain | Arbres morts, arbres tordus | DeadTree_2.gltf, TwistedTree_2.gltf |
| rootblight | Arbres tordus, champignons, rochers | TwistedTree_3/5.gltf, DeadTree_4.gltf, Mushroom_Laetiporus.gltf, Rock_Medium_2.gltf |
| schism | Arbres morts, arbres tordus | DeadTree_5.gltf, TwistedTree_4.gltf |

**Réserve Stylized Nature (non utilisés) :**
Pine_1–5, Clover_1/2, Flower_3/4 (Group/Single), Petal_1–5, Grass_Common_Short/Tall, Grass_Wispy_Short/Tall, Plant_1/1_Big/7/7_Big, Pebble_Round_1–5, Pebble_Square_1–6, RockPath_Round/Square variants, Bush_Common_Flowers

### Kenney Castle Kit (free-packs/Kenney_Castle_Kit/Models/GLB format/)

| Biome | Props utilisés |
|---|---|
| ashlands | rocks-large.glb, tower-square-base.glb |
| ironrain | rocks-large.glb, rocks-small.glb, wall-narrow.glb, tower-base.glb |
| rootblight | wall-corner.glb |
| schism | rocks-large.glb, tower-square.glb, wall-corner.glb, siege-tower-demolished.glb |

**Réserve Castle Kit :** bridges, gates, flags, stairs, wall variants (Phase 4 landmarks)

### Medieval Village MegaKit (free-packs/Medieval Village MegaKit[Standard]/glTF/)
**Usage Phase 4 — Landmarks villages**

Disponibles : Wall_Plaster/UnevenBrick variants, Door_1/2/4/8 (Flat/Round), DoorFrame variants, Window variants, Roof variants, Floor variants, Stairs variants, Props (Crate, Wagon, Chimney, Fence, Vine), Balcony variants

### Kenney Fantasy Town (réserve Phase 4)
Chemin : `free-packs/Kenney_Fantasy_Town/Models/`

---

## HDRI

| Usage | Fichier | Chemin |
|---|---|---|
| Actes 1–3 (overcast) | overcast_soil_puresky_2k.hdr | `free-packs/PolyHaven_HDRI/overcast_soil_puresky_2k.hdr` |
| Actes 4–5 (nuit) | moonlit_golf_2k.hdr | `free-packs/PolyHaven_HDRI_Night/moonlit_golf_2k.hdr` |
| Réserve (sunset) | golden_bay_2k.hdr | `free-packs/PolyHaven_HDRI_Sunset/golden_bay_2k.hdr` |
| Réserve (overcast 2) | overcast_soil_puresky_2k.hdr | `free-packs/PolyHaven_HDRI_Overcast/overcast_soil_puresky_2k.hdr` |
| Réserve (external) | kloofendal_48d_partly_cloudy_puresky_2k.hdr | `external/hdri/` |
| Réserve (external) | qwantani_puresky_2k.hdr | `external/hdri/` |
| Réserve (external) | studio_small_08_2k.hdr | `external/hdri/` |

---

## AUDIO SFX (Kenney CC0)

### Kenney Impact Sounds (free-packs/Kenney_Impact_Sounds/Audio/)
| Clé SFX | Fichiers |
|---|---|
| hit_light | impactPunch_medium_000–002 |
| hit_heavy | impactMetal_heavy_000–002 |
| hit_armored | impactPlate_heavy_000–002 |
| dodge | impactSoft_medium_000–001 |
| death_enemy | impactWood_heavy_000–001 |
| death_player | impactBell_heavy_000–001 |
| footstep_grass | footstep_grass_000–003 |
| footstep_concrete | footstep_concrete_000–002 |

### Kenney RPG Audio (free-packs/Kenney_RPG_Audio/Audio/)
| Clé SFX | Fichiers |
|---|---|
| sword_swing | knifeSlice, knifeSlice2 |
| sword_draw | drawKnife1–3 |
| interact | bookOpen |
| chest_open | metalLatch |

### Kenney Interface Sounds (free-packs/Kenney_Interface_Sounds/Audio/)
| Clé SFX | Fichiers |
|---|---|
| ui_open | maximize_001 |
| ui_close | minimize_001 |
| ui_confirm | confirmation_001–002 |
| ui_select | select_001–002 |
| loot_pickup | drop_001–002 |
| xp_gain | confirmation_002 |

---

## AUDIO MUSIQUE ET AMBIANCE

| Usage | Fichier | Chemin |
|---|---|---|
| Acte 1 exploration | act1_exploration.mp3 | `audio/music/act1_exploration.mp3` |
| Combat général (Actes 2–3) | combat_general.mp3 | `audio/music/combat_general.mp3` |
| Boss battle | boss_battle.mp3 | `audio/music/boss_battle.mp3` |
| Victoire | victory.mp3 | `audio/music/victory.mp3` |
| Ambiance grassland/rootblight | forest.mp3 | `audio/ambiance/forest.mp3` |
| Ambiance ashlands/ironrain/schism | dungeon.mp3 | `audio/ambiance/dungeon.mp3` |

---

## ICÔNES INVENTAIRE (free-packs/Icons/)

| Item | Icône |
|---|---|
| monster-core | Crystal1.png |
| iron-shard | Mineral.png |
| armor-fragment | Armor_Metal.png |
| health-potion | Potion1_Filled_Red.png |
| elite-core | Crystal2.png |
| rare-gem | Crystal3.png |
| rune-fragment | Crystal4.png |
| memory-shard | Crystal5.png |
| veilleur-relic | Crown.png |
| survivor-map | Parchment.png |
| rune-stone | Key1.png |
| mutant-tissue | Bone.png |
| faction-seal | Ring1.png |
| faction-mark | Ring2.png |

---

## VFX (réserve Phase 5)

| Pack | Contenu | Chemin |
|---|---|---|
| Brackeys VFX Bundle | Flipbooks particules (fire, smoke, magic, impact) | `free-packs/brackeys_vfx_bundle/flipbooks/` |
| Kenney Particle Pack | Sprites particules PNG transparents | `free-packs/Kenney_Particle_Pack/PNG (Transparent)/` |

---

## ASSETS NON UTILISÉS — RÉSERVE COMPLÈTE

| Pack | Contenu | Usage potentiel |
|---|---|---|
| KayKit Skeletons | 4 squelettes GLB + animations | Ennemis undead Phase 4 |
| Medieval Village MegaKit | Bâtiments modulaires complets | Landmarks villages Phase 4 |
| Fantasy Props MegaKit | Props fantasy variés | Décoration intérieure landmarks |
| Kenney Fantasy Town | Village modulaire | Hubs faction Phase 4 |
| Kenney Nature Kit | Arbres, rochers OBJ | Backup végétation |
| Kenney Survival Kit | Props survie | Camps, interactables |
| Kenney Pirate Kit | Props pirate | Décoration côtière |
| Kenney Platformer Kit | Props plateforme | Zones de traversal |
| Ultimate Animated Animals | Animaux animés glTF | Faune biomes Phase 5 |
| Ultimate House Interior Pack | Intérieurs modulaires | Donjons intérieurs Phase 4 |
| Updated Modular Dungeon | Donjon modulaire FBX/OBJ | Donjons Phase 4 (à convertir glTF) |
| Ultimate RPG Items Pack | Items 3D (armes, potions) | Props loot 3D Phase 5 |
| Ultimate Nature Pack | Nature variée | Backup végétation |
| Kenney Medieval RTS | Sprites RTS | UI minimap Phase 5 |
| Kenney RPG Base | Sprites RPG | UI inventaire Phase 5 |
| Kenney Tiny Dungeon | Tileset donjon | Minimap donjon Phase 5 |
| Kenney Foliage | Sprites feuillage | Particules feuilles Phase 5 |
| Kenney Game Icons | Icônes jeu | UI Phase 5 |
| Kenney UI Pack | UI complète | Menus Phase 5 |
| Kenney UI RPG | UI RPG | Panels Phase 5 |
| Kenney Fantasy UI | UI fantasy | Thème UI Phase 5 |
| 1. Free Hologram Interface Wenrexa | UI hologramme | UI sci-fi optionnelle |
| Monsters Blob/Flying variants | Autres monstres | Ennemis optionnels Phase 5 |
| external/community/khronos/ | DamagedHelmet, Fox, BarramundiFish GLB | Tests/lab uniquement |
