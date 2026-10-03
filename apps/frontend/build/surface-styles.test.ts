import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import surfaceStyles from './surface-styles';

async function transform(css: string, from = '/app/assets/blog/test.css') {
  return postcss([surfaceStyles()]).process(css, { from });
}

test('scopes resets and complex comma lists without changing their specificity', async () => {
  const result = await transform(
    'body, a:is(.one, .two), [data-label="one,two"] > button:hover { color: red }',
  );
  const firstRule = result.root.first;
  assert.ok(firstRule?.type === 'rule');
  const selectors = selectorParser().astSync(firstRule.selector);
  assert.equal(selectors.nodes.length, 3);
  selectors.each((selector) => {
    assert.equal(selector.first.type, 'pseudo');
    assert.equal(selector.first.value, ':where');
    assert.equal(
      selector.first.toString(),
      ":where(html[data-surface='blog'])",
    );
  });
  assert.match(result.css, /a:is\(\.one, \.two\)/);
  assert.match(result.css, /\[data-label="one,two"\] > button:hover/);
});

test('constrains html, :root and root dark compounds rather than their descendants', async () => {
  const result = await transform(
    'html, :root, html.dark:root, .dark .notice { color: red }',
  );
  assert.match(result.css, /html:where\(\[data-surface='blog'\]\)/);
  assert.match(result.css, /:root:where\(\[data-surface='blog'\]\)/);
  assert.match(result.css, /html.dark:root:where\(\[data-surface='blog'\]\)/);
  assert.match(result.css, /\.dark:where\(\[data-surface='blog'\]\) \.notice/);
});

test('places a root constraint before pseudo-elements, including legacy syntax', async () => {
  const result = await transform(
    'html::before, html:after, .dark::selection { color: red }',
  );
  assert.match(result.css, /html:where\(\[data-surface='blog'\]\)::before/);
  assert.match(result.css, /html:where\(\[data-surface='blog'\]\):after/);
  assert.match(
    result.css,
    /\.dark:where\(\[data-surface='blog'\]\)::selection/,
  );
});

test('scopes rules inside media queries but leaves animation steps unchanged', async () => {
  const result = await transform(`
    @media (max-width: 600px) { body { color: red } }
    @keyframes fade { from, 25% { opacity: 0 } to { opacity: 1 } }
    @-webkit-keyframes spin { 0% { transform: rotate(0) } 100% { transform: rotate(1turn) } }
  `);
  assert.match(result.css, /:where\(html\[data-surface='blog'\]\) body/);
  assert.match(result.css, /from, 25% \{ opacity: 0 \}/);
  assert.match(result.css, /to \{ opacity: 1 \}/);
  assert.match(result.css, /0% \{ transform: rotate\(0\) \}/);
});

test('scopes Element Plus root variables and teleported overlay selectors to admin', async () => {
  const result = await transform(
    ':root { --el-color-primary: blue } .el-overlay, .el-popper { color: red }',
    '/app/node_modules/element-plus/dist/index.css',
  );
  assert.match(result.css, /:root:where\(\[data-surface='admin'\]\)/);
  assert.match(
    result.css,
    /:where\(html\[data-surface='admin'\]\) \.el-overlay/,
  );
  assert.match(
    result.css,
    /:where\(html\[data-surface='admin'\]\)\s+\.el-popper/,
  );
});

test('normalizes Windows paths and keeps shared tokens, fonts and other styles global', async () => {
  const result = await transform(
    'body { margin: 0 }',
    'C:\\app\\assets\\admin\\style.css',
  );
  assert.match(result.css, /data-surface='admin'/);
  for (const from of [
    '/app/assets/tokens.css',
    '/app/node_modules/@fontsource/ubuntu/index.css',
    '/app/components/Widget.vue',
  ]) {
    const source = ':root { --shared: red } .shared { color: var(--shared) }';
    assert.equal((await transform(source, from)).css, source);
  }
});

test('uses each imported rule source rather than only the parent stylesheet source', async () => {
  const root = postcss.root();
  root.append(
    postcss.parse('body { color: red }', {
      from: '/app/assets/blog/theme.css',
    }),
  );
  root.append(
    postcss.parse('body { color: blue }', {
      from: '/app/assets/admin/style.css',
    }),
  );
  const result = await postcss([surfaceStyles()]).process(root, {
    from: '/app/combined.css',
  });
  assert.match(result.css, /data-surface='blog'/);
  assert.match(result.css, /data-surface='admin'/);
});

test('owned public styles and Element Plus remain isolated', async () => {
  const files = [
    ['../app/assets/blog/base.css', 'blog'],
    ['../app/assets/blog/shell.css', 'blog'],
    ['../app/assets/blog/content.css', 'blog'],
    ['../app/assets/admin/shell.css', 'admin'],
    ['../app/assets/admin/workspace.css', 'admin'],
    ['../app/assets/admin/editor.css', 'admin'],
    ['../app/assets/admin/login.css', 'admin'],
    ['../../../node_modules/element-plus/dist/index.css', 'admin'],
  ];
  for (const [relativePath, surface] of files) {
    const url = new URL(relativePath!, import.meta.url);
    const css = await readFile(url, 'utf8');
    const result = await transform(css, url.pathname);
    let scoped = 0;
    result.root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name))
        return;
      selectorParser((selectors) => {
        selectors.each((selector) => {
          assert.ok(
            selector.toString().includes(`data-surface='${surface}'`),
            selector.toString(),
          );
          scoped++;
        });
      }).processSync(rule.selector);
    });
    assert.ok(scoped > 10, `Expected a complete stylesheet: ${relativePath}`);
  }
});
