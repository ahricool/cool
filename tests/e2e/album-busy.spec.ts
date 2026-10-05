import { test, expect } from '@playwright/test';
import { admin } from './urls';
test('delayed album cover upload and save keep the form guarded and retain the uploaded cover', async ({
  page,
}) => {
  const id = '71000000-0000-4000-8000-000000000001';
  const cover = '/api/v1/media/72000000-0000-4000-8000-000000000001.webp';
  let releaseUpload!: () => void,
    releaseSave!: () => void,
    startedUpload!: () => void,
    startedSave!: () => void;
  const uploadWait = new Promise<void>((r) => (releaseUpload = r)),
    saveWait = new Promise<void>((r) => (releaseSave = r));
  const uploadStarted = new Promise<void>((r) => (startedUpload = r)),
    saveStarted = new Promise<void>((r) => (startedSave = r));
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: {
          user: {
            id: 'owner',
            email: 'review@example.test',
            displayName: 'Preview',
            avatarUrl: null,
          },
          csrfToken: 'synthetic-test',
        },
      });
    if (path.endsWith('/media/upload')) {
      startedUpload();
      await uploadWait;
      return route.fulfill({
        status: 201,
        json: {
          id: '72000000-0000-4000-8000-000000000001',
          url: cover,
          mimeType: 'image/webp',
          originalName: 'cover.png',
        },
      });
    }
    if (path.endsWith('/albums') && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON();
      startedSave();
      await saveWait;
      return route.fulfill({
        status: 201,
        json: { id, ...submitted, items: [] },
      });
    }
    if (path.endsWith('/albums'))
      return route.fulfill({
        json: [
          { id, name: '默认相册', isDefault: true, items: [], coverUrl: null },
        ],
      });
    return route.continue();
  });
  await page.goto(admin('/photos'));
  await page.getByRole('button', { name: '新建相册', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新建相册', exact: true });
  await dialog.getByLabel('名称', { exact: true }).fill('延迟上传相册');
  await dialog
    .locator('input[type=file]')
    .setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ6kAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  await uploadStarted;
  for (const label of ['名称', 'English', '说明', '英文说明'])
    await expect(dialog.getByLabel(label, { exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: '保存', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: '取消', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  releaseUpload();
  await expect(
    dialog.getByRole('button', { name: '保存', exact: true }),
  ).toBeEnabled();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await saveStarted;
  expect(submitted?.coverUrl).toBe(cover);
  await expect(dialog.getByLabel('English', { exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  releaseSave();
  await expect(dialog).toBeHidden();
});
