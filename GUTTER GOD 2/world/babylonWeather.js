// world/babylonWeather.js
// Low-cost 2D weather overlay driven by acts and world-state flags.

import { Events } from '../core/events.js';
import { getCurrentAct, getWorldSnapshot } from '../persistence/worldStateManager.js';

let _scene = null;
let _overlay = null;
let _currentAct = 1;

const WEATHER = {
  1: { name: 'cendres', color: 'rgba(180,140,80,0.06)', fog: 0.014, particles: 'ash', count: 40 },
  2: { name: 'pluie de fer', color: 'rgba(80,100,140,0.08)', fog: 0.028, particles: 'ironrain', count: 90 },
  3: { name: 'brouillard vert', color: 'rgba(40,80,40,0.12)', fog: 0.040, particles: 'spore', count: 52 },
  4: { name: 'spores', color: 'rgba(100,40,120,0.10)', fog: 0.032, particles: 'spore', count: 56 },
  5: { name: 'fracture', color: 'rgba(180,20,20,0.08)', fog: 0.045, particles: 'ash', count: 70 },
};

export function initWeather(scene) {
  _scene = scene;

  _overlay = document.createElement('canvas');
  Object.assign(_overlay.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '5',
    opacity: '0.7',
  });
  _overlay.width = window.innerWidth;
  _overlay.height = window.innerHeight;
  document.body.appendChild(_overlay);
  window.addEventListener('resize', () => {
    _overlay.width = window.innerWidth;
    _overlay.height = window.innerHeight;
  });

  Events.on('act:changed', ({ act }) => setWeatherForAct(act));
  Events.on('world:flagSet', ({ key, value }) => {
    if (!value) return;
    if (key === 'A2_IRONRAIN_STARTED') setWeatherForAct(2);
    if (key === 'SKY_DOME_FIRST_CRACK') _startParticles(_resolveWeather(_currentAct));
  });

  setWeatherForAct(getCurrentAct());
}

export function setWeatherForAct(act) {
  _currentAct = Math.max(1, Number(act) || 1);
  const w = _resolveWeather(_currentAct);

  if (_scene) {
    _scene.fogDensity = w.fog;
  }

  _startParticles(w);
}

export function getWeatherDebug() {
  return {
    act: _currentAct,
    weather: _resolveWeather(_currentAct).name,
    particles: _particles.length,
  };
}

const _particles = [];
let _animFrame = null;

function _resolveWeather(act) {
  const snapshot = getWorldSnapshot();
  if (snapshot.flags.A2_IRONRAIN_STARTED && act < 2) return WEATHER[2];
  if (snapshot.flags.SKY_DOME_FIRST_CRACK && act === 1) {
    return { ...WEATHER[1], name: 'cendres violettes', particles: 'fractureAsh', count: 56, fog: 0.020 };
  }
  return WEATHER[act] ?? WEATHER[1];
}

function _startParticles(w) {
  if (_animFrame) cancelAnimationFrame(_animFrame);
  _particles.length = 0;

  const ctx = _overlay?.getContext('2d');
  if (!ctx) return;

  for (let i = 0; i < w.count; i++) {
    const rainLike = w.particles === 'ironrain';
    _particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: rainLike ? (Math.random() - 0.2) * 1.8 : (Math.random() - 0.5) * 0.4,
      vy: rainLike ? 4 + Math.random() * 4 : 0.3 + Math.random() * 0.5,
      r: rainLike ? 1 : 1.4 + Math.random() * 1.4,
      a: 0.2 + Math.random() * 0.4,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, _overlay.width, _overlay.height);
    for (const p of _particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > _overlay.height) {
        p.y = -4;
        p.x = Math.random() * _overlay.width;
      }
      if (p.x < 0) p.x = _overlay.width;
      if (p.x > _overlay.width) p.x = 0;

      ctx.beginPath();
      if (w.particles === 'ironrain') {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
        ctx.strokeStyle = `rgba(210,190,160,${p.a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = w.particles === 'spore'
          ? `rgba(120,220,130,${p.a})`
          : w.particles === 'fractureAsh'
            ? `rgba(190,120,255,${p.a})`
            : `rgba(200,180,120,${p.a})`;
        ctx.fill();
      }
    }
    _animFrame = requestAnimationFrame(draw);
  }
  draw();
}

export function updateWeather(dt) {
  // Weather runs on its own RAF-backed canvas to avoid work in the gameplay loop.
}

