import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index';
test('Markdown source renders headings, TOC and highlighted code', () => {
  const { html, toc } = renderMarkdown(
    '# Hello\n\n## Hello\n\n```typescript\nconst answer = 42;\n```',
  );
  assert.deepEqual(
    toc.map((h) => h.id),
    ['heading-1', 'heading-2'],
  );
  assert.match(html, /hljs-keyword/);
  assert.match(html, /id="heading-1"/);
});
test('raw HTML, unsafe URLs and remote images cannot execute or load', () => {
  const { html } = renderMarkdown(
    '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![remote](https://evil.test/tracker.png)\n\n![local](/api/v1/media/abc-def.webp)',
  );
  assert.doesNotMatch(html, /<script|href="javascript:|src="https:/);
  assert.match(html, /src="\/api\/v1\/media\/abc-def.webp/);
});
test('tables, links and unknown code languages remain usable', () => {
  const { html } = renderMarkdown(
    '| a | b |\n|---|---|\n|1|2|\n\n[example](https://example.com)\n\n```unknown\n<script>\n```',
  );
  assert.match(html, /<table>/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /&lt;script&gt;/);
});
