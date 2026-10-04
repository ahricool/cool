/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { migrateResourcePaths } = require('../dist/migrations/resource-paths');
const { rewriteResourceLinks } = require('../dist/migrations/resource-links');
const {
  randomResourcePath,
  createWithResourcePath,
} = require('../dist/resource-paths');
test('generated paths retry slug collisions and preserve non-path failures', async () => {
  for (let i = 0; i < 30; i++)
    assert.match(
      randomResourcePath(),
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[A-Za-z0-9]{8}$/,
    );
  let attempts = 0;
  const allocated = await createWithResourcePath(async (slug) => {
    if (++attempts === 1) throw { code: 'P2002', meta: { target: ['slug'] } };
    return slug;
  });
  assert.equal(attempts, 2);
  assert.equal(allocated.length, 8);
  const failure = { code: 'P2002', meta: { target: ['locale'] } };
  await assert.rejects(
    createWithResourcePath(async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});
test('path migration preserves identities, publication metadata and relations; audits, repeats and rolls back safely', async () => {
  const originalUrl = process.env.DATABASE_URL;
  const url = new URL(originalUrl);
  assert.match(url.pathname, /_test$/);
  const client = new Client({ connectionString: url.href });
  await client.connect();
  const schema = `paths_${randomUUID().replaceAll('-', '')}`;
  let db;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const migration of [
      '20261002030000_bilingual_initial',
      '20261004030000_resource_path_audit',
    ])
      await client.query(
        readFileSync(
          join(__dirname, '../prisma/migrations', migration, 'migration.sql'),
          'utf8',
        ),
      );
    url.searchParams.set('options', `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.href;
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: originalUrl }, { schema }),
    });
    const owner = await db.user.create({
      data: { email: 'whoreahri@gmail.com', displayName: 'Owner' },
    });
    const category = await db.category.create({
      data: {
        slug: 'old-category',
        translations: { create: { locale: 'zh', name: '历史分类' } },
      },
    });
    const tag = await db.tag.create({
      data: {
        slug: 'old-tag',
        translations: { create: { locale: 'en', name: 'Tag' } },
      },
    });
    const content =
      '[story](/posts/old-post?x=1#heading)\n\n[page](/pages/old-page)\n\n[tag](/tags/old-tag/)\n\n[cat](/categories/old-category)\n\n[external](https://example.test/posts/old-post)\n\n`[sample](/posts/old-post)`\n\n```md\n[code](/posts/old-post)\n```\n\n[reference][r]\n\n[r]: /pages/old-page "Page"';
    const date = new Date('2025-01-02T03:04:05.123Z');
    const post = await db.post.create({
      data: {
        slug: 'old-post',
        authorId: owner.id,
        updatedAt: date,
        categories: { create: { categoryId: category.id } },
        tags: { create: { tagId: tag.id } },
        translations: {
          create: [
            {
              locale: 'zh',
              title: '文章',
              content,
              status: 'PUBLISHED',
              publishedAt: date,
              updatedAt: date,
            },
            {
              locale: 'en',
              title: 'Draft',
              content: 'Secret',
              status: 'DRAFT',
              updatedAt: date,
            },
          ],
        },
      },
    });
    const page = await db.page.create({
      data: {
        slug: 'old-page',
        updatedAt: date,
        translations: {
          create: {
            locale: 'en',
            title: 'Page',
            content,
            status: 'ARCHIVED',
            updatedAt: date,
          },
        },
      },
    });
    const moment = await db.moment.create({
      data: {
        updatedAt: date,
        translations: {
          create: {
            locale: 'zh',
            content,
            status: 'PUBLISHED',
            publishedAt: date,
            updatedAt: date,
          },
        },
      },
    });
    const settings = await db.siteSetting.create({
      data: {
        key: 'homepage',
        value: {
          coverUrl: '/api/v1/media/11111111-1111-4111-8111-111111111111.webp',
          link: '/pages/old-page#intro',
          description: '/pages/old-page',
        },
        updatedAt: date,
      },
    });
    const before = await db.post.findUnique({
      where: { id: post.id },
      include: { translations: true, categories: true, tags: true },
    });
    const isolated = {
      $transaction: (run, options) =>
        db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
          return run(tx);
        }, options),
    };
    const result = await migrateResourcePaths(isolated);
    assert.deepEqual(result, { status: 'applied', paths: 4, references: 4 });
    assert.deepEqual(await migrateResourcePaths(isolated), {
      status: 'already-applied',
    });
    const changes = await db.resourcePathChange.findMany();
    assert.equal(changes.length, 4);
    for (const row of changes)
      assert.match(
        row.newSlug,
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[A-Za-z0-9]{8}$/,
      );
    const paths = new Map(
      changes.map((row) => [
        `/${row.kind}/${row.oldSlug}`,
        `/${row.kind}/${row.newSlug}`,
      ]),
    );
    const rewritten = rewriteResourceLinks(content, paths);
    assert.ok(rewritten.includes('https://example.test/posts/old-post'));
    assert.ok(rewritten.includes('`[sample](/posts/old-post)`'));
    assert.ok(rewritten.includes('[code](/posts/old-post)'));
    assert.ok(rewritten.includes(`[r]: ${paths.get('/pages/old-page')}`));
    const migratedSettings = await db.siteSetting.findUnique({
      where: { key: 'homepage' },
    });
    assert.deepEqual(migratedSettings.value, {
      ...settings.value,
      link: paths.get('/pages/old-page') + '#intro',
    });
    assert.deepEqual(migratedSettings.updatedAt, settings.updatedAt);
    const after = await db.post.findUnique({
      where: { id: post.id },
      include: { translations: true, categories: true, tags: true },
    });
    assert.deepEqual(after.categories, before.categories);
    assert.deepEqual(after.tags, before.tags);
    assert.equal(after.authorId, before.authorId);
    assert.deepEqual(after.updatedAt, before.updatedAt);
    for (const row of before.translations)
      assert.deepEqual(
        after.translations.find((entry) => entry.locale === row.locale),
        { ...row, content: rewriteResourceLinks(row.content, paths) },
      );
    const laterDate = new Date('2026-01-02T03:04:05.456Z');
    await db.postTranslation.update({
      where: { postId_locale: { postId: post.id, locale: 'zh' } },
      data: { title: 'A later title', updatedAt: laterDate },
    });
    // Never erase content edited after migration during rollback.
    await db.momentTranslation.update({
      where: { momentId_locale: { momentId: moment.id, locale: 'zh' } },
      data: { content: 'A later edit' },
    });
    assert.deepEqual(await migrateResourcePaths(isolated, true), {
      status: 'rolled-back',
      paths: 4,
      skippedReferences: 1,
    });
    assert.deepEqual(
      await db.post.findUnique({
        where: { id: post.id },
        include: { translations: true, categories: true, tags: true },
      }),
      {
        ...before,
        translations: before.translations.map((row) =>
          row.locale === 'zh'
            ? { ...row, title: 'A later title', updatedAt: laterDate }
            : row,
        ),
      },
    );
    assert.equal(
      (await db.page.findUnique({ where: { id: page.id } })).slug,
      'old-page',
    );
    assert.equal(
      (
        await db.momentTranslation.findUnique({
          where: { momentId_locale: { momentId: moment.id, locale: 'zh' } },
        })
      ).content,
      'A later edit',
    );
    assert.deepEqual(await migrateResourcePaths(isolated, true), {
      status: 'nothing-to-rollback',
    });
    await assert.rejects(migrateResourcePaths(isolated), /rolled back/);
    assert.deepEqual(
      await db.siteSetting.findUnique({ where: { key: 'homepage' } }),
      settings,
    );
    let attempts = 0;
    const retried = await createWithResourcePath((slug) =>
      db.tag.create({ data: { slug: ++attempts === 1 ? 'old-tag' : slug } }),
    );
    assert.equal(attempts, 2);
    assert.match(retried.slug, /^[A-Za-z0-9]{8}$/);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (db) await db.$disconnect();
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
});
