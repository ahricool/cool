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

test('Ury nested saves preserve omitted profiles and partial fields across real DTO roundtrips', async () => {
  const initial = structuredClone(defaultSettings);
  initial.site.appearance.ury = {
    palette: 'sepia',
    font: 'serif',
    fontSize: 125,
    readingWidth: 'wide',
    showAvatar: false,
    showCovers: true,
  };
  const db = memoryDatabase(initial);
  const controller = new SettingsController(db);
  for (const omitted of ['ury', 'appearance']) {
    const body = structuredClone(initial);
    if (omitted === 'ury') delete body.site.appearance.ury;
    else delete body.site.appearance;
    await controller.save(await transformSettings(body));
    assert.deepEqual(
      (await readSettings(db)).site.appearance,
      initial.site.appearance,
    );
  }
  const partial = structuredClone(initial);
  partial.site.appearance.ury = { palette: 'dark' };
  await controller.save(await transformSettings(partial));
  const saved = await readSettings(db);
  assert.deepEqual(saved.site.appearance, {
    ...initial.site.appearance,
    ury: { ...initial.site.appearance.ury, palette: 'dark' },
  });
  await controller.save(await transformSettings(saved));
  assert.deepEqual(await readSettings(db), saved);
});

test('Ury rejects arrays, malformed objects and invalid fields before saving', async () => {
  for (const ury of [
    null,
    [],
    [{ palette: 'sepia' }],
    { palette: 'pink' },
    { font: 'remote' },
    { fontSize: 79 },
    { fontSize: 151 },
    { fontSize: 100.5 },
    { showAvatar: 'true' },
    { showCovers: null },
    { readingWidth: 'other' },
    { url: 'bad' },
  ]) {
    const body = structuredClone(defaultSettings);
    body.site.appearance.ury = ury;
    await assert.rejects(transformSettings(body));
  }
});

test('settings object boundaries reject nonobjects before any database writes', async () => {
  const initial = structuredClone(defaultSettings);
  initial.site.appearance.themeId = 'ury';
  initial.site.appearance.ury = { palette: 'sepia', fontSize: 125 };
  const db = memoryDatabase(initial);
  const controller = new SettingsController(db);
  let writes = 0;
  const upsert = db.siteSetting.upsert;
  db.siteSetting.upsert = async (args) => {
    writes++;
    return upsert(args);
  };
  const saveRequest = async (body) =>
    controller.save(await transformSettings(body));
  await saveRequest(structuredClone(initial));
  assert.equal(
    writes,
    2,
    'a valid transformed request reaches the normal save path',
  );
  writes = 0;
  const before = structuredClone(await db.siteSetting.findMany());
  for (const path of ['site', 'homepage', 'site.appearance']) {
    const valid =
      path === 'site.appearance' ? initial.site.appearance : initial[path];
    for (const value of [
      [],
      [structuredClone(valid)],
      null,
      'invalid',
      42,
      false,
    ]) {
      const body = structuredClone(initial);
      if (path === 'site.appearance') body.site.appearance = value;
      else body[path] = value;
      await assert.rejects(saveRequest(body), { status: 400 });
      assert.equal(writes, 0, `${path} must fail before the controller writes`);
      assert.deepEqual(
        await db.siteSetting.findMany(),
        before,
        `${path} rejection cannot rewrite existing JSON`,
      );
    }
  }
  for (const key of ['site', 'homepage']) {
    const body = structuredClone(initial);
    delete body[key];
    await assert.rejects(saveRequest(body), { status: 400 });
  }
  assert.equal(writes, 0);
  assert.deepEqual(await db.siteSetting.findMany(), before);
});
