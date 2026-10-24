import * as THREE from 'three';
import { ToonBuilder, createSharedUniforms, palette, seeded } from './toon';
import type { Tone } from './toon';

/** Screen pixels per menu unit, sized so the builder's ink hulls read as ~1.7px lines. */
const UNIT = 36;
/** Range thumb width in CSS pixels; index.vue gives the native thumb the same size. */
export const MENU_THUMB = 22;
const FACE: [number, number, number] = [Math.PI / 2, 0, 0];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Five round petals around a gold heart, facing the viewer. */
function flower(
  b: ToonBuilder,
  x: number,
  y: number,
  z: number,
  r: number,
  spin: number,
  tone: Tone = 'blossom',
) {
  for (let i = 0; i < 5; i++) {
    const a = spin + (i / 5) * Math.PI * 2;
    b.ball(
      r * 0.52,
      tone,
      x + Math.cos(a) * r * 0.55,
      y + Math.sin(a) * r * 0.55,
      z,
      [1, 0.78, 0.4],
      { rotation: [0, 0, a] },
    );
  }
  b.ball(r * 0.24, 'gold', x, y, z + r * 0.12, [1, 1, 0.5], { outline: false });
}

/** A short blossoming twig growing from (x, y) at `angle`. */
function sprig(
  b: ToonBuilder,
  random: () => number,
  x: number,
  y: number,
  angle: number,
  length: number,
) {
  const tip: THREE.Vector3Tuple = [
    x + Math.cos(angle) * length,
    y + Math.sin(angle) * length,
    0.3,
  ];
  b.beam([x, y, 0.25], tip, 0.06, 'bark', 0.03);
  const fork = angle + (random() > 0.5 ? 0.7 : -0.7);
  const mid: THREE.Vector3Tuple = [
    x + Math.cos(angle) * length * 0.45,
    y + Math.sin(angle) * length * 0.45,
    0.28,
  ];
  const twig: THREE.Vector3Tuple = [
    mid[0] + Math.cos(fork) * length * 0.4,
    mid[1] + Math.sin(fork) * length * 0.4,
    0.3,
  ];
  b.beam(mid, twig, 0.035, 'bark', 0.02);
  const blooms: [THREE.Vector3Tuple, number][] = [
    [tip, 0.34],
    [twig, 0.28],
    [
      [
        x + Math.cos(angle) * length * 0.72,
        y + Math.sin(angle) * length * 0.72,
        0.32,
      ],
      0.24,
    ],
  ];
  for (const [[fx, fy, fz], r] of blooms)
    flower(
      b,
      fx,
      fy,
      fz + 0.05,
      r,
      random() * Math.PI,
      random() > 0.6 ? 'blossomLight' : 'blossom',
    );
  // Unopened buds along the twig.
  for (const t of [0.25, 0.6])
    b.ball(
      0.06,
      'blossomDeep',
      x + Math.cos(angle) * length * t + Math.cos(angle + 1.4) * 0.09,
      y + Math.sin(angle) * length * t + Math.sin(angle + 1.4) * 0.09,
      0.3,
      [1, 1.3, 0.6],
    );
}

/** Flat petal outline shared by the resting and falling petals. */
function petalGeometry(size: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.04);
  shape.quadraticCurveTo(0.04, -0.01, 0.02, 0.035);
  shape.lineTo(0, 0.02);
  shape.lineTo(-0.02, 0.035);
  shape.quadraticCurveTo(-0.04, -0.01, 0, -0.04);
  return new THREE.ShapeGeometry(shape).scale(size, size, size);
}

/**
 * The scene controls drawn as a hanging wooden board with sakura sprigs and
 * drifting petals. The real DOM controls stay on top, transparent, for input
 * and accessibility; this only paints what sits behind them, laid out from
 * their measured boxes.
 */
export function createMenuBar(
  host: HTMLElement,
  menu: HTMLElement,
  ramp: THREE.Texture,
) {
  const shared = createSharedUniforms();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 100);
  camera.position.z = 40;
  const sun = new THREE.DirectionalLight(0xfff3de, 1.9);
  sun.position.set(-1, 2, 3);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xd9c4b3, 1.4), sun);

  let board: THREE.Group | undefined;
  const thumbBuilder = new ToonBuilder();
  flower(thumbBuilder, 0, 0, 0.6, 0.36, 0.3);
  thumbBuilder.ball(0.07, 'gold', 0, 0, 0.72, [1, 1, 0.5], { outline: false });
  const thumb = thumbBuilder.build(shared, ramp, { castShadow: false });
  thumb.visible = false;

  const falling = 14;
  const petals = new THREE.InstancedMesh(
    petalGeometry(3.6),
    new THREE.MeshToonMaterial({
      color: palette.blossom,
      gradientMap: ramp,
      side: THREE.DoubleSide,
      // Keeps the shaded side pink as they tumble.
      emissive: palette.blossomLight,
      emissiveIntensity: 0.3,
    }),
    falling,
  );
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  scene.add(thumb, petals);

  let ledge: Box = { x: 0, y: 0, w: 0, h: 0 };
  let groove: Box | undefined;
  let hour = 10.5;
  const dummy = new THREE.Object3D();

  function measure(element: Element | null, origin: DOMRect) {
    if (!element) return;
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Into menu units, with y growing upwards from the top of the canvas.
    return {
      x: (r.left - origin.left) / UNIT,
      y: -(r.top - origin.top) / UNIT,
      w: r.width / UNIT,
      h: r.height / UNIT,
    };
  }

  function placeThumb() {
    thumb.visible = !!groove;
    if (!groove) return;
    const half = MENU_THUMB / 2 / UNIT;
    thumb.position.set(
      groove.x + half + (hour / 24) * (groove.w - half * 2),
      groove.y - groove.h / 2,
      0,
    );
    thumb.rotation.z = -(hour / 24) * Math.PI * 2;
  }

  function layout() {
    const origin = host.getBoundingClientRect();
    camera.right = origin.width / UNIT;
    camera.bottom = -origin.height / UNIT;
    camera.updateProjectionMatrix();
    const nav = measure(menu, origin);
    if (board) {
      scene.remove(board);
      board.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
      board = undefined;
    }
    groove = undefined;
    if (!nav) return;

    const b = new ToonBuilder();
    const random = seeded(41);
    const cx = nav.x + nav.w / 2,
      cy = nav.y - nav.h / 2,
      top = nav.y,
      bottom = nav.y - nav.h,
      left = nav.x,
      right = nav.x + nav.w;
    // Plank, with a sunlit top edge and a ledge along the bottom.
    b.slab(nav.w + 0.12, nav.h + 0.12, 0.3, cy, 'wood', cx, 0, 0.24, {
      rotation: FACE,
    });
    b.slab(nav.w - 0.3, 0.07, 0.04, top - 0.1, 'woodLight', cx, 0.03, 0.03, {
      rotation: FACE,
      outline: false,
    });
    b.slab(nav.w + 0.3, 0.16, 0.42, bottom + 0.02, 'woodDark', cx, 0.14, 0.06, {
      rotation: FACE,
    });
    // Faint grain.
    for (let i = 0; i < 5; i++) {
      const length = 0.4 + random() * 0.7;
      b.box(
        length,
        0.025,
        0.02,
        'woodDark',
        left + 0.3 + random() * Math.max(0, nav.w - 0.6 - length) + length / 2,
        cy + (random() - 0.5) * nav.h * 0.55,
        0.01,
        { outline: false },
      );
    }
    // Straw cords it hangs from, tied to brass pegs.
    for (const px of [left + 0.45, right - 0.45]) {
      b.beam([px, top - 0.12, 0.05], [px, 4, 0.05], 0.035, 'straw');
      b.ball(0.08, 'gold', px, top - 0.12, 0.08, [1, 1, 0.6]);
    }
    // Round wooden tokens behind each button.
    for (const element of menu.querySelectorAll(
      ':scope > button, :scope > a',
    )) {
      const token = measure(element, origin);
      if (!token) continue;
      b.cylinder(
        token.w * 0.46,
        token.w * 0.46,
        0.12,
        'woodLight',
        token.x + token.w / 2,
        token.y - token.h / 2,
        0.06,
        24,
        { rotation: FACE },
      );
    }
    // Carved groove for the time slider, and a divider after the daylight group.
    const daylight = measure(menu.querySelector('.daylight-controls'), origin);
    groove = measure(menu.querySelector('.daylight-controls input'), origin);
    if (groove)
      b.slab(
        groove.w - 0.1,
        0.14,
        0.04,
        groove.y - groove.h / 2,
        'woodDark',
        groove.x + groove.w / 2,
        0.02,
        0.07,
        {
          rotation: FACE,
          outline: false,
        },
      );
    if (daylight)
      b.box(
        0.04,
        nav.h * 0.55,
        0.03,
        'woodDark',
        daylight.x + daylight.w,
        cy,
        0.02,
        {
          outline: false,
        },
      );
    // Blossom sprigs over the top-left corner and hanging off the bottom right.
    sprig(b, random, left + 0.1, top - 0.2, Math.PI * 0.9, 0.95);
    sprig(b, random, left + 0.3, top - 0.05, Math.PI * 0.62, 0.55);
    sprig(b, random, right - 0.15, bottom + 0.1, -Math.PI * 0.42, 0.8);
    // Petals already fallen onto the ledge.
    for (let i = 0; i < 9; i++)
      b.ball(
        0.07 + random() * 0.03,
        random() > 0.5 ? 'blossom' : 'blossomLight',
        left + 0.2 + random() * (nav.w - 0.4),
        bottom + 0.1,
        0.3 + random() * 0.05,
        [1, 0.45, 0.7],
        { rotation: [0, 0, (random() - 0.5) * 0.8], outline: false },
      );
    board = b.build(shared, ramp, { castShadow: false });
    scene.add(board);
    ledge = { x: left, y: bottom, w: nav.w, h: nav.h };
    placeThumb();
  }

  return {
    scene,
    camera,
    layout,
    setHour(next: number) {
      hour = next;
      placeThumb();
    },
    /** Petals drift down from the ledge and fade out below the board. */
    update(time: number) {
      shared.time.value = time;
      for (let i = 0; i < falling; i++) {
        const seed = i * 12.9898;
        const period = 5 + (i % 5) * 0.9;
        const progress = (((time / period + ((i * 0.618) % 1)) % 1) + 1) % 1;
        const fade = Math.min(1, progress * 8, (1 - progress) * 3);
        dummy.position.set(
          ledge.x +
            ((i * 0.381) % 1) * ledge.w -
            progress * 0.9 +
            Math.sin(time * 1.1 + seed) * 0.15,
          ledge.y - 0.05 - progress * 3,
          0.5,
        );
        dummy.rotation.set(
          time * 1.7 + seed,
          time * 1.2 + i,
          time * 0.8 + seed * 0.5,
        );
        dummy.scale.setScalar(ledge.w ? fade : 0);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    },
  };
}
export type MenuBar = ReturnType<typeof createMenuBar>;
