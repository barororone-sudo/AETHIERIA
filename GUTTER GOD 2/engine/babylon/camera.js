// engine/babylon/camera.js — caméra third-person avec smoothing amorti + anti-clip
// Damped follow: XZ rapide, Y amorti (pas de saccade lors des sauts)
// Smooth zoom: radius interpolé, pas de snap
// Anti-clip: filtered Babylon raycast against terrain/decor.

import { UniversalCamera, Vector3 } from '@babylonjs/core';
import { CONFIG }                       from '../../core/config.js';
import { raycastCameraCollision }       from './physicsAdapter.js';

let _camera = null;
let _scene  = null;

const _cam = {
  yaw:          0,
  pitch:        0.45,
  desiredRadius: CONFIG.camera.radius,
  radiusTarget: CONFIG.camera.radius,    // wheel zoom target only
  collisionRadius: CONFIG.camera.radius,
  target:       new Vector3(0, 0, 0),
  locked:       false,
  // Vertical damping state
  prevPlayerY:  0,
  velY:         0,
};

// Limites pitch
const PITCH_MIN    = 0.10;
const PITCH_MAX    = 1.35;
const MOUSE_SENS   = 0.0025;
const RADIUS_MIN   = 1.5;
const RADIUS_MAX   = CONFIG.camera.radiusMax;

// ── Damping tuning ──────────────────────────────────────────────────────────
const FOLLOW_XZ    = 10.0;    // horizontal follow speed (fast — responsive)
const FOLLOW_Y_UP  = 4.0;     // vertical follow going up (slower — smooth jumps)
const FOLLOW_Y_DN  = 7.0;     // vertical follow going down (faster — land quickly)
const FOLLOW_Y_GND = 12.0;    // vertical follow on ground (snappy — no float)
const ZOOM_SPEED   = 6.0;     // smooth zoom lerp speed
const CLIP_MARGIN  = 0.35;    // distance margin before clip obstacle
const Y_DEAD_ZONE  = 0.035;   // ignore tiny terrain/player height chatter

let _isGrounded = true;       // track player ground state for Y damping

const _cameraRayOrigin = new Vector3();
const _cameraRayDir = new Vector3(0, 0, 1);

export function initCamera(scene, canvas) {
  _scene = scene;
  _camera = new UniversalCamera('cam', new Vector3(0, 5, -10), scene);
  _camera.minZ = 0.15;
  _camera.maxZ = 600;
  _camera.fov  = 1.05;
  _camera.inputs.clear(); // contrôles 100% manuels

  // ── Pointer lock ──────────────────────────────────────────────────────────
  let _lockCooldown = 0;
  canvas.addEventListener('click', () => {
    if (!_cam.locked && Date.now() > _lockCooldown) {
      canvas.requestPointerLock().catch(() => {});
    }
  });
  document.addEventListener('pointerlockchange', () => {
    _cam.locked = document.pointerLockElement === canvas;
    if (!_cam.locked) _lockCooldown = Date.now() + 1200;
  });

  // ── Souris ────────────────────────────────────────────────────────────────
  document.addEventListener('mousemove', e => {
    if (!_cam.locked) return;
    _cam.yaw   += e.movementX * MOUSE_SENS;
    _cam.pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX,
                    _cam.pitch + e.movementY * MOUSE_SENS));
  });

  // ── Molette zoom — sets target, actual radius lerps ───────────────────────
  canvas.addEventListener('wheel', e => {
    _cam.radiusTarget = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX,
                          _cam.radiusTarget + e.deltaY * 0.008));
  }, { passive: true });

  // Bloquer clic molette
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
  canvas.addEventListener('auxclick',  e => e.preventDefault());

  return _camera;
}

export function getCamera()  { return _camera; }
export function getCamYaw()  { return _cam.yaw; }

export function setCameraTarget(pos) {
  _cam.target.copyFrom(pos);
}

/**
 * Notify the camera whether the player is on the ground.
 * Used to switch between snappy (grounded) and floaty (airborne) Y damping.
 */
export function setCameraGrounded(grounded) {
  _isGrounded = grounded;
}

export function updateCamera(playerPos, dt) {
  if (!_camera || !playerPos) return;

  // ── Smooth zoom interpolation ─────────────────────────────────────────────
  const zoomLerp = 1 - Math.exp(-ZOOM_SPEED * dt);
  _cam.desiredRadius += (_cam.radiusTarget - _cam.desiredRadius) * zoomLerp;

  // ── Damped target follow ──────────────────────────────────────────────────
  const tx = playerPos.x;
  const ty = playerPos.y + CONFIG.camera.heightOffset;
  const tz = playerPos.z;

  // XZ: fast follow (responsive lateral movement)
  const xzLerp = Math.min(FOLLOW_XZ * dt, 1);
  _cam.target.x += (tx - _cam.target.x) * xzLerp;
  _cam.target.z += (tz - _cam.target.z) * xzLerp;

  // Y: adaptive damping — snappy on ground, soft in air
  const dyPlayer = playerPos.y - _cam.prevPlayerY;
  _cam.prevPlayerY = playerPos.y;

  let ySpeed;
  if (_isGrounded) {
    // On ground — snap quickly so terrain undulations feel solid
    ySpeed = FOLLOW_Y_GND;
  } else if (dyPlayer > 0.01) {
    // Going up (jumping) — slow follow to smooth out the launch
    ySpeed = FOLLOW_Y_UP;
  } else {
    // Falling — faster follow so landing doesn't feel laggy
    ySpeed = FOLLOW_Y_DN;
  }
  const yDelta = ty - _cam.target.y;
  if (Math.abs(yDelta) > Y_DEAD_ZONE || !_isGrounded) {
    const yLerp = 1 - Math.exp(-ySpeed * dt);
    _cam.target.y += yDelta * yLerp;
  }

  // ── Direction caméra → derrière le joueur ────────────────────────────────
  const cp  = Math.cos(_cam.pitch);
  const sp2 = Math.sin(_cam.pitch);
  const cy  = Math.cos(_cam.yaw);
  const sy  = Math.sin(_cam.yaw);

  const dirX =  sy * cp;
  const dirY =  sp2;
  const dirZ =  cy * cp;

  // Decor anti-clip: the user radius stays locked, collision only shortens the rendered arm.
  let safeRadius = _cam.desiredRadius;
  if (_scene) {
    _cameraRayOrigin.copyFrom(_cam.target);
    _cameraRayDir.set(dirX, dirY, dirZ);

    const hit = raycastCameraCollision(_cameraRayOrigin, _cameraRayDir, _cam.desiredRadius);
    if (hit) {
      safeRadius = Math.max(RADIUS_MIN, hit.distance - CLIP_MARGIN);
    }
  }

  const collisionLerp = safeRadius < _cam.collisionRadius ? 1 : Math.min(12 * dt, 1);
  _cam.collisionRadius += (safeRadius - _cam.collisionRadius) * collisionLerp;

  // ── Position finale ───────────────────────────────────────────────────────
  _camera.position.set(
    _cam.target.x + dirX * _cam.collisionRadius,
    _cam.target.y + dirY * _cam.collisionRadius,
    _cam.target.z + dirZ * _cam.collisionRadius,
  );

  _camera.setTarget(_cam.target);
}

export function getCameraDebug() {
  return {
    desiredRadius: _cam.desiredRadius,
    collisionRadius: _cam.collisionRadius,
    targetY: _cam.target.y,
    grounded: _isGrounded,
  };
}
