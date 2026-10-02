#!/usr/bin/env node
// HTTP acceptance checks against the disposable production Compose stack only.
// Uses Node built-ins so the runner does not need a second npm install.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';

const [mode, base, statePath, reportPath] = process.argv.slice(2);
assert(['populate', 'verify'].includes(mode), 'Expected populate or verify');
const origin = new URL(base);
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1', 'Smoke checks must use loopback');
assert(origin.port, 'An isolated Compose port is required');
const report = { mode, origin: origin.origin, checks: [], passed: false };
const email = 'whoreahri@gmail.com';
const initialPassword = 'compose-smoke-initial-password-only';
const savedPassword = 'compose-smoke-restored-password-only';
let token;

async function request(
  path,
  { method = 'GET', body, status = 200, auth = false } = {},
) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin.origin, 'Do not contact external services');
  const headers = {};
  if (auth) {
    assert(token, 'Authentication required');
    headers.Authorization = `Bearer ${token}`;
  }
  if (body && !(body instanceof globalThis.FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await globalThis.fetch(url, {
    method,
    body,
    headers,
    redirect: 'manual',
    signal: globalThis.AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status, `${method} ${url.pathname} status`);
  return response;
}
async function json(path, options) {
  const response = await request(`/api/v1${path}`, options);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  return response.json();
}
function passed(check, detail = {}) {
  report.checks.push({ check, ...detail });
  console.log(`PASS ${check}`);
}
async function login(password) {
  const result = await json('/admin/auth/login', {
    method: 'POST',
    status: 201,
    body: { email, password },
  });
  assert.equal(result.tokenType, 'Bearer');
  assert.equal(typeof result.accessToken, 'string');
  token = result.accessToken;
  return json('/admin/auth/me', { auth: true });
}

// Create a small, valid PNG without relying on a host image library.
function png() {
  function chunk(type, data) {
    const bytes = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    const trailer = Buffer.alloc(4);
    trailer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([header, bytes, trailer]);
  }
  const dimensions = Buffer.alloc(13);
  dimensions.writeUInt32BE(2, 0);
  dimensions.writeUInt32BE(2, 4);
  dimensions[8] = 8;
  dimensions[9] = 2; // 8-bit RGB, two scanlines with filter type 0.
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', dimensions),
    chunk(
      'IDAT',
      deflateSync(
        Buffer.from([
          0, 240, 90, 140, 50, 150, 210, 0, 30, 180, 100, 250, 220, 60,
        ]),
      ),
    ),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function waitForIngress() {
  // Compose waits for the three apps, but the production proxy has no healthcheck.
  // Retry only readiness, never a CRUD/publication/restore acceptance assertion.
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await globalThis.fetch(
        new URL('/api/v1/health', origin),
        {
          redirect: 'manual',
          signal: globalThis.AbortSignal.timeout(2000),
        },
      );
      await response.body?.cancel();
      if (response.status === 200) return;
    } catch {
      // The proxy listener or backend connection may still be starting.
    }
    await delay(500);
  }
  assert.fail(
    'Production ingress health did not become ready within 30 seconds',
  );
}

async function checkRoutes() {
  assert.deepEqual(await json('/health'), { status: 'ok' });
  await json('/admin/posts', { status: 401 });
  passed('Database-backed health and unauthenticated admin rejection');
  const redirect = await request('/admin', { status: 301 });
  assert.equal(redirect.headers.get('location'), '/admin/');
  assert.equal(
    new URL(redirect.headers.get('location'), origin).href,
    new URL('/admin/', origin).href,
    'Admin redirect must preserve the public scheme and mapped port',
  );
  const assets = new Map();
  for (const path of [
    '/',
    ...['zh', 'en'].flatMap((locale) =>
      [
        '',
        '/archives',
        '/categories',
        '/tags',
        '/moments',
        '/photos',
        '/links',
        '/search',
      ].map((path) => `/${locale}${path}`),
    ),
    '/admin/',
    '/admin/login',
    '/admin/posts',
  ]) {
    const response = await request(path);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    const html = await response.text();
    assert.match(html, /id=["']__nuxt["']/);
    let scripts = 0;
    for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
      const tag = match[0];
      const attribute = /\b(?:src|href)=["']([^"']+)["']/i.exec(tag);
      if (!attribute) continue;
      const url = new URL(attribute[1].replaceAll('&amp;', '&'), origin);
      if (!/\.(?:js|css)$/.test(url.pathname)) continue;
      assert.equal(
        url.origin,
        origin.origin,
        'Bundled assets must be same-origin',
      );
      const kind = url.pathname.endsWith('.js') ? 'js' : 'css';
      assets.set(url.pathname + url.search, kind);
      if (match[1].toLowerCase() === 'script') scripts++;
    }
    assert(scripts > 0, `${path} must reference a real JS bundle`);
  }
  assert(
    assets.size > 2 && assets.size <= 100,
    'Bounded nonempty asset manifest',
  );
  assert([...assets].some(([path]) => path.startsWith('/_nuxt/')));
  assert([...assets.values()].includes('css'));
  const cssResources = new Set();
  for (const [path, kind] of assets) {
    const response = await request(path);
    assert.match(
      response.headers.get('content-type') ?? '',
      kind === 'js' ? /javascript/ : /text\/css/,
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length > 20, `${path} must contain actual bundle bytes`);
    assert(
      !/^\s*<!doctype html/i.test(bytes.toString('utf8', 0, 100)),
      `${path} must not fall back to HTML`,
    );
    if (kind === 'css') {
      for (const match of bytes
        .toString('utf8')
        .matchAll(
          /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^'"\s)]+))\s*\)/gi,
        )) {
        // Consume a quoted data URI as one token. An inline SVG may itself
        // contain url('...') text that is not a stylesheet resource request.
        const resource = match[1] ?? match[2] ?? match[3];
        if (
          resource.toLowerCase().startsWith('data:') ||
          resource.startsWith('#')
        )
          continue;
        const url = new URL(resource, new URL(path, origin));
        assert.equal(
          url.origin,
          origin.origin,
          'CSS resources must be same-origin',
        );
        cssResources.add(url.pathname + url.search);
      }
    }
  }
  // Check production CSS references too: a valid CSS response alone can hide
  // broken copied artwork or font paths in the Admin image.
  assert([...cssResources].some((path) => /\.woff2?(?:\?|$)/.test(path)));
  assert(
    [...cssResources].some((path) => /\.(?:webp|png|svg)(?:\?|$)/.test(path)),
  );
  assert(cssResources.size <= 100, 'Bounded CSS resource manifest');
  for (const path of cssResources) {
    const response = await request(path);
    assert(
      !/text\/html/.test(response.headers.get('content-type') ?? ''),
      `${path} must not fall back to HTML`,
    );
    assert(
      (await response.arrayBuffer()).byteLength > 20,
      `${path} must contain asset bytes`,
    );
  }
  const themeImage = await request('/sakura/images/default/hd.webp');
  assert.match(themeImage.headers.get('content-type') ?? '', /image\/webp/);
  assert((await themeImage.arrayBuffer()).byteLength > 100);
  passed(
    'Blog and Admin routes plus actual same-origin JS, CSS and image assets',
    { assets: assets.size, cssResources: cssResources.size },
  );
}

async function populate() {
  const status = await json('/admin/auth/status');
  assert.equal(status.email, email);
  assert.equal(status.initialized, false);
  const setup = await json('/admin/auth/setup', {
    method: 'POST',
    status: 201,
    body: { password: initialPassword },
  });
  assert.equal(typeof setup.accessToken, 'string');
  const owner = await login(initialPassword);
  assert.equal(owner.email, email);
  const renamed = await json('/admin/auth/profile', {
    method: 'PUT',
    auth: true,
    body: { displayName: 'Persisted Compose Owner' },
  });
  assert.equal(renamed.id, owner.id);
  await json('/admin/auth/password', {
    method: 'PUT',
    auth: true,
    body: { currentPassword: initialPassword, newPassword: savedPassword },
  });
  await json('/admin/auth/me', { auth: true, status: 401 });
  const savedOwner = await login(savedPassword);
  assert.equal(savedOwner.displayName, 'Persisted Compose Owner');
  passed(
    'First password setup, fixed owner login, profile update and changed-password login',
  );

  const form = new globalThis.FormData();
  form.append(
    'file',
    new globalThis.Blob([png()], { type: 'image/png' }),
    'compose-smoke.png',
  );
  const media = await json('/admin/media/upload', {
    method: 'POST',
    status: 201,
    auth: true,
    body: form,
  });
  assert.equal(media.mimeType, 'image/webp');
  assert.equal(media.width, 2);
  assert.equal(media.height, 2);
  const mediaResponse = await request(media.url);
  assert.match(mediaResponse.headers.get('content-type') ?? '', /image\/webp/);
  const bytes = Buffer.from(await mediaResponse.arrayBuffer());
  assert.equal(bytes.length, media.size);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  passed('Generated image upload, WebP conversion and public media download');

  const draft = await json('/admin/posts', {
    method: 'POST',
    status: 201,
    auth: true,
    body: {
      slug: 'compose-backup-restore',
      translations: [
        {
          locale: 'zh',
          title: 'Compose draft',
          content: 'Private draft',
          status: 'DRAFT',
        },
      ],
    },
  });
  assert.equal(draft.authorId, owner.id);
  const initial = await json(`/admin/posts/${draft.id}`, { auth: true });
  assert.equal(initial.translations.length, 1);
  assert.equal(initial.translations[0].locale, 'zh');
  assert.equal(initial.translations[0].status, 'DRAFT');
  for (const locale of ['zh', 'en'])
    await json(`/public/${locale}/posts/${draft.slug}`, { status: 404 });
  const content = `# Backup restore verification\n\nThis exact Markdown and row ID must survive.\n\n![Restored image](${media.url})\n\nUnicode: 春日手记 🌸`;
  const chinese = {
    locale: 'zh',
    title: 'Compose published and restored',
    excerpt: 'Persistent smoke content',
    content,
    status: 'PUBLISHED',
  };
  const english = {
    locale: 'en',
    title: 'Compose English published and restored',
    excerpt: 'Independent English smoke content',
    content: `# English backup restore verification\n\nThis independent translation and its publication date must survive.\n\n![Restored image](${media.url})`,
    status: 'DRAFT',
  };
  await json(`/admin/posts/${draft.id}`, {
    method: 'PUT',
    auth: true,
    body: { coverUrl: media.url, translations: [chinese] },
  });
  const fallback = await json(`/public/en/posts/${draft.slug}`);
  assert.equal(fallback.id, draft.id);
  assert.equal(fallback.content, content);
  assert.equal(fallback.contentLocale, 'zh');
  const withDraft = await json(`/admin/posts/${draft.id}`, {
    method: 'PUT',
    auth: true,
    body: { translations: [english] },
  });
  assert.equal(withDraft.translations.length, 2);
  assert.equal(
    withDraft.translations.find((item) => item.locale === 'zh').status,
    'PUBLISHED',
  );
  const stillFallback = await json(`/public/en/posts/${draft.slug}`);
  assert.equal(stillFallback.contentLocale, 'zh');
  assert.equal(stillFallback.content, content);
  assert(
    !JSON.stringify(stillFallback).includes(english.title),
    'English drafts must not leak into the fallback',
  );
  assert.equal(
    (await json('/public/en/search?q=Independent%20English')).total,
    0,
  );
  passed(
    'Published fallback uses Chinese while an independent English draft remains private',
  );

  await json(`/admin/posts/${draft.id}`, {
    method: 'PUT',
    auth: true,
    body: { translations: [{ locale: 'en', status: 'PUBLISHED' }] },
  });
  const preferred = await json(`/public/en/posts/${draft.slug}`);
  assert.equal(preferred.id, draft.id);
  assert.equal(preferred.contentLocale, 'en');
  assert.equal(preferred.content, english.content);
  assert.equal((await json(`/public/zh/posts/${draft.slug}`)).content, content);
  for (const locale of ['zh', 'en']) {
    const list = await json(`/public/${locale}/posts`);
    assert.equal(
      list.total,
      1,
      'Translations must share one logical post count',
    );
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].id, draft.id);
    assert.equal(list.items[0].contentLocale, locale);
  }
  assert.equal(
    (await json('/public/en/search?q=Independent%20English')).total,
    1,
  );
  assert.equal(
    (await json('/public/zh/search?q=Independent%20English')).total,
    0,
  );
  assert.equal((await json('/public/en/search?q=Persistent%20smoke')).total, 0);
  passed(
    'Independent publication selects English without duplicating IDs, counts, or cross-language search matches',
  );

  await json(`/admin/posts/${draft.id}`, {
    method: 'PUT',
    auth: true,
    body: {
      translations: ['zh', 'en'].map((locale) => ({ locale, status: 'DRAFT' })),
    },
  });
  for (const locale of ['zh', 'en']) {
    await json(`/public/${locale}/posts/${draft.slug}`, { status: 404 });
    assert.equal((await json(`/public/${locale}/posts`)).total, 0);
  }
  const saved = await json(`/admin/posts/${draft.id}`, {
    method: 'PUT',
    auth: true,
    body: {
      translations: ['zh', 'en'].map((locale) => ({
        locale,
        status: 'PUBLISHED',
      })),
    },
  });
  await json(`/admin/media/${media.id}`, {
    method: 'DELETE',
    auth: true,
    status: 409,
  });
  const discarded = await json('/admin/posts', {
    method: 'POST',
    status: 201,
    auth: true,
    body: {
      slug: 'compose-deleted-post',
      translations: [{ locale: 'zh', title: 'Delete this test row' }],
    },
  });
  assert.deepEqual(
    await json(`/admin/posts/${discarded.id}`, {
      method: 'DELETE',
      auth: true,
    }),
    { deleted: true },
  );
  await json(`/admin/posts/${discarded.id}`, { auth: true, status: 404 });
  passed(
    'Authenticated create/read/update/delete, retract/republish both translations, and referenced-media protection',
  );

  const state = {
    owner: savedOwner,
    post: normalizePost(saved),
    media,
    mediaSha256: digest(bytes),
    deletedPostId: discarded.id,
  };
  await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  return state;
}

function normalizePost(post) {
  return {
    ...post,
    translations: [...post.translations].sort((a, b) =>
      a.locale.localeCompare(b.locale),
    ),
  };
}

async function verify(state) {
  const owner = await login(savedPassword);
  assert.deepEqual(
    owner,
    state.owner,
    'Owner ID and edited profile must survive',
  );
  const post = await json(`/admin/posts/${state.post.id}`, { auth: true });
  assert.deepEqual(
    normalizePost(post),
    state.post,
    'Every shared post field and complete translation row must survive',
  );
  assert.equal((await json('/admin/posts', { auth: true })).total, 1);
  await json(`/admin/posts/${state.deletedPostId}`, {
    auth: true,
    status: 404,
  });
  for (const locale of ['zh', 'en']) {
    const translation = state.post.translations.find(
      (item) => item.locale === locale,
    );
    assert(translation, `Persisted ${locale} translation is required`);
    const publicPost = await json(`/public/${locale}/posts/${state.post.slug}`);
    for (const field of ['id', 'slug', 'coverUrl'])
      assert.deepEqual(
        publicPost[field],
        state.post[field],
        `Public ${locale} post ${field}`,
      );
    for (const field of ['title', 'excerpt', 'content', 'publishedAt'])
      assert.deepEqual(
        publicPost[field],
        translation[field],
        `Public ${locale} translation ${field}`,
      );
    assert.equal(publicPost.contentLocale, locale);
    assert.equal(publicPost.author.id, owner.id);
    const list = await json(`/public/${locale}/posts`);
    assert.equal(
      list.total,
      1,
      'Restored translations must not duplicate logical post counts',
    );
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].id, state.post.id);
    assert.equal(list.items[0].contentLocale, locale);
    const page = await request(`/${locale}/posts/${state.post.slug}`);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  }
  const media = await json('/admin/media', { auth: true });
  assert.equal(media.total, 1);
  assert.deepEqual(
    media.items[0],
    state.media,
    'Media row and stable ID must survive',
  );
  const response = await request(state.media.url);
  assert.match(response.headers.get('content-type') ?? '', /image\/webp/);
  assert.equal(
    digest(Buffer.from(await response.arrayBuffer())),
    state.mediaSha256,
    'Media bytes must survive exactly',
  );
  passed(
    'Saved login, exact owner/post/translation/media IDs, both Markdown versions and publication dates, and byte-identical media',
    {
      postId: post.id,
      mediaId: state.media.id,
      mediaSha256: state.mediaSha256,
    },
  );
}

try {
  await waitForIngress();
  await checkRoutes();
  if (mode === 'populate') await populate();
  else await verify(JSON.parse(await readFile(statePath, 'utf8')));
  report.passed = true;
} catch (error) {
  // Never serialize response headers, bearer tokens or database dumps into evidence.
  report.error = error.message;
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', {
    mode: 0o600,
  });
}
