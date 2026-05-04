// tests/phase3-4.spec.js
import { test, expect } from '@playwright/test';

async function setupPage(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => window.__bootstrapDone === true, null, { timeout: 20000 });
  await page.locator('#render-canvas').click({ force: true });
  await page.waitForTimeout(250);
  return errors;
}

function fatalErrors(errors) {
  return errors.filter(e =>
    e.includes('TypeError') || e.includes('ReferenceError') ||
    e.includes('Cannot read') || e.includes('is not a function')
  );
}

test.describe('Phase 3 — Monde evolutif', () => {
  test('Meteo: le fog change entre acte 1 et acte 3', async ({ page }) => {
    await setupPage(page);

    await page.evaluate(() => window.__emitEvent?.('act:changed', { act: 1 }));
    await page.waitForTimeout(200);
    const fog1 = await page.evaluate(() => window.__scene?.fogDensity ?? 0);

    await page.evaluate(() => window.__emitEvent?.('act:changed', { act: 3 }));
    await page.waitForTimeout(200);
    const fog3 = await page.evaluate(() => window.__scene?.fogDensity ?? 0);

    expect(fog3).toBeGreaterThan(fog1);
  });

  test('Meteo: overlay canvas present', async ({ page }) => {
    await setupPage(page);

    const overlayCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('canvas')).filter(c => {
        const style = window.getComputedStyle(c);
        return style.position === 'fixed' && style.pointerEvents === 'none';
      }).length;
    });

    expect(overlayCount).toBeGreaterThan(0);
  });

  test('Mutations monde: des meshes mut_ existent', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__emitEvent?.('act:changed', { act: 3 }));
    await page.waitForTimeout(300);

    const mutationCount = await page.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return 0;
      return scene.meshes.filter(m => m.name.startsWith('mut_')).length;
    });

    expect(mutationCount).toBeGreaterThan(0);
  });

  test('Landmarks: des meshes lm_ existent', async ({ page }) => {
    await setupPage(page);

    const landmarkCount = await page.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return 0;
      return scene.meshes.filter(m => m.name.startsWith('lm_')).length;
    });

    expect(landmarkCount).toBeGreaterThan(0);
  });

  test('Mini-boss Acte 3: spawn visible dans la scene', async ({ page }) => {
    await setupPage(page);
    await page.evaluate(() => window.__spawnBoss?.(3));
    await page.waitForTimeout(400);

    const hasBoss = await page.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return false;
      return scene.meshes.some(m => m.name.includes('boss_act3'));
    });

    expect(hasBoss).toBe(true);
  });
});

test.describe('Phase 4 — Schisme et convergence', () => {
  test('Theme acte 4: variables CSS appliquees', async ({ page }) => {
    await setupPage(page);

    const before = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--act-accent').trim();
    });

    await page.evaluate(() => window.__emitEvent?.('act:changed', { act: 4 }));
    await page.waitForTimeout(250);

    const after = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--act-accent').trim();
    });

    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toBe(before);
  });

  test('Boss final: API de spawn cree un mesh final_boss', async ({ page }) => {
    const errors = await setupPage(page);

    await page.evaluate(() => {
      try {
        window.__spawnFinalBoss?.();
      } catch (e) {
        console.error(String(e));
      }
    });
    await page.waitForTimeout(500);

    const hasFinalBoss = await page.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return false;
      return scene.meshes.some(m => m.name === 'final_boss');
    });

    expect(hasFinalBoss, fatalErrors(errors).join('\n')).toBe(true);
  });

  test('Pas d erreur JS critique sur scenarios phase 3-4', async ({ page }) => {
    const errors = await setupPage(page);

    await page.evaluate(() => {
      window.__emitEvent?.('act:changed', { act: 3 });
      window.__emitEvent?.('act:changed', { act: 4 });
      window.__spawnBoss?.(2);
      window.__spawnBoss?.(3);
    });
    await page.waitForTimeout(1200);

    expect(fatalErrors(errors), fatalErrors(errors).join('\n')).toHaveLength(0);
  });
});
