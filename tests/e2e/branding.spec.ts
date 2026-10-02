import { test, expect } from '@playwright/test';
import { admin, site } from './urls';

for (const locale of ['zh', 'en'] as const) {
  test(`Cool branding is consistent in the ${locale} public, login and error surfaces`, async ({
    page,
  }) => {
    await page.goto(`${site}/${locale}`);
    await expect(page.locator('.site-footer')).toContainText(
      locale === 'zh' ? '由 Cool 驱动' : 'Powered by Cool',
    );
    await page.getByTestId('language-select').selectOption(locale);
    await page.goto(admin + '/login');
    await expect(page).toHaveTitle(/ · Cool$/);
    await expect(page.locator('.login-footnote')).toHaveText(
      locale === 'zh' ? 'Cool · 创作工作台' : 'Cool · Creative workspace',
    );
    await page.goto(`${site}/${locale}/missing-cool-page`);
    await expect(page.locator('.error-page')).toBeVisible();
    await expect(page).toHaveTitle(/ · Cool$/);
  });
}
