import { test, expect, type Page } from '@playwright/test';
import { defaultUryAppearance } from '../../packages/content/src/types';
import { themeFixture } from './fixture';

type ThemeId = 'default' | 'ury';
const origin = 'http://127.0.0.1:43871';
async function spa(page: Page, path: string) {
  await page.evaluate(async (value) => {
    const app = (
      document.getElementById('__nuxt') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: {
              $router: { push: (path: string) => Promise<void> };
            };
          };
        };
      }
    ).__vue_app__;
    await app.config.globalProperties.$router.push(value);
  }, path);
}
async function selectTheme(page: Page, id: ThemeId) {
  await spa(page, '/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  const radio = page.getByTestId('appearance-theme').getByRole('radio', {
    name: id === 'default' ? 'sakura' : 'ury',
    exact: true,
  });
  await radio.focus();
  await radio.press('Space');
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(page.locator('.sakura-toast')).toContainText('配置已保存');
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const from of ['default', 'ury'] as const) {
  for (const to of ['default', 'ury'] as const) {
    if (from === to) continue;
    test(`SPA ${from} → ${to} → ${from} keeps settings, CSS and Admin isolated`, async ({
      page,
    }) => {
      const state = await themeFixture(page, {
        themeId: from,
        font: 'bubble-candy',
        fontSize: 150,
        background: 'heart',
        ury: { ...defaultUryAppearance, palette: 'sepia' },
      });
      const saved = structuredClone(state.settings.site.appearance);
      await page.goto('/');
      await page.evaluate(() => {
        (window as Window & { sameDocument?: boolean }).sameDocument = true;
      });
      for (const id of [to, from]) {
        await selectTheme(page, id);
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-site-theme',
        );
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-ury-palette',
        );
        await expect(page.locator('body')).toHaveCSS('font-size', '24px');
        await page
          .getByRole('button', { name: '我的账户', exact: true })
          .click();
        await expect(page.locator('#admin-account-menu')).toHaveCSS(
          'background-color',
          'rgb(255, 255, 255)',
        );
        await page.keyboard.press('Escape');
        await spa(page, '/');
        await expect(page.locator('html')).toHaveAttribute(
          'data-site-theme',
          id,
        );
        await expect(page.locator('[data-theme-root]')).toHaveCount(1);
        await expect(page.locator(`[data-theme-root="${id}"]`)).toBeVisible();
        await expect(
          page.locator('[data-admin-feedback], .sakura-toast, .el-message-box'),
        ).toHaveCount(0);
        await expect(page.locator('body')).not.toHaveClass(
          /el-popup-parent--hidden/,
        );
        for (const [owner, variable] of [
          ['default', '--sakura-accent'],
          ['ury', '--ury-page'],
        ]) {
          if (owner !== id)
            expect(
              await page
                .locator('html')
                .evaluate(
                  (el, name) => getComputedStyle(el).getPropertyValue(name),
                  variable!,
                ),
            ).toBe('');
        }
        await expect(page.locator('body')).toHaveCSS(
          'font-size',
          id === 'default' ? '24px' : '18px',
        );
        expect(state.settings.site.appearance).toEqual({
          ...saved,
          themeId: id,
        });
      }
      expect(
        await page.evaluate(
          () => (window as Window & { sameDocument?: boolean }).sameDocument,
        ),
      ).toBe(true);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute(
        'data-site-theme',
        from,
      );
    });
  }
}

test('Ury settings save/reload independently, while an unsaved choice never applies', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    font: 'bubble-candy',
    fontSize: 150,
    background: 'star',
    ury: { ...defaultUryAppearance },
  });
  const sakura = structuredClone(state.settings.site.appearance);
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await page.getByRole('tab', { name: 'ury', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'ury', exact: true });
  for (const name of ['暖纸色', '无衬线', '宽幅']) {
    const choice = panel.getByRole('radio', { name, exact: true });
    await choice.focus();
    await choice.press('Space');
  }
  await panel.getByRole('slider').focus();
  await page.keyboard.press('End');
  await panel.getByRole('checkbox', { name: '显示作者头像' }).uncheck();
  await panel.getByRole('checkbox', { name: '显示文章封面' }).uncheck();
  await expect(
    page
      .getByTestId('appearance-theme')
      .getByRole('radio', { name: 'sakura', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(page.locator('.sakura-toast')).toContainText('配置已保存');
  expect(state.settings.site.appearance).toEqual({
    ...sakura,
    ury: {
      palette: 'sepia',
      font: 'sans',
      fontSize: 150,
      readingWidth: 'wide',
      showAvatar: false,
      showCovers: false,
    },
  });
  const choice = page
    .getByTestId('appearance-theme')
    .getByRole('radio', { name: 'ury', exact: true });
  await choice.focus();
  await choice.press('Space');
  await spa(page, '/');
  await expect(page.locator('[data-theme-root="default"]')).toBeVisible();
  await selectTheme(page, 'ury');
  await spa(page, '/posts/fixture-post');
  await page.reload();
  await expect(page.locator('.ury-document')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-ury-palette',
    'sepia',
  );
  await expect(page.locator('html')).toHaveAttribute('data-font', 'sans');
  await expect(page.locator('body')).toHaveCSS('font-size', '27px');
  await expect(page.locator('html')).toHaveAttribute('data-ury-width', 'wide');
  await expect(
    page.locator('.ury-avatar, .ury-author img, .ury-cover'),
  ).toHaveCount(0);
  await expect(page.locator('.ury-prose img')).toBeVisible();
  await selectTheme(page, 'default');
  await spa(page, '/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-font',
    'bubble-candy',
  );
  await expect(page.locator('body')).toHaveCSS('font-size', '24px');
});

test('Ury palettes persist per reader, restore site default and never change other cookies', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    themeId: 'ury',
    ury: { ...defaultUryAppearance, palette: 'sepia' },
  });
  await page.context().addCookies([
    { name: 'cool_theme', value: 'light', url: origin },
    { name: 'cool_admin_theme', value: 'dark', url: origin },
  ]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-ury-palette',
    'sepia',
  );
  for (const palette of ['light', 'sepia', 'dark'] as const) {
    await page.getByLabel('配色', { exact: true }).selectOption(palette);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute(
      'data-ury-palette',
      palette,
    );
    state.settings.site.appearance.ury!.palette =
      palette === 'dark' ? 'light' : 'dark';
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute(
      'data-ury-palette',
      palette,
    );
    await page.getByLabel('配色', { exact: true }).selectOption('');
    await expect(page.locator('html')).toHaveAttribute(
      'data-ury-palette',
      state.settings.site.appearance.ury!.palette,
    );
  }
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'cool_theme')?.value).toBe('light');
  expect(cookies.find((c) => c.name === 'cool_admin_theme')?.value).toBe(
    'dark',
  );
  await spa(page, '/admin/settings');
  await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.locator('html')).not.toHaveAttribute('data-ury-palette');
});

for (const width of [1440, 390])
  for (const language of ['zh', 'en']) {
    test(`Ury media, type sizes, reading widths and palettes ${width} ${language}`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      const state = await themeFixture(page, {
        themeId: 'ury',
        ury: { ...defaultUryAppearance },
      });
      state.richContent = true;
      await page.setViewportSize({ width, height: 900 });
      await page
        .context()
        .addCookies([{ name: 'cool_locale', value: language, url: origin }]);
      for (const font of ['serif', 'sans'] as const)
        for (const fontSize of [80, 150])
          for (const readingWidth of ['comfortable', 'wide'] as const)
            for (const palette of ['light', 'sepia', 'dark'] as const) {
              state.settings.site.appearance.ury = {
                ...defaultUryAppearance,
                font,
                fontSize,
                readingWidth,
                palette,
              };
              await page.goto('/posts/fixture-post');
              await expect(page.locator('.ury-document')).toContainText(
                'Synthetic heading',
              );
              await expect(page.locator('html')).toHaveAttribute(
                'data-font',
                font,
              );
              await expect(page.locator('html')).toHaveAttribute(
                'data-ury-palette',
                palette,
              );
              await expect(page.locator('html')).toHaveAttribute(
                'data-ury-width',
                readingWidth,
              );
              await expect(page.locator('body')).toHaveCSS(
                'font-size',
                `${(18 * fontSize) / 100}px`,
              );
              await expect(page.locator('.ury-masthead')).toHaveCSS(
                'position',
                width === 1440 ? 'fixed' : 'static',
              );
              await expect(page.locator('html')).toHaveAttribute(
                'lang',
                language === 'zh' ? 'zh-CN' : 'en',
              );
              await expect(page.locator('.ury-prose table')).toContainText(
                'Width',
              );
              await expect(page.locator('.ury-prose pre code')).toContainText(
                'const theme = true',
              );
              await expect(page.locator('.ury-prose video')).toHaveAttribute(
                'controls',
                '',
              );
              await expect(
                page.locator('.ury-prose video'),
              ).not.toHaveAttribute('autoplay');
              const image = page.locator('.ury-prose img').first();
              await expect(image).toBeVisible();
              await expect
                .poll(() =>
                  image.evaluate((el) => (el as HTMLImageElement).naturalWidth),
                )
                .toBeGreaterThan(0);
              await page.locator('.ury-toc summary').click();
              await expect(page.locator('.ury-toc a').first()).toHaveAttribute(
                'href',
                /#.+/,
              );
              await noOverflow(page);
            }
      for (const palette of ['light', 'sepia', 'dark'] as const) {
        state.settings.site.appearance.ury = {
          ...defaultUryAppearance,
          palette,
        };
        for (const route of ['/', '/posts/fixture-post']) {
          await page.goto(route);
          await expect(
            page.locator(route === '/' ? '.ury-story-featured' : '.ury-prose'),
          ).toBeVisible();
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].map((img) => img.decode()));
          });
          await page.screenshot({
            path: info.outputPath(
              `ury-${width}-${language}-${palette}-${route === '/' ? 'home' : 'post'}.png`,
            ),
            fullPage: true,
          });
        }
      }
    });
  }

test('Ury avatar uses upload, owned fallback, or no image on sidebar and post', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    themeId: 'ury',
    ury: { ...defaultUryAppearance },
  });
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  for (const uploaded of [true, false]) {
    state.avatarUrl = uploaded ? '/api/v1/media/fixture.webp' : null;
    await page.goto('/posts/fixture-post');
    for (const selector of ['.ury-avatar', '.ury-author img']) {
      const image = page.locator(selector);
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute(
        'src',
        uploaded ? /\/api\/v1\/media\/fixture.webp/ : /mark[^/]*\.svg/,
      );
      const bounds = await image.boundingBox();
      expect(bounds!.width).toBe(bounds!.height);
      await expect(image).toHaveCSS('object-fit', 'cover');
    }
  }
  state.settings.site.appearance.ury!.showAvatar = false;
  await page.reload();
  await expect(page.locator('.ury-avatar, .ury-author img')).toHaveCount(0);
  expect(urls.some((url) => /\/sakura\/|bubble-candy/.test(url))).toBe(false);
});

test('Ury near-bottom loading stops at exhaustion and failure; explicit retry recovers', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    themeId: 'ury',
    ury: { ...defaultUryAppearance, showCovers: false },
  });
  state.timelinePages = 3;
  state.timelineFailures.add('1');
  await page.goto('/');
  await page.locator('.ury-feed-sentinel').scrollIntoViewIfNeeded();
  await expect(page.locator('.ury-feed [role="alert"]')).toBeVisible();
  const attempts = state.timelineQueries.length;
  await page.mouse.wheel(0, -300);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  expect(state.timelineQueries.length).toBe(attempts);
  state.timelineFailures.clear();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect
    .poll(() => page.locator('.ury-story-featured').count())
    .toBeGreaterThanOrEqual(2);
  await page.locator('.ury-feed-sentinel').scrollIntoViewIfNeeded();
  await expect(page.locator('.ury-story-featured')).toHaveCount(3);
  await expect(page.locator('.ury-feed-sentinel')).toContainText('已读到最后');
  const done = state.timelineQueries.length;
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(300);
  expect(state.timelineQueries.length).toBe(done);
  expect(state.timelineQueries.filter((q) => q.cursor === '2')).toHaveLength(1);
});

test('Ury manual loading works without IntersectionObserver', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      value: undefined,
      configurable: true,
    });
  });
  const state = await themeFixture(page, { themeId: 'ury' });
  state.timelinePages = 2;
  await page.goto('/');
  await expect(page.locator('.ury-story-featured')).toHaveCount(1);
  await page.getByRole('button', { name: '加载更多', exact: true }).click();
  await expect(page.locator('.ury-story-featured')).toHaveCount(2);
  expect(state.timelineQueries.map((q) => q.cursor)).toEqual([null, '1']);
});

test('Ury repeated cursor cannot auto-loop and abandoned feed cannot append stale language data', async ({
  page,
}) => {
  const state = await themeFixture(page, {
    themeId: 'ury',
    ury: { ...defaultUryAppearance, showCovers: false },
  });
  state.timelinePages = 4;
  state.timelineRepeatCursor = true;
  await page.goto('/');
  await page.locator('.ury-feed-sentinel').scrollIntoViewIfNeeded();
  await expect(page.locator('.ury-story-featured')).toHaveCount(2);
  await page.waitForTimeout(300);
  expect(state.timelineQueries.map((q) => q.cursor)).toEqual([null, '1']);
  await page.getByLabel('Language / 语言').selectOption('en');
  await expect(page.locator('.ury-story-featured').first()).toContainText(
    'Synthetic article',
  );
  expect(
    state.timelineQueries.some((q) => q.cursor === null && q.language === 'en'),
  ).toBe(true);
  await spa(page, '/search');
  const count = state.timelineQueries.length;
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(300);
  expect(state.timelineQueries.length).toBe(count);
});

test('Ury API failures retain a retry path for document and timeline', async ({
  page,
}) => {
  const state = await themeFixture(page, { themeId: 'ury' });
  state.timelineFailures.add('first');
  await page.goto('/');
  await expect(page.locator('.ury-feed [role="alert"]')).toBeVisible();
  state.timelineFailures.clear();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.ury-story-featured')).toBeVisible();
  let fail = true;
  await page.route('**/api/v1/public/posts/fixture-post', (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { message: 'Synthetic unavailable' },
        })
      : route.fallback(),
  );
  await spa(page, '/posts/fixture-post');
  await expect(page.locator('.ury-status [role="alert"]')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.ury-document')).toContainText(
    'Synthetic heading',
  );
});

test('Ury delayed page cannot overwrite a newer language or survive a theme switch', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (
      window as Window & { themeObserver?: typeof IntersectionObserver }
    ).themeObserver = window.IntersectionObserver;
    Object.defineProperty(window, 'IntersectionObserver', {
      value: undefined,
      configurable: true,
    });
  });
  const state = await themeFixture(page, { themeId: 'ury' });
  state.timelinePages = 2;
  const entered = new Set<string>();
  const releases = new Map<string, () => void>();
  const gates = new Map(
    ['zh', 'en'].map((language) => [
      language,
      new Promise<void>((resolve) => releases.set(language, resolve)),
    ]),
  );
  await page.route('**/api/v1/public/timeline**', async (route) => {
    const request = route.request();
    if (new URL(request.url()).searchParams.get('cursor') === '1') {
      const language = /cool_locale=en/.test(request.headers()['cookie'] ?? '')
        ? 'en'
        : 'zh';
      entered.add(language);
      await gates.get(language);
    }
    await route.fallback();
  });
  await page.goto('/');
  await expect(page.locator('.ury-story-featured')).toHaveCount(1);
  await page.getByRole('button', { name: '加载更多', exact: true }).click();
  await expect.poll(() => entered.has('zh')).toBe(true);
  await page.getByLabel('Language / 语言').selectOption('en');
  await expect(page.locator('.ury-story-featured')).toHaveCount(1);
  await expect(page.locator('.ury-story-featured')).toContainText(
    'Synthetic article',
  );
  const oldResponse = page.waitForResponse(
    (response) => new URL(response.url()).searchParams.get('cursor') === '1',
  );
  releases.get('zh')!();
  await oldResponse;
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ury-story-featured')).toHaveCount(1);
  await expect(page.locator('.ury-story-featured')).not.toContainText(
    '合成文章',
  );
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect.poll(() => entered.has('en')).toBe(true);
  // Change UI language before navigating so the shared Admin helper uses Chinese labels.
  await page.getByLabel('Language / 语言').selectOption('zh');
  // Sakura requires the native observer; the no-observer case above is Ury-only.
  await page.evaluate(() => {
    const state = window as Window & {
      themeObserver?: typeof IntersectionObserver;
    };
    Object.defineProperty(window, 'IntersectionObserver', {
      value: state.themeObserver,
      configurable: true,
    });
    delete state.themeObserver;
  });
  // Keep the new tree at one item so only an abandoned response could add another.
  state.timelinePages = 1;
  await selectTheme(page, 'default');
  await spa(page, '/');
  await expect(page.locator('.story-card')).toHaveCount(1);
  const abandonedResponse = page.waitForResponse(
    (response) => new URL(response.url()).searchParams.get('cursor') === '1',
  );
  releases.get('en')!();
  await abandonedResponse;
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.ury-story-featured')).toHaveCount(0);
  await expect(page.locator('.story-card')).toHaveCount(1);
});
