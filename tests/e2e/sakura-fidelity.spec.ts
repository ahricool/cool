import { test, expect } from '@playwright/test';
const blog = process.env.E2E_BLOG_URL ?? 'http://localhost:3001';

test('Sakura hero uses bundled social icons with accessible names', async ({
  page,
}, info) => {
  await page.route('**/api/v1/public/config', async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    await route.fulfill({
      json: {
        ...config,
        social: [
          { label: 'GitHub', url: 'https://github.com/example' },
          { label: '哔哩哔哩', url: 'https://space.bilibili.com/1' },
          { label: '朋友的网站', url: 'https://example.test/' },
        ],
      },
    });
  });
  await page.setViewportSize({ width: 1180, height: 850 });
  await page.goto(blog);
  const social = page.locator('.top-social');
  await expect(
    social.getByRole('link', { name: 'GitHub', exact: true }),
  ).toBeVisible();
  await expect(
    social.getByRole('link', { name: 'GitHub', exact: true }).locator('img'),
  ).toHaveAttribute('src', '/sakura/images/sns/github.png');
  await expect(
    social.getByRole('link', { name: '哔哩哔哩', exact: true }).locator('img'),
  ).toHaveAttribute('src', '/sakura/images/sns/bilibili.png');
  await expect(
    social
      .getByRole('link', { name: '朋友的网站', exact: true })
      .locator('img'),
  ).toHaveAttribute('src', '/sakura/images/sns/heart.png');
  await expect
    .poll(() =>
      social
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.locator('#centerbg .cover-bg').evaluate((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('sakura-social-home-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('Sakura gallery is full-width masonry with uncropped images and one mobile column', async ({
  page,
}, info) => {
  const urls = ['hd.webp', 'temp.webp', 'avatar.webp', 'hd.webp'];
  await page.route('**/api/v1/public/photos*', (route) =>
    route.fulfill({
      json: {
        items: urls.map((file, index) => ({
          id: `photo-${index}`,
          title: `画面 ${index + 1}`,
          description: '保留图片原始比例',
          album: 'Sakura',
          published: true,
          url: `/sakura/images/default/${file}`,
        })),
        total: urls.length,
        page: 1,
        pageSize: 24,
      },
    }),
  );
  await page.setViewportSize({ width: 1180, height: 850 });
  await page.goto(blog + '/photos');
  const gallery = page.locator('.masonry-gallery');
  await expect(gallery).toHaveClass(/is-masonry/);
  await expect
    .poll(() =>
      gallery
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const items = gallery.locator('.gallery-item');
  await expect(items).toHaveCount(4);
  await expect
    .poll(async () => {
      const first = await items.nth(0).boundingBox();
      const second = await items.nth(1).boundingBox();
      const fourth = await items.nth(3).boundingBox();
      return !!(
        first &&
        second &&
        fourth &&
        fourth.y >=
          Math.min(first.y + first.height, second.y + second.height) + 9
      );
    })
    .toBe(true);
  const boxes = await Promise.all(
    [0, 1, 2, 3].map((index) => items.nth(index).boundingBox()),
  );
  expect(new Set(boxes.slice(0, 3).map((box) => Math.round(box!.x))).size).toBe(
    3,
  );
  expect((await gallery.boundingBox())!.width).toBeGreaterThan(900);
  for (const image of await gallery.locator('img').all()) {
    const ratios = await image.evaluate((element) => {
      const image = element as HTMLImageElement;
      return {
        actual: image.clientWidth / image.clientHeight,
        natural: image.naturalWidth / image.naturalHeight,
      };
    });
    expect(Math.abs(ratios.actual - ratios.natural)).toBeLessThan(0.02);
  }
  await page.screenshot({
    path: info.outputPath('sakura-gallery-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        [0, 1, 2, 3].map((index) => items.nth(index).boundingBox()),
      );
      return new Set(boxes.map((box) => Math.round(box!.x))).size;
    })
    .toBe(1);
  await items.nth(0).getByRole('button').click();
  await expect(page.getByRole('dialog', { name: '画面 1' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.screenshot({
    path: info.outputPath('sakura-gallery-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
