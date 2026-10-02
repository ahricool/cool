import { blog, admin } from './urls';
import { test, expect } from '@playwright/test';
const email = 'whoreahri@gmail.com';
const password = process.env.E2E_PASSWORD ?? 'cool-e2e-owner-password';

test('Sakura mobile sidebar traps focus, closes, and restores navigation', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(blog);
  const toggle = page.getByRole('button', { name: '打开导航' });
  await toggle.click();
  const dialog = page.getByRole('dialog', { name: '移动端菜单' });
  const close = dialog.getByRole('button', { name: '关闭菜单' });
  await expect(close).toBeFocused();
  await expect(dialog.locator('.avatar img')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('sakura-mobile-sidebar.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('link', { name: '友链', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await toggle.click();
  await dialog.getByRole('link', { name: '首页', exact: true }).click();
  await expect(dialog).toBeHidden();
  await toggle.click();
  await dialog.getByRole('link', { name: '归档', exact: true }).click();
  await expect(page.locator('.pattern-title h1')).toHaveText('归档');
  await expect(dialog).toBeHidden();
  for (let attempt = 0; attempt < 2; attempt++) {
    await toggle.click();
    await dialog.getByRole('searchbox', { name: '搜索文章' }).fill('Sakura');
    await dialog.getByRole('searchbox', { name: '搜索文章' }).press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/zh/search' && url.searchParams.get('q') === 'Sakura',
    );
  }
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
  const blogHref = await page
    .getByRole('link', { name: '← 返回博客' })
    .getAttribute('href');
  expect(new URL(blogHref!, page.url()).href).toBe(new URL(blog).href);
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
  const welcomeArt = await page
    .locator('.welcome-card')
    .evaluate(
      (element) =>
        getComputedStyle(element).backgroundImage.match(
          /url\(["']?([^"')]+)["']?\)/,
        )?.[1],
    );
  expect(welcomeArt).toBeTruthy();
  expect(
    await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth;
    }, welcomeArt!),
  ).toBeGreaterThan(0);

  await page.getByRole('link', { name: '＋ 写文章', exact: true }).click();
  const content = page.getByRole('textbox', { name: 'Markdown 内容' });
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
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await chooser).setFiles([]);
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
  const navigation = page.getByRole('dialog', { name: '工作空间导航' });
  const menu = page.getByRole('button', { name: '打开导航' });
  await menu.click();
  await expect(
    navigation.getByRole('button', { name: '关闭菜单' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    navigation.getByRole('button', { name: '退出登录' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.screenshot({
    path: info.outputPath('sakura-admin-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
