import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Asset-free shrine miniature. Static geometry is batched by toon material. */
export function createWelcomeGarden() {
  const root = new THREE.Group();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const palette = {
    chalk: 0xfff4d7,
    stone: 0xa5afa7,
    stoneLight: 0xcbd0bb,
    mortar: 0x667771,
    gravel: 0xd6cdb0,
    wood: 0x89502c,
    woodLight: 0xb67c42,
    red: 0xc92e20,
    redLight: 0xe74b29,
    roof: 0x263d48,
    roofLight: 0x405b66,
    dark: 0x303a30,
    gold: 0xd7ab51,
    leaf: 0x39804a,
    leafLight: 0x72ad46,
    moss: 0x8eae58,
    blossom: 0xf1c4aa,
    water: 0x46a5ad,
    glow: 0xffdc83,
  };
  // Three bands retain the readable silhouettes of an animation background.
  const ramp = new THREE.DataTexture(
    new Uint8Array([100, 185, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => {
      const material = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
      material.name = key;
      if (key === 'glow') {
        material.emissive.setHex(color);
        material.emissiveIntensity = 0;
      }
      return [key, material];
    }),
  ) as Record<keyof typeof palette, THREE.MeshToonMaterial>;
  type Color = keyof typeof palette;
  function part(
    geometry: THREE.BufferGeometry,
    color: Color,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    const transformed = geometry.index
      ? geometry.toNonIndexed()
      : geometry.clone();
    geometry.dispose();
    transformed.applyMatrix4(matrix);
    // Consistent position/normal attributes make boxes, extrusions and organic pieces merge safely.
    for (const name of Object.keys(transformed.attributes))
      if (!['position', 'normal'].includes(name))
        transformed.deleteAttribute(name);
    const material = materials[color];
    const batch = batches.get(material) ?? [];
    batch.push(transformed);
    batches.set(material, batch);
  }
  const box = (
    w: number,
    h: number,
    d: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ) => part(new THREE.BoxGeometry(w, h, d), c, x, y, z, 0, ry);
  const cylinder = (
    r: number,
    h: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    r2 = r,
    sides = 8,
  ) => part(new THREE.CylinderGeometry(r2, r, h, sides), c, x, y, z);
  const ball = (
    r: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const geometry = new THREE.IcosahedronGeometry(r, 1);
    geometry.scale(sx, sy, sz);
    part(geometry, c, x, y, z);
  };
  function beam(a: number[], b: number[], r: number, c: Color, tip = r) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      vector = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(tip, r, vector.length(), 7);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vector.normalize(),
      ),
    );
    const center = start.add(end).multiplyScalar(0.5);
    part(geometry, c, center.x, center.y, center.z);
  }
  function slab(
    w: number,
    d: number,
    h: number,
    y: number,
    color: Color,
    x = 0,
    z = 0,
    bevel = 0.12,
  ) {
    const shape = new THREE.Shape();
    const left = -w / 2,
      right = w / 2,
      back = -d / 2,
      front = d / 2;
    shape.moveTo(left + bevel, back);
    shape.lineTo(right - bevel, back);
    shape.quadraticCurveTo(right, back, right, back + bevel);
    shape.lineTo(right, front - bevel);
    shape.quadraticCurveTo(right, front, right - bevel, front);
    shape.lineTo(left + bevel, front);
    shape.quadraticCurveTo(left, front, left, front - bevel);
    shape.lineTo(left, back + bevel);
    shape.quadraticCurveTo(left, back, left + bevel, back);
    part(
      new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }),
      color,
      x,
      y,
      z,
      -Math.PI / 2,
    );
  }
  // Continuous square stone foundation, staggered masonry, exposed timber course.
  slab(12.44, 12.44, 0.58, -1, 'mortar', 0, 0, 0.22);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const start = -6.08 + i * 1.02;
      const end = Math.min(start + 0.98, 6.1);
      const offset = row ? 0.32 : 0;
      const x = Math.min(start + offset, 5.75);
      const width = Math.min(end - start, 6.12 - x);
      for (const side of [-1, 1]) {
        box(
          width,
          0.255,
          0.12,
          (i + row) % 3 ? 'stone' : 'stoneLight',
          x + width / 2,
          -0.855 + row * 0.285,
          side * 6.24,
        );
        box(
          0.12,
          0.255,
          width,
          (i + row) % 3 ? 'stoneLight' : 'stone',
          side * 6.24,
          -0.855 + row * 0.285,
          x + width / 2,
        );
      }
    }
  }
  for (const x of [-6.12, 6.12])
    for (const z of [-6.12, 6.12])
      cylinder(0.18, 0.56, 'stone', x, -0.71, z, 0.18, 12);
  slab(12.58, 12.58, 0.22, -0.42, 'wood', 0, 0, 0.22);
  slab(12.6, 12.6, 0.06, -0.26, 'woodLight', 0, 0, 0.22);
  for (let i = 0; i < 16; i++)
    for (const side of [-1, 1]) {
      box(0.025, 0.16, 0.025, 'dark', -5.8 + i * 0.77, -0.32, side * 6.28);
      box(0.025, 0.16, 0.025, 'dark', side * 6.28, -0.32, -5.8 + i * 0.77);
    }
  slab(12.55, 12.55, 0.23, -0.2, 'stoneLight', 0, 0, 0.23);
  slab(12.25, 12.25, 0.14, 0.03, 'gravel', 0, 0, 0.24);
  slab(8.8, 5.55, 0.46, 0.17, 'mortar', 0, -2.45);
  for (let i = 0; i < 16; i++) {
    box(
      0.52,
      0.36,
      0.12,
      i % 3 ? 'stone' : 'stoneLight',
      -4.12 + i * 0.55,
      0.42,
      0.33,
    );
  }
  slab(8.96, 5.65, 0.12, 0.63, 'stoneLight', 0, -2.45);
  for (let i = 0; i < 4; i++)
    box(2.75, 0.14, 0.46, 'stoneLight', 0, 0.22 + i * 0.14, 1.28 - i * 0.36);
  for (let i = 0; i < 7; i++)
    for (const side of [-1, 1]) {
      slab(
        0.89,
        0.55,
        0.075,
        0.18,
        i % 3 ? 'stoneLight' : 'stone',
        side * 0.47,
        1.9 + i * 0.59,
        0.04,
      );
      box(0.12, 0.06, 0.52, 'stone', side * 1.05, 0.21, 1.9 + i * 0.59);
    }

  // Curved gable roof: a closed shell, visible fascia, raised tile courses and ridge caps.
  function roof(
    w: number,
    d: number,
    y: number,
    x: number,
    z: number,
    height: number,
  ) {
    const profile = [
      [-w / 2, 0.17],
      [-w * 0.38, 0.22],
      [-w * 0.22, height * 0.57],
      [0, height],
      [w * 0.22, height * 0.57],
      [w * 0.38, 0.22],
      [w / 2, 0.17],
    ];
    const shape = new THREE.Shape();
    profile.forEach(([px, py], i) =>
      i ? shape.lineTo(px!, py!) : shape.moveTo(px!, py!),
    );
    [...profile].reverse().forEach(([px, py]) => shape.lineTo(px!, py! - 0.15));
    shape.closePath();
    part(
      new THREE.ExtrudeGeometry(shape, {
        depth: d,
        bevelEnabled: false,
        steps: 1,
      }),
      'roof',
      x,
      y,
      z - d / 2,
    );
    for (const side of [-1, 1]) {
      for (let j = 0; j < profile.length - 1; j++) {
        const a = profile[j]!,
          b = profile[j + 1]!;
        beam(
          [x + a[0]!, y + a[1]! - 0.09, z + side * (d / 2 + 0.015)],
          [x + b[0]!, y + b[1]! - 0.09, z + side * (d / 2 + 0.015)],
          0.052,
          'woodLight',
        );
      }
      box(0.12, 0.11, d, 'roofLight', x + (side * w) / 2, y + 0.15, z);
    }
    const courses = Math.ceil(d / 0.24);
    for (let i = 0; i <= courses; i++) {
      const tz = z - d / 2 + (i * d) / courses;
      for (let j = 0; j < profile.length - 1; j++) {
        const a = profile[j]!,
          b = profile[j + 1]!;
        beam(
          [x + a[0]!, y + a[1]! + 0.018, tz],
          [x + b[0]!, y + b[1]! + 0.018, tz],
          0.022,
          'roofLight',
        );
      }
    }
    box(0.19, 0.15, d + 0.12, 'roofLight', x, y + height + 0.035, z);
    for (const side of [-1, 1])
      beam(
        [x, y + height + 0.06, z + (side * d) / 2],
        [x, y + height + 0.22, z + side * (d / 2 + 0.17)],
        0.085,
        'roof',
      );
  }

  // Raised vermilion hall, broad veranda, white plaster and exposed wooden joinery.
  box(5.1, 0.29, 3.55, 'mortar', 0, 0.9, -2.3);
  box(5.45, 0.2, 3.8, 'wood', 0, 1.13, -2.3);
  for (let i = 0; i < 23; i++)
    box(
      0.22,
      0.055,
      3.7,
      i % 4 ? 'woodLight' : 'wood',
      -2.64 + i * 0.24,
      1.255,
      -2.3,
    );
  box(4.45, 2.24, 2.55, 'chalk', 0, 2.4, -2.6);
  for (const x of [-2.22, -0.8, 0.8, 2.22])
    for (const z of [-3.9, -1.3]) {
      box(0.18, 2.5, 0.18, 'red', x, 2.49, z);
      box(0.34, 0.14, 0.32, 'redLight', x, 3.5, z);
      box(0.3, 0.16, 0.3, 'stoneLight', x, 1.37, z);
    }
  for (const y of [1.65, 3.24, 3.61]) box(4.72, 0.14, 2.82, 'red', 0, y, -2.6);
  // Front lattice doors and side windows. Insets stand proud of the plaster.
  for (const x of [-1.44, 0, 1.44]) {
    box(1.16, 1.7, 0.09, 'dark', x, 2.4, -1.285);
    for (let i = 0; i < 7; i++)
      box(0.035, 1.66, 0.1, 'woodLight', x - 0.51 + i * 0.17, 2.4, -1.22);
    for (const y of [1.8, 2.12, 2.44, 2.76, 3.08])
      box(1.12, 0.035, 0.1, 'woodLight', x, y, -1.22);
  }
  for (const side of [-1, 1]) {
    box(0.06, 1.2, 1.5, 'dark', side * 2.26, 2.5, -2.6);
    for (let i = 0; i < 8; i++)
      box(0.1, 1.2, 0.04, 'woodLight', side * 2.3, 2.5, -3.25 + i * 0.19);
    for (const y of [1.9, 2.5, 3.1])
      box(0.1, 0.05, 1.55, 'red', side * 2.3, y, -2.6);
  }
  // Gable infill and its red fan of structural beams beneath the single great roof.
  for (const side of [-1, 1]) {
    const face = new THREE.Shape();
    face.moveTo(-2.24, 0);
    face.lineTo(0, 1.5);
    face.lineTo(2.24, 0);
    face.closePath();
    part(
      new THREE.ExtrudeGeometry(face, { depth: 0.12, bevelEnabled: false }),
      'chalk',
      0,
      3.65,
      -2.6 + side * 1.34,
    );
    for (const x of [-1.7, -0.85, 0, 0.85, 1.7])
      beam(
        [x, 3.66, -2.6 + side * 1.43],
        [0, 5.12, -2.6 + side * 1.43],
        0.055,
        'red',
      );
    box(4.55, 0.15, 0.15, 'red', 0, 3.69, -2.6 + side * 1.43);
  }
  roof(6.2, 4.25, 3.65, 0, -2.55, 1.78);
  for (const x of [-1, 1]) box(0.16, 2.16, 0.16, 'red', x, 2.36, -0.5);
  box(2.3, 0.18, 0.2, 'red', 0, 3.25, -0.5);
  roof(2.85, 1.8, 3.22, 0, -0.62, 0.8);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++)
      box(0.065, 0.6, 0.065, 'red', side * (1.2 + i * 0.28), 1.61, -0.48);
    box(1.7, 0.1, 0.13, 'redLight', side * 1.91, 1.94, -0.48);
    box(1.7, 0.08, 0.1, 'red', side * 1.91, 1.42, -0.48);
    for (let i = 0; i < 10; i++)
      box(0.065, 0.6, 0.065, 'red', side * 2.72, 1.61, -0.7 - i * 0.35);
    box(0.13, 0.1, 3.5, 'redLight', side * 2.72, 1.94, -2.35);
  }
  for (let i = 0; i < 4; i++)
    box(1.8, 0.14, 0.32, 'woodLight', 0, 0.82 + i * 0.14, 0.57 - i * 0.27);
  // Twisted shimenawa, folded shide, bell, braided pull rope and offertory slats.
  for (let i = 0; i < 32; i++) {
    const x = -1 + (i * 2) / 31;
    ball(
      0.065,
      i % 2 ? 'gold' : 'woodLight',
      x,
      3.01 - Math.sin((i / 31) * Math.PI) * 0.15,
      0.32,
      1.1,
      0.8,
      0.85,
    );
  }
  for (const x of [-0.75, -0.38, 0.38, 0.75]) {
    for (let i = 0; i < 3; i++)
      part(
        new THREE.BoxGeometry(0.13, 0.17, 0.018),
        'chalk',
        x + (i % 2) * 0.065,
        2.78 - i * 0.115,
        0.33,
        0,
        0,
        i % 2 ? -0.55 : 0.4,
      );
  }
  cylinder(0.16, 0.23, 'gold', 0, 2.77, 0.33, 0.08, 12);
  box(0.2, 0.025, 0.025, 'dark', 0, 2.655, 0.46);
  for (let i = 0; i < 24; i++)
    ball(
      0.032,
      i % 2 ? 'chalk' : 'red',
      Math.sin(i * 1.8) * 0.023,
      2.57 - i * 0.04,
      0.36,
      1,
      1.1,
      1,
    );
  cylinder(0.09, 0.21, 'gold', 0, 1.57, 0.36, 0.045);
  box(0.95, 0.45, 0.57, 'wood', 0, 1.48, -0.13);
  box(1.05, 0.09, 0.65, 'woodLight', 0, 1.75, -0.13);
  box(0.85, 0.015, 0.46, 'dark', 0, 1.805, -0.13);
  for (let i = 0; i < 7; i++)
    box(0.055, 0.03, 0.48, 'woodLight', -0.39 + i * 0.13, 1.83, -0.13);
  for (const x of [-0.37, 0.37]) box(0.065, 0.39, 0.03, 'gold', x, 1.49, 0.168);

  // Vermilion torii marks the foreground; its opening preserves the central path.
  for (const side of [-1, 1]) {
    cylinder(0.28, 0.2, 'stone', side * 1.48, 0.27, 3.72);
    beam(
      [side * 1.48, 0.37, 3.72],
      [side * 1.37, 3.18, 3.72],
      0.16,
      'red',
      0.135,
    );
    cylinder(0.18, 0.29, 'dark', side * 1.475, 0.48, 3.72);
    box(0.24, 0.12, 0.28, 'redLight', side * 1.38, 2.75, 3.72);
  }
  box(3.6, 0.2, 0.25, 'red', 0, 2.78, 3.72);
  box(4.08, 0.24, 0.4, 'redLight', 0, 3.22, 3.72);
  box(4.16, 0.1, 0.46, 'roof', 0, 3.39, 3.72);
  for (const side of [-1, 1]) {
    beam(
      [side * 1.85, 3.34, 3.72],
      [side * 2.24, 3.48, 3.72],
      0.12,
      'redLight',
    );
    beam([side * 1.85, 3.43, 3.72], [side * 2.27, 3.56, 3.72], 0.055, 'roof');
  }
  box(0.22, 0.44, 0.18, 'red', 0, 3, 3.72);
  box(0.4, 0.5, 0.1, 'gold', 0, 3.04, 3.98);
  box(0.3, 0.4, 0.025, 'dark', 0, 3.04, 4.04);

  function lantern(x: number, z: number) {
    slab(0.7, 0.7, 0.13, 0.18, 'stone', x, z, 0.07);
    cylinder(0.25, 0.17, 'stoneLight', x, 0.39, z);
    cylinder(0.13, 0.66, 'stone', x, 0.8, z, 0.19);
    slab(0.57, 0.57, 0.13, 1.1, 'stoneLight', x, z, 0.04);
    box(0.35, 0.38, 0.35, 'glow', x, 1.4, z);
    for (const dx of [-0.23, 0.23])
      for (const dz of [-0.23, 0.23])
        box(0.09, 0.4, 0.09, 'stone', x + dx, 1.4, z + dz);
    part(
      new THREE.ConeGeometry(0.56, 0.32, 4),
      'stone',
      x,
      1.76,
      z,
      0,
      Math.PI / 4,
    );
    box(0.76, 0.06, 0.76, 'stoneLight', x, 1.61, z);
    ball(0.11, 'stoneLight', x, 1.98, z);
  }
  for (const x of [-1.98, 1.98]) for (const z of [1.72, 4.8]) lantern(x, z);

  // Perimeter timber fence, with a clear front entrance and a rear service path.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      box(0.13, 0.74, 0.13, 'wood', side * 5.64, 0.54, -5.3 + i * 0.92);
      box(0.2, 0.075, 0.2, 'woodLight', side * 5.64, 0.95, -5.3 + i * 0.92);
    }
    for (const y of [0.44, 0.8])
      box(0.1, 0.09, 10.25, 'woodLight', side * 5.64, y, -0.2);
    for (let i = 0; i < 7; i++)
      box(0.13, 0.74, 0.13, 'wood', side * (1.3 + i * 0.72), 0.54, 5.57);
    for (const y of [0.44, 0.8])
      box(4.4, 0.09, 0.1, 'woodLight', side * 3.45, y, 5.57);
  }
  for (let i = 0; i < 15; i++)
    box(0.13, 0.72, 0.13, 'wood', -5.5 + i * 0.79, 0.54, -5.55);
  for (const y of [0.44, 0.8]) box(11.15, 0.09, 0.1, 'woodLight', 0, y, -5.55);

  let seed = 731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function tree(x: number, z: number, s: number, flowering = false) {
    ball(0.75 * s, 'moss', x, 0.2, z, 1, 0.22, 1);
    beam([x, 0.22, z], [x - 0.18 * s, 2.7 * s, z], 0.18 * s, 'wood', 0.09 * s);
    for (const [dx, dy, dz] of [
      [-0.8, 2.9, 0.1],
      [0.7, 3.15, 0.15],
      [-0.1, 3.85, 0],
      [0.1, 3.1, 0.7],
      [-0.15, 3.3, -0.65],
    ]) {
      beam(
        [x - 0.1, 1.7 * s, z],
        [x + dx! * s, dy! * s, z + dz! * s],
        0.085 * s,
        'wood',
        0.025 * s,
      );
      for (let i = 0; i < 4; i++)
        ball(
          (0.55 + random() * 0.18) * s,
          flowering
            ? i % 3
              ? 'blossom'
              : 'chalk'
            : i % 3
              ? 'leaf'
              : 'leafLight',
          x + (dx! + (random() - 0.5) * 0.7) * s,
          (dy! + (random() - 0.5) * 0.4) * s,
          z + (dz! + (random() - 0.5) * 0.7) * s,
          1.15,
          0.8,
          1,
        );
    }
    for (const side of [-1, 1])
      beam([x, 0.5, z], [x + side * 0.4, 0.2, z + 0.3], 0.085, 'wood', 0.025);
  }
  tree(-4.35, -3.7, 1.12);
  tree(4.45, -4.5, 0.78, true);
  tree(-4.35, 1.85, 0.76);
  // Purification pavilion with basin, still turquoise water and bamboo ladle.
  for (const x of [3.25, 4.65])
    for (const z of [1.53, 2.75]) {
      box(0.26, 0.14, 0.26, 'stone', x, 0.24, z);
      box(0.11, 1.8, 0.11, 'wood', x, 1.18, z);
    }
  roof(2.12, 1.95, 2.02, 3.95, 2.14, 0.58);
  box(1.36, 0.4, 0.78, 'stone', 3.95, 0.68, 2.14);
  box(1.1, 0.04, 0.57, 'water', 3.95, 0.9, 2.14);
  for (const dx of [-0.66, 0.66])
    box(0.15, 0.17, 0.9, 'stoneLight', 3.95 + dx, 0.9, 2.14);
  for (const dz of [-0.39, 0.39])
    box(1.36, 0.17, 0.15, 'stoneLight', 3.95, 0.9, 2.14 + dz);
  beam([3.42, 1.04, 1.85], [4.22, 1.04, 2.38], 0.025, 'gold');
  cylinder(0.09, 0.085, 'woodLight', 4.22, 1.07, 2.38);
  box(1.55, 0.05, 0.08, 'leaf', 3.95, 1.01, 2.34);

  // Side office / storehouse sits on the rear terrace, lower than the main hall.
  box(1.65, 0.16, 1.9, 'wood', 3.65, 0.84, -3.1);
  box(1.5, 1.4, 1.65, 'chalk', 3.65, 1.61, -3.1);
  for (const dx of [-0.76, 0.76])
    for (const dz of [-0.84, 0.84])
      box(0.1, 1.5, 0.1, 'wood', 3.65 + dx, 1.65, -3.1 + dz);
  box(0.72, 1.2, 0.06, 'wood', 3.65, 1.55, -2.24);
  for (let i = 0; i < 6; i++)
    box(0.025, 1.15, 0.03, 'woodLight', 3.34 + i * 0.125, 1.55, -2.2);
  roof(2.12, 2.12, 2.36, 3.65, -3.1, 0.65);
  slab(1, 0.5, 0.13, 0.76, 'stone', 3.65, -1.99, 0.04);

  // Ema rack: little blank pentagonal plaques, no lettering anywhere in the scene.
  for (const x of [2.9, 4.55]) box(0.1, 1.28, 0.1, 'wood', x, 0.82, -0.18);
  for (const y of [0.9, 1.39])
    box(1.85, 0.08, 0.1, 'woodLight', 3.73, y, -0.18);
  roof(2.05, 0.65, 1.48, 3.73, -0.18, 0.27);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 5; i++) {
      const x = 3.07 + i * 0.32,
        y = 1.1 - row * 0.45;
      beam([x, y + 0.25, -0.11], [x, y + 0.12, -0.11], 0.01, 'red');
      const plaque = new THREE.Shape();
      plaque.moveTo(-0.12, -0.1);
      plaque.lineTo(0.12, -0.1);
      plaque.lineTo(0.12, 0.07);
      plaque.lineTo(0, 0.15);
      plaque.lineTo(-0.12, 0.07);
      plaque.closePath();
      part(
        new THREE.ExtrudeGeometry(plaque, {
          depth: 0.035,
          bevelEnabled: false,
        }),
        'woodLight',
        x,
        y,
        -0.12,
      );
    }
  // Tied omikuji and a roofed, deliberately blank noticeboard beside the left path.
  for (const x of [-4.7, -3.1]) box(0.09, 1.3, 0.09, 'wood', x, 0.83, -0.3);
  for (const y of [0.85, 1.35]) {
    beam([-4.7, y, -0.3], [-3.1, y, -0.3], 0.018, 'gold');
    for (let i = 0; i < 8; i++) {
      const x = -4.52 + i * 0.18;
      part(
        new THREE.BoxGeometry(0.13, 0.07, 0.035),
        'chalk',
        x,
        y,
        -0.29,
        0,
        0,
        (i % 2 ? 1 : -1) * 0.4,
      );
      part(
        new THREE.BoxGeometry(0.05, 0.18, 0.025),
        'chalk',
        x + 0.02,
        y - 0.09,
        -0.29,
        0,
        0,
        0.2,
      );
    }
  }
  for (const x of [-4.7, -3.7]) box(0.1, 1.32, 0.1, 'wood', x, 0.84, 4.3);
  box(1.16, 0.7, 0.12, 'wood', -4.2, 1.2, 4.3);
  box(0.98, 0.51, 0.035, 'chalk', -4.2, 1.2, 4.38);
  roof(1.45, 0.6, 1.58, -4.2, 4.3, 0.25);
  // Bamboo broom leaning beside the shrine and a low bench.
  beam([-3.05, 0.98, -1.05], [-2.8, 2.05, -1.22], 0.025, 'gold');
  for (let i = 0; i < 9; i++)
    beam(
      [-3.05, 1.08, -1.05],
      [-3.27 + i * 0.05, 0.76, -1.01],
      0.017,
      'woodLight',
      0.025,
    );
  for (const x of [3.2, 4.3]) box(0.13, 0.36, 0.4, 'wood', x, 0.36, 4.4);
  box(1.6, 0.12, 0.55, 'red', 3.75, 0.6, 4.4);
  for (let i = 0; i < 12; i++)
    slab(
      0.43,
      0.37,
      0.055,
      0.17,
      i % 2 ? 'stone' : 'stoneLight',
      -5 + Math.sin(i) * 0.09,
      -4.6 + i * 0.78,
      0.09,
    );
  for (const [x, z] of [
    [-3.25, -4.8],
    [3.1, -4.9],
    [-3, 0.95],
    [4.85, 3.7],
    [-4.85, 4.9],
    [2.85, 5],
    [-5.1, -1.25],
  ]) {
    const ground = z! < 0.3 && Math.abs(x!) < 4.4 ? 0.75 : 0.17;
    ball(0.7, 'moss', x!, ground, z!, 1.2, 0.16, 1);
    ball(0.45, 'leaf', x!, ground + 0.21, z!, 1.25, 0.65, 1);
    ball(0.31, 'leafLight', x! + 0.35, ground + 0.18, z! + 0.27, 1, 0.8, 1);
    ball(0.3, 'stone', x! - 0.42, ground + 0.13, z! + 0.27, 1, 0.8, 1);
    for (let i = 0; i < 5; i++)
      ball(
        0.04,
        'chalk',
        x! + random() * 0.5,
        ground + 0.48,
        z! + random() * 0.3,
      );
  }
  // Discrete gravel flecks and fallen leaves collect near the edges, keeping the axis open.
  for (let i = 0; i < 260; i++) {
    const x = (random() - 0.5) * 11.5,
      z = (random() - 0.5) * 11.5;
    if (Math.abs(x) < 1.25 || (z < 0.7 && Math.abs(x) < 4.6)) continue;
    part(
      new THREE.CircleGeometry(0.018 + random() * 0.025, 5),
      i % 7 === 0 ? 'blossom' : i % 3 ? 'stoneLight' : 'woodLight',
      x,
      0.18,
      z,
      -Math.PI / 2,
      0,
      random() * Math.PI,
    );
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('Unable to build garden geometry');
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = material.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
