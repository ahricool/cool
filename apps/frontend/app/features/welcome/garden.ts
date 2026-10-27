import * as THREE from 'three';
import { buildCats } from './cats';
import {
  gravel,
  groundAt,
  isLawn,
  lanterns,
  mound,
  office,
  path,
  plinth,
  sakuraTrees,
  stairs,
  storehouse,
  terrace,
} from './layout';
import {
  buildEmaRack,
  buildHall,
  buildLantern,
  buildNoticeBoard,
  buildOffice,
  buildOmikuji,
  buildStorehouse,
  buildTemizuya,
  buildTorii,
  fence,
  terraceFence,
} from './structures';
import {
  createRamp,
  createSharedUniforms,
  seeded,
  ToonBuilder,
  type Tone,
} from './toon';

type Random = () => number;
const pick = <T>(random: Random, items: readonly T[]) =>
  items[Math.floor(random() * items.length)]!;

/** Square display base: grass top, timber course and a dressed-stone wall. */
function buildPlinth(b: ToonBuilder, random: Random) {
  const { half, radius, bottom } = plinth;
  const size = half * 2;
  b.slab(
    size - 0.08,
    size - 0.08,
    -0.34 - bottom,
    -0.34,
    'mortar',
    0,
    0,
    radius,
  );
  const rows = 3,
    rowHeight = (-0.38 - bottom) / rows;
  const straight = half - radius;
  for (let row = 0; row < rows; row++) {
    const y = bottom + rowHeight * (row + 0.5);
    for (let side = 0; side < 4; side++) {
      let at = -straight + (row % 2) * 0.3 * random();
      while (at < straight - 0.12) {
        const length = Math.min(0.55 + random() * 0.5, straight - at);
        const tone = pick(random, [
          'stone',
          'stone',
          'stoneLight',
          'stoneLight',
          'stoneDark',
        ] as const);
        const center = at + length / 2;
        const [x, z, ry] =
          side === 0
            ? [center, half - 0.06, 0]
            : side === 1
              ? [center, -half + 0.06, 0]
              : side === 2
                ? [half - 0.06, center, Math.PI / 2]
                : [-half + 0.06, center, Math.PI / 2];
        b.box(length - 0.035, rowHeight - 0.035, 0.12, tone, x, y, z, {
          rotation: [0, ry, 0],
        });
        at += length;
      }
    }
  }
  for (const x of [-straight, straight])
    for (const z of [-straight, straight])
      b.cylinder(
        radius - 0.02,
        radius - 0.02,
        -0.38 - bottom,
        'stoneLight',
        x,
        (bottom - 0.38) / 2,
        z,
        16,
      );
  b.slab(size + 0.04, size + 0.04, 0.22, -0.13, 'wood', 0, 0, radius);
  b.slab(size + 0.08, size + 0.08, 0.035, -0.115, 'woodLight', 0, 0, radius, {
    outline: false,
  });
  for (let i = 0; i < 21; i++) {
    const at = -straight + 0.2 + i * ((straight * 2 - 0.4) / 20);
    for (const side of [-1, 1]) {
      b.box(0.03, 0.2, 0.03, 'woodDark', at, -0.24, side * (half + 0.02), {
        outline: false,
      });
      b.box(0.03, 0.2, 0.03, 'woodDark', side * (half + 0.02), -0.24, at, {
        outline: false,
      });
    }
  }
  b.slab(size, size, 0.12, 0, 'grass', 0, 0, radius);
}

function buildTerrace(b: ToonBuilder, random: Random) {
  const { top, front, back, half } = terrace;
  const depth = front - back,
    centerZ = (front + back) / 2;
  b.slab(half * 2, depth, top, top - 0.02, 'mortar', 0, centerZ, 0.05);
  b.slab(
    half * 2 - 0.1,
    depth - 0.1,
    0.04,
    top,
    'gravel',
    0,
    centerZ - 0.02,
    0.05,
    { outline: false },
  );
  // Dressed retaining wall on the front and both sides.
  const course = (top - 0.04) / 2;
  for (let row = 0; row < 2; row++) {
    const y = 0.02 + course * (row + 0.5);
    for (const [from, to, fixed, axis] of [
      [-half, -stairs.half - 0.25, front, 'x'],
      [stairs.half + 0.25, half, front, 'x'],
      [back, front, -half, 'z'],
      [back, front, half, 'z'],
    ] as const) {
      let at = from + (row ? 0.25 : 0);
      if (row)
        b.box(
          axis === 'x' ? 0.25 : 0.12,
          course - 0.03,
          axis === 'x' ? 0.12 : 0.25,
          'stone',
          axis === 'x' ? from + 0.125 : fixed + Math.sign(fixed) * 0.02,
          y,
          axis === 'x' ? fixed + 0.02 : from + 0.125,
        );
      while (at < to - 0.1) {
        const length = Math.min(0.5 + random() * 0.4, to - at);
        const tone = pick(random, [
          'stone',
          'stoneLight',
          'stoneLight',
          'stoneDark',
        ] as const);
        const center = at + length / 2;
        if (axis === 'x')
          b.box(
            length - 0.03,
            course - 0.03,
            0.12,
            tone,
            center,
            y,
            fixed + 0.02,
          );
        else
          b.box(
            0.12,
            course - 0.03,
            length - 0.03,
            tone,
            fixed + Math.sign(fixed) * 0.02,
            y,
            center,
          );
        at += length;
      }
    }
  }
  for (const [from, to] of [
    [-half, -stairs.half - 0.25],
    [stairs.half + 0.25, half],
  ] as const)
    b.box(
      to - from,
      0.08,
      0.22,
      'stoneLight',
      (from + to) / 2,
      top + 0.02,
      front - 0.05,
    );
  for (const side of [-1, 1])
    b.box(
      0.22,
      0.08,
      depth,
      'stoneLight',
      side * (half - 0.05),
      top + 0.02,
      centerZ,
    );
  terraceFence(b, -half + 0.2, -stairs.half - 0.35, front + 0.02 - 0.12);
  terraceFence(b, stairs.half + 0.35, half - 0.2, front + 0.02 - 0.12);
  // Stone stairs down to the court, flanked by cheek walls.
  const steps = stairs.steps - 1,
    tread = (stairs.front - front) / steps,
    rise = top / (steps + 1);
  for (let i = 0; i < steps; i++) {
    const stepTop = top - (i + 1) * rise;
    b.box(
      stairs.half * 2,
      stepTop,
      tread + 0.02,
      i % 2 ? 'stoneLight' : 'slab',
      0,
      stepTop / 2,
      front + tread * (i + 0.5),
    );
    for (const side of [-1, 1])
      b.box(
        0.26,
        stepTop + 0.16,
        tread + 0.02,
        'stone',
        side * (stairs.half + 0.13),
        (stepTop + 0.16) / 2,
        front + tread * (i + 0.5),
      );
  }
  // Paving from the stairs to the offering box.
  for (let i = 0; i < 2; i++)
    b.slab(
      1.2,
      0.34,
      0.03,
      top + 0.03,
      i ? 'slab' : 'slabDark',
      0,
      front - 0.25 - i * 0.37,
      0.05,
      { outline: false },
    );
}

function komainu(b: ToonBuilder, x: number, z: number, facing: number) {
  b.box(0.42, 0.34, 0.42, 'stone', x, 0.17, z);
  b.box(0.48, 0.06, 0.48, 'stoneLight', x, 0.37, z);
  b.ball(0.16, 'stoneLight', x, 0.55, z - 0.04, [1, 1.1, 1.2]);
  b.ball(0.15, 'stoneLight', x + facing * 0.02, 0.78, z + 0.06, [1.05, 1, 1]);
  b.ball(0.07, 'stoneDark', x + facing * 0.11, 0.87, z + 0.06, [0.7, 1, 1]);
  b.ball(0.06, 'stone', x, 0.72, z + 0.18, [1.2, 0.8, 1]);
  b.ball(0.07, 'stone', x - facing * 0.04, 0.52, z - 0.2, [1, 1.4, 1]);
}

function buildCourtyard(b: ToonBuilder, random: Random) {
  const width = gravel.maxX - gravel.minX,
    depth = gravel.maxZ - gravel.minZ;
  b.slab(
    width,
    depth,
    0.05,
    0.035,
    'gravel',
    gravel.minX + width / 2,
    gravel.minZ + depth / 2,
    0.5,
    { outline: false },
  );
  // Worn paving stones, two staggered columns.
  let z = path.start + 0.04;
  let row = 0;
  while (z < path.end - 0.1) {
    const length = Math.min(0.42 + random() * 0.2, path.end - z);
    const offsets = row % 2 ? [-0.39, 0.39] : [-0.52, 0.26];
    const widths = row % 2 ? [0.74, 0.74] : [0.48, 1.0];
    for (let i = 0; i < 2; i++)
      b.slab(
        widths[i]! - 0.05,
        length - 0.05,
        0.06,
        path.top,
        pick(random, ['slab', 'slab', 'slabDark', 'stoneLight'] as const),
        offsets[i]!,
        z + length / 2,
        0.05,
      );
    z += length;
    row++;
  }
  for (const side of [-1, 1])
    b.box(
      0.08,
      0.06,
      path.end - path.start,
      'stoneDark',
      side * (path.half + 0.04),
      0.04,
      (path.start + path.end) / 2,
      { outline: false },
    );
  // Narrow stepping-stone paths to the office and the storehouse.
  for (const [[x0, z0], [x1, z1]] of [
    [
      [3.95, 0.75],
      [office.x - 0.4, office.z + 2.35],
    ],
    [
      [-3.5, 0.45],
      [storehouse.x + 0.6, storehouse.z + 1.3],
    ],
  ] as const)
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      b.cylinder(
        0.2,
        0.2,
        0.05,
        i % 2 ? 'slab' : 'slabDark',
        x0 + (x1 - x0) * t + (random() - 0.5) * 0.1,
        0.03,
        z0 + (z1 - z0) * t,
        9,
        { scale: [1.2, 1, 0.9], rotation: [0, random() * 3, 0] },
      );
    }
  komainu(b, -1.3, 1.2, 1);
  komainu(b, 1.3, 1.2, -1);
}

function sakura(
  b: ToonBuilder,
  random: Random,
  x: number,
  y: number,
  z: number,
  s: number,
) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.beam(
      [x, y + 0.25 * s, z],
      [x + Math.cos(a) * 0.45 * s, y - 0.02, z + Math.sin(a) * 0.45 * s],
      0.11 * s,
      'bark',
      0.05 * s,
    );
  }
  const knee: THREE.Vector3Tuple = [x + 0.18 * s, y + 0.9 * s, z + 0.05 * s];
  const crown: THREE.Vector3Tuple = [x - 0.05 * s, y + 1.65 * s, z - 0.05 * s];
  b.beam([x, y - 0.05, z], knee, 0.26 * s, 'bark', 0.19 * s, {}, 9);
  b.beam(knee, crown, 0.19 * s, 'bark', 0.13 * s, {}, 9);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + random() * 0.5;
    const reach = (0.9 + random() * 0.45) * s;
    b.beam(
      i % 2 ? crown : knee,
      [
        x + Math.cos(a) * reach,
        y + (2.0 + random() * 0.5) * s,
        z + Math.sin(a) * reach,
      ],
      0.09 * s,
      'bark',
      0.035 * s,
    );
  }
  // Billowing canopy: a dome of puffs, paler on top, deeper pink underneath.
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996 + random() * 0.3;
    const r = Math.sqrt((i + 0.5) / 30) * 1.45 * s;
    const lift = (1 - (r / (1.45 * s)) ** 2) * 0.75 * s;
    const py = y + (2.25 + random() * 0.25) * s + lift;
    const tone: Tone =
      py > y + 2.75 * s
        ? 'blossomLight'
        : random() < 0.3
          ? 'blossomDeep'
          : 'blossom';
    b.ball(
      (0.42 + random() * 0.22) * s,
      tone,
      x + Math.cos(a) * r,
      py,
      z + Math.sin(a) * r,
      [1.1, 0.82, 1.1],
      {},
      2,
    );
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + random();
    const r = 1.35 * s;
    b.ball(
      0.26 * s,
      'blossomDeep',
      x + Math.cos(a) * r,
      y + 1.95 * s,
      z + Math.sin(a) * r,
      [1, 1.25, 1],
      {},
      2,
    );
  }
}

function broadleaf(
  b: ToonBuilder,
  random: Random,
  x: number,
  y: number,
  z: number,
  s: number,
) {
  b.beam(
    [x, y, z],
    [x + 0.08 * s, y + 1.3 * s, z],
    0.15 * s,
    'bark',
    0.1 * s,
    {},
    8,
  );
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.5) / 14) * 0.9 * s;
    const py = y + (1.55 + (1 - r / (0.9 * s)) * 0.75 + random() * 0.2) * s;
    b.ball(
      (0.36 + random() * 0.18) * s,
      py > y + 2.1 * s ? 'leafLight' : random() < 0.4 ? 'leafDeep' : 'leaf',
      x + Math.cos(a) * r,
      py,
      z + Math.sin(a) * r,
      [1.1, 0.9, 1.1],
      {},
      2,
    );
  }
}

/** Tall sugi cedar: stacked tiers that read as a dark backdrop for the hall. */
function cedar(b: ToonBuilder, x: number, y: number, z: number, s: number) {
  b.cylinder(0.14 * s, 0.1 * s, 1.0 * s, 'bark', x, y + 0.5 * s, z, 8);
  const tiers = [
    [0.95, 0.95, 1.05],
    [0.78, 0.9, 1.65],
    [0.6, 0.85, 2.2],
    [0.42, 0.75, 2.7],
    [0.24, 0.6, 3.12],
  ] as const;
  tiers.forEach(([r, h, at], i) =>
    b.cylinder(
      r * s,
      0.0,
      h * s,
      i % 2 ? 'pineLight' : 'pine',
      x,
      y + at * s,
      z,
      9,
      { rotation: [0, i * 0.5, 0] },
    ),
  );
}

/** Garden pine with flat cloud-pruned pads. */
function pine(b: ToonBuilder, x: number, y: number, z: number, s: number) {
  const bend: THREE.Vector3Tuple = [x + 0.35 * s, y + 0.8 * s, z - 0.1 * s];
  const top: THREE.Vector3Tuple = [x + 0.05 * s, y + 1.65 * s, z];
  b.beam([x, y, z], bend, 0.16 * s, 'bark', 0.12 * s, {}, 8);
  b.beam(bend, top, 0.12 * s, 'bark', 0.08 * s, {}, 8);
  for (const [px, py, pz, r] of [
    [0.05, 1.85, 0, 0.62],
    [0.75, 1.25, -0.15, 0.55],
    [-0.55, 1.45, 0.2, 0.5],
    [0.2, 1.05, 0.55, 0.42],
  ] as const) {
    b.beam(
      py > 1.6 ? top : bend,
      [x + px * s, y + (py - 0.05) * s, z + pz * s],
      0.05 * s,
      'bark',
      0.03 * s,
    );
    b.ball(
      r * s,
      'pine',
      x + px * s,
      y + py * s,
      z + pz * s,
      [1.25, 0.42, 1.1],
    );
    b.ball(
      r * 0.75 * s,
      'pineLight',
      x + px * s,
      y + (py + 0.12) * s,
      z + pz * s,
      [1.2, 0.4, 1.05],
    );
  }
}

function bamboo(
  b: ToonBuilder,
  random: Random,
  x: number,
  y: number,
  z: number,
) {
  for (let i = 0; i < 7; i++) {
    const px = x + (random() - 0.5) * 0.9,
      pz = z + (random() - 0.5) * 0.9;
    const h = 2.6 + random() * 1.1;
    b.beam(
      [px, y, pz],
      [px + (random() - 0.5) * 0.3, y + h, pz + (random() - 0.5) * 0.3],
      0.045,
      'leafLight',
      0.035,
      {},
      6,
    );
    for (let j = 1; j < 4; j++)
      b.cylinder(0.05, 0.05, 0.03, 'leafDeep', px, y + (j * h) / 4, pz, 6, {
        outline: false,
      });
    b.ball(
      0.32 + random() * 0.15,
      i % 2 ? 'leaf' : 'leafLight',
      px,
      y + h - 0.1,
      pz,
      [0.8, 1.4, 0.8],
    );
  }
}

function shrub(
  b: ToonBuilder,
  random: Random,
  x: number,
  z: number,
  s = 1,
  flowers = true,
) {
  const y = groundAt(x, z) + 0.02;
  for (let i = 0; i < 4; i++)
    b.ball(
      (0.26 + random() * 0.1) * s,
      i === 3 ? 'leafLight' : i % 2 ? 'leaf' : 'leafDeep',
      x + (random() - 0.5) * 0.5 * s,
      y + (0.18 + (i === 3 ? 0.12 : 0)) * s,
      z + (random() - 0.5) * 0.4 * s,
      [1.2, 0.85, 1.1],
    );
  if (flowers)
    for (let i = 0; i < 9; i++)
      b.ball(
        0.05 * s,
        i % 3 ? 'azalea' : 'white',
        x + (random() - 0.5) * 0.65 * s,
        y + (0.3 + random() * 0.14) * s,
        z + (random() - 0.5) * 0.5 * s,
        [1, 1, 1],
        { outline: false },
        0,
      );
}

function rock(
  b: ToonBuilder,
  random: Random,
  x: number,
  y: number,
  z: number,
  s: number,
) {
  const geometry = new THREE.DodecahedronGeometry(s, 0);
  b.part(geometry, random() < 0.4 ? 'stoneDark' : 'stone', x, y + s * 0.3, z, {
    scale: [1.2, 0.7, 1],
    rotation: [random(), random() * 3, random() * 0.3],
  });
  if (random() < 0.6)
    b.ball(s * 0.55, 'moss', x + s * 0.2, y + s * 0.62, z, [1.4, 0.35, 1.2], {
      outline: false,
    });
}

function buildMound(b: ToonBuilder, random: Random) {
  const { x, z, top } = mound;
  b.ball(1.75, 'grass', x, 0.05, z, [1.0, (top / 1.75) * 0.62, 0.95], {}, 2);
  b.ball(
    1.05,
    'grassDeep',
    x + 0.2,
    top * 0.55,
    z + 0.1,
    [1.05, 0.42, 1],
    { outline: false },
    2,
  );
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 1.5 - 0.3;
    rock(
      b,
      random,
      x + Math.cos(a) * 1.55,
      0.0,
      z + Math.sin(a) * 1.4,
      0.2 + random() * 0.15,
    );
  }
}

function scatter(b: ToonBuilder, random: Random) {
  // Fallen petals drift into drifts around the trees and along the court edges.
  for (let i = 0; i < 220; i++) {
    const tree = sakuraTrees[i % 3 === 0 ? 1 : 0]!;
    const near = random() < 0.55;
    const x = near ? tree.x + (random() - 0.5) * 3.4 : (random() - 0.5) * 11.6;
    const z = near ? tree.z + (random() - 0.5) * 3.4 : 0.6 + random() * 5.4;
    if (Math.abs(x) > 6.1 || Math.abs(z) > 6.1) continue;
    const onTerrace = z < terrace.front && Math.abs(x) < terrace.half;
    if (onTerrace || (Math.abs(x) < path.half + 0.1 && z > path.start))
      continue;
    const ground =
      Math.hypot(x - tree.x, z - tree.z) < 1.4 && tree === sakuraTrees[0]
        ? tree.y - 0.08
        : x > gravel.minX &&
            x < gravel.maxX &&
            z > gravel.minZ &&
            z < gravel.maxZ
          ? 0.04
          : 0.005;
    b.part(
      new THREE.CircleGeometry(0.028 + random() * 0.02, 5),
      random() < 0.75 ? 'blossom' : 'blossomDeep',
      x,
      ground + 0.003,
      z,
      {
        rotation: [-Math.PI / 2, 0, random() * 6],
        scale: [1.5, 1, 1],
        outline: false,
      },
    );
  }
  // Soft patches of deeper and sunnier grass break up the lawn.
  for (let i = 0, placed = 0; placed < 34 && i < 600; i++) {
    const x = (random() - 0.5) * 12,
      z = (random() - 0.5) * 12;
    if (!isLawn(x, z)) continue;
    placed++;
    b.part(
      new THREE.CircleGeometry(0.3 + random() * 0.35, 10),
      random() < 0.6 ? 'grassDeep' : 'moss',
      x,
      0.004 + placed * 0.0002,
      z,
      {
        rotation: [-Math.PI / 2, 0, random() * 3],
        scale: [1.5 + random(), 1, 1],
        outline: false,
      },
    );
  }
  // Wild flowers dotting the lawn: clover white, dandelion yellow, a few pinks.
  for (let i = 0, placed = 0; placed < 170 && i < 3000; i++) {
    const x = (random() - 0.5) * 12.3,
      z = (random() - 0.5) * 12.3;
    if (!isLawn(x, z) || Math.hypot(x - mound.x, z - mound.z) < 1.8) continue;
    placed++;
    const tone = pick(random, [
      'white',
      'white',
      'gold',
      'azalea',
      'blossomLight',
    ] as const);
    b.ball(0.035, tone, x, 0.05, z, [1, 0.7, 1], { outline: false }, 0);
    if (placed % 3 === 0)
      b.ball(
        0.03,
        tone,
        x + 0.07,
        0.045,
        z + 0.04,
        [1, 0.7, 1],
        { outline: false },
        0,
      );
  }
  // Little cairns of river stones.
  for (const [x, z] of [
    [-5.45, -0.15],
    [3.75, 5.85],
    [-2.3, 5.85],
  ] as const) {
    b.ball(0.13, 'stone', x, 0.08, z, [1.3, 0.6, 1.1]);
    b.ball(0.1, 'stoneLight', x + 0.02, 0.18, z, [1.2, 0.6, 1]);
    b.ball(0.07, 'stone', x - 0.01, 0.26, z, [1.1, 0.7, 1]);
    b.ball(0.08, 'stoneDark', x + 0.2, 0.05, z + 0.1, [1.2, 0.6, 1]);
  }
}

/** Static, asset-free shrine miniature; static geometry is batched by material. */
export function createWelcomeGarden(
  shared = createSharedUniforms(),
  ramp: THREE.Texture = createRamp(),
) {
  const b = new ToonBuilder();
  const random = seeded(20261023);
  buildPlinth(b, random);
  buildTerrace(b, random);
  buildCourtyard(b, random);
  buildMound(b, random);
  buildHall(b);
  buildOffice(b);
  buildStorehouse(b);
  buildTorii(b);
  for (const lantern of lanterns)
    buildLantern(b, lantern.x, lantern.base, lantern.z);
  buildTemizuya(b);
  buildEmaRack(b);
  buildOmikuji(b);
  buildNoticeBoard(b);
  fence(b, [-6.02, -0.2], [-6.02, 5.75]);
  fence(b, [6.02, 0.55], [6.02, 5.75]);
  fence(b, [-5.75, 6.02], [-1.75, 6.02]);
  fence(b, [1.75, 6.02], [5.75, 6.02]);
  for (const tree of sakuraTrees)
    sakura(b, random, tree.x, tree.y, tree.z, tree.scale);
  cedar(b, -3.05, terrace.top, -5.55, 1.15);
  cedar(b, 3.0, terrace.top, -5.6, 1.05);
  cedar(b, -1.75, terrace.top, -5.85, 0.9);
  broadleaf(b, random, -5.55, 0, 0.85, 0.85);
  broadleaf(b, random, 2.15, terrace.top, -5.9, 0.85);
  pine(b, -5.2, 0, 5.15, 0.9);
  bamboo(b, random, 5.55, 0, -5.55);
  for (const [x, z, s, flowers] of [
    [-5.6, 2.35, 1, true],
    [-5.55, 4.05, 0.9, false],
    [5.6, 1.35, 0.95, true],
    [5.62, 3.25, 0.9, false],
    [-2.5, 5.7, 0.85, true],
    [2.0, 5.75, 0.75, false],
    [-3.25, -2.65, 0.8, true],
    [3.3, -2.8, 0.8, true],
    [3.95, -0.25, 0.7, false],
    [-4.0, -0.25, 0.75, true],
  ] as const)
    shrub(b, random, x, z, s, flowers);
  for (const [x, z, s] of [
    [-4.85, 1.35, 0.18],
    [-3.1, 4.55, 0.14],
    [5.55, 5.6, 0.22],
    [4.3, 0.3, 0.15],
    [-5.7, 5.7, 0.2],
  ] as const)
    rock(b, random, x, groundAt(x, z), z, s);
  scatter(b, random);
  buildCats(b);
  const root = b.build(shared, ramp);
  root.name = 'welcome-garden';
  return root;
}
