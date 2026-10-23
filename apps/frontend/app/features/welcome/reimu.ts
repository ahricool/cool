import * as THREE from 'three';
import type { Daylight } from './daylight';
import { groundAt, obstacles, sweepSpots, terrace } from './layout';
import { seeded } from './toon';

/** Pixel frame size; feet stand on the second-to-last row. */
const FW = 40,
  FH = 44;

// Softened sprite palette so the pixel art sits inside the cel-shaded scene.
const ink = '#6b4548';
const c = {
  hair: '#6d4235',
  hairDark: '#523128',
  hairLight: '#93604a',
  skin: '#ffe7d8',
  skinShade: '#f2c8b6',
  blush: '#f5a9a2',
  eye: '#8a3a44',
  mouth: '#c76f6f',
  red: '#e25c53',
  redShade: '#bd4a55',
  white: '#fdf9f3',
  whiteShade: '#dcd8e8',
  frill: '#fff8f0',
  ascot: '#f4d067',
  shoe: '#cf5552',
  stick: '#bd8a55',
  straw: '#e8c97c',
  strawShade: '#c9a25c',
  band: '#c8504a',
};

type Point = [number, number];
interface Pose {
  /** Upper body offset in pixels: breathing, crouching and landing. */
  dy: number;
  lean: number;
  skirt: number;
  flare: number;
  bow: number;
  legs: 'stand' | 'crouch' | 'tuck';
  hand: Point;
  tip: Point;
  blink?: boolean;
}

class Pixels {
  readonly data: (string | undefined)[] = new Array(FW * FH);
  set(x: number, y: number, color: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < FW && y < FH) this.data[y * FW + x] = color;
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
          this.set(x, y, color);
  }
  line([x0, y0]: Point, [x1, y1]: Point, color: string, width = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps,
        y = y0 + ((y1 - y0) * i) / steps;
      this.rect(
        Math.round(x - (width - 1) / 2),
        Math.round(y - (width - 1) / 2),
        width,
        width,
        color,
      );
    }
  }
  polygon(points: Point[], color: string) {
    const xs = points.map(([x]) => x),
      ys = points.map(([, y]) => y);
    for (
      let y = Math.floor(Math.min(...ys));
      y <= Math.ceil(Math.max(...ys));
      y++
    )
      for (
        let x = Math.floor(Math.min(...xs));
        x <= Math.ceil(Math.max(...xs));
        x++
      ) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i]!,
            [xj, yj] = points[j]!;
          if (
            yi > y + 0.5 !== yj > y + 0.5 &&
            x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi
          )
            inside = !inside;
        }
        if (inside) this.set(x, y, color);
      }
  }
  /** Soft outer contour, like a hand-placed pixel outline. */
  outline() {
    const filled = this.data.map((pixel) => pixel !== undefined);
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        if (filled[y * FW + x]) continue;
        const near = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const nx = x + dx!,
            ny = y + dy!;
          return (
            nx >= 0 && ny >= 0 && nx < FW && ny < FH && filled[ny * FW + nx]
          );
        });
        if (near) this.data[y * FW + x] = ink;
      }
  }
}

function drawBroom(p: Pixels, hand: Point, tip: Point) {
  const dx = tip[0] - hand[0],
    dy = tip[1] - hand[1];
  const length = Math.hypot(dx, dy);
  const ux = dx / length,
    uy = dy / length;
  p.line([hand[0] - ux * 11, hand[1] - uy * 11], tip, c.stick);
  const nx = -uy,
    ny = ux;
  const end: Point = [tip[0] + ux * 7, tip[1] + uy * 7];
  p.polygon(
    [
      [tip[0] + nx * 1.8, tip[1] + ny * 1.8],
      [end[0] + nx * 4.4, end[1] + ny * 4.4],
      [end[0] - nx * 4.4, end[1] - ny * 4.4],
      [tip[0] - nx * 1.8, tip[1] - ny * 1.8],
    ],
    c.straw,
  );
  p.line(
    [tip[0] + ux * 2 - nx * 1, tip[1] + uy * 2 - ny * 1],
    [end[0] - nx * 2.5, end[1] - ny * 2.5],
    c.strawShade,
  );
  p.line(
    [tip[0] + ux * 2 + nx * 1, tip[1] + uy * 2 + ny * 1],
    [end[0] + nx * 1.5, end[1] + ny * 1.5],
    c.strawShade,
  );
  p.line(
    [tip[0] + nx * 1.5, tip[1] + ny * 1.5],
    [tip[0] - nx * 1.5, tip[1] - ny * 1.5],
    c.band,
  );
}

/** Chibi Reimu facing right: red-white miko outfit, big bow, detached sleeves. */
function drawReimu(pose: Pose) {
  const p = new Pixels();
  const { dy, lean: lx, skirt, flare, bow } = pose;
  const up = (y: number) => y + dy;

  // Legs and shoes stay planted unless she is tucking them mid-hop.
  const footY = pose.legs === 'tuck' ? 38 : 41;
  const legTop = pose.legs === 'stand' ? 37 : pose.legs === 'crouch' ? 39 : 35;
  for (const [x, shoeX] of [
    [15, 14],
    [21, 20],
  ] as const) {
    p.rect(x, legTop, 2, footY - legTop, c.white);
    p.rect(shoeX, footY, 4, 2, c.shoe);
    p.set(shoeX, footY + 1, c.redShade);
  }

  // Bow behind the head: frilled white rims around two big red lobes.
  const bx = lx - 1;
  p.ellipse(10 + bx, up(8 + bow), 6.4, 5.4, c.frill);
  p.ellipse(10 + bx, up(8 + bow), 5.2, 4.3, c.red);
  p.ellipse(9 + bx, up(9 + bow), 3, 2.2, c.redShade);
  p.ellipse(22 + bx, up(3 - bow * 0.5), 5.4, 3.6, c.frill);
  p.ellipse(22 + bx, up(3 - bow * 0.5), 4.3, 2.6, c.red);
  p.rect(14 + bx, up(4), 4, 4, c.redShade);

  // Hair falling behind the shoulders.
  p.ellipse(10 + lx, up(23), 3.5, 5.5, c.hairDark);
  p.ellipse(17 + lx, up(15), 9.3, 9, c.hair);

  // Detached back sleeve, then the skirt and torso.
  p.ellipse(12 + lx, up(29), 3.4, 3.8, c.whiteShade);
  p.rect(10 + lx, up(26), 4, 1, c.red);
  const skirtTop = up(31);
  const skirtBottom = 37 + Math.max(0, dy - 1);
  for (let y = skirtTop; y <= skirtBottom; y++) {
    const r = (y - skirtTop) / Math.max(1, skirtBottom - skirtTop);
    const spread = Math.round(r * (3 + flare));
    const sway = r > 0.5 ? skirt : 0;
    const left = 14 + Math.round(lx * 0.5) - spread + sway,
      right = 23 + Math.round(lx * 0.5) + spread + sway;
    p.rect(left, y, right - left + 1, 1, y === skirtBottom ? c.frill : c.red);
    if (y < skirtBottom) p.rect(left, y, 2, 1, c.redShade);
    if (y === skirtBottom)
      for (let x = left + 1; x <= right; x += 2) p.set(x, y, c.whiteShade);
  }
  p.rect(15 + lx, up(25), 8, 6, c.red);
  p.rect(15 + lx, up(25), 2, 6, c.redShade);
  p.rect(17 + lx, up(24), 4, 1, c.white);
  p.rect(18 + lx, up(25), 3, 2, c.ascot);
  p.set(19 + lx, up(27), c.ascot);
  p.rect(15 + lx, up(30), 8, 1, c.redShade);

  // Face, fringe, sidelocks with her red-and-white hair tubes.
  p.ellipse(21 + lx, up(17.5), 7, 6.4, c.skin);
  p.rect(15 + lx, up(21), 3, 2, c.skinShade);
  for (let x = 13; x <= 28; x++) {
    const fringe =
      11 + [2, 3, 1, 2, 4, 2, 1, 3, 2, 4, 2, 1, 3, 2, 1, 2][x - 13]!;
    for (let y = 6; y <= fringe; y++) p.set(x + lx, up(y), c.hair);
  }
  for (const x of [16, 17, 18, 19, 20, 21]) p.set(x + lx, up(8), c.hairLight);
  p.rect(22 + lx, up(9), 2, 1, c.hairLight);
  p.rect(26 + lx, up(13), 3, 13, c.hair);
  p.rect(26 + lx, up(21), 3, 4, c.white);
  p.rect(26 + lx, up(21), 3, 1, c.red);
  p.rect(26 + lx, up(24), 3, 1, c.red);
  p.rect(14 + lx, up(14), 2, 9, c.hair);
  if (pose.blink) {
    p.rect(22 + lx, up(18), 3, 1, c.eye);
    p.rect(17 + lx, up(18), 2, 1, c.eye);
  } else {
    p.rect(22 + lx, up(15), 3, 4, c.eye);
    p.set(22 + lx, up(15), c.white);
    p.set(23 + lx, up(16), c.white);
    p.rect(17 + lx, up(15), 2, 4, c.eye);
    p.set(17 + lx, up(15), c.white);
  }
  p.set(20 + lx, up(20), c.blush);
  p.set(25 + lx, up(20), c.blush);
  p.set(23 + lx, up(21), c.mouth);

  // Broom and the front sleeve that holds it.
  drawBroom(p, pose.hand, pose.tip);
  const [hx, hy] = pose.hand;
  const shoulder: Point = [21 + lx, up(26)];
  p.ellipse(
    (shoulder[0] + hx) / 2 + 0.5,
    (shoulder[1] + hy) / 2 + 1,
    3.6,
    3.2,
    c.white,
  );
  p.rect(
    Math.round((shoulder[0] + hx) / 2) - 2,
    Math.round((shoulder[1] + hy) / 2) + 3,
    4,
    1,
    c.whiteShade,
  );
  p.rect(shoulder[0] - 1, shoulder[1] - 1, 3, 1, c.red);
  p.rect(hx - 1, hy - 1, 2, 2, c.skin);
  p.outline();
  return p;
}

const sweepFrames: Pose[] = [
  {
    dy: 0,
    lean: -1,
    skirt: 0,
    flare: 0,
    bow: 0,
    legs: 'stand',
    hand: [23, 29],
    tip: [29, 37],
  },
  {
    dy: 1,
    lean: 0,
    skirt: 1,
    flare: 0,
    bow: 1,
    legs: 'stand',
    hand: [24, 29],
    tip: [32, 37],
  },
  {
    dy: 0,
    lean: 1,
    skirt: 1,
    flare: 0,
    bow: 0,
    legs: 'stand',
    hand: [25, 29],
    tip: [35, 37],
  },
  {
    dy: 1,
    lean: 0,
    skirt: 0,
    flare: 0,
    bow: 1,
    legs: 'stand',
    hand: [24, 29],
    tip: [32, 37],
  },
];
const frames: Pose[] = [
  ...sweepFrames,
  {
    dy: 0,
    lean: 0,
    skirt: 0,
    flare: 0,
    bow: 0,
    legs: 'stand',
    hand: [25, 28],
    tip: [28, 37],
  },
  {
    dy: 1,
    lean: 0,
    skirt: 0,
    flare: 0,
    bow: 1,
    legs: 'stand',
    hand: [25, 29],
    tip: [28, 37],
  },
  {
    dy: 0,
    lean: 0,
    skirt: 0,
    flare: 0,
    bow: 0,
    legs: 'stand',
    hand: [25, 28],
    tip: [28, 37],
    blink: true,
  },
  {
    dy: 3,
    lean: 1,
    skirt: 0,
    flare: 1,
    bow: 1,
    legs: 'crouch',
    hand: [25, 31],
    tip: [32, 36],
  },
  {
    dy: -1,
    lean: 0,
    skirt: -1,
    flare: 2,
    bow: -1,
    legs: 'tuck',
    hand: [24, 27],
    tip: [33, 25],
  },
  {
    dy: 2,
    lean: 0,
    skirt: 1,
    flare: 2,
    bow: 1,
    legs: 'crouch',
    hand: [25, 30],
    tip: [31, 36],
  },
];
const FRAME = {
  idle: 4,
  breathe: 5,
  blink: 6,
  crouch: 7,
  air: 8,
  land: 9,
} as const;

function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = FW * frames.length;
  canvas.height = FH;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to draw the shrine maiden');
  const image = context.createImageData(canvas.width, canvas.height);
  frames.forEach((pose, index) => {
    const pixels = drawReimu(pose);
    pixels.data.forEach((color, i) => {
      if (!color) return;
      const x = index * FW + (i % FW),
        y = Math.floor(i / FW);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = parseInt(color.slice(1, 3), 16);
      image.data[offset + 1] = parseInt(color.slice(3, 5), 16);
      image.data[offset + 2] = parseInt(color.slice(5, 7), 16);
      image.data[offset + 3] = 255;
    });
  });
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.repeat.set(1 / frames.length, 1);
  return texture;
}

function softDisc() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Petals and leaves on the court that her broom actually moves. */
function createLitter(count: number) {
  const random = seeded(512);
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.045);
  shape.quadraticCurveTo(0.04, 0, 0, 0.045);
  shape.quadraticCurveTo(-0.04, 0, 0, -0.045);
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    count,
  );
  mesh.name = 'litter';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  const items = Array.from({ length: count }, (_, i) => {
    const spot = sweepSpots[i % sweepSpots.length]!;
    const near = i % 3 !== 0;
    return {
      x: near ? spot[0] + (random() - 0.5) * 1.6 : -4.5 + random() * 8.6,
      z: near ? spot[1] + (random() - 0.5) * 1.4 : 1.0 + random() * 4.8,
      vx: 0,
      vz: 0,
      lift: 0,
      angle: random() * Math.PI * 2,
      spin: 0,
      tilt: random() * 0.3,
    };
  });
  const tones = ['#ffc1d6', '#f79abb', '#ffd9e6', '#e8b65c', '#b8d77a'];
  const color = new THREE.Color();
  items.forEach((_, i) =>
    mesh.setColorAt(
      i,
      color.set(tones[i % 5 === 3 ? 3 : i % 7 === 4 ? 4 : i % 3]!),
    ),
  );
  const dummy = new THREE.Object3D();
  return {
    mesh,
    push(x: number, z: number, dx: number, dz: number, radius: number) {
      for (const item of items) {
        const distance = Math.hypot(item.x - x, item.z - z);
        if (distance > radius) continue;
        const strength = (1 - distance / radius) * (0.8 + random() * 0.6);
        item.vx += dx * strength * 1.4 + (random() - 0.5) * 0.35;
        item.vz += dz * strength * 1.4 + (random() - 0.5) * 0.35;
        item.lift = Math.max(item.lift, 0.04 + random() * 0.05);
        item.spin += (random() - 0.5) * 9;
      }
    },
    update(dt: number) {
      const damping = Math.exp(-dt * 3.2);
      items.forEach((item, i) => {
        item.x += item.vx * dt;
        item.z += item.vz * dt;
        item.vx *= damping;
        item.vz *= damping;
        item.angle += item.spin * dt;
        item.spin *= damping;
        item.lift *= Math.exp(-dt * 5);
        // Keep litter on the court: off the stairs, inside the fence.
        item.x = THREE.MathUtils.clamp(item.x, -5.85, 5.85);
        item.z = THREE.MathUtils.clamp(item.z, terrace.front + 1.45, 5.85);
        dummy.position.set(
          item.x,
          groundAt(item.x, item.z) + 0.012 + item.lift,
          item.z,
        );
        dummy.rotation.set(item.tilt * Math.sin(item.angle), item.angle, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

type Phase = 'sweep' | 'pause' | 'crouch' | 'air' | 'land';

export function createReimu(mobile: boolean) {
  const root = new THREE.Group();
  root.name = 'reimu';
  const atlas = createAtlas();
  const height = 1.08,
    width = (height * FW) / FH;
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.translate(0, height / 2 - height / FH, 0);
  // Normals tilted up so the standee is lit like the ground she stands on.
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 0.62, 0.78);
  const sprite = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      map: atlas,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: atlas,
      emissiveIntensity: 0.2,
    }),
  );
  sprite.name = 'reimu-sprite';
  sprite.receiveShadow = true;
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x3b2f55,
      alphaMap: softDisc(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  const silhouette = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x3b2f55,
      map: atlas,
      alphaTest: 0.01,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  silhouette.matrixAutoUpdate = false;
  const litter = createLitter(mobile ? 60 : 110);
  root.add(litter.mesh, blob, silhouette, sprite);

  const random = seeded(8);
  const position = new THREE.Vector2(...sweepSpots[0]!);
  const from = new THREE.Vector2(),
    to = new THREE.Vector2();
  let facing = 1;
  let phase: Phase = 'sweep';
  let elapsed = 0,
    frameClock = 0,
    frame = 0,
    strokes = 0,
    strokesTarget = 6,
    pauses = 0,
    hop = 0,
    blinkAt = 2;

  function chooseSpot() {
    const candidates = sweepSpots.filter(([x, z]) => {
      const distance = Math.hypot(x - position.x, z - position.y);
      return (
        distance > 0.8 &&
        distance < 2.8 &&
        obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.r)
      );
    });
    const [x, z] = candidates.length
      ? candidates[Math.floor(random() * candidates.length)]!
      : sweepSpots[Math.floor(random() * sweepSpots.length)]!;
    return to.set(x + (random() - 0.5) * 0.4, z + (random() - 0.5) * 0.4);
  }
  function enter(next: Phase) {
    phase = next;
    elapsed = 0;
    frameClock = 0;
    if (next === 'sweep') {
      strokes = 0;
      strokesTarget = 5 + Math.floor(random() * 4);
    }
    if (next === 'air') {
      from.copy(position);
      chooseSpot();
      if (Math.abs(to.x - from.x) > 0.2) facing = Math.sign(to.x - from.x);
    }
  }

  const camRight = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const sun = new THREE.Vector3();
  const standee = new THREE.Matrix4();
  const project = new THREE.Matrix4();

  return {
    root,
    update(dt: number, time: number, camera: THREE.Camera, light: Daylight) {
      // She is a camera-facing standee, so her broom points along the screen's
      // horizontal axis; mirror her to keep the world facing direction.
      camRight.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      const screenFacing = Math.sign(camRight.x * facing) || 1;
      elapsed += dt;
      frameClock += dt;
      let lift = 0,
        squash = 1;
      if (phase === 'sweep') {
        if (frameClock > 1 / 7) {
          frameClock = 0;
          frame = (frame + 1) % 4;
          if (frame === 0) strokes++;
          // Forward strokes push nearby litter where the broom visibly sweeps.
          if (frame === 1 || frame === 2) {
            const dx = camRight.x * screenFacing,
              dz = camRight.z * screenFacing;
            litter.push(
              position.x + dx * 0.42,
              position.y + dz * 0.42,
              dx + (random() - 0.5) * 0.2,
              dz + (random() - 0.5) * 0.2,
              0.42,
            );
          }
        }
        if (strokes >= strokesTarget) enter('pause');
      } else if (phase === 'pause') {
        frame = Math.floor(elapsed * 1.6) % 2 ? FRAME.breathe : FRAME.idle;
        if (elapsed > blinkAt && elapsed < blinkAt + 0.14) frame = FRAME.blink;
        // Turn around mid-pause so sweeping alternates left and right.
        if (pauses % 2 === 1 && elapsed > 0.8 && elapsed - dt <= 0.8)
          facing = -facing;
        if (elapsed > 1.5) {
          pauses++;
          blinkAt = 0.3 + random() * 0.9;
          enter(pauses % 3 === 0 ? 'crouch' : 'sweep');
        }
      } else if (phase === 'crouch') {
        frame = FRAME.crouch;
        squash = 0.96;
        if (elapsed > 0.22) enter('air');
      } else if (phase === 'air') {
        const t = Math.min(1, elapsed / 0.62);
        const eased = t * t * (3 - 2 * t);
        position.lerpVectors(from, to, eased);
        hop = 4 * t * (1 - t);
        lift = hop * 0.5;
        frame = FRAME.air;
        if (t >= 1) {
          hop = 0;
          enter('land');
        }
      } else {
        frame = FRAME.land;
        squash = 0.95;
        if (elapsed > 0.2) {
          pauses++;
          enter('pause');
        }
      }

      const ground = groundAt(position.x, position.y);
      const breath = phase === 'air' ? 0 : Math.sin(time * 2.3) * 0.012;
      const sway = Math.sin(time * 0.9) * 0.012;
      sprite.position.set(
        position.x + camRight.x * sway,
        ground + lift,
        position.y + camRight.z * sway,
      );
      toCamera.subVectors(camera.position, sprite.position);
      const pitch = Math.atan2(toCamera.y, Math.hypot(toCamera.x, toCamera.z));
      sprite.rotation.set(0, Math.atan2(toCamera.x, toCamera.z), 0, 'YXZ');
      sprite.rotateX(-pitch * 0.55);
      sprite.scale.set(screenFacing * (2 - squash), squash * (1 + breath), 1);
      atlas.offset.x = frame / frames.length;

      // Contact shadow stays on the ground, widening and fading with height.
      blob.position.set(position.x, ground + 0.004, position.y);
      blob.scale.set(1.1 * (1 + hop * 0.9), 1, 0.62 * (1 + hop * 0.9));
      (blob.material as THREE.MeshBasicMaterial).opacity =
        (0.2 + light.day * 0.08) / (1 + hop * 2.2);

      // Translucent silhouette projected along the sun onto the ground plane.
      sun.copy(light.sunPosition).normalize();
      sun.y = Math.max(sun.y, 0.45);
      sun.normalize();
      standee.compose(
        new THREE.Vector3(position.x, ground + lift, position.y),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(sun.x, sun.z),
        ),
        new THREE.Vector3(screenFacing * (2 - squash), squash, 1),
      );
      const g = ground + 0.006;
      // Planar projection onto y = g along the sun direction.
      // prettier-ignore
      project.set(
        1, -sun.x / sun.y, 0, (sun.x / sun.y) * g,
        0, 0, 0, g,
        0, -sun.z / sun.y, 1, (sun.z / sun.y) * g,
        0, 0, 0, 1,
      );
      silhouette.matrix.multiplyMatrices(project, standee);
      silhouette.matrixWorldNeedsUpdate = true;
      const silhouetteMaterial = silhouette.material as THREE.MeshBasicMaterial;
      silhouetteMaterial.opacity = light.day * 0.3 * (1 - hop * 0.5);
      silhouette.visible = light.day > 0.05;
      litter.update(dt);
    },
  };
}
