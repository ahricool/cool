import { test } from 'node:test';
import assert from 'node:assert/strict';
import { masonryPositions } from '../../apps/frontend/app/utils/masonry';

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
