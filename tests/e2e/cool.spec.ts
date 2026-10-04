import { blog, admin, api } from './urls';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const email = 'whoreahri@gmail.com';
const password = process.env.E2E_PASSWORD ?? 'cool-e2e-owner-password';
test('owner writes, previews and publishes; readers browse; owner manages content', async ({
  page,
  context,
  request,
}, info) => {
  const slug = `e2e-${randomUUID()}`;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(admin + '/login');
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录工作空间' }).click();
  await expect(page.getByRole('heading', { name: /你好/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath('admin-overview.png'),
    fullPage: true,
    animations: 'disabled',
  });
  for (const label of [
    '文章',
    '独立页面',
    '媒体库',
    '分类',
    '标签',
    '瞬间',
    '图库',
    '网站配置',
    '我的账户',
  ]) {
    await page
      .locator('.sidebar')
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page.locator('.workspace h1')).toBeVisible();
    await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0);
  }
  await page
    .locator('.sidebar')
    .getByRole('link', { name: '概览', exact: true })
    .click();
  await page.getByRole('link', { name: '＋ 写文章', exact: true }).click();
  await page
    .getByRole('textbox', { name: '标题', exact: true })
    .fill('在时光里，收藏一片春天');
  await page.getByLabel('URL 标识', { exact: true }).fill(slug);
  await page
    .getByRole('textbox', { name: 'Markdown 内容' })
    .fill(
      '# 春日手记\n\n把日常写成故事，让灵感在字里行间生长。\n\n## 一点代码\n\n```typescript\nconst season = "spring";\n```\n\n<script>window.__unsafe = true</script>',
    );
  const uploaded = page.waitForResponse(
    (r) =>
      r.url().endsWith('/admin/media/upload') &&
      r.request().method() === 'POST',
  );
  await page
    .locator('.asset-picker input[type="file"]')
    .setInputFiles('apps/frontend/public/sakura/images/default/hd.webp');
  const uploadResponse = await uploaded;
  expect(uploadResponse.ok()).toBeTruthy();
  const media = await uploadResponse.json();
  await expect(page.getByAltText('所选图片')).toHaveAttribute('src', media.url);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.markdown-preview h1')).toHaveText('春日手记');
  await page.screenshot({
    path: info.outputPath('admin-editor.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL((url) =>
    /^\/admin\/posts\/[a-f0-9-]+$/.test(url.pathname),
  );
  expect((await request.get(api + '/public/posts/' + slug)).status()).toBe(404);
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await expect(page.getByRole('button', { name: '撤回为草稿' })).toBeVisible();
  const detail = await request.get(api + '/public/posts/' + slug);
  expect(detail.ok()).toBeTruthy();
  const postId = (await detail.json()).id;
  await page.goto(blog + '/posts/' + slug);
  await expect(page.locator('.page-heading h1')).toHaveText(
    '在时光里，收藏一片春天',
  );
  await expect(page.locator('.entry-content .hljs-keyword')).toHaveText(
    'const',
  );
  await expect(page.locator('.toc-sidebar a')).toHaveCount(2);
  expect(await page.evaluate(() => '__unsafe' in window)).toBe(false);
  await page.screenshot({
    path: info.outputPath('blog-post.png'),
    fullPage: true,
    animations: 'disabled',
  });
  // The browser keeps its HttpOnly session across reloads; scripts can use bearer auth.
  const token = (await context.cookies()).find(
    (cookie) => cookie.name === 'cool_session',
  )?.value;
  expect(token).toBeDefined();
  const headers = { Authorization: `Bearer ${token}` };
  expect(
    (await request.delete(api + '/admin/posts/' + postId, { headers })).ok(),
  ).toBeTruthy();
  expect(
    (await request.delete(api + '/admin/media/' + media.id, { headers })).ok(),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test('all blog routes load on desktop and mobile without external resources', async ({
  page,
}, info) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (
      !['localhost', '127.0.0.1'].includes(new URL(r.url()).hostname) &&
      r.url().startsWith('http')
    )
      external.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of [
    '/',
    '/archives',
    '/categories',
    '/tags',
    '/moments',
    '/photos',
    '/search',
  ]) {
    await page.goto(blog + path);
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('.api-state[role="alert"]')).toHaveCount(0);
  }
  await page.goto(blog);
  await expect(page.locator('.hero-brand')).toBeVisible();
  await expect(page.locator('#page')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: info.outputPath('blog-home-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '打开导航' }).click();
  await page
    .getByRole('navigation', { name: '移动端导航' })
    .getByRole('link', { name: '归档' })
    .click();
  await expect(page.locator('.page-heading h1')).toHaveText('归档');
  await page.goto(blog);
  await expect(page.locator('#content')).toBeVisible();
  await expect(page.locator('#page')).toHaveCSS('opacity', '1');
  await expect
    .poll(() =>
      page
        .locator('.reading-banner--home .banner-image')
        .evaluate((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }),
    )
    .toBe(true);
  const notice = page.locator('.notice');
  if (await notice.count()) {
    const bounds = await notice.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({
    path: info.outputPath('blog-home-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
