import { test, expect } from '@playwright/test';
import { blog } from './urls';
test('timeline loads the next mixed page automatically and resets its cursor for the saved language', async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route('**/api/v1/public/timeline**', async (route) => {
    const url = new URL(route.request().url());
    const english = route
      .request()
      .headers()
      .cookie?.includes('cool_locale=en');
    const next = url.searchParams.get('cursor');
    requested.push(`${english ? 'en' : 'zh'}:${next ?? 'first'}`);
    const start = next ? 10 : 0;
    const count = english ? 2 : 10;
    await route.fulfill({
      json: {
        items: Array.from({ length: count }, (_, offset) => ({
          kind: 'moment',
          id: `${english ? 'en' : 'zh'}-${start + offset}`,
          content: `${english ? 'English update' : '中文短动态'} ${start + offset}\n\n**完整正文**`,
          contentLocale: english ? 'en' : 'zh',
          publishedAt: '2026-01-01T01:02:03Z',
          author: { id: 'owner', displayName: 'Owner', avatarUrl: null },
        })),
        nextCursor: !english && !next ? 'zh-next' : null,
      },
    });
  });
  await page.goto(blog);
  await expect(page.locator('.timeline-update')).toHaveCount(10);
  await page.locator('.timeline-status').scrollIntoViewIfNeeded();
  await expect(page.locator('.timeline-update')).toHaveCount(20);
  await expect(page.locator('.timeline-update').last()).toContainText(
    '中文短动态 19',
  );
  await expect(page.locator('.timeline-update h2')).toHaveCount(0);
  expect(requested).toEqual(['zh:first', 'zh:zh-next']);
  await page
    .locator('.site-footer')
    .getByRole('button', { name: 'English', exact: true })
    .click();
  await expect(page.locator('.timeline-update')).toHaveCount(2);
  await expect(page.locator('.timeline-update').first()).toContainText(
    'English update 0',
  );
  expect(requested.at(-1)).toBe('en:first');
  await page.reload();
  await expect(page.locator('.timeline-update')).toHaveCount(2);
  expect(requested.at(-1)).toBe('en:first');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
});
