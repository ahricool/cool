import { test, expect } from '@playwright/test';
import { admin } from './urls';

test.use({ locale: 'en-US' });

test('a pending moment image upload locks language, save, and dismissal and updates only its authored language', async ({
  page,
}) => {
  const owner = {
    id: 'moment-owner',
    displayName: 'Owner',
    email: 'whoreahri@gmail.com',
    avatarUrl: null,
  };
  type MomentSave = {
    translations: {
      locale: 'zh' | 'en';
      content: string;
      status: string;
      publishedAt: string | null;
    }[];
  };
  let saved: MomentSave | undefined;
  let uploadStarted = false;
  let releaseUpload!: () => void;
  const uploaded = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  const imageUrl = '/api/v1/media/delayed-moment.webp';
  await page.route('**/api/v1/admin/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.replace(
      '/api/v1/admin',
      '',
    );
    if (endpoint === '/auth/session')
      return route.fulfill({
        json: { user: owner, csrfToken: 'moment-test-csrf' },
      });
    if (endpoint === '/auth/me') return route.fulfill({ json: owner });
    if (endpoint === '/media/upload') {
      uploadStarted = true;
      await uploaded;
      return route.fulfill({ json: { id: 'moment-image', url: imageUrl } });
    }
    if (endpoint === '/moments') {
      if (route.request().method() === 'POST') {
        saved = route.request().postDataJSON() as MomentSave;
        return route.fulfill({ json: { id: 'saved-moment', ...saved } });
      }
      return route.fulfill({
        json: { items: [], total: 0, page: 1, pageSize: 15 },
      });
    }
    return route.fulfill({
      status: 404,
      json: { message: 'Unexpected fixture endpoint' },
    });
  });
  await page.goto(admin + '/moments');
  await page
    .getByRole('button', { name: '＋ Create Moments', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Create Moments' });
  const languages = dialog.getByRole('group', { name: 'Content language' });
  const english = languages.getByRole('button', {
    name: 'English',
    exact: true,
  });
  const chinese = languages.getByRole('button', {
    name: '简体中文',
    exact: true,
  });
  const content = dialog.getByRole('textbox', {
    name: 'Markdown content',
    exact: true,
  });
  const englishText = 'The independent English moment must stay unchanged.';
  const chineseText = '这一张图片只属于中文瞬间。';
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await content.fill(englishText);
  await chinese.click();
  await expect(content).toHaveAttribute('lang', 'zh-CN');
  await content.fill(chineseText);
  const close = dialog.locator('.el-dialog__headerbtn');
  const save = dialog.getByRole('button', { name: 'Save', exact: true });
  await expect(close).toBeVisible();
  await dialog
    .locator('.markdown-editor input[type="file"]')
    .setInputFiles('apps/frontend/public/sakura/images/default/hd.webp');
  await expect.poll(() => uploadStarted).toBe(true);
  try {
    await expect(english).toBeDisabled();
    await expect(chinese).toBeDisabled();
    await expect(save).toBeDisabled();
    await expect(close).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(content).toHaveValue(chineseText);
    expect(saved).toBeUndefined();
  } finally {
    releaseUpload();
  }
  const chineseWithImage = `${chineseText}\n![图片描述](${imageUrl})\n`;
  await expect(content).toHaveValue(chineseWithImage);
  await expect(english).toBeEnabled();
  await expect(save).toBeEnabled();
  await expect(close).toBeVisible();
  await english.click();
  await expect(content).toHaveAttribute('lang', 'en');
  await expect(content).toHaveValue(englishText);
  await chinese.click();
  await expect(content).toHaveValue(chineseWithImage);
  await save.click();
  await expect(dialog).toBeHidden();
  expect(saved).toEqual({
    translations: [
      {
        locale: 'zh',
        content: chineseWithImage,
        status: 'DRAFT',
        publishedAt: null,
      },
      {
        locale: 'en',
        content: englishText,
        status: 'DRAFT',
        publishedAt: null,
      },
    ],
  });
});
