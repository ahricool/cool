/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

test('single-admin upgrade preserves existing owner credentials and authored content', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.match(
    url.pathname,
    /_test$/,
    'Migration tests require a dedicated *_test database',
  );
  const client = new Client({ connectionString: url.href });
  await client.connect();
  const schema = `migration_${randomUUID().replaceAll('-', '')}`;
  const ownerId = randomUUID();
  const postId = randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}", public`);
    for (const name of [
      '20261002000000_initial',
      '20261002010000_content_library',
    ])
      await client.query(
        readFileSync(
          join(__dirname, '../prisma/migrations', name, 'migration.sql'),
          'utf8',
        ),
      );
    await client.query(
      `INSERT INTO users(id,email,password_hash,display_name,updated_at)
      VALUES($1,'legacy-owner@example.test','existing-hash-preserved','Existing Owner',NOW())`,
      [ownerId],
    );
    await client.query(
      `INSERT INTO posts(id,slug,title,content,author_id,updated_at)
      VALUES($1,'existing-post','Existing post','# Keep my content',$2,NOW())`,
      [postId, ownerId],
    );
    await client.query(
      readFileSync(
        join(
          __dirname,
          '../prisma/migrations/20261002020000_single_admin_sessions/migration.sql',
        ),
        'utf8',
      ),
    );
    const owner = (await client.query('SELECT * FROM users')).rows[0];
    assert.equal(owner.id, ownerId);
    assert.equal(owner.email, 'whoreahri@gmail.com');
    assert.equal(owner.password_hash, 'existing-hash-preserved');
    assert.equal(owner.display_name, 'Existing Owner');
    const post = (await client.query('SELECT * FROM posts')).rows[0];
    assert.equal(post.id, postId);
    assert.equal(post.author_id, ownerId);
    assert.equal(post.content, '# Keep my content');
    assert.equal(
      (await client.query('SELECT COUNT(*) FROM admin_sessions')).rows[0].count,
      '0',
    );
    await client.query('SAVEPOINT invalid_email');
    await assert.rejects(
      client.query(`UPDATE users SET email='different@example.test'`),
      { code: '23514' },
    );
    await client.query('ROLLBACK TO SAVEPOINT invalid_email');
    await client.query('SAVEPOINT duplicate_owner');
    await assert.rejects(
      client.query(
        `INSERT INTO users(id,email,display_name,updated_at)
      VALUES($1,'whoreahri@gmail.com','Another owner',NOW())`,
        [randomUUID()],
      ),
      { code: '23505' },
    );
    await client.query('ROLLBACK TO SAVEPOINT duplicate_owner');
    await client.query('UPDATE users SET password_hash=NULL');
    assert.equal(
      (await client.query('SELECT password_hash FROM users')).rows[0]
        .password_hash,
      null,
    );
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
