import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acceptSession,
  api,
  clearSession,
  restoreSession,
  safeAdminNext,
  session,
} from './api';

const user = {
  id: 'owner',
  email: 'whoreahri@gmail.com',
  displayName: 'Sakura',
  avatarUrl: null,
};

test('session restoration keeps only profile and CSRF state in memory', async (t) => {
  clearSession();
  let requests = 0;
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      requests++;
      assert.equal(url, '/api/v1/admin/auth/session');
      assert.equal(options.credentials, 'include');
      return Response.json({
        user,
        csrfToken: 'test-csrf',
        accessToken: 'never-store-this',
      });
    },
  );
  assert.deepEqual(await Promise.all([restoreSession(), restoreSession()]), [
    true,
    true,
  ]);
  assert.equal(requests, 1);
  assert.deepEqual(session.owner, user);
  assert.equal(session.csrfToken, 'test-csrf');
  assert.deepEqual(Object.keys(session).sort(), ['csrfToken', 'owner']);
});

test('mutations include cookies and CSRF but never a bearer credential', async (t) => {
  acceptSession({ user, csrfToken: 'csrf-for-current-session' });
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, options: RequestInit) => {
      const headers = new Headers(options.headers);
      assert.equal(options.credentials, 'include');
      assert.equal(headers.get('X-CSRF-Token'), 'csrf-for-current-session');
      assert.equal(headers.get('Authorization'), null);
      assert.equal(headers.get('Content-Type'), 'application/json');
      return Response.json({ ok: true });
    },
  );
  assert.deepEqual(
    await api('/admin/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Story' }),
    }),
    { ok: true },
  );
});

test('multipart uploads preserve browser content boundaries and send CSRF', async (t) => {
  acceptSession({ user, csrfToken: 'upload-csrf' });
  const body = new FormData();
  body.append('file', new Blob(['image']), 'photo.webp');
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, options: RequestInit) => {
      const headers = new Headers(options.headers);
      assert.equal(headers.get('Content-Type'), null);
      assert.equal(headers.get('X-CSRF-Token'), 'upload-csrf');
      assert.equal(options.body, body);
      return Response.json({ id: 'media' });
    },
  );
  await api('/admin/media/upload', { method: 'POST', body });
});

test('an expired or revoked session clears profile and CSRF', async (t) => {
  acceptSession({ user, csrfToken: 'old-csrf' });
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ message: '会话已失效' }, { status: 401 }),
  );
  await assert.rejects(api('/admin/posts'), /会话已失效/);
  assert.equal(session.owner, null);
  assert.equal(session.csrfToken, '');
  assert.equal(await restoreSession(), false);
});

test('first setup and login do not send a stale CSRF credential', async (t) => {
  clearSession();
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, options: RequestInit) => {
      assert.equal(new Headers(options.headers).get('X-CSRF-Token'), null);
      return Response.json({ user, csrfToken: 'new-csrf' });
    },
  );
  await api('/admin/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ password: 'fixture-password-only' }),
  });
});

test('post-login destinations stay inside the same admin surface', () => {
  assert.equal(
    safeAdminNext('/admin/posts/new?from=login'),
    '/admin/posts/new?from=login',
  );
  assert.equal(safeAdminNext('/admin'), '/admin');
  for (const value of [
    undefined,
    ['x'],
    'https://example.com',
    '//example.com',
    '/posts/story',
    '/admin/login',
    '/admin\\evil',
    '/administrator',
  ]) {
    assert.equal(safeAdminNext(value), '/admin');
  }
});

const csrfRejection = () =>
  Response.json(
    { message: 'A valid X-CSRF-Token is required' },
    { status: 403 },
  );

test('stale CSRF refreshes the cookie session and retries the same JSON mutation once', async (t) => {
  acceptSession({ user, csrfToken: 'tab-a-old' });
  const body = JSON.stringify({
    title: 'Unsaved story',
    content: 'Keep this draft',
  });
  const calls: string[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      calls.push(url);
      assert.equal(options.credentials, 'include');
      if (url.endsWith('/auth/session'))
        return Response.json({ user, csrfToken: 'tab-b-current' });
      assert.equal(options.method, 'PUT');
      assert.equal(options.body, body);
      const headers = new Headers(options.headers);
      assert.equal(headers.get('Content-Type'), 'application/json');
      assert.equal(headers.get('X-Draft-Revision'), '3');
      assert.equal(
        headers.get('X-CSRF-Token'),
        calls.length === 1 ? 'tab-a-old' : 'tab-b-current',
      );
      return calls.length === 1
        ? csrfRejection()
        : Response.json({ id: 'saved' });
    },
  );
  assert.deepEqual(
    await api('/admin/posts/story', {
      method: 'PUT',
      body,
      headers: { 'X-Draft-Revision': '3' },
    }),
    { id: 'saved' },
  );
  assert.deepEqual(calls, [
    '/api/v1/admin/posts/story',
    '/api/v1/admin/auth/session',
    '/api/v1/admin/posts/story',
  ]);
  assert.equal(session.csrfToken, 'tab-b-current');
});

test('stale CSRF retries multipart uploads without replacing the body or content boundary', async (t) => {
  acceptSession({ user, csrfToken: 'upload-old' });
  const body = new FormData();
  body.append('file', new Blob(['image-bytes']), 'story.webp');
  let uploads = 0;
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      if (url.endsWith('/auth/session'))
        return Response.json({ user, csrfToken: 'upload-current' });
      uploads++;
      assert.equal(options.body, body);
      assert.equal(new Headers(options.headers).get('Content-Type'), null);
      assert.equal(
        new Headers(options.headers).get('X-CSRF-Token'),
        uploads === 1 ? 'upload-old' : 'upload-current',
      );
      return uploads === 1 ? csrfRejection() : Response.json({ id: 'photo' });
    },
  );
  assert.deepEqual(await api('/admin/media/upload', { method: 'POST', body }), {
    id: 'photo',
  });
  assert.equal(uploads, 2);
});

test('failed session refresh clears auth state without replaying the mutation', async (t) => {
  acceptSession({ user, csrfToken: 'revoked-csrf' });
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    return url.endsWith('/auth/session')
      ? Response.json({ message: 'Unauthorized' }, { status: 401 })
      : csrfRejection();
  });
  await assert.rejects(
    api('/admin/posts/story', { method: 'PUT', body: '{}' }),
    /X-CSRF-Token/,
  );
  assert.deepEqual(calls, [
    '/api/v1/admin/posts/story',
    '/api/v1/admin/auth/session',
  ]);
  assert.equal(session.owner, null);
  assert.equal(session.csrfToken, '');
});

test('a second CSRF rejection stops without another refresh or mutation retry', async (t) => {
  acceptSession({ user, csrfToken: 'old-csrf' });
  let refreshes = 0;
  let mutations = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('/auth/session')) {
      refreshes++;
      return Response.json({ user, csrfToken: 'fresh-csrf' });
    }
    mutations++;
    return csrfRejection();
  });
  await assert.rejects(
    api('/admin/posts/story', { method: 'PUT', body: '{}' }),
    /X-CSRF-Token/,
  );
  assert.equal(refreshes, 1);
  assert.equal(mutations, 2);
});

test('unrelated forbidden responses do not refresh or retry', async (t) => {
  acceptSession({ user, csrfToken: 'valid-csrf' });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return Response.json(
      { message: 'Untrusted request origin' },
      { status: 403 },
    );
  });
  await assert.rejects(
    api('/admin/posts', { method: 'POST', body: '{}' }),
    /Untrusted request origin/,
  );
  assert.equal(requests, 1);
});
