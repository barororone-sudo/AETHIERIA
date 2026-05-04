// ui/loadingScreen.js — Écran de chargement avec barre de progression

let _el = null;
let _bar = null;
let _text = null;

export function showLoadingScreen() {
  if (_el) return;

  _el = document.createElement('div');
  _el.id = 'loading-screen';
  _el.innerHTML = `
    <style>
      #loading-screen {
        position: fixed; inset: 0; z-index: 9999;
        background: #0a0a0f;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #ccc;
        transition: opacity 0.6s ease;
      }
      #loading-screen.fade-out { opacity: 0; pointer-events: none; }
      #loading-title {
        font-size: 2.4rem; font-weight: 700;
        letter-spacing: 0.3em; text-transform: uppercase;
        color: #e8c84a;
        margin-bottom: 2rem;
        text-shadow: 0 0 20px rgba(232,200,74,0.4);
      }
      #loading-bar-outer {
        width: 320px; height: 8px;
        background: #1a1a2e;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #333;
      }
      #loading-bar-inner {
        width: 0%; height: 100%;
        background: linear-gradient(90deg, #e8c84a, #4ae84a);
        border-radius: 4px;
        transition: width 0.15s ease;
      }
      #loading-text {
        margin-top: 1rem;
        font-size: 0.85rem;
        color: #888;
      }
      #loading-hint {
        position: absolute;
        bottom: 3rem;
        font-size: 0.75rem;
        color: #555;
        font-style: italic;
      }
    </style>
    <div id="loading-title">GUTTER GOD</div>
    <div id="loading-bar-outer">
      <div id="loading-bar-inner"></div>
    </div>
    <div id="loading-text">Initialisation...</div>
    <div id="loading-hint">Chargement des assets du monde...</div>
  `;

  document.body.appendChild(_el);
  _bar  = _el.querySelector('#loading-bar-inner');
  _text = _el.querySelector('#loading-text');
}

export function updateLoadingProgress(loaded, total) {
  if (!_bar || !_text) return;
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  _bar.style.width = pct + '%';
  _text.textContent = `Chargement des assets... ${Math.min(loaded, total)}/${total} (${pct}%)`;
}

export function setLoadingText(msg) {
  if (_text) _text.textContent = msg;
}

export function hideLoadingScreen() {
  if (!_el) return;
  _el.classList.add('fade-out');
  setTimeout(() => {
    _el?.remove();
    _el = null;
    _bar = null;
    _text = null;
  }, 700);
}
