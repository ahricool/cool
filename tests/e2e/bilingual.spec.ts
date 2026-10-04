import { test, expect } from '@playwright/test';
import { site } from './urls';

test.use({ locale: 'en-US' });
test('reader choice persists without changing URLs across navigation, history and refresh', async ({
  page,
  context,
}) => {
  await page.goto(site);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page
    .locator('.site-footer')
    .getByRole('button', { name: '中文', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'cool_locale')
      ?.value,
  ).toBe('zh');
  await page
    .locator('.header-content')
    .getByRole('link', { name: '归档', exact: true })
    .click();
  await expect(page).toHaveURL(site + '/archives');
  await page.goBack();
  await expect(page).toHaveURL(site + '/');
  await page.goForward();
  await expect(page).toHaveURL(site + '/archives');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.goto(site + '/tags');
  await page
    .locator('.site-footer')
    .getByRole('button', { name: 'English', exact: true })
    .click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(site + '/tags');
});
