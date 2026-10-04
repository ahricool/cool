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
  await page.route('**/api/v1/public/tags', (route) =>
    route.fulfill({
      json: [
        { id: 'spring', name: '春日', slug: 'spring', contentLocale: 'zh' },
        { id: 'life', name: '生活', slug: 'life', contentLocale: 'zh' },
      ],
    }),
  );
  await page.route(
    /\/api\/v1\/public\/(?:categories|tags)\/[^/]+\/posts(?:[?]|$)/,
    (route) =>
      route.fulfill({
        json: { items: posts, total: posts.length, page: 1, pageSize: 8 },
      }),
  );
  await page.route('**/api/v1/public/site', (route) =>
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
  await page.route('**/api/v1/public/config', (route) =>
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
  await page.route(/\/api\/v1\/public\/posts(?:[/?]|$)/, (route) => {
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
test('populated reading pages remain usable on desktop and mobile in both palettes', async ({
  page,
}, info) => {
  await fixture(page);
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto(blog);
    await expect(
      page.getByRole('img', { name: '梦桜', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Hello, 梦桜', { exact: true })).toHaveCount(0);
    await page
      .locator('.site-footer')
      .getByRole('button', { name: 'English', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Hello, 梦桜', { exact: true })).toHaveCount(0);
    await page
      .locator('.site-footer')
      .getByRole('button', { name: '中文', exact: true })
      .click();
    await expect(page.locator('.story-title')).toHaveCount(2);
    await noOverflow(page);
    await capture(page, info, `home-${width}-light.png`);
    await page.getByRole('button', { name: '切换深色', exact: true }).click();
    await capture(page, info, `home-${width}-dark.png`);
    await page.goto(blog + '/posts/visual-spring');
    await expect(page.locator('.entry-content').first()).toContainText(
      '留一点空白',
    );
    await noOverflow(page);
    await capture(page, info, `reading-${width}.png`);
    await page.goto(blog + '/tags');
    await expect(
      page.getByRole('link', { name: '春日', exact: true }),
    ).toBeVisible();
    await noOverflow(page);
  }
});
