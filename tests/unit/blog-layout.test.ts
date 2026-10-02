import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { socialIcon } from '../../apps/blog/app/utils/social-icon';
import { masonryPositions } from '../../apps/blog/app/utils/masonry';

test('social artwork matches exact or subdomain host and always remains local', () => {
  const samples = [
    ['https://github.com/person', 'github.png'],
    ['https://space.bilibili.com/1', 'bilibili.png'],
    ['https://music.163.com/#/user/home?id=1', 'wangyiyun.png'],
    ['https://github.com.evil.test/', 'heart.png'],
    ['not a url', 'heart.png'],
    ['https://unknown.example/', 'heart.png'],
  ];
  for (const [url, icon] of samples) {
    assert.equal(socialIcon(url), `/sakura/images/sns/${icon}`);
    assert.ok(
      existsSync(resolve('apps/blog/public', socialIcon(url).slice(1))),
    );
  }
});
test('masonry preserves order and places the next image in the shortest column', () => {
  const result = masonryPositions([300, 100, 200, 150, 90], 920, 3);
  assert.deepEqual(result.items, [
    { left: 0, top: 0 },
    { left: 310, top: 0 },
    { left: 620, top: 0 },
    { left: 310, top: 110 },
    { left: 620, top: 210 },
  ]);
  assert.equal(result.height, 300);
});
test('mobile masonry forms one uncropped column, including empty galleries', () => {
  assert.deepEqual(masonryPositions([120, 240], 360, 1), {
    items: [
      { left: 0, top: 0 },
      { left: 0, top: 130 },
    ],
    height: 370,
  });
  assert.deepEqual(masonryPositions([], 360, 1), { items: [], height: 0 });
});
