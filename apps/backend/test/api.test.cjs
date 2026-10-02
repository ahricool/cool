const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');
const { createApp } = require('../dist/app');
const { Database } = require('../dist/database');
const { hashPassword } = require('../dist/password');
const { execFileSync } = require('node:child_process');
let app, db, http, owner, token;
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
  app = await createApp();
  await app.init();
  db = app.get(Database);
  assert.equal(await db.user.count(), 0, 'Test database must have no owner');
  owner = await db.user.create({
    data: {
      email: 'owner@example.test',
      displayName: 'Owner',
      passwordHash: await hashPassword(password),
    },
  });
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
    'seed is idempotent and cannot create another owner',
    async () => {
      const env = {
        ...process.env,
        ADMIN_EMAIL: owner.email,
        ADMIN_PASSWORD: password,
      };
      execFileSync(process.execPath, ['dist/seed.js'], { env, stdio: 'pipe' });
      execFileSync(process.execPath, ['dist/seed.js'], { env, stdio: 'pipe' });
      assert.equal(await db.user.count(), 1);
      assert.throws(() =>
        execFileSync(process.execPath, ['dist/seed.js'], {
          env: { ...env, ADMIN_EMAIL: 'other@example.test' },
          stdio: 'pipe',
        }),
      );
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
