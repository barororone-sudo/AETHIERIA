// ui/mainMenu.js — écran titre et navigation d'entrée en jeu

const SETTINGS_KEY = 'gg2.menuSettings';

function _loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      masterVolume: Number(parsed.masterVolume ?? 0.8),
      mouseSensitivity: Number(parsed.mouseSensitivity ?? 1.0),
    };
  } catch {
    return { masterVolume: 0.8, mouseSensitivity: 1.0 };
  }
}

function _saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getMenuSettings() {
  return _loadSettings();
}

export function showMainMenu({ hasSave = false } = {}) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/ui/mainMenu.css';
    document.head.appendChild(link);

    const root = document.createElement('div');
    root.id = 'main-menu-root';

    const settings = _loadSettings();

    root.innerHTML = `
      <div class="menu-shell">
        <div>
          <div class="menu-title">GUTTER<br/>GOD</div>
          <div class="menu-sub">
            Explore un monde ravagé, choisis ta faction et tiens jusqu'au dernier acte.
          </div>
          <div class="menu-note" id="menu-note"></div>
        </div>
        <div class="menu-right">
          <button class="menu-btn" id="menu-new">Nouvelle partie</button>
          <button class="menu-btn" id="menu-continue" ${hasSave ? '' : 'disabled'}>Continuer</button>
          <button class="menu-btn" id="menu-settings">Parametres</button>
          <button class="menu-btn" id="menu-quit" disabled>Quitter (Web)</button>
        </div>
      </div>
    `;

    const note = root.querySelector('#menu-note');
    const cleanup = () => {
      root.remove();
      link.remove();
    };

    const openSettings = () => {
      const modal = document.createElement('div');
      modal.className = 'menu-modal';
      modal.innerHTML = `
        <div class="menu-modal-card">
          <div class="menu-modal-title">Parametres</div>
          <div class="menu-setting-row">
            <label>Volume master: <span id="master-volume-label"></span></label>
            <input id="master-volume" type="range" min="0" max="1" step="0.01" value="${settings.masterVolume}" />
          </div>
          <div class="menu-setting-row">
            <label>Sensibilite souris: <span id="mouse-sens-label"></span></label>
            <input id="mouse-sens" type="range" min="0.5" max="2" step="0.05" value="${settings.mouseSensitivity}" />
          </div>
          <button class="menu-btn" id="menu-settings-close">Fermer</button>
        </div>
      `;

      const mv = modal.querySelector('#master-volume');
      const ms = modal.querySelector('#mouse-sens');
      const mvLabel = modal.querySelector('#master-volume-label');
      const msLabel = modal.querySelector('#mouse-sens-label');

      const refreshLabels = () => {
        mvLabel.textContent = `${Math.round(Number(mv.value) * 100)}%`;
        msLabel.textContent = `${Number(ms.value).toFixed(2)}x`;
      };

      mv.addEventListener('input', () => {
        settings.masterVolume = Number(mv.value);
        _saveSettings(settings);
        refreshLabels();
      });

      ms.addEventListener('input', () => {
        settings.mouseSensitivity = Number(ms.value);
        _saveSettings(settings);
        refreshLabels();
      });

      modal.querySelector('#menu-settings-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      root.appendChild(modal);
      refreshLabels();
    };

    root.querySelector('#menu-new').addEventListener('click', () => {
      cleanup();
      resolve('new');
    });

    root.querySelector('#menu-continue').addEventListener('click', () => {
      cleanup();
      resolve('continue');
    });

    root.querySelector('#menu-settings').addEventListener('click', openSettings);

    root.querySelector('#menu-quit').addEventListener('click', () => {
      note.textContent = 'Quitter est indisponible en mode navigateur.';
    });

    document.body.appendChild(root);
  });
}
