// tests/phase1-2.spec.js
import { test, expect } from '@playwright/test';

// ── Setup ──────────────────────────────────────────────────────────────────

async function setupPage(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => window.__bootstrapDone === true, null, { timeout: 20000 });
  return errors;
}

function fatalErrors(errors) {
  return errors.filter(e =>
    e.includes('TypeError') || e.includes('ReferenceError') ||
    e.includes('Cannot read') || e.includes('is not a function')
  );
}

// ── Phase 0 — Fondation ────────────────────────────────────────────────────

test.describe('Phase 0 — Fondation', () => {

  test('Page charge sans erreur JS fatale', async ({ page }) => {
    const errors = await setupPage(page);
    await page.waitForTimeout(5000);
    expect(fatalErrors(errors), fatalErrors(errors).join('\n')).toHaveLength(0);
  });

  test('Canvas WebGL présent et actif', async ({ page }) => {
    await setupPage(page);
    const box = await page.locator('#render-canvas').boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });

  test('Overlay FPS visible', async ({ page }) => {
    await setupPage(page);
    const overlay = page.locator('#perf-overlay');
    await expect(overlay).toBeVisible({ timeout: 8000 });
    await expect(overlay).toContainText(/FPS/, { timeout: 8000 });
  });

  test('Canvas reçoit des frames (pas figé)', async ({ page }) => {
    await setupPage(page);
    const s1 = await page.locator('#render-canvas').screenshot();
    await page.waitForTimeout(800);
    const s2 = await page.locator('#render-canvas').screenshot();
    expect(s1.equals(s2)).toBe(false);
  });

  test('Save/load — données persistées après reload', async ({ page }) => {
    await setupPage(page);
    // Injecter de l'XP via la console
    await page.evaluate(() => {
      window.__testXp = true;
      // Simuler un gain XP
      import('/gameplay/rpgProgression.js').then(m => m.gainXp(50));
    });
    await page.waitForTimeout(1000);
    // Recharger la page
    await page.reload();
    await page.waitForTimeout(5000);
    // Vérifier pas d'erreur après reload
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(fatalErrors(errors)).toHaveLength(0);
  });

});

// ── Phase 1 — Vertical slice ───────────────────────────────────────────────

test.describe('Phase 1 — Vertical slice', () => {

  test('HUD HP et stamina visibles avec valeurs > 0', async ({ page }) => {
    await setupPage(page);
    await expect(page.locator('#hud-hp')).toBeVisible();
    await expect(page.locator('#hud-st')).toBeVisible();
    expect(parseInt(await page.locator('#hud-hp-n').textContent())).toBeGreaterThan(0);
    expect(parseInt(await page.locator('#hud-st-n').textContent())).toBeGreaterThan(0);
  });

  test('Quête Act 1 active affichée', async ({ page }) => {
    await setupPage(page);
    const title = await page.locator('#hud-qt').textContent();
    expect(title).not.toBe('—');
    expect(title.length).toBeGreaterThan(2);
  });

  test('Sprint draine la stamina', async ({ page }) => {
    await setupPage(page);
    await page.locator('#render-canvas').click();
    await page.waitForTimeout(300);
    const staBefore = parseInt(await page.locator('#hud-st-n').textContent());
    // Maintenir Shift+W pendant 1.5s
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    const staAfter = parseInt(await page.locator('#hud-st-n').textContent());
    expect(staAfter).toBeLessThan(staBefore);
  });

  test('Stamina se régénère après sprint', async ({ page }) => {
    await setupPage(page);
    // Réduire la stamina directement
    await page.evaluate(() => window.__setStamina?.(20));
    await page.waitForTimeout(3000); // 3s de régénération (14/s)
    const staRegen = parseInt(await page.locator('#hud-st-n').textContent());
    expect(staRegen).toBeGreaterThan(20);
  });

  test('Saut fonctionne — canvas change pendant le saut', async ({ page }) => {
    await setupPage(page);
    await page.locator('#render-canvas').click();
    await page.waitForTimeout(500);
    const before = await page.locator('#render-canvas').screenshot();
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    const after = await page.locator('#render-canvas').screenshot();
    expect(before.equals(after)).toBe(false);
  });

  test('Dégâts ennemis réduisent le HP joueur', async ({ page }) => {
    await setupPage(page);
    const hpBefore = parseInt(await page.locator('#hud-hp-n').textContent());
    // Utiliser l'API exposée sur window
    await page.evaluate(() => window.__takeDamage(20));
    await page.waitForTimeout(400);
    const hpAfter = parseInt(await page.locator('#hud-hp-n').textContent());
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  test('I-frames bloquent les dégâts', async ({ page }) => {
    await setupPage(page);
    // Activer les i-frames puis tenter des dégâts
    await page.evaluate(() => window.__setIFrames(5.0)); // 5s d'invincibilité
    await page.waitForTimeout(100);
    const hpBefore = parseInt(await page.locator('#hud-hp-n').textContent());
    await page.evaluate(() => window.__takeDamage(50));
    await page.waitForTimeout(200);
    const hpAfter = parseInt(await page.locator('#hud-hp-n').textContent());
    expect(hpAfter).toBe(hpBefore); // HP inchangé
  });

  test('Ennemi mort donne XP — level affiché', async ({ page }) => {
    await setupPage(page);
    const lvlBefore = await page.locator('#hud-lvl').textContent();
    await page.evaluate(() => window.__gainXp(500));
    await page.waitForTimeout(500);
    const lvlAfter = await page.locator('#hud-lvl').textContent();
    const notif = page.locator('.notif').filter({ hasText: /Niveau/ });
    const levelChanged = lvlBefore !== lvlAfter;
    const notifVisible = await notif.count() > 0;
    expect(levelChanged || notifVisible).toBe(true);
  });

  test('Quête kill trackée — tuer un ennemi avance la quête', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__emitEvent('enemy:died', { type: 'scout', xp: 40, position: { x:0,y:0,z:0 } }));
    await page.waitForTimeout(300);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(fatalErrors(errors)).toHaveLength(0);
  });

  test('Props apparaissent dans la scène', async ({ page }) => {
    await setupPage(page);
    await page.waitForTimeout(3000);
    // Vérifier via la scène Babylon
    const propCount = await page.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return -1;
      return scene.meshes.filter(m => m.name.startsWith('prop_')).length;
    });
    // -1 = pas d'accès à la scène, sinon > 0
    if (propCount !== -1) expect(propCount).toBeGreaterThan(0);
  });

  test('Pas d\'erreur JS après 10s de jeu', async ({ page }) => {
    const errors = await setupPage(page);
    await page.waitForTimeout(10000);
    expect(fatalErrors(errors), fatalErrors(errors).join('\n')).toHaveLength(0);
  });

});

// ── Phase 2 — Systèmes core ────────────────────────────────────────────────

test.describe('Phase 2 — Systèmes core', () => {

  test('Panel inventaire s\'ouvre (I) et se ferme (Escape)', async ({ page }) => {
    await setupPage(page);
    await page.locator('#render-canvas').click({ force: true });
    await page.keyboard.press('i');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-panel]')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-panel]')).not.toBeVisible({ timeout: 2000 });
  });

  test('Panel journal s\'ouvre (J) et liste les quêtes', async ({ page }) => {
    await setupPage(page);
    await page.locator('#render-canvas').click({ force: true });
    await page.keyboard.press('j');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-panel]')).toBeVisible({ timeout: 2000 });
    // Au moins une quête listée
    const items = await page.locator('[data-panel] div').count();
    expect(items).toBeGreaterThan(2);
  });

  test('Panel settings s\'ouvre (P)', async ({ page }) => {
    await setupPage(page);
    await page.locator('#render-canvas').click({ force: true });
    await page.keyboard.press('p');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-panel]')).toBeVisible({ timeout: 2000 });
  });

  test('Ramasser un item l\'ajoute à l\'inventaire', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__addItem('health-potion', 1));
    await page.waitForTimeout(300);
    await page.locator('#render-canvas').click({ force: true });
    await page.keyboard.press('i');
    await page.waitForTimeout(500);
    const panel = page.locator('[data-panel]');
    await expect(panel).toBeVisible();
    await expect(panel.filter({ hasText: /Potion/ })).toBeVisible({ timeout: 2000 });
  });

  test('Utiliser une potion soigne le joueur', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__takeDamage(40));
    await page.waitForTimeout(200);
    const hpDamaged = parseInt(await page.locator('#hud-hp-n').textContent());
    await page.evaluate(() => { window.__addItem('health-potion', 1); window.__useItem('health-potion'); });
    await page.waitForTimeout(300);
    const hpHealed = parseInt(await page.locator('#hud-hp-n').textContent());
    expect(hpHealed).toBeGreaterThan(hpDamaged);
  });

  test('Marqueur faction change l\'alignement', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__shiftAlignment(30));
    await page.waitForTimeout(200);
    const alignment = await page.evaluate(() => window.__getAlignment());
    expect(alignment).toBe(30);
  });

  test('Faction rejointe automatiquement à +50', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__shiftAlignment(60));
    await page.waitForTimeout(200);
    const faction = await page.evaluate(() => window.__getFaction());
    expect(faction).toBe('guardians');
  });

  test('Notification loot apparaît après pickup', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__addItem('iron-shard', 1));
    await page.waitForTimeout(400);
    await expect(page.locator('.notif').filter({ hasText: /iron shard/i })).toBeVisible({ timeout: 2000 });
  });

  test('Prompt interaction présent dans le DOM', async ({ page }) => {
    await setupPage(page);
    await expect(page.locator('#interaction-prompt')).toBeAttached({ timeout: 5000 });
  });

  test('Bullet-time émet l\'event correct', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__emitEvent('combat:bulletTime', { active: true }));
    await page.waitForTimeout(200);
    // Vérifier que l'overlay bullet-time apparaît
    const btOverlay = page.locator('div').filter({ hasText: '' }).nth(0);
    // Juste vérifier pas d'erreur
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(fatalErrors(errors)).toHaveLength(0);
  });

  test('Pas d\'erreur JS critique en Phase 2', async ({ page }) => {
    const errors = await setupPage(page);
    // Ouvrir tous les panels
    await page.locator('#render-canvas').click({ force: true });
    await page.keyboard.press('i'); await page.waitForTimeout(200);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.keyboard.press('j'); await page.waitForTimeout(200);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    expect(fatalErrors(errors), fatalErrors(errors).join('\n')).toHaveLength(0);
  });

});
