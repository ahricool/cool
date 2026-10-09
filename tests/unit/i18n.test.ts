import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  resolveLocale,
  formatCoolDate,
  isLocale,
  publicPath,
  contentLang,
} from '../../apps/frontend/app/i18n/locale';
import { translate } from '../../apps/frontend/app/i18n/messages';

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

test('manual preference persists and missing or invalid selection defaults to Chinese', () => {
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('zh'), 'zh');
  assert.equal(resolveLocale(null), 'zh');
  assert.equal(resolveLocale('fr'), 'zh');
  assert.equal(isLocale('zh-CN'), false);
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

test('Sakura and Ury loading, error and empty states have English and unchanged Chinese copy', () => {
  for (const [zh, en] of [
    ['加载中…', 'Loading…'],
    ['加载失败', 'Unable to load content'],
    ['暂无内容', 'No content yet'],
    ['重试', 'Retry'],
  ]) {
    assert.equal(translate(zh!, {}, 'en'), en);
    assert.equal(translate(zh!, {}, 'zh'), zh);
  }
});

test('literal interface strings in Sakura and Ury have English translations', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  for (const theme of ['sakura', 'ury']) {
    const root = new URL(
      `../../apps/frontend/app/themes/${theme}/`,
      import.meta.url,
    );
    for (const file of await readdir(root, { recursive: true })) {
      if (!/\.(vue|ts)$/.test(file)) continue;
      const source = await readFile(new URL(file, root), 'utf8');
      for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) {
        const key = match[1]!;
        if (!/[\u3400-\u9fff]/u.test(key)) continue;
        assert.notEqual(
          translate(key, {}, 'en'),
          key,
          `${theme}/${file}: ${key}`,
        );
      }
    }
  }
});
