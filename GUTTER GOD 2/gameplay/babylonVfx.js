// gameplay/babylonVfx.js — hit flash, slash arc, loot pop, dodge trail, death
// Attack VFX: visible arc slash in front of player + screen shake on hit
// FIX: listens to combat:comboStep (the real event) + proper lifecycle start/dispose

import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { getPlayerRoot } from './babylonPlayerCharacter.js';
import { Events }        from '../core/events.js';

let _scene = null;

export function initVfx(scene) {
  _scene = scene;

  // combat:comboStep is emitted by _attack() in babylonCombat.js
  Events.on('combat:comboStep', ({ step }) => slashArc(step));
  Events.on('combat:hit',       ({ target, step }) => {
    hitFlash(target?.root);
    screenShake(step ?? 0);
  });
  Events.on('combat:miss',      ({ step }) => missSwipe());
  Events.on('player:died',      ()         => deathEffect());
  Events.on('combat:dodge',     ()         => dodgeTrail());
  Events.on('enemy:died',       ({ position }) => lootPop(position));
  Events.on('combat:parry',     ()         => parryFlash());
}

// ── Hit flash ──────────────────────────────────────────────────────────────

export function hitFlash(mesh) {
  if (!mesh) return;
  const children = mesh.getChildMeshes ? mesh.getChildMeshes(false) : [];
  const targets = children.length > 0 ? children : [mesh];
  targets.forEach(m => {
    if (!m.material) return;
    const orig = m.material.emissiveColor?.clone?.() ?? new Color3(0, 0, 0);
    m.material.emissiveColor = new Color3(1, 0.3, 0.3);
    setTimeout(() => { if (m.material) m.material.emissiveColor = orig; }, 80);
  });
}

// ── Slash arc — visible hitbox feedback ─────────────────────────────────────

const SLASH_COLORS = [
  new Color3(1.0, 0.9, 0.5),   // combo step 0 — gold
  new Color3(0.5, 0.8, 1.0),   // combo step 1 — blue
  new Color3(1.0, 0.4, 0.2),   // combo step 2 — fire
];

function slashArc(comboStep = 0) {
  if (!_scene) return;
  const root = getPlayerRoot();
  if (!root) return;

  // Create a fresh slash disc every time — dispose after animation
  const slash = MeshBuilder.CreateDisc('slash-arc', {
    radius: 1.6,
    arc: 0.35,         // 126° arc
    tessellation: 12,
    sideOrientation: 2, // DOUBLESIDE
  }, _scene);

  const mat = new StandardMaterial('slash-mat-' + Date.now(), _scene);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.emissiveColor = SLASH_COLORS[comboStep % SLASH_COLORS.length];
  mat.alpha = 0.8;
  slash.material = mat;
  slash.isPickable = false;

  // Position: in front of player
  const rotY = root.rotation.y;
  const forward = 1.2;
  slash.position.set(
    root.position.x - Math.sin(rotY) * forward,
    root.position.y + 0.8,
    root.position.z - Math.cos(rotY) * forward,
  );

  // Rotate to face forward + tilt based on combo step
  slash.rotation.set(
    -0.3 + comboStep * 0.25,
    rotY + Math.PI,
    (comboStep % 2 === 0 ? 0.4 : -0.4),
  );

  slash.scaling.setAll(0.5);

  // Animate: scale up + fade out + dispose
  let elapsed = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    elapsed += _scene.getEngine().getDeltaTime() / 1000;
    const progress = elapsed / 0.18;

    slash.scaling.setAll(0.5 + progress * 1.5);
    mat.alpha = Math.max(0, 0.8 * (1 - progress));
    slash.rotation.z += (comboStep % 2 === 0 ? 1 : -1) * 8 * (1 / 60);

    if (elapsed > 0.22) {
      _scene.onBeforeRenderObservable.remove(obs);
      slash.dispose();
      mat.dispose();
    }
  });
}

// ── Miss swipe — subtle white swoosh ────────────────────────────────────

function missSwipe() {
  if (!_scene) return;
  const root = getPlayerRoot();
  if (!root) return;

  const swipe = MeshBuilder.CreateDisc('miss-swipe', {
    radius: 1.2, arc: 0.25, tessellation: 8, sideOrientation: 2,
  }, _scene);
  const mat = new StandardMaterial('miss-mat', _scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(0.7, 0.7, 0.8);
  mat.alpha = 0.35;
  swipe.material = mat;
  swipe.isPickable = false;

  const rotY = root.rotation.y;
  swipe.position.set(
    root.position.x - Math.sin(rotY) * 1.0,
    root.position.y + 0.8,
    root.position.z - Math.cos(rotY) * 1.0,
  );
  swipe.rotation.set(-0.2, rotY + Math.PI, 0.3);
  swipe.scaling.setAll(0.4);

  let elapsed = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    elapsed += _scene.getEngine().getDeltaTime() / 1000;
    swipe.scaling.setAll(0.4 + (elapsed / 0.15) * 1.2);
    mat.alpha = Math.max(0, 0.35 * (1 - elapsed / 0.15));
    if (elapsed > 0.18) {
      _scene.onBeforeRenderObservable.remove(obs);
      swipe.dispose();
      mat.dispose();
    }
  });
}

// ── Screen shake on hit ─────────────────────────────────────────────────────

function screenShake(comboStep = 0) {
  if (!_scene) return;
  const cam = _scene.activeCamera;
  if (!cam) return;

  const intensity = 0.04 + comboStep * 0.025;
  const duration  = 0.08 + comboStep * 0.03;
  let elapsed = 0;

  const obs = _scene.onBeforeRenderObservable.add(() => {
    elapsed += _scene.getEngine().getDeltaTime() / 1000;
    const t = elapsed / duration;

    if (t >= 1) {
      _scene.onBeforeRenderObservable.remove(obs);
      return;
    }

    const decay = 1 - t;
    cam.position.x += (Math.random() - 0.5) * intensity * decay;
    cam.position.z += (Math.random() - 0.5) * intensity * decay;
  });
}

// ── Parry flash ─────────────────────────────────────────────────────────────

function parryFlash() {
  if (!_scene) return;
  const root = getPlayerRoot();
  if (!root) return;

  const sphere = MeshBuilder.CreateSphere('parry-flash', { diameter: 2.5 }, _scene);
  sphere.position.copyFrom(root.position);
  sphere.position.y += 1.0;
  const mat = new StandardMaterial('parry-mat', _scene);
  mat.emissiveColor   = new Color3(1, 1, 0.8);
  mat.disableLighting = true;
  mat.alpha = 0.5;
  sphere.material     = mat;
  sphere.isPickable   = false;

  let t = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    t += _scene.getEngine().getDeltaTime() / 1000;
    sphere.scaling.setAll(1 + t * 4);
    mat.alpha = Math.max(0, 0.5 * (1 - t / 0.15));
    if (t > 0.18) {
      _scene.onBeforeRenderObservable.remove(obs);
      sphere.dispose();
      mat.dispose();
    }
  });
}

// ── Loot pop ──────────────────────────────────────────────────────────────

export function lootPop(position) {
  if (!position || !_scene) return;
  const sphere = MeshBuilder.CreateSphere('loot-pop', { diameter: 0.3 }, _scene);
  sphere.position.copyFrom(position);
  sphere.position.y += 0.5;
  const mat = new StandardMaterial('loot-mat', _scene);
  mat.emissiveColor = new Color3(1, 0.9, 0.2);
  sphere.material   = mat;

  let t = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    t += _scene.getEngine().getDeltaTime() / 1000;
    sphere.position.y += 0.8 * (1 / 60);
    sphere.scaling.setAll(1 - t * 1.5);
    if (t > 0.6) {
      _scene.onBeforeRenderObservable.remove(obs);
      sphere.dispose();
      mat.dispose();
    }
  });
}

// ── Dodge trail ──────────────────────────────────────────────────────────

export function dodgeTrail() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(255,255,255,0.12)',
    pointerEvents: 'none', zIndex: '100',
    transition: 'opacity 0.2s',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '0'; });
  setTimeout(() => el.remove(), 250);
}

// ── Death effect ─────────────────────────────────────────────────────────

export function deathEffect() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(180,0,0,0.35)',
    pointerEvents: 'none', zIndex: '100',
    transition: 'opacity 1s',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 100);
  setTimeout(() => el.remove(), 1200);
}
