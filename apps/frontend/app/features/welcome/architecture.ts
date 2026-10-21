import * as THREE from 'three';
import type { ModelBuilder } from './model';

/** Solid curved roof shells, closed along both ends, with separate fascia and tile ribs. */
export function addRoof(
  b: ModelBuilder,
  w: number,
  d: number,
  y: number,
  x: number,
  z: number,
  height: number,
  ornate = false,
) {
  const profile = [
    [-w / 2, 0.23],
    [-w * 0.43, 0.16],
    [-w * 0.33, height * 0.24],
    [-w * 0.18, height * 0.66],
    [0, height],
    [w * 0.18, height * 0.66],
    [w * 0.33, height * 0.24],
    [w * 0.43, 0.16],
    [w / 2, 0.23],
  ];
  const shape = new THREE.Shape();
  profile.forEach(([px, py], i) =>
    i ? shape.lineTo(px!, py!) : shape.moveTo(px!, py!),
  );
  [...profile].reverse().forEach(([px, py]) => shape.lineTo(px!, py! - 0.14));
  shape.closePath();
  b.part(
    new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }),
    'roof',
    x,
    y,
    z - d / 2,
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i]!,
        c = profile[i + 1]!;
      b.beam(
        [x + a[0]!, y + a[1]! - 0.06, z + side * (d / 2 + 0.015)],
        [x + c[0]!, y + c[1]! - 0.06, z + side * (d / 2 + 0.015)],
        0.045,
        'gold',
      );
    }
    b.box(0.13, 0.12, d + 0.06, 'gold', x + (side * w) / 2, y + 0.18, z);
  }
  for (let j = 0; j <= Math.ceil(d / 0.22); j++) {
    const tz = z - d / 2 + (j * d) / Math.ceil(d / 0.22);
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i]!,
        c = profile[i + 1]!;
      b.beam(
        [x + a[0]!, y + a[1]! + 0.012, tz],
        [x + c[0]!, y + c[1]! + 0.012, tz],
        0.016,
        'roofLight',
        0.016,
        5,
      );
    }
  }
  b.box(0.21, 0.17, d + 0.18, 'roofLight', x, y + height + 0.025, z);
  for (const side of [-1, 1]) {
    b.beam(
      [x, y + height + 0.03, z + (side * d) / 2],
      [x, y + height + 0.25, z + side * (d / 2 + 0.2)],
      0.085,
      'gold',
      0.04,
    );
    if (ornate) {
      // Narukami's crossed, gold-tipped roof finials (chigi), not pagoda tiers.
      for (const direction of [-1, 1]) {
        b.beam(
          [x - direction * 0.4, y + height - 0.38, z + side * (d / 2 - 0.42)],
          [x + direction * 0.62, y + height + 0.72, z + side * (d / 2 - 0.42)],
          0.075,
          'roof',
          0.055,
        );
        b.beam(
          [x + direction * 0.44, y + height + 0.52, z + side * (d / 2 - 0.42)],
          [x + direction * 0.68, y + height + 0.82, z + side * (d / 2 - 0.42)],
          0.07,
          'gold',
          0.045,
        );
      }
    }
  }
  if (ornate)
    for (let i = -1; i <= 1; i++)
      b.beam(
        [x - 0.24, y + height + 0.17, z + i * d * 0.22],
        [x + 0.24, y + height + 0.17, z + i * d * 0.22],
        0.07,
        'gold',
      );
}

export function addShide(
  b: ModelBuilder,
  x: number,
  y: number,
  z: number,
  s = 1,
) {
  for (let i = 0; i < 4; i++)
    b.part(
      new THREE.BoxGeometry(0.11 * s, 0.17 * s, 0.018),
      'ivory',
      x + (i % 2) * 0.07 * s,
      y - i * 0.115 * s,
      z,
      0,
      0,
      i % 2 ? -0.65 : 0.45,
    );
}

export function addCrest(
  b: ModelBuilder,
  x: number,
  y: number,
  z: number,
  r: number,
  color: 'gold' | 'dark' = 'gold',
) {
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    b.rock(
      r * 0.55,
      color,
      x + Math.sin(angle) * r * 0.6,
      y + Math.cos(angle) * r * 0.6,
      z,
      0.9,
      1,
      0.14,
    );
  }
  b.cylinder(r * 0.14, 0.05, 'gold', x, y, z, r * 0.14);
}

export function addRailing(
  b: ModelBuilder,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
) {
  const length = Math.hypot(x2 - x1, z2 - z1),
    count = Math.ceil(length / 0.7);
  for (let i = 0; i <= count; i++) {
    const x = x1 + ((x2 - x1) * i) / count,
      z = z1 + ((z2 - z1) * i) / count;
    b.box(0.105, 0.68, 0.105, 'red', x, y + 0.34, z);
    b.box(0.16, 0.08, 0.16, 'dark', x, y + 0.72, z);
    b.cylinder(0.07, 0.055, 'gold', x, y + 0.785, z, 0.035);
  }
  for (const dy of [0.22, 0.57])
    b.beam([x1, y + dy, z1], [x2, y + dy, z2], 0.045, 'redLight', 0.045, 4);
}

export function addHall(b: ModelBuilder, x: number, z: number, s = 1) {
  const base = 1.18,
    w = 2.8 * s,
    d = 2.8 * s,
    floor = base + 0.44;
  b.slab(w + 0.4, d + 0.6, 0.22, base, 'stone', x, z);
  b.box(w + 0.6, 0.16, d + 0.75, 'wood', x, floor - 0.1, z);
  for (let i = 0; i < 16; i++)
    b.box(
      (w + 0.5) / 16 - 0.012,
      0.06,
      d + 0.65,
      i % 3 ? 'woodLight' : 'wood',
      x - (w + 0.5) / 2 + ((i + 0.5) * (w + 0.5)) / 16,
      floor + 0.01,
      z,
    );
  const eave = floor + 2.05 * s;
  b.box(w, 1.95 * s, d, 'ivory', x, floor + 0.975 * s, z);
  for (const dx of [-w / 2, 0, w / 2])
    for (const dz of [-d / 2, d / 2]) {
      b.box(0.16, 2.12 * s, 0.16, 'red', x + dx, floor + 1.06 * s, z + dz);
      b.box(0.27, 0.12, 0.27, 'gold', x + dx, floor + 0.07, z + dz);
      for (const y of [eave - 0.19, eave - 0.04])
        b.box(0.34, 0.09, 0.34, 'redLight', x + dx, y, z + dz);
    }
  for (const y of [floor + 0.26, floor + 1.75 * s, eave])
    b.box(w + 0.14, 0.12, d + 0.13, 'red', x, y, z);
  const front = z + d / 2 + 0.035;
  for (const dx of [-0.67 * s, 0.67 * s]) {
    b.box(1.05 * s, 1.45 * s, 0.055, 'dark', x + dx, floor + 0.99 * s, front);
    for (let j = 0; j < 7; j++)
      b.box(
        0.025,
        1.4 * s,
        0.035,
        'woodLight',
        x + dx - 0.45 * s + j * 0.15 * s,
        floor + 0.99 * s,
        front + 0.04,
      );
    for (let j = 0; j < 5; j++)
      b.box(
        1.04 * s,
        0.025,
        0.035,
        'woodLight',
        x + dx,
        floor + 0.32 * s + j * 0.33 * s,
        front + 0.045,
      );
    addCrest(b, x + dx, floor + 1.25 * s, front + 0.07, 0.18 * s);
  }
  for (const side of [-1, 1]) {
    b.box(
      0.045,
      1.15 * s,
      1.5 * s,
      'dark',
      x + side * (w / 2 + 0.02),
      floor + 1.15 * s,
      z,
    );
    for (let j = 0; j < 10; j++)
      b.box(
        0.05,
        1.15 * s,
        0.03,
        'woodLight',
        x + side * (w / 2 + 0.05),
        floor + 1.15 * s,
        z - 0.7 * s + j * 0.155 * s,
      );
  }
  const gable = new THREE.Shape();
  gable.moveTo(-w / 2, 0);
  gable.lineTo(0, 1.48 * s);
  gable.lineTo(w / 2, 0);
  gable.closePath();
  for (const side of [-1, 1]) {
    b.part(
      new THREE.ExtrudeGeometry(gable, { depth: 0.08, bevelEnabled: false }),
      'ivory',
      x,
      eave,
      z + (side * d) / 2,
    );
    for (const dx of [-w * 0.36, 0, w * 0.36])
      b.beam(
        [x + dx, eave + 0.02, z + side * (d / 2 + 0.09)],
        [x, eave + 1.46 * s, z + side * (d / 2 + 0.09)],
        0.045,
        'red',
      );
  }
  addRoof(b, w + 1, d + 0.9, eave, x, z, 1.55 * s, true);
  // Lower entrance gable and bracketed, lantern-lit portico.
  for (const side of [-1, 1]) {
    b.box(
      0.13,
      1.9 * s,
      0.13,
      'red',
      x + side * 0.88 * s,
      floor + 0.95 * s,
      front + 0.64 * s,
    );
    b.box(
      0.32,
      0.12,
      0.32,
      'gold',
      x + side * 0.88 * s,
      floor + 0.08,
      front + 0.64 * s,
    );
    b.beam(
      [x + side * 0.88 * s, eave - 0.55, front + 0.64 * s],
      [x + side * 0.53 * s, eave - 0.2, front + 0.64 * s],
      0.06,
      'redLight',
    );
    b.cylinder(
      0.12 * s,
      0.33 * s,
      'glow',
      x + side * 0.8 * s,
      eave - 0.55,
      front + 0.46 * s,
      0.12 * s,
      12,
    );
    for (const dy of [-0.17, 0.17])
      b.cylinder(
        0.13 * s,
        0.045,
        'gold',
        x + side * 0.8 * s,
        eave - 0.55 + dy * s,
        front + 0.46 * s,
      );
  }
  b.box(1.95 * s, 0.17, 0.2, 'redLight', x, eave - 0.18, front + 0.64 * s);
  addRoof(b, 2.45 * s, 1.4 * s, eave - 0.2, x, front + 0.33 * s, 0.65 * s);
  b.curve(
    [
      [-0.9, 0, 0],
      [-0.45, -0.13, 0],
      [0, -0.18, 0],
      [0.45, -0.13, 0],
      [0.9, 0, 0],
    ].map(([a, c, e]) => [x + a! * s, eave - 0.48 + c!, front + 1.03 * s + e!]),
    0.07 * s,
    'gold',
  );
  for (const dx of [-0.65, -0.25, 0.25, 0.65])
    addShide(b, x + dx * s, eave - 0.65, front + 1.03 * s, 0.8 * s);
  for (let i = 0; i < 3; i++)
    b.box(
      1.5 * s,
      0.15,
      0.36,
      'stoneLight',
      x,
      base + 0.075 + i * 0.14,
      front + 1.12 - i * 0.27,
    );
  for (const side of [-1, 1])
    addRailing(
      b,
      x + side * (w / 2 + 0.25),
      z - d / 2,
      x + side * (w / 2 + 0.25),
      front + 0.2,
      floor,
    );
  b.box(0.7, 0.36, 0.42, 'wood', x, floor + 0.18, front + 0.3);
  for (let i = 0; i < 7; i++)
    b.box(
      0.055,
      0.06,
      0.48,
      'gold',
      x - 0.3 + i * 0.1,
      floor + 0.39,
      front + 0.3,
    );
}

export function addTorii(
  b: ModelBuilder,
  z: number,
  y: number,
  s = 1,
  sacred = false,
) {
  for (const side of [-1, 1]) {
    b.cylinder(0.23 * s, 0.16, 'stoneLight', side * 1.25 * s, y + 0.08, z);
    b.beam(
      [side * 1.25 * s, y + 0.16, z],
      [side * 1.15 * s, y + 2.53 * s, z],
      0.14 * s,
      'red',
      0.11 * s,
    );
    b.cylinder(0.15 * s, 0.26 * s, 'dark', side * 1.24 * s, y + 0.27 * s, z);
  }
  b.box(3.15 * s, 0.17 * s, 0.22 * s, 'red', 0, y + 2.07 * s, z);
  const upper = [
    [-1.84, 2.66],
    [-1.4, 2.53],
    [-0.7, 2.5],
    [0, 2.53],
    [0.7, 2.5],
    [1.4, 2.53],
    [1.84, 2.66],
  ];
  for (let i = 0; i < upper.length - 1; i++) {
    const a = upper[i]!,
      c = upper[i + 1]!;
    b.beam(
      [a[0]! * s, y + a[1]! * s, z],
      [c[0]! * s, y + c[1]! * s, z],
      0.13 * s,
      'redLight',
      0.13 * s,
      4,
    );
    b.beam(
      [a[0]! * s, y + (a[1]! + 0.14) * s, z],
      [c[0]! * s, y + (c[1]! + 0.14) * s, z],
      0.1 * s,
      'roof',
      0.1 * s,
      4,
    );
    b.beam(
      [a[0]! * s, y + (a[1]! + 0.045) * s, z + 0.13 * s],
      [c[0]! * s, y + (c[1]! + 0.045) * s, z + 0.13 * s],
      0.023 * s,
      'gold',
    );
  }
  if (sacred) addCrest(b, 0, y + 2.29 * s, z + 0.01, 0.3 * s, 'dark');
  else {
    b.box(0.38 * s, 0.44 * s, 0.09, 'gold', 0, y + 2.29 * s, z + 0.15);
    b.box(0.29 * s, 0.35 * s, 0.03, 'dark', 0, y + 2.29 * s, z + 0.21);
  }
  b.curve(
    [
      [-1.05 * s, y + 2 * s, z + 0.16],
      [0, y + 1.82 * s, z + 0.16],
      [1.05 * s, y + 2 * s, z + 0.16],
    ],
    0.035 * s,
    'gold',
  );
  for (const x of [-0.7, 0, 0.7])
    addShide(b, x * s, y + 1.8 * s, z + 0.16, 0.7 * s);
}
