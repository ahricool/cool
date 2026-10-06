import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/theme',
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:43871',
    headless: true,
    locale: 'zh-CN',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/theme/serve.mjs',
    url: 'http://127.0.0.1:43871',
    reuseExistingServer: false,
  },
});
