import { test, expect } from '@playwright/test';
import { themeFixture } from './fixture';

for (const id of ['default', 'minimal'] as const) {
  test(`${id}: a late 404 from an abandoned async themed page cannot replace the current route`, async ({
    page,
  }) => {
    await themeFixture(page, { themeId: id });
    let release!: () => void;
    let entered = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/v1/public/posts/slow-review', async (route) => {
      entered = true;
      await gate;
      await route.fulfill({
        status: 404,
        json: { message: 'Synthetic delayed missing post' },
      });
    });
    const spa = async (path: string) =>
      page.evaluate(async (value) => {
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
    await page.goto('/');
    await expect(
      page.locator(id === 'default' ? '.story-title' : '.minimal-story h2'),
    ).toBeVisible();
    await spa('/posts/slow-review');
    await expect.poll(() => entered).toBe(true);
    await spa('/search');
    await expect(
      page.locator(id === 'default' ? '.cool-search' : '.minimal-search-field'),
    ).toBeVisible();
    const response = page.waitForResponse((value) =>
      value.url().endsWith('/public/posts/slow-review'),
    );
    release();
    await response;
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator(id === 'default' ? '.cool-search' : '.minimal-search-field'),
    ).toBeVisible();
    await expect(page.locator('.error-card, .minimal-error')).toHaveCount(0);
  });
}

test('leaving Admin cancels its pending confirmation before the public surface renders', async ({
  page,
}) => {
  await themeFixture(page, { themeId: 'minimal' });
  const deletes: string[] = [];
  await page.route('**/api/v1/admin/posts**', async (route) => {
    if (route.request().method() === 'DELETE')
      deletes.push(route.request().url());
    await route.fulfill({
      json: {
        items: [
          {
            id: 'review-item',
            slug: 'review-item',
            type: 'ARTICLE',
            translations: [
              {
                locale: 'zh',
                title: 'Review item',
                status: 'PUBLISHED',
                publishedAt: '2026-10-01T00:00:00Z',
              },
            ],
            tags: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 15,
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.minimal-story')).toBeVisible();
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
    await root.__vue_app__.config.globalProperties.$router.push('/admin/posts');
  });
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Review item');
  await page.evaluate(() => {
    const state = window as Window & { publicBodyAfterConfirmation?: unknown };
    new MutationObserver(() => {
      if (document.documentElement.dataset.surface === 'blog') {
        state.publicBodyAfterConfirmation = {
          width: document.body.style.width,
          locked: document.body.classList.contains('el-popup-parent--hidden'),
          overlays: document.querySelectorAll(
            '[data-admin-feedback], .el-message-box',
          ).length,
        };
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-surface'],
    });
  });
  await page.goBack();
  await expect(page.locator('.minimal-story')).toBeVisible();
  expect(
    await page.locator('[data-admin-feedback], .el-message-box').count(),
  ).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { publicBodyAfterConfirmation?: unknown })
          .publicBodyAfterConfirmation,
    ),
  ).toEqual({ width: '', locked: false, overlays: 0 });
  expect(deletes).toEqual([]);
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
    await root.__vue_app__.config.globalProperties.$router.push('/admin/posts');
  });
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(deletes).toEqual([]);
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
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
      message: 'Synthetic Admin error with a pending confirmation',
      fatal: true,
    };
  });
  await expect(page.locator('.error-card')).toContainText('500');
  expect(
    await page.locator('[data-admin-feedback], .el-message-box').count(),
  ).toBe(0);
  await page.getByRole('button', { name: '返回工作空间', exact: true }).click();
  await expect(page.locator('.admin-shell')).toBeVisible();
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
    await root.__vue_app__.config.globalProperties.$router.push('/admin/posts');
  });
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(deletes).toEqual([]);
});
