const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
require('reflect-metadata');
const { createApp } = require('../dist/app');
const { Database } = require('../dist/database');
const { mediaRoot } = require('../dist/media-root');
test('content conversion, independent languages, album ordering, uploads and reference protection', async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  const app = await createApp();
  await app.init();
  const db = app.get(Database);
  const http = request.agent(app.getHttpServer());
  const password = 'isolated-browser-test-password';
  let session = await http.post('/api/v1/admin/auth/setup').send({ password });
  if (session.status === 409)
    session = await http
      .post('/api/v1/admin/auth/login')
      .send({ email: 'whoreahri@gmail.com', password });
  assert.equal(session.status, 201, JSON.stringify(session.body));
  const csrf = session.body.csrfToken;
  const call = (method, path) =>
    http[method]('/api/v1' + path).set('X-CSRF-Token', csrf);
  const tr = (title, content, status = 'DRAFT', locale = 'zh') => ({
    locale,
    title,
    content,
    status,
  });
  const postIds = [],
    albums = [],
    medias = [];
  try {
    const initial = (await call('get', '/admin/albums').expect(200)).body;
    assert.equal(initial.filter((a) => a.isDefault).length, 1);
    await call(
      'delete',
      '/admin/albums/' + initial.find((a) => a.isDefault).id,
    ).expect(409);
    const album = (
      await call('post', '/admin/albums')
        .send({
          name: '验证相册-' + randomUUID().slice(0, 8),
          nameEn: 'Review album',
        })
        .expect(201)
    ).body;
    albums.push(album.id);
    assert.equal(album.items.length, 0);
    await call('post', '/admin/albums').send({ name: album.name }).expect(409);
    await call('post', '/admin/albums').send({ name: ' ' }).expect(400);
    const png = await sharp({
      create: { width: 80, height: 50, channels: 3, background: '#ff6699' },
    })
      .png()
      .toBuffer();
    const image = (
      await call('post', '/admin/media/upload?albumId=' + album.id)
        .attach('file', png, 'flower.png')
        .expect(201)
    ).body;
    medias.push(image.id);
    const wave = Buffer.alloc(48);
    wave.write('RIFF');
    wave.writeUInt32LE(40, 4);
    wave.write('WAVEfmt ', 8);
    wave.writeUInt32LE(16, 16);
    wave.writeUInt16LE(1, 20);
    wave.writeUInt16LE(1, 22);
    wave.writeUInt32LE(8000, 24);
    wave.writeUInt32LE(16000, 28);
    wave.writeUInt16LE(2, 32);
    wave.writeUInt16LE(16, 34);
    wave.write('data', 36);
    wave.writeUInt32LE(4, 40);
    const audio = (
      await call('post', '/admin/media/upload?albumId=' + album.id)
        .attach('file', wave, {
          filename: 'sound.wav',
          contentType: 'audio/wav',
        })
        .expect(201)
    ).body;
    medias.push(audio.id);
    // Real browser recording is used in visual QA; here verify typed storage/serving.
    const mp4 = Buffer.from(
      '000000186674797069736f6d0000000069736f6d6d703432',
      'hex',
    );
    const video = (
      await call('post', '/admin/media/upload?albumId=' + album.id)
        .attach('file', mp4, { filename: 'film.mp4', contentType: 'video/mp4' })
        .expect(201)
    ).body;
    medias.push(video.id);
    assert.equal(audio.mimeType, 'audio/wav');
    assert.equal(video.mimeType, 'video/mp4');
    await http
      .get(audio.url)
      .expect('Content-Type', /audio\/wav/)
      .expect(200);
    await http.get(video.url).set('Range', 'bytes=0-7').expect(206);
    const original = await readFile(resolve(mediaRoot(), image.key));
    const group =
      '```cool-media\n' +
      JSON.stringify({
        layout: 'grid',
        assets: [
          {
            id: image.id,
            url: image.url,
            name: 'flower',
            mimeType: image.mimeType,
          },
          {
            id: audio.id,
            url: audio.url,
            name: 'sound',
            mimeType: audio.mimeType,
          },
          {
            id: video.id,
            url: video.url,
            name: 'film',
            mimeType: video.mimeType,
          },
        ],
      }) +
      '\n```';
    await call('post', '/admin/posts')
      .send({ type: 'ARTICLE', translations: [tr('', '正文', 'PUBLISHED')] })
      .expect(400);
    let content = (
      await call('post', '/admin/posts')
        .send({
          type: 'MOMENT',
          translations: [
            tr('', group, 'PUBLISHED'),
            tr('English', 'private draft', 'DRAFT', 'en'),
          ],
        })
        .expect(201)
    ).body;
    postIds.push(content.id);
    const slug = content.slug,
      published = content.translations[0].publishedAt;
    await call('put', '/admin/posts/' + content.id)
      .send({ type: 'ARTICLE' })
      .expect(400);
    content = (
      await call('put', '/admin/posts/' + content.id)
        .send({
          type: 'ARTICLE',
          translations: [{ locale: 'zh', title: '相册的一天' }],
        })
        .expect(200)
    ).body;
    assert.equal(content.id, postIds[0]);
    assert.equal(content.slug, slug);
    assert.equal(
      content.translations.find((t) => t.locale === 'zh').publishedAt,
      published,
    );
    assert.equal(
      content.translations.find((t) => t.locale === 'en').status,
      'DRAFT',
    );
    assert.equal(
      (await http.get('/api/v1/public/posts/' + slug).expect(200)).body.content,
      group,
    );
    let feed = (await http.get('/api/v1/public/timeline').expect(200)).body
      .items;
    assert.equal(feed.filter((i) => i.id === content.id).length, 1);
    assert.equal(feed.find((i) => i.id === content.id).kind, 'post');
    assert.equal(feed.find((i) => i.id === content.id).coverUrl, null);
    await call('put', '/admin/posts/' + content.id)
      .send({ type: 'MOMENT' })
      .expect(200);
    feed = (await http.get('/api/v1/public/timeline').expect(200)).body.items;
    assert.equal(feed.find((i) => i.id === content.id).kind, 'moment');
    await call('delete', '/admin/media/' + image.id).expect(409);
    await call('delete', '/admin/media/' + audio.id).expect(409);
    await call('delete', '/admin/media/' + video.id).expect(409);
    await call('delete', '/admin/albums/' + album.id).expect(409);
    const current = (await call('get', '/admin/albums').expect(200)).body.find(
      (a) => a.id === album.id,
    );
    const ids = current.items.map((i) => i.id).reverse();
    await call('put', '/admin/albums/' + album.id + '/order')
      .send({ ids })
      .expect(200);
    const ordered = (await call('get', '/admin/albums').expect(200)).body.find(
      (a) => a.id === album.id,
    );
    assert.deepEqual(
      ordered.items.map((i) => i.id),
      ids,
    );
    await call('put', '/admin/albums/' + album.id)
      .send({ name: album.name, coverUrl: image.url })
      .expect(200);
    await call('put', '/admin/posts/' + content.id)
      .send({ translations: [{ locale: 'zh', content: '移除引用' }] })
      .expect(200);
    assert.deepEqual(await readFile(resolve(mediaRoot(), image.key)), original);
    await call('put', '/admin/posts/' + content.id)
      .send({
        translations: [{ locale: 'zh', content: `![旧引用](${image.url})` }],
      })
      .expect(200);
    await call('delete', '/admin/media/' + image.id).expect(409);
    await call('put', '/admin/posts/' + content.id)
      .send({ translations: [{ locale: 'zh', content: group }] })
      .expect(200);
    // Leave only explicit visual fixtures when asked by the local reviewer.
    if (process.env.KEEP_VISUAL_FIXTURES === '1') {
      console.log(
        JSON.stringify({
          contentId: content.id,
          slug,
          albumId: album.id,
          image,
        }),
      );
      return;
    }
  } finally {
    if (process.env.KEEP_VISUAL_FIXTURES !== '1') {
      for (const id of postIds) await db.post.delete({ where: { id } });
      for (const id of albums) {
        await db.album.update({ where: { id }, data: { coverUrl: null } });
        await db.albumItem.deleteMany({ where: { albumId: id } });
        await db.album.delete({ where: { id } });
      }
      for (const id of medias) await call('delete', '/admin/media/' + id);
    }
    await app.close();
  }
});

test('migrated snapshots do not outlive active media/album references', async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  const app = await createApp();
  await app.init();
  const db = app.get(Database);
  const http = request.agent(app.getHttpServer());
  const login = await http
    .post('/api/v1/admin/auth/login')
    .send({
      email: 'whoreahri@gmail.com',
      password: 'isolated-browser-test-password',
    })
    .expect(201);
  const call = (method, path) =>
    http[method]('/api/v1' + path).set('X-CSRF-Token', login.body.csrfToken);
  const id = randomUUID(),
    photoId = randomUUID(),
    albumId = randomUUID();
  let media;
  try {
    await db.album.create({
      data: { id: albumId, name: '迁移回归-' + id.slice(0, 8) },
    });
    const png = await sharp({
      create: { width: 12, height: 12, channels: 3, background: '#ff6699' },
    })
      .png()
      .toBuffer();
    media = (
      await call('post', '/admin/media/upload?albumId=' + albumId)
        .attach('file', png, 'migrated.png')
        .expect(201)
    ).body;
    const content = `![old](${media.url})`;
    await db.moment.create({
      data: {
        id,
        translations: {
          create: {
            locale: 'zh',
            content,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        },
      },
    });
    await db.photo.create({
      data: {
        id: photoId,
        url: media.url,
        translations: {
          create: { locale: 'zh', title: '旧照片', album: '旧相册' },
        },
      },
    });
    // Apply the same additive copy as the migration: retain source IDs and snapshots.
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO posts(id,slug,type,source_moment_id,created_at,updated_at,author_id) SELECT m.id,${randomBytesForTest()},'MOMENT',m.id,m.created_at,m.updated_at,${login.body.user.id}::uuid FROM moments m WHERE m.id=${id}::uuid`;
      await tx.$executeRaw`INSERT INTO post_translations(post_id,locale,title,excerpt,content,content_format,status,published_at,updated_at) SELECT moment_id,locale,'','',content,'markdown',status,published_at,updated_at FROM moment_translations WHERE moment_id=${id}::uuid`;
      await tx.albumItem.updateMany({
        where: { albumId, mediaId: media.id },
        data: { legacyPhotoId: photoId },
      });
    });
    await call('delete', '/admin/media/' + media.id).expect(409);
    await call('delete', '/admin/albums/' + albumId).expect(409);
    await call('put', '/admin/posts/' + id)
      .send({ translations: [{ locale: 'zh', content: '引用已移除' }] })
      .expect(200);
    const escapedGroup =
      '```cool-media\n' +
      JSON.stringify({
        layout: 'grid',
        assets: [
          {
            id: media.id,
            url: media.url,
            name: '迁移图片',
            mimeType: 'image/webp',
          },
        ],
      }).replaceAll('-', '\\u002d') +
      '\n```';
    assert.equal(escapedGroup.includes(media.url), false);
    assert.equal(escapedGroup.includes(media.key), false);
    await call('put', '/admin/posts/' + id)
      .send({ translations: [{ locale: 'zh', content: escapedGroup }] })
      .expect(200);
    await call('delete', '/admin/media/' + media.id).expect(409);
    await call('delete', '/admin/albums/' + albumId).expect(409);
    await call('put', '/admin/posts/' + id)
      .send({ translations: [{ locale: 'zh', content: '引用已移除' }] })
      .expect(200);
    // The unmodified legacy snapshots still contain the URL, but are not active.
    assert.equal(
      (
        await db.momentTranslation.findUnique({
          where: { momentId_locale: { momentId: id, locale: 'zh' } },
        })
      ).content,
      content,
    );
    assert.equal(
      (await db.photo.findUnique({ where: { id: photoId } })).url,
      media.url,
    );
    await call('delete', '/admin/albums/' + albumId).expect(200);
    await call('put', '/admin/posts/' + id)
      .send({ translations: [{ locale: 'zh', content }] })
      .expect(200);
    await call('delete', '/admin/media/' + media.id).expect(409);
    await call('delete', '/admin/posts/' + id).expect(200);
    await call('delete', '/admin/media/' + media.id).expect(200);
  } finally {
    await db.post.deleteMany({ where: { id } });
    await db.albumItem.deleteMany({
      where: {
        OR: [
          { albumId },
          { legacyPhotoId: photoId },
          ...(media ? [{ mediaId: media.id }] : []),
        ],
      },
    });
    await db.album.deleteMany({ where: { id: albumId } });
    await db.photo.deleteMany({ where: { id: photoId } });
    await db.moment.deleteMany({ where: { id } });
    if (media) await call('delete', '/admin/media/' + media.id);
    await app.close();
  }
});
function randomBytesForTest() {
  return randomUUID().replaceAll('-', '').slice(0, 8);
}
