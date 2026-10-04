export type PatternShape = 'heart' | 'star' | 'dot';
export const patternShapes: readonly PatternShape[] = ['heart', 'star', 'dot'];
export const patternColors = [
  '#f2a5ce',
  '#92d6f5',
  '#93d89e',
  '#fae47e',
  '#cba5ef',
  '#f3ad99',
] as const;
export interface PatternOptions {
  shapes?: readonly PatternShape[];
  colors?: readonly string[];
  spacing?: number;
  size?: number;
  seed?: string | number;
}

/** One small repeat tile; half-step rows place neighboring motifs on 45° diagonals. */
export function createPatternTile(options: PatternOptions = {}) {
  const spacing = Math.max(24, Math.min(240, options.spacing ?? 72));
  const size = Math.max(2, Math.min(spacing / 2, options.size ?? 10));
  const shapes = options.shapes?.length ? options.shapes : patternShapes;
  const colors = options.colors?.length ? options.colors : patternColors;
  let state = 2166136261;
  for (const character of String(options.seed ?? 'dream-sakura')) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  }
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
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
        shape: shapes[Math.floor(random() * shapes.length)]!,
        color: colors[Math.floor(random() * colors.length)]!,
      };
      marks.push(mark);
      // Copy a straddling motif across the horizontal seam, including its color.
      if (mark.x + size / 2 > width) {
        marks.push({ ...mark, key: `${mark.key}-wrap`, x: mark.x - width });
      }
    }
  }
  return { width, height, size, marks };
}
