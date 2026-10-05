import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, serializeMediaGroup, mediaGroups } from '../src/index';
const id = '12345678-1234-1234-1234-123456789012';
test('concrete media groups escape labels and reject executable URLs/HTML', () => {
  const source = serializeMediaGroup({
    layout: 'grid',
    assets: [
      {
        id,
        url: `/api/v1/media/${id}.webp`,
        name: '<script>alert(1)</script>',
        mimeType: 'image/webp',
      },
      {
        id,
        url: `/api/v1/media/${id}.mp4`,
        name: 'Film',
        mimeType: 'video/mp4',
      },
    ],
  });
  const rendered = renderMarkdown(source).html;
  assert.match(rendered, /content-media-group--grid/);
  assert.match(rendered, /&lt;script&gt;/);
  assert.match(rendered, /<video controls preload="metadata"/);
  assert.doesNotMatch(rendered, /autoplay|<script>/);
  assert.equal(mediaGroups(source).length, 1);
  assert.doesNotMatch(
    renderMarkdown(
      source.replace(`/api/v1/media/${id}.webp`, 'javascript:alert(1)'),
    ).html,
    /<img|<video/,
  );
  assert.doesNotMatch(
    renderMarkdown('<img src=x onerror=alert(1)>').html,
    /<img/,
  );
  assert.match(
    renderMarkdown(`![legacy](/api/v1/media/${id}.webp)`).html,
    /<img/,
  );
});
