import { test, expect } from '@playwright/test';
import { themeFixture } from './fixture';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from 'node:process';

// Nuxt uses hashed-only production chunk names; find the actual scene module.
const assets = resolve(
  env.THEME_STATIC_ROOT ?? 'apps/frontend/.output/public',
  '_nuxt',
);
const worldChunk = readdirSync(assets).find(
  (file) =>
    file.endsWith('.js') &&
    readFileSync(resolve(assets, file), 'utf8').includes(
      'Unable to build garden geometry',
    ),
);
if (!worldChunk)
  throw new Error('Build the welcome scene before running browser tests');

for (const themeId of ['default', 'ury']) {
  test(`welcome is independent and Enter preserves ${themeId}`, async ({
    page,
  }) => {
    await themeFixture(page, { themeId });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute(
      'data-surface',
      'welcome',
    );
    await expect(
      page.locator('[data-theme-root], .site-header, .ury-masthead'),
    ).toHaveCount(0);
    const enter = page.getByRole('link', { name: '进入网站' });
    await expect(enter).toHaveAttribute('href', '/home');
    await enter.click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(`[data-theme-root="${themeId}"]`)).toBeVisible();
    await expect(page.locator('.welcome-canvas canvas')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('html')).toHaveAttribute(
      'data-surface',
      'welcome',
    );
    await expect(enter).toBeVisible();
    await page.goForward();
    await expect(page.locator(`[data-theme-root="${themeId}"]`)).toBeVisible();
  });
}

test('WebGL failure leaves a keyboard-accessible Enter, including narrow screens', async ({
  page,
}) => {
  await themeFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.welcome-world')).toHaveAttribute(
    'data-state',
    'unavailable',
  );
  await expect(page.getByRole('status')).toContainText('庭院暂歇');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '进入网站' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.story-card')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('direct traditional entry does not fetch the welcome Three.js chunk', async ({
  page,
}) => {
  await themeFixture(page);
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/home');
  await expect(page.locator('.story-card')).toBeVisible();
  expect(
    scripts.some((url) => new URL(url).pathname.endsWith('/' + worldChunk)),
  ).toBe(false);
  await page.goto('/posts/fixture-post');
  await expect(page.locator('.post-header')).toBeVisible();
});

test('a delayed scene import cannot mount after Enter navigation', async ({
  page,
}) => {
  await themeFixture(page);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(`**/_nuxt/${worldChunk}`, async (route) => {
    requested = true;
    await waiting;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('link', { name: '进入网站' }).click();
  await expect(page.locator('.story-card')).toBeVisible();
  release();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.welcome-canvas canvas')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'blog');
});

test('welcome entry follows the persisted reader language', async ({
  page,
  context,
}) => {
  await themeFixture(page);
  await context.addCookies([
    { name: 'cool_locale', value: 'en', url: 'http://127.0.0.1:43871' },
  ]);
  await page.goto('/');
  const enter = page.getByRole('link', { name: 'Enter the site' });
  await expect(enter).toHaveText('Enter');
  await enter.click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('rendered garden rotates, zooms and keeps Enter after context loss', async ({
  page,
}) => {
  await themeFixture(page);
  await page.goto('/');
  const supportsWebGL = await page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return false;
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  });
  test.skip(!supportsWebGL, 'This browser does not expose WebGL2');
  const world = page.locator('.welcome-world');
  const canvas = page.locator('.welcome-canvas canvas');
  await expect(world).toHaveAttribute('data-state', 'ready');
  const initial = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('The garden canvas has no layout bounds');
  await page.mouse.move(bounds.width * 0.5, bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.width * 0.65, bounds.height * 0.48, {
    steps: 12,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(initial))
    .toBe(false);
  const rotated = await canvas.screenshot();
  await page.mouse.wheel(0, -240);
  await expect
    .poll(async () => (await canvas.screenshot()).equals(rotated))
    .toBe(false);
  await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('webgl2');
    const extension = context?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss extension unavailable');
    extension.loseContext();
  });
  await expect(world).toHaveAttribute('data-state', 'unavailable');
  await page.getByRole('link', { name: '进入网站' }).click();
  await expect(page.locator('.story-card')).toBeVisible();
  await expect(canvas).toHaveCount(0);
});
