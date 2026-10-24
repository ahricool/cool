/**
 * One source of truth for the miniature's composition. The front (+z) courtyard
 * is low and open; the hall terrace, mound and trees rise towards the back.
 */
export const plinth = { half: 6.3, radius: 0.34, bottom: -1.25 };
export const terrace = { top: 0.72, front: -0.45, back: -6.05, half: 3.75 };
export const hall = { x: 0, z: -3.95, floor: 1.42, width: 3.7, depth: 2.4 };
export const stairs = { half: 0.82, front: 0.85, steps: 5 };
export const path = { half: 0.78, start: 0.85, end: 6.25, top: 0.07 };
export const gravel = { minX: -4.95, maxX: 4.3, minZ: 0.5, maxZ: 5.95 };
export const torii = { z: 4.85, half: 1.28, height: 2.75 };
export const office = {
  x: 4.98,
  z: -3.05,
  base: 0.32,
  width: 2.05,
  depth: 2.9,
};
export const mound = { x: -4.65, z: -4.45, top: 0.95 };
/** Flat meadow the plinth rests on; the stone base sinks slightly into it. */
export const meadow = { y: plinth.bottom + 0.08, radius: 90 };

export const sakuraTrees = [
  { x: -4.55, z: -4.4, y: mound.top, scale: 1.18 },
  { x: 4.95, z: 4.65, y: 0, scale: 0.78 },
];

/** Stone lanterns: `y` is where the flame sits. */
export const lanterns = [
  { x: -1.75, z: 2.55, base: 0, y: 1.08 },
  { x: 1.75, z: 2.55, base: 0, y: 1.08 },
  { x: -2.45, z: -1.0, base: terrace.top, y: terrace.top + 1.08 },
  { x: 2.45, z: -1.0, base: terrace.top, y: terrace.top + 1.08 },
];

export const temizuya = { x: -3.95, z: 3.35 };
export const emaRack = { x: 3.15, z: 1.55 };
export const omikuji = { x: 4.55, z: 2.75 };
export const noticeBoard = { x: 2.85, z: 5.55 };
/** Front canopy (kōhai) posts carry the bell above the offering box. */
export const canopy = { half: 0.95, z: -1.15, top: 2.95 };
export const bellRope = { x: 0, z: -0.84, top: 2.42, bottom: 1.05 };
export const offeringBox = { x: 0, z: -1.3 };
export const storehouse = { x: -5.0, z: -1.75 };

/** Rough courtyard obstacles that rain ripples keep clear of; walking uses walk.ts. */
export const obstacles = [
  { x: -torii.half, z: torii.z, r: 0.45 },
  { x: torii.half, z: torii.z, r: 0.45 },
  ...lanterns
    .filter((lantern) => lantern.z > 0)
    .map(({ x, z }) => ({ x, z, r: 0.55 })),
  { ...temizuya, r: 1.15 },
  { ...emaRack, r: 0.95 },
  { ...omikuji, r: 0.6 },
  { ...noticeBoard, r: 0.6 },
  { x: sakuraTrees[1]!.x, z: sakuraTrees[1]!.z, r: 1.0 },
];

/** Open places in the front court where fallen petals gather. */
export const roamSpots: [number, number][] = [
  [1.55, 3.55],
  [-2.55, 2.3],
  [-1.15, 3.75],
  [-2.85, 4.85],
  [-0.1, 1.55],
  [0.6, 3.25],
  [0.35, 5.45],
  [-3.6, 1.45],
];

/** Height of the walkable surface. Paving and gravel sit slightly proud of the grass. */
export function groundAt(x: number, z: number) {
  if (z < terrace.front && Math.abs(x) < terrace.half) return terrace.top;
  if (Math.abs(x) < path.half && z > path.start && z < path.end)
    return path.top;
  if (x > gravel.minX && x < gravel.maxX && z > gravel.minZ && z < gravel.maxZ)
    return 0.035;
  return 0;
}

/** Open lawn where grass and wild flowers may grow. */
export function isLawn(x: number, z: number) {
  if (Math.abs(x) > 6.15 || Math.abs(z) > 6.15) return false;
  if (z < terrace.front && Math.abs(x) < terrace.half + 0.05) return false;
  if (
    x > gravel.minX - 0.1 &&
    x < gravel.maxX + 0.1 &&
    z > gravel.minZ - 0.1 &&
    z < gravel.maxZ + 0.1
  )
    return false;
  if (Math.abs(x) < path.half + 0.1 && z > path.start) return false;
  if (
    Math.abs(x - office.x) < office.width / 2 + 0.3 &&
    Math.abs(z - office.z) < office.depth / 2 + 0.5
  )
    return false;
  return !(
    Math.abs(x - storehouse.x) < 1.0 && Math.abs(z - storehouse.z) < 1.2
  );
}
