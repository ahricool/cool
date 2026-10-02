/** Sakura's shortest-column masonry placement, using its original 10px gutter. */
export function masonryPositions(
  heights: number[],
  width: number,
  columns: number,
  gap = 10,
) {
  const count = Math.max(1, Math.floor(columns));
  const columnWidth = Math.max(0, (width - gap * (count - 1)) / count);
  const bottoms = Array<number>(count).fill(0);
  const items = heights.map((height) => {
    const top = Math.min(...bottoms);
    const column = bottoms.indexOf(top);
    bottoms[column] = top + Math.max(0, height) + gap;
    return { left: column * (columnWidth + gap), top };
  });
  return { items, height: heights.length ? Math.max(...bottoms) - gap : 0 };
}
