// ui/panels.js — inventaire (I), journal (J), settings (P)

import { getProgression, getActiveQuests, useItem } from '../gameplay/rpgProgression.js';
import { ITEM_DEFS, QUEST_DEFS }                    from '../gameplay/storyData.js';
import { Events }                                    from '../core/events.js';

let _overlay = null;
let _open    = null; // 'inventory' | 'journal' | 'settings' | null

// ── Init ───────────────────────────────────────────────────────────────────

export function initPanels() {
  // Overlay conteneur
  _overlay = document.createElement('div');
  Object.assign(_overlay.style, {
    position:   'fixed', inset: '0',
    background: 'rgba(0,0,0,0.72)',
    display:    'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex:     '150',
    fontFamily: 'system-ui',
  });
  document.body.appendChild(_overlay);

  // Touches
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyI') _toggle('inventory');
    if (e.code === 'KeyJ') _toggle('journal');
    if (e.code === 'KeyP') _toggle('settings');
    if (e.code === 'Escape' && _open) _close();
  });

  // Fermer sur clic overlay
  _overlay.addEventListener('click', e => { if (e.target === _overlay) _close(); });

  // Rafraîchir si loot ramassé
  Events.on('loot:picked', () => { if (_open === 'inventory') _renderInventory(); });
  Events.on('quest:completed', () => { if (_open === 'journal') _renderJournal(); });
}

export function openPanel(panel) {
  if (!['inventory', 'journal', 'settings'].includes(panel)) return;
  _toggle(panel);
}

export function closePanels() {
  _close();
}

export function getOpenPanel() {
  return _open;
}

// ── Toggle ─────────────────────────────────────────────────────────────────

function _toggle(panel) {
  if (_open === panel) { _close(); return; }
  _open = panel;
  _overlay.style.display = 'flex';
  if (panel === 'inventory') _renderInventory();
  if (panel === 'journal')   _renderJournal();
  if (panel === 'settings')  _renderSettings();
}

function _close() {
  _open = null;
  _overlay.style.display = 'none';
  _overlay.innerHTML = '';
}

// ── Panel base ─────────────────────────────────────────────────────────────

function _panel(title) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    background: 'rgba(10,8,20,0.97)',
    border:     '1px solid rgba(232,200,74,0.25)',
    borderRadius: '8px',
    padding:    '24px',
    minWidth:   '360px',
    maxWidth:   '520px',
    maxHeight:  '70vh',
    overflowY:  'auto',
    color:      '#e8e0d0',
  });
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="color:#e8c84a;font-size:16px;font-weight:700">${title}</span>
      <button onclick="this.closest('[data-panel]').dispatchEvent(new Event('close-panel'))"
        style="background:none;border:none;color:#888;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div class="panel-body"></div>
  `;
  el.dataset.panel = '1';
  el.addEventListener('close-panel', _close);
  _overlay.innerHTML = '';
  _overlay.appendChild(el);
  return el.querySelector('.panel-body');
}

// ── Inventaire ─────────────────────────────────────────────────────────────

function _renderInventory() {
  const body = _panel('Inventaire');
  const prog = getProgression();
  const inv  = prog.inventory;
  const ids  = Object.keys(inv).filter(id => inv[id] > 0);

  if (!ids.length) {
    body.innerHTML = '<p style="color:#666;font-size:13px">Inventaire vide.</p>';
    return;
  }

  body.innerHTML = ids.map(id => {
    const def = ITEM_DEFS[id] ?? { name: id, type: 'misc' };
    const qty = inv[id];
    const canUse = def.type === 'consumable';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.05);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px">
          ${_itemEmoji(def.type)}
        </div>
        <div style="flex:1">
          <div style="font-size:13px">${def.name}</div>
          <div style="font-size:11px;color:#888">${def.type} × ${qty}</div>
        </div>
        ${canUse ? `<button data-use="${id}" style="background:#2a4a2a;border:1px solid #4a8a4a;color:#8ae88a;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px">Utiliser</button>` : ''}
      </div>
    `;
  }).join('');

  // Boutons utiliser
  body.querySelectorAll('[data-use]').forEach(btn => {
    btn.addEventListener('click', () => {
      useItem(btn.dataset.use);
      _renderInventory();
    });
  });
}

function _itemEmoji(type) {
  return { consumable: '🧪', material: '💎', key: '🔑', misc: '📦' }[type] ?? '📦';
}

// ── Journal ────────────────────────────────────────────────────────────────

function _renderJournal() {
  const body = _panel('Journal de quêtes');
  const prog = getProgression();
  const all  = Object.entries(QUEST_DEFS);

  body.innerHTML = all.map(([id, def]) => {
    const state  = prog.quests[id];
    const status = state?.status ?? 'inactive';
    const color  = status === 'done' ? '#4ae84a' : status === 'active' ? '#e8c84a' : '#444';
    const icon   = status === 'done' ? '✓' : status === 'active' ? '◆' : '○';
    return `
      <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;gap:8px;align-items:center">
          <span style="color:${color};font-size:14px">${icon}</span>
          <span style="font-size:13px;color:${status === 'inactive' ? '#555' : '#e8e0d0'}">${def.title}</span>
          ${status === 'done' ? '<span style="font-size:11px;color:#4ae84a;margin-left:auto">+' + def.reward.xp + ' XP</span>' : ''}
        </div>
        ${status !== 'inactive' ? `<div style="font-size:11px;color:#888;margin-top:4px;padding-left:22px">${def.desc}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── Settings ───────────────────────────────────────────────────────────────

function _renderSettings() {
  const body = _panel('Paramètres');
  body.innerHTML = `
    <div style="font-size:13px;color:#888;margin-bottom:16px">Raccourcis clavier</div>
    ${[
      ['Z / W / ↑',    'Avancer'],
      ['S / ↓',        'Reculer'],
      ['Q / A / ←',    'Gauche'],
      ['D / →',        'Droite'],
      ['Shift',        'Sprint'],
      ['Espace',       'Saut / Glide'],
      ['Clic gauche',  'Attaque'],
      ['Clic droit',   'Bullet-time'],
      ['Tab',          'Lock-on'],
      ['K',            'Esquive'],
      ['E',            'Interagir'],
      ['I',            'Inventaire'],
      ['J',            'Journal'],
      ['P / Échap',    'Fermer panel'],
    ].map(([k, v]) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px">
        <span style="color:#e8c84a">${k}</span>
        <span style="color:#aaa">${v}</span>
      </div>
    `).join('')}
  `;
}
