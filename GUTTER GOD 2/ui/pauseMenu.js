// ui/pauseMenu.js — menu pause avec reprise/sauvegarde/settings/menu

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

export function initPauseMenu({ onResume, onSave, onReturnToMainMenu }) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/ui/pauseMenu.css';
  document.head.appendChild(link);

  const root = document.createElement('div');
  root.id = 'pause-menu-root';
  root.innerHTML = `
    <div class="pause-card">
      <div class="pause-title">PAUSE</div>
      <div class="pause-actions">
        <button class="pause-btn" id="pause-resume">Reprendre</button>
        <button class="pause-btn" id="pause-save">Sauvegarder</button>
        <button class="pause-btn" id="pause-settings">Parametres</button>
        <button class="pause-btn" id="pause-menu">Retour menu principal</button>
      </div>
      <div class="pause-note" id="pause-note">Esc: reprendre</div>
    </div>
  `;

  const note = root.querySelector('#pause-note');

  const openSettings = () => {
    const settings = _loadSettings();
    const modal = document.createElement('div');
    modal.className = 'pause-modal';
    modal.innerHTML = `
      <div class="pause-modal-card">
        <div class="pause-modal-title">Parametres</div>
        <div class="pause-setting-row">
          <label>Volume master: <span id="pause-master-label"></span></label>
          <input id="pause-master" type="range" min="0" max="1" step="0.01" value="${settings.masterVolume}" />
        </div>
        <div class="pause-setting-row">
          <label>Sensibilite souris: <span id="pause-mouse-label"></span></label>
          <input id="pause-mouse" type="range" min="0.5" max="2" step="0.05" value="${settings.mouseSensitivity}" />
        </div>
        <button class="pause-btn" id="pause-settings-close">Fermer</button>
      </div>
    `;

    const master = modal.querySelector('#pause-master');
    const mouse = modal.querySelector('#pause-mouse');
    const masterLabel = modal.querySelector('#pause-master-label');
    const mouseLabel = modal.querySelector('#pause-mouse-label');

    const refresh = () => {
      masterLabel.textContent = `${Math.round(Number(master.value) * 100)}%`;
      mouseLabel.textContent = `${Number(mouse.value).toFixed(2)}x`;
    };

    master.addEventListener('input', () => {
      settings.masterVolume = Number(master.value);
      _saveSettings(settings);
      refresh();
    });

    mouse.addEventListener('input', () => {
      settings.mouseSensitivity = Number(mouse.value);
      _saveSettings(settings);
      refresh();
    });

    modal.querySelector('#pause-settings-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    root.appendChild(modal);
    refresh();
  };

  root.querySelector('#pause-resume').addEventListener('click', () => onResume?.());
  root.querySelector('#pause-save').addEventListener('click', async () => {
    await onSave?.();
    note.textContent = 'Sauvegarde effectuee.';
    setTimeout(() => {
      if (note) note.textContent = 'Esc: reprendre';
    }, 1200);
  });
  root.querySelector('#pause-settings').addEventListener('click', openSettings);
  root.querySelector('#pause-menu').addEventListener('click', () => onReturnToMainMenu?.());

  root.addEventListener('click', (e) => {
    if (e.target === root) {
      onResume?.();
    }
  });

  document.body.appendChild(root);

  return {
    show() {
      root.style.display = 'flex';
    },
    hide() {
      root.style.display = 'none';
      note.textContent = 'Esc: reprendre';
    },
    isVisible() {
      return root.style.display === 'flex';
    },
  };
}
