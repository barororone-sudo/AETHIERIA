// gameplay/babylonInteraction.js — interactables (pickup, faction, lore)

import { MeshBuilder, StandardMaterial, Color3, Vector3, Animation } from '@babylonjs/core';
import { Events }        from '../core/events.js';
import { addItem }       from './rpgProgression.js';
import { shiftAlignment } from './babylonFactions.js';
import { ITEM_DEFS }     from './storyData.js';

const _interactables = [];
let   _scene         = null;
let   _promptEl      = null;
let   _nearTarget    = null;

// ── Init ───────────────────────────────────────────────────────────────────

export function initInteraction(scene) {
  _scene = scene;

  // Prompt HTML "Appuyer sur E"
  _promptEl = document.createElement('div');
  _promptEl.id = 'interaction-prompt';
  Object.assign(_promptEl.style, {
    position:   'fixed',
    bottom:     '120px',
    left:       '50%',
    transform:  'translateX(-50%)',
    background: 'rgba(10,8,15,0.85)',
    color:      '#e8c84a',
    padding:    '6px 18px',
    borderRadius: '20px',
    fontSize:   '13px',
    fontFamily: 'system-ui',
    border:     '1px solid #e8c84a44',
    display:    'none',
    pointerEvents: 'none',
    zIndex:     '60',
  });
  document.body.appendChild(_promptEl);

  // Touche E
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && _nearTarget) _interact(_nearTarget);
  });
}

// ── Spawn interactables ────────────────────────────────────────────────────

export function spawnPickup(itemId, position) {
  const def  = ITEM_DEFS[itemId];
  if (!def) return;

  const mesh = MeshBuilder.CreateSphere(`pickup_${itemId}_${_interactables.length}`,
    { diameter: 0.4, segments: 6 }, _scene);
  const mat  = new StandardMaterial('pickup-mat', _scene);
  mat.emissiveColor = new Color3(1, 0.85, 0.2);
  mesh.material     = mat;
  mesh.position.copyFrom(position);
  mesh.position.y  += 0.3;

  // Flottement
  let t = 0;
  const obs = _scene.onBeforeRenderObservable.add(() => {
    t += _scene.getEngine().getDeltaTime() / 1000;
    mesh.position.y = position.y + 0.3 + Math.sin(t * 2) * 0.12;
    mesh.rotation.y = t * 1.2;
  });

  const obj = { type: 'pickup', itemId, mesh, obs, collected: false };
  _interactables.push(obj);
  return obj;
}

export function spawnFactionMarker(factionId, position, label) {
  const color = factionId === 'guardians' ? new Color3(0.3, 0.55, 0.9) : new Color3(0.9, 0.3, 0.3);
  const mesh  = MeshBuilder.CreateCylinder(`faction_${_interactables.length}`,
    { height: 2.5, diameter: 0.3, tessellation: 6 }, _scene);
  const mat   = new StandardMaterial('faction-mat', _scene);
  mat.emissiveColor = color;
  mesh.material     = mat;
  mesh.position.copyFrom(position);

  const obj = { type: 'faction', factionId, label: label ?? factionId, mesh, used: false };
  _interactables.push(obj);
  return obj;
}

export function spawnLore(text, position) {
  const mesh = MeshBuilder.CreateBox(`lore_${_interactables.length}`,
    { size: 0.5 }, _scene);
  const mat  = new StandardMaterial('lore-mat', _scene);
  mat.emissiveColor = new Color3(0.6, 0.4, 1.0);
  mesh.material     = mat;
  mesh.position.copyFrom(position);

  const obj = { type: 'lore', text, mesh, read: false };
  _interactables.push(obj);
  return obj;
}

export function registerPortal(portal) {
  // Enregistrer un portail pour l'interaction
  if (portal && portal.id) {
    const obj = {
      type: 'portal',
      portalId: portal.id,
      portalName: portal.name,
      mesh: portal.mesh,
      targetBiome: portal.targetBiome,
      used: false,
    };
    _interactables.push(obj);
    return obj;
  }
  return null;
}

// ── Update (appelé chaque frame) ───────────────────────────────────────────

export function updateInteraction(playerPos) {
  if (!playerPos) return;

  let closest = null;
  let closestD = 2.0; // rayon d'interaction réduit — évite ramassage à distance

  for (const obj of _interactables) {
    if (obj.collected || obj.used) continue;
    const d = Vector3.Distance(playerPos, obj.mesh.position);
    if (d < closestD) { closestD = d; closest = obj; }
  }

  _nearTarget = closest;

  if (closest) {
    _promptEl.style.display = 'block';
    _promptEl.textContent   = _getPromptText(closest);
  } else {
    _promptEl.style.display = 'none';
  }
}

function _getPromptText(obj) {
  if (obj.type === 'pickup')  return `[E] Ramasser ${ITEM_DEFS[obj.itemId]?.name ?? obj.itemId}`;
  if (obj.type === 'faction') return `[E] Interagir — ${obj.label}`;
  if (obj.type === 'portal')  return `[E] Téléporter — ${obj.portalName}`;
  if (obj.type === 'lore')    return `[E] Lire`;
  return '[E] Interagir';
}

// ── Interaction ────────────────────────────────────────────────────────────

function _interact(obj) {
  if (obj.type === 'pickup' && !obj.collected) {
    obj.collected = true;
    obj.obs && _scene.onBeforeRenderObservable.remove(obj.obs);
    obj.mesh.dispose();
    addItem(obj.itemId, 1);
    Events.emit('loot:picked', { itemId: obj.itemId });
  }

  if (obj.type === 'faction' && !obj.used) {
    obj.used = true;
    shiftAlignment(obj.factionId === 'guardians' ? 20 : -20);
    Events.emit('faction:interacted', { factionId: obj.factionId });
  }

  if (obj.type === 'portal' && !obj.used) {
    obj.used = true;
    Events.emit('portal:used', { portalId: obj.portalId, targetBiome: obj.targetBiome });
  }

  if (obj.type === 'lore' && !obj.read) {
    obj.read = true;
    Events.emit('lore:read', { text: obj.text });
    _showLore(obj.text);
  }
}

function _showLore(text) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:   'fixed', top: '50%', left: '50%',
    transform:  'translate(-50%,-50%)',
    background: 'rgba(10,8,15,0.95)',
    color:      '#e8e0d0',
    padding:    '24px 32px',
    borderRadius: '8px',
    maxWidth:   '420px',
    fontSize:   '14px',
    lineHeight: '1.7',
    border:     '1px solid #e8c84a44',
    zIndex:     '200',
    fontFamily: 'system-ui',
  });
  el.innerHTML = `<p style="color:#e8c84a;margin-bottom:12px">Lore</p>${text}<br><br><small style="color:#888">[E ou clic pour fermer]</small>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', close);
  const onKey = (ev) => { if (ev.code === 'KeyE') { close(); window.removeEventListener('keydown', onKey); } };
  window.addEventListener('keydown', onKey);
}
