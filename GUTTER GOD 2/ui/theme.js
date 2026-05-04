// ui/theme.js — tokens CSS par acte

const ACT_THEMES = {
  1: { accent: '#e8c84a', barHp: '#e84a4a', barSta: '#4ae8a0', bg: 'rgba(10,8,15,0.82)'  },
  2: { accent: '#e87a2a', barHp: '#e84a4a', barSta: '#e8a04a', bg: 'rgba(15,10,8,0.85)'  },
  3: { accent: '#4ae870', barHp: '#e84a4a', barSta: '#4ae870', bg: 'rgba(8,15,10,0.85)'  },
  4: { accent: '#a04ae8', barHp: '#e84a4a', barSta: '#a04ae8', bg: 'rgba(12,8,18,0.88)'  },
  5: { accent: '#e84a4a', barHp: '#e84a4a', barSta: '#e84a4a', bg: 'rgba(18,5,5,0.90)'   },
};

export function applyActTheme(act) {
  const t = ACT_THEMES[act] ?? ACT_THEMES[1];
  const r = document.documentElement;
  r.style.setProperty('--act-accent',  t.accent);
  r.style.setProperty('--act-bar-hp',  t.barHp);
  r.style.setProperty('--act-bar-sta', t.barSta);
  r.style.setProperty('--act-bg',      t.bg);
}
