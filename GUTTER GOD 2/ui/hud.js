// ui/hud.js

import { Events }          from '../core/events.js';
import { getActiveQuests } from '../gameplay/rpgProgression.js';
import { QUEST_DEFS }      from '../gameplay/storyData.js';
import { CONFIG }          from '../core/config.js';
import { getSkillCooldowns } from '../gameplay/babylonSkills.js';

let _els = {};

export function initHud() {
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/ui/hud.css';
  document.head.appendChild(link);

  document.getElementById('hud-root').innerHTML = `
    <div id="hud-bl">
      <div class="hud-row">
        <span class="hud-lbl">❤</span>
        <div class="hud-track"><div id="hud-hp" class="hud-fill hp"></div></div>
        <span id="hud-hp-n" class="hud-num">100</span>
      </div>
      <div class="hud-row">
        <span class="hud-lbl">⚡</span>
        <div class="hud-track"><div id="hud-st" class="hud-fill st"></div></div>
        <span id="hud-st-n" class="hud-num">100</span>
      </div>
      <div id="hud-lvl">Niv. 1</div>
    </div>
    <div id="hud-quest">
      <div id="hud-qt">—</div>
      <div id="hud-qs"></div>
    </div>
    <div id="hud-skills"></div>
    <div id="hud-cross"></div>
    <div id="hud-lock"></div>
    <div id="hud-notifs"></div>
    <div id="hud-hint">[I] Inventaire &nbsp; [J] Journal &nbsp; [P] Paramètres &nbsp; [M] Minimap &nbsp; [F10/O] Pause &nbsp; [V] Roue UI &nbsp; [F] Block/Parry</div>
  `;

  _els = {
    hp:     document.getElementById('hud-hp'),
    hpN:    document.getElementById('hud-hp-n'),
    st:     document.getElementById('hud-st'),
    stN:    document.getElementById('hud-st-n'),
    lvl:    document.getElementById('hud-lvl'),
    qt:     document.getElementById('hud-qt'),
    qs:     document.getElementById('hud-qs'),
    lock:   document.getElementById('hud-lock'),
    notifs: document.getElementById('hud-notifs'),
    skills: document.getElementById('hud-skills'),
  };

  _initSkillBar();

  Events.on('player:damaged',  ({ hp })    => updateHp(hp, null));
  Events.on('player:respawned',()          => updateHp(CONFIG.player.maxHp * 0.5, CONFIG.player.maxHp));
  Events.on('combat:lockOn',   ()          => _els.lock.classList.add('on'));
  Events.on('combat:lockOff',  ()          => _els.lock.classList.remove('on'));
  Events.on('quest:completed', ({ questId })=> notify(`✓ ${QUEST_DEFS[questId]?.title ?? questId}`));
  Events.on('player:levelUp',  ({ level }) => { _els.lvl.textContent = `Niv. ${level}`; notify(`⬆ Niveau ${level} !`); });
  Events.on('loot:picked',     ({ itemId })=> notify(`+ ${itemId.replace(/-/g,' ')}`));
  Events.on('quest:updated',   ()          => refreshQuest());
  Events.on('enemy:attack',    ()          => _flashDmg());
  Events.on('combat:comboStep',({ step, dmg }) => _showCombo(step, dmg));
  Events.on('combat:miss',     ()          => _showMiss());
  Events.on('combat:bulletTime',({ active }) => _toggleBulletTime(active));
  Events.on('combat:dodge',    ()          => _flashDodge());
  Events.on('combat:block',   ({ active }) => _toggleBlockIndicator(active));
  Events.on('combat:parry',   ()          => _flashParry());
  Events.on('combat:blocked', ({ reducedDamage }) => notify(`Block! -${reducedDamage} HP`));
  Events.on('enemy:staggered',()          => notify('PARRY!'));
  Events.on('skill:used',     ({ id })    => _flashSkillUsed(id));
  Events.on('skill:cooldown', ({ id })    => _flashSkillCooldown(id));
  Events.on('skill:noStamina',({ id })    => notify('Stamina insuffisante!'));
  Events.on('ui:notification',({ text })   => notify(text));
}

export function updateHp(current, max) {
  if (!_els.hp) return;
  const m   = max ?? CONFIG.player.maxHp;
  const pct = Math.max(0, Math.min(1, current / m)) * 100;
  _els.hp.style.width    = pct + '%';
  _els.hpN.textContent   = Math.ceil(current);
  _els.hp.style.background = pct > 50 ? '#4ae84a' : pct > 25 ? '#e8c84a' : '#e84a4a';
}

export function updateStamina(current, max) {
  if (!_els.st) return;
  _els.st.style.width  = Math.max(0, Math.min(100, current / max * 100)) + '%';
  _els.stN.textContent = Math.ceil(current);
}

export function refreshQuest() {
  const active = getActiveQuests();
  if (!active.length) { _els.qt.textContent = 'Aucune quête active'; _els.qs.textContent = ''; return; }
  const q = active[0];
  _els.qt.textContent = q.title;
  _els.qs.textContent = q.steps[0]?.desc ?? '';
}

export function notify(msg) {
  const el = document.createElement('div');
  el.className   = 'notif';
  el.textContent = msg;
  _els.notifs.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function _flashDmg() {
  const el = document.createElement('div');
  Object.assign(el.style, { position:'fixed', inset:'0', background:'rgba(220,0,0,0.18)', pointerEvents:'none', zIndex:'80' });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 180);
}

// Indicateur combo (3 points en bas au centre)
let _comboEl = null;
function _showCombo(step, dmg) {
  if (!_comboEl) {
    _comboEl = document.createElement('div');
    Object.assign(_comboEl.style, {
      position:'fixed', bottom:'160px', left:'50%',
      transform:'translateX(-50%)',
      display:'flex', gap:'8px', pointerEvents:'none', zIndex:'70',
    });
    document.body.appendChild(_comboEl);
  }
  // 3 points : actif = jaune, inactif = gris
  const dots = [0,1,2].map(i => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      width:'10px', height:'10px', borderRadius:'50%',
      background: i <= step ? '#e8c84a' : 'rgba(255,255,255,0.2)',
      boxShadow: i === step ? '0 0 8px #e8c84a' : 'none',
      transition: 'all 0.1s',
    });
    return d;
  });
  _comboEl.innerHTML = '';
  dots.forEach(d => _comboEl.appendChild(d));
  // Afficher le dégât
  _showDmgNumber(dmg);
  // Cacher après 1.5s
  clearTimeout(_comboEl._timer);
  _comboEl._timer = setTimeout(() => { if (_comboEl) _comboEl.innerHTML = ''; }, 1500);
}

function _showDmgNumber(dmg) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:'fixed',
    top: `${40 + Math.random() * 20}%`,
    left: `${45 + Math.random() * 10}%`,
    color:'#e8c84a', fontWeight:'700', fontSize:'22px',
    pointerEvents:'none', zIndex:'90',
    textShadow:'0 0 8px rgba(0,0,0,0.8)',
    animation:'dmgpop 0.6s ease forwards',
  });
  el.textContent = `-${dmg}`;
  document.body.appendChild(el);
  // Ajouter keyframe si pas encore fait
  if (!document.getElementById('dmg-style')) {
    const s = document.createElement('style');
    s.id = 'dmg-style';
    s.textContent = '@keyframes dmgpop{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}';
    document.head.appendChild(s);
  }
  setTimeout(() => el.remove(), 650);
}

function _showMiss() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:'fixed', top:'45%', left:'50%',
    transform:'translateX(-50%)',
    color:'rgba(255,255,255,0.5)', fontSize:'14px',
    pointerEvents:'none', zIndex:'90',
  });
  el.textContent = 'Hors portée';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

let _btOverlay = null;
function _toggleBulletTime(active) {
  if (active) {
    _btOverlay = document.createElement('div');
    Object.assign(_btOverlay.style, {
      position:'fixed', inset:'0',
      border:'3px solid rgba(100,180,255,0.6)',
      boxShadow:'inset 0 0 60px rgba(100,180,255,0.15)',
      pointerEvents:'none', zIndex:'75',
      transition:'opacity 0.2s',
    });
    document.body.appendChild(_btOverlay);
  } else {
    _btOverlay?.remove();
    _btOverlay = null;
  }
}

function _flashDodge() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:'fixed', inset:'0',
    background:'rgba(255,255,255,0.08)',
    pointerEvents:'none', zIndex:'80',
    transition:'opacity 0.15s',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 200);
}

let _blockOverlay = null;
function _toggleBlockIndicator(active) {
  if (active) {
    _blockOverlay = document.createElement('div');
    Object.assign(_blockOverlay.style, {
      position:'fixed', inset:'0',
      border:'3px solid rgba(200,200,255,0.5)',
      boxShadow:'inset 0 0 40px rgba(150,150,255,0.1)',
      pointerEvents:'none', zIndex:'76',
      transition:'opacity 0.15s',
    });
    document.body.appendChild(_blockOverlay);
  } else {
    _blockOverlay?.remove();
    _blockOverlay = null;
  }
}

function _flashParry() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:'fixed', inset:'0',
    background:'rgba(255,230,100,0.25)',
    pointerEvents:'none', zIndex:'85',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 250);
}

let _skillEls = {};
function _initSkillBar() {
  if (!_els.skills) return;
  const skills = CONFIG.combat.skills;
  Object.assign(_els.skills.style, {
    position:'fixed', bottom:'20px', left:'50%',
    transform:'translateX(-50%)',
    display:'flex', gap:'8px', zIndex:'70',
    pointerEvents:'none',
  });

  for (const [id, cfg] of Object.entries(skills)) {
    const slot = document.createElement('div');
    Object.assign(slot.style, {
      width:'48px', height:'48px', position:'relative',
      border:'2px solid rgba(255,255,255,0.3)', borderRadius:'6px',
      background:'rgba(0,0,0,0.5)', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', overflow:'hidden',
    });

    const keyLabel = document.createElement('div');
    Object.assign(keyLabel.style, { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginBottom:'2px' });
    keyLabel.textContent = cfg.key.replace('Digit', '');

    const nameLabel = document.createElement('div');
    Object.assign(nameLabel.style, { fontSize:'8px', color:'#ccc', textAlign:'center', lineHeight:'1.1' });
    nameLabel.textContent = cfg.label.split(' ').map(w => w[0]).join('');

    const cdOverlay = document.createElement('div');
    Object.assign(cdOverlay.style, {
      position:'absolute', bottom:'0', left:'0', right:'0',
      background:'rgba(0,0,0,0.7)', height:'0%',
      transition:'height 0.1s',
    });

    const cdText = document.createElement('div');
    Object.assign(cdText.style, {
      position:'absolute', bottom:'2px', left:'0', right:'0',
      textAlign:'center', fontSize:'10px', color:'#fff', fontWeight:'bold',
    });

    slot.appendChild(cdOverlay);
    slot.appendChild(keyLabel);
    slot.appendChild(nameLabel);
    slot.appendChild(cdText);
    _els.skills.appendChild(slot);
    _skillEls[id] = { slot, cdOverlay, cdText };
  }
}

export function updateSkillHud() {
  const cds = getSkillCooldowns();
  for (const [id, info] of Object.entries(cds)) {
    const el = _skillEls[id];
    if (!el) continue;
    if (info.ready) {
      el.cdOverlay.style.height = '0%';
      el.cdText.textContent = '';
      el.slot.style.borderColor = 'rgba(255,255,255,0.3)';
    } else {
      const pct = Math.min(100, (info.remaining / info.total) * 100);
      el.cdOverlay.style.height = pct + '%';
      el.cdText.textContent = Math.ceil(info.remaining) + 's';
      el.slot.style.borderColor = 'rgba(255,100,100,0.5)';
    }
  }
}

function _flashSkillUsed(id) {
  const el = _skillEls[id];
  if (!el) return;
  el.slot.style.borderColor = '#e8c84a';
  el.slot.style.boxShadow = '0 0 12px rgba(232,200,74,0.6)';
  setTimeout(() => {
    el.slot.style.borderColor = 'rgba(255,255,255,0.3)';
    el.slot.style.boxShadow = 'none';
  }, 300);
}

function _flashSkillCooldown(id) {
  const el = _skillEls[id];
  if (!el) return;
  el.slot.style.borderColor = '#e84a4a';
  setTimeout(() => { el.slot.style.borderColor = 'rgba(255,100,100,0.5)'; }, 200);
}
