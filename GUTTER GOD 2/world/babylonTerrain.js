// world/babylonTerrain.js — AAA terrain (10km+ world)
// Multi-octave noise with biome-driven shaping:
//   • Continents (massive low-freq)  → plains, plateaus, valleys
//   • Mountains (mid-freq ridged)    → peaks, ridges, cliffs
//   • Erosion (high-freq detail)     → gullies, micro-relief
//   • Desert dunes (directional)     → sand waves, oases
//   • Canyons (river carving)        → carved gorges
//   • Biome modulation               → each biome shapes its terrain differently
//
// Terrain mesh streams around player (regenerated when chunk changes).
// Splatmap shader: grass/dirt/rock/sand blended by slope + biome + height.
// Iris Xe optimized: 120×120 subdivs, single draw call.

import {
  MeshBuilder, StandardMaterial, Color3,
  Texture, ShaderMaterial, Effect, Vector3, Ray,
} from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';
import { CONFIG }        from '../core/config.js';
import { getWorld, getRapier } from '../engine/babylon/physics.js';

// ── Multiple noise layers (each seeded differently) ──────────────────────
const _continent  = createNoise2D(() => 0.42);   // huge landmasses
const _mountain   = createNoise2D(() => 0.73);   // ridged mountains
const _hills      = createNoise2D(() => 0.15);   // rolling hills
const _erosion    = createNoise2D(() => 0.88);   // micro erosion
const _detail     = createNoise2D(() => 0.31);   // fine detail
const _dune       = createNoise2D(() => 0.56);   // desert dunes
const _canyon      = createNoise2D(() => 0.64);   // river/canyon carving
const _biomeField = createNoise2D(() => 0.42);   // same seed as EcosystemManager

let _terrainMesh = null;
let _heightfieldBody = null;

const TERRAIN_COLLIDER_TAG = 'terrain';
const _groundRayOrigin = new Vector3();
const _groundRayDir = new Vector3(0, -1, 0);
const _groundRay = new Ray(_groundRayOrigin, _groundRayDir, 320);
const _groundFallback = {
  hit: false,
  y: 0,
  normal: Vector3.Up(),
  source: 'height-function',
  distance: 0,
};

const SUBDIVS = 120;                               // higher res for AAA quality
const SIZE    = CONFIG.world.chunkSize * 10;        // 320u visible terrain
const H_BASE  = CONFIG.world.terrainHeight;         // 7.0 base amplitude

// ── Biome influence on terrain (matches EcosystemManager) ────────────────
const BIOME_SCALE = 0.0008;

function _getBiomeInfluence(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  const distNorm = dist / 5000;
  const n = _biomeField(x * BIOME_SCALE, z * BIOME_SCALE);

  // Returns a terrain shaping profile per biome region
  // Grassland: rolling hills with some mountains visible in distance
  if (distNorm < 0.15) return { type: 'grassland', flat: 0.25, mountain: 0.45, dune: 0.0, canyon: 0.15 };

  // Schism: extreme mountains, deep canyons — endgame zone
  if (distNorm > 0.85) return { type: 'schism', flat: 0.0, mountain: 0.95, dune: 0.0, canyon: 0.7 };

  if (n < -0.3) {
    // Rootblight or Ironrain — craggy mountains, deep carved valleys
    return { type: 'craggy', flat: 0.05, mountain: 0.75, dune: 0.0, canyon: 0.5 };
  }
  if (n > 0.5) {
    // Ashlands — desert with dunes and mesas
    return { type: 'desert', flat: 0.5, mountain: 0.15, dune: 0.85, canyon: 0.2 };
  }

  // Grassland — rolling hills, visible mountain ranges
  return { type: 'grassland', flat: 0.2, mountain: 0.4, dune: 0.0, canyon: 0.15 };
}

// ── Ridged noise for mountain peaks ──────────────────────────────────────
function _ridgedNoise(x, z, freq) {
  const n = _mountain(x * freq, z * freq);
  return 1.0 - Math.abs(n); // creates sharp ridges
}

// ── Terrain height function — THE core of the world ──────────────────────

export function getTerrainHeight(x, z) {
  const s = CONFIG.world.terrainScale;  // 0.022
  const biome = _getBiomeInfluence(x, z);

  // ── 1. Continent-scale (massive foundation — valleys & highlands) ──
  const cont1 = _continent(x * s * 0.15, z * s * 0.15) * H_BASE * 1.2;
  const cont2 = _continent(x * s * 0.4, z * s * 0.4) * H_BASE * 0.5;
  const continent = cont1 + cont2;

  // ── 2. Mountain ridges (ridged noise → towering peaks & cliff faces)
  const ridge1 = _ridgedNoise(x, z, s * 0.5) * H_BASE * 2.8;
  const ridge2 = _ridgedNoise(x, z, s * 1.2) * H_BASE * 1.5;
  const ridge3 = _ridgedNoise(x, z, s * 2.5) * H_BASE * 0.6;
  const rawMountain = ridge1 * 0.55 + ridge2 * 0.30 + ridge3 * 0.15;
  // Power curve: pushes peaks higher, valleys flatter → dramatic contrast
  const mountains = Math.pow(rawMountain / H_BASE, 1.4) * H_BASE * biome.mountain;

  // ── 3. Cliff generator (steep walls via threshold noise) ───────────
  const cliffN = _mountain(x * s * 0.7 + 50, z * s * 0.7 + 50);
  const cliffThreshold = 0.35;
  const cliffStrength = cliffN > cliffThreshold
    ? Math.pow((cliffN - cliffThreshold) / (1 - cliffThreshold), 0.6) * H_BASE * 2.0
    : 0;
  const cliffs = cliffStrength * biome.mountain * 0.8;

  // ── 4. Rolling hills ───────────────────────────────────────────────
  const hill1 = _hills(x * s * 0.8, z * s * 0.8) * H_BASE * 0.45;
  const hill2 = _hills(x * s * 2.0, z * s * 2.0) * H_BASE * 0.22;
  const hill3 = _hills(x * s * 4.5, z * s * 4.5) * H_BASE * 0.10;
  const hills = (hill1 + hill2 + hill3) * (1.0 - biome.flat * 0.7);

  // ── 5. Desert dunes (directional waves with height variation) ──────
  const duneAngle = 0.3;
  const duneX = x * Math.cos(duneAngle) + z * Math.sin(duneAngle);
  const duneZ = -x * Math.sin(duneAngle) + z * Math.cos(duneAngle);
  const dune1 = Math.sin(duneX * s * 2.5 + _dune(duneX * s * 0.3, duneZ * s * 0.3) * 3.0);
  const dune2 = Math.sin(duneX * s * 6.0 + duneZ * s * 1.5) * 0.35;
  const duneEnvelope = Math.max(0, _dune(x * s * 0.2, z * s * 0.2));
  const dunes = (dune1 * 0.65 + dune2) * H_BASE * 0.7 * biome.dune * duneEnvelope;

  // ── 6. Canyon carving (deep gorges) ────────────────────────────────
  const canyonN = _canyon(x * s * 0.4, z * s * 0.4);
  const canyonWidth = 0.06;
  const canyonRaw = smoothstep(canyonWidth, 0.0, Math.abs(canyonN));
  const canyonDepth = canyonRaw * H_BASE * 1.2;
  const canyonCarve = -canyonDepth * biome.canyon;

  // ── 7. Valley carving (wide basins between mountains) ──────────────
  const valleyN = _continent(x * s * 0.25 + 200, z * s * 0.25 + 200);
  const valley = valleyN < -0.3
    ? (valleyN + 0.3) * H_BASE * 0.8 * (1 - biome.flat)
    : 0;

  // ── 8. Erosion detail (micro-relief for realism) ───────────────────
  const erosion1 = _erosion(x * s * 5.0, z * s * 5.0) * H_BASE * 0.10;
  const erosion2 = _detail(x * s * 10.0, z * s * 10.0) * H_BASE * 0.05;
  const erosion3 = _detail(x * s * 22.0, z * s * 22.0) * H_BASE * 0.02;

  // ── 9. Spawn area flat zone ────────────────────────────────────────
  const dist = Math.sqrt(x * x + z * z);
  const spawnFlat = Math.max(0, 1 - dist / 30);

  // ── 10. Oasis depression (desert biome — shallow pools) ────────────
  const oasisN = _detail(x * s * 0.3, z * s * 0.3);
  const oasisDip = (oasisN > 0.55 && biome.dune > 0.3)
    ? -(oasisN - 0.55) * H_BASE * 4.0
    : 0;

  // ── 11. Plateau / mesa (flat-topped desert features) ───────────────
  const plateauN = _continent(x * s * 0.35 + 100, z * s * 0.35 + 100);
  const plateau = (plateauN > 0.45 && biome.type === 'desert')
    ? Math.min((plateauN - 0.45) * H_BASE * 5, H_BASE * 2.5)
    : 0;

  // ── COMBINE ────────────────────────────────────────────────────────
  const raw = continent + mountains + cliffs + hills + dunes +
              canyonCarve + valley + erosion1 + erosion2 + erosion3 +
              oasisDip + plateau;

  // Clamp: no terrain below -5 (avoids blue-sky holes) and soft floor
  const combined = raw * (1 - spawnFlat);
  return Math.max(-5, combined);
}

export function isTerrainCollider(mesh) {
  return mesh?.metadata?.gutterCollider === TERRAIN_COLLIDER_TAG;
}

export function getTerrainGroundAt(scene, x, z, options = {}) {
  const {
    rayStartY = 180,
    rayLength = 320,
    result = null,
  } = options;
  const out = result ?? _groundFallback;

  const analyticalY = getTerrainHeight(x, z);

  if (!scene || !_terrainMesh || _terrainMesh.isDisposed?.()) {
    out.hit = false;
    out.y = analyticalY;
    out.normal = Vector3.Up();
    out.source = 'height-function';
    out.distance = 0;
    return out;
  }

  _groundRayOrigin.set(x, rayStartY, z);
  _groundRay.length = rayLength;
  const pick = scene.pickWithRay(_groundRay, isTerrainCollider, true);

  if (pick?.hit && pick.pickedPoint) {
    const normal = pick.getNormal(true, true) ?? Vector3.Up();
    normal.normalize();
    out.hit = true;
    out.y = pick.pickedPoint.y;
    out.normal = normal;
    out.source = 'terrain-raycast';
    out.distance = pick.distance;
    return out;
  }

  out.hit = false;
  out.y = analyticalY;
  out.normal = Vector3.Up();
  out.source = 'height-function';
  out.distance = 0;
  return out;
}

// ── Smooth step helper ───────────────────────────────────────────────────
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Terrain init ─────────────────────────────────────────────────────────

export function initTerrain(scene, biome) {
  const nPts = SUBDIVS + 1;

  _terrainMesh = MeshBuilder.CreateGround('terrain', {
    width: SIZE, height: SIZE,
    subdivisions: SUBDIVS,
    updatable: true,
  }, scene);

  // Deform vertices
  const positions = _terrainMesh.getVerticesData('position');
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = getTerrainHeight(positions[i], positions[i + 2]);
  }
  _terrainMesh.updateVerticesData('position', positions);
  _terrainMesh.createNormals(true);

  // ── Splatmap terrain material ──────────────────────────────────────────
  const useTextures = CONFIG.features.useTerrainTextures;
  if (useTextures) {
    _terrainMesh.material = _createSplatmapMaterial(scene, biome);
  } else {
    _terrainMesh.material = _createProceduralSplatMaterial(scene, biome);
  }

  _terrainMesh.receiveShadows = true;
  _terrainMesh.isPickable = true;
  _terrainMesh.checkCollisions = true;
  _terrainMesh.metadata = {
    ...(_terrainMesh.metadata ?? {}),
    gutterCollider: TERRAIN_COLLIDER_TAG,
    cameraCollider: true,
    havokReady: true,
  };

  // Heightfield Rapier
  const rapier = getRapier();
  const world  = getWorld();
  if (rapier && world) {
    try {
      const heights = new Float32Array(nPts * nPts);
      for (let row = 0; row < nPts; row++) {
        for (let col = 0; col < nPts; col++) {
          const wx = -SIZE / 2 + (col / SUBDIVS) * SIZE;
          const wz = -SIZE / 2 + (row / SUBDIVS) * SIZE;
          heights[row * nPts + col] = getTerrainHeight(wx, wz);
        }
      }
      const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
      const colDesc = rapier.ColliderDesc.heightfield(
        SUBDIVS, SUBDIVS, heights, { x: SIZE, y: 1.0, z: SIZE }
      );
      world.createCollider(colDesc, body);
      _heightfieldBody = body;
    } catch (err) {
      console.warn('[TERRAIN] Heightfield collider failed:', err);
    }

    // Safety floor
    const safeBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(0, -10, 0)
    );
    const safePlane = rapier.ColliderDesc.cuboid(SIZE * 2, 0.5, SIZE * 2);
    world.createCollider(safePlane, safeBody);
  }

  return _terrainMesh;
}

// ── Procedural splatmap shader ───────────────────────────────────────────
// 5-color blending: grass / dirt / rock / sand / snow
// + biome-driven palette + height gradient

function _createProceduralSplatMaterial(scene, biome) {
  const vertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 worldViewProjection;
    uniform mat4 world;

    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vUV;
    varying float vSlope;
    varying float vHeight;

    void main() {
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
      vUV = uv;
      vSlope = 1.0 - max(0.0, vWorldNormal.y);
      vHeight = wp.y;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vUV;
    varying float vSlope;
    varying float vHeight;

    uniform vec3 grassColor;
    uniform vec3 dirtColor;
    uniform vec3 rockColor;
    uniform vec3 sandColor;
    uniform vec3 snowColor;
    uniform vec3 fogColor;
    uniform float fogDensity;
    uniform vec3 lightDir;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise2D(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      v += noise2D(p * 1.0) * 0.5;
      v += noise2D(p * 2.3) * 0.25;
      v += noise2D(p * 5.1) * 0.125;
      return v;
    }

    void main() {
      // Triplanar UVs
      vec2 uvXZ = vWorldPos.xz * 0.12;
      vec2 uvXY = vWorldPos.xy * 0.12;
      vec2 uvYZ = vWorldPos.yz * 0.12;

      vec3 blend = abs(vWorldNormal);
      blend = pow(blend, vec3(4.0));
      blend /= (blend.x + blend.y + blend.z + 0.001);

      // Procedural textures per layer
      float grassNoise = fbm(uvXZ * 3.5) * 0.3 + 0.7;
      float dirtNoise  = fbm(uvXZ * 2.5 + vec2(100.0)) * 0.35 + 0.65;
      float sandNoise  = fbm(uvXZ * 4.0 + vec2(200.0)) * 0.15 + 0.85;

      // Rock triplanar (no stretching on cliffs)
      float rockTop   = fbm(uvXZ * 1.8 + vec2(300.0));
      float rockSide  = fbm(uvXY * 1.8 + vec2(300.0));
      float rockFront = fbm(uvYZ * 1.8 + vec2(300.0));
      float rockNoise = (rockTop * blend.y + rockSide * blend.z + rockFront * blend.x) * 0.3 + 0.7;

      // ── Splatmap blending ──────────────────────────────────────────
      // Slope-based
      float slopeSmooth = smoothstep(0.12, 0.40, vSlope);  // grass→dirt
      float rockSmooth  = smoothstep(0.32, 0.60, vSlope);  // dirt→rock

      // Height-based: sand at low points, snow at peaks (scaled for H_BASE=28)
      float sandFactor = smoothstep(2.0, -8.0, vHeight) * 0.6;
      float snowFactor = smoothstep(40.0, 60.0, vHeight) * (1.0 - vSlope);

      // Height rock exposure — more rock at altitude
      float heightRock = smoothstep(5.0, 25.0, abs(vHeight)) * 0.25;
      rockSmooth = min(1.0, rockSmooth + heightRock);

      // ── Color mixing ───────────────────────────────────────────────
      vec3 grassFinal = grassColor * grassNoise;
      vec3 dirtFinal  = dirtColor * dirtNoise;
      vec3 rockFinal  = rockColor * rockNoise;
      vec3 sandFinal  = sandColor * sandNoise;
      vec3 snowFinal  = snowColor * (0.9 + fbm(uvXZ * 2.0) * 0.1);

      // Layer blending
      vec3 baseColor = mix(grassFinal, dirtFinal, slopeSmooth);
      baseColor = mix(baseColor, rockFinal, rockSmooth);
      baseColor = mix(baseColor, sandFinal, sandFactor);
      baseColor = mix(baseColor, snowFinal, snowFactor);

      // Micro detail
      float microDetail = noise2D(vWorldPos.xz * 0.8) * 0.06 - 0.03;
      baseColor += microDetail;

      // ── Normal perturbation ────────────────────────────────────────
      float eps = 0.3;
      float hL = fbm((vWorldPos.xz + vec2(-eps, 0.0)) * 2.0);
      float hR = fbm((vWorldPos.xz + vec2( eps, 0.0)) * 2.0);
      float hD = fbm((vWorldPos.xz + vec2(0.0, -eps)) * 2.0);
      float hU = fbm((vWorldPos.xz + vec2(0.0,  eps)) * 2.0);
      vec3 pertNormal = normalize(vWorldNormal + vec3(hL - hR, 0.0, hD - hU) * 0.35);

      // ── Lighting ───────────────────────────────────────────────────
      float NdotL = max(0.0, dot(pertNormal, -lightDir));
      vec3 diffuse = lightColor * NdotL * 0.7;

      // Hemisphere ambient (sky/ground gradient)
      float hemi = pertNormal.y * 0.5 + 0.5;
      vec3 ambient = ambientColor * 0.4;
      ambient += mix(vec3(0.08, 0.06, 0.04), vec3(0.18, 0.22, 0.30), hemi) * 0.35;

      // Rim light for dramatic mountain edges
      float rim = 1.0 - max(0.0, dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)));
      rim = pow(rim, 3.0) * 0.08;

      vec3 finalColor = baseColor * (diffuse + ambient) + rim;

      // ── Fog (exponential²) ─────────────────────────────────────────
      float fogDist = length(vWorldPos.xz);
      float fogFactor = 1.0 - exp(-fogDensity * fogDist * fogDensity * fogDist);
      fogFactor = clamp(fogFactor, 0.0, 1.0);
      finalColor = mix(finalColor, fogColor, fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  Effect.ShadersStore['terrainSplatVertexShader'] = vertexShader;
  Effect.ShadersStore['terrainSplatFragmentShader'] = fragmentShader;

  // ── Biome color palettes (5 layers now) ────────────────────────────────
  const BIOME_COLORS = {
    grassland: {
      grass: new Color3(0.28, 0.52, 0.18),
      dirt:  new Color3(0.38, 0.28, 0.18),
      rock:  new Color3(0.42, 0.40, 0.38),
      sand:  new Color3(0.72, 0.65, 0.45),
      snow:  new Color3(0.92, 0.94, 0.96),
    },
    ashlands: {
      grass: new Color3(0.30, 0.22, 0.15),
      dirt:  new Color3(0.25, 0.18, 0.12),
      rock:  new Color3(0.38, 0.32, 0.28),
      sand:  new Color3(0.55, 0.42, 0.30),
      snow:  new Color3(0.50, 0.45, 0.40),  // ash-covered
    },
    ironrain: {
      grass: new Color3(0.18, 0.25, 0.20),
      dirt:  new Color3(0.22, 0.20, 0.22),
      rock:  new Color3(0.38, 0.35, 0.40),
      sand:  new Color3(0.35, 0.33, 0.30),
      snow:  new Color3(0.60, 0.62, 0.68),  // metallic
    },
    rootblight: {
      grass: new Color3(0.15, 0.40, 0.18),
      dirt:  new Color3(0.20, 0.28, 0.15),
      rock:  new Color3(0.30, 0.32, 0.28),
      sand:  new Color3(0.45, 0.42, 0.30),
      snow:  new Color3(0.78, 0.82, 0.75),  // mossy
    },
    schism: {
      grass: new Color3(0.18, 0.12, 0.25),
      dirt:  new Color3(0.15, 0.10, 0.18),
      rock:  new Color3(0.30, 0.22, 0.35),
      sand:  new Color3(0.25, 0.20, 0.28),
      snow:  new Color3(0.55, 0.48, 0.62),  // void frost
    },
  };

  const colors = BIOME_COLORS[biome.name] ?? BIOME_COLORS.grassland;

  const mat = new ShaderMaterial('terrainSplat', scene, {
    vertex: 'terrainSplat',
    fragment: 'terrainSplat',
  }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: [
      'worldViewProjection', 'world',
      'grassColor', 'dirtColor', 'rockColor', 'sandColor', 'snowColor',
      'fogColor', 'fogDensity',
      'lightDir', 'lightColor', 'ambientColor',
    ],
  });

  mat.setColor3('grassColor', colors.grass);
  mat.setColor3('dirtColor',  colors.dirt);
  mat.setColor3('rockColor',  colors.rock);
  mat.setColor3('sandColor',  colors.sand);
  mat.setColor3('snowColor',  colors.snow);
  mat.setColor3('fogColor',   new Color3(biome.fogColor.r, biome.fogColor.g, biome.fogColor.b));
  mat.setFloat('fogDensity',  biome.fogDensity);
  mat.setVector3('lightDir',  new Vector3(-0.5, -1.0, -0.3));
  mat.setColor3('lightColor', new Color3(1.0, 0.95, 0.85));
  mat.setColor3('ambientColor', new Color3(0.4, 0.42, 0.5));
  mat.backFaceCulling = true;

  return mat;
}

// ── Texture-based splatmap (when useTerrainTextures = true) ──────────────

function _createSplatmapMaterial(scene, biome) {
  const TEX_PATHS = {
    grassland: {
      grass: 'assets/free-packs/Grass005_2K-JPG/Grass005_2K-JPG',
      dirt:  'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      rock:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
    },
    ashlands: {
      grass: 'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      dirt:  'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      rock:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
    },
    ironrain: {
      grass: 'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
      dirt:  'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      rock:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
    },
    rootblight: {
      grass: 'assets/free-packs/Grass005_2K-JPG/Grass005_2K-JPG',
      dirt:  'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      rock:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
    },
    schism: {
      grass: 'assets/free-packs/Ground103_2K-JPG/Ground103_2K-JPG',
      dirt:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
      rock:  'assets/free-packs/Rock064_2K-PNG/Rock064_2K-PNG',
    },
  };

  const paths = TEX_PATHS[biome.name] ?? TEX_PATHS.grassland;
  const grassExt = paths.grass.includes('JPG') ? '.jpg' : '.png';
  const dirtExt  = paths.dirt.includes('JPG')  ? '.jpg' : '.png';
  const rockExt  = paths.rock.includes('JPG')  ? '.jpg' : '.png';

  Effect.ShadersStore['terrainTexVertexShader'] = `
    precision highp float;
    attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform mat4 worldViewProjection; uniform mat4 world;
    varying vec3 vWorldPos; varying vec3 vWorldNormal; varying vec2 vUV; varying float vSlope;
    void main() {
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
      vUV = uv;
      vSlope = 1.0 - max(0.0, vWorldNormal.y);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  Effect.ShadersStore['terrainTexFragmentShader'] = `
    precision highp float;
    varying vec3 vWorldPos; varying vec3 vWorldNormal; varying vec2 vUV; varying float vSlope;
    uniform sampler2D grassTex; uniform sampler2D grassNorm;
    uniform sampler2D dirtTex; uniform sampler2D rockTex; uniform sampler2D rockNorm;
    uniform vec3 fogColor; uniform float fogDensity; uniform vec3 lightDir;
    void main() {
      vec2 tiledUV = vWorldPos.xz * 0.12;
      vec3 blend = abs(vWorldNormal); blend = pow(blend, vec3(4.0)); blend /= (blend.x+blend.y+blend.z+0.001);
      vec3 grassCol = texture2D(grassTex, tiledUV).rgb;
      vec3 dirtCol  = texture2D(dirtTex, tiledUV).rgb;
      vec3 rockXZ = texture2D(rockTex, vWorldPos.xz*0.1).rgb;
      vec3 rockXY = texture2D(rockTex, vWorldPos.xy*0.1).rgb;
      vec3 rockYZ = texture2D(rockTex, vWorldPos.yz*0.1).rgb;
      vec3 rockCol = rockXZ*blend.y + rockXY*blend.z + rockYZ*blend.x;
      vec3 grassN = texture2D(grassNorm, tiledUV).rgb * 2.0 - 1.0;
      vec3 rockN  = texture2D(rockNorm, tiledUV).rgb * 2.0 - 1.0;
      float slopeSmooth = smoothstep(0.12, 0.35, vSlope);
      float rockSmooth  = smoothstep(0.30, 0.55, vSlope);
      vec3 baseColor = mix(grassCol, dirtCol, slopeSmooth);
      baseColor = mix(baseColor, rockCol, rockSmooth);
      vec3 normalPert = mix(grassN, rockN, rockSmooth);
      vec3 finalN = normalize(vWorldNormal + normalPert * 0.25);
      float NdotL = max(0.0, dot(finalN, -lightDir));
      float hemi = finalN.y * 0.5 + 0.5;
      vec3 light = vec3(1.0,0.95,0.85)*NdotL*0.65 + mix(vec3(0.1,0.08,0.05),vec3(0.2,0.22,0.3),hemi)*0.45;
      vec3 finalColor = baseColor * light;
      float fogDist = length(vWorldPos.xz);
      float fogF = 1.0 - exp(-fogDensity*fogDist*fogDensity*fogDist);
      finalColor = mix(finalColor, fogColor, clamp(fogF,0.0,1.0));
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const mat = new ShaderMaterial('terrainTex', scene, {
    vertex: 'terrainTex', fragment: 'terrainTex',
  }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: ['worldViewProjection', 'world', 'fogColor', 'fogDensity', 'lightDir'],
    samplers: ['grassTex', 'grassNorm', 'dirtTex', 'rockTex', 'rockNorm'],
  });

  mat.setTexture('grassTex',  new Texture(paths.grass + '_Color' + grassExt, scene));
  mat.setTexture('grassNorm', new Texture(paths.grass + '_NormalGL' + grassExt, scene));
  mat.setTexture('dirtTex',   new Texture(paths.dirt  + '_Color' + dirtExt, scene));
  mat.setTexture('rockTex',   new Texture(paths.rock  + '_Color' + rockExt, scene));
  mat.setTexture('rockNorm',  new Texture(paths.rock  + '_NormalGL' + rockExt, scene));
  mat.setColor3('fogColor',   new Color3(biome.fogColor.r, biome.fogColor.g, biome.fogColor.b));
  mat.setFloat('fogDensity',  biome.fogDensity);
  mat.setVector3('lightDir',  new Vector3(-0.5, -1.0, -0.3));
  mat.backFaceCulling = true;

  return mat;
}

export function getTerrainMesh() { return _terrainMesh; }
