const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');
const { createApp } = require('../dist/app');
const { Database } = require('../dist/database');
const { verifyPassword } = require('../dist/password');
const { ADMIN_EMAIL } = require('../dist/auth.constants');
const { JwtService } = require('@nestjs/jwt');
const { execFileSync } = require('node:child_process');
let app, db, http, owner, token, initialToken;
const ids = [];
const prefix = `test-${randomUUID()}`;
const password = 'integration-test-only-password';
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.match(
    url.pathname,
    /_test$/,
    'Integration tests require a dedicated *_test database',
  );
  process.env.TRUST_PROXY_HOPS = '1';
  process.env.CORS_ORIGINS = 'http://cms.test:43210';
  app = await createApp();
  await app.init();
  db = app.get(Database);
  assert.equal(await db.user.count(), 0, 'Test database must have no owner');
  http = request(app.getHttpServer());
});
after(async () => {
  if (db && owner) {
    await db.post.deleteMany({ where: { authorId: owner.id } });
    await db.siteSetting.deleteMany({ where: { key: 'private-test' } });
    await db.user.delete({ where: { id: owner.id } });
  }
  if (app) await app.close();
});
test('Owner login and full post publication lifecycle', async (t) => {
  await t.test(
    'seed leaves password unset and concurrent first setup has one winner',
    async () => {
      for (let i = 0; i < 2; i++)
        execFileSync(process.execPath, ['dist/seed.js'], {
          env: process.env,
          stdio: 'pipe',
        });
      owner = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
      assert.equal(owner.passwordHash, null);
      assert.equal(await db.user.count(), 1);
      const status = await http.get('/api/v1/admin/auth/status').expect(200);
      assert.deepEqual(status.body, {
        email: ADMIN_EMAIL,
        initialized: false,
        setupAvailable: true,
      });
      assert.equal(status.headers['cache-control'], 'no-store');
      await http
        .post('/api/v1/admin/auth/setup')
        .send({ password: 'short' })
        .expect(400);
      await http
        .post('/api/v1/admin/auth/setup')
        .set('Origin', 'https://attacker.test')
        .send({ password })
        .expect(403);
      assert.equal(
        (await db.user.findUnique({ where: { id: owner.id } })).passwordHash,
        null,
      );
      const setups = await Promise.all([
        http.post('/api/v1/admin/auth/setup').send({ password }),
        http
          .post('/api/v1/admin/auth/setup')
          .send({ password: 'losing-or-winning-test-password' }),
      ]);
      assert.deepEqual(
        setups.map((response) => response.status).sort(),
        [201, 409],
      );
      const winner = setups.find((response) => response.status === 201);
      initialToken = winner.body.accessToken;
      const stored = await db.user.findUnique({ where: { id: owner.id } });
      // Keep the common fixture password regardless of which simultaneous request won.
      if (!(await verifyPassword(password, stored.passwordHash))) {
        await http
          .put('/api/v1/admin/auth/password')
          .auth(initialToken, { type: 'bearer' })
          .send({
            currentPassword: 'losing-or-winning-test-password',
            newPassword: password,
          })
          .expect(200);
      }
      assert.equal(await db.user.count(), 1);
      assert.equal(winner.body.user.email, ADMIN_EMAIL);
      assert.equal(winner.body.user.passwordHash, undefined);
      assert.equal(
        (await http.get('/api/v1/admin/auth/status')).body.initialized,
        true,
      );
      await http
        .post('/api/v1/admin/auth/setup')
        .send({ password })
        .expect(409);
      await assert.rejects(
        db.user.create({
          data: { email: ADMIN_EMAIL, displayName: 'Duplicate' },
        }),
      );
      await assert.rejects(
        db.user.update({
          where: { id: owner.id },
          data: { email: 'other@example.test' },
        }),
      );
    },
  );
  await t.test('reject anonymous writes and invalid credentials', async () => {
    await http.post('/api/v1/admin/posts').send({}).expect(401);
    await http
      .post('/api/v1/admin/auth/login')
      .send({ email: owner.email, password: 'wrong' })
      .expect(401);
    const login = await http
      .post('/api/v1/admin/auth/login')
      .send({ email: owner.email, password })
      .expect(201);
    token = login.body.accessToken;
    const me = await http
      .get('/api/v1/admin/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    assert.equal(me.body.id, owner.id);
    assert.equal(me.body.passwordHash, undefined);
    await http
      .get('/api/v1/admin/auth/me')
      .auth('invalid', { type: 'bearer' })
      .expect(401);
  });
  const markdown =
    '# Hello\n\n```typescript\nconst answer = 42;\n```\n\n<script>alert(1)</script>';
  await t.test('store Markdown source and keep draft private', async () => {
    const response = await http
      .post('/api/v1/admin/posts')
      .auth(token, { type: 'bearer' })
      .send({ slug: prefix, title: 'Lifecycle title', content: markdown })
      .expect(201);
    ids.push(response.body.id);
    assert.equal(response.body.content, markdown);
    assert.equal(response.body.status, 'DRAFT');
    assert.equal(response.body.author.passwordHash, undefined);
    await http.get(`/api/v1/public/posts/${prefix}`).expect(404);
    assert.equal((await http.get('/api/v1/public/posts')).body.total, 0);
    assert.equal(
      (await http.get('/api/v1/public/search?q=Lifecycle')).body.total,
      0,
    );
  });
  await t.test(
    'reject conflicts, null required fields, unknown fields and invalid pagination',
    async () => {
      await http
        .post('/api/v1/admin/posts')
        .auth(token, { type: 'bearer' })
        .send({ slug: prefix, title: 'Duplicate' })
        .expect(409);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ title: null })
        .expect(400);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ authorId: owner.id })
        .expect(400);
      await http.get('/api/v1/public/posts?pageSize=500').expect(400);
      await http
        .put(`/api/v1/admin/posts/${randomUUID()}`)
        .auth(token, { type: 'bearer' })
        .send({ title: 'Missing' })
        .expect(404);
    },
  );
  await t.test('publish and expose only safe author fields', async () => {
    await http
      .put(`/api/v1/admin/posts/${ids[0]}`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'PUBLISHED' })
      .expect(200);
    const detail = await http.get(`/api/v1/public/posts/${prefix}`).expect(200);
    assert.equal(detail.body.content, markdown);
    assert.equal(detail.body.contentFormat, 'markdown');
    assert.equal(detail.body.author.email, undefined);
    assert.ok(detail.body.publishedAt);
    const list = await http.get('/api/v1/public/posts?pageSize=1').expect(200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].content, undefined);
    assert.equal(
      (await http.get('/api/v1/public/search?q=Lifecycle')).body.total,
      1,
    );
    assert.equal((await http.get('/api/v1/public/archives')).body.total, 1);
  });
  await t.test(
    'future publication and withdrawal stay private on all discovery endpoints',
    async () => {
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ publishedAt: '2099-01-01T00:00:00Z' })
        .expect(200);
      await http.get(`/api/v1/public/posts/${prefix}`).expect(404);
      for (const route of ['posts', 'search?q=Lifecycle', 'archives'])
        assert.equal((await http.get(`/api/v1/public/${route}`)).body.total, 0);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ status: 'DRAFT', publishedAt: null })
        .expect(200);
      await http.get(`/api/v1/public/posts/${prefix}`).expect(404);
    },
  );
  await t.test('invalid taxonomy rolls back the entire update', async () => {
    await http
      .put(`/api/v1/admin/posts/${ids[0]}`)
      .auth(token, { type: 'bearer' })
      .send({ title: 'Must roll back', categoryIds: [randomUUID()] })
      .expect(400);
    assert.equal(
      (await db.post.findUnique({ where: { id: ids[0] } })).title,
      'Lifecycle title',
    );
  });
  await t.test('private settings are never returned', async () => {
    await db.siteSetting.create({
      data: { key: 'private-test', value: { secret: 'do-not-expose' } },
    });
    const response = await http.get('/api/v1/public/config').expect(200);
    assert.equal(response.body['private-test'], undefined);
    await http.get('/api/v1/public/site').expect(200);
    await http.get('/api/v1/health').expect(200);
    await http.get('/api/openapi.json').expect(200);
  });
  await t.test(
    'seed never changes an initialized owner or creates extra accounts',
    async () => {
      const before = await db.user.findUnique({ where: { id: owner.id } });
      const env = {
        ...process.env,
        ADMIN_EMAIL: 'ignored@example.test',
        ADMIN_PASSWORD: 'ignored-legacy-fixture-password',
      };
      for (let i = 0; i < 2; i++)
        execFileSync(process.execPath, ['dist/seed.js'], {
          env,
          stdio: 'pipe',
        });
      assert.equal(await db.user.count(), 1);
      const after = await db.user.findUnique({ where: { id: owner.id } });
      assert.equal(after.email, ADMIN_EMAIL);
      assert.equal(after.passwordHash, before.passwordHash);
    },
  );
  await t.test(
    '15-day sessions have secure cookies, CSRF protection and server revocation',
    async () => {
      const login = (ip = '198.51.100.51') =>
        http
          .post('/api/v1/admin/auth/login')
          .set('X-Forwarded-For', ip)
          .send({ email: ADMIN_EMAIL, password });
      await http
        .post('/api/v1/admin/auth/login')
        .set('X-Forwarded-For', '198.51.100.52')
        .set('Origin', 'https://attacker.test')
        .send({ email: ADMIN_EMAIL, password })
        .expect(403);
      await http
        .post('/api/v1/admin/auth/login')
        .set('X-Forwarded-For', '198.51.100.52')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ email: ADMIN_EMAIL, password })
        .expect(403);
      await http
        .post('/api/v1/admin/auth/login')
        .set('X-Forwarded-For', '198.51.100.52')
        .send({ email: 'visitor@example.test', password })
        .expect(401);
      const oldEnvironment = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const signedIn = await login().expect(201);
      if (oldEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnvironment;
      const setCookie = signedIn.headers['set-cookie'][0];
      for (const attribute of [
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
        'Path=/',
        'Max-Age=1296000',
      ])
        assert.ok(setCookie.includes(attribute), attribute);
      assert.equal(signedIn.headers['cache-control'], 'no-store');
      const cookie = setCookie.split(';')[0];
      const csrf = signedIn.body.csrfToken;
      const jwt = app.get(JwtService);
      const claims = jwt.decode(signedIn.body.accessToken);
      assert.equal(claims.exp - claims.iat, 15 * 24 * 60 * 60);
      assert.equal(signedIn.body.expiresIn, 1296000);
      assert.equal(
        jwt.verify(signedIn.body.accessToken, {
          clockTimestamp: claims.iat + 1295999,
        }).sid,
        claims.sid,
      );
      assert.throws(
        () =>
          jwt.verify(signedIn.body.accessToken, { clockTimestamp: claims.exp }),
        /expired/,
      );
      const legacyToken = await jwt.signAsync({
        sub: owner.id,
        version: claims.version,
      });
      await http
        .get('/api/v1/admin/auth/session')
        .auth(legacyToken, { type: 'bearer' })
        .expect(401);
      const expired = await jwt.signAsync({
        sub: owner.id,
        sid: claims.sid,
        version: claims.version,
        iat: claims.iat - 1296001,
      });
      await http
        .get('/api/v1/admin/auth/session')
        .auth(expired, { type: 'bearer' })
        .expect(401);
      const session = await http
        .get('/api/v1/admin/auth/session')
        .set('Cookie', cookie)
        .expect(200);
      assert.equal(session.body.csrfToken, csrf);
      assert.equal(session.body.user.email, ADMIN_EMAIL);
      assert.equal(session.body.accessToken, undefined);
      assert.equal(session.headers['cache-control'], 'no-store');
      await http
        .put('/api/v1/admin/auth/profile')
        .set('Cookie', cookie)
        .send({ displayName: 'Owner' })
        .expect(403);
      await http
        .put('/api/v1/admin/auth/profile')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'wrong')
        .send({ displayName: 'Owner' })
        .expect(403);
      await http
        .put('/api/v1/admin/auth/profile')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrf)
        .set('Origin', 'https://attacker.test')
        .send({ displayName: 'Owner' })
        .expect(403);
      await http
        .put('/api/v1/admin/auth/profile')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrf)
        .set('Origin', 'http://cms.test:43210')
        .send({ displayName: 'Owner' })
        .expect(200);
      await http
        .put('/api/v1/admin/auth/profile')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrf)
        .send({ displayName: 'Owner', email: 'other@example.test' })
        .expect(400);
      await http
        .post('/api/v1/admin/posts')
        .set('Cookie', cookie)
        .send({ slug: prefix + '-csrf', title: 'Blocked' })
        .expect(403);
      await http
        .post('/api/v1/admin/media/upload')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('not an image'), 'test.png')
        .expect(403);
      await http
        .post('/api/v1/admin/auth/logout')
        .set('Cookie', cookie)
        .expect(403);
      const signedOut = await http
        .post('/api/v1/admin/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrf)
        .expect(201);
      assert.match(
        signedOut.headers['set-cookie'][0],
        /cms_session=;.*Expires=Thu, 01 Jan 1970/,
      );
      await http
        .get('/api/v1/admin/auth/session')
        .set('Cookie', cookie)
        .expect(401);
      await http
        .get('/api/v1/admin/auth/session')
        .auth(signedIn.body.accessToken, { type: 'bearer' })
        .expect(401);
      // Logging out this session must not revoke the independent content-test token.
      await http
        .get('/api/v1/admin/auth/session')
        .auth(token, { type: 'bearer' })
        .expect(200);
      const otherSession = await login('198.51.100.53').expect(201);
      await http
        .post('/api/v1/admin/auth/revoke-all')
        .auth(otherSession.body.accessToken, { type: 'bearer' })
        .expect(201);
      for (const revoked of [token, otherSession.body.accessToken])
        await http
          .get('/api/v1/admin/auth/session')
          .auth(revoked, { type: 'bearer' })
          .expect(401);
      token = (await login('198.51.100.54').expect(201)).body.accessToken;
    },
  );
  await t.test('taxonomy CRUD and draft visibility work together', async () => {
    const category = (
      await http
        .post('/api/v1/admin/categories')
        .auth(token, { type: 'bearer' })
        .send({ name: 'Tests', slug: prefix })
        .expect(201)
    ).body;
    const tag = (
      await http
        .post('/api/v1/admin/tags')
        .auth(token, { type: 'bearer' })
        .send({ name: 'Tests', slug: prefix })
        .expect(201)
    ).body;
    await http
      .put(`/api/v1/admin/posts/${ids[0]}`)
      .auth(token, { type: 'bearer' })
      .send({ categoryIds: [category.id], tagIds: [tag.id] })
      .expect(200);
    assert.equal((await http.get('/api/v1/public/categories')).body.length, 0);
    await http
      .put(`/api/v1/admin/posts/${ids[0]}`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'PUBLISHED', publishedAt: null })
      .expect(200);
    assert.equal(
      (await http.get('/api/v1/public/categories')).body[0].id,
      category.id,
    );
    assert.equal(
      (await http.get('/api/v1/public/posts?tag=' + prefix)).body.total,
      1,
    );
    await http
      .delete('/api/v1/admin/categories/' + category.id)
      .auth(token, { type: 'bearer' })
      .expect(200);
    await http
      .delete('/api/v1/admin/tags/' + tag.id)
      .auth(token, { type: 'bearer' })
      .expect(200);
  });
  await t.test(
    'pages and moments use publication rules; photos and links are explicit opt-in',
    async () => {
      const page = (
        await http
          .post('/api/v1/admin/pages')
          .auth(token, { type: 'bearer' })
          .send({ slug: prefix, title: 'Page', content: '# Page' })
          .expect(201)
      ).body;
      await http.get('/api/v1/public/pages/' + prefix).expect(404);
      await http
        .put('/api/v1/admin/pages/' + page.id)
        .auth(token, { type: 'bearer' })
        .send({ status: 'PUBLISHED' })
        .expect(200);
      assert.equal(
        (await http.get('/api/v1/public/pages/' + prefix).expect(200)).body
          .content,
        '# Page',
      );
      const moment = (
        await http
          .post('/api/v1/admin/moments')
          .auth(token, { type: 'bearer' })
          .send({
            content: 'A moment',
            status: 'PUBLISHED',
            publishedAt: '2099-01-01T00:00:00Z',
          })
          .expect(201)
      ).body;
      assert.equal((await http.get('/api/v1/public/moments')).body.total, 0);
      await http
        .put('/api/v1/admin/moments/' + moment.id)
        .auth(token, { type: 'bearer' })
        .send({ publishedAt: null })
        .expect(200);
      assert.equal((await http.get('/api/v1/public/moments')).body.total, 1);
      const photo = (
        await http
          .post('/api/v1/admin/photos')
          .auth(token, { type: 'bearer' })
          .send({ title: 'A photo', url: '/sakura/images/default/temp.webp' })
          .expect(201)
      ).body;
      assert.equal((await http.get('/api/v1/public/photos')).body.total, 0);
      await http
        .put('/api/v1/admin/photos/' + photo.id)
        .auth(token, { type: 'bearer' })
        .send({ published: true })
        .expect(200);
      assert.equal((await http.get('/api/v1/public/photos')).body.total, 1);
      const link = (
        await http
          .post('/api/v1/admin/links')
          .auth(token, { type: 'bearer' })
          .send({
            name: 'Example',
            url: 'https://example.com',
            published: true,
          })
          .expect(201)
      ).body;
      assert.equal((await http.get('/api/v1/public/links')).body.total, 1);
      for (const [kind, id] of [
        ['pages', page.id],
        ['moments', moment.id],
        ['photos', photo.id],
        ['links', link.id],
      ])
        await http
          .delete(`/api/v1/admin/${kind}/${id}`)
          .auth(token, { type: 'bearer' })
          .expect(200);
    },
  );
  await t.test(
    'comments require approval, counts track moderation and deletion',
    async () => {
      await http
        .post(`/api/v1/public/posts/${prefix}/comments`)
        .send({ name: 'Visitor', content: '<script>untrusted</script>' })
        .expect(201);
      assert.equal(
        (await http.get(`/api/v1/public/posts/${prefix}/comments`)).body.total,
        0,
      );
      const comment = (
        await http
          .get('/api/v1/admin/comments')
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body.items[0];
      await http
        .put('/api/v1/admin/comments/' + comment.id)
        .auth(token, { type: 'bearer' })
        .send({ status: 'APPROVED' })
        .expect(200);
      assert.equal(
        (await http.get(`/api/v1/public/posts/${prefix}/comments`)).body.total,
        1,
      );
      assert.equal(
        (await http.get('/api/v1/public/posts/' + prefix)).body.commentCount,
        1,
      );
      await http
        .put('/api/v1/admin/comments/' + comment.id)
        .auth(token, { type: 'bearer' })
        .send({ status: 'SPAM' })
        .expect(200);
      assert.equal(
        (await http.get('/api/v1/public/posts/' + prefix)).body.commentCount,
        0,
      );
      await http
        .delete('/api/v1/admin/comments/' + comment.id)
        .auth(token, { type: 'bearer' })
        .expect(200);
    },
  );
  await t.test(
    'media validates image bytes, serves safely, and protects references',
    async () => {
      const sharp = require('sharp');
      await http
        .post('/api/v1/admin/media/upload')
        .auth(token, { type: 'bearer' })
        .attach('file', Buffer.from('<svg onload="alert(1)"/>'), 'image.svg')
        .expect(400);
      const bytes = await sharp({
        create: { width: 10, height: 10, channels: 3, background: '#fff' },
      })
        .png()
        .toBuffer();
      const media = (
        await http
          .post('/api/v1/admin/media/upload')
          .auth(token, { type: 'bearer' })
          .attach('file', bytes, 'test.png')
          .expect(201)
      ).body;
      await http
        .get(media.url)
        .expect('Content-Type', /image\/webp/)
        .expect(200);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ coverUrl: media.url })
        .expect(200);
      await http
        .delete('/api/v1/admin/media/' + media.id)
        .auth(token, { type: 'bearer' })
        .expect(409);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ coverUrl: null })
        .expect(200);
      await http
        .delete('/api/v1/admin/media/' + media.id)
        .auth(token, { type: 'bearer' })
        .expect(200);
      await http.get(media.url).expect(404);
      await http
        .put(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .send({ coverUrl: 'https://cdn.example.com/image.png' })
        .expect(400);
    },
  );
  await t.test(
    'settings validate nested payloads and can close comments',
    async () => {
      const config = (
        await http
          .get('/api/v1/admin/settings')
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body;
      config.site.commentsEnabled = false;
      await http
        .put('/api/v1/admin/settings')
        .auth(token, { type: 'bearer' })
        .send(config)
        .expect(200);
      await http
        .post(`/api/v1/public/posts/${prefix}/comments`)
        .send({ name: 'Visitor', content: 'Closed' })
        .expect(403);
      await http
        .put('/api/v1/admin/settings')
        .auth(token, { type: 'bearer' })
        .send({
          ...config,
          homepage: { ...config.homepage, coverUrl: 'javascript:alert(1)' },
        })
        .expect(400);
      await http
        .put('/api/v1/admin/settings')
        .auth(token, { type: 'bearer' })
        .send({ site: null, homepage: config.homepage, social: [] })
        .expect(400);
      config.site.commentsEnabled = true;
      await http
        .put('/api/v1/admin/settings')
        .auth(token, { type: 'bearer' })
        .send(config)
        .expect(200);
    },
  );
  await t.test(
    'delete removes content and repeated deletion returns 404',
    async () => {
      await http
        .delete(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      await http
        .delete(`/api/v1/admin/posts/${ids[0]}`)
        .auth(token, { type: 'bearer' })
        .expect(404);
    },
  );
  await t.test('login is rate limited', async () => {
    let status;
    for (let i = 0; i < 5; i++)
      status = (
        await http
          .post('/api/v1/admin/auth/login')
          .send({ email: owner.email, password: 'wrong' })
      ).status;
    assert.equal(status, 429);
  });
  await t.test('password changes invalidate existing JWTs', async () => {
    await http
      .put('/api/v1/admin/auth/password')
      .auth(token, { type: 'bearer' })
      .send({ currentPassword: 'wrong', newPassword: 'new-test-only-password' })
      .expect(401);
    await http
      .put('/api/v1/admin/auth/password')
      .auth(token, { type: 'bearer' })
      .send({
        currentPassword: password,
        newPassword: 'new-test-only-password',
      })
      .expect(200);
    await http
      .get('/api/v1/admin/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });
});
