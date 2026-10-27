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
    'minimal',
    'soft-preview',
    'removed-theme',
    '<style>',
    {},
  ]) {
    assert.equal(resolveSiteTheme(id).id, 'default');
  }
  assert.deepEqual(
    siteThemes.map((theme) => theme.id),
    ['default', 'ury'],
  );
  assert.equal(resolveSiteTheme('sakura'), resolveSiteTheme('default'));
  assert.equal(resolveSiteTheme('ury').id, 'ury');
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
  // Ury draws no logo of its own and uses the site mark; every icon is a public SVG.
  for (const theme of siteThemes)
    assert.match(theme.assets.icon, /^\/[\w/-]+\.svg$/);
  assert.doesNotMatch(
    siteThemes.map((theme) => theme.assets.icon).join(' '),
    /mark\.svg/,
  );
});

test('both themes own their visual trees without importing another theme or Admin visuals', async () => {
  for (const theme of siteThemes) {
    const root = new URL(
      `../../apps/frontend/app/themes/${theme.directory}/`,
      import.meta.url,
    );
    const other = siteThemes.find((entry) => entry.id !== theme.id)!;
    for (const file of await readdir(root, { recursive: true })) {
      if (!/\.(vue|css|ts)$/.test(file)) continue;
      const source = await readFile(new URL(file, root), 'utf8');
      assert.doesNotMatch(
        source,
        new RegExp(
          `themes/${other.directory}|\\.\\./${other.directory}/|features/admin|~/components|--${other.directory}`,
          'iu',
        ),
        `${theme.directory}/${file}`,
      );
    }
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
  saved.themeId = 'minimal';
  saved.font = 'bubble-candy';
  saved.fontSize = 150;
  saved.ury = {
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
    { font: 'bubble-candy', fontSize: 150, palette: 'dark' },
  );
  // Ury is always serif and leaves light/dark to the device; no reader choice.
  const ury = resolveSiteTheme('ury').appearance;
  const resolved = {
    font: 'serif',
    fontSize: 80,
    palette: 'system',
    attributes: { 'data-ury-width': 'wide' },
  };
  assert.deepEqual(ury.resolve(saved, null), resolved);
  for (const preference of ['light', 'dark', 'sepia'])
    assert.deepEqual(ury.resolve(saved, preference), resolved);
  // Retired palette/font values in old JSON are ignored.
  assert.deepEqual(
    ury.resolve(
      {
        ...saved,
        ury: { ...saved.ury, palette: 'dark', font: 'sans' } as never,
      },
      null,
    ),
    resolved,
  );
  assert.equal(ury.readerCookie, undefined);
  assert.deepEqual(saved, before);
});

test('Ury owns visuals and shared head delegates appearance without theme-ID branches', async () => {
  const root = new URL('../../apps/frontend/app/themes/ury/', import.meta.url);
  for (const file of await readdir(root, { recursive: true })) {
    if (!/\.(vue|css)$/.test(file)) continue;
    assert.doesNotMatch(
      await readFile(new URL(file, root), 'utf8'),
      /sakura|features\/admin|~\/components|--sakura/iu,
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

test('Sakura navigation keeps blur regardless of the OS transparency preference', async () => {
  const styles = new URL(
    '../../apps/frontend/app/themes/sakura/styles/',
    import.meta.url,
  );
  const navigation = await readFile(new URL('navigation.css', styles), 'utf8');
  const shell = await readFile(new URL('shell.css', styles), 'utf8');
  const tokens = await readFile(new URL('tokens.css', styles), 'utf8');

  // The solid surface and its companion banner text override must stay removed.
  assert.doesNotMatch(navigation + shell, /prefers-reduced-transparency/);
  assert.match(tokens, /--navigation-blur-radius:\s*18px/);
  assert.match(
    navigation,
    /-webkit-backdrop-filter:\s*blur\(var\(--navigation-blur-radius\)\)/,
  );
  assert.match(
    navigation,
    /\sbackdrop-filter:\s*blur\(var\(--navigation-blur-radius\)\)/,
  );
  assert.match(navigation, /background:\s*#00000014/);
  assert.match(
    navigation,
    /@supports\s*\(\s*\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\s*\)\s*\{\s*\.navigation-surface::before\s*\{\s*background: transparent;/,
  );
  assert.match(navigation, /prefers-reduced-motion:\s*reduce/);
  assert.match(shell, /prefers-reduced-motion:\s*reduce/);

  const admin = await readFile(
    new URL(
      '../../apps/frontend/app/assets/admin/navigation.css',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(admin, /prefers-reduced-transparency:\s*reduce/);
});
