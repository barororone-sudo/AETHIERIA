// ui/uiNavigator.js — dock souris + menu circulaire rapide

const WHEEL_ITEMS = [
  { key: 'inventory', label: 'Inventaire', icon: '🎒', angle: -90 },
  { key: 'journal',   label: 'Journal',    icon: '📜', angle: -30 },
  { key: 'map',       label: 'Carte',      icon: '🗺️', angle: 30 },
  { key: 'settings',  label: 'Parametres', icon: '⚙️', angle: 90 },
  { key: 'pause',     label: 'Pause',      icon: '⏸️', angle: 150 },
  { key: 'menu',      label: 'Menu',       icon: '🏠', angle: 210 },
];

function _degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function initUiNavigator(actions) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/ui/uiNavigator.css';
  document.head.appendChild(link);

  const dock = document.createElement('div');
  dock.id = 'ui-nav-dock';
  dock.innerHTML = `
    <button class="ui-nav-btn" data-act="inventory" title="Inventaire">🎒</button>
    <button class="ui-nav-btn" data-act="journal" title="Journal">📜</button>
    <button class="ui-nav-btn" data-act="map" title="Carte">🗺️</button>
    <button class="ui-nav-btn" data-act="settings" title="Parametres">⚙️</button>
    <button class="ui-nav-btn" data-act="pause" title="Pause">⏸️</button>
    <button class="ui-nav-btn" data-act="wheel" title="Menu circulaire">◉</button>
  `;

  const wheel = document.createElement('div');
  wheel.id = 'ui-nav-wheel';
  wheel.innerHTML = `
    <div class="wheel-core">Navigation rapide</div>
    <div class="wheel-tip">Clic gauche pour choisir, clic droit pour fermer</div>
  `;

  const radius = 154;
  let activeKey = null;

  const itemEls = new Map();
  for (const item of WHEEL_ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'wheel-item';
    btn.dataset.key = item.key;
    btn.innerHTML = `<span class="wheel-ico">${item.icon}</span><span class="wheel-label">${item.label}</span>`;
    const x = Math.cos(_degToRad(item.angle)) * radius;
    const y = Math.sin(_degToRad(item.angle)) * radius;
    btn.style.left = `calc(50% + ${Math.round(x)}px)`;
    btn.style.top = `calc(50% + ${Math.round(y)}px)`;
    wheel.appendChild(btn);
    itemEls.set(item.key, btn);
  }

  function invoke(actionKey) {
    switch (actionKey) {
      case 'inventory': actions.openPanel?.('inventory'); break;
      case 'journal': actions.openPanel?.('journal'); break;
      case 'settings': actions.openPanel?.('settings'); break;
      case 'map': actions.toggleMap?.(); break;
      case 'pause': actions.togglePause?.(); break;
      case 'menu': actions.returnToMainMenu?.(); break;
      default: break;
    }
  }

  function closeWheel() {
    wheel.style.display = 'none';
    activeKey = null;
    itemEls.forEach((el) => el.classList.remove('is-active'));
  }

  function openWheel() {
    wheel.style.display = 'block';
  }

  function toggleWheel() {
    if (wheel.style.display === 'block') {
      closeWheel();
    } else {
      openWheel();
    }
  }

  dock.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.dataset.act;
    if (action === 'wheel') {
      toggleWheel();
      return;
    }
    invoke(action);
  });

  wheel.addEventListener('mousemove', (e) => {
    const btn = e.target.closest('.wheel-item');
    if (!btn) return;
    const key = btn.dataset.key;
    if (activeKey === key) return;
    activeKey = key;
    itemEls.forEach((el) => el.classList.toggle('is-active', el.dataset.key === key));
  });

  wheel.addEventListener('click', (e) => {
    const btn = e.target.closest('.wheel-item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    invoke(btn.dataset.key);
    closeWheel();
  });

  wheel.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    closeWheel();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV') {
      e.preventDefault();
      toggleWheel();
    }
    if (e.code === 'Escape' && wheel.style.display === 'block') {
      e.preventDefault();
      closeWheel();
    }
  }, true);

  document.body.appendChild(dock);
  document.body.appendChild(wheel);

  return {
    openWheel,
    closeWheel,
  };
}
