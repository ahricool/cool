import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { admin, api, site } from './urls';

const email = 'whoreahri@gmail.com';
const password = process.env.E2E_PASSWORD ?? 'cool-e2e-owner-password';
const storageKey = 'cool.locale';
const publishedAt = '2024-01-02T03:04:05.000Z';
test.use({ locale: 'en-US' });

type Locale = 'zh' | 'en';
type Translation = {
  locale: Locale;
  title: string;
  content: string;
  excerpt?: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
};
type AdminContent = {
  id: string;
  slug: string;
  translations: Translation[];
};

async function expectLocale(page: Page, locale: Locale) {
  if (new URL(page.url()).pathname.startsWith('/admin')) {
    await expect(page.getByTestId('language-select')).toHaveValue(locale);
  } else {
    await expect(
      page.locator('.site-footer').getByRole('button', {
        name: locale === 'zh' ? '中文' : 'English',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('html')).toHaveAttribute(
    'lang',
    locale === 'zh' ? 'zh-CN' : 'en',
  );
}
// Keep authentication under the real five-attempts-per-minute limit. The
// existing lifecycle tests cover login; these cases reuse one real session.
let sharedCredentials: Record<string, string> | undefined;
async function credentials(request: APIRequestContext) {
  if (sharedCredentials) return sharedCredentials;
  const response = await request.post(api + '/admin/auth/login', {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  sharedCredentials = {
    Authorization: `Bearer ${(await response.json()).accessToken}`,
  };
  return sharedCredentials;
}
async function createContent(
  request: APIRequestContext,
  kind: 'posts' | 'pages',
  headers: Record<string, string>,
  prefix: string,
) {
  const response = await request.post(`${api}/admin/${kind}`, {
    headers,
    data: {
      slug: `${prefix}-${randomUUID()}`,
      translations: [
        {
          locale: 'zh',
          title: '只发布中文的春日手记',
          content: '# 原文标题\n\n这篇正文保持作者写下的中文。',
          ...(kind === 'posts' ? { excerpt: '作者写下的中文摘要' } : {}),
          status: 'PUBLISHED',
          publishedAt,
        },
        {
          locale: 'en',
          title: 'Private English draft',
          content:
            '# Private English draft\n\nNever show this unpublished text.',
          ...(kind === 'posts' ? { excerpt: 'Private draft excerpt' } : {}),
          status: 'DRAFT',
          publishedAt: null,
        },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as AdminContent;
}

for (const [browserLocale, expected] of [
  ['zh-CN', 'zh'],
  ['en-US', 'en'],
  ['fr-FR', 'en'],
  ['zh-TW', 'en'],
] as const) {
  test.describe(`browser language ${browserLocale}`, () => {
    test.use({ locale: browserLocale });
    test('detects the initial public and admin UI language with English as the unsupported-language default', async ({
      page,
    }) => {
      await page.goto(site);
      await expect(page).toHaveURL(`${site}/${expected}`);
      await expectLocale(page, expected);
      await page.goto(admin + '/login');
      await expectLocale(page, expected);
      await expect(
        page.getByLabel(expected === 'zh' ? '密码' : 'Password', {
          exact: true,
        }),
      ).toBeVisible();
    });
  });
}

for (const [browserLocale, saved] of [
  ['en-US', 'zh'],
  ['zh-CN', 'en'],
] as const) {
  test.describe(`saved ${saved} with browser ${browserLocale}`, () => {
    test.use({ locale: browserLocale });
    test('localStorage overrides detection while explicit public URLs choose their own language', async ({
      page,
    }) => {
      await page.addInitScript(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: storageKey, value: saved },
      );
      await page.goto(site);
      await expect(page).toHaveURL(`${site}/${saved}`);
      await expectLocale(page, saved);
      await page.goto(admin + '/login');
      await expectLocale(page, saved);
      const explicit = saved === 'zh' ? 'en' : 'zh';
      await page.goto(`${site}/${explicit}`);
      await expectLocale(page, explicit);
      await expect(page).toHaveURL(`${site}/${explicit}`);
    });
  });
}

test('footer switching persists across reloads and shares the UI choice between public and admin screens', async ({
  page,
}, info) => {
  await page.goto(`${site}/en/search?q=spring#results`);
  await expectLocale(page, 'en');
  const select = page.getByTestId('language-select');
  await page
    .locator('.site-footer')
    .getByRole('button', { name: '中文', exact: true })
    .click();
  await expect(page).toHaveURL(`${site}/zh/search?q=spring#results`);
  await expectLocale(page, 'zh');
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe('zh');
  await page.reload();
  await expectLocale(page, 'zh');
  await page.goto(site);
  await expect(page).toHaveURL(`${site}/zh`);
  await page.goto(admin + '/login');
  await expectLocale(page, 'zh');
  await expect(page.getByLabel('密码', { exact: true })).toBeVisible();
  await select.selectOption('en');
  await expect(page).toHaveURL(admin + '/login');
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expectLocale(page, 'en');
  await page.reload();
  await expectLocale(page, 'en');
  await page.screenshot({
    path: info.outputPath('bilingual-admin-login-english.png'),
    fullPage: true,
    animations: 'disabled',
  });
  // Follow the actual Nuxt link so this also covers shared state without a reload.
  await page.getByRole('link', { name: '← Back to the blog' }).click();
  await expect(page).toHaveURL(`${site}/en`);
  await expectLocale(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'blog');
  await page.screenshot({
    path: info.outputPath('bilingual-public-english.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

for (const kind of ['posts', 'pages'] as const) {
  test(`${kind} serve the actual published Chinese fallback on /en without exposing the English draft or a warning`, async ({
    page,
    request,
  }, info) => {
    const headers = await credentials(request);
    const item = await createContent(request, kind, headers, 'fallback');
    try {
      const response = await request.get(
        `${api}/public/en/${kind}/${item.slug}`,
      );
      expect(response.ok()).toBeTruthy();
      expect(await response.json()).toMatchObject({
        id: item.id,
        title: item.translations.find(
          (translation) => translation.locale === 'zh',
        )!.title,
        contentLocale: 'zh',
      });
      await page.goto(`${site}/en/${kind}/${item.slug}`);
      await expectLocale(page, 'en');
      await expect(page.locator('.pattern-title h1')).toHaveText(
        '只发布中文的春日手记',
      );
      await expect(page.locator('.pattern-title h1')).toHaveAttribute(
        'lang',
        'zh-CN',
      );
      await expect(page.locator('.entry-content')).toHaveAttribute(
        'lang',
        'zh-CN',
      );
      await expect(page.locator('.entry-content')).toContainText(
        '这篇正文保持作者写下的中文。',
      );
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(
        'Private English draft',
      );
      await expect(page.locator('body')).not.toContainText(
        'Never show this unpublished text.',
      );
      await expect(
        page.getByText(
          /translation unavailable|translation missing|showing (the )?(original|chinese)|fallback|暂无翻译|尚未翻译|回退|缺少翻译/i,
        ),
      ).toHaveCount(0);
      if (kind === 'posts')
        await expect(
          page.getByRole('button', { name: 'Share · Copy link' }),
        ).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`bilingual-${kind}-published-fallback.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page
        .locator('.site-footer')
        .getByRole('button', { name: '中文', exact: true })
        .click();
      await expect(page).toHaveURL(`${site}/zh/${kind}/${item.slug}`);
      await expectLocale(page, 'zh');
      await expect(page.locator('.entry-content')).toContainText(
        '这篇正文保持作者写下的中文。',
      );
    } finally {
      expect(
        (
          await request.delete(`${api}/admin/${kind}/${item.id}`, { headers })
        ).ok(),
      ).toBeTruthy();
    }
  });

  test(`${kind} keep authored language, independent publication, and saved translations separate from UI language`, async ({
    page,
    context,
    request,
  }) => {
    const headers = await credentials(request);
    const item = await createContent(request, kind, headers, 'authored');
    try {
      await context.addCookies([
        {
          name: 'cool_session',
          value: headers.Authorization.replace(/^Bearer /, ''),
          url: site,
          httpOnly: true,
          secure:
            process.env.E2E_COOKIE_SECURE === '1' ||
            new URL(site).protocol === 'https:',
          sameSite: 'Lax',
        },
      ]);
      await page.goto(`${admin}/${kind}/${item.id}`);
      await expect(page).toHaveURL(`${admin}/${kind}/${item.id}`);
      const englishTab = page
        .getByRole('group', { name: 'Content language' })
        .getByRole('button', { name: 'English', exact: true });
      await expect(englishTab).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('textbox', { name: 'Title', exact: true }),
      ).toHaveValue('Private English draft');
      await page
        .getByRole('group', { name: 'Content language' })
        .getByRole('button', { name: '简体中文', exact: true })
        .click();
      await expect(
        page.getByRole('textbox', { name: 'Title', exact: true }),
      ).toHaveValue('只发布中文的春日手记');
      await page
        .getByRole('textbox', { name: 'Markdown content', exact: true })
        .fill('# 中文新正文\n\n英文界面不改变中文创作。');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByText('Unsaved changes · Browser draft kept'),
      ).toHaveCount(0);
      await englishTab.click();
      await expect(
        page.getByRole('textbox', { name: 'Title', exact: true }),
      ).toHaveValue('Private English draft');
      await page.getByTestId('language-select').selectOption('zh');
      await expectLocale(page, 'zh');
      await expect(
        page
          .getByRole('group', { name: '内容语言' })
          .getByRole('button', { name: 'English', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('textbox', { name: '标题', exact: true }),
      ).toHaveValue('Private English draft');
      await page
        .getByRole('textbox', { name: 'Markdown 内容', exact: true })
        .fill(
          '# Private edited English\n\nWritten in English while the interface is Chinese.',
        );
      await page.getByRole('button', { name: '保存草稿', exact: true }).click();
      await expect(
        page.getByText('有未保存的修改 · 浏览器草稿已保留'),
      ).toHaveCount(0);
      const response = await request.get(`${api}/admin/${kind}/${item.id}`, {
        headers,
      });
      expect(response.ok()).toBeTruthy();
      const saved = (await response.json()) as AdminContent;
      expect(saved.id).toBe(item.id);
      expect(saved.slug).toBe(item.slug);
      expect(saved.translations).toHaveLength(2);
      expect(
        saved.translations.find((translation) => translation.locale === 'zh'),
      ).toMatchObject({
        title: '只发布中文的春日手记',
        content: '# 中文新正文\n\n英文界面不改变中文创作。',
        status: 'PUBLISHED',
        publishedAt,
      });
      expect(
        saved.translations.find((translation) => translation.locale === 'en'),
      ).toMatchObject({
        title: 'Private English draft',
        content:
          '# Private edited English\n\nWritten in English while the interface is Chinese.',
        status: 'DRAFT',
      });
      await page.reload();
      await expectLocale(page, 'zh');
      await expect(
        page
          .getByRole('group', { name: '内容语言' })
          .getByRole('button', { name: 'English', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('textbox', { name: 'Markdown 内容', exact: true }),
      ).toHaveValue(
        '# Private edited English\n\nWritten in English while the interface is Chinese.',
      );
      const publicResponse = await request.get(
        `${api}/public/en/${kind}/${item.slug}`,
      );
      expect(publicResponse.ok()).toBeTruthy();
      expect(await publicResponse.json()).toMatchObject({
        id: item.id,
        contentLocale: 'zh',
        content: '# 中文新正文\n\n英文界面不改变中文创作。',
      });
    } finally {
      expect(
        (
          await request.delete(`${api}/admin/${kind}/${item.id}`, { headers })
        ).ok(),
      ).toBeTruthy();
    }
  });
}
