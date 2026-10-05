/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
test('additive content/album migration preserves IDs, paths, translations and relations', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.match(url.pathname, /_test$/);
  const c = new Client({ connectionString: url.href });
  await c.connect();
  const schema = 'content_' + randomUUID().replaceAll('-', '');
  const owner = randomUUID(),
    post = randomUUID(),
    moment = randomUUID(),
    media = randomUUID(),
    photo = randomUUID(),
    key = randomUUID() + '.webp';
  try {
    await c.query('BEGIN');
    await c.query(`CREATE SCHEMA "${schema}"`);
    await c.query(`SET LOCAL search_path TO "${schema}",public`);
    const sql = (name) =>
      readFileSync(
        join(__dirname, '../prisma/migrations', name, 'migration.sql'),
        'utf8',
      );
    await c.query(sql('20261002030000_bilingual_initial'));
    await c.query(
      `INSERT INTO users(id,email,display_name,updated_at) VALUES($1,'whoreahri@gmail.com','Owner',NOW());`,
      [owner],
    );
    await c.query(
      `INSERT INTO posts(id,slug,author_id,updated_at) VALUES($1,'Ab1Cd2Ef',$2,NOW());`,
      [post, owner],
    );
    await c.query(
      `INSERT INTO post_translations(post_id,locale,title,content,status,published_at,updated_at) VALUES($1,'zh','旧文章',$2,'PUBLISHED','2020-01-01',NOW())`,
      [post, `![old](/api/v1/media/${key})`],
    );
    await c.query(`INSERT INTO moments(id,updated_at) VALUES($1,NOW());`, [
      moment,
    ]);
    await c.query(
      `INSERT INTO moment_translations(moment_id,locale,content,status,published_at,updated_at) VALUES($1,'zh','旧瞬间','PUBLISHED','2021-01-01',NOW()),($1,'en','English draft','DRAFT',NULL,NOW())`,
      [moment],
    );
    await c.query(
      `INSERT INTO media(id,key,original_name,mime_type,size,width,height) VALUES($1,$2,'old.webp','image/webp',42,10,10)`,
      [media, key],
    );
    await c.query(`INSERT INTO photos(id,url,updated_at) VALUES($1,$2,NOW())`, [
      photo,
      `/api/v1/media/${key}`,
    ]);
    await c.query(
      `INSERT INTO photo_translations(photo_id,locale,title,description,album) VALUES($1,'zh','旧图片','原说明','旅行'),($1,'en','Old image','Original description','Travel')`,
      [photo],
    );
    const before = (
      await c.query(
        `SELECT (SELECT count(*) FROM posts) posts,(SELECT count(*) FROM moments) moments,(SELECT count(*) FROM media) media,(SELECT count(*) FROM photos) photos`,
      )
    ).rows[0];
    await c.query(
      sql('20261005000000_content_albums')
        .replace(/^BEGIN;$/m, '')
        .replace(/^COMMIT;$/m, ''),
    );
    assert.equal(
      (await c.query('SELECT slug FROM posts WHERE id=$1', [post])).rows[0]
        .slug,
      'Ab1Cd2Ef',
    );
    const converted = (
      await c.query('SELECT * FROM posts WHERE id=$1', [moment])
    ).rows[0];
    assert.equal(converted.type, 'MOMENT');
    assert.equal(converted.source_moment_id, moment);
    assert.equal(converted.slug.length, 8);
    assert.equal(
      (
        await c.query(
          'SELECT count(*) FROM post_translations WHERE post_id=$1',
          [moment],
        )
      ).rows[0].count,
      '2',
    );
    assert.equal(
      (
        await c.query(
          "SELECT content FROM post_translations WHERE post_id=$1 AND locale='en'",
          [moment],
        )
      ).rows[0].content,
      'English draft',
    );
    const albums = (
      await c.query('SELECT * FROM albums ORDER BY is_default DESC')
    ).rows;
    assert.equal(albums.length, 2);
    assert.equal(albums[1].name, '旅行');
    assert.equal(albums[1].name_en, 'Travel');
    const items = (await c.query('SELECT * FROM album_items')).rows;
    assert.equal(items.length, 1);
    assert.equal(items[0].media_id, media);
    assert.equal(items[0].legacy_photo_id, photo);
    assert.equal(items[0].url, `/api/v1/media/${key}`);
    const after = (
      await c.query(
        `SELECT (SELECT count(*) FROM posts) posts,(SELECT count(*) FROM moments) moments,(SELECT count(*) FROM media) media,(SELECT count(*) FROM photos) photos`,
      )
    ).rows[0];
    assert.equal(
      Number(after.posts),
      Number(before.posts) + Number(before.moments),
    );
    assert.equal(after.moments, before.moments);
    assert.equal(after.media, before.media);
    assert.equal(after.photos, before.photos);
  } finally {
    await c.query('ROLLBACK');
    await c.end();
  }
});
