import { blog } from './urls';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
const content = `# 把日常写成故事

春天不是某一个盛大的瞬间，而是窗边的光、刚刚翻开的书，以及想与你分享的小事。这里收藏生活，也记录每一次灵感。

## 留一点空白

清晰的文字，让阅读慢下来。中文与 English、数字 2026，以及 **值得记住的片段** 和 *偶然的灵感*，都应该自然地站在一起。

> 不必急着抵达，沿途的风景也值得被认真收藏。

- 一本还没读完的书
- 一次没有目的地的散步
- 一段突然浮现的旋律

## 一点代码

\`\`\`typescript
const season = "spring";
const memories = ["光", "风", "花"];
console.log(season, memories);
\`\`\`

把心情写进 \`journal.md\`，再读一遍。[回到首页](/) 也有新的故事。

| 片刻 | 想记录的事 |
| --- | --- |
| 清晨 | 风把窗帘轻轻吹起 |
| 傍晚 | 和朋友分享今天的照片 |
`;
const posts = [
  {
    id: 'visual-spring',
    slug: 'visual-spring',
    contentLocale: 'zh',
    title: '在时光里，收藏一片春天',
    excerpt:
      '把日常写成故事，让灵感在字里行间生长。中文与 English、照片与代码，都在这里找到舒服的位置。',
    content,
    coverUrl: '/sakura/images/default/hd.webp',
    author: {
      id: 'owner',
      displayName: 'Sakura',
      avatarUrl: '/sakura/images/default/avatar.webp',
    },
    publishedAt: '2026-04-12T08:00:00.000Z',
    createdAt: '2026-04-12T08:00:00.000Z',
    updatedAt: '2026-04-12T08:00:00.000Z',
    commentCount: 1,
    viewCount: 12,
    categories: [
      {
        category: {
          id: 'life',
          name: '日常手记',
          slug: 'life',
          contentLocale: 'zh',
        },
      },
    ],
    tags: [
      {
        tag: {
          id: 'spring',
          name: '春日',
          slug: 'spring',
          contentLocale: 'zh',
        },
      },
    ],
  },
  {
    id: 'visual-walk',
    slug: 'visual-walk',
    contentLocale: 'zh',
    title: '没有目的地的散步，也会遇见好风景',
    excerpt:
      '一条熟悉的路，一首循环播放的歌。给平凡的日子留一点空白，也给自己留一点期待。',
    coverUrl: '/sakura/images/default/temp.webp',
    author: { id: 'owner', displayName: 'Sakura', avatarUrl: null },
    publishedAt: '2026-04-10T08:00:00.000Z',
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z',
    commentCount: 0,
    viewCount: 8,
    categories: [
      {
        category: {
          id: 'life',
          name: '日常手记',
          slug: 'life',
          contentLocale: 'zh',
        },
      },
    ],
    tags: [],
  },
];
async function fixture(page: Page) {
  await page.route('**/api/v1/public/zh/tags', (route) =>
    route.fulfill({
      json: [
        { id: 'spring', name: '春日', slug: 'spring', contentLocale: 'zh' },
        { id: 'life', name: '生活', slug: 'life', contentLocale: 'zh' },
      ],
    }),
  );
  await page.route(
    /\/api\/v1\/public\/zh\/(?:categories|tags)\/[^/]+\/posts(?:[?]|$)/,
    (route) =>
      route.fulfill({
        json: { items: posts, total: posts.length, page: 1, pageSize: 8 },
      }),
  );
  await page.route('**/api/v1/public/zh/site', (route) =>
    route.fulfill({
      json: {
        contentLocale: 'zh',
        title: '梦桜',
        description: '记录生活，也记录每一次灵感。',
        authorName: 'Sakura',
        authorBio: '在这里，收藏日常的微光。',
        avatarUrl: '/sakura/images/default/avatar.webp',
        commentsEnabled: true,
      },
    }),
  );
  await page.route('**/api/v1/public/zh/config', (route) =>
    route.fulfill({
      json: {
        homepage: {
          contentLocale: 'zh',
          coverUrl: '/sakura/images/default/hd.webp',
          focusMode: 'glitch-text',
          greeting: 'Hello, 梦桜',
          description: '把日常写成故事，让灵感自由生长。',
          notice: '欢迎来到我的小小世界。愿每一次相遇，都能留下一点温柔。',
          wave: true,
        },
        social: [{ label: 'GitHub', url: 'https://github.com/example' }],
      },
    }),
  );
  await page.route(/\/api\/v1\/public\/zh\/posts(?:[/?]|$)/, (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: path.endsWith('/comments')
        ? {
            items: [
              {
                id: 'reader',
                name: '路过的读者',
                content: '喜欢这样的春天，也喜欢清清爽爽的文字。',
                createdAt: '2026-04-13T08:00:00.000Z',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
          }
        : path.endsWith('/visual-spring')
          ? posts[0]
          : { items: posts, total: 2, page: 1, pageSize: 8 },
    });
  });
}
async function capture(page: Page, info: TestInfo, filename: string) {
  await expect(page.locator('#page')).toHaveCSS('opacity', '1');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: info.outputPath(filename),
    fullPage: true,
    animations: 'disabled',
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
}
test('Blog carries the Admin Sakura typography and surfaces through populated desktop and mobile pages', async ({
  page,
}, info) => {
  await fixture(page);
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto(blog);
  await expect(page.locator('.post-list-thumb')).toHaveCount(2);
  await expect(page.locator('body')).not.toHaveClass(/serif/);
  await expect(page.locator('body')).toHaveCSS(
    'font-family',
    /Ubuntu.*sans-serif/,
  );
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(64, 54, 73)');
  await expect(page.locator('.post-title h2').first()).toHaveCSS(
    'font-size',
    '21px',
  );
  await expect(page.locator('.main-title .sakura-flower')).toBeVisible();
  const cjkFaces = await page.evaluate(async () =>
    Promise.all([
      document.fonts
        .load('400 16px "Noto Sans SC"', '春天')
        .then((faces) => faces.length),
      document.fonts
        .load('700 20px "Noto Sans SC"', '春天')
        .then((faces) => faces.length),
    ]),
  );
  expect(cjkFaces).toEqual([1, 1]);
  for (const article of await page.locator('.post-list-thumb').all()) {
    const card = (await article.boundingBox())!;
    const more = (await article
      .getByRole('link', { name: /^阅读 / })
      .boundingBox())!;
    expect(more.y + more.height).toBeLessThanOrEqual(card.y + card.height);
    const cover = (await article.locator('.post-thumb').boundingBox())!;
    expect(Math.abs(cover.width / card.width - 0.55)).toBeLessThan(0.01);
    await article.scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      page
        .locator('.post-thumb img, #centerbg .cover-bg')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-home-desktop.png');
  await page.setViewportSize({ width: 860, height: 850 });
  const brand = (await page.locator('.site-branding').boundingBox())!;
  const nav = (await page.locator('.header-content .navbar').boundingBox())!;
  const actions = (await page.locator('.header-after').boundingBox())!;
  expect(brand.x + brand.width).toBeLessThanOrEqual(nav.x);
  expect(nav.x + nav.width).toBeLessThanOrEqual(actions.x);
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-home-narrow-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.post-title h2').first()).toHaveCSS(
    'font-size',
    '20px',
  );
  await noOverflow(page);
  await expect(page.locator('.site-header .header-inner')).toHaveCSS(
    'background-color',
    /255, 250, 253/,
  );
  const notice = (await page.locator('.notice').boundingBox())!;
  expect(notice.x).toBeGreaterThanOrEqual(0);
  expect(notice.x + notice.width).toBeLessThanOrEqual(390);
  await capture(page, info, 'sakura-refined-home-mobile.png');
  await page.getByRole('button', { name: '打开导航' }).click();
  const navigation = page.getByRole('navigation', { name: '移动端导航' });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: '首页', exact: true }),
  ).toHaveCSS('background-color', 'rgb(255, 241, 246)');
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-navigation-mobile.png');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开导航' })).toBeFocused();

  await page.goto(blog + '/posts/visual-spring');
  await expect(page.locator('.entry-content h1')).toHaveText('把日常写成故事');
  await expect(page.locator('.entry-content em')).toHaveCSS(
    'font-style',
    'italic',
  );
  await expect(page.locator('.entry-content em')).toHaveCSS(
    'font-synthesis',
    'style',
  );
  await expect(page.locator('.entry-content > p').first()).toHaveCSS(
    'font-size',
    '16px',
  );
  await expect(page.getByLabel('昵称', { exact: true })).toHaveCSS(
    'font-size',
    '16px',
  );
  await expect(page.getByRole('button', { name: '提交评论' })).toHaveCSS(
    'background-color',
    'rgb(179, 66, 114)',
  );
  await expect(page.locator('.pattern-attachment-img img')).toHaveJSProperty(
    'complete',
    true,
  );
  await expect(page.locator('.entry-content .hljs-keyword').first()).toHaveCSS(
    'color',
    'rgb(155, 50, 110)',
  );
  await expect(page.locator('.entry-content .hljs-string').first()).toHaveCSS(
    'color',
    'rgb(56, 101, 71)',
  );
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-article-mobile.png');
  await page.setViewportSize({ width: 1280, height: 850 });
  await capture(page, info, 'sakura-refined-article-desktop.png');
  await page.getByRole('button', { name: '切换深色' }).click();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(33, 27, 39)',
  );
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(238, 227, 238)');
  await expect(page.locator('.entry-content .hljs-keyword').first()).toHaveCSS(
    'color',
    'rgb(243, 162, 200)',
  );
  await capture(page, info, 'sakura-refined-article-dark.png');
});

test('Blog search, empty and retry states retain readable Sakura controls on mobile', async ({
  page,
}, info) => {
  await fixture(page);
  let fail = false;
  await page.route('**/api/v1/public/zh/search*', (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { message: 'unavailable' } }
        : { json: { items: [], total: 0, page: 1, pageSize: 8 } },
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(blog + '/search?q=spring');
  await expect(page.locator('.api-state')).toContainText('这里还没有内容');
  const button = page.getByRole('button', { name: '搜索', exact: true });
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(42);
  await page.getByRole('searchbox', { name: '寻找一段文字' }).focus();
  await expect(page.getByRole('searchbox', { name: '寻找一段文字' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-search-mobile.png');
  fail = true;
  await page.goto(blog + '/search?q=unavailable');
  await expect(page.getByRole('alert')).toContainText('暂时无法加载内容');
  await noOverflow(page);
  await capture(page, info, 'sakura-refined-error-mobile.png');
  fail = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.api-state')).toContainText('这里还没有内容');
  await page.goto(blog + '/tags');
  await page.getByRole('link', { name: '春日', exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/zh/tags/spring' && !url.search,
  );
  await expect(page.locator('.post-list-thumb')).toHaveCount(2);
  const selected = page.locator('.chip.selected');
  await expect(selected).toHaveText('春日');
  await expect(selected).toHaveCSS('background-color', 'rgb(179, 66, 114)');
  await expect(selected).toHaveCSS('color', 'rgb(252, 248, 251)');
  await capture(page, info, 'sakura-refined-tags-mobile.png');
  await page.getByRole('button', { name: '切换深色' }).click();
  await expect(selected).toHaveCSS('background-color', 'rgb(238, 164, 197)');
  await expect(selected).toHaveCSS('color', 'rgb(33, 27, 39)');
});
