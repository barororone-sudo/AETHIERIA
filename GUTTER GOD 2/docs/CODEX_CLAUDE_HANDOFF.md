# Codex / Claude Handoff

## Task Split

### Codex Scope

- Stabilize player ground snapping and camera smoothing.
- Keep camera and traversal independent from the concrete physics backend.
- Prepare a small query adapter so Rapier can later be swapped or complemented by Havok.
- Expose debug values for audit: ground source/Y, desired camera radius, collision camera radius, camera hit mesh.

### Claude Scope

- Audit the Codex camera/physics changes for WebGPU memory and allocation pressure.
- Implement the global world-state FSM for the early "Crazy Story" discovery.
- Drive shader/material changes and mesh activation through the world-state FSM.
- Continue city/district generation with chunk loading and no exploration hitches.

## Current Technical Entry Points

- `engine/babylon/physicsAdapter.js`
  - `initPhysicsAdapter(scene)`
  - `raycastGround(x, z, options)`
  - `raycastCameraCollision(origin, direction, maxDistance, predicate)`
  - `getPhysicsQueryDebug()`

- `engine/babylon/camera.js`
  - Keeps `desiredRadius` separate from `collisionRadius`.
  - Applies exponential Y smoothing and a vertical dead zone.
  - Uses `physicsAdapter` for filtered camera collision.

- `gameplay/babylonTraversal.js`
  - Uses `physicsAdapter.raycastGround` for terrain snapping.
  - Keeps capsule center at `groundY + playerHeight / 2`.

- `core/debugOverlay.js`
  - Shows ground query source/Y and camera radius/collision hit state.

## Havok Migration Guidance

Havok should be introduced behind `physicsAdapter.js` first. Camera/traversal should continue calling adapter queries instead of importing Havok or Rapier directly. Use Havok as a reliable query/collision backend, not as a dynamic camera rigid body.
