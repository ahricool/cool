import { test, expect } from '@playwright/test';
import { themeFixture } from './fixture';

test('first-load errors resolve appearance and a failed site API does not loop on recovery', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'soft-preview' });
  await page.goto('/synthetic-first-load-not-found');
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await expect(page.locator('.story-title')).toBeVisible();
  let siteRequests = 0;
  await page.route('**/api/v1/public/site', async (route) => {
    siteRequests++;
    await route.fulfill({
      status: 400,
      json: { message: 'Synthetic site API failure' },
    });
  });
  await page.goto('/synthetic-failed-site-not-found');
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'default',
  );
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await expect(page.locator('.story-title')).toBeVisible();
  expect(siteRequests).toBe(1);
});

test('404 and global errors retain theme and font settings through recovery', async ({
  page,
}) => {
  await themeFixture(page, {
    themeId: 'soft-preview',
    font: 'bubble-candy',
    fontSize: 125,
  });
  await page
    .context()
    .addCookies([
      { name: 'cool_theme', value: 'dark', url: 'http://127.0.0.1:43871' },
    ]);
  await page.goto('/search');
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  await page.evaluate(async () => {
    const root = document.getElementById('__nuxt') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<void> };
          };
        };
      };
    };
    await root.__vue_app__.config.globalProperties.$router.push(
      '/synthetic-not-found',
    );
  });
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-font',
    'bubble-candy',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'style',
    /--sakura-font-scale: 1.25/,
  );
  await expect(page.locator('.error-card')).toHaveCSS(
    'background-color',
    'rgb(38, 39, 43)',
  );
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await expect(page.locator('.story-title')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
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
      message: 'Synthetic global error',
      fatal: true,
    };
  });
  await expect(page.locator('.error-card')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  await expect(page.locator('.error-card')).toHaveCSS(
    'background-color',
    'rgb(38, 39, 43)',
  );
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await expect(page.locator('.story-title')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
});

test('legacy and unknown IDs show the unchanged default in both reader palettes', async ({
  page,
}) => {
  const state = await themeFixture(page);
  for (const id of [undefined, 'default', 'removed-theme']) {
    state.settings.site.appearance.themeId = id as string;
    for (const mode of ['light', 'dark']) {
      await page
        .context()
        .addCookies([
          { name: 'cool_theme', value: mode, url: 'http://127.0.0.1:43871' },
        ]);
      await page.goto('/search');
      await expect(page.locator('html')).toHaveAttribute(
        'data-font',
        'default',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-site-theme',
        'default',
      );
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        mode === 'dark' ? 'rgb(23, 24, 26)' : 'rgb(255, 255, 255)',
      );
      await expect(page.locator('.primary-action')).toHaveCSS(
        'background-color',
        mode === 'dark' ? 'rgb(181, 46, 99)' : 'rgb(199, 54, 107)',
      );
      await expect(page.locator('html')).not.toHaveAttribute(
        'style',
        /--sakura-page/,
      );
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    }
  }
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: '默认主题', exact: true }),
  ).toBeChecked();
  expect(state.settings.site.appearance.themeId).toBe('removed-theme');
  expect(state.writes).toEqual([]);
});

test('Admin saves only theme choice, retains appearance and pictures, and survives refresh and route changes', async ({
  page,
}, info) => {
  const state = await themeFixture(page, {
    font: 'bubble-candy',
    fontSize: 150,
    avatar: 'star',
    cover: 'heart',
    background: 'none',
  });
  const original = structuredClone(state.settings);
  // The existing bilingual form orders translations by locale when saving.
  original.site.translations.sort((a, b) => a.locale.localeCompare(b.locale));
  original.homepage.translations.sort((a, b) =>
    a.locale.localeCompare(b.locale),
  );
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  const previewChoice = page.getByRole('radio', {
    name: '柔灰（预览）',
    exact: true,
  });
  await previewChoice.focus();
  await previewChoice.press('Space');
  await expect(previewChoice).toBeChecked();
  await expect(
    page
      .getByTestId('appearance-theme')
      .locator('.el-radio-button__inner')
      .last(),
  ).toHaveCSS('outline-width', '2px');
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'default',
  );
  expect(state.writes).toEqual([]);
  expect(state.settings.site.appearance.themeId).toBe('default');
  await page.goto('/search');
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'default',
  );
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: '默认主题', exact: true }),
  ).toBeChecked();
  await previewChoice.focus();
  await previewChoice.press('Space');
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  expect(state.writes).toEqual([
    {
      ...original,
      site: {
        ...original.site,
        appearance: { ...original.site.appearance, themeId: 'soft-preview' },
      },
    },
  ]);
  await expect(page.locator('.panel')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(245, 245, 246)',
  );
  await page.getByRole('button', { name: '切换深色', exact: true }).click();
  await expect(page.locator('.panel')).toHaveCSS(
    'background-color',
    'rgb(38, 39, 43)',
  );
  await page.screenshot({
    path: info.outputPath('admin-preview-dark.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'soft-preview',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-font',
    'bubble-candy',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'style',
    /--sakura-font-scale: 1.5/,
  );
  await expect(page.locator('.page-pattern')).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'blog');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(27, 28, 31)',
  );
  await expect(page.locator('.story-title')).toContainText('合成文章');
  await expect(page.locator('.story-cover img')).toHaveAttribute(
    'src',
    '/api/v1/media/fixture.webp',
  );
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await page
    .getByTestId('appearance-theme')
    .getByText('默认主题', { exact: true })
    .click();
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-site-theme',
    'default',
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'style',
    /--sakura-page/,
  );
  expect(
    await page.evaluate(() => Array.from(document.documentElement.style)),
  ).toEqual(['--sakura-font-scale']);
  await expect(page.locator('.panel')).toHaveCSS(
    'background-color',
    'rgb(34, 35, 39)',
  );
  expect(state.settings).toEqual(original);
  expect(
    (await page.context().cookies()).find(
      (cookie) => cookie.name === 'cool_theme',
    )?.value,
  ).toBe('dark');
});

test('themes compose with light/dark, font, size, pattern and explicit English on narrow screens', async ({
  page,
}, info) => {
  const state = await themeFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [index, themeId] of ['default', 'soft-preview'].entries()) {
    for (const mode of ['light', 'dark']) {
      state.settings.site.appearance = {
        themeId,
        font: index ? 'bubble-candy' : 'default',
        fontSize: mode === 'dark' ? 150 : 80,
        avatar: 'star',
        cover: 'heart',
        background: mode === 'dark' ? 'none' : 'star',
      };
      await page.context().addCookies([
        { name: 'cool_theme', value: mode, url: 'http://127.0.0.1:43871' },
        { name: 'cool_locale', value: 'en', url: 'http://127.0.0.1:43871' },
      ]);
      await page.goto('/search');
      await expect(page.locator('html')).toHaveAttribute(
        'data-site-theme',
        themeId,
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-font',
        index ? 'bubble-candy' : 'default',
      );
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('.page-pattern')).toHaveCount(
        mode === 'dark' ? 0 : 1,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`reader-${themeId}-${mode}.png`),
        fullPage: true,
      });
      await page.goto('/admin/settings');
      await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
      await expect(page.getByTestId('appearance-theme')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute(
        'data-site-theme',
        themeId,
      );
      const choices = await page.getByTestId('appearance-theme').boundingBox();
      expect(choices!.x + choices!.width).toBeLessThanOrEqual(390);
      await page.screenshot({
        path: info.outputPath(`admin-${themeId}-${mode}-mobile.png`),
        fullPage: true,
      });
    }
  }
});
