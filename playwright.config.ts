import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  // Nuxt dev may perform its initial compile/HMR reload after the HTTP server
  // is ready. Wait for the asserted hydrated UI rather than assuming 5 seconds.
  expect: { timeout: 15000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    headless: true,
    // Keep the original Chinese regressions deterministic; bilingual tests override this.
    locale: 'zh-CN',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_EXTERNAL
    ? undefined
    : [
        {
          command: 'node apps/backend/dist/main.js',
          url: 'http://127.0.0.1:3000/api/v1/health',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
          // Nuxt dev may perform its initial compile/HMR reload after the HTTP server
          // is ready. Wait for the asserted hydrated UI rather than assuming 5 seconds.
          expect: { timeout: 15000 },
        },
        {
          command: 'npm run dev:frontend',
          url: 'http://localhost:3001',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ],
});
