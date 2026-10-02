import { admin } from './urls';
import {
  test,
  expect,
  type Dialog,
  type Page,
  type Route,
} from '@playwright/test';

const id = 'a1111111-1111-4111-8111-111111111111';
const initial = {
  id,
  slug: 'editor-regression',
  coverUrl: null,
  translations: [
    {
      locale: 'zh',
      title: '已保存的标题',
      content: '已保存的正文',
      excerpt: '',
      status: 'DRAFT',
      publishedAt: null,
    },
  ],
  categories: [],
  tags: [],
};

type SaveHandler = (
  route: Route,
  body: typeof initial,
) => Promise<void | false>;
async function editor(page: Page, path: string, save: SaveHandler) {
  let stored = structuredClone(initial);
  if (path.endsWith('/new')) stored.translations = [];
  let authenticated = false;
  const owner = {
    id: 'owner',
    displayName: 'Owner',
    email: 'whoreahri@gmail.com',
  };
  const auth = { user: owner, csrfToken: 'editor-test-csrf' };
  await page.route('**/api/v1/admin/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.replace('/api/v1/admin', '');
    if (endpoint === '/auth/status')
      return route.fulfill({
        json: { email: owner.email, initialized: true, setupAvailable: false },
      });
    if (endpoint === '/auth/session')
      return authenticated
        ? route.fulfill({ json: auth })
        : route.fulfill({ status: 401, json: { message: 'Not signed in' } });
    if (endpoint === '/auth/login') {
      authenticated = true;
      return route.fulfill({ json: auth });
    }
    if (endpoint === '/auth/me') return route.fulfill({ json: owner });
    if (endpoint === '/categories' || endpoint === '/tags')
      return route.fulfill({ json: [] });
    if (/^\/(posts|pages)(\/[^/]+)?$/.test(endpoint)) {
      if (['POST', 'PUT'].includes(request.method())) {
        const input = request.postDataJSON();
        const translations = new Map(
          stored.translations.map((translation) => [
            translation.locale,
            translation,
          ]),
        );
        for (const translation of input.translations ?? [])
          translations.set(translation.locale, {
            ...translations.get(translation.locale),
            ...translation,
          });
        const body = {
          ...stored,
          ...input,
          id,
          translations: [...translations.values()],
        };
        const result = await save(route, body);
        if (result === false) authenticated = false;
        stored = body;
        return;
      }
      return route.fulfill({ json: stored });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto(admin + '/login?next=' + encodeURIComponent('/admin' + path));
  await login(page);
  await expect(
    page.getByRole('textbox', { name: '标题', exact: true }),
  ).toBeVisible();
}
async function login(page: Page) {
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue(
    'whoreahri@gmail.com',
  );
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
      await expect(page).toHaveURL(
        (url) => url.pathname === `/admin/${kind}/${id}`,
      );
      await expect(title).toHaveValue('保存期间继续写的新标题');
      await expect(content).toHaveValue('保存期间继续写的新正文');
      await expect(
        page.getByText('有未保存的修改 · 浏览器草稿已保留'),
      ).toBeVisible();
      expect(delay.submitted[0].translations[0].content).toBe(
        '请求发送时的正文',
      );
      const draftKey = `cms-draft-${kind}-${id}-zh`;
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
      expect(delay.submitted[1].translations[0].content).toBe(
        '保存期间继续写的新正文',
      );
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
  await expect(page).toHaveURL((url) => url.pathname === `/admin/posts/${id}`);
  await expect(
    page.getByRole('textbox', { name: 'Markdown 内容' }),
  ).toHaveValue('尚未保存的重要内容');
  await expect
    .poll(() =>
      page.evaluate(
        (key) => sessionStorage.getItem(key),
        `cms-draft-posts-${id}-zh`,
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
      return false;
    } else await route.fulfill({ json: body });
  });
  await page
    .getByRole('textbox', { name: 'Markdown 内容' })
    .fill('登录失效也不能丢失的正文');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/admin/login' &&
      url.searchParams.get('next') === `/admin/posts/${id}`,
  );
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
      .setInputFiles('apps/frontend/public/sakura/images/default/hd.webp');
    await expect.poll(() => uploadStarted).toBe(true);
    const save = page.getByRole('button', { name: '保存草稿', exact: true });
    await expect(save).toBeDisabled();
    await page
      .locator('.sidebar')
      .getByRole('link', { name: '概览', exact: true })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === '/admin/posts/new');
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
        : delay.submitted[0].translations[0].content,
    ).toContain('/api/v1/media/test.webp');
    delay.release();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/admin/posts/${id}`,
    );
  });
}

for (const kind of ['posts', 'pages']) {
  test(`new ${kind} preserve both language drafts through repeated switching, reload, restoration, and creation`, async ({
    page,
  }) => {
    const submitted: {
      method: string;
      body: {
        slug: string;
        coverUrl: string | null;
        translations: typeof initial.translations;
      };
    }[] = [];
    await editor(page, `/${kind}/new`, async (route, body) => {
      submitted.push({
        method: route.request().method(),
        body: route.request().postDataJSON(),
      });
      await route.fulfill({ json: body });
    });
    const slug = `${kind}-bilingual-recovery`;
    let currentSlug = slug;
    const coverUrl = '/sakura/images/default/temp.webp';
    let currentCover = '/sakura/images/default/hd.webp';
    await page.route('**/api/v1/admin/media/upload', (route) =>
      route.fulfill({ json: { id: 'bilingual-cover', url: currentCover } }),
    );
    const drafts = {
      zh: {
        slug,
        title: '反复切换也要保留的中文标题',
        content: '# 中文手记\n\n这一段中文只属于中文草稿。',
      },
      en: {
        slug,
        title: 'An independent English draft',
        content:
          '# English journal\n\nThis exact paragraph belongs only to the English draft.',
      },
    };
    const title = page.getByRole('textbox', { name: '标题', exact: true });
    const content = page.getByRole('textbox', {
      name: 'Markdown 内容',
      exact: true,
    });
    const slugInput = page.getByLabel('URL 标识', { exact: true });
    async function expectFields(locale: 'zh' | 'en') {
      await expect(title).toHaveValue(drafts[locale].title);
      await expect(content).toHaveValue(drafts[locale].content);
      await expect(slugInput).toHaveValue(currentSlug);
      await expect(page.getByAltText('所选图片')).toHaveAttribute(
        'src',
        currentCover,
      );
    }
    async function expectStoredDraft(locale: 'zh' | 'en', record = 'new') {
      await expect
        .poll(() =>
          page.evaluate((key) => {
            const stored = sessionStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
          }, `cms-draft-${kind}-${record}-${locale}`),
        )
        .toMatchObject(drafts[locale]);
    }
    async function switchLanguage(locale: 'zh' | 'en', dirty = true) {
      const tab = page
        .getByRole('group', { name: '内容语言' })
        .getByRole('button', {
          name: locale === 'zh' ? '简体中文' : 'English',
          exact: true,
        });
      await tab.click();
      if (dirty) {
        const dialog = page.getByRole('dialog', { name: '切换内容语言' });
        await dialog.getByRole('button', { name: '切换', exact: true }).click();
        await expect(dialog).toBeHidden();
      }
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(slugInput).toHaveValue(currentSlug);
      await expect(page.getByAltText('所选图片')).toHaveAttribute(
        'src',
        currentCover,
      );
    }
    await slugInput.fill(slug);
    await title.fill(drafts.zh.title);
    await content.fill(drafts.zh.content);
    await page
      .locator('.asset-picker input[type="file"]')
      .setInputFiles('apps/frontend/public/sakura/images/default/hd.webp');
    await expect(page.getByAltText('所选图片')).toHaveAttribute(
      'src',
      currentCover,
    );
    await expectStoredDraft('zh');
    await switchLanguage('en');
    await expectStoredDraft('zh');
    await title.fill(drafts.en.title);
    await content.fill(drafts.en.content);
    await expectStoredDraft('en');
    await switchLanguage('zh');
    await expectFields('zh');
    await expectStoredDraft('zh');
    await expectStoredDraft('en');
    await switchLanguage('en');
    await expectFields('en');
    await expectStoredDraft('zh');
    await expectStoredDraft('en');

    // Accept only the expected native reload warning; the saved browser drafts
    // must survive even though neither translation has reached the server yet.
    const allowReload = async (dialog: Dialog) => {
      expect(dialog.type()).toBe('beforeunload');
      await dialog.accept();
    };
    async function reloadKeepingDrafts() {
      page.on('dialog', allowReload);
      try {
        await page.reload();
      } finally {
        page.off('dialog', allowReload);
      }
    }
    await reloadKeepingDrafts();
    // Switching before using the initial Restore banner must hydrate the
    // target language and common fields without erasing the pending source.
    await expect(
      page.getByRole('button', { name: '恢复草稿', exact: true }),
    ).toBeVisible();
    await switchLanguage('zh');
    await expectFields('zh');
    await expectStoredDraft('zh');
    await expectStoredDraft('en');
    await switchLanguage('en');
    await expectFields('en');
    await expectStoredDraft('zh');
    await expectStoredDraft('en');
    await reloadKeepingDrafts();
    await page.getByRole('button', { name: '恢复草稿', exact: true }).click();
    await expectFields('en');
    await expectStoredDraft('zh');
    await expectStoredDraft('en');
    // The Chinese draft still contains the old common fields. Restoring it
    // after English creates the row must keep these newer shared values.
    currentSlug = `${slug}-updated`;
    await slugInput.fill(currentSlug);
    currentCover = coverUrl;
    await page
      .locator('.asset-picker input[type="file"]')
      .setInputFiles('apps/frontend/public/sakura/images/default/hd.webp');
    await expect(page.getByAltText('所选图片')).toHaveAttribute(
      'src',
      coverUrl,
    );
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/admin/${kind}/${id}`,
    );
    await expectFields('en');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].method).toBe('POST');
    expect(submitted[0].body.slug).toBe(currentSlug);
    expect(submitted[0].body.coverUrl).toBe(coverUrl);
    expect(submitted[0].body.translations).toEqual([
      {
        locale: 'en',
        title: drafts.en.title,
        content: drafts.en.content,
        status: 'DRAFT',
        publishedAt: null,
        ...(kind === 'posts' ? { excerpt: '' } : {}),
      },
    ]);
    // Creating in English must migrate the unsaved Chinese draft to the same ID.
    await expectStoredDraft('zh', id);
    await switchLanguage('zh', false);
    await expectFields('zh');
    await expect(page.getByAltText('所选图片')).toHaveAttribute(
      'src',
      coverUrl,
    );
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(
      page.getByText('有未保存的修改 · 浏览器草稿已保留'),
    ).toHaveCount(0);
    expect(submitted).toHaveLength(2);
    expect(submitted[1].method).toBe('PUT');
    expect(submitted[1].body.slug).toBe(currentSlug);
    expect(submitted[1].body.coverUrl).toBe(coverUrl);
    expect(submitted[1].body.translations).toEqual([
      {
        locale: 'zh',
        title: drafts.zh.title,
        content: drafts.zh.content,
        status: 'DRAFT',
        publishedAt: null,
        ...(kind === 'posts' ? { excerpt: '' } : {}),
      },
    ]);
    await page.reload();
    await expectFields('zh');
    await switchLanguage('en', false);
    await expectFields('en');
    await expect(
      page.getByRole('button', { name: '恢复草稿', exact: true }),
    ).toHaveCount(0);
  });
}
