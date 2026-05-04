// gameplay/babylonTraversal.js — Player FSM Controller
// States: IDLE, WALK, RUN, JUMP, FALL, GLIDE, ATTACK, CLIMB
// Ground snapping via vertical terrain raycast, slope handling, anti-sink protection.
// FIX: Jump uses edge-detection (keyJustPressed) — no more infinite bounce.

import { getCamYaw, setCameraGrounded }  from '../engine/babylon/camera.js';
import { getWorld, getRapier }          from '../engine/babylon/physics.js';
import { raycastGround }                from '../engine/babylon/physicsAdapter.js';
import { getPlayerBody, getPlayerRoot } from './babylonPlayerCharacter.js';
import { getTerrainHeight }             from '../world/babylonTerrain.js';
import { CONFIG }                       from '../core/config.js';
import { Events }                       from '../core/events.js';

// ── FSM States ───────────────────────────────────────────────────────────
const STATE = {
  IDLE:   'IDLE',
  WALK:   'WALK',
  RUN:    'RUN',
  JUMP:   'JUMP',
  FALL:   'FALL',
  GLIDE:  'GLIDE',
  ATTACK: 'ATTACK',
  CLIMB:  'CLIMB',
};

// ── Slope constants ──────────────────────────────────────────────────────
const SLOPE_MAX_WALK     = 0.70;
const SLOPE_SLOW_START   = 0.25;
const SLOPE_SPEED_UP     = 1.15;
const SLOPE_SPEED_DOWN   = 0.50;
const ANTI_SINK_MARGIN   = 0.05;
const GROUND_RAY_START   = 140;
const GROUND_RAY_LENGTH  = 260;
const GROUND_STICK_DIST  = 0.36;
const GROUND_ACCEL       = 18.0;
const GROUND_BRAKE       = 16.0;
const AIR_ACCEL          = 5.5;
const AIR_DRAG           = 0.45;
const PLANAR_SPEED_CAP   = 12.0;

// ── Climb constants ──────────────────────────────────────────────────────
const CLIMB_DETECT_DIST   = 0.8;
const CLIMB_MIN_HEIGHT    = 0.5;
const CLIMB_SPEED         = 2.5;
const CLIMB_STAMINA_DRAIN = 15;
const AUTO_CLIMB_ENABLED  = false; // disabled until wall queries can exclude the player collider robustly

// ── Glide constants ──────────────────────────────────────────────────────
const GLIDE_SPEED          = 7.2;
const GLIDE_ACCEL          = 9.5;
const GLIDE_DRAG           = 1.35;

// ── Input state ──────────────────────────────────────────────────────────
const _keys     = new Set();
const _justDown = new Set();   // edge detection: keys pressed THIS frame

// ── Player state ─────────────────────────────────────────────────────────
const _state = {
  fsm:          STATE.IDLE,
  stamina:      CONFIG.stamina.max,
  isGrounded:   false,
  regenDelay:   0,
  jumpCooldown: 0,
  smoothY:      null,
  attackTimer:  0,
  coyoteTime:   0,
  slopeAngle:   0,
  slopeDir:     0,
  prevState:    STATE.IDLE,
  climbNormalX: 0,
  climbNormalZ: 0,
  jumpImpulseApplied: false,  // FIX: ensures jump impulse fires exactly once
};

let _scene = null;
let _lastGround = {
  y: 0,
  normal: null,
  source: 'height-function',
};
const _groundProbe = {
  hit: false,
  y: 0,
  normal: null,
  source: 'height-function',
  distance: 0,
};

// ── Ground detection — vertical terrain raycast + analytical fallback ─────

function _checkGrounded(body) {
  const t       = body.translation();
  const feetY   = t.y - CONFIG.player.height / 2;
  const ground  = raycastGround(t.x, t.z, {
    rayStartY: Math.max(t.y + GROUND_RAY_START, GROUND_RAY_START),
    rayLength: GROUND_RAY_LENGTH,
    result: _groundProbe,
  });

  _lastGround = ground;

  const nearTerrain = feetY - ground.y <= GROUND_STICK_DIST && feetY >= ground.y - 0.2;

  return nearTerrain;
}

// ── Slope analysis ───────────────────────────────────────────────────────

function _analyzeSlopeAtFeet(body, moveX, moveZ) {
  const t = body.translation();
  const sampleDist = 0.5;
  const hC = getTerrainHeight(t.x, t.z);
  const hF = getTerrainHeight(t.x + moveX * sampleDist, t.z + moveZ * sampleDist);
  const heightDiff = hF - hC;
  const slopeAngle = Math.atan2(Math.abs(heightDiff), sampleDist);
  const slopeDir = heightDiff > 0.01 ? 1 : (heightDiff < -0.01 ? -1 : 0);
  return { slopeAngle, slopeDir };
}

// ── Wall detection for CLIMB ─────────────────────────────────────────────

function _detectWall(body, moveX, moveZ) {
  const world  = getWorld();
  const rapier = getRapier();
  if (!world || !rapier) return null;

  const t      = body.translation();
  const halfH  = CONFIG.player.height / 2;
  const feetY  = t.y - halfH;

  const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (len < 0.01) return null;
  const dirX = moveX / len;
  const dirZ = moveZ / len;

  const chestY = t.y + 0.2;
  const ray = new rapier.Ray(
    { x: t.x, y: chestY, z: t.z },
    { x: dirX, y: 0, z: dirZ },
  );
  const hit = world.castRay(ray, CLIMB_DETECT_DIST, true);
  if (!hit) return null;

  const headY = t.y + halfH;
  const rayHead = new rapier.Ray(
    { x: t.x, y: headY, z: t.z },
    { x: dirX, y: 0, z: dirZ },
  );
  const hitHead = world.castRay(rayHead, CLIMB_DETECT_DIST + 0.2, true);
  if (!hitHead) return null;

  const wallX = t.x + dirX * hit.toi;
  const wallZ = t.z + dirZ * hit.toi;
  const terrainAtWall = getTerrainHeight(wallX, wallZ);
  if (terrainAtWall - feetY < CLIMB_MIN_HEIGHT) return null;

  return {
    wallNormalX: -dirX,
    wallNormalZ: -dirZ,
    distance: hit.toi,
  };
}

// ── Slope speed modifier ─────────────────────────────────────────────────

function _getSlopeSpeedModifier(slopeAngle, slopeDir) {
  if (slopeAngle < SLOPE_SLOW_START) return 1.0;

  if (slopeDir > 0) {
    const t = Math.min(1, (slopeAngle - SLOPE_SLOW_START) / (SLOPE_MAX_WALK - SLOPE_SLOW_START));
    return 1.0 - t * (1.0 - SLOPE_SPEED_DOWN);
  }

  if (slopeDir < 0) {
    const t = Math.min(1, (slopeAngle - SLOPE_SLOW_START) / 0.5);
    return 1.0 + t * (SLOPE_SPEED_UP - 1.0);
  }

  return 1.0;
}

function _expAlpha(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

function _blendPlanar(vel, targetX, targetZ, rate, dt) {
  const alpha = _expAlpha(rate, dt);
  return {
    x: vel.x + (targetX - vel.x) * alpha,
    z: vel.z + (targetZ - vel.z) * alpha,
  };
}

function _applyPlanarDrag(vel, dragRate, dt) {
  const drag = Math.exp(-dragRate * dt);
  return { x: vel.x * drag, z: vel.z * drag };
}

function _limitPlanar(x, z, maxSpeed = PLANAR_SPEED_CAP) {
  const speedSq = x * x + z * z;
  const maxSq = maxSpeed * maxSpeed;
  if (speedSq <= maxSq) return { x, z };
  const scale = maxSpeed / Math.sqrt(speedSq);
  return { x: x * scale, z: z * scale };
}

// ── Input — edge detection for jump ──────────────────────────────────────

export function initTraversalInput() {
  window.addEventListener('keydown', e => {
    if (!_keys.has(e.code)) _justDown.add(e.code);  // edge: first frame only
    _keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    _keys.delete(e.code);
    _justDown.delete(e.code);
  });

  // Listen for attack events to enter ATTACK state
  // combat:comboStep is the actual event emitted by babylonCombat._attack()
  Events.on('combat:comboStep', ({ step }) => {
    if (_state.fsm !== STATE.JUMP && _state.fsm !== STATE.FALL && _state.fsm !== STATE.CLIMB) {
      _state.fsm = STATE.ATTACK;
      _state.attackTimer = 0.35;
    }
  });
}

function _isKey(...codes) { return codes.some(c => _keys.has(c)); }
function _justPressed(...codes) { return codes.some(c => _justDown.has(c)); }

// ── FSM Transition logic ─────────────────────────────────────────────────

function _updateFSM(moving, sprint, grounded) {
  const prev = _state.fsm;

  // Attack state has priority (timed lock)
  if (_state.fsm === STATE.ATTACK) {
    if (_state.attackTimer > 0) return;
  }

  // Jump requested — STRICT: justPressed only, grounded, and NOT already in JUMP
  if (_justPressed('Space') && grounded && _state.stamina >= CONFIG.stamina.drainJump &&
      _state.fsm !== STATE.JUMP) {
    _state.fsm = STATE.JUMP;
    _state.jumpImpulseApplied = false;  // reset so velocity case applies impulse once
    return;
  }

  // Glide: holding space while falling
  if (_isKey('Space') && !grounded && _state.fsm === STATE.FALL) {
    _state.fsm = STATE.GLIDE;
    return;
  }

  // Released space while gliding → back to fall
  if (_state.fsm === STATE.GLIDE && !_isKey('Space')) {
    _state.fsm = STATE.FALL;
    return;
  }

  // CLIMB: release move keys or press Space → exit climb (wall jump)
  if (_state.fsm === STATE.CLIMB) {
    if (!moving || _justPressed('Space') || _state.stamina <= 0) {
      if (_justPressed('Space') && _state.stamina >= CONFIG.stamina.drainJump) {
        _state.fsm = STATE.JUMP;
        _state.jumpImpulseApplied = false;  // reset for wall jump impulse
        Events.emit('player:wallJump', {});
      } else {
        _state.fsm = STATE.FALL;
      }
      _state.smoothY = null;
    }
    return;
  }

  // In air after jump (going up → going down)
  if (_state.fsm === STATE.JUMP) {
    const body = getPlayerBody();
    if (body && body.linvel().y <= 0) {
      _state.fsm = STATE.FALL;
    }
    return;
  }

  // Falling
  if (!grounded && _state.fsm !== STATE.JUMP && _state.fsm !== STATE.GLIDE) {
    // Coyote time: brief grace period — also requires justPressed
    if (_state.coyoteTime > 0 && _justPressed('Space') && _state.stamina >= CONFIG.stamina.drainJump) {
      _state.fsm = STATE.JUMP;
      _state.jumpImpulseApplied = false;  // reset for coyote jump impulse
      _state.coyoteTime = 0;
      return;
    }
    _state.fsm = STATE.FALL;
    return;
  }

  // On ground
  if (grounded) {
    if (_state.fsm === STATE.FALL || _state.fsm === STATE.JUMP || _state.fsm === STATE.GLIDE) {
      Events.emit('player:landed', {});
    }

    if (!moving) {
      _state.fsm = STATE.IDLE;
    } else if (sprint) {
      _state.fsm = STATE.RUN;
    } else {
      _state.fsm = STATE.WALK;
    }
  }

  if (prev !== _state.fsm) {
    _state.prevState = prev;
  }
}

// ── Main update ──────────────────────────────────────────────────────────

export function updateTraversal(dt, scene = null) {
  if (scene) _scene = scene;
  const body = getPlayerBody();
  if (!body) return { stamina: _state.stamina, isGrounded: _state.isGrounded, state: _state.fsm };

  const cfg    = CONFIG.player;
  const staCfg = CONFIG.stamina;

  // ── Movement input direction ───────────────────────────────────────────
  const yaw  = getCamYaw();
  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);
  const rgtX =  Math.cos(yaw);
  const rgtZ = -Math.sin(yaw);

  let moveX = 0, moveZ = 0;
  if (_isKey('KeyW','ArrowUp','KeyZ'))   { moveX += fwdX; moveZ += fwdZ; }
  if (_isKey('KeyS','ArrowDown'))        { moveX -= fwdX; moveZ -= fwdZ; }
  if (_isKey('KeyD','ArrowRight'))       { moveX += rgtX; moveZ += rgtZ; }
  if (_isKey('KeyA','ArrowLeft','KeyQ')) { moveX -= rgtX; moveZ -= rgtZ; }

  const moving = moveX !== 0 || moveZ !== 0;
  let moveLen = 1;
  if (moving) {
    moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    moveX /= moveLen;
    moveZ /= moveLen;
  }

  const sprint = _isKey('ShiftLeft','ShiftRight') && moving && _state.stamina > 0;

  // ── Ground check ───────────────────────────────────────────────────────
  _state.isGrounded = _checkGrounded(body);
  if (_state.jumpCooldown > 0) {
    _state.jumpCooldown -= dt;
    _state.isGrounded = false;
  }

  setCameraGrounded(_state.isGrounded);

  // Coyote time
  if (_state.isGrounded) {
    _state.coyoteTime = 0.12;
  } else {
    _state.coyoteTime = Math.max(0, _state.coyoteTime - dt);
  }

  // ── Slope analysis ─────────────────────────────────────────────────────
  if (moving && _state.isGrounded) {
    const slope = _analyzeSlopeAtFeet(body, moveX, moveZ);
    _state.slopeAngle = slope.slopeAngle;
    _state.slopeDir   = slope.slopeDir;
  }

  // ── Wall detection for CLIMB ────────────────────────────────────────────
  let wallInfo = null;
  if (AUTO_CLIMB_ENABLED && moving && !_state.isGrounded && _state.fsm !== STATE.CLIMB &&
      _state.fsm !== STATE.ATTACK && _state.stamina > 5) {
    wallInfo = _detectWall(body, moveX, moveZ);
    if (wallInfo) {
      _state.fsm = STATE.CLIMB;
      _state.smoothY = null;
      _state.climbNormalX = wallInfo.wallNormalX;
      _state.climbNormalZ = wallInfo.wallNormalZ;
      Events.emit('player:climbStart', {});
    }
  }
  if (AUTO_CLIMB_ENABLED && _state.fsm === STATE.CLIMB && moving) {
    wallInfo = wallInfo || _detectWall(body, moveX, moveZ);
    if (!wallInfo) {
      _state.fsm = STATE.FALL;
    }
  }

  // ── Attack timer ───────────────────────────────────────────────────────
  if (_state.attackTimer > 0) {
    _state.attackTimer -= dt;
  }

  // ── FSM transition ─────────────────────────────────────────────────────
  _updateFSM(moving, sprint, _state.isGrounded);
  if (!AUTO_CLIMB_ENABLED && _state.fsm === STATE.CLIMB) {
    _state.fsm = STATE.FALL;
  }

  // ── Clear justDown after FSM has consumed it ───────────────────────────
  _justDown.clear();

  // ── Stamina ────────────────────────────────────────────────────────────
  if (_state.fsm === STATE.CLIMB) {
    _state.stamina    = Math.max(0, _state.stamina - CLIMB_STAMINA_DRAIN * dt);
    _state.regenDelay = staCfg.regenDelay;
  } else if (_state.fsm === STATE.RUN) {
    _state.stamina    = Math.max(0, _state.stamina - staCfg.drainSprint * dt);
    _state.regenDelay = staCfg.regenDelay;
  } else {
    _state.regenDelay = Math.max(0, _state.regenDelay - dt);
    if (_state.regenDelay <= 0)
      _state.stamina = Math.min(staCfg.max, _state.stamina + staCfg.regen * dt);
  }

  // ── Velocity computation per state ─────────────────────────────────────
  const vel = body.linvel();
  const t   = body.translation();
  let vx, vy, vz;

  switch (_state.fsm) {
    case STATE.IDLE: {
      const planar = _applyPlanarDrag(vel, GROUND_BRAKE, dt);
      vx = planar.x;
      vz = planar.z;
      if (Math.abs(vx) < 0.02) vx = 0;
      if (Math.abs(vz) < 0.02) vz = 0;
      vy = 0;
      break;
    }

    case STATE.WALK:
    case STATE.RUN: {
      const baseSpeed = _state.fsm === STATE.RUN ? cfg.sprintSpeed : cfg.walkSpeed;
      const slopeMod = _getSlopeSpeedModifier(_state.slopeAngle, _state.slopeDir);

      if (_state.slopeAngle > SLOPE_MAX_WALK && _state.slopeDir > 0) {
        const planar = _applyPlanarDrag(vel, GROUND_BRAKE, dt);
        vx = planar.x;
        vz = planar.z;
      } else {
        const speed = baseSpeed * slopeMod;
        const planar = _blendPlanar(vel, moveX * speed, moveZ * speed, GROUND_ACCEL, dt);
        vx = planar.x;
        vz = planar.z;
      }
      vy = 0;
      break;
    }

    case STATE.JUMP: {
      // FIX: Apply jump impulse EXACTLY ONCE on the first frame of JUMP
      if (!_state.jumpImpulseApplied) {
        vy = cfg.jumpSpeed;
        _state.stamina     -= staCfg.drainJump;
        _state.regenDelay   = staCfg.regenDelay;
        _state.jumpCooldown = 0.5;
        _state.smoothY      = null;
        _state.jumpImpulseApplied = true;
      } else {
        vy = vel.y;  // gravity handles the arc — no re-impulse
      }
      if (moving) {
        const planar = _blendPlanar(vel, moveX * cfg.walkSpeed * 0.90, moveZ * cfg.walkSpeed * 0.90, AIR_ACCEL, dt);
        vx = planar.x;
        vz = planar.z;
      } else {
        const planar = _applyPlanarDrag(vel, AIR_DRAG, dt);
        vx = planar.x;
        vz = planar.z;
      }
      break;
    }

    case STATE.FALL: {
      vy = vel.y;
      if (moving) {
        const airSpeed = cfg.walkSpeed * 0.95;
        const planar = _blendPlanar(vel, moveX * airSpeed, moveZ * airSpeed, AIR_ACCEL, dt);
        vx = planar.x;
        vz = planar.z;
      } else {
        const planar = _applyPlanarDrag(vel, AIR_DRAG, dt);
        vx = planar.x;
        vz = planar.z;
      }
      break;
    }

    case STATE.GLIDE: {
      vy = Math.max(vel.y, cfg.glideFallSpeed);
      if (moving) {
        const targetVx = moveX * GLIDE_SPEED;
        const targetVz = moveZ * GLIDE_SPEED;
        const planar = _blendPlanar(vel, targetVx, targetVz, GLIDE_ACCEL, dt);
        vx = planar.x;
        vz = planar.z;
      } else {
        const planar = _applyPlanarDrag(vel, GLIDE_DRAG, dt);
        vx = planar.x;
        vz = planar.z;
      }
      break;
    }

    case STATE.CLIMB: {
      vy = CLIMB_SPEED;
      vx = -(_state.climbNormalX ?? 0) * 0.5;
      vz = -(_state.climbNormalZ ?? 0) * 0.5;
      break;
    }

    case STATE.ATTACK: {
      vx = vel.x * 0.4;
      vz = vel.z * 0.4;
      vy = _state.isGrounded ? 0 : vel.y;
      break;
    }

    default: {
      vx = vel.x;
      vy = vel.y;
      vz = vel.z;
    }
  }

  // ── Ground snapping (grounded states) ──────────────────────────────────
  const cappedPlanar = _limitPlanar(vx, vz);
  vx = cappedPlanar.x;
  vz = cappedPlanar.z;

  const isGroundedState = [STATE.IDLE, STATE.WALK, STATE.RUN, STATE.ATTACK].includes(_state.fsm);

  if (isGroundedState && _state.isGrounded) {
    const ground = raycastGround(t.x, t.z, {
      rayStartY: Math.max(t.y + GROUND_RAY_START, GROUND_RAY_START),
      rayLength: GROUND_RAY_LENGTH,
      result: _groundProbe,
    });
    _lastGround = ground;

    const terrainY = ground.y;
    const targetY  = terrainY + cfg.height / 2;

    _state.smoothY = targetY;
    body.setTranslation({ x: t.x, y: targetY, z: t.z }, true);
    vy = 0;
  } else {
    _state.smoothY = null;
  }

  // ── Anti-sink failsafe ─────────────────────────────────────────────────
  const currentT = body.translation();
  const failsafeGround = raycastGround(currentT.x, currentT.z, {
    rayStartY: Math.max(currentT.y + GROUND_RAY_START, GROUND_RAY_START),
    rayLength: GROUND_RAY_LENGTH,
    result: _groundProbe,
  });
  const minTerrainY = failsafeGround.y + cfg.height / 2 - ANTI_SINK_MARGIN;
  if (currentT.y < minTerrainY && _state.fsm !== STATE.JUMP) {
    body.setTranslation({ x: currentT.x, y: minTerrainY + ANTI_SINK_MARGIN, z: currentT.z }, true);
    vy = Math.max(vy, 0);
    _state.isGrounded = true;
  }

  // ── Anti-void ──────────────────────────────────────────────────────────
  if (currentT.y < -30) {
    const safeY = getTerrainHeight(currentT.x, currentT.z) + 3;
    body.setTranslation({ x: currentT.x, y: safeY, z: currentT.z }, true);
    vy = 0; vx = 0; vz = 0;
    _state.smoothY = null;
    _state.fsm = STATE.FALL;
  }

  body.setLinvel({ x: vx, y: vy, z: vz }, true);

  // ── Mesh orientation ───────────────────────────────────────────────────
  const root = getPlayerRoot();
  if (root && moving && _state.fsm !== STATE.ATTACK) {
    const targetAngle = Math.atan2(moveX, moveZ);
    const diff = ((targetAngle - root.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const rotSpeed = _state.isGrounded ? 14 : 8;
    root.rotation.y += diff * Math.min(rotSpeed * dt, 1);
  }

  return {
    stamina: _state.stamina,
    isGrounded: _state.isGrounded,
    state: _state.fsm,
    slopeAngle: _state.slopeAngle,
    groundY: _lastGround.y,
    groundSource: _lastGround.source,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export function getStamina()  { return _state.stamina; }
export function setStamina(v) { _state.stamina = Math.max(0, Math.min(CONFIG.stamina.max, v)); }
export function drainStamina(amount) { _state.stamina = Math.max(0, _state.stamina - amount); }
export function isGrounded()  { return _state.isGrounded; }
export function getPlayerState() { return _state.fsm; }
export function getPlayerFSMDebug() {
  return {
    state: _state.fsm,
    grounded: _state.isGrounded,
    stamina: Math.round(_state.stamina),
    slope: Math.round(_state.slopeAngle * 180 / Math.PI) + '°',
    slopeDir: _state.slopeDir > 0 ? 'uphill' : (_state.slopeDir < 0 ? 'downhill' : 'flat'),
    smoothY: _state.smoothY?.toFixed(2) ?? 'null',
    climbing: _state.fsm === STATE.CLIMB,
  };
}
