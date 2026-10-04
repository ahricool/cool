import { blog, admin, api } from './urls';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const email = 'whoreahri@gmail.com';
const password = process.env.E2E_PASSWORD ?? 'cool-e2e-owner-password';

test('cookie session survives reload and all-device logout revokes browser and script sessions', async ({
  page,
  context,
  request,
}, info) => {
  await page.goto(admin + '/settings');
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/admin/login' &&
      url.searchParams.get('next') === '/admin/settings',
  );
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue(email);
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录工作空间' }).click();
  // A next=/admin/settings query must not pass before login has completed.
  await expect(page).toHaveURL((url) => url.pathname === '/admin/settings');
  await expect(page.locator('.workspace h1')).toHaveText('网站配置');
  await page.reload();
  await expect(page.locator('.workspace h1')).toHaveText('网站配置');
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === 'cool_session',
  );
  expect(cookie).toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe('Lax');
  expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(15 * 86400 - 120);
  expect(cookie!.expires - Date.now() / 1000).toBeLessThanOrEqual(15 * 86400);
  if (process.env.E2E_COOKIE_SECURE === '1') expect(cookie!.secure).toBe(true);
  const storage = await page.evaluate(() => ({
    ...localStorage,
    ...sessionStorage,
  }));
  expect(JSON.stringify(storage)).not.toContain(cookie!.value);

  // Another tab replaces the shared cookie while this editor keeps its draft
  // and old in-memory CSRF token. The first save must recover once, in place.
  await page.goto(admin + '/posts/new');
  await page
    .getByRole('textbox', { name: '标题', exact: true })
    .fill('跨标签页继续写作');
  await page
    .getByLabel('链接名称', { exact: true })
    .fill(`session-${randomUUID()}`);
  await page
    .getByRole('textbox', { name: '正文' })
    .fill('切换登录也不能丢失的正文');
  const secondTab = await context.newPage();
  await secondTab.goto(admin + '/profile');
  await secondTab
    .getByRole('button', { name: '退出登录', exact: true })
    .click();
  await expect(secondTab).toHaveURL((url) => url.pathname === '/admin/login');
  await secondTab.getByLabel('密码', { exact: true }).fill(password);
  await secondTab.getByRole('button', { name: '登录工作空间' }).click();
  await expect(secondTab).toHaveURL((url) => url.pathname === '/admin/profile');
  await expect(
    secondTab.getByRole('heading', { name: '我的账户', exact: true }),
  ).toBeVisible();
  const scriptToken = (await context.cookies()).find(
    (entry) => entry.name === 'cool_session',
  )!.value;
  const staleCsrf = page.waitForResponse(
    (response) =>
      response.url().endsWith('/admin/posts') && response.status() === 403,
  );
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await staleCsrf;
  await expect(page).toHaveURL((url) =>
    /^\/admin\/posts\/[a-f0-9-]+$/.test(url.pathname),
  );
  await expect(page.getByRole('textbox', { name: '正文' })).toHaveValue(
    '切换登录也不能丢失的正文',
  );
  const postId = new URL(page.url()).pathname.split('/').at(-1);
  expect(
    (
      await request.delete(api + '/admin/posts/' + postId, {
        headers: { Authorization: `Bearer ${scriptToken}` },
      })
    ).ok(),
  ).toBeTruthy();
  await page
    .locator('.sidebar')
    .getByRole('link', { name: '我的账户', exact: true })
    .click();
  await page
    .locator('.workspace')
    .getByRole('button', { name: '退出所有设备', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: '退出所有设备' });
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL((url) => url.pathname === '/admin/profile');
  await page
    .locator('.workspace')
    .getByRole('button', { name: '退出所有设备', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: '退出所有设备' })
    .getByRole('button', { name: '退出所有设备', exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === '/admin/login');
  expect(
    (await context.cookies()).find((entry) => entry.name === 'cool_session'),
  ).toBeUndefined();
  await secondTab.reload();
  await expect(secondTab).toHaveURL((url) => url.pathname === '/admin/login');
  for (const token of [cookie!.value, scriptToken]) {
    expect(
      (
        await request.get(api + '/admin/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status(),
    ).toBe(401);
  }
  await page.goto(blog);
  await expect(page.locator('#content')).toBeVisible();
  await page.screenshot({
    path: info.outputPath('public-after-signout.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('first-password screen confirms input and remains in the same Nuxt app across public navigation', async ({
  page,
}, info) => {
  let initialized = false;
  let authenticated = false;
  const user = {
    id: 'first-owner',
    email,
    displayName: 'Ahri',
    avatarUrl: null,
  };
  const auth = { user, csrfToken: 'fixture-csrf' };
  await page.route('**/api/v1/admin/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.replace(
      '/api/v1/admin',
      '',
    );
    if (endpoint === '/auth/status')
      return route.fulfill({
        json: { email, initialized, setupAvailable: !initialized },
      });
    if (endpoint === '/auth/session')
      return authenticated
        ? route.fulfill({ json: auth })
        : route.fulfill({ status: 401, json: { message: 'Not signed in' } });
    if (endpoint === '/auth/setup') {
      expect(route.request().postDataJSON()).toEqual({
        password: 'first-setup-test-password',
      });
      initialized = true;
      authenticated = true;
      return route.fulfill({ json: auth });
    }
    if (endpoint === '/auth/me') return route.fulfill({ json: user });
    if (endpoint === '/posts')
      return route.fulfill({
        json: { items: [], total: 0, page: 1, pageSize: 5 },
      });
    if (endpoint === '/overview')
      return route.fulfill({
        json: { posts: 0, pages: 0, media: 0, comments: 0, recentPosts: [] },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto(admin + '/login?next=https://attacker.example/');
  await expect(
    page.getByRole('heading', { name: '设置登录密码' }),
  ).toBeVisible();
  const adminBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.screenshot({
    path: info.outputPath('first-password.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByLabel('设置密码', { exact: true })
    .fill('first-setup-test-password');
  await page
    .getByLabel('确认密码', { exact: true })
    .fill('a-different-test-password');
  await page.getByRole('button', { name: '设置密码并进入' }).click();
  await expect(page.getByRole('alert')).toContainText('两次输入的密码不一致');
  expect(initialized).toBe(false);
  await page.goto(blog);
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'blog');
  await expect(page.locator('#content')).toBeVisible();
  await page.getByRole('button', { name: '切换深色' }).click();
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'admin');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    adminBackground,
  );
  await page
    .getByLabel('设置密码', { exact: true })
    .fill('first-setup-test-password');
  await page
    .getByLabel('确认密码', { exact: true })
    .fill('first-setup-test-password');
  await page.getByRole('button', { name: '设置密码并进入' }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname.replace(/\/$/, '') ===
      new URL(admin).pathname.replace(/\/$/, ''),
  );
  await expect(page.getByRole('heading', { name: /你好/ })).toBeVisible();
  expect(new URL(page.url()).origin).toBe(new URL(blog).origin);
});
