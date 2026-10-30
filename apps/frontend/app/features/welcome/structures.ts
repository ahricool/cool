import * as THREE from 'three';
import { seeded, type PartOptions, type Tone, type ToonBuilder } from './toon';
import {
  bellRope,
  canopy,
  emaRack,
  groundAt,
  hall,
  noticeBoard,
  office,
  offeringBox,
  omikuji,
  storehouse,
  temizuya,
  terrace,
  torii,
} from './layout';
import { letterVertically } from './lettering';

/** Places parts in a rotated local frame, e.g. a building facing sideways. */
function frame(b: ToonBuilder, ox: number, oy: number, oz: number, ry = 0) {
  const matrix = new THREE.Matrix4();
  const put = (
    geometry: THREE.BufferGeometry,
    tone: Tone,
    x: number,
    y: number,
    z: number,
    { rotation = [0, 0, 0], scale = [1, 1, 1], outline, still }: PartOptions = {},
  ) => {
    geometry.applyMatrix4(
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...scale),
      ),
    );
    b.part(geometry, tone, ox, oy, oz, {
      rotation: [0, ry, 0],
      outline,
      still,
    });
  };
  return {
    put,
    box: (
      w: number,
      h: number,
      d: number,
      tone: Tone,
      x: number,
      y: number,
      z: number,
      options?: PartOptions,
    ) => put(new THREE.BoxGeometry(w, h, d), tone, x, y, z, options),
    beam(
      a: THREE.Vector3Tuple,
      c: THREE.Vector3Tuple,
      r: number,
      tone: Tone,
      options?: PartOptions,
    ) {
      const start = new THREE.Vector3(...a);
      const vector = new THREE.Vector3(...c).sub(start);
      const geometry = new THREE.CylinderGeometry(r, r, vector.length(), 6);
      geometry.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          vector.clone().normalize(),
        ),
      );
      const center = start.addScaledVector(vector, 0.5);
      put(geometry, tone, center.x, center.y, center.z, options);
    },
  };
}

/** Concave Japanese roof slope: steep near the ridge, flattening and lifting at the eave. */
function slope(length: number, drop: number, lift: number, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [
      t * length,
      -drop * (1 - Math.pow(1 - t, 1.75)) +
        lift * THREE.MathUtils.smoothstep(t, 0.72, 1),
    ] as [number, number];
  });
}

interface RoofSpec {
  x: number;
  y: number;
  z: number;
  ry?: number;
  width: number;
  front: number;
  back: number;
  frontDrop: number;
  backDrop: number;
  thickness?: number;
  /** Exposed rafter ends under both eaves. */
  rafters?: boolean;
  /** Fill the gable triangle down to this local height between the walls. */
  gable?: { from: number; to: number; base: number; half: number };
}

/** Gable roof with the ridge along local x and slopes towards ±z. */
export function curvedRoof(b: ToonBuilder, spec: RoofSpec) {
  const { width, thickness = 0.13 } = spec;
  // Trim scales with the roof so small canopies do not wear the hall's heavy ridge.
  const k = THREE.MathUtils.clamp((spec.front + spec.back) / 4, 0.4, 1);
  const local = frame(b, spec.x, spec.y, spec.z, spec.ry);
  const front = slope(spec.front, spec.frontDrop, 0.12);
  const back = slope(spec.back, spec.backDrop, 0.1).map(
    ([u, v]) => [-u, v] as [number, number],
  );
  const top = [...back.reverse(), ...front.slice(1)];
  const extrude = (points: [number, number][], depth: number) => {
    const shape = new THREE.Shape(
      points.map(([u, v]) => new THREE.Vector2(u, v)),
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
    // Shape (u, v) extruded along w becomes world (x = w, y = v, z = u).
    geometry.rotateY(-Math.PI / 2);
    geometry.translate(depth / 2, 0, 0);
    return geometry;
  };
  local.put(
    extrude(
      [
        ...top,
        ...[...top]
          .reverse()
          .map(([u, v]) => [u, v - thickness] as [number, number]),
      ],
      width,
    ),
    'roof',
    0,
    0,
    0,
  );
  // Raised tile courses give the dark roof a readable, hand-drawn rhythm.
  const courses = Math.round(width / 0.2);
  for (let i = 1; i < courses; i++)
    local.put(
      extrude(
        [
          ...top.map(([u, v]) => [u, v + 0.035] as [number, number]),
          ...[...top]
            .reverse()
            .map(([u, v]) => [u, v - 0.01] as [number, number]),
        ],
        0.045,
      ),
      'roofLight',
      -width / 2 + (i * width) / courses,
      0,
      0,
      { outline: false },
    );
  if (spec.gable) {
    const { from, to, base, half } = spec.gable;
    const underside = top
      .filter(([u]) => u > from && u < to)
      .map(([u, v]) => [u, v - thickness] as [number, number]);
    for (const side of [-1, 1])
      local.put(
        extrude([[from, base], [to, base], ...underside.reverse()], 0.06),
        'white',
        side * half,
        0,
        0,
      );
  }
  if (spec.rafters) {
    const count = Math.round(width / 0.24);
    for (const [u, v] of [front.at(-2)!, back.at(-2)!])
      for (let i = 0; i <= count; i++)
        local.box(
          0.07,
          0.07,
          Math.abs(u) * 0.12 + 0.1,
          'woodLight',
          -width / 2 + 0.12 + (i * (width - 0.24)) / count,
          v - thickness - 0.04,
          u * 0.97,
          { outline: false },
        );
  }
  // Eave fascias, ridge cap, barge boards and gilded ridge ends.
  for (const [u, v] of [front.at(-1)!, back.at(-1)!])
    local.box(
      width + 0.04,
      thickness + 0.06,
      0.08,
      'roofEdge',
      0,
      v - thickness / 2,
      u,
    );
  local.box(width + 0.16 * k, 0.16 * k, 0.26 * k, 'roofEdge', 0, 0.05 * k, 0);
  for (const side of [-1, 1]) {
    local.box(
      0.12 * k,
      0.26 * k,
      0.3 * k,
      'roofEdge',
      side * (width / 2 + 0.06 * k),
      0.12 * k,
      0,
    );
    local.box(
      0.05,
      0.12 * k,
      0.14 * k,
      'gold',
      side * (width / 2 + 0.13 * k),
      0.12 * k,
      0,
    );
    for (let i = 0; i < top.length - 1; i++) {
      const [u0, v0] = top[i]!,
        [u1, v1] = top[i + 1]!;
      local.beam(
        [side * (width / 2 + 0.03), v0 - 0.05 * k, u0],
        [side * (width / 2 + 0.03), v1 - 0.05 * k, u1],
        0.05 * k,
        'white',
        { outline: i % 2 === 0 },
      );
    }
    local.box(
      0.08 * k,
      0.16 * k,
      0.12 * k,
      'gold',
      side * (width / 2 + 0.05),
      -0.2 * k,
      0,
    );
  }

  // Fallen sakura petals and autumn leaves resting in the tile valleys.
  scatterRoofFoliage(local, spec, top, courses);
}

function roofSakuraPetal(size: number) {
  const pts: [number, number][] = [
    [0, -0.9],
    [0.56, -0.22],
    [0.64, 0.48],
    [0.24, 0.92],
    [0, 0.64],
    [-0.24, 0.92],
    [-0.64, 0.48],
    [-0.56, -0.22],
  ];
  return new THREE.ShapeGeometry(
    new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * size, y * size))),
  );
}

function roofMapleLeaf(size: number) {
  const pts: [number, number][] = [
    [0, -0.76],
    [0.18, -0.44],
    [0.78, -0.34],
    [0.42, -0.04],
    [0.92, 0.36],
    [0.32, 0.38],
    [0, 0.98],
    [-0.32, 0.38],
    [-0.92, 0.36],
    [-0.42, -0.04],
    [-0.78, -0.34],
    [-0.18, -0.44],
  ];
  return new THREE.ShapeGeometry(
    new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * size, y * size))),
  );
}

function roofPointedLeaf(size: number) {
  const pts: [number, number][] = [
    [0, -0.95],
    [0.48, -0.28],
    [0.52, 0.24],
    [0, 0.95],
    [-0.52, 0.24],
    [-0.48, -0.28],
  ];
  return new THREE.ShapeGeometry(
    new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * size, y * size))),
  );
}

function scatterRoofFoliage(
  local: ReturnType<typeof frame>,
  spec: RoofSpec,
  top: [number, number][],
  courses: number,
) {
  const seed =
    Math.round((spec.x + 20) * 1973) ^
    Math.round((spec.z + 20) * 3571) ^
    Math.round(spec.width * 997);
  const rand = seeded(seed);
  const cosR = Math.cos(spec.ry ?? 0);
  const sinR = Math.sin(spec.ry ?? 0);

  // Tree canopies that drop petals or leaves onto nearby roof slopes; roof
  // sections outside these radii stay clean.
  const sources: readonly {
    x: number;
    z: number;
    reach: number;
    kind: 'sakura' | 'maple' | 'bamboo';
  }[] = [
    { x: -4.55, z: -4.4, reach: 6.2, kind: 'sakura' },
    { x: 4.95, z: 4.65, reach: 4.2, kind: 'sakura' },
    { x: -5.55, z: 0.85, reach: 4.8, kind: 'maple' },
    { x: 5.55, z: -5.55, reach: 4.6, kind: 'bamboo' },
    { x: 2.55, z: -5.75, reach: 4.4, kind: 'bamboo' },
  ];
  const petalTones: readonly Tone[] = [
    'blossom',
    'blossom',
    'blossomLight',
    'blossomDeep',
  ];
  const mapleTones: readonly Tone[] = [
    'mapleRed',
    'mapleRed',
    'mapleOrange',
    'mapleOrange',
    'mapleGold',
    'shrubAmber',
  ];
  const bambooTones: readonly Tone[] = [
    'leafLight',
    'shrubOlive',
    'shrubAmber',
    'mapleGold',
  ];

  // Valid slope segment indices avoiding the central ridge cap and extreme eave tips,
  // strongly favouring the courtyard-facing slope so foliage is visible from the front.
  const mid = Math.floor(top.length / 2);
  const courtyardNegativeU = Math.abs(spec.ry ?? 0) > 1;
  const segments: { seg: number; slopeWeight: number }[] = [];
  for (let s = 1; s < top.length - 2; s++) {
    if (Math.abs(s - mid) <= 1 || s === mid - 2) continue;
    const onFront = courtyardNegativeU ? s < mid : s > mid;
    const nearEave = s <= 5 || s >= top.length - 6;
    segments.push({
      seg: s,
      slopeWeight: (onFront ? 5.5 : 0.45) * (nearEave ? 1.35 : 1.0),
    });
  }
  if (!segments.length || courses < 2) return;

  // Score every (valley, segment) cell by how close that section of the roof
  // is to an overhanging tree, so tree-side valleys get clusters while far
  // valleys stay bare.
  const cells: {
    valley: number;
    seg: number;
    weight: number;
    kind: 'sakura' | 'maple' | 'bamboo';
  }[] = [];
  let totalWeight = 0;
  const vStart = courses > 3 ? 1 : 0;
  const vEnd = courses > 3 ? courses - 1 : courses;
  for (let valley = vStart; valley < vEnd; valley++) {
    const cx = -spec.width / 2 + ((valley + 0.5) * spec.width) / courses;
    for (const { seg, slopeWeight } of segments) {
      const [u0] = top[seg]!,
        [u1] = top[seg + 1]!;
      const cu = (u0 + u1) * 0.2;
      const wx = spec.x + cx * cosR + cu * sinR;
      const wz = spec.z - cx * sinR + cu * cosR;
      let bestKind: 'sakura' | 'maple' | 'bamboo' = 'sakura';
      let bestW = 0;
      for (const src of sources) {
        const dist = Math.hypot(wx - src.x, wz - src.z);
        if (dist >= src.reach) continue;
        const w = Math.pow(1 - dist / src.reach, 1.55);
        if (w > bestW) {
          bestW = w;
          bestKind = src.kind;
        }
      }
      if (bestW > 0.1) {
        const weight = Math.pow(bestW, 1.35) * slopeWeight;
        cells.push({ valley, seg, weight, kind: bestKind });
        totalWeight += weight;
      }
    }
  }
  if (!cells.length || totalWeight <= 0) return;

  const area = spec.width * (spec.front + spec.back);
  // About half the original count (~55-65 pieces total across all roofs),
  // concentrated on the tree-facing valleys of each roof.
  const targetDrifts = Math.max(4, Math.round(area * 0.68 + 3.5));

  let order = 0;
  for (let d = 0; d < targetDrifts; d++) {
    let pick = rand() * totalWeight;
    let chosen = cells[0]!;
    for (const cell of cells) {
      pick -= cell.weight;
      if (pick <= 0) {
        chosen = cell;
        break;
      }
    }
    const [u0, v0] = top[chosen.seg]!,
      [u1, v1] = top[chosen.seg + 1]!;
    const baseT = 0.22 + rand() * 0.56;
    const baseValleyOffset = 0.28 + rand() * 0.44;
    const theta = Math.atan2(v1 - v0, u1 - u0);
    const cluster = chosen.weight > 0.38 && rand() < 0.55 ? 2 : 1;

    for (let m = 0; m < cluster; m++) {
      order++;
      const t = THREE.MathUtils.clamp(
        baseT + (m === 0 ? 0 : (rand() - 0.5) * 0.36),
        0.15,
        0.85,
      );
      const u = u0 + (u1 - u0) * t;
      const v = v0 + (v1 - v0) * t;
      const valleyOffset = THREE.MathUtils.clamp(
        baseValleyOffset + (m === 0 ? 0 : (rand() - 0.5) * 0.24),
        0.22,
        0.78,
      );
      const x =
        -spec.width / 2 + ((chosen.valley + valleyOffset) * spec.width) / courses;
      const lift = 0.008 + (order % 6) * 0.001;
      const y = v + Math.cos(theta) * lift;
      const z = u - Math.sin(theta) * lift;

      const isSakura =
        chosen.kind === 'sakura' ? rand() < 0.86 : rand() < 0.22;
      const tone = isSakura
        ? petalTones[Math.floor(rand() * petalTones.length)]!
        : chosen.kind === 'maple'
          ? mapleTones[Math.floor(rand() * mapleTones.length)]!
          : bambooTones[Math.floor(rand() * bambooTones.length)]!;
      const geometry = isSakura
        ? roofSakuraPetal(0.03 + rand() * 0.012)
        : chosen.kind === 'maple' && rand() < 0.72
          ? roofMapleLeaf(0.036 + rand() * 0.014)
          : roofPointedLeaf(0.034 + rand() * 0.013);

      local.put(geometry, tone, x, y, z, {
        rotation: [-Math.PI / 2 - theta, 0, rand() * Math.PI * 2],
        scale: isSakura
          ? [1.15 + rand() * 0.22, 0.92 + rand() * 0.16, 1]
          : [0.95 + rand() * 0.2, 0.95 + rand() * 0.2, 1],
        outline: false,
        still: true,
      });
    }
  }
}

function railing(
  b: ToonBuilder,
  points: [number, number][],
  floor: number,
  height = 0.4,
) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i]!,
      [x1, z1] = points[i + 1]!;
    const length = Math.hypot(x1 - x0, z1 - z0);
    const posts = Math.max(1, Math.round(length / 0.5));
    for (let p = 0; p <= posts; p++) {
      if (p === posts && i < points.length - 2) continue;
      const t = p / posts;
      b.box(
        0.07,
        height,
        0.07,
        'red',
        x0 + (x1 - x0) * t,
        floor + height / 2,
        z0 + (z1 - z0) * t,
      );
    }
    for (const [y, r] of [
      [height, 0.032],
      [height * 0.45, 0.022],
    ] as const)
      b.beam([x0, floor + y, z0], [x1, floor + y, z1], r, 'red', r, {
        outline: r > 0.03,
      });
  }
  for (const [x, z] of [points[0]!, points.at(-1)!])
    b.ball(0.055, 'gold', x, floor + height + 0.05, z, [1, 1.2, 1]);
}

function lattice(
  b: ToonBuilder,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  backing: Tone,
  bars: Tone,
  columns: number,
  rows: number,
  ry = 0,
) {
  const local = frame(b, x, y, z, ry);
  local.box(w, h, 0.05, backing, 0, 0, 0);
  local.box(w + 0.08, 0.07, 0.08, 'woodDark', 0, h / 2, 0.01);
  local.box(w + 0.08, 0.07, 0.08, 'woodDark', 0, -h / 2, 0.01);
  for (let i = 1; i < columns; i++)
    local.box(0.025, h, 0.07, bars, -w / 2 + (i * w) / columns, 0, 0.01, {
      outline: false,
    });
  for (let i = 1; i < rows; i++)
    local.box(w, 0.025, 0.07, bars, 0, -h / 2 + (i * h) / rows, 0.01, {
      outline: false,
    });
}

/** Nagare-zukuri hall: raised floor, broad veranda, long front slope over the stairs. */
export function buildHall(b: ToonBuilder) {
  const { x, z, floor: F, width: W, depth: D } = hall;
  const T = terrace.top;
  const front = z + D / 2,
    back = z - D / 2;
  const deckFront = front + 0.55;
  b.slab(W + 1.3, D + 1.1, 0.18, T + 0.16, 'stone', x, z + 0.15, 0.05);
  for (const px of [-W / 2 - 0.36, -0.9, 0.9, W / 2 + 0.36])
    for (const pz of [back - 0.05, z, deckFront - 0.08])
      b.box(
        0.12,
        F - T - 0.2,
        0.12,
        'woodDark',
        x + px,
        (F + T + 0.04) / 2,
        pz,
        {
          outline: false,
        },
      );
  b.box(W + 0.9, 0.12, D + 0.65, 'wood', x, F - 0.06, z + 0.22);
  for (let i = 0; i < 14; i++)
    b.box(
      0.02,
      0.02,
      D + 0.6,
      'woodDark',
      x - W / 2 - 0.35 + i * 0.32,
      F + 0.005,
      z + 0.22,
      {
        outline: false,
      },
    );
  railing(
    b,
    [
      [x - 0.72, deckFront - 0.06],
      [x - W / 2 - 0.4, deckFront - 0.06],
      [x - W / 2 - 0.4, back + 0.05],
    ],
    F,
  );
  railing(
    b,
    [
      [x + 0.72, deckFront - 0.06],
      [x + W / 2 + 0.4, deckFront - 0.06],
      [x + W / 2 + 0.4, back + 0.05],
    ],
    F,
  );

  // Body: white plaster between vermilion posts and beams.
  b.box(W, 1.75, D, 'white', x, F + 0.875, z);
  for (const px of [-W / 2, -0.62, 0.62, W / 2])
    for (const pz of [front, back])
      b.cylinder(0.1, 0.1, 1.95, 'red', x + px, F + 0.97, pz, 10);
  for (const side of [-1, 1])
    b.cylinder(0.1, 0.1, 1.95, 'red', x + (side * W) / 2, F + 0.97, z, 10);
  for (const [y, h] of [
    [F + 0.06, 0.12],
    [F + 1.48, 0.15],
    [F + 1.86, 0.12],
  ] as const)
    b.box(W + 0.14, h, D + 0.14, 'red', x, y, z);
  b.box(W - 0.05, 0.22, D - 0.05, 'white', x, F + 1.67, z, { outline: false });
  for (let i = 0; i < 9; i++)
    b.box(
      0.05,
      0.22,
      D + 0.09,
      'red',
      x - W / 2 + 0.22 + i * 0.41,
      F + 1.67,
      z,
      {
        outline: false,
      },
    );
  for (const px of [-W / 2, -0.62, 0.62, W / 2])
    b.box(0.24, 0.1, 0.3, 'woodLight', x + px, F + 1.98, front + 0.06);

  // Front bays: lattice doors at the centre, shitomido panels either side.
  lattice(
    b,
    x,
    F + 0.72,
    front + 0.04,
    1.08,
    1.3,
    'woodDark',
    'woodLight',
    6,
    7,
  );
  b.box(0.04, 1.3, 0.09, 'gold', x, F + 0.72, front + 0.08);
  for (const side of [-1, 1]) {
    lattice(
      b,
      x + side * 1.24,
      F + 0.98,
      front + 0.04,
      1.04,
      0.72,
      'shoji',
      'woodDark',
      5,
      4,
    );
    b.box(
      1.04,
      0.5,
      0.06,
      'woodLight',
      x + side * 1.24,
      F + 0.32,
      front + 0.04,
    );
    lattice(
      b,
      x + (side * W) / 2 + side * 0.03,
      F + 0.95,
      z,
      1.6,
      0.8,
      'shoji',
      'woodDark',
      6,
      4,
      Math.PI / 2,
    );
  }
  b.box(0.62, 0.38, 0.06, 'gold', x, F + 1.67, front + 0.12);
  b.box(0.52, 0.29, 0.06, 'roofEdge', x, F + 1.67, front + 0.15);
  b.box(0.18, 0.04, 0.02, 'gold', x, F + 1.7, front + 0.19, { outline: false });

  // Wooden stairs with sloping rails down to the terrace.
  const tread = 0.2,
    rise = (F - T) / 5;
  for (let i = 0; i < 4; i++) {
    const top = F - (i + 1) * rise;
    b.box(
      1.36,
      top - T + 0.02,
      tread,
      i % 2 ? 'woodLight' : 'wood',
      x,
      (top + T) / 2,
      deckFront + tread * (i + 0.5),
    );
  }
  const stairEnd = deckFront + tread * 4;
  for (const side of [-1, 1]) {
    b.box(
      0.08,
      F - T,
      0.06,
      'woodDark',
      x + side * 0.72,
      (F + T) / 2,
      stairEnd - 0.05,
    );
    b.beam(
      [x + side * 0.72, F + 0.4, deckFront - 0.06],
      [x + side * 0.72, T + 0.48, stairEnd - 0.05],
      0.032,
      'red',
    );
    b.box(0.08, 0.5, 0.08, 'red', x + side * 0.72, T + 0.25, stairEnd - 0.05);
  }

  // Kōhai canopy posts, bell, shimenawa and the long front slope.
  for (const side of [-1, 1]) {
    const px = x + side * canopy.half;
    b.cylinder(0.14, 0.14, 0.14, 'stone', px, T + 0.07, canopy.z, 8);
    b.cylinder(
      0.09,
      0.09,
      canopy.top - T - 0.14,
      'red',
      px,
      (canopy.top + T + 0.14) / 2,
      canopy.z,
      10,
    );
    b.box(
      0.13,
      0.14,
      front - canopy.z + 0.2,
      'red',
      px,
      canopy.top - 0.12,
      (front + canopy.z) / 2,
    );
  }
  b.box(
    canopy.half * 2 + 0.3,
    0.15,
    0.15,
    'red',
    x,
    canopy.top - 0.12,
    canopy.z,
  );
  b.box(
    canopy.half * 2 + 0.2,
    0.1,
    0.12,
    'woodLight',
    x,
    canopy.top - 0.3,
    canopy.z,
  );
  const rope = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x - canopy.half, canopy.top - 0.38, canopy.z + 0.04),
    new THREE.Vector3(x - canopy.half * 0.5, canopy.top - 0.5, canopy.z + 0.08),
    new THREE.Vector3(x, canopy.top - 0.55, canopy.z + 0.09),
    new THREE.Vector3(x + canopy.half * 0.5, canopy.top - 0.5, canopy.z + 0.08),
    new THREE.Vector3(x + canopy.half, canopy.top - 0.38, canopy.z + 0.04),
  ]);
  b.part(new THREE.TubeGeometry(rope, 24, 0.07, 7), 'straw', 0, 0, 0);
  for (const t of [0.22, 0.5, 0.78]) {
    const p = rope.getPoint(t);
    b.cylinder(0.035, 0.012, 0.22, 'straw', p.x, p.y - 0.15, p.z, 6, {
      outline: false,
    });
  }
  b.box(
    0.06,
    0.2,
    0.06,
    'woodDark',
    bellRope.x,
    bellRope.top + 0.35,
    bellRope.z,
    { outline: false },
  );
  b.box(
    0.08,
    0.06,
    bellRope.z - canopy.z + 0.08,
    'woodDark',
    bellRope.x,
    canopy.top - 0.2,
    (bellRope.z + canopy.z) / 2,
    { outline: false },
  );
  b.ball(
    0.15,
    'gold',
    bellRope.x,
    bellRope.top + 0.12,
    bellRope.z,
    [1, 1.05, 1],
    {},
    2,
  );
  b.box(
    0.2,
    0.02,
    0.06,
    'roofEdge',
    bellRope.x,
    bellRope.top + 0.07,
    bellRope.z + 0.12,
    { outline: false },
  );

  // Offering box: slatted top, gilded corners.
  const ox = offeringBox.x,
    oz = offeringBox.z;
  b.box(0.92, 0.44, 0.44, 'wood', ox, T + 0.22, oz);
  b.box(0.98, 0.06, 0.5, 'woodDark', ox, T + 0.47, oz);
  for (let i = 0; i < 6; i++)
    b.box(
      0.86,
      0.035,
      0.045,
      'woodLight',
      ox,
      T + 0.51,
      oz - 0.18 + i * 0.072,
      { outline: false },
    );
  for (const sx of [-1, 1])
    b.box(0.06, 0.44, 0.06, 'gold', ox + sx * 0.46, T + 0.22, oz + 0.22, {
      outline: false,
    });
  b.box(0.5, 0.2, 0.02, 'woodLight', ox, T + 0.24, oz + 0.225, {
    outline: false,
  });

  curvedRoof(b, {
    x,
    y: F + 3.45,
    z: z - 0.15,
    width: W + 1.15,
    front: canopy.z - (z - 0.15) + 0.12,
    back: D / 2 + 0.85,
    frontDrop: 1.98,
    backDrop: 1.3,
    rafters: true,
    gable: { from: -D / 2 + 0.12, to: D / 2 + 0.2, base: -1.5, half: W / 2 },
  });
}

/** Shrine office: lived-in quarters with an engawa, shoji and a little noren. */
export function buildOffice(b: ToonBuilder) {
  const { x, z, base, width: W, depth: D } = office;
  const F = base + 0.3;
  b.slab(W + 0.5, D + 0.9, base + 0.05, base, 'stone', x, z + 0.2, 0.06);
  b.box(W + 0.2, 0.1, D + 0.6, 'wood', x, F - 0.05, z + 0.25);
  for (let i = 0; i < 8; i++)
    b.box(
      W + 0.18,
      0.015,
      0.015,
      'woodDark',
      x,
      F + 0.003,
      z - D / 2 + 0.1 + i * 0.42,
      { outline: false },
    );
  b.box(W, 1.35, D, 'white', x, F + 0.675, z);
  for (const px of [-W / 2, 0, W / 2])
    for (const pz of [-D / 2, D / 2])
      b.box(0.11, 1.45, 0.11, 'wood', x + px, F + 0.72, z + pz);
  for (const pz of [-D / 2 + 0.02, 0, D / 2 - 0.02])
    for (const side of [-1, 1])
      b.box(0.11, 1.45, 0.11, 'wood', x + (side * W) / 2, F + 0.72, z + pz);
  b.box(W + 0.12, 0.12, D + 0.12, 'wood', x, F + 1.36, z);
  b.box(W + 0.12, 0.08, D + 0.12, 'woodDark', x, F + 0.04, z);
  // Shoji sliding doors on the front, windows facing the main hall.
  for (const side of [-1, 1])
    lattice(
      b,
      x + side * 0.46,
      F + 0.56,
      z + D / 2 + 0.03,
      0.82,
      1.05,
      'shoji',
      'woodLight',
      3,
      5,
    );
  for (const pz of [-0.72, 0.72])
    lattice(
      b,
      x - W / 2 - 0.03,
      F + 0.82,
      z + pz,
      0.9,
      0.62,
      'shoji',
      'woodDark',
      4,
      3,
      -Math.PI / 2,
    );
  for (let i = 0; i < 3; i++)
    b.box(
      0.3,
      0.42,
      0.03,
      i === 1 ? 'navy' : 'red',
      x - 0.32 + i * 0.32,
      F + 1.08,
      z + D / 2 + 0.12,
    );
  b.box(1.0, 0.05, 0.05, 'woodDark', x, F + 1.3, z + D / 2 + 0.12, {
    outline: false,
  });
  for (let i = 0; i < 3; i++)
    b.box(
      0.32,
      0.12 - i * 0.03,
      0.26,
      'stoneLight',
      x,
      F - 0.12 - i * 0.1,
      z + D / 2 + 0.42 + i * 0.18,
    );
  curvedRoof(b, {
    x,
    y: F + 2.25,
    z,
    ry: Math.PI / 2,
    width: D + 0.6,
    front: W / 2 + 0.5,
    back: W / 2 + 0.5,
    frontDrop: 1.05,
    backDrop: 1.05,
    rafters: true,
    gable: { from: -W / 2, to: W / 2, base: -0.95, half: D / 2 },
  });
  // Lived-in clutter: barrels, crates, sake casks and a water bucket.
  for (const [bx, bz] of [
    [x - 1.0, z + 1.95],
    [x - 0.68, z + 2.15],
  ] as const) {
    b.cylinder(0.2, 0.18, 0.46, 'wood', bx, 0.23, bz, 12);
    for (const y of [0.1, 0.36])
      b.cylinder(0.205, 0.205, 0.04, 'woodDark', bx, y, bz, 12, {
        outline: false,
      });
  }
  for (const [cx, cy, cz] of [
    [x - 1.25, 0.17, z + 2.55],
    [x - 1.25, 0.5, z + 2.55],
    [x - 0.9, 0.17, z + 2.75],
  ] as const)
    b.box(0.34, 0.34, 0.34, 'woodLight', cx, cy, cz, {
      rotation: [0, cx * 0.4, 0],
    });
  for (const [sx, sy] of [
    [-0.24, 0.2],
    [0.24, 0.2],
    [0, 0.58],
  ] as const) {
    b.cylinder(0.19, 0.19, 0.38, 'paper', x + 0.62 + sx, sy, z + 2.25, 12, {
      rotation: [0, 0, Math.PI / 2],
    });
    b.cylinder(0.195, 0.195, 0.1, 'red', x + 0.62 + sx, sy, z + 2.25, 12, {
      rotation: [0, 0, Math.PI / 2],
      outline: false,
    });
  }
}

export function buildStorehouse(b: ToonBuilder) {
  const { x, z } = storehouse;
  b.slab(1.75, 1.8, 0.26, 0.26, 'stoneDark', x, z, 0.05);
  b.box(1.45, 1.2, 1.5, 'white', x, 0.86, z);
  b.box(1.47, 0.42, 1.52, 'roofEdge', x, 0.47, z);
  for (let i = 0; i < 5; i++)
    for (const side of [-1, 1])
      b.box(
        0.02,
        0.02,
        1.53,
        'white',
        x - 0.6 + i * 0.3,
        0.47 + side * 0.08,
        z,
        { outline: false, rotation: [side * 0.4, 0, 0] },
      );
  b.box(0.62, 0.86, 0.06, 'woodDark', x, 0.72, z + 0.76);
  b.box(0.68, 0.06, 0.08, 'gold', x, 1.18, z + 0.78);
  b.ball(0.035, 'gold', x + 0.12, 0.74, z + 0.8);
  for (let i = 0; i < 3; i++)
    b.box(
      0.7,
      0.08,
      0.26,
      'stoneLight',
      x,
      0.04 + i * 0.08,
      z + 0.98 - i * 0.12,
    );
  curvedRoof(b, {
    x,
    y: 2.06,
    z,
    width: 1.85,
    front: 1.05,
    back: 1.05,
    frontDrop: 0.6,
    backDrop: 0.6,
    gable: { from: -0.75, to: 0.75, base: -0.6, half: 0.725 },
  });
  // Spare broom, bucket and dustpan by the door.
  b.beam(
    [x + 0.62, 0.05, z + 0.82],
    [x + 0.78, 1.05, z + 0.8],
    0.025,
    'woodLight',
  );
  b.cylinder(0.11, 0.04, 0.32, 'straw', x + 0.6, 0.16, z + 0.83, 8);
  b.cylinder(0.13, 0.15, 0.24, 'woodLight', x - 0.55, 0.12, z + 1.0, 10);
  b.cylinder(0.135, 0.135, 0.03, 'woodDark', x - 0.55, 0.2, z + 1.0, 10, {
    outline: false,
  });
}

export function buildTorii(b: ToonBuilder) {
  const { z, half, height: H } = torii;
  for (const side of [-1, 1]) {
    const px = side * half;
    b.cylinder(0.2, 0.18, 0.28, 'roofEdge', px, 0.14, z, 12);
    b.cylinder(0.14, 0.12, H - 0.25, 'red', px, (H + 0.25) / 2, z, 12);
  }
  b.box(half * 2 + 0.55, 0.15, 0.13, 'red', 0, H - 0.72, z);
  const rope = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-half + 0.12, H - 0.8, z + 0.08),
    new THREE.Vector3(0, H - 0.88, z + 0.09),
    new THREE.Vector3(half - 0.12, H - 0.8, z + 0.08),
  ]);
  b.part(new THREE.TubeGeometry(rope, 16, 0.035, 6), 'straw', 0, 0, 0);
  // Gaku: a vertical name plaque between the nuki and the shimaki, hand-lettered 梦桜.
  const plaque = { y: H - 0.43, w: 0.36, h: 0.66, front: z + 0.14 };
  b.box(
    plaque.w,
    plaque.h,
    0.05,
    'roofEdge',
    0,
    plaque.y,
    plaque.front - 0.025,
  );
  letterVertically(
    b,
    '梦桜',
    0,
    plaque.y,
    plaque.front + 0.006,
    0.21,
    0.05,
    'blossomPaint',
  );
  b.box(half * 2 + 0.7, 0.16, 0.2, 'red', 0, H - 0.12, z);
  // Kasagi: upswept lintel with a dark cap.
  const span = half + 0.72;
  const shape = new THREE.Shape();
  const curve = (u: number) => 0.2 * Math.pow(Math.abs(u) / span, 2.6);
  shape.moveTo(-span, curve(span) + 0.18);
  for (let i = -10; i <= 10; i++)
    shape.lineTo(
      (i / 10) * span,
      curve((i / 10) * span) + (Math.abs(i) === 10 ? 0.18 : 0.24),
    );
  for (let i = 10; i >= -10; i--)
    shape.lineTo((i / 10) * span * 0.97, curve((i / 10) * span) + 0.02);
  const kasagi = new THREE.ExtrudeGeometry(shape, {
    depth: 0.26,
    bevelEnabled: false,
  });
  kasagi.translate(0, 0, -0.13);
  b.part(kasagi, 'red', 0, H - 0.04, z);
  const cap = new THREE.Shape();
  cap.moveTo(-span - 0.04, curve(span) + 0.3);
  for (let i = -10; i <= 10; i++)
    cap.lineTo((i / 10) * (span + 0.04), curve((i / 10) * span) + 0.3);
  for (let i = 10; i >= -10; i--)
    cap.lineTo((i / 10) * (span + 0.02), curve((i / 10) * span) + 0.2);
  const capGeometry = new THREE.ExtrudeGeometry(cap, {
    depth: 0.3,
    bevelEnabled: false,
  });
  capGeometry.translate(0, 0, -0.15);
  b.part(capGeometry, 'roofEdge', 0, H - 0.04, z);
}

export function buildLantern(
  b: ToonBuilder,
  x: number,
  base: number,
  z: number,
) {
  b.cylinder(0.24, 0.26, 0.12, 'stone', x, base + 0.06, z, 6);
  b.cylinder(0.12, 0.17, 0.12, 'stoneLight', x, base + 0.17, z, 6);
  b.cylinder(0.075, 0.09, 0.42, 'stone', x, base + 0.44, z, 10);
  b.cylinder(0.2, 0.15, 0.1, 'stoneLight', x, base + 0.7, z, 6);
  b.box(0.27, 0.24, 0.27, 'stone', x, base + 0.87, z);
  for (const [dx, dz, ry] of [
    [0, 0.13, 0],
    [0, -0.13, 0],
    [0.13, 0, Math.PI / 2],
    [-0.13, 0, Math.PI / 2],
  ] as const)
    b.box(0.13, 0.13, 0.03, 'glow', x + dx, base + 0.88, z + dz, {
      rotation: [0, ry, 0],
      outline: false,
    });
  b.cylinder(0.33, 0.07, 0.17, 'stoneLight', x, base + 1.07, z, 6);
  b.cylinder(0.31, 0.31, 0.04, 'stone', x, base + 0.99, z, 6, {
    outline: false,
  });
  // Seated into the roof tip so the flame below never lights its underside.
  b.ball(0.07, 'stone', x, base + 1.18, z, [1, 1.3, 1]);
}

function smallGable(
  b: ToonBuilder,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  ry = 0,
) {
  curvedRoof(b, {
    x,
    y,
    z,
    ry,
    width,
    front: depth / 2,
    back: depth / 2,
    frontDrop: depth * 0.32,
    backDrop: depth * 0.32,
    thickness: 0.08,
  });
}

/** A flat, pointed leaf lying on the ground, about 9cm long. */
function fallenLeaf() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.046);
  shape.quadraticCurveTo(0.028, -0.005, 0, 0.046);
  shape.quadraticCurveTo(-0.028, -0.005, 0, -0.046);
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

export function buildTemizuya(b: ToonBuilder) {
  const { x, z } = temizuya;
  b.slab(1.6, 1.25, 0.06, 0.08, 'slabDark', x, z, 0.06);
  for (const px of [-0.62, 0.62])
    for (const pz of [-0.42, 0.42])
      b.box(0.1, 1.42, 0.1, 'woodDark', x + px, 0.79, z + pz);
  b.box(1.4, 0.1, 0.12, 'woodDark', x, 1.48, z + 0.42);
  b.box(1.4, 0.1, 0.12, 'woodDark', x, 1.48, z - 0.42);
  b.slab(1.0, 0.56, 0.42, 0.5, 'stone', x, z, 0.08);
  // The water itself is animated in basin.ts.
  // Kakehi: an upright bamboo pipe standing on the base carries the
  // spout out over the basin, with darker nodes along both.
  b.cylinder(0.045, 0.045, 0.84, 'leafLight', x - 0.66, 0.5, z - 0.1);
  for (const y of [0.32, 0.6, 0.9])
    b.cylinder(0.05, 0.05, 0.02, 'leaf', x - 0.66, y, z - 0.1);
  b.beam(
    [x - 0.66, 0.84, z - 0.1],
    [x - 0.3, 0.62, z - 0.05],
    0.04,
    'leafLight',
  );
  b.beam(
    [x - 0.55, 0.773, z - 0.085],
    [x - 0.535, 0.764, z - 0.083],
    0.045,
    'leaf',
  );
  // Stones set just in front of the pipe's foot hide where it meets the
  // base, with a drift of fallen leaves around them, some blown off onto
  // the ground.
  const px = x - 0.66,
    pz = z - 0.1;
  b.part(
    new THREE.DodecahedronGeometry(0.13, 0),
    'stone',
    px + 0.08,
    0.11,
    pz + 0.15,
    { scale: [1.2, 0.8, 0.85], rotation: [0.1, 0.5, 0.05] },
  );
  b.part(
    new THREE.DodecahedronGeometry(0.075, 0),
    'stoneDark',
    px - 0.08,
    0.095,
    pz + 0.12,
    { scale: [1.1, 0.7, 0.9], rotation: [0.3, 2, 0.1] },
  );
  for (const [dx, dz, turn, tone] of [
    [0.2, 0.12, 0.4, 'shrubAmber'],
    [0.24, -0.05, 2.1, 'meadowDry'],
    [-0.18, 0.16, 1.2, 'shrubOlive'],
    [0.05, 0.24, 2.8, 'woodLight'],
    [-0.22, -0.14, 0.7, 'shrubAmber'],
    [0.31, 0.22, 1.9, 'shrubOlive'],
    [-0.3, 0.05, 3.0, 'meadowDry'],
    [0.12, -0.22, 0.2, 'woodLight'],
    [-0.08, 0.33, 1.6, 'shrubAmber'],
    [0.38, -0.12, 2.5, 'meadowDry'],
  ] as const) {
    const lx = px + dx,
      lz = pz + dz;
    const onBase = Math.abs(lx - x) < 0.8 && Math.abs(lz - z) < 0.625;
    b.part(
      fallenLeaf(),
      tone,
      lx,
      (onBase ? 0.08 : groundAt(lx, lz)) + 0.004,
      lz,
      {
        rotation: [0.08 * Math.sin(turn * 3), turn, 0],
        outline: false,
      },
    );
  }
  for (let i = 0; i < 3; i++) {
    b.beam(
      [x - 0.25 + i * 0.25, 0.52, z + 0.16],
      [x - 0.2 + i * 0.25, 0.54, z - 0.12],
      0.012,
      'woodLight',
      0.012,
      { outline: false },
    );
    b.cylinder(
      0.04,
      0.035,
      0.06,
      'woodLight',
      x - 0.25 + i * 0.25,
      0.55,
      z + 0.2,
      8,
      { outline: false },
    );
  }
  smallGable(b, x, 1.98, z, 1.75, 1.45);
}

export function buildEmaRack(b: ToonBuilder) {
  const { x, z } = emaRack;
  for (const px of [-0.78, 0.78])
    b.box(0.1, 1.35, 0.1, 'woodDark', x + px, 0.68, z);
  for (const y of [1.18, 0.82]) b.box(1.68, 0.06, 0.06, 'wood', x, y, z);
  smallGable(b, x, 1.55, z, 1.95, 0.6);
}

export function buildOmikuji(b: ToonBuilder) {
  const { x, z } = omikuji;
  for (const px of [-0.42, 0.42])
    b.box(0.08, 1.0, 0.08, 'woodDark', x + px, 0.5, z);
  for (const y of [0.92, 0.7, 0.48]) {
    b.beam([x - 0.42, y, z], [x + 0.42, y, z], 0.01, 'woodDark', 0.01, {
      outline: false,
    });
    for (let i = 0; i < 6; i++)
      b.box(
        0.045,
        0.08,
        0.03,
        'white',
        x - 0.32 + i * 0.13 + (y % 0.2) * 0.2,
        y - 0.01,
        z,
        { rotation: [0, 0, 0.3 - (i % 3) * 0.3] },
      );
  }
}

export function buildNoticeBoard(b: ToonBuilder) {
  const { x, z } = noticeBoard;
  const ry = -0.35;
  const local = frame(b, x, 0, z, ry);
  for (const px of [-0.52, 0.52])
    local.box(0.09, 1.25, 0.09, 'woodDark', px, 0.62, 0);
  local.box(1.08, 0.62, 0.06, 'woodLight', 0, 0.86, 0.02);
  for (const [px, py, w, h, tone] of [
    [-0.28, 0.92, 0.32, 0.38, 'paper'],
    [0.08, 0.88, 0.26, 0.3, 'white'],
    [0.34, 0.95, 0.2, 0.26, 'blossomLight'],
    [0.25, 0.7, 0.3, 0.12, 'red'],
  ] as const)
    local.box(w, h, 0.02, tone, px, py, 0.06);
  smallGable(b, x, 1.42, z, 1.35, 0.5, ry);
}

/** Wooden fence along the courtyard edges, open at the path. */
export function fence(
  b: ToonBuilder,
  from: [number, number],
  to: [number, number],
) {
  const [x0, z0] = from,
    [x1, z1] = to;
  const length = Math.hypot(x1 - x0, z1 - z0);
  const posts = Math.max(1, Math.round(length / 0.62));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const px = x0 + (x1 - x0) * t,
      pz = z0 + (z1 - z0) * t;
    b.box(0.08, 0.5, 0.08, 'woodDark', px, 0.25, pz);
    b.box(0.11, 0.04, 0.11, 'roofEdge', px, 0.52, pz, { outline: false });
  }
  for (const y of [0.38, 0.18])
    b.beam([x0, y, z0], [x1, y, z1], 0.028, 'wood', 0.028, {
      outline: y > 0.3,
    });
}

/** Red tamagaki along the terrace edge, broken by the stone stairs. */
export function terraceFence(
  b: ToonBuilder,
  from: number,
  to: number,
  z: number,
) {
  const posts = Math.round(Math.abs(to - from) / 0.45);
  for (let i = 0; i <= posts; i++) {
    const px = from + ((to - from) * i) / posts;
    b.box(0.08, 0.46, 0.08, 'red', px, terrace.top + 0.23, z);
    b.box(0.1, 0.05, 0.1, 'roofEdge', px, terrace.top + 0.48, z, {
      outline: false,
    });
  }
  for (const y of [0.4, 0.15])
    b.box(
      Math.abs(to - from),
      0.05,
      0.05,
      'red',
      (from + to) / 2,
      terrace.top + y,
      z,
      { outline: y > 0.3 },
    );
}
