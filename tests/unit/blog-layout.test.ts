import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPatternTile,
  patternColors,
} from '../../apps/frontend/app/utils/sakura-pattern';
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

test('decorative pattern remains stable and repeats seamlessly across its grid boundaries', () => {
  const tile = createPatternTile({
    shape: 'heart',
    spacing: 72,
    size: 15,
    seed: 'spring',
  });
  assert.deepEqual(createPatternTile({ seed: 'spring' }), tile);
  assert.notDeepEqual(createPatternTile({ seed: 'summer' }), tile);
  for (const shape of ['heart', 'star', 'dot'] as const) {
    const selected = createPatternTile({ shape });
    assert.equal(selected.shape, shape);
    assert.equal(selected.size, shape === 'dot' ? 15 : 19.5);
    assert.ok(selected.marks.every((mark) => mark.shape === shape));
  }
  assert.equal(tile.size, 15 * 1.3);
  const centers = (size: number) =>
    createPatternTile({ size }).marks.map(({ x, y }) => ({ x, y }));
  assert.deepEqual(centers(15), centers(10));
  assert.equal(patternColors.length, 8);
  assert.deepEqual(
    new Set(tile.marks.map((mark) => mark.color)),
    new Set(patternColors),
  );

  assert.ok(
    createPatternTile({ shape: 'dot', colors: ['#ffb6d1'] }).marks.every(
      (mark) => mark.shape === 'dot' && mark.color === '#ffb6d1',
    ),
  );
  const edges = tile.marks.filter((mark) => mark.x === 0);
  assert.ok(edges.length > 0);
  for (const edge of edges) {
    const opposite = tile.marks.find(
      (mark) => mark.x === tile.width && mark.y === edge.y,
    )!;
    assert.equal(opposite.shape, edge.shape);
    assert.equal(opposite.color, edge.color);
  }
  const first = tile.marks.find((mark) => mark.key === '0-0')!;
  const nextRow = tile.marks.find((mark) => mark.key === '1-0')!;
  assert.equal(nextRow.x - first.x, nextRow.y - first.y);
  const rows = [...new Set(tile.marks.map((mark) => mark.y))];
  assert.equal(tile.height - rows.at(-1)! + rows[0]!, rows[1]! - rows[0]!);
  assert.ok(
    tile.marks.every(
      (mark) =>
        mark.y >= tile.size / 2 && mark.y + tile.size / 2 <= tile.height,
    ),
  );
});
