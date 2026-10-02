import { test, expect, type Page, type Route } from '@playwright/test';

const admin = process.env.E2E_ADMIN_URL ?? 'http://127.0.0.1:5173/admin';
const id = 'a1111111-1111-4111-8111-111111111111';
const initial = {
  id,
  title: '已保存的标题',
  slug: 'editor-regression',
  content: '已保存的正文',
  excerpt: '',
  coverUrl: null,
  status: 'DRAFT',
  publishedAt: null,
  categories: [],
  tags: [],
};

type SaveHandler = (route: Route, body: typeof initial) => Promise<void>;
async function editor(page: Page, path: string, save: SaveHandler) {
  let stored = { ...initial };
  await page.route('**/api/v1/admin/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.replace('/api/v1/admin', '');
    if (endpoint === '/auth/login')
      return route.fulfill({ json: { accessToken: 'editor-test-token' } });
    if (endpoint === '/auth/me')
      return route.fulfill({
        json: {
          id: 'owner',
          displayName: 'Owner',
          email: 'owner@example.test',
        },
      });
    if (endpoint === '/categories' || endpoint === '/tags')
      return route.fulfill({ json: [] });
    if (/^\/(posts|pages)(\/[^/]+)?$/.test(endpoint)) {
      if (['POST', 'PUT'].includes(request.method())) {
        const body = { ...stored, ...request.postDataJSON(), id };
        await save(route, body);
        stored = body;
        return;
      }
      return route.fulfill({ json: stored });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto(admin + '/login?next=' + encodeURIComponent(path));
  await login(page);
  await expect(
    page.getByRole('textbox', { name: '标题', exact: true }),
  ).toBeVisible();
}
async function login(page: Page) {
  await page.getByLabel('邮箱', { exact: true }).fill('owner@example.test');
  await page.getByLabel('密码', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: '登录工作空间' }).click();
}
function delayedSave() {
  let release!: () => void;
  let seen!: () => void;
  const requestSeen = new Promise<void>((resolve) => {
    seen = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const submitted: (typeof initial)[] = [];
  const handler: SaveHandler = async (route, body) => {
    submitted.push(body);
    if (submitted.length === 1) {
      seen();
      await released;
    }
    await route.fulfill({ json: body });
  };
  return { handler, requestSeen, release: () => release(), submitted };
}

for (const kind of ['posts', 'pages']) {
  for (const isNew of [false, true]) {
    test(`${kind} ${isNew ? 'creation' : 'update'} preserves edits made during a delayed save`, async ({
      page,
    }) => {
      const delay = delayedSave();
      await editor(page, `/${kind}/${isNew ? 'new' : id}`, delay.handler);
      const title = page.getByRole('textbox', { name: '标题', exact: true });
      const content = page.getByRole('textbox', { name: 'Markdown 内容' });
      await title.fill('请求发送时的标题');
      await page
        .getByLabel('URL 标识', { exact: true })
        .fill('editor-regression');
      await content.fill('请求发送时的正文');
      await page.getByRole('button', { name: '保存草稿', exact: true }).click();
      await delay.requestSeen;
      await title.fill('保存期间继续写的新标题');
      await content.fill('保存期间继续写的新正文');
      delay.release();
      await expect(page).toHaveURL(new RegExp(`/admin/${kind}/${id}$`));
      await expect(title).toHaveValue('保存期间继续写的新标题');
      await expect(content).toHaveValue('保存期间继续写的新正文');
      await expect(
        page.getByText('有未保存的修改 · 浏览器草稿已保留'),
      ).toBeVisible();
      expect(delay.submitted[0].content).toBe('请求发送时的正文');
      const draftKey = `cms-draft-${kind}-${id}`;
      await expect
        .poll(() =>
          page.evaluate((key) => sessionStorage.getItem(key), draftKey),
        )
        .toContain('保存期间继续写的新正文');
      await page.getByRole('button', { name: '保存草稿', exact: true }).click();
      await expect(
        page.getByText('有未保存的修改 · 浏览器草稿已保留'),
      ).toHaveCount(0);
      expect(delay.submitted).toHaveLength(2);
      expect(delay.submitted[1].content).toBe('保存期间继续写的新正文');
      await expect
        .poll(() =>
          page.evaluate((key) => sessionStorage.getItem(key), draftKey),
        )
        .toBeNull();
    });
  }
}

test('canceling navigation preserves the editor, URL, and local draft', async ({
  page,
}) => {
  await editor(page, `/posts/${id}`, async (route, body) =>
    route.fulfill({ json: body }),
  );
  await page
    .getByRole('textbox', { name: 'Markdown 内容' })
    .fill('尚未保存的重要内容');
  await page
    .locator('.sidebar')
    .getByRole('link', { name: '概览', exact: true })
    .click();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}$`));
  await expect(
    page.getByRole('textbox', { name: 'Markdown 内容' }),
  ).toHaveValue('尚未保存的重要内容');
  await expect
    .poll(() =>
      page.evaluate(
        (key) => sessionStorage.getItem(key),
        `cms-draft-posts-${id}`,
      ),
    )
    .toContain('尚未保存的重要内容');
});

test('expired session returns to login and restores unsaved work after login', async ({
  page,
}) => {
  let expire = true;
  await editor(page, `/posts/${id}`, async (route, body) => {
    if (expire) {
      expire = false;
      await route.fulfill({
        status: 401,
        json: { message: 'Session expired' },
      });
    } else await route.fulfill({ json: body });
  });
  await page
    .getByRole('textbox', { name: 'Markdown 内容' })
    .fill('登录失效也不能丢失的正文');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await login(page);
  await page.getByRole('button', { name: '恢复草稿', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Markdown 内容' }),
  ).toHaveValue('登录失效也不能丢失的正文');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('有未保存的修改 · 浏览器草稿已保留')).toHaveCount(
    0,
  );
});

for (const target of ['cover', 'content']) {
  test(`new-record save waits for a pending ${target} upload`, async ({
    page,
  }) => {
    const delay = delayedSave();
    await editor(page, '/posts/new', delay.handler);
    await page
      .getByRole('textbox', { name: '标题', exact: true })
      .fill('带图片的新文章');
    await page
      .getByLabel('URL 标识', { exact: true })
      .fill('upload-regression');
    let releaseUpload!: () => void;
    const uploaded = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    let uploadStarted = false;
    await page.route('**/api/v1/admin/media/upload', async (route) => {
      uploadStarted = true;
      await uploaded;
      await route.fulfill({
        json: { id: 'test-media', url: '/api/v1/media/test.webp' },
      });
    });
    const selector = target === 'cover' ? '.asset-picker' : '.markdown-editor';
    await page
      .locator(`${selector} input[type="file"]`)
      .setInputFiles('apps/blog/public/sakura/images/default/hd.webp');
    await expect.poll(() => uploadStarted).toBe(true);
    const save = page.getByRole('button', { name: '保存草稿', exact: true });
    await expect(save).toBeDisabled();
    await page
      .locator('.sidebar')
      .getByRole('link', { name: '概览', exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/posts\/new$/);
    expect(delay.submitted).toHaveLength(0);
    releaseUpload();
    await expect(save).toBeEnabled();
    await save.click();
    await delay.requestSeen;
    await expect(
      page.getByRole('button', { name: '插入图片', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: '上传图片', exact: true }),
    ).toBeDisabled();
    expect(
      target === 'cover'
        ? delay.submitted[0].coverUrl
        : delay.submitted[0].content,
    ).toContain('/api/v1/media/test.webp');
    delay.release();
    await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}$`));
  });
}
