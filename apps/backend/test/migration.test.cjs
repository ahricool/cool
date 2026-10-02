/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
test('fresh bilingual schema preserves one fixed owner, independent translations and cascading shared identity', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.match(
    url.pathname,
    /_test$/,
    'Migration tests require a dedicated *_test database',
  );
  const client = new Client({ connectionString: url.href });
  await client.connect();
  const schema = `migration_${randomUUID().replaceAll('-', '')}`;
  const ownerId = randomUUID(),
    postId = randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}", public`);
    await client.query(
      readFileSync(
        join(
          __dirname,
          '../prisma/migrations/20261002030000_bilingual_initial/migration.sql',
        ),
        'utf8',
      ),
    );
    await client.query(
      `INSERT INTO users(id,email,display_name,updated_at) VALUES($1,'whoreahri@gmail.com','Owner',NOW())`,
      [ownerId],
    );
    await client.query(
      `INSERT INTO posts(id,slug,author_id,updated_at) VALUES($1,'bilingual-post',$2,NOW())`,
      [postId, ownerId],
    );
    await client.query(
      `INSERT INTO post_translations(post_id,locale,title,content,status,published_at,updated_at) VALUES($1,'zh','中文','# 中文','PUBLISHED',NOW(),NOW()),($1,'en','English draft','# Draft','DRAFT',NULL,NOW())`,
      [postId],
    );
    assert.equal(
      (await client.query('SELECT COUNT(*) FROM posts')).rows[0].count,
      '1',
    );
    assert.equal(
      (await client.query('SELECT COUNT(*) FROM post_translations')).rows[0]
        .count,
      '2',
    );
    assert.equal(
      (await client.query('SELECT password_hash FROM users')).rows[0]
        .password_hash,
      null,
    );
    for (const [query, args, code] of [
      [`UPDATE users SET email='other@example.test'`, [], '23514'],
      [
        `INSERT INTO users(id,email,display_name,updated_at) VALUES($1,'whoreahri@gmail.com','Other',NOW())`,
        [randomUUID()],
        '23505',
      ],
      [
        `INSERT INTO post_translations(post_id,locale,title,updated_at) VALUES($1,'zh','Duplicate',NOW())`,
        [postId],
        '23505',
      ],
      [
        `INSERT INTO post_translations(post_id,locale,title,updated_at) VALUES($1,'fr','French',NOW())`,
        [postId],
        '22P02',
      ],
    ]) {
      await client.query('SAVEPOINT constraint_test');
      await assert.rejects(client.query(query, args), { code });
      await client.query('ROLLBACK TO SAVEPOINT constraint_test');
    }
    await client.query('DELETE FROM posts WHERE id=$1', [postId]);
    assert.equal(
      (await client.query('SELECT COUNT(*) FROM post_translations')).rows[0]
        .count,
      '0',
    );
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
