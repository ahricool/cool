import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { env } from 'node:process';
import { themeFixture } from './fixture';

for (const width of [1440, 390]) {
  for (const mode of ['light', 'dark']) {
    for (const [route, selector] of [
      ['/', '.story-title'],
      ['/search', '.cool-search'],
      ['/admin/settings', '.settings-panel'],
      ['/posts/fixture-post', '.post-article'],
      ['/pages/fixture-page', '.entry-content'],
      ['/about', '.about-page'],
      ['/tags/spring', '.story-card'],
    ]) {
      test(`Sakura compatibility ${route} ${width} ${mode}`, async ({
        page,
      }, info) => {
        const snapshot = `${route.replaceAll('/', '_') || 'home'}-${width}-${mode}.png`;
        test.skip(
          !existsSync(info.snapshotPath(snapshot)) &&
            env.THEME_CAPTURE_BASELINE !== '1',
          'Capture the pre-refactor build baseline before visual comparison.',
        );
        await page.setViewportSize({ width, height: 900 });
        await themeFixture(page);
        await page.context().addCookies([
          { name: 'cool_theme', value: mode, url: 'http://127.0.0.1:43871' },
          {
            name: 'cool_admin_theme',
            value: mode,
            url: 'http://127.0.0.1:43871',
          },
        ]);
        await page.addInitScript(() => {
          Math.random = () => 0.314159;
        });
        await page.goto(route);
        await expect(page.locator(selector!)).toBeVisible();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((img) => img.decode().catch(() => {})),
          );
        });
        await expect(page).toHaveScreenshot(snapshot, {
          animations: 'disabled',
          maxDiffPixels: 0,
        });
      });
    }
  }
}

for (const width of [1440, 390]) {
  for (const mode of ['light', 'dark']) {
    test(`Admin appearance remains identical with saved Minimal ${width} ${mode}`, async ({
      page,
    }, info) => {
      const snapshot = `_admin_settings-${width}-${mode}.png`;
      test.skip(
        !existsSync(info.snapshotPath(snapshot)),
        'Capture the pre-refactor Admin baseline first.',
      );
      await page.setViewportSize({ width, height: 900 });
      await themeFixture(page, { themeId: 'minimal' });
      await page.context().addCookies([
        { name: 'cool_theme', value: mode, url: 'http://127.0.0.1:43871' },
        {
          name: 'cool_admin_theme',
          value: mode,
          url: 'http://127.0.0.1:43871',
        },
      ]);
      await page.addInitScript(() => {
        Math.random = () => 0.314159;
      });
      await page.goto('/admin/settings');
      await expect(page.locator('.settings-panel')).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((image) => image.decode().catch(() => {})),
        );
      });
      await expect(page).toHaveScreenshot(snapshot, {
        animations: 'disabled',
        maxDiffPixels: 0,
      });
    });
  }
}
