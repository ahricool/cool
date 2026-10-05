import { blog, admin } from './urls';
import { test, expect } from '@playwright/test';
const email = 'whoreahri@gmail.com';
const password = process.env.E2E_PASSWORD ?? 'cool-e2e-owner-password';

test('mobile readers navigate with the Logo, About and search without a drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(blog);
  await expect(page.locator('#mobile-sidebar')).toHaveCount(0);
  await expect(page.locator('.header-brand a')).toBeVisible();
  const navigation = page.getByRole('navigation', { name: '主导航' });
  await expect(navigation.getByRole('link')).toHaveCount(2);
  await navigation.getByRole('link', { name: '关于我', exact: true }).click();
  await expect(page).toHaveURL(blog + '/about');
  await page.locator('.header-brand a').click();
  await expect(page).toHaveURL(blog + '/');
  await navigation.getByRole('link', { name: '搜索', exact: true }).click();
  await expect(page.locator('.page-heading h1')).toHaveText('搜索');
  await page.getByRole('searchbox').fill('Sakura');
  await page.getByRole('searchbox').press('Enter');
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/search' && url.searchParams.get('q') === 'Sakura',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('Admin formatting preserves prose and upload buttons work from keyboard', async ({
  page,
}, info) => {
  await page.goto(admin + '/login');
  const loginArt = await page
    .locator('.login-story')
    .evaluate(
      (element) =>
        getComputedStyle(element).backgroundImage.match(
          /url\(["']?([^"')]+)["']?\)/,
        )?.[1],
    );
  expect(loginArt).toBeTruthy();
  expect(
    await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth;
    }, loginArt!),
  ).toBeGreaterThan(0);
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
  await page.screenshot({
    path: info.outputPath('sakura-admin-login.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录工作空间' }).click();
  await expect(page.getByRole('heading', { name: /你好/ })).toBeVisible();

  await page.getByRole('link', { name: '＋ 写文章', exact: true }).click();
  const content = page.getByRole('textbox', { name: '正文' });
  await content.fill('把日常写成故事');
  await content.press('ControlOrMeta+A');
  await page.getByRole('button', { name: '插入加粗', exact: true }).click();
  await expect(content).toHaveValue('**把日常写成故事**');
  await expect(content).toBeFocused();
  await page.getByRole('button', { name: '插入代码块', exact: true }).click();
  await expect(content).toHaveValue(
    '**\n```typescript\n把日常写成故事\n```\n**',
  );
  const upload = page.getByRole('button', { name: '插入图片', exact: true });
  await upload.focus();
  await page.keyboard.press('Enter');
  const library = page.getByRole('dialog', { name: '选择图片' });
  await expect(library).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(library).toBeHidden();
  await expect(content).toHaveValue(
    '**\n```typescript\n把日常写成故事\n```\n**',
  );
  await page.getByRole('button', { name: '上传图片', exact: true }).focus();
  const coverChooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Space');
  await (await coverChooser).setFiles([]);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await page.screenshot({
    path: info.outputPath('sakura-admin-editor.png'),
    fullPage: true,
    animations: 'disabled',
  });
  // Leave no server-side or recovered browser draft behind.
  await content.fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  const navigation = page.getByRole('complementary', { name: '工作空间导航' });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('button', { name: '打开导航' })).toHaveCount(0);
  const brand = navigation.getByRole('link', { name: '梦桜', exact: true });
  await brand.focus();
  await page.keyboard.press('Tab');
  await expect(
    navigation.getByRole('link', { name: '概览', exact: true }),
  ).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.screenshot({
    path: info.outputPath('sakura-admin-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
