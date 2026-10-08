import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { defaultAppearance } from '../../packages/content/src/types';
import {
  resolveSiteTheme,
  resolveThemeColorMode,
  siteThemes,
} from '../../apps/frontend/app/themes/registry';
import { publicPages } from '../../apps/frontend/app/themes/types';

test('missing, retired and invalid IDs safely resolve to the stable Sakura ID', () => {
  assert.equal(defaultAppearance.themeId, 'default');
  for (const id of [
    undefined,
    null,
    '',
    'soft-preview',
    'removed-theme',
    '<style>',
    {},
  ]) {
    assert.equal(resolveSiteTheme(id).id, 'default');
  }
  assert.equal(resolveSiteTheme('minimal').id, 'minimal');
});

test('every theme declares independent entries, errors, assets and all public pages', () => {
  assert.equal(
    new Set(siteThemes.map((theme) => theme.id)).size,
    siteThemes.length,
  );
  for (const theme of siteThemes) {
    assert.match(theme.id, /^[a-z][a-z0-9-]{0,47}$/);
    assert.deepEqual(Object.keys(theme.pages), [...publicPages]);
    assert.equal(typeof theme.entry, 'function');
    assert.equal(typeof theme.error, 'function');
    assert.equal('light' in theme, false);
    for (const key of publicPages) {
      assert.equal(typeof theme.pages[key], 'function');
      assert.notEqual(
        theme.pages[key],
        siteThemes.find((other) => other.id !== theme.id)!.pages[key],
      );
    }
  }
  assert.notEqual(siteThemes[0].assets.icon, siteThemes[1].assets.icon);
});

test('Minimal owns its visual tree and does not import Sakura, Admin or shared visual components', async () => {
  const root = new URL(
    '../../apps/frontend/app/themes/minimal/',
    import.meta.url,
  );
  for (const file of await readdir(root, { recursive: true })) {
    if (!/\.(vue|css)$/.test(file)) continue;
    const source = await readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(
      source,
      /sakura|features\/admin|~\/components|--sakura/iu,
      file,
    );
  }
});

test('a theme may support just one palette without changing the saved reader preference', () => {
  assert.equal(
    resolveThemeColorMode({ colorModes: ['light'] }, 'dark'),
    'light',
  );
  assert.equal(
    resolveThemeColorMode({ colorModes: ['dark'] }, 'light'),
    'dark',
  );
  assert.equal(
    resolveThemeColorMode({ colorModes: ['light', 'dark'] }, 'dark'),
    'dark',
  );
});

test('themes resolve only their owned settings without mutating saved profiles', () => {
  const saved = structuredClone(defaultAppearance);
  saved.font = 'bubble-candy';
  saved.fontSize = 150;
  saved.ury = {
    palette: 'sepia',
    font: 'serif',
    fontSize: 80,
    readingWidth: 'wide',
    showAvatar: true,
    showCovers: false,
  };
  const before = structuredClone(saved);
  assert.deepEqual(resolveSiteTheme('sakura').appearance.resolve(saved, null), {
    font: 'bubble-candy',
    fontSize: 150,
    palette: 'light',
  });
  assert.deepEqual(
    resolveSiteTheme('minimal').appearance.resolve(saved, 'dark'),
    { font: 'system', fontSize: 100, palette: 'dark' },
  );
  const ury = resolveSiteTheme('ury').appearance;
  assert.deepEqual(ury.resolve(saved, null), {
    font: 'serif',
    fontSize: 80,
    palette: 'sepia',
    attributes: { 'data-ury-palette': 'sepia', 'data-ury-width': 'wide' },
  });
  for (const palette of ['light', 'sepia', 'dark'])
    assert.equal(ury.resolve(saved, palette).palette, palette);
  assert.equal(ury.resolve(saved, 'invalid').palette, 'sepia');
  assert.notEqual(
    ury.readerCookie,
    resolveSiteTheme('sakura').appearance.readerCookie,
  );
  assert.deepEqual(saved, before);
});

test('Ury owns visuals and shared head delegates appearance without theme-ID branches', async () => {
  const root = new URL('../../apps/frontend/app/themes/ury/', import.meta.url);
  for (const file of await readdir(root, { recursive: true })) {
    if (!/\.(vue|css)$/.test(file)) continue;
    assert.doesNotMatch(
      await readFile(new URL(file, root), 'utf8'),
      /sakura|themes\/minimal|features\/admin|~\/components|--sakura/iu,
      file,
    );
  }
  const head = await readFile(
    new URL(
      '../../apps/frontend/app/composables/useSiteAppearanceHead.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.doesNotMatch(head, /useUryAppearance|id\s*===|theme\.value\.id\s*===/);
  assert.match(head, /theme\.value\.appearance\.resolve/);
});
