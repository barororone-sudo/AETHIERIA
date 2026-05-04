// ui/deathScreen.js — écran YOU DIED + actions reprise

export function initDeathScreen({ onRespawn, onLoadSave, onReturnToMainMenu, canLoad = false }) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/ui/deathScreen.css';
  document.head.appendChild(link);

  const root = document.createElement('div');
  root.id = 'death-screen-root';
  root.innerHTML = `
    <div class="death-card">
      <div class="death-title">YOU DIED</div>
      <div class="death-sub">Le monde continue sans toi. Reviens plus fort.</div>
      <div class="death-actions">
        <button class="death-btn" id="death-respawn">Reapparaitre</button>
        <button class="death-btn" id="death-load" ${canLoad ? '' : 'disabled'}>Charger sauvegarde</button>
        <button class="death-btn" id="death-menu">Retour menu principal</button>
      </div>
      <div class="death-note" id="death-note"></div>
    </div>
  `;

  const note = root.querySelector('#death-note');

  root.querySelector('#death-respawn').addEventListener('click', async () => {
    note.textContent = 'Reapparition...';
    await onRespawn?.();
    note.textContent = '';
  });

  root.querySelector('#death-load').addEventListener('click', async () => {
    note.textContent = 'Chargement sauvegarde...';
    await onLoadSave?.();
    note.textContent = '';
  });

  root.querySelector('#death-menu').addEventListener('click', () => {
    onReturnToMainMenu?.();
  });

  document.body.appendChild(root);

  return {
    show() {
      root.style.display = 'flex';
    },
    hide() {
      root.style.display = 'none';
      note.textContent = '';
    },
    setCanLoad(value) {
      const btn = root.querySelector('#death-load');
      if (!btn) return;
      btn.disabled = !value;
    },
  };
}
