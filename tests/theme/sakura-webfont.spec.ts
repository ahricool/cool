import { expect, test, type Page } from '@playwright/test';
import { themeFixture } from './fixture';

const wenkai = 'Sakura LXGW WenKai Mono';
const bubbleCandy = 'Bubble Candy';

async function downloadedWebfonts(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return performance
      .getEntriesByType('resource')
      .map((entry) => {
        const url = new URL(entry.name);
        const { encodedBodySize } = entry as PerformanceResourceTiming;
        return { path: url.pathname, bytes: encodedBodySize };
      })
      .filter(({ path }) =>
        /\/(?:lxgw-wenkai-mono-|bubble-candy)[^/]*\.woff2$/.test(path),
      );
  });
}

for (const { font, family, prefix, rare, budget } of [
  {
    font: 'default',
    family: wenkai,
    prefix: 'lxgw-wenkai-mono',
    rare: '\u{30EDE}',
    budget: 350_000,
  },
  {
    font: 'bubble-candy',
    family: bubbleCandy,
    prefix: 'bubble-candy',
    rare: '黻',
    budget: 550_000,
  },
] as const) {
  test(`${family} loads matching shards and fetches a rare character on demand`, async ({
    page,
  }, info) => {
    await themeFixture(page, { font });
    await page.goto('/home');
    const title = page.locator('.story-title').first();
    await expect(title).toContainText('春天的故事');
    await expect(title).toHaveCSS('font-family', new RegExp(`^"?${family}`));

    const initial = await downloadedWebfonts(page);
    await info.attach('initial font responses', {
      body: JSON.stringify(initial, null, 2),
      contentType: 'application/json',
    });
    expect(initial.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/${prefix}-basic`),
        expect.stringContaining(`/${prefix}-common`),
      ]),
    );
    expect(
      initial.every(
        ({ path, bytes }) => path.includes(`/${prefix}-`) && bytes > 0,
      ),
    ).toBe(true);
    expect(initial.reduce((sum, { bytes }) => sum + bytes, 0)).toBeLessThan(
      budget,
    );

    // Each sample is present in the corresponding font's long tail.
    await title.evaluate((element, character) => {
      element.append(document.createTextNode(character));
    }, rare);
    await expect
      .poll(async () =>
        (await downloadedWebfonts(page)).filter(
          ({ path, bytes }) =>
            bytes > 0 && !initial.some((entry) => entry.path === path),
        ),
      )
      .toEqual([
        {
          path: expect.stringMatching(new RegExp(`/${prefix}-u[0-9a-f]+`)),
          bytes: expect.any(Number),
        },
      ]);
  });
}

test('Ury does not download either Sakura webfont', async ({ page }) => {
  await themeFixture(page, { themeId: 'ury', font: 'bubble-candy' });
  await page.goto('/home');
  await expect(page.locator('[data-theme-root]')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family', /^"?Georgia/);
  expect(await downloadedWebfonts(page)).toEqual([]);
});

test('Admin uses WenKai only in the Sakura default font preview', async ({
  page,
}) => {
  await themeFixture(page);
  await page.goto('/admin/settings');
  await expect(page.locator('.settings-panel')).toBeVisible();
  expect(await downloadedWebfonts(page)).toEqual([]);

  await page.getByRole('tab', { name: '外观', exact: true }).click();
  await expect(page.getByText('春天的故事，慢慢写。 Sakura 2026')).toHaveCSS(
    'font-family',
    new RegExp(`^"?${wenkai}`),
  );
  await expect(page.locator('body')).not.toHaveCSS(
    'font-family',
    new RegExp(wenkai),
  );
  expect(await downloadedWebfonts(page)).not.toEqual([]);
});

test('Admin uses shared Bubble Candy shards when that font is saved', async ({
  page,
}) => {
  await themeFixture(page, { font: 'bubble-candy' });
  await page.goto('/admin/settings');
  await expect(page.locator('.settings-panel')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS(
    'font-family',
    /^"?Bubble Candy/,
  );
  const fonts = await downloadedWebfonts(page);
  expect(fonts.length).toBeGreaterThan(0);
  expect(
    fonts.every(
      ({ path, bytes }) => path.includes('/bubble-candy-') && bytes > 0,
    ),
  ).toBe(true);
});
