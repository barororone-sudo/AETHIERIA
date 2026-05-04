// ui/minimap.js — carte style Zelda BotW/TotK

import { getAllEnemies }    from '../gameplay/babylonEnemies.js';
import { getPlayerRoot }   from '../gameplay/babylonPlayerCharacter.js';
import { getActiveBoss }   from '../gameplay/babylonMiniBoss.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';

// ── Constantes ─────────────────────────────────────────────────────────────
const MINI_SIZE  = 150;
const MINI_RANGE = 80;
const MINI_SCALE = MINI_SIZE / (MINI_RANGE * 2);

const MAP_W     = 720;
const MAP_H     = 540;
const MAP_RANGE = 200;
const MAP_SCALE = Math.min(MAP_W, MAP_H) / (MAP_RANGE * 2);

// Couleurs style BotW
const C = {
  bg:         '#1a1a0a',
  terrain1:   '#2a2810',  // plaine sombre
  terrain2:   '#3a3418',  // colline
  terrain3:   '#4a4020',  // montagne
  terrain4:   '#5a4c28',  // pic
  water:      '#1a2a3a',
  iconBlue:   '#40c8ff',
  iconGlow:   'rgba(40,180,255,0.6)',
  iconGold:   '#f0c040',
  iconGoldGlow:'rgba(240,180,40,0.5)',
  iconRed:    '#ff4040',
  textWhite:  'rgba(255,255,255,0.9)',
  textGold:   '#e8c060',
  border:     '#0a0a05',
};

const POIS = [
  { x:  45, z:  45, type: 'shrine',   label: 'Archives'          },
  { x:   0, z: -50, type: 'tower',    label: 'Tour de Guet'      },
  { x: -60, z: -60, type: 'location', label: 'Carrefour Maudit'  },
  { x:  80, z:  60, type: 'tower',    label: 'Tour Majeure'      },
  { x:   0, z:  80, type: 'shrine',   label: 'Sanctuaire'        },
  { x:  25, z:  20, type: 'stable',   label: 'Gardiens'          },
  { x: -25, z: -15, type: 'stable',   label: 'Héritiers'         },
  { x:  12, z:   8, type: 'enemy',    label: ''                  },
  { x: -10, z:  15, type: 'enemy',    label: ''                  },
  { x:  20, z:  -5, type: 'enemy',    label: ''                  },
  { x:   5, z: -18, type: 'enemy',    label: ''                  },
  { x: -15, z: -10, type: 'enemy',    label: ''                  },
];

let _mini    = null;
let _miniCtx = null;
let _mapOpen = false;
let _overlay = null;
let _mapCvs  = null;
let _mapCtx  = null;
let _topoImg = null; // cache topographie

// ── Init ───────────────────────────────────────────────────────────────────

export function initMinimap() {
  _initMini();
  _initBigMap();
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyM')     { _mapOpen ? _closeMap() : _openMap(); }
    if (e.code === 'Escape' && _mapOpen) _closeMap();
  });
}

export function isWorldMapOpen() {
  return _mapOpen;
}

export function openWorldMap() {
  _openMap();
}

export function closeWorldMap() {
  _closeMap();
}

export function toggleWorldMap() {
  _mapOpen ? _closeMap() : _openMap();
}

// ── Minimap permanente ─────────────────────────────────────────────────────

function _initMini() {
  document.getElementById('minimap')?.remove();
  _mini = document.createElement('canvas');
  _mini.id = 'minimap';
  _mini.width  = MINI_SIZE;
  _mini.height = MINI_SIZE;
  Object.assign(_mini.style, {
    position: 'fixed', bottom: '170px', right: '20px',
    width: MINI_SIZE + 'px', height: MINI_SIZE + 'px',
    borderRadius: '50%',
    border: '2px solid #0a0a05',
    outline: '1px solid rgba(40,180,255,0.3)',
    boxShadow: '0 0 15px rgba(0,0,0,0.9), 0 0 6px rgba(40,180,255,0.15)',
    pointerEvents: 'none', zIndex: '60',
  });
  document.body.appendChild(_mini);
  _miniCtx = _mini.getContext('2d');
}

export function updateMinimap() {
  if (!_miniCtx) return;
  const p = getPlayerRoot();
  if (!p) return;
  _drawMini(p.position.x, p.position.z, p.rotation.y);
}

function _drawMini(px, pz, angle) {
  const ctx = _miniCtx;
  const cx  = MINI_SIZE / 2;
  const cy  = MINI_SIZE / 2;

  ctx.clearRect(0, 0, MINI_SIZE, MINI_SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, MINI_SIZE / 2 - 1, 0, Math.PI * 2);
  ctx.clip();

  // Fond sombre olive
  ctx.fillStyle = C.terrain1;
  ctx.fillRect(0, 0, MINI_SIZE, MINI_SIZE);

  // Topographie
  _topoMini(ctx, px, pz, cx, cy);

  // POI fixes
  for (const poi of POIS) {
    if (poi.type === 'enemy') continue;
    const sx = cx + (poi.x - px) * MINI_SCALE;
    const sy = cy + (poi.z - pz) * MINI_SCALE;
    if (sx < 3 || sx > MINI_SIZE - 3 || sy < 3 || sy > MINI_SIZE - 3) continue;
    _drawIconMini(ctx, sx, sy, poi.type);
  }

  // Ennemis vivants
  for (const e of getAllEnemies()) {
    if (!e.isAlive || !e.root) continue;
    const sx = cx + (e.root.position.x - px) * MINI_SCALE;
    const sy = cy + (e.root.position.z - pz) * MINI_SCALE;
    if (sx < 2 || sx > MINI_SIZE - 2 || sy < 2 || sy > MINI_SIZE - 2) continue;
    const hot = e.state === 'chase' || e.state === 'attack';
    ctx.fillStyle = hot ? C.iconRed : '#e08030';
    ctx.beginPath(); ctx.arc(sx, sy, hot ? 3 : 2, 0, Math.PI * 2); ctx.fill();
  }

  // Boss
  const boss = getActiveBoss();
  if (boss?.isAlive && boss.root) {
    const sx = Math.max(6, Math.min(MINI_SIZE - 6, cx + (boss.root.position.x - px) * MINI_SCALE));
    const sy = Math.max(6, Math.min(MINI_SIZE - 6, cy + (boss.root.position.z - pz) * MINI_SCALE));
    _glowCircle(ctx, sx, sy, 5, C.iconRed, 'rgba(255,40,40,0.5)');
  }

  // Joueur — point blanc lumineux
  _glowCircle(ctx, cx, cy, 4, '#ffffff', 'rgba(255,255,255,0.4)');
  // Direction
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - Math.sin(angle) * 8, cy - Math.cos(angle) * 8);
  ctx.stroke();

  ctx.restore();

  // N
  ctx.fillStyle = C.textGold;
  ctx.font      = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, 10);

  // [M]
  ctx.fillStyle = 'rgba(40,180,255,0.4)';
  ctx.font      = '7px sans-serif';
  ctx.fillText('[M]', cx, MINI_SIZE - 4);
}

function _topoMini(ctx, px, pz, cx, cy) {
  const step = 10;
  for (let dx = -MINI_RANGE; dx < MINI_RANGE; dx += step) {
    for (let dz = -MINI_RANGE; dz < MINI_RANGE; dz += step) {
      const h  = getTerrainHeight(px + dx, pz + dz);
      const sx = cx + dx * MINI_SCALE;
      const sy = cy + dz * MINI_SCALE;
      if (h > 0.5) {
        const t = Math.min(1, h / 8);
        ctx.fillStyle = `rgba(80,70,30,${t * 0.6})`;
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      }
    }
  }
}

function _drawIconMini(ctx, sx, sy, type) {
  const color = type === 'shrine' ? C.iconBlue : type === 'tower' ? C.iconGold : C.iconBlue;
  _glowCircle(ctx, sx, sy, 2.5, color, color.replace(')', ',0.4)').replace('rgb', 'rgba'));
}

// ── Grande carte ───────────────────────────────────────────────────────────

function _initBigMap() {
  _overlay = document.createElement('div');
  Object.assign(_overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.85)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '200',
  });
  document.body.appendChild(_overlay);

  _mapCvs = document.createElement('canvas');
  _mapCvs.width  = MAP_W;
  _mapCvs.height = MAP_H;
  Object.assign(_mapCvs.style, {
    display: 'block',
    boxShadow: '0 0 0 3px #0a0a05, 0 0 40px rgba(0,0,0,0.95)',
  });
  _overlay.appendChild(_mapCvs);
  _mapCtx = _mapCvs.getContext('2d');

  _overlay.addEventListener('click', e => { if (e.target === _overlay) _closeMap(); });
}

function _openMap()  { _mapOpen = true;  _overlay.style.display = 'flex'; _drawBigMap(); }
function _closeMap() { _mapOpen = false; _overlay.style.display = 'none'; }

function _drawBigMap() {
  const ctx    = _mapCtx;
  const player = getPlayerRoot();
  const px     = player?.position.x ?? 0;
  const pz     = player?.position.z ?? 0;
  const angle  = player?.rotation.y ?? 0;
  const cx     = MAP_W / 2;
  const cy     = MAP_H / 2;

  ctx.clearRect(0, 0, MAP_W, MAP_H);

  // ── Fond sombre ────────────────────────────────────────────────────────────
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // ── Topographie style BotW ─────────────────────────────────────────────────
  _drawTopo(ctx, px, pz, cx, cy);

  // ── Zones de terrain (plaines, forêts) ─────────────────────────────────────
  _drawZones(ctx, px, pz, cx, cy);

  // ── Noms de régions style BotW ─────────────────────────────────────────────
  _drawRegionNames(ctx, px, pz, cx, cy);

  // ── Ennemis ────────────────────────────────────────────────────────────────
  for (const e of getAllEnemies()) {
    if (!e.isAlive || !e.root) continue;
    const sx = cx + (e.root.position.x - px) * MAP_SCALE;
    const sy = cy + (e.root.position.z - pz) * MAP_SCALE;
    if (sx < 0 || sx > MAP_W || sy < 0 || sy > MAP_H) continue;
    const hot = e.state === 'chase' || e.state === 'attack';
    _drawEnemyDot(ctx, sx, sy, hot);
  }

  // ── Boss ───────────────────────────────────────────────────────────────────
  const boss = getActiveBoss();
  if (boss?.isAlive && boss.root) {
    const sx = cx + (boss.root.position.x - px) * MAP_SCALE;
    const sy = cy + (boss.root.position.z - pz) * MAP_SCALE;
    if (sx >= 0 && sx <= MAP_W && sy >= 0 && sy <= MAP_H)
      _drawBossDot(ctx, sx, sy);
  }

  // ── POI — icônes style BotW ────────────────────────────────────────────────
  for (const poi of POIS) {
    if (poi.type === 'enemy') continue;
    const sx = cx + (poi.x - px) * MAP_SCALE;
    const sy = cy + (poi.z - pz) * MAP_SCALE;
    if (sx < 10 || sx > MAP_W - 10 || sy < 10 || sy > MAP_H - 10) continue;
    _drawPOIIcon(ctx, sx, sy, poi);
  }

  // ── Joueur ─────────────────────────────────────────────────────────────────
  _drawPlayerDot(ctx, cx, cy, angle);

  // ── Cadre noir épais style BotW ────────────────────────────────────────────
  ctx.strokeStyle = C.border;
  ctx.lineWidth   = 6;
  ctx.strokeRect(0, 0, MAP_W, MAP_H);

  // ── Titre style BotW (bas droite, doré) ────────────────────────────────────
  ctx.fillStyle = C.textGold;
  ctx.font      = 'bold italic 22px serif';
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur  = 6;
  ctx.fillText('GUTTER GOD', MAP_W - 16, MAP_H - 14);
  ctx.shadowBlur  = 0;

  // ── Rose des vents (haut droite) ───────────────────────────────────────────
  _drawCompass(ctx, MAP_W - 40, 40, 24);

  // ── Coordonnées ────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(px)}, ${Math.round(pz)}`, 12, MAP_H - 12);

  // ── Hint ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font      = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('[M] / [Échap] Fermer', MAP_W / 2, MAP_H - 10);
}

// ── Topographie style BotW ─────────────────────────────────────────────────

function _drawTopo(ctx, px, pz, cx, cy) {
  const step = 6;
  for (let dx = -MAP_RANGE; dx <= MAP_RANGE; dx += step) {
    for (let dz = -MAP_RANGE; dz <= MAP_RANGE; dz += step) {
      const h  = getTerrainHeight(px + dx, pz + dz);
      const sx = cx + dx * MAP_SCALE;
      const sy = cy + dz * MAP_SCALE;
      if (sx < 0 || sx > MAP_W || sy < 0 || sy > MAP_H) continue;

      let color;
      if      (h > 5.5) color = C.terrain4;
      else if (h > 3.5) color = C.terrain3;
      else if (h > 1.5) color = C.terrain2;
      else if (h > 0.3) color = C.terrain1;
      else continue;

      ctx.fillStyle = color;
      ctx.fillRect(sx - step / 2, sy - step / 2, step, step);
    }
  }

  // Lignes de contour (style BotW — très fines, sombres)
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth   = 0.5;
  const levels = [1.5, 3.5, 5.5];
  for (const lv of levels) {
    for (let dx = -MAP_RANGE + step; dx < MAP_RANGE - step; dx += step) {
      for (let dz = -MAP_RANGE + step; dz < MAP_RANGE - step; dz += step) {
        const h0 = getTerrainHeight(px + dx,        pz + dz);
        const h1 = getTerrainHeight(px + dx + step, pz + dz);
        if ((h0 < lv) !== (h1 < lv)) {
          const sx = cx + dx * MAP_SCALE;
          const sy = cy + dz * MAP_SCALE;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + step * MAP_SCALE, sy);
          ctx.stroke();
        }
      }
    }
  }
}

function _drawZones(ctx, px, pz, cx, cy) {
  // Zone centrale (plaine) — légèrement plus claire
  const zx = cx + (0 - px) * MAP_SCALE;
  const zy = cy + (0 - pz) * MAP_SCALE;
  const g  = ctx.createRadialGradient(zx, zy, 0, zx, zy, 18 * MAP_SCALE);
  g.addColorStop(0,   'rgba(50,55,20,0.35)');
  g.addColorStop(1,   'rgba(50,55,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(zx, zy, 18 * MAP_SCALE, 0, Math.PI * 2);
  ctx.fill();
}

function _drawRegionNames(ctx, px, pz, cx, cy) {
  const regions = [
    { x:   0, z:   0, name: 'Plaine Centrale' },
    { x:  70, z:  50, name: 'Terres de Fer'   },
    { x: -50, z:  60, name: 'Forêt Corrompue' },
    { x:  30, z: -40, name: 'Ruines de l\'Est'},
    { x: -40, z: -30, name: 'Ancien Chemin'   },
  ];
  ctx.font      = 'italic 11px serif';
  ctx.textAlign = 'center';
  for (const r of regions) {
    const sx = cx + (r.x - px) * MAP_SCALE;
    const sy = cy + (r.z - pz) * MAP_SCALE;
    if (sx < 20 || sx > MAP_W - 20 || sy < 20 || sy > MAP_H - 20) continue;
    ctx.fillStyle   = 'rgba(255,255,255,0.22)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur  = 3;
    ctx.fillText(r.name, sx, sy);
    ctx.shadowBlur  = 0;
  }
}

// ── Icônes style BotW ──────────────────────────────────────────────────────

function _drawPOIIcon(ctx, sx, sy, poi) {
  ctx.save();
  ctx.translate(sx, sy);

  if (poi.type === 'shrine') {
    // Sanctuaire — losange bleu lumineux (style BotW)
    _glowShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
    }, C.iconBlue, C.iconGlow, 1.5);

    // Croix intérieure
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();

  } else if (poi.type === 'tower') {
    // Tour — goutte dorée (style BotW)
    _glowShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, Math.PI * 2);
      ctx.moveTo(-3, -1);
      ctx.lineTo(0, 6);
      ctx.lineTo(3, -1);
      ctx.closePath();
    }, C.iconGold, C.iconGoldGlow, 1.5);

  } else {
    // Location — cercle bleu simple
    _glowShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
    }, C.iconBlue, C.iconGlow, 1);
  }

  ctx.restore();

  // Label blanc style BotW
  if (poi.label) {
    ctx.save();
    ctx.fillStyle   = C.textWhite;
    ctx.font        = '10px sans-serif';
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 4;
    ctx.fillText(poi.label, sx, sy + 16);
    ctx.restore();
  }
}

function _drawEnemyDot(ctx, sx, sy, hot) {
  if (hot) {
    // Ennemi agressif — losange rouge
    ctx.save();
    ctx.translate(sx, sy);
    _glowShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(4, 0);
      ctx.lineTo(0, 5);  ctx.lineTo(-4, 0);
      ctx.closePath();
    }, C.iconRed, 'rgba(255,40,40,0.4)', 1);
    ctx.restore();
  } else {
    // Patrol — petit cercle orange
    ctx.fillStyle = '#c06020';
    ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function _drawBossDot(ctx, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy);
  const p = 7 + Math.sin(Date.now() / 200) * 2;
  _glowShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -p);
    ctx.lineTo(p * 0.6, 0);
    ctx.lineTo(0, p);
    ctx.lineTo(-p * 0.6, 0);
    ctx.closePath();
  }, C.iconRed, 'rgba(255,40,40,0.6)', 2);
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, 3);
  ctx.restore();
}

function _drawPlayerDot(ctx, cx, cy, angle) {
  // Cercle blanc lumineux + direction
  _glowCircle(ctx, cx, cy, 5, '#ffffff', 'rgba(255,255,255,0.5)');

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2;
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur  = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - Math.sin(angle) * 12, cy - Math.cos(angle) * 12);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function _drawCompass(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);

  // Fond sombre
  ctx.fillStyle   = 'rgba(10,10,5,0.7)';
  ctx.strokeStyle = 'rgba(40,180,255,0.3)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // N rouge, autres blancs
  const dirs = [
    { a: -Math.PI/2, l: 'N', c: '#e84040', s: 12 },
    { a:  Math.PI/2, l: 'S', c: C.textWhite, s: 9 },
    { a:  0,         l: 'E', c: C.textWhite, s: 9 },
    { a:  Math.PI,   l: 'O', c: C.textWhite, s: 9 },
  ];
  for (const d of dirs) {
    ctx.fillStyle   = d.c;
    ctx.font        = `bold ${d.s}px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur  = 3;
    ctx.fillText(d.l, Math.cos(d.a) * (r - 6), Math.sin(d.a) * (r - 6) + 3);
  }
  ctx.shadowBlur = 0;

  // Centre
  ctx.fillStyle = C.textGold;
  ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _glowCircle(ctx, x, y, r, fill, glow) {
  ctx.shadowColor = glow;
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;
}

function _glowShape(ctx, pathFn, fill, glow, lw) {
  ctx.shadowColor = glow;
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = fill;
  pathFn();
  ctx.fill();
  ctx.shadowBlur  = 0;
  if (lw) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = lw;
    pathFn();
    ctx.stroke();
  }
}
