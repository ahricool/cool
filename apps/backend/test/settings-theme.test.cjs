require('reflect-metadata');
/* global structuredClone */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const {
  SettingsController,
  defaultSettings,
  readSettings,
} = require('../dist/settings');

function memoryDatabase(initial) {
  const rows = new Map(Object.entries(structuredClone(initial)));
  return {
    siteSetting: {
      findMany: async () => [...rows].map(([key, value]) => ({ key, value })),
      upsert: async ({ where, create, update }) => {
        rows.set(
          where.key,
          structuredClone(rows.has(where.key) ? update.value : create.value),
        );
      },
    },
    $transaction: (writes) => Promise.all(writes),
  };
}

test('theme selection roundtrips and old clients preserve independent appearance and images', async () => {
  const initial = structuredClone(defaultSettings);
  initial.site.appearance = {
    themeId: 'soft-preview',
    font: 'bubble-candy',
    fontSize: 150,
    avatar: 'star',
    cover: 'heart',
    background: 'none',
  };
  initial.homepage.coverUrl = '/api/v1/media/fixture.webp';
  const db = memoryDatabase(initial);
  const controller = new SettingsController(db);
  const legacy = structuredClone(initial);
  delete legacy.site.appearance.themeId;
  await controller.save(legacy);
  assert.deepEqual(await readSettings(db), initial);
  const next = structuredClone(initial);
  next.site.appearance.themeId = 'default';
  await controller.save(next);
  assert.deepEqual(await readSettings(db), next);
  const savedAppearance = structuredClone(next.site.appearance);
  delete next.site.appearance;
  await controller.save(next);
  assert.deepEqual((await readSettings(db)).site.appearance, savedAppearance);
});

test('legacy settings gain the default ID on read without rewriting data', async () => {
  const legacy = structuredClone(defaultSettings);
  delete legacy.site.appearance.themeId;
  const db = memoryDatabase(legacy);
  assert.equal((await readSettings(db)).site.appearance.themeId, 'default');
  const rows = await db.siteSetting.findMany();
  assert.equal(
    rows.find((row) => row.key === 'site').value.appearance.themeId,
    undefined,
  );
});

test('actual settings DTO accepts safe IDs and rejects invalid values', async () => {
  const metatype = Reflect.getMetadata(
    'design:paramtypes',
    SettingsController.prototype,
    'save',
  )[0];
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  for (const id of ['default', 'soft-preview', 'removed-theme', undefined]) {
    const body = structuredClone(defaultSettings);
    body.site.appearance.themeId = id;
    await pipe.transform(body, { type: 'body', metatype });
  }
  for (const id of [
    null,
    2,
    '',
    'UPPERCASE',
    'x'.repeat(49),
    'url(/external.css)',
    '<script>',
  ]) {
    const body = structuredClone(defaultSettings);
    body.site.appearance.themeId = id;
    await assert.rejects(pipe.transform(body, { type: 'body', metatype }));
  }
});
