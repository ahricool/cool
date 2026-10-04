import type { PatternShape } from '@cool/content';
export type { PatternShape } from '@cool/content';
export const patternColors = [
  '#f1a5a5',
  '#f2a5ce',
  '#f4bd90',
  '#fae47e',
  '#93d89e',
  '#91dad5',
  '#98bdf0',
  '#cba5ef',
] as const;
export interface PatternOptions {
  shape?: PatternShape;
  colors?: readonly string[];
  spacing?: number;
  /** Base size; hearts/stars use 1.5×, dots 1×, bounded to half the spacing. */
  size?: number;
  seed?: string | number;
}

/** One small repeat tile; half-step rows place neighboring motifs on 45° diagonals. */
export function createPatternTile(options: PatternOptions = {}) {
  const spacing = Math.max(24, Math.min(240, options.spacing ?? 72));
  const shape = options.shape ?? 'heart';
  const size = Math.max(
    2,
    Math.min(spacing / 2, (options.size ?? 15) * (shape === 'dot' ? 1 : 1.5)),
  );
  const colors = options.colors?.length ? options.colors : patternColors;
  let state = 2166136261;
  for (const character of String(options.seed ?? 'dream-sakura')) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  }
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  // A shuffled deck keeps all eight default colors in each repeat tile.
  const colorSlots = Array.from(
    { length: 16 },
    (_, index) => colors[index % colors.length]!,
  );
  for (let index = colorSlots.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    const color = colorSlots[index]!;
    colorSlots[index] = colorSlots[other]!;
    colorSlots[other] = color;
  }
  const width = spacing * 4;
  const height = spacing * 2;
  const marks: {
    key: string;
    x: number;
    y: number;
    shape: PatternShape;
    color: string;
  }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const mark = {
        key: `${row}-${column}`,
        x: (column + 0.5 + (row % 2) / 2) * spacing,
        y: ((row + 0.5) * spacing) / 2,
        shape,
        color: colorSlots[row * 4 + column]!,
      };
      marks.push(mark);
      // Copy a straddling motif across the horizontal seam, including its color.
      if (mark.x + size / 2 > width) {
        marks.push({ ...mark, key: `${mark.key}-wrap`, x: mark.x - width });
      }
    }
  }
  return { width, height, size, shape, marks };
}
