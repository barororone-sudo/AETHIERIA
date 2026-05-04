// core/debugOverlay.js — overlay debug in-game complet (F1 pour toggle, F2 pour Babylon Inspector)

import { getScene, getEngine }        from '../engine/babylon/runtime.js';
import { getCameraDebug }             from '../engine/babylon/camera.js';
import { getPhysicsQueryDebug }       from '../engine/babylon/physicsAdapter.js';
import { getPlayerBody, getPlayerRoot } from '../gameplay/babylonPlayerCharacter.js';
import { getHp }                       from '../gameplay/babylonPlayerHealth.js';
import { getStamina, isGrounded }      from '../gameplay/babylonTraversal.js';
import { getAllEnemies }                from '../gameplay/babylonEnemies.js';
import { getLockedTarget, isInBulletTime, getComboStep } from '../gameplay/babylonCombat.js';
import { getProgression }              from '../gameplay/rpgProgression.js';
import { getFaction, getAlignment }    from '../gameplay/babylonFactions.js';
import { getTerrainHeight }            from '../world/babylonTerrain.js';
import { CONFIG }                      from './config.js';

let _el      = null;
let _visible = false;
let _interval = null;

export function initDebugOverlay() {
  _el = document.createElement('div');
  Object.assign(_el.style, {
    position:    'fixed',
    top:         '40px',
    left:        '8px',
    background:  'rgba(0,0,0,0.80)',
    color:       '#0ff',
    fontFamily:  'monospace',
    fontSize:    '11px',
    padding:     '8px 12px',
    borderRadius:'4px',
    pointerEvents:'none',
    zIndex:      '9998',
    lineHeight:  '1.7',
    display:     'none',
    minWidth:    '260px',
    border:      '1px solid rgba(0,255,255,0.2)',
  });
  document.body.appendChild(_el);

  // F1 = toggle overlay custom
  // F2 = toggle Babylon Inspector
  window.addEventListener('keydown', e => {
    if (e.code === 'F1') { e.preventDefault(); _toggle(); }
    if (e.code === 'F2') {
      e.preventDefault();
      const scene = getScene();
      if (!scene) return;
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        import('@babylonjs/inspector').then(() => {
          scene.debugLayer.show({ embedMode: true });
        });
      }
    }
  });

  // Hint visible en permanence
  const hint = document.createElement('div');
  Object.assign(hint.style, {
    position: 'fixed', top: '8px', left: '8px',
    color: 'rgba(255,255,255,0.3)', fontSize: '10px',
    fontFamily: 'monospace', pointerEvents: 'none', zIndex: '9997',
  });
  hint.textContent = '[F1] Debug  [F2] Inspector';
  document.body.appendChild(hint);
}

function _toggle() {
  _visible = !_visible;
  _el.style.display = _visible ? 'block' : 'none';
  if (_visible) {
    _update();
    _interval = setInterval(_update, 100);
  } else {
    clearInterval(_interval);
  }
}

function _c(ok, val) {
  return ok ? `<span style="color:#4f4">${val}</span>` : `<span style="color:#f44">${val}</span>`;
}
function _w(val) { return `<span style="color:#ff4">${val}</span>`; }
function _n(val) { return `<span style="color:#0ff">${val}</span>`; }

function _update() {
  if (!_el || !_visible) return;

  const engine  = getEngine();
  const scene   = getScene();
  const body    = getPlayerBody();
  const root    = getPlayerRoot();
  const hp      = getHp();
  const stamina = getStamina();
  const grounded= isGrounded();
  const enemies = getAllEnemies();
  const locked  = getLockedTarget();
  const prog    = getProgression();
  const faction = getFaction();
  const align   = getAlignment();
  const camDbg  = getCameraDebug();
  const queryDbg = getPhysicsQueryDebug();

  // Position joueur
  const pos  = body ? body.translation() : { x:0, y:0, z:0 };
  const vel  = body ? body.linvel()      : { x:0, y:0, z:0 };
  const terrY = getTerrainHeight(pos.x, pos.z);

  // FPS
  const fps = engine ? Math.round(engine.getFps()) : 0;
  const fpsColor = fps >= 55 ? '#4f4' : fps >= 40 ? '#ff4' : '#f44';

  // Ennemis vivants
  const alive   = enemies.filter(e => e.isAlive);
  const nearest = alive.reduce((best, e) => {
    if (!root || !e.root) return best;
    const d = Math.sqrt(
      (e.root.position.x - root.position.x) ** 2 +
      (e.root.position.z - root.position.z) ** 2
    );
    return (!best || d < best.d) ? { e, d } : best;
  }, null);

  // Draw calls
  const dc = scene ? scene.getActiveMeshes().length : 0;

  const lines = [
    `<b style="color:#fff">── GUTTER GOD DEBUG ──</b>`,
    `FPS  <span style="color:${fpsColor}">${fps}</span>   DrawCalls ${_c(dc < CONFIG.render.maxDrawCalls, dc)}`,
    ``,
    `<b style="color:#aaa">── JOUEUR ──</b>`,
    `HP       ${_c(hp.current > 30, `${Math.ceil(hp.current)} / ${hp.max}`)}`,
    `Stamina  ${_c(stamina > 20, Math.ceil(stamina))} / ${CONFIG.stamina.max}`,
    `Grounded ${_c(grounded, grounded ? 'OUI' : 'NON')}`,
    `Pos      X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(1)}`,
    `Terrain  Y:${terrY.toFixed(2)}  Δ:${(pos.y - terrY - CONFIG.player.height/2).toFixed(3)}`,
    `Vel      X:${vel.x.toFixed(1)} Y:${vel.y.toFixed(2)} Z:${vel.z.toFixed(1)}`,
    `GroundQ  ${queryDbg.groundSource} Y:${queryDbg.groundY.toFixed(2)}`,
    `Camera   R:${camDbg.collisionRadius.toFixed(2)} / ${camDbg.desiredRadius.toFixed(2)} Hit:${queryDbg.cameraHit ? queryDbg.cameraHitMesh || 'decor' : 'non'}`,
    ``,
    `<b style="color:#aaa">── COMBAT ──</b>`,
    `Lock-on  ${locked ? _c(true, locked.type + ' HP:' + locked.hp) : _c(false, 'aucun')}`,
    `Combo    ${_n(getComboStep() + 1)} / 3`,
    `BulletT  ${_c(isInBulletTime(), isInBulletTime() ? 'ACTIF' : 'off')}`,
    ``,
    `<b style="color:#aaa">── ENNEMIS ──</b>`,
    `Vivants  ${_n(alive.length)} / ${enemies.length}`,
    nearest ? `Plus proche  ${_w(nearest.e.type)} ${nearest.d.toFixed(1)}u  ${nearest.e.state}` : `Plus proche  —`,
    alive.slice(0, 3).map(e => `  ${e.type} HP:${e.hp}/${e.maxHp} [${e.state}]`).join('<br>'),
    ``,
    `<b style="color:#aaa">── PROGRESSION ──</b>`,
    `Niveau   ${_n(prog.level)}  XP:${prog.xp}`,
    `Faction  ${faction ? _c(true, faction) : _w('aucune')}  Align:${align}`,
    `Quêtes   ${_n(Object.values(prog.quests).filter(q => q.status === 'done').length)} complétées`,
    `Items    ${_n(Object.keys(prog.inventory).length)} types`,
  ];

  _el.innerHTML = lines.join('<br>');
}
