import * as THREE from 'three';
import { ToonBuilder, createSharedUniforms, palette, seeded } from './toon';
import type { SharedUniforms, Tone } from './toon';

/** Screen pixels per menu unit, sized so the builder's ink hulls read as ~1.7px lines. */
const UNIT = 36;
/** Range thumb width in CSS pixels; index.vue gives the native thumb the same size. */
export const MENU_THUMB = 18;
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

/** Sakura petal pointing up +y from its base, with the notch at the tip. */
function petalShape(length: number) {
  const w = length * 0.42;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w * 1.25, length * 0.35, w * 0.82, length * 0.86);
  shape.quadraticCurveTo(w * 0.45, length * 1.04, 0, length * 0.86);
  shape.quadraticCurveTo(-w * 0.45, length * 1.04, -w * 0.82, length * 0.86);
  shape.quadraticCurveTo(-w * 1.25, length * 0.35, 0, 0);
  return shape;
}

/**
 * A close-up blossom: notched petals cupped slightly towards the viewer, a
 * deeper blush at their base, and a ring of stamens tipped with pollen.
 */
function blossom(b: ToonBuilder, r: number) {
  const petal = petalShape(r);
  const blush = petalShape(r * 0.42);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    // Rotated so each petal points outwards along `a`, tilted up into a cup.
    const rotation: [number, number, number] = [0.22, 0, a - Math.PI / 2];
    b.part(
      new THREE.ExtrudeGeometry(petal, {
        depth: 0.03,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 1,
        curveSegments: 8,
      }),
      'blossomLight',
      Math.cos(a) * r * 0.06,
      Math.sin(a) * r * 0.06,
      0,
      { rotation },
    );
    b.part(
      new THREE.ShapeGeometry(blush, 6),
      'blossomDeep',
      Math.cos(a) * r * 0.08,
      Math.sin(a) * r * 0.08,
      0.06,
      { rotation, outline: false },
    );
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const reach = r * (i % 2 ? 0.3 : 0.38);
    const tip: THREE.Vector3Tuple = [
      Math.cos(a) * reach,
      Math.sin(a) * reach,
      0.11,
    ];
    b.beam([0, 0, 0.07], tip, 0.008, 'blossomDeep', 0.006, {
      outline: false,
    });
    b.ball(0.022, 'gold', ...tip, [1, 1, 0.7], { outline: false });
  }
  b.ball(r * 0.1, 'shrubAmber', 0, 0, 0.08, [1, 1, 0.5], { outline: false });
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

/** Crescent between two circles meeting at the top and bottom, horns to the right. */
function crescent(r: number) {
  const inner = r * 0.8;
  const radius = Math.hypot(inner, r);
  const tip = Math.atan2(r, -inner);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  shape.absarc(inner, 0, radius, Math.PI * 2 - tip, tip, true);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: false,
    curveSegments: 10,
  });
}

/** One clock hand pointing up from the pivot. */
function hand(
  length: number,
  width: number,
  tone: Tone,
  shared: SharedUniforms,
  ramp: THREE.Texture,
) {
  const b = new ToonBuilder();
  b.box(width, length, 0.03, tone, 0, length / 2 - width / 2, 0, {
    outline: false,
  });
  return b.build(shared, ramp, { castShadow: false });
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
  flower(thumbBuilder, 0, 0, 0.6, 0.28, 0.3);
  thumbBuilder.ball(0.055, 'gold', 0, 0, 0.72, [1, 1, 0.5], { outline: false });
  const thumb = thumbBuilder.build(shared, ramp, { castShadow: false });
  thumb.visible = false;

  // Icons that move with the hour: clock hands, a turning sun and the moon.
  const clock = new THREE.Group();
  const hourHand = hand(0.11, 0.05, 'woodDark', shared, ramp);
  const minuteHand = hand(0.16, 0.035, 'redDark', shared, ramp);
  clock.add(hourHand, minuteHand);
  const sunBuilder = new ToonBuilder();
  sunBuilder.ball(0.1, 'gold', 0, 0, 0, [1, 1, 0.5]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    sunBuilder.box(
      0.04,
      0.07,
      0.03,
      'gold',
      Math.cos(a) * 0.18,
      Math.sin(a) * 0.18,
      0,
      {
        rotation: [0, 0, a - Math.PI / 2],
        outline: false,
      },
    );
  }
  const sunIcon = sunBuilder.build(shared, ramp, { castShadow: false });
  const moonBuilder = new ToonBuilder();
  moonBuilder.part(crescent(0.2), 'straw', 0, 0, -0.03, {
    rotation: [0, 0, -0.5],
  });
  const moonIcon = moonBuilder.build(shared, ramp, { castShadow: false });
  let daylightIcon: Box | undefined;
  // Weather: a cloud with the sun peeking out, or the same cloud with drops.
  const cloud = (b: ToonBuilder) => {
    b.ball(0.11, 'cloud', -0.08, -0.02, 0.04, [1, 0.85, 0.5]);
    b.ball(0.13, 'cloud', 0.05, 0.03, 0.06, [1, 0.9, 0.5]);
    b.ball(0.09, 'cloud', 0.15, -0.04, 0.05, [1, 0.85, 0.5]);
  };
  const clearBuilder = new ToonBuilder();
  clearBuilder.ball(0.1, 'gold', -0.07, 0.08, -0.04, [1, 1, 0.5]);
  cloud(clearBuilder);
  const clearIcon = clearBuilder.build(shared, ramp, { castShadow: false });
  const rainBuilder = new ToonBuilder();
  cloud(rainBuilder);
  for (const [x, y] of [
    [-0.09, -0.17],
    [0.03, -0.2],
    [0.14, -0.16],
  ] as const)
    rainBuilder.ball(0.035, 'water', x, y, 0.08, [0.8, 1.5, 0.6], {
      outline: false,
    });
  const rainIcon = rainBuilder.build(shared, ramp, { castShadow: false });
  // The menu button: a sakura blossom that keeps turning.
  const menuBuilder = new ToonBuilder();
  blossom(menuBuilder, 0.48);
  const menuFlower = menuBuilder.build(shared, ramp, { castShadow: false });
  menuFlower.visible = false;
  let weatherIcon = false,
    raining = false;

  const falling = 6;
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
  scene.add(
    thumb,
    petals,
    clock,
    sunIcon,
    moonIcon,
    clearIcon,
    rainIcon,
    menuFlower,
  );

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

  function placeIcons() {
    clock.rotation.set(0, 0, 0);
    hourHand.rotation.z = -((hour % 12) / 12) * Math.PI * 2;
    minuteHand.rotation.z = -(hour % 1) * Math.PI * 2;
    const day = hour >= 6 && hour < 18;
    sunIcon.visible = !!daylightIcon && day;
    moonIcon.visible = !!daylightIcon && !day;
    clearIcon.visible = weatherIcon && !raining;
    rainIcon.visible = weatherIcon && raining;
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
    daylightIcon = undefined;
    weatherIcon = false;
    clock.visible = false;
    placeIcons();
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
    // Faint grain along the upper and lower edges, clear of the icons.
    for (let i = 0; i < 5; i++) {
      const length = 0.4 + random() * 0.7;
      b.box(
        length,
        0.025,
        0.02,
        'bark',
        left + 0.3 + random() * Math.max(0, nav.w - 0.6 - length) + length / 2,
        cy + (i % 2 ? 1 : -1) * nav.h * (0.3 + random() * 0.08),
        0.01,
        { outline: false },
      );
    }
    // Straw cords it hangs from, tied to brass pegs.
    // Kept apart on the narrow board the collapsed menu leaves.
    const inset = Math.min(0.45, nav.w * 0.16);
    for (const px of [left + inset, right - inset]) {
      b.beam([px, top - 0.12, 0.05], [px, 4, 0.05], 0.035, 'straw');
      b.ball(0.08, 'gold', px, top - 0.12, 0.08, [1, 1, 0.6]);
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
    // Icons, modelled where the hidden SVGs sit.
    const icon = (name: string) => {
      const box = measure(menu.querySelector(`[data-icon="${name}"]`), origin);
      return box && { x: box.x + box.w / 2, y: box.y - box.h / 2 };
    };
    const face = icon('clock');
    if (face) {
      b.cylinder(0.21, 0.21, 0.08, 'paper', face.x, face.y, 0.06, 20, {
        rotation: FACE,
      });
      clock.position.set(face.x, face.y, 0.16);
      clock.visible = true;
    }
    const sky = measure(menu.querySelector('[data-icon="daylight"]'), origin);
    if (sky) {
      daylightIcon = sky;
      sunIcon.position.set(sky.x + sky.w / 2, sky.y - sky.h / 2, 0.15);
      moonIcon.position.copy(sunIcon.position);
    }
    const weather = icon('weather');
    if (weather) {
      weatherIcon = true;
      clearIcon.position.set(weather.x - 0.03, weather.y + 0.02, 0.18);
      rainIcon.position.set(weather.x - 0.03, weather.y + 0.06, 0.18);
    }
    const toggle = icon('toggle');
    menuFlower.visible = !!toggle;
    if (toggle) menuFlower.position.set(toggle.x, toggle.y, 0.2);
    const enter = icon('enter');
    if (enter) {
      const tip: THREE.Vector3Tuple = [enter.x + 0.17, enter.y, 0.17];
      b.beam([enter.x - 0.18, enter.y, 0.17], tip, 0.04, 'redDark', 0.04, {
        outline: false,
      });
      for (const side of [1, -1])
        b.beam(
          tip,
          [enter.x + 0.03, enter.y + side * 0.15, 0.17],
          0.04,
          'redDark',
          0.04,
          {
            outline: false,
          },
        );
    }
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
    setWeather(weather: 'clear' | 'rain') {
      raining = weather === 'rain';
      placeIcons();
    },
    setHour(next: number) {
      hour = next;
      placeThumb();
      placeIcons();
    },
    /** Petals drift down from the ledge and fade out below the board. */
    update(time: number) {
      shared.time.value = time;
      sunIcon.rotation.z = time * 0.25;
      menuFlower.rotation.z = -time * 0.5;
      for (let i = 0; i < falling; i++) {
        const seed = i * 12.9898;
        const period = 6 + (i % 3) * 1.1;
        const progress = (((time / period + ((i * 0.618) % 1)) % 1) + 1) % 1;
        const fade = Math.min(1, progress * 8, (1 - progress) * 3);
        dummy.position.set(
          ledge.x +
            ((i * 0.381) % 1) * ledge.w -
            progress * 0.5 +
            Math.sin(time * 1.1 + seed) * 0.15,
          ledge.y - 0.05 - progress * 1.4,
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
