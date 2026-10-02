import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    headless: true,
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
        },
        {
          command: 'npm run dev:blog',
          url: 'http://localhost:3001',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
        {
          command: 'npm run dev:admin',
          url: 'http://127.0.0.1:5173/admin/',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      ],
});
