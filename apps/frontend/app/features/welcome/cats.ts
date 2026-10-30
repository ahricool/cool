import * as THREE from 'three';
import { cats, groundAt, type CatPose } from './layout';
import type { Tone, ToonBuilder } from './toon';

type V3 = THREE.Vector3Tuple;
/** Eyes, noses and paws are a few pixels across: the plainest sphere will do. */
const detail = (r: number) => (r < 0.03 ? 0 : 1);
/** A little larger than life so they read at the default camera distance. */
const SIZE = 1.2;

const coats: Record<
  (typeof cats)[number]['coat'],
  { fur: Tone; accent: Tone; patches?: [Tone, Tone] }
> = {
  ginger: { fur: 'catGinger', accent: 'catCream' },
  cream: { fur: 'catCream', accent: 'white' },
  grey: { fur: 'catGrey', accent: 'catCream' },
  black: { fur: 'catBlack', accent: 'catBlack' },
  calico: {
    fur: 'white',
    accent: 'catCream',
    patches: ['catGinger', 'catCharcoal'],
  },
};

const CAT_TAIL = 100;
const CAT_HEAD_AWAKE = 200;
const CAT_HEAD_DOZE = 300;
const CAT_BREATH = 400;
const CAT_STRETCH = 500;

/**
 * Parts placed in a cat's own frame (+z ahead, y up from the ground). Pieces
 * carrying a `swing` pivot and `mode` animate in the shader (breathing chests,
 * glancing heads, twitching ears and curling tails).
 */
function catFrame(
  b: ToonBuilder,
  base: THREE.Matrix4,
  phase: number,
  defaultSwing?: { pivot: V3; mode: number },
) {
  const local = new THREE.Matrix4();
  const put = (
    geometry: THREE.BufferGeometry,
    tone: Tone,
    at: V3,
    {
      rotation = [0, 0, 0],
      scale = [1, 1, 1],
      outline = true,
      swing = defaultSwing?.pivot,
      mode = defaultSwing?.mode ?? CAT_TAIL,
    }: {
      rotation?: V3;
      scale?: V3;
      outline?: boolean;
      /** Local point the piece moves about. */
      swing?: V3;
      mode?: number;
    } = {},
  ) => {
    geometry
      .applyMatrix4(
        local.compose(
          new THREE.Vector3(...at),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
          new THREE.Vector3(...scale),
        ),
      )
      .applyMatrix4(base);
    const hook = swing && new THREE.Vector3(...swing).applyMatrix4(base);
    b.part(geometry, tone, 0, 0, 0, {
      outline,
      dangle: hook && [hook.x, hook.y, hook.z, mode + phase],
    });
  };
  const frame = {
    put,
    ball: (
      r: number,
      tone: Tone,
      at: V3,
      scale: V3 = [1, 1, 1],
      options: { rotation?: V3; outline?: boolean; swing?: V3; mode?: number } = {},
    ) =>
      put(new THREE.IcosahedronGeometry(r, detail(r)), tone, at, {
        scale,
        ...options,
      }),
    /** Pale fur markings; their ink would show as seams across the coat. */
    mark: (
      r: number,
      tone: Tone,
      at: V3,
      scale: V3 = [1, 1, 1],
      options: { swing?: V3; mode?: number } = {},
    ) =>
      put(new THREE.IcosahedronGeometry(r, detail(r)), tone, at, {
        scale,
        outline: false,
        ...options,
      }),
    /** A tapered tube from `a` to `c`. */
    limb(
      a: V3,
      c: V3,
      r: number,
      tone: Tone,
      swing?: V3,
      tip = r,
      mode = CAT_TAIL,
    ) {
      const start = new THREE.Vector3(...a);
      const vector = new THREE.Vector3(...c).sub(start);
      const geometry = new THREE.CylinderGeometry(tip, r, vector.length(), 7);
      geometry.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          vector.clone().normalize(),
        ),
      );
      put(geometry, tone, start.addScaledVector(vector, 0.5).toArray(), {
        swing,
        mode,
      });
    },
    /** A tail through `points`, thinning towards a rounded tip. */
    tail(points: V3[], r: number, tone: Tone, swing?: V3) {
      for (let i = 1; i < points.length; i++) {
        const t0 = 1 - ((i - 1) / points.length) * 0.35,
          t1 = 1 - (i / points.length) * 0.35;
        frame.limb(
          points[i - 1]!,
          points[i]!,
          r * t0,
          tone,
          swing,
          r * t1,
          CAT_TAIL,
        );
        put(new THREE.IcosahedronGeometry(r * t1, 0), tone, points[i]!, {
          swing,
          mode: CAT_TAIL,
        });
      }
    },
    /** A nested frame, e.g. the head turned and animated on the neck. */
    child(at: V3, rotation: V3 = [0, 0, 0], mode?: number) {
      return catFrame(
        b,
        base
          .clone()
          .multiply(
            new THREE.Matrix4().compose(
              new THREE.Vector3(...at),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
              new THREE.Vector3(1, 1, 1),
            ),
          ),
        phase,
        mode !== undefined ? { pivot: [0, 0, 0], mode } : defaultSwing,
      );
    },
  };
  return frame;
}
type CatFrame = ReturnType<typeof catFrame>;
type Coat = (typeof coats)[keyof typeof coats];

/** Round head with pointed ears, a pale muzzle and dot or closed eyes. */
function head(f: CatFrame, coat: Coat, asleep = false) {
  f.ball(0.07, coat.fur, [0, 0, 0], [1.12, 0.95, 1]);
  for (const side of [-1, 1]) {
    f.put(
      new THREE.CylinderGeometry(0, 0.032, 0.058, 4),
      coat.fur,
      [side * 0.043, 0.062, -0.008],
      { rotation: [0, Math.PI / 4, -side * 0.32] },
    );
    f.put(
      new THREE.CylinderGeometry(0, 0.018, 0.036, 4),
      'catPink',
      [side * 0.041, 0.058, 0.008],
      { rotation: [0, Math.PI / 4, -side * 0.32], outline: false },
    );
    if (asleep)
      f.put(
        new THREE.BoxGeometry(0.024, 0.005, 0.005),
        'roofEdge',
        [side * 0.03, 0.006, 0.066],
        { rotation: [0, 0, side * 0.2], outline: false },
      );
    else
      f.ball(0.011, 'roofEdge', [side * 0.03, 0.012, 0.064], [1, 1.3, 0.6], {
        outline: false,
      });
  }
  f.mark(0.032, coat.accent, [0, -0.024, 0.056], [1.35, 0.8, 0.8]);
  f.ball(0.01, 'catPink', [0, -0.008, 0.074], [1.2, 0.8, 0.8], {
    outline: false,
  });
}

const poses: Record<CatPose, (f: CatFrame, coat: Coat) => void> = {
  sit(f, { fur, accent }) {
    const breath = { swing: [0, 0, 0] as V3, mode: CAT_BREATH };
    f.ball(0.085, fur, [0, 0.075, -0.02], [1.15, 0.85, 1.15], breath);
    f.ball(0.075, fur, [0, 0.145, 0.02], [0.95, 1.35, 0.95], {
      rotation: [-0.2, 0, 0],
      ...breath,
    });
    f.mark(0.045, accent, [0, 0.15, 0.075], [1, 1.4, 0.6], breath);
    for (const side of [-1, 1]) {
      f.limb([side * 0.03, 0.13, 0.05], [side * 0.03, 0.014, 0.07], 0.018, fur);
      f.mark(0.022, accent, [side * 0.03, 0.012, 0.082], [1, 0.6, 1.3]);
      f.ball(0.03, fur, [side * 0.07, 0.02, 0.02], [0.8, 0.6, 1.6]);
    }
    head(
      f.child([0, 0.27, 0.04], [-0.1, 0.35, 0.12], CAT_HEAD_AWAKE),
      { fur, accent },
    );
    f.tail(
      [
        [0, 0.04, -0.1],
        [0.02, 0.14, -0.15],
        [0.06, 0.23, -0.13],
        [0.09, 0.27, -0.08],
      ],
      0.02,
      fur,
      [0, 0.04, -0.1],
    );
  },
  loaf(f, coat) {
    const { fur, accent } = coat;
    const breath = { swing: [0, 0, 0] as V3, mode: CAT_BREATH };
    f.ball(0.1, fur, [0, 0.065, -0.01], [0.85, 0.62, 1.25], breath);
    f.mark(0.05, accent, [0, 0.05, 0.1], [1.2, 0.7, 0.6], breath);
    for (const side of [-1, 1])
      f.mark(0.016, accent, [side * 0.025, 0.012, 0.118], [1, 0.7, 1]);
    head(f.child([0, 0.13, 0.1], [0.05, 0.3, 0], CAT_HEAD_DOZE), coat, true);
    f.tail(
      [
        [0.06, 0.03, -0.11],
        [0.095, 0.025, -0.01],
        [0.08, 0.022, 0.08],
      ],
      0.018,
      fur,
      [0.06, 0.03, -0.11],
    );
  },
  curl(f, coat) {
    const { fur, patches } = coat;
    const breath = { swing: [0, 0, 0] as V3, mode: CAT_BREATH };
    // A ring of body laid flat, open where the head tucks in.
    const ring = new THREE.TorusGeometry(0.075, 0.048, 6, 14, Math.PI * 1.75);
    ring.rotateX(-Math.PI / 2);
    f.put(ring, fur, [0, 0.045, 0], { scale: [1, 0.8, 1], ...breath });
    f.ball(0.06, fur, [0, 0.04, 0], [1, 0.6, 1], breath);
    if (patches)
      [0.4, 1.15].forEach((turn, i) =>
        f.ball(
          0.042,
          patches[i]!,
          [
            Math.cos(turn * Math.PI) * 0.078,
            0.075,
            -Math.sin(turn * Math.PI) * 0.078,
          ],
          [1, 0.35, 1],
          { outline: false, ...breath },
        ),
      );
    head(
      f.child([0.065, 0.06, 0.04], [0.35, 2.1, 0.35], CAT_HEAD_DOZE),
      coat,
      true,
    );
    // The tail wraps round the outside and over her nose, tip gently twitching.
    const points: V3[] = [1.45, 1.6, 1.75, 1.9, 2.02].map((turn) => [
      Math.cos(turn * Math.PI) * 0.13,
      0.028,
      -Math.sin(turn * Math.PI) * 0.13,
    ]);
    f.tail(points, 0.022, fur, points[0]!);
  },
  sprawl(f, coat) {
    const { fur, accent } = coat;
    const breath = { swing: [0, 0, 0] as V3, mode: CAT_BREATH };
    f.ball(0.1, fur, [0, 0.055, 0], [0.62, 0.55, 1.6], breath);
    f.mark(0.07, accent, [0.035, 0.05, 0], [0.4, 0.45, 1.3], breath);
    for (const [from, to] of [
      [
        [0.03, 0.05, 0.09],
        [0.17, 0.03, 0.16],
      ],
      [
        [0.03, 0.04, 0.07],
        [0.16, 0.02, 0.1],
      ],
      [
        [0.03, 0.05, -0.1],
        [0.17, 0.03, -0.17],
      ],
      [
        [0.03, 0.04, -0.08],
        [0.15, 0.02, -0.12],
      ],
    ] as [V3, V3][]) {
      f.limb(from, to, 0.017, fur, from, 0.017, CAT_STRETCH);
      f.mark(0.02, accent, to, [1.2, 0.8, 1], { swing: from, mode: CAT_STRETCH });
    }
    head(
      f.child([0, 0.065, 0.2], [0.1, 0.2, 1.25], CAT_HEAD_DOZE),
      coat,
      true,
    );
    f.tail(
      [
        [0, 0.04, -0.15],
        [0.02, 0.03, -0.27],
        [0.07, 0.025, -0.35],
      ],
      0.019,
      fur,
      [0, 0.04, -0.15],
    );
  },
  stretch(f, coat) {
    const { fur, accent } = coat;
    const stretchPivot = { swing: [0, 0.01, 0.18] as V3, mode: CAT_STRETCH };
    // Front down, tail up: rocking gently in a long morning stretch.
    f.ball(0.09, fur, [0, 0.12, -0.01], [0.8, 0.75, 1.5], {
      rotation: [0.45, 0, 0],
      ...stretchPivot,
    });
    for (const side of [-1, 1]) {
      f.limb([side * 0.03, 0.07, 0.08], [side * 0.03, 0.014, 0.2], 0.018, fur);
      f.mark(0.02, accent, [side * 0.03, 0.012, 0.215], [1, 0.6, 1.4]);
      f.limb(
        [side * 0.042, 0.15, -0.09],
        [side * 0.042, 0.014, -0.1],
        0.022,
        fur,
        [side * 0.042, 0.014, -0.1],
        0.022,
        CAT_STRETCH,
      );
      f.mark(0.022, accent, [side * 0.042, 0.012, -0.088], [1, 0.6, 1.4]);
    }
    head(f.child([0, 0.09, 0.15], [-0.25, 0, 0], CAT_HEAD_DOZE), coat, true);
    f.tail(
      [
        [0, 0.17, -0.13],
        [0, 0.27, -0.19],
        [0.015, 0.36, -0.18],
        [0.04, 0.4, -0.13],
      ],
      0.02,
      fur,
      [0, 0.17, -0.13],
    );
  },
};

/** Carved dark-stone food bowl heaped with kibble in front of the white cat. */
function foodBowl(f: CatFrame, [bx, by, bz]: V3) {
  // Chiseled 8-sided dark grey-black stone dish with a heavier stone rim.
  f.put(
    new THREE.CylinderGeometry(0.06, 0.074, 0.036, 8),
    'roof',
    [bx, by + 0.018, bz],
  );
  f.put(
    new THREE.CylinderGeometry(0.068, 0.075, 0.012, 8),
    'roofEdge',
    [bx, by + 0.007, bz],
    { outline: false },
  );
  f.put(
    new THREE.CylinderGeometry(0.052, 0.046, 0.012, 8),
    'stoneDark',
    [bx, by + 0.032, bz],
    { outline: false },
  );
  // Rounded heap of crunchy kibble inside the dish.
  f.ball(0.042, 'wood', [bx, by + 0.034, bz], [1, 0.42, 1], {
    outline: false,
  });
  for (const [dx, dy, dz, tone] of [
    [-0.016, 0.046, 0.008, 'woodDark'],
    [0.015, 0.047, 0.01, 'woodLight'],
    [0.003, 0.05, -0.006, 'woodDark'],
    [-0.012, 0.046, -0.015, 'woodLight'],
    [0.018, 0.045, -0.012, 'woodDark'],
    [0, 0.052, 0.004, 'gold'],
  ] as const)
    f.ball(0.011, tone, [bx + dx, by + dy, bz + dz], [1.2, 0.65, 1], {
      outline: false,
    });
}

/** Shrine cats dozing, sitting and stretching about the courtyard. */
export function buildCats(b: ToonBuilder) {
  cats.forEach(({ pose, x, z, yaw, coat }, i) => {
    const base = new THREE.Matrix4().compose(
      new THREE.Vector3(x, groundAt(x, z), z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(SIZE, SIZE, SIZE),
    );
    const frame = catFrame(b, base, i * 2.3);
    poses[pose](frame, coats[coat]);
    if (coat === 'cream') foodBowl(frame, [0.02, 0, 0.46]);
  });
}
