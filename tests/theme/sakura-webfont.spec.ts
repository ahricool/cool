import { expect, test, type Page } from '@playwright/test';
import { themeFixture } from './fixture';

const family = 'Sakura LXGW WenKai Mono';

async function downloadedShards(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return performance
      .getEntriesByType('resource')
      .map((entry) => {
        const url = new URL(entry.name);
        const { encodedBodySize } = entry as PerformanceResourceTiming;
        return { path: url.pathname, bytes: encodedBodySize };
      })
      .filter(({ path }) => /\/lxgw-wenkai-mono-[^/]+\.woff2$/.test(path));
  });
}

test('Sakura loads a small set of webfonts initially and fetches a rare character on demand', async ({
  page,
}, info) => {
  await themeFixture(page);
  await page.goto('/home');
  const title = page.locator('.story-title').first();
  await expect(title).toContainText('春天的故事');
  await expect(title).toHaveCSS('font-family', new RegExp(`^"?${family}`));

  const initial = await downloadedShards(page);
  await info.attach('initial font responses', {
    body: JSON.stringify(initial, null, 2),
    contentType: 'application/json',
  });
  expect(initial.map(({ path }) => path)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('mono-basic'),
      expect.stringContaining('mono-common'),
    ]),
  );
  expect(initial.every(({ bytes }) => bytes > 0)).toBe(true);
  expect(initial.reduce((sum, { bytes }) => sum + bytes, 0)).toBeLessThan(
    350_000,
  );

  // U+30EDE is covered by the original font and outside the frequent shards.
  await title.evaluate((element) => {
    element.append(document.createTextNode('\u{30EDE}'));
  });
  await expect
    .poll(async () =>
      (await downloadedShards(page)).filter(
        ({ path, bytes }) =>
          bytes > 0 && !initial.some((entry) => entry.path === path),
      ),
    )
    .toEqual([
      {
        path: expect.stringMatching(/mono-u[0-9a-f]+/),
        bytes: expect.any(Number),
      },
    ]);
});

for (const [appearance, expected] of [
  [{ font: 'bubble-candy' }, 'Bubble Candy'],
  [{ themeId: 'ury' }, 'Georgia'],
] as const) {
  test(`${expected} does not download Sakura's default webfont`, async ({
    page,
  }) => {
    await themeFixture(page, appearance);
    await page.goto('/home');
    await expect(page.locator('[data-theme-root]')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS(
      'font-family',
      new RegExp(`^"?${expected}`),
    );
    expect(await downloadedShards(page)).toEqual([]);
  });
}

test('Admin uses WenKai only in the Sakura default font preview', async ({
  page,
}) => {
  await themeFixture(page);
  await page.goto('/admin/settings');
  await expect(page.locator('.settings-panel')).toBeVisible();
  expect(await downloadedShards(page)).toEqual([]);

  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await expect(page.getByText('春天的故事，慢慢写。 Sakura 2026')).toHaveCSS(
    'font-family',
    new RegExp(`^"?${family}`),
  );
  await expect(page.locator('body')).not.toHaveCSS(
    'font-family',
    new RegExp(family),
  );
  expect(await downloadedShards(page)).not.toEqual([]);
});
