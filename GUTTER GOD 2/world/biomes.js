// world/biomes.js — définitions des 5 biomes

export const BIOMES = {
  grassland: {
    name:        'grassland',
    fogColor:    { r: 0.55, g: 0.65, b: 0.50 },
    fogDensity:  0.007,
    ambientMult: 1.0,
    texture:     'assets/free-packs/Grass005_2K-JPG/Grass005_2K-JPG_Color.jpg',
    normalMap:   'assets/free-packs/Grass005_2K-JPG/Grass005_2K-JPG_NormalGL.jpg',
    roughness:   'assets/free-packs/Grass005_2K-JPG/Grass005_2K-JPG_Roughness.jpg',
    hdri:        'assets/free-packs/PolyHaven_HDRI/overcast_soil_puresky_2k.hdr',
    music:       'assets/audio/music/act1_exploration.mp3',
    ambiance:    'assets/audio/ambiance/forest.mp3',
    props: ['CommonTree_1','CommonTree_3','Bush_Common','Rock_Medium_1','Rock_Medium_2','Mushroom_Common','Fern_1'],
  },
  ashlands: {
    name:        'ashlands',
    fogColor:    { r: 0.35, g: 0.28, b: 0.22 },
    fogDensity:  0.022,
    ambientMult: 0.7,
    texture:     'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_Color.jpg',
    normalMap:   'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_NormalGL.jpg',
    roughness:   'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_Roughness.jpg',
    hdri:        'assets/free-packs/PolyHaven_HDRI/overcast_soil_puresky_2k.hdr',
    music:       'assets/audio/music/combat_general.mp3',
    ambiance:    'assets/audio/ambiance/dungeon.mp3',
    props: ['DeadTree_1','DeadTree_3','TwistedTree_1','Rock_Medium_3'],
  },
  ironrain: {
    name:        'ironrain',
    fogColor:    { r: 0.25, g: 0.28, b: 0.32 },
    fogDensity:  0.030,
    ambientMult: 0.6,
    texture:     'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_Color.png',
    normalMap:   'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_NormalGL.png',
    roughness:   'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_Roughness.png',
    hdri:        'assets/free-packs/PolyHaven_HDRI/overcast_soil_puresky_2k.hdr',
    music:       'assets/audio/music/combat_general.mp3',
    ambiance:    'assets/audio/ambiance/dungeon.mp3',
    props: ['DeadTree_2','TwistedTree_2'],
  },
  rootblight: {
    name:        'rootblight',
    fogColor:    { r: 0.18, g: 0.25, b: 0.18 },
    fogDensity:  0.028,
    ambientMult: 0.65,
    texture:     'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_Color.jpg',
    normalMap:   'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_NormalGL.jpg',
    roughness:   'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG_Roughness.jpg',
    hdri:        'assets/free-packs/PolyHaven_HDRI/overcast_soil_puresky_2k.hdr',
    music:       'assets/audio/music/combat_general.mp3',
    ambiance:    'assets/audio/ambiance/forest.mp3',
    props: ['TwistedTree_3','TwistedTree_5','DeadTree_4','Mushroom_Laetiporus','Rock_Medium_2'],
  },
  schism: {
    name:        'schism',
    fogColor:    { r: 0.15, g: 0.10, b: 0.18 },
    fogDensity:  0.035,
    ambientMult: 0.5,
    texture:     'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_Color.png',
    normalMap:   'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_NormalGL.png',
    roughness:   'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG_Roughness.png',
    hdri:        'assets/free-packs/PolyHaven_HDRI_Night/moonlit_golf_2k.hdr',
    music:       'assets/audio/music/boss_battle.mp3',
    ambiance:    'assets/audio/ambiance/dungeon.mp3',
    props: ['DeadTree_5','TwistedTree_4'],
  },
};

// Acte → biome (corrigé)
export const ACT_BIOME_MAP = {
  1: 'grassland',
  2: 'ironrain',
  3: 'rootblight',
  4: 'schism',
  5: 'schism',
};

export function getBiomeForAct(act) {
  return BIOMES[ACT_BIOME_MAP[act] ?? 'grassland'];
}
