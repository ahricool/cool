import { test, expect, type Page } from '@playwright/test';
import { themeFixture } from './fixture';

async function spa(page: Page, path: string) {
  await page.evaluate(async (value) => {
    const root = document.getElementById('__nuxt') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<void> };
          };
        };
      };
    };
    await root.__vue_app__.config.globalProperties.$router.push(value);
  }, path);
}
async function choose(page: Page, id: 'default' | 'minimal') {
  await spa(page, '/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  const choice = page.getByRole('radio', {
    name: id === 'default' ? '默认主题' : 'Minimal',
    exact: true,
  });
  await choice.focus();
  await choice.press('Space');
  await expect(choice).toBeChecked();
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(page.locator('.sakura-toast')).toContainText('配置已保存');
  await expect(page.locator('.sakura-toast')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
}
async function surface(page: Page, id: 'default' | 'minimal') {
  await expect(page.locator(`[data-theme-root="${id}"]`)).toBeVisible();
  await expect(
    page.locator(id === 'default' ? '.site-header' : '.minimal-masthead'),
  ).toBeVisible();
  await expect(
    page.locator(id === 'default' ? '.minimal-masthead' : '.site-header'),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-site-theme', id);
}

test('SPA switches complete trees in both directions; Admin, Teleports and history remain independent', async ({
  page,
}) => {
  const state = await themeFixture(page);
  await page.addInitScript(() => {
    const state = window as Window & { adminOverlayLeaks?: number[] };
    state.adminOverlayLeaks = [];
    new MutationObserver(() => {
      if (document.documentElement.dataset.surface === 'blog') {
        state.adminOverlayLeaks!.push(
          document.querySelectorAll('.sakura-toast, .el-message-box').length,
        );
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-surface'],
    });
  });
  await page.goto('/');
  await surface(page, 'default');
  await expect(page.locator('.story-card')).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { themeDocument?: boolean }).themeDocument = true;
  });
  await choose(page, 'minimal');
  await expect(page.locator('html')).not.toHaveAttribute('data-site-theme');
  await page.getByRole('button', { name: '我的账户', exact: true }).click();
  await expect(page.locator('#admin-account-menu')).toBeVisible();
  await expect(page.locator('#admin-account-menu')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.keyboard.press('Escape');
  await spa(page, '/');
  await surface(page, 'minimal');
  await expect(page.locator('[data-admin-feedback]')).toHaveCount(0);
  await expect(page.locator('.minimal-story')).toBeVisible();
  await expect(page.locator('.story-card')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(250, 249, 246)',
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--sakura-accent'),
      ),
  ).toBe('');
  await spa(page, '/posts/fixture-post');
  await expect(page.locator('.minimal-document-header h1')).toContainText(
    '合成文章',
  );
  await expect(page.locator('.post-header')).toHaveCount(0);
  await page.goBack();
  await surface(page, 'minimal');
  await page.goForward();
  await expect(page.locator('.minimal-document')).toBeVisible();
  await choose(page, 'default');
  await spa(page, '/posts/fixture-post');
  await surface(page, 'default');
  await expect(page.locator('.post-header')).toBeVisible();
  await expect(page.locator('.minimal-document')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--minimal-page'),
      ),
  ).toBe('');
  expect(
    await page.evaluate(
      () => (window as Window & { themeDocument?: boolean }).themeDocument,
    ),
  ).toBe(true);
  expect(state.writes.map((write) => write.site.appearance.themeId)).toEqual([
    'minimal',
    'default',
  ]);
  expect(
    await page.evaluate(() =>
      (
        window as Window & { adminOverlayLeaks: number[] }
      ).adminOverlayLeaks.every((count) => count === 0),
    ),
  ).toBe(true);
  await page.reload();
  await surface(page, 'default');
});

test('an unsaved Admin choice does not affect public content; save persists without changing authored appearance', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    font: 'bubble-candy',
    fontSize: 150,
    avatar: 'star',
    cover: 'heart',
    background: 'none',
  });
  const appearance = structuredClone(state.settings.site.appearance);
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  const unsaved = page.getByRole('radio', { name: 'Minimal', exact: true });
  await unsaved.focus();
  await unsaved.press('Space');
  expect(state.writes).toEqual([]);
  await spa(page, '/search');
  await surface(page, 'default');
  await choose(page, 'minimal');
  expect(state.writes[0]?.site.appearance).toEqual({
    ...appearance,
    themeId: 'minimal',
  });
  await spa(page, '/search');
  await surface(page, 'minimal');
  await page.reload();
  await surface(page, 'minimal');
  await expect(page.locator('body')).toHaveCSS('font-size', '24px');
  await expect(page.locator('html')).toHaveAttribute(
    'data-font',
    'bubble-candy',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.minimal-search-field')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('Admin color mode and public color mode have separate cookies and retain the same layout', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'minimal' });
  await page.goto('/');
  await surface(page, 'minimal');
  await page.getByRole('button', { name: '切换深色', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(21, 28, 25)',
  );
  await expect(page.locator('.minimal-masthead')).toBeVisible();
  await spa(page, '/admin/settings');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.getByRole('button', { name: '切换深色', exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await spa(page, '/');
  await surface(page, 'minimal');
  await page.getByRole('button', { name: '切换浅色', exact: true }).click();
  await spa(page, '/admin/settings');
  await expect(page.locator('html')).toHaveClass('dark');
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === 'cool_theme')?.value).toBe(
    'light',
  );
  expect(
    cookies.find((cookie) => cookie.name === 'cool_admin_theme')?.value,
  ).toBe('dark');
});

test('missing, unknown and retired IDs render actual Sakura components without writing settings', async ({
  page,
}) => {
  const state = await themeFixture(page);
  for (const id of [undefined, 'soft-preview', 'removed-theme', '', null]) {
    state.settings.site.appearance.themeId = id as string;
    await page.goto('/');
    await surface(page, 'default');
    await expect(page.locator('.story-card')).toBeVisible();
  }
  expect(state.writes).toEqual([]);
});

for (const themeId of ['default', 'minimal'] as const) {
  for (const width of [1440, 390]) {
    for (const language of ['zh', 'en']) {
      test(`${themeId} all public routes, pagination and media at ${width} in ${language}`, async ({
        page,
      }, info) => {
        const state = await themeFixture(page, { themeId });
        state.showMoment = true;
        await page.setViewportSize({ width, height: 900 });
        await page.context().addCookies([
          {
            name: 'cool_locale',
            value: language,
            url: 'http://127.0.0.1:43871',
          },
        ]);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/');
        await surface(page, themeId);
        await expect(
          page.locator(
            themeId === 'default' ? '.timeline-update' : '.minimal-note',
          ),
        ).toContainText('Synthetic moment');
        for (const [path, selector] of [
          [
            '/posts/fixture-post',
            themeId === 'default' ? '.post-article' : '.minimal-document',
          ],
          [
            '/pages/fixture-page',
            themeId === 'default' ? '.entry-content' : '.minimal-document',
          ],
          [
            '/about',
            themeId === 'default' ? '.about-page' : '.minimal-document',
          ],
          [
            '/search?q=fixture&page=1',
            themeId === 'default' ? '.story-card' : '.minimal-story',
          ],
          [
            '/tags',
            themeId === 'default' ? '.taxonomy-terms' : '.minimal-tags',
          ],
          [
            '/tags/spring?page=2',
            themeId === 'default' ? '.story-card' : '.minimal-story',
          ],
        ]) {
          await spa(page, path);
          await surface(page, themeId);
          await expect(page.locator(selector).first()).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute(
            'lang',
            language === 'zh' ? 'zh-CN' : 'en',
          );
          await expect(
            page.locator(`${selector}[lang], ${selector} [lang]`).first(),
          ).toHaveAttribute('lang', language === 'zh' ? 'zh-CN' : 'en');
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
        await spa(page, '/search?q=fixture&page=1');
        await page
          .getByRole('link', {
            name: language === 'zh' ? '下一页' : 'Next',
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(/q=fixture.*page=2|page=2.*q=fixture/);
        await spa(page, '/posts/fixture-post');
        await expect(
          page
            .locator(themeId === 'default' ? '.post-article' : '.minimal-prose')
            .first(),
        ).toContainText('Synthetic heading');
        await expect(
          page.locator('.minimal-prose img, .post-article img').first(),
        ).toBeVisible();
        await page.screenshot({
          path: info.outputPath(`${themeId}-${width}-${language}-post.png`),
          fullPage: true,
        });
        expect(state.requests).toContain('/public/search');
        expect(state.requests).toContain('/public/tags/spring/posts');
        expect(errors).toEqual([]);
      });
    }
  }
  test(`${themeId} direct 404, SPA 404, missing content and global errors recover`, async ({
    page,
  }) => {
    await themeFixture(page, { themeId, fontSize: 125 });
    const selector = themeId === 'default' ? '.error-card' : '.minimal-error';
    await page.goto('/synthetic-direct-404');
    await expect(page.locator(selector)).toBeVisible();
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await surface(page, themeId);
    await spa(page, '/synthetic-spa-404');
    await expect(page.locator(selector)).toBeVisible();
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await surface(page, themeId);
    for (const path of ['/posts/missing', '/pages/missing', '/tags/missing']) {
      await spa(page, path);
      await expect(page.locator(selector)).toContainText('404');
      await page.getByRole('button', { name: '返回首页', exact: true }).click();
      await surface(page, themeId);
    }
    await page.evaluate(() => {
      const root = document.getElementById('__nuxt') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: { $nuxt: { payload: { error: unknown } } };
          };
        };
      };
      root.__vue_app__.config.globalProperties.$nuxt.payload.error = {
        statusCode: 500,
        message: 'Synthetic error',
        fatal: true,
      };
    });
    await expect(page.locator(selector)).toContainText('500');
    await expect(page.locator('body')).toHaveCSS('font-size', '20px');
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await surface(page, themeId);
  });
}

test('first Minimal load fetches its visual resources without Sakura styles or images', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'minimal' });
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/');
  await surface(page, 'minimal');
  await expect(page.locator('.minimal-story')).toBeVisible();
  expect(urls.some((url) => url.includes('/sakura/'))).toBe(false);
  const css = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
      .join('\n'),
  );
  expect(css).not.toContain('data-site-theme=default');
  expect(css).not.toContain("data-site-theme='default'");
  expect(css).not.toContain('--sakura-page');
});

test('a failed site API does not repeatedly retry while recovering from an error', async ({
  page,
}) => {
  const state = await themeFixture(page);
  await page.route('**/api/v1/public/site', (route) =>
    route.fulfill({ status: 503, json: { message: 'Synthetic unavailable' } }),
  );
  await page.goto('/synthetic-404');
  await expect(page.locator('.error-card')).toBeVisible();
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await surface(page, 'default');
  await expect(page.locator('.site-error')).toBeVisible();
  expect(
    state.requests.filter((path) => path === '/public/config'),
  ).toHaveLength(1);
});

for (const themeId of ['default', 'minimal'] as const) {
  test(`${themeId} narrow content retains media and all font/size/palette choices`, async ({
    page,
  }, info) => {
    const state = await themeFixture(page, { themeId });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const font of ['default', 'bubble-candy'] as const) {
      for (const fontSize of [80, 150]) {
        for (const mode of ['light', 'dark']) {
          state.settings.site.appearance.font = font;
          state.settings.site.appearance.fontSize = fontSize;
          await page.context().addCookies([
            {
              name: 'cool_theme',
              value: mode,
              url: 'http://127.0.0.1:43871',
            },
          ]);
          await page.goto('/posts/fixture-post');
          await surface(page, themeId);
          await expect(
            page.locator(
              themeId === 'default' ? '.post-article' : '.minimal-document',
            ),
          ).toContainText('Synthetic heading');
          await expect(page.locator('body')).toHaveCSS(
            'font-size',
            `${(16 * fontSize) / 100}px`,
          );
          const image = page
            .locator('.minimal-prose img, .post-article img')
            .first();
          await expect(image).toBeVisible();
          await expect
            .poll(() =>
              image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
            )
            .toBeGreaterThan(0);
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((node) => (node as HTMLImageElement).decode());
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
      }
    }
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    });
    await page.screenshot({
      path: info.outputPath(`${themeId}-390-dark-150-bubble.png`),
      fullPage: true,
    });
  });
}

test('direct Admin errors keep fixed Admin visuals even when Minimal is selected', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'minimal' });
  await page.goto('/admin/synthetic-missing');
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('.minimal-error')).toHaveCount(0);
  await expect(page.locator('.error-card')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'admin');
  await expect(page.locator('html')).not.toHaveAttribute('data-site-theme');
  await expect(
    page.getByRole('button', { name: '返回工作空间', exact: true }),
  ).toBeVisible();
});
