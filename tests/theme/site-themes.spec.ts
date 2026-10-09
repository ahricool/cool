import { test, expect, type Page } from '@playwright/test';
import { themeFixture } from './fixture';
import { defaultUryAppearance } from '../../packages/content/src/types';

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
async function choose(page: Page, id: 'default' | 'ury') {
  await spa(page, '/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  const choice = page.getByRole('radio', {
    name: id === 'default' ? 'sakura' : 'ury',
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
async function surface(page: Page, id: 'default' | 'ury') {
  await expect(page.locator(`[data-theme-root="${id}"]`)).toBeVisible();
  await expect(
    page.locator(id === 'default' ? '.site-header' : `.${id}-masthead`),
  ).toBeVisible();
  await expect(
    page.locator(id === 'default' ? '.ury-masthead' : '.site-header'),
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
  await choose(page, 'ury');
  await expect(page.locator('html')).not.toHaveAttribute('data-site-theme');
  await page.getByRole('button', { name: '我的账户', exact: true }).click();
  await expect(page.locator('#admin-account-menu')).toBeVisible();
  await expect(page.locator('#admin-account-menu')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.keyboard.press('Escape');
  await spa(page, '/');
  await surface(page, 'ury');
  await expect(page.locator('[data-admin-feedback]')).toHaveCount(0);
  await expect(page.locator('.ury-story')).toBeVisible();
  await expect(page.locator('.story-card')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(253, 252, 249)',
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--sakura-accent'),
      ),
  ).toBe('');
  await spa(page, '/posts/fixture-post');
  await expect(page.locator('.ury-document-header h1')).toContainText(
    '合成文章',
  );
  await expect(page.locator('.post-header')).toHaveCount(0);
  await page.goBack();
  await surface(page, 'ury');
  await page.goForward();
  await expect(page.locator('.ury-document')).toBeVisible();
  await choose(page, 'default');
  await spa(page, '/posts/fixture-post');
  await surface(page, 'default');
  await expect(page.locator('.post-header')).toBeVisible();
  await expect(page.locator('.ury-document')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--ury-page')),
  ).toBe('');
  expect(
    await page.evaluate(
      () => (window as Window & { themeDocument?: boolean }).themeDocument,
    ),
  ).toBe(true);
  expect(state.writes.map((write) => write.site.appearance.themeId)).toEqual([
    'ury',
    'default',
  ]);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as Window & { adminOverlayLeaks: number[] }
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
  const unsaved = page.getByRole('radio', { name: 'ury', exact: true });
  await unsaved.focus();
  await unsaved.press('Space');
  expect(state.writes).toEqual([]);
  await spa(page, '/search');
  await surface(page, 'default');
  await choose(page, 'ury');
  expect(state.writes[0]?.site.appearance).toEqual({
    ...appearance,
    themeId: 'ury',
  });
  await spa(page, '/search');
  await surface(page, 'ury');
  await page.reload();
  await surface(page, 'ury');
  await expect(page.locator('body')).toHaveCSS('font-size', '18px');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'serif');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.ury-search-field')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('Admin color mode and public color mode have separate cookies and retain the same layout', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'ury' });
  await page.goto('/');
  await surface(page, 'ury');
  await page.getByLabel('配色', { exact: true }).selectOption('dark');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(34, 35, 31)',
  );
  await expect(page.locator('.ury-masthead')).toBeVisible();
  await spa(page, '/admin/settings');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.getByRole('button', { name: '切换深色', exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await spa(page, '/');
  await surface(page, 'ury');
  await page.getByLabel('配色', { exact: true }).selectOption('light');
  await spa(page, '/admin/settings');
  await expect(page.locator('html')).toHaveClass('dark');
  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === 'cool_ury_palette')?.value,
  ).toBe('light');
  expect(
    cookies.find((cookie) => cookie.name === 'cool_admin_theme')?.value,
  ).toBe('dark');
});

test('missing, unknown and retired IDs fall back without writes; Admin offers only supported themes', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    font: 'bubble-candy',
    fontSize: 150,
    avatar: 'star',
    cover: 'heart',
    background: 'none',
    ury: {
      ...defaultUryAppearance,
      palette: 'sepia',
      font: 'sans',
      fontSize: 125,
    },
  });
  for (const id of [
    undefined,
    'soft-preview',
    'removed-theme',
    '',
    null,
    'minimal',
  ]) {
    state.settings.site.appearance.themeId = id as string;
    const saved = structuredClone(state.settings);
    await page.goto('/');
    await surface(page, 'default');
    await expect(page.locator('.story-card')).toBeVisible();
    await page.reload();
    await surface(page, 'default');
    await spa(page, '/admin/settings');
    await page.getByRole('tab', { name: '外观', exact: true }).click();
    const options = page.getByTestId('appearance-theme');
    await expect(options.getByRole('radio')).toHaveCount(2);
    await expect(
      options.getByRole('radio', { name: 'sakura', exact: true }),
    ).toBeChecked();
    await expect(
      options.getByRole('radio', { name: 'ury', exact: true }),
    ).not.toBeChecked();
    expect(state.settings).toEqual(saved);
    expect(state.writes).toEqual([]);
  }
  const saved = structuredClone(state.settings);
  // Only an explicit Admin save replaces the retired ID; both appearance profiles survive.
  await choose(page, 'default');
  expect(state.writes).toHaveLength(1);
  expect(state.settings).toEqual({
    ...saved,
    site: {
      ...saved.site,
      appearance: { ...saved.site.appearance, themeId: 'default' },
    },
  });
  await spa(page, '/');
  await surface(page, 'default');
  await page.reload();
  await surface(page, 'default');
});

for (const themeId of ['default', 'ury'] as const) {
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
            themeId === 'default' ? '.timeline-update' : `.${themeId}-note`,
          ),
        ).toContainText('Synthetic moment');
        for (const [path, selector] of [
          [
            '/posts/fixture-post',
            themeId === 'default' ? '.post-article' : `.${themeId}-document`,
          ],
          [
            '/pages/fixture-page',
            themeId === 'default' ? '.entry-content' : `.${themeId}-document`,
          ],
          [
            '/about',
            themeId === 'default' ? '.about-page' : `.${themeId}-document`,
          ],
          [
            '/search?q=fixture&page=1',
            themeId === 'default' ? '.story-card' : `.${themeId}-story`,
          ],
          [
            '/tags',
            themeId === 'default' ? '.taxonomy-terms' : `.${themeId}-tags`,
          ],
          [
            '/tags/spring?page=2',
            themeId === 'default' ? '.story-card' : `.${themeId}-story`,
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
            .locator(
              themeId === 'default' ? '.post-article' : `.${themeId}-prose`,
            )
            .first(),
        ).toContainText('Synthetic heading');
        await expect(
          page.locator('.ury-prose img, .post-article img').first(),
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
    const selector =
      themeId === 'default' ? '.error-card' : `.${themeId}-error`;
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
    await expect(page.locator('body')).toHaveCSS(
      'font-size',
      themeId === 'default' ? '20px' : '18px',
    );
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await surface(page, themeId);
  });
}

test('first Ury load fetches its visual resources without Sakura styles or images', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'ury' });
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/');
  await surface(page, 'ury');
  await expect(page.locator('.ury-story')).toBeVisible();
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

for (const themeId of ['default', 'ury'] as const) {
  test(`${themeId} narrow content retains media and all font/size/palette choices`, async ({
    page,
  }, info) => {
    const state = await themeFixture(page, { themeId });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const font of themeId === 'default'
      ? (['default', 'bubble-candy'] as const)
      : (['serif', 'sans'] as const)) {
      for (const fontSize of [80, 150]) {
        for (const mode of ['light', 'dark']) {
          if (themeId === 'default') {
            state.settings.site.appearance.font = font as
              'default' | 'bubble-candy';
            state.settings.site.appearance.fontSize = fontSize;
          } else {
            state.settings.site.appearance.ury = {
              ...defaultUryAppearance,
              ...state.settings.site.appearance.ury,
              font: font as 'serif' | 'sans',
              fontSize,
            };
          }
          await page.context().addCookies([
            {
              name: themeId === 'default' ? 'cool_theme' : 'cool_ury_palette',
              value: mode,
              url: 'http://127.0.0.1:43871',
            },
          ]);
          await page.goto('/posts/fixture-post');
          await surface(page, themeId);
          await expect(
            page.locator(
              themeId === 'default' ? '.post-article' : `.${themeId}-document`,
            ),
          ).toContainText('Synthetic heading');
          await expect(page.locator('body')).toHaveCSS(
            'font-size',
            `${((themeId === 'default' ? 16 : 18) * fontSize) / 100}px`,
          );
          const image = page
            .locator('.ury-prose img, .post-article img')
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
      path: info.outputPath(`${themeId}-390-dark-150.png`),
      fullPage: true,
    });
  });
}

test('direct Admin errors keep fixed Admin visuals even when Ury is selected', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'ury' });
  await page.goto('/admin/synthetic-missing');
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('.ury-error')).toHaveCount(0);
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
