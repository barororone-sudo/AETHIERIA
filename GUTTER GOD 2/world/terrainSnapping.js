// world/terrainSnapping.js — Align props to terrain slope via normal sampling
// No prop should ever float. Rocks embed, trees stand vertical, structures tilt gently.

import { Vector3, Quaternion } from '@babylonjs/core';
import { getTerrainHeight } from './babylonTerrain.js';

const SAMPLE_OFFSET = 0.4; // distance for normal sampling

/**
 * Get terrain surface normal at (x, z) by sampling height at 4 neighbors.
 * Returns a normalized Vector3.
 */
export function getTerrainNormal(x, z) {
  const hC = getTerrainHeight(x, z);
  const hL = getTerrainHeight(x - SAMPLE_OFFSET, z);
  const hR = getTerrainHeight(x + SAMPLE_OFFSET, z);
  const hF = getTerrainHeight(x, z + SAMPLE_OFFSET);
  const hB = getTerrainHeight(x, z - SAMPLE_OFFSET);

  // Cross product of tangent vectors gives normal
  const nx = (hL - hR) / (2 * SAMPLE_OFFSET);
  const nz = (hB - hF) / (2 * SAMPLE_OFFSET);
  const ny = 1.0;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return new Vector3(nx / len, ny / len, nz / len);
}

/**
 * Get terrain slope angle in radians at (x, z).
 * 0 = flat, PI/2 = vertical cliff.
 */
export function getTerrainSlope(x, z) {
  const normal = getTerrainNormal(x, z);
  return Math.acos(Math.min(1, normal.y)); // angle from vertical
}

/**
 * Snap a mesh to terrain — sets Y position + aligns rotation to slope.
 * @param {Mesh} mesh
 * @param {number} x - World X
 * @param {number} z - World Z
 * @param {object} options
 *   - yOffset: extra Y displacement (negative = embed into ground)
 *   - alignToSlope: 0..1 how much to follow terrain tilt (0 = upright, 1 = full slope)
 *   - preserveYRotation: keep mesh's existing Y rotation (default true)
 */
export function snapToTerrain(mesh, x, z, options = {}) {
  const {
    yOffset = 0,
    alignToSlope = 0.5,
    preserveYRotation = true,
  } = options;

  const py = getTerrainHeight(x, z) + yOffset;
  mesh.position.set(x, py, z);

  if (alignToSlope <= 0) return;

  const normal = getTerrainNormal(x, z);

  // Skip if nearly flat (avoid unnecessary rotation)
  if (normal.y > 0.998) return;

  // Calculate rotation to align UP vector with terrain normal
  const up = Vector3.Up();
  const blendedNormal = Vector3.Lerp(up, normal, alignToSlope);
  blendedNormal.normalize();

  // Build rotation from UP → blendedNormal
  const currentYRotation = preserveYRotation ? mesh.rotation.y : 0;

  // Axis-angle rotation
  const axis = Vector3.Cross(up, blendedNormal);
  const axisLen = axis.length();

  if (axisLen > 0.001) {
    axis.scaleInPlace(1 / axisLen);
    const angle = Math.asin(Math.min(1, axisLen));

    // Apply slope rotation then Y rotation
    const slopeQuat = Quaternion.RotationAxis(axis, angle);
    const yQuat = Quaternion.RotationYawPitchRoll(currentYRotation, 0, 0);
    const finalQuat = slopeQuat.multiply(yQuat);

    mesh.rotationQuaternion = finalQuat;
  }
}

/**
 * Snap a prop to terrain with category-aware settings.
 * Trees stay mostly vertical, rocks follow slope, small details fully conform.
 */
export function snapPropToTerrain(mesh, x, z, category, yOffset = 0) {
  const slopeSettings = {
    tree:      0.08,   // trees stand nearly upright
    bush:      0.25,
    flower:    0.4,
    rock:      0.85,   // rocks follow terrain closely
    pebble:    0.9,
    mushroom:  0.3,
    stump:     0.5,
    plant:     0.35,
    structure: 0.05,   // buildings stay level
    furniture: 0.1,
    detail:    0.2,
    path_prop: 0.7,
  };

  snapToTerrain(mesh, x, z, {
    yOffset,
    alignToSlope: slopeSettings[category] ?? 0.3,
    preserveYRotation: true,
  });
}
