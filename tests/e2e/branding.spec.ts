import { test, expect } from '@playwright/test';
import { admin, site } from './urls';

for (const locale of ['zh', 'en'] as const) {
  test(`梦桜 branding is consistent in the ${locale} public, login and error surfaces`, async ({
    page,
  }) => {
    await page.goto(`${site}/${locale}`);
    await expect(page.locator('.site-footer')).toContainText(
      locale === 'zh' ? '由 梦桜 驱动' : 'Powered by 梦桜',
    );
    await page
      .locator('.site-footer')
      .getByRole('button', {
        name: locale === 'zh' ? '中文' : 'English',
        exact: true,
      })
      .click();
    await page.goto(admin + '/login');
    await expect(page).toHaveTitle(/ · 梦桜$/);
    await expect(page.locator('.login-footnote')).toHaveText(
      locale === 'zh' ? '梦桜 · 创作工作台' : '梦桜 · Creative workspace',
    );
    await page.goto(`${site}/${locale}/missing-cool-page`);
    await expect(page.locator('.error-page')).toBeVisible();
    await expect(page).toHaveTitle(/ · 梦桜$/);
  });
}
