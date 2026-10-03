import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  detectLocale,
  resolveLocale,
  formatCoolDate,
  isLocale,
  publicPath,
  contentLang,
} from '../../apps/frontend/app/i18n/locale';
import { translate } from '../../apps/frontend/app/i18n/messages';

test('browser language detection supports simplified Chinese and English in preference order', () => {
  assert.equal(detectLocale(['zh-CN', 'en-US']), 'zh');
  assert.equal(detectLocale(['zh-Hans-SG']), 'zh');
  assert.equal(detectLocale(['zh']), 'zh');
  assert.equal(detectLocale(['en-GB', 'zh-CN']), 'en');
  assert.equal(detectLocale(['fr-FR', 'zh-SG']), 'zh');
  assert.equal(detectLocale(['zh-Hant-TW']), 'en');
  assert.equal(detectLocale(['ja-JP']), 'en');
  assert.equal(detectLocale([]), 'en');
  assert.equal(isLocale('zh-CN'), false);
  assert.equal(isLocale('zh'), true);
});
test('public links remain independent of the reader preference', () => {
  assert.equal(publicPath('/'), '/');
  assert.equal(publicPath('/posts/my-story'), '/posts/my-story');
  assert.equal(publicPath('/english'), '/english');
  assert.equal(contentLang('zh'), 'zh-CN');
});
test('UI translation interpolates plain values and preserves authored text passed as unknown keys', () => {
  assert.equal(translate('保存草稿', {}, 'en'), 'Save draft');
  assert.equal(translate('保存草稿', {}, 'zh'), '保存草稿');
  assert.equal(translate('共 {count} 篇', { count: 3 }, 'en'), '3 items');
  assert.equal(
    translate('A unique authored title', {}, 'zh'),
    'A unique authored title',
  );
  assert.equal(
    translate(
      '永久删除「{title}」？此操作无法撤销。',
      { title: '<b>my story</b>' },
      'en',
    ),
    'Permanently delete “<b>my story</b>”? This cannot be undone.',
  );
});

test('saved explicit preference overrides browser detection and invalid storage falls back safely', () => {
  assert.equal(resolveLocale('en', ['zh-CN']), 'en');
  assert.equal(resolveLocale('zh', ['en-US']), 'zh');
  assert.equal(resolveLocale('fr', ['zh-CN']), 'zh');
  assert.equal(resolveLocale(null, ['fr-FR']), 'en');
});

test('localized dates keep the Shanghai site date across UTC day and month boundaries', () => {
  assert.equal(formatCoolDate('2026-01-31T16:30:00.000Z', 'zh'), '2026/02/01');
  assert.equal(formatCoolDate('2026-01-31T16:30:00.000Z', 'en'), '02/01/2026');
  assert.equal(
    formatCoolDate('2026-01-31T16:30:00.000Z', 'en', {
      year: 'numeric',
      month: 'long',
    }),
    'February 2026',
  );
  assert.equal(formatCoolDate(null, 'en'), '');
  assert.equal(formatCoolDate('invalid', 'zh'), '');
});
