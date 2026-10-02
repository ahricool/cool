import { request } from '@playwright/test';

export default async function setup() {
  const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api/v1';
  if (!['127.0.0.1', 'localhost'].includes(new URL(api).hostname))
    throw new Error(
      'E2E setup is restricted to disposable loopback deployments',
    );
  const context = await request.newContext();
  try {
    const response = await context.get(api + '/admin/auth/status');
    if (!response.ok())
      throw new Error('Cannot inspect disposable E2E auth state');
    const status = await response.json();
    if (!status.initialized) {
      const initialized = await context.post(api + '/admin/auth/setup', {
        data: {
          password: process.env.E2E_PASSWORD ?? 'cms-e2e-owner-password',
        },
      });
      if (!initialized.ok())
        throw new Error('Cannot initialize disposable E2E owner');
    }
  } finally {
    await context.dispose();
  }
}
