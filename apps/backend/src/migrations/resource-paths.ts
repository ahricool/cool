import { Database } from '../database';
import { Prisma, ContentLocale } from '../generated/prisma/client';
import { randomResourcePath } from '../resource-paths';
import { rewriteResourceLinks, rewriteResourceUrl } from './resource-links';
const batchId = 'random-resource-paths-v1';
const tables = {
  posts: 'posts',
  pages: 'pages',
  categories: 'categories',
  tags: 'tags',
} as const;
type Kind = keyof typeof tables;
type Target = {
  kind: 'posts' | 'pages' | 'moments' | 'settings';
  id: string;
  locale?: ContentLocale;
  updatedAt: string;
};
async function changeReference(
  tx: Prisma.TransactionClient,
  target: Target,
  value: string,
) {
  const data = { content: value, updatedAt: new Date(target.updatedAt) };
  if (target.kind === 'posts')
    return tx.postTranslation.update({
      where: { postId_locale: { postId: target.id, locale: target.locale! } },
      data,
    });
  if (target.kind === 'pages')
    return tx.pageTranslation.update({
      where: { pageId_locale: { pageId: target.id, locale: target.locale! } },
      data,
    });
  if (target.kind === 'moments')
    return tx.momentTranslation.update({
      where: {
        momentId_locale: { momentId: target.id, locale: target.locale! },
      },
      data,
    });
  return tx.siteSetting.update({
    where: { key: target.id },
    data: { value: JSON.parse(value), updatedAt: new Date(target.updatedAt) },
  });
}
async function currentReference(tx: Prisma.TransactionClient, target: Target) {
  const textReference = (row: { content: string; updatedAt: Date } | null) =>
    row ? { value: row.content, updatedAt: row.updatedAt } : undefined;
  if (target.kind === 'posts')
    return textReference(
      await tx.postTranslation.findUnique({
        where: { postId_locale: { postId: target.id, locale: target.locale! } },
      }),
    );
  if (target.kind === 'pages')
    return textReference(
      await tx.pageTranslation.findUnique({
        where: { pageId_locale: { pageId: target.id, locale: target.locale! } },
      }),
    );
  if (target.kind === 'moments')
    return textReference(
      await tx.momentTranslation.findUnique({
        where: {
          momentId_locale: { momentId: target.id, locale: target.locale! },
        },
      }),
    );
  const row = await tx.siteSetting.findUnique({ where: { key: target.id } });
  return row
    ? { value: JSON.stringify(row.value), updatedAt: row.updatedAt }
    : undefined;
}
function rewriteSettings(
  value: Prisma.JsonValue,
  paths: Map<string, string>,
  key = '',
): Prisma.JsonValue {
  if (typeof value === 'string')
    return /(?:url|href|path|link)$/i.test(key)
      ? rewriteResourceUrl(value, paths)
      : value;
  if (Array.isArray(value))
    return value.map((item) => rewriteSettings(item, paths, key));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        rewriteSettings(item!, paths, name),
      ]),
    );
  return value;
}
export async function migrateResourcePaths(db: Database, rollback = false) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(732020)`;
      await tx.$executeRawUnsafe(
        'LOCK TABLE posts, pages, categories, tags, post_translations, page_translations, moments, moment_translations, site_settings IN EXCLUSIVE MODE',
      );
      const batch = await tx.resourcePathBatch.findUnique({
        where: { id: batchId },
      });
      if (rollback) {
        if (!batch?.completedAt || batch.rolledBackAt)
          return { status: 'nothing-to-rollback' };
        const changes = await tx.resourcePathChange.findMany({
          where: { batchId },
        });
        for (const change of changes) {
          const table = tables[change.kind as Kind];
          const rows = await tx.$queryRaw<{ id: string; slug: string }[]>(
            Prisma.sql`SELECT id,slug FROM ${Prisma.raw(table)} WHERE id=${change.resourceId}::uuid OR slug=${change.oldSlug}`,
          );
          const current = rows.find((row) => row.id === change.resourceId);
          if (
            current &&
            (current.slug !== change.newSlug ||
              rows.some((row) => row.id !== change.resourceId))
          )
            throw new Error(
              `Cannot safely roll back ${change.kind}/${change.resourceId}: changed or occupied path`,
            );
        }
        let skippedReferences = 0;
        const references = await tx.resourceReferenceChange.findMany({
          where: { batchId },
        });
        for (const reference of references) {
          const target = reference.target as unknown as Target;
          const current = await currentReference(tx, target);
          if (current?.value !== reference.afterValue) {
            skippedReferences++;
            continue;
          }
          await changeReference(
            tx,
            { ...target, updatedAt: current.updatedAt.toISOString() },
            reference.beforeValue,
          );
        }
        for (const change of changes)
          await tx.$executeRaw(
            Prisma.sql`UPDATE ${Prisma.raw(tables[change.kind as Kind])} SET slug=${change.oldSlug} WHERE id=${change.resourceId}::uuid`,
          );
        await tx.resourcePathBatch.update({
          where: { id: batchId },
          data: { rolledBackAt: new Date() },
        });
        return {
          status: 'rolled-back',
          paths: changes.length,
          skippedReferences,
        };
      }
      if (batch?.rolledBackAt)
        throw new Error(
          'Resource path migration was rolled back; restore the previous application before deployment',
        );
      if (batch?.completedAt) return { status: 'already-applied' };
      await tx.resourcePathBatch.upsert({
        where: { id: batchId },
        create: { id: batchId },
        update: {},
      });
      const paths = new Map<string, string>();
      let changed = 0;
      for (const kind of Object.keys(tables) as Kind[]) {
        const rows = await tx.$queryRaw<{ id: string; slug: string }[]>(
          Prisma.sql`SELECT id,slug FROM ${Prisma.raw(tables[kind])} ORDER BY id`,
        );
        const used = new Set(rows.map((row) => row.slug));
        for (const row of rows) {
          let slug: string;
          do {
            slug = randomResourcePath();
          } while (used.has(slug));
          used.add(slug);
          await tx.resourcePathChange.create({
            data: {
              batchId,
              kind,
              resourceId: row.id,
              oldSlug: row.slug,
              newSlug: slug,
            },
          });
          await tx.$executeRaw(
            Prisma.sql`UPDATE ${Prisma.raw(tables[kind])} SET slug=${slug} WHERE id=${row.id}::uuid`,
          );
          paths.set(`/${kind}/${row.slug}`, `/${kind}/${slug}`);
          changed++;
        }
      }
      async function record(target: Target, before: string, after: string) {
        if (before === after) return;
        const recordKey = `${target.kind}:${target.id}:${target.locale ?? ''}`;
        await tx.resourceReferenceChange.create({
          data: {
            batchId,
            recordKey,
            target,
            beforeValue: before,
            afterValue: after,
          },
        });
        await changeReference(tx, target, after);
      }
      for (const row of await tx.postTranslation.findMany())
        await record(
          {
            kind: 'posts',
            id: row.postId,
            locale: row.locale,
            updatedAt: row.updatedAt.toISOString(),
          },
          row.content,
          rewriteResourceLinks(row.content, paths),
        );
      for (const row of await tx.pageTranslation.findMany())
        await record(
          {
            kind: 'pages',
            id: row.pageId,
            locale: row.locale,
            updatedAt: row.updatedAt.toISOString(),
          },
          row.content,
          rewriteResourceLinks(row.content, paths),
        );
      for (const row of await tx.momentTranslation.findMany())
        await record(
          {
            kind: 'moments',
            id: row.momentId,
            locale: row.locale,
            updatedAt: row.updatedAt.toISOString(),
          },
          row.content,
          rewriteResourceLinks(row.content, paths),
        );
      for (const row of await tx.siteSetting.findMany({
        where: { key: { in: ['site', 'homepage'] } },
      }))
        await record(
          {
            kind: 'settings',
            id: row.key,
            updatedAt: row.updatedAt.toISOString(),
          },
          JSON.stringify(row.value),
          JSON.stringify(rewriteSettings(row.value, paths)),
        );
      await tx.resourcePathBatch.update({
        where: { id: batchId },
        data: { completedAt: new Date() },
      });
      return {
        status: 'applied',
        paths: changed,
        references: await tx.resourceReferenceChange.count({
          where: { batchId },
        }),
      };
    },
    { maxWait: 30_000, timeout: 300_000 },
  );
}
if (require.main === module) {
  const db = new Database();
  migrateResourcePaths(db, process.argv.includes('--rollback'))
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
