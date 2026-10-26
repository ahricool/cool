import * as THREE from 'three';
import { meadow } from './layout';

/**
 * A brook that comes down from the back-left ridges, bends around the plinth
 * through the front meadow and runs off towards the right-hand hills.
 */
const course = [
  [-62, -58],
  [-30, -26],
  [-15.5, -14],
  [-12.4, -6],
  [-12, 2],
  [-10, 10.8],
  [-2, 13.8],
  [6, 13.6],
  [12.8, 10],
  [17.5, 10.2],
  [30, 18],
  [70, 40],
] as const;

export const stream = {
  /** Typical half width of the water; it swells and narrows along the way. */
  water: 0.9,
  /** Sandy lip and grassy bank beyond the water's edge. */
  sand: 0.2,
  bank: 0.35,
};

/** Half widths across one point: water edge, sand edge, bank edge. */
export function streamEdges(width: number) {
  const water = stream.water * width;
  return {
    water,
    sand: water + stream.sand,
    bank: water + stream.sand + stream.bank,
  };
}

const curve = new THREE.CatmullRomCurve3(
  course.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'centripetal',
);
/**
 * Evenly spaced points along the brook, about half a unit apart, each with a
 * width factor: overlapping waves give wide pools and tight narrows without
 * pinching shut.
 */
export const streamPoints = curve
  .getSpacedPoints(Math.round(curve.getLength() / 0.5))
  .map(({ x, z }, i) => {
    const along = i * 0.5;
    const width = Math.max(
      0.55,
      1 +
        Math.sin(along * 0.07 + 0.7) * 0.42 +
        Math.sin(along * 0.19 + 2.1) * 0.25 +
        Math.sin(along * 0.47 + 4.0) * 0.1,
    );
    return { x, z, width };
  });

/** How far (x, z) lies outside the brook's grassy bank; negative inside it. */
export function streamClearance(x: number, z: number) {
  let best = Infinity;
  for (const point of streamPoints)
    best = Math.min(
      best,
      Math.hypot(point.x - x, point.z - z) - streamEdges(point.width).bank,
    );
  return best;
}

/**
 * Flat ribbon in three crisp strips per side (bank, sand, water), so the cel
 * look keeps hard colour edges. `flow` carries distance along the brook,
 * position across the water (0 to 1) and whether the strip is water.
 */
export function streamGeometry(colors: {
  water: THREE.Color;
  sand: THREE.Color;
  bank: THREE.Color;
}) {
  // Strip edges as multiples of each point's own half widths.
  const strips: [
    keyof ReturnType<typeof streamEdges>,
    number,
    keyof ReturnType<typeof streamEdges>,
    number,
    THREE.Color,
    number,
  ][] = [
    ['bank', -1, 'sand', -1, colors.bank, 0],
    ['sand', -1, 'water', -1, colors.sand, 0],
    ['water', -1, 'water', 1, colors.water, 1],
    ['water', 1, 'sand', 1, colors.sand, 0],
    ['sand', 1, 'bank', 1, colors.bank, 0],
  ];
  const positions: number[] = [],
    tints: number[] = [],
    flows: number[] = [],
    indices: number[] = [];
  let along = 0;
  const side = new THREE.Vector2();
  for (let i = 0; i < streamPoints.length; i++) {
    const point = streamPoints[i]!;
    const before = streamPoints[Math.max(0, i - 1)]!,
      after = streamPoints[Math.min(streamPoints.length - 1, i + 1)]!;
    side.set(-(after.z - before.z), after.x - before.x).normalize();
    if (i) along += Math.hypot(point.x - before.x, point.z - before.z);
    const edges = streamEdges(point.width);
    for (const [fromEdge, fromSide, toEdge, toSide, tint, water] of strips)
      for (const offset of [
        edges[fromEdge] * fromSide,
        edges[toEdge] * toSide,
      ]) {
        positions.push(
          point.x + side.x * offset,
          meadow.y + 0.02,
          point.z + side.y * offset,
        );
        tint.toArray(tints, tints.length);
        flows.push(along, (offset + edges.water) / (edges.water * 2), water);
      }
  }
  const perRow = strips.length * 2;
  for (let i = 0; i + 1 < streamPoints.length; i++)
    for (let k = 0; k < strips.length; k++) {
      const a = i * perRow + k * 2,
        b = a + 1,
        c = a + perRow,
        d = b + perRow;
      indices.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      new Float32Array(positions.length).map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  geometry.setAttribute('flow', new THREE.Float32BufferAttribute(flows, 3));
  geometry.setIndex(indices);
  return geometry;
}
