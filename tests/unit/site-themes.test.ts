import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAppearance } from '../../packages/content/src/types';
import {
  resolveSiteTheme,
  siteThemeCss,
  siteThemes,
} from '../../apps/frontend/app/themes/registry';

test('legacy and unavailable themes keep the default CSS without stale overrides', () => {
  assert.equal(defaultAppearance.themeId, 'default');
  for (const id of [undefined, null, '', 'removed-theme', '<style>', {}]) {
    assert.equal(resolveSiteTheme(id).id, 'default');
    assert.equal(siteThemeCss(id, false), '');
    assert.equal(siteThemeCss(id, true), '');
  }
  assert.notEqual(siteThemeCss('soft-preview', false), '');
  assert.notEqual(
    siteThemeCss('soft-preview', false),
    siteThemeCss('soft-preview', true),
  );
  assert.equal(siteThemeCss('default', false), '');
  assert.equal(siteThemeCss('default', true), '');
});

test('registered themes have unique safe IDs and cannot override reader or media settings', () => {
  assert.equal(
    new Set(siteThemes.map((theme) => theme.id)).size,
    siteThemes.length,
  );
  for (const theme of siteThemes) {
    assert.match(theme.id, /^[a-z][a-z0-9-]{0,47}$/);
    for (const palette of [theme.light, theme.dark]) {
      for (const token of Object.keys(palette)) {
        assert.ok(!/font|pattern|avatar|cover|url|navigation/.test(token));
      }
    }
  }
});
