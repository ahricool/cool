import {
  canopy,
  bellRope,
  emaRack,
  groundAt,
  hall,
  lanterns,
  mound,
  noticeBoard,
  offeringBox,
  office,
  omikuji,
  plinth,
  sakuraTrees,
  stairs,
  storehouse,
  temizuya,
  terrace,
  torii,
} from './layout';

/**
 * Where Sparkle may walk. Every solid footprint in the courtyard (posts,
 * buildings, stone fixtures, fences, trunks) is listed with its real size and
 * padded by her body radius; tree crowns and shrubs stay walkable. The open
 * area is rasterised once into a height-aware grid so she reaches the terrace
 * only by the stairs, never by stepping up its retaining wall.
 */

/** Half her width in scene units, from shoulders and swinging twin tails. */
const BODY = 0.18;
const CELL = 0.08;
/** Largest rise between neighbouring cells: one stair step, not a wall. */
const STEP = 0.16;

type Blocker =
  | { shape: 'circle'; x: number; z: number; r: number }
  | { shape: 'ellipse'; x: number; z: number; rx: number; rz: number }
  | { shape: 'rect'; x: number; z: number; hw: number; hd: number; ry: number };

const circle = (x: number, z: number, r: number): Blocker => ({
  shape: 'circle',
  x,
  z,
  r,
});
const rect = (
  x: number,
  z: number,
  hw: number,
  hd: number,
  ry = 0,
): Blocker => ({ shape: 'rect', x, z, hw, hd, ry });

const fenceFrom = stairs.half + 0.35,
  fenceTo = terrace.half - 0.2;

export const blockers: Blocker[] = [
  // Hall on its raised stone base, deck and railings included.
  rect(hall.x, hall.z + 0.15, (hall.width + 1.3) / 2, (hall.depth + 1.1) / 2),
  // Offering box, bell rope and the canopy's two posts in front of the hall.
  rect(offeringBox.x, offeringBox.z, 0.49, 0.25),
  circle(bellRope.x, bellRope.z, 0.06),
  circle(-canopy.half, canopy.z, 0.14),
  circle(canopy.half, canopy.z, 0.14),
  // Red tamagaki along the terrace's front edge, either side of the stairs.
  rect(
    -(fenceFrom + fenceTo) / 2,
    terrace.front - 0.1,
    (fenceTo - fenceFrom) / 2 + 0.05,
    0.05,
  ),
  rect(
    (fenceFrom + fenceTo) / 2,
    terrace.front - 0.1,
    (fenceTo - fenceFrom) / 2 + 0.05,
    0.05,
  ),
  // Stone cheek walls flanking the stairs.
  rect(
    -(stairs.half + 0.13),
    (terrace.front + stairs.front) / 2,
    0.13,
    (stairs.front - terrace.front) / 2,
  ),
  rect(
    stairs.half + 0.13,
    (terrace.front + stairs.front) / 2,
    0.13,
    (stairs.front - terrace.front) / 2,
  ),
  // Office on its stone base, storehouse on its plinth.
  rect(
    office.x,
    office.z + 0.2,
    (office.width + 0.5) / 2,
    (office.depth + 0.9) / 2,
  ),
  rect(storehouse.x, storehouse.z, 0.88, 0.9),
  // The grassy mound and its ring of rocks.
  { shape: 'ellipse', x: mound.x, z: mound.z, rx: 1.95, rz: 1.8 },
  // Torii pillars at their plinths, stone lanterns at their bases.
  circle(-torii.half, torii.z, 0.2),
  circle(torii.half, torii.z, 0.2),
  ...lanterns.map(({ x, z }) => circle(x, z, 0.26)),
  // Komainu on their pedestals.
  rect(-1.3, 1.2, 0.24, 0.24),
  rect(1.3, 1.2, 0.24, 0.24),
  // Purification pavilion: posts, basin and platform as one.
  rect(temizuya.x, temizuya.z, 0.8, 0.62),
  // Ema rack and omikuji: posts with boards and strings at body height.
  rect(emaRack.x, emaRack.z, 0.84, 0.06),
  rect(omikuji.x, omikuji.z, 0.46, 0.05),
  rect(noticeBoard.x, noticeBoard.z, 0.58, 0.06, -0.35),
  // Trunks and their low roots; the crowns above are fine to walk under.
  circle(sakuraTrees[1]!.x, sakuraTrees[1]!.z, 0.32),
  circle(-3.05, -5.55, 0.16),
  circle(3.0, -5.6, 0.15),
  circle(-1.75, -5.85, 0.13),
  circle(-5.55, 0.85, 0.14),
  circle(2.15, -5.9, 0.13),
  // The pine leans over at hip height; bamboo grows as a clump.
  circle(-5.05, 5.12, 0.3),
  circle(5.55, -5.55, 0.55),
  // Rocks and little cairns.
  circle(-4.85, 1.35, 0.22),
  circle(-3.1, 4.55, 0.17),
  circle(5.55, 5.6, 0.26),
  circle(4.3, 0.3, 0.18),
  circle(-5.7, 5.7, 0.24),
  circle(-5.45, -0.15, 0.3),
  circle(3.75, 5.85, 0.3),
  circle(-2.3, 5.85, 0.3),
];

function blocked(x: number, z: number) {
  for (const b of blockers) {
    const dx = x - b.x,
      dz = z - b.z;
    if (b.shape === 'circle') {
      if (dx * dx + dz * dz < (b.r + BODY) ** 2) return true;
    } else if (b.shape === 'ellipse') {
      if ((dx / (b.rx + BODY)) ** 2 + (dz / (b.rz + BODY)) ** 2 < 1)
        return true;
    } else {
      const c = Math.cos(b.ry),
        s = Math.sin(b.ry);
      const lx = dx * c - dz * s,
        lz = dx * s + dz * c;
      if (Math.abs(lx) < b.hw + BODY && Math.abs(lz) < b.hd + BODY) return true;
    }
  }
  return false;
}

/** Inside the fences on both sides and the front, short of the open back edge. */
function inBounds(x: number, z: number) {
  return Math.abs(x) < 6.02 - 0.04 - BODY && z < 6.02 - 0.04 - BODY && z > -6.0;
}

/** Walking surface height, including the stone steps the visuals carve. */
export function surfaceAt(x: number, z: number) {
  if (Math.abs(x) < stairs.half && z > terrace.front && z < stairs.front) {
    const steps = stairs.steps - 1,
      tread = (stairs.front - terrace.front) / steps,
      rise = terrace.top / (steps + 1);
    const i = Math.min(steps - 1, Math.floor((z - terrace.front) / tread));
    return terrace.top - (i + 1) * rise;
  }
  return groundAt(x, z);
}

const size = Math.ceil((plinth.half * 2) / CELL);
const origin = -plinth.half;
const heights = new Float32Array(size * size);
const open = new Uint8Array(size * size);
const cellX = (i: number) => origin + ((i % size) + 0.5) * CELL;
const cellZ = (i: number) => origin + (Math.floor(i / size) + 0.5) * CELL;
const cellAt = (x: number, z: number) => {
  const cx = Math.floor((x - origin) / CELL),
    cz = Math.floor((z - origin) / CELL);
  return cx < 0 || cz < 0 || cx >= size || cz >= size ? -1 : cz * size + cx;
};
for (let i = 0; i < open.length; i++) {
  const x = cellX(i),
    z = cellZ(i);
  heights[i] = surfaceAt(x, z);
  open[i] = inBounds(x, z) && !blocked(x, z) ? 1 : 0;
}
// Keep her body clear of drops too: no standing pressed into the terrace wall.
{
  const reach = Math.ceil(BODY / CELL);
  const cliff = new Uint8Array(size * size);
  for (let i = 0; i < open.length; i++) {
    if (!open[i]) continue;
    const cx = i % size,
      cz = Math.floor(i / size);
    for (let dz = -reach; dz <= reach && !cliff[i]; dz++)
      for (let dx = -reach; dx <= reach; dx++) {
        const nx = cx + dx,
          nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
        if (Math.hypot(dx, dz) * CELL > BODY + CELL * 0.5) continue;
        if (Math.abs(heights[nz * size + nx]! - heights[i]!) > STEP) {
          cliff[i] = 1;
          break;
        }
      }
  }
  cliff.forEach((v, i) => v && (open[i] = 0));
}

const NEIGHBOURS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** Neighbours reachable in one step: open, no wall to climb, no corner cut. */
function* stepsFrom(i: number) {
  const cx = i % size,
    cz = Math.floor(i / size);
  for (const [dx, dz, cost] of NEIGHBOURS) {
    const nx = cx + dx,
      nz = cz + dz;
    if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
    const n = nz * size + nx;
    if (!open[n] || Math.abs(heights[n]! - heights[i]!) > STEP) continue;
    if (dx && dz && (!open[cz * size + nx] || !open[nz * size + cx])) continue;
    yield [n, cost] as const;
  }
}

// Everything connected to the open court in front of the torii.
const reachable = new Uint8Array(size * size);
{
  const start = cellAt(0, 3.4);
  const queue = [start];
  reachable[start] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    for (const [n] of stepsFrom(i))
      if (!reachable[n]) {
        reachable[n] = 1;
        queue.push(n);
      }
  }
}
const spots: number[] = [];
reachable.forEach((v, i) => v && spots.push(i));

export function canStand(x: number, z: number) {
  const i = cellAt(x, z);
  return i >= 0 && reachable[i] === 1;
}

/** A random place she can reach, optionally between `min` and `max` away. */
export function randomSpot(
  random: () => number,
  from?: { x: number; y: number },
  min = 0,
  max = Infinity,
) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const i = spots[Math.floor(random() * spots.length)]!;
    const x = cellX(i) + (random() - 0.5) * CELL * 0.5,
      z = cellZ(i) + (random() - 0.5) * CELL * 0.5;
    if (!from) return { x, z };
    const d = Math.hypot(x - from.x, z - from.y);
    if (d >= min && d <= max) return { x, z };
  }
  const i = spots[Math.floor(random() * spots.length)]!;
  return { x: cellX(i), z: cellZ(i) };
}

/**
 * Whether the straight walk between two points stays on the walkable grid:
 * every cell the segment touches (an exact grid traversal, so no corner is
 * clipped between samples) is reachable and no wall lies between them.
 */
function clear(ax: number, az: number, bx: number, bz: number) {
  let cx = Math.floor((ax - origin) / CELL),
    cz = Math.floor((az - origin) / CELL);
  const ex = Math.floor((bx - origin) / CELL),
    ez = Math.floor((bz - origin) / CELL);
  const dx = bx - ax,
    dz = bz - az;
  const sx = Math.sign(dx),
    sz = Math.sign(dz);
  const tdx = sx ? CELL / Math.abs(dx) : Infinity,
    tdz = sz ? CELL / Math.abs(dz) : Infinity;
  let tx = sx ? ((sx > 0 ? cx + 1 : cx) * CELL + origin - ax) / dx : Infinity,
    tz = sz ? ((sz > 0 ? cz + 1 : cz) * CELL + origin - az) / dz : Infinity;
  let previous = cz * size + cx;
  const ok = (i: number) =>
    i >= 0 &&
    i < size * size &&
    reachable[i] === 1 &&
    Math.abs(heights[i]! - heights[previous]!) <= STEP;
  if (!ok(previous)) return false;
  for (let guard = 0; (cx !== ex || cz !== ez) && guard < size * 4; guard++) {
    // Passing exactly through a corner touches both side cells.
    if (Math.abs(tx - tz) < 1e-9) {
      if (!ok(cz * size + cx + sx) || !ok((cz + sz) * size + cx)) return false;
      cx += sx;
      cz += sz;
      tx += tdx;
      tz += tdz;
    } else if (tx < tz) {
      cx += sx;
      tx += tdx;
    } else {
      cz += sz;
      tz += tdz;
    }
    if (cx < 0 || cz < 0 || cx >= size || cz >= size) return false;
    const i = cz * size + cx;
    if (!ok(i)) return false;
    previous = i;
  }
  return true;
}

/**
 * Waypoints from (ax, az) to (bx, bz): A* over the grid, then pulled tight so
 * she walks in a few straight legs instead of zig-zagging cell by cell.
 */
export function routeBetween(ax: number, az: number, bx: number, bz: number) {
  const start = cellAt(ax, az),
    goal = cellAt(bx, bz);
  if (start < 0 || goal < 0 || !reachable[goal]) return [];
  if (clear(ax, az, bx, bz)) return [{ x: bx, z: bz }];
  const cost = new Float32Array(size * size).fill(Infinity);
  const came = new Int32Array(size * size).fill(-1);
  const gx = goal % size,
    gz = Math.floor(goal / size);
  const guess = (i: number) =>
    Math.hypot((i % size) - gx, Math.floor(i / size) - gz);
  // Binary min-heap of (estimated total cost, cell); stale entries are skipped.
  const keys: number[] = [guess(start)],
    nodes: number[] = [start];
  const swap = (a: number, b: number) => {
    [keys[a], keys[b]] = [keys[b]!, keys[a]!];
    [nodes[a], nodes[b]] = [nodes[b]!, nodes[a]!];
  };
  const push = (key: number, n: number) => {
    keys.push(key);
    nodes.push(n);
    for (let c = keys.length - 1; c > 0;) {
      const p = (c - 1) >> 1;
      if (keys[p]! <= keys[c]!) break;
      swap(p, c);
      c = p;
    }
  };
  const pop = () => {
    const top = nodes[0]!;
    const lastKey = keys.pop()!,
      lastNode = nodes.pop()!;
    if (keys.length) {
      keys[0] = lastKey;
      nodes[0] = lastNode;
      for (let p = 0; ;) {
        const l = p * 2 + 1,
          r = l + 1;
        let m = p;
        if (l < keys.length && keys[l]! < keys[m]!) m = l;
        if (r < keys.length && keys[r]! < keys[m]!) m = r;
        if (m === p) break;
        swap(p, m);
        p = m;
      }
    }
    return top;
  };
  cost[start] = 0;
  const done = new Uint8Array(size * size);
  while (keys.length) {
    const i = pop();
    if (i === goal) break;
    if (done[i]) continue;
    done[i] = 1;
    for (const [n, step] of stepsFrom(i)) {
      const next = cost[i]! + step;
      if (next >= cost[n]!) continue;
      cost[n] = next;
      came[n] = i;
      push(next + guess(n), n);
    }
  }
  if (came[goal]! < 0) return [];
  const cells: { x: number; z: number }[] = [];
  for (let i = goal; i !== start && i >= 0; i = came[i]!)
    cells.unshift({ x: cellX(i), z: cellZ(i) });
  cells[cells.length - 1] = { x: bx, z: bz };
  const route: { x: number; z: number }[] = [];
  let from = { x: ax, z: az };
  for (let k = 0; k < cells.length;) {
    let far = k;
    while (
      far + 1 < cells.length &&
      clear(from.x, from.z, cells[far + 1]!.x, cells[far + 1]!.z)
    )
      far++;
    route.push(cells[far]!);
    from = cells[far]!;
    k = far + 1;
  }
  return route;
}
