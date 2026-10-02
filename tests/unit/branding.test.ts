import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { defaultSite, defaultHomepage } from '../../packages/content/src/types';
import { LOCALE_STORAGE_KEY } from '../../apps/frontend/app/i18n/locale';
import { translate } from '../../apps/frontend/app/i18n/messages';
import { SESSION_COOKIE } from '../../apps/backend/src/auth.constants';

test('Cool is the default product name in both interface languages', () => {
  assert.equal(defaultSite.title, 'Cool');
  assert.equal(defaultHomepage.greeting, 'Hi, Cool!');
  assert.equal(LOCALE_STORAGE_KEY, 'cool.locale');
  assert.equal(SESSION_COOKIE, 'cool_session');
  assert.equal(translate('由 Cool 驱动', {}, 'zh'), '由 Cool 驱动');
  assert.equal(translate('由 Cool 驱动', {}, 'en'), 'Powered by Cool');
  assert.equal(translate('创作工作台', {}, 'en'), 'Creative workspace');
  assert.equal(translate('Cool 首页', {}, 'en'), 'Cool homepage');
});

test('workspace manifests and lockfile agree on the cool namespace', async () => {
  const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
  const root = await json('package.json');
  const lock = await json('package-lock.json');
  assert.equal(root.name, 'cool');
  assert.equal(lock.name, root.name);
  assert.equal(lock.packages[''].name, root.name);
  for (const [path, name] of [
    ['apps/backend', '@cool/backend'],
    ['apps/frontend', '@cool/frontend'],
    ['packages/content', '@cool/content'],
  ]) {
    assert.equal((await json(`${path}/package.json`)).name, name);
    assert.equal(lock.packages[path].name, name);
    assert.deepEqual(lock.packages[`node_modules/${name}`], {
      resolved: path,
      link: true,
    });
  }
});
