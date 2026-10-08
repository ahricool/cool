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

async function transformSettings(body) {
  const metatype = Reflect.getMetadata(
    'design:paramtypes',
    SettingsController.prototype,
    'save',
  )[0];
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }).transform(body, { type: 'body', metatype });
}

test('theme selection roundtrips and old clients preserve independent appearance and images', async () => {
  const initial = structuredClone(defaultSettings);
  initial.site.appearance = {
    themeId: 'minimal',
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

test('transformed legacy DTO preserves omitted theme, font and fontSize after save', async () => {
  const initial = structuredClone(defaultSettings);
  initial.site.appearance.themeId = 'minimal';
  initial.site.appearance.font = 'bubble-candy';
  initial.site.appearance.fontSize = 150;
  const db = memoryDatabase(initial);
  const controller = new SettingsController(db);
  for (const omitted of [
    ['themeId'],
    ['themeId', 'font', 'fontSize'],
    ['appearance'],
  ]) {
    const body = structuredClone(initial);
    for (const key of omitted) {
      if (key === 'appearance') delete body.site.appearance;
      else delete body.site.appearance[key];
    }
    await controller.save(await transformSettings(body));
    assert.deepEqual(await readSettings(db), initial);
  }
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
  for (const id of [
    'default',
    'minimal',
    'soft-preview',
    'removed-theme',
    undefined,
  ]) {
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
