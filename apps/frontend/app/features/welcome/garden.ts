import * as THREE from 'three';
import { createModelBuilder } from './model';
import {
  addHall,
  addRoof,
  addRailing,
  addTorii,
  addCrest,
} from './architecture';
import { addSacredSakura, seededRandom } from './sakura';

/** A compressed, reference-led Narukami summit, not a literal game-map extraction. */
export function createWelcomeGarden() {
  const b = createModelBuilder(),
    random = seededRandom();
  const { box, slab, cylinder, rock, beam } = b;
  // Square stone miniature foundation, with three courses of exposed summit masonry.
  slab(12.6, 12.6, 0.95, -1.5, 'mortar', 0, 0, 0.25);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 14; i++) {
      const p = -5.85 + i * 0.9;
      for (const side of [-1, 1]) {
        box(
          0.86,
          0.28,
          0.11,
          (i + row) % 3 ? 'stone' : 'stoneLight',
          p,
          -1.32 + row * 0.31,
          side * 6.27,
        );
        box(
          0.11,
          0.28,
          0.86,
          (i + row) % 3 ? 'stoneLight' : 'stone',
          side * 6.27,
          -1.32 + row * 0.31,
          p,
        );
      }
    }
  slab(12.6, 12.6, 0.15, -0.55, 'stoneLight', 0, 0, 0.24);
  slab(12.35, 12.35, 0.55, -0.4, 'mortar', 0, 0, 0.2);
  slab(12.5, 12.5, 0.13, 0.02, 'stoneLight', 0, 0, 0.22);
  slab(12.15, 12.15, 0.07, 0.15, 'gravel', 0, 0, 0.2);
  // Rear summit terrace. The central stair is built into it, not floating over a flat plane.
  slab(11.8, 7.8, 0.82, 0.22, 'mortar', 0, -2.14, 0.18);
  for (let i = 0; i < 16; i++)
    box(
      0.69,
      0.65,
      0.14,
      i % 3 ? 'stone' : 'stoneLight',
      -5.53 + i * 0.735,
      0.64,
      1.79,
    );
  slab(11.95, 7.9, 0.14, 1.04, 'stoneLight', 0, -2.14, 0.15);
  slab(11.65, 7.65, 0.045, 1.18, 'gravel', 0, -2.14, 0.14);
  for (let i = 0; i < 9; i++) {
    const top = 0.22 + (i + 1) * 0.107,
      z = 4.8 - i * 0.38;
    box(2.72, top - 0.2, 0.42, 'stone', 0, 0.2 + (top - 0.2) / 2, z);
    box(2.79, 0.055, 0.43, i % 3 ? 'stoneLight' : 'stone', 0, top, z);
    for (const side of [-1, 1])
      box(0.19, 0.13, 0.43, 'stoneLight', side * 1.52, top + 0.03, z);
  }
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 4; col++) {
      const z = 1.36 - row * 0.63,
        x = -1.05 + col * 0.7;
      if (z < -2.5) continue;
      slab(
        0.68,
        0.6,
        0.035,
        1.225,
        (row + col) % 4 ? 'stoneLight' : 'stone',
        x,
        z,
        0.025,
      );
    }
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      slab(
        0.67,
        0.57,
        0.035,
        0.22,
        'stoneLight',
        -1.04 + col * 0.7,
        5.35 + row * 0.59,
        0.03,
      );
  // The main halls frame the tree court instead of blocking the Sacred Sakura.
  addHall(b, -3.65, -1.35, 1.04);
  addHall(b, 3.7, -1.85, 0.88);
  addTorii(b, 4.38, 0.47, 1.03);
  addTorii(b, 1.35, 1.23, 0.87);
  addTorii(b, -2.45, 1.25, 0.93, true);
  slab(3.4, 3.2, 0.17, 1.22, 'stone', 0, -4.4, 0.18);
  slab(3.15, 2.95, 0.05, 1.39, 'moss', 0, -4.4, 0.16);
  const sakura = addSacredSakura(b);

  function lantern(x: number, y: number, z: number, scale = 1) {
    slab(0.57 * scale, 0.57 * scale, 0.1, y, 'stone', x, z, 0.04);
    cylinder(0.2 * scale, 0.12, 'stoneLight', x, y + 0.16, z);
    cylinder(
      0.09 * scale,
      0.48 * scale,
      'stone',
      x,
      y + 0.22 + 0.24 * scale,
      z,
      0.14 * scale,
    );
    slab(
      0.45 * scale,
      0.45 * scale,
      0.1,
      y + 0.22 + 0.48 * scale,
      'stoneLight',
      x,
      z,
      0.03,
    );
    const center = y + 0.32 + 0.65 * scale;
    box(0.26 * scale, 0.32 * scale, 0.26 * scale, 'glow', x, center, z);
    for (const dx of [-1, 1])
      for (const dz of [-1, 1])
        box(
          0.055,
          0.35 * scale,
          0.055,
          'stone',
          x + dx * 0.17 * scale,
          center,
          z + dz * 0.17 * scale,
        );
    b.part(
      new THREE.ConeGeometry(0.45 * scale, 0.28 * scale, 4),
      'roof',
      x,
      center + 0.29 * scale,
      z,
      0,
      Math.PI / 4,
    );
    box(0.63 * scale, 0.045, 0.63 * scale, 'gold', x, center + 0.15 * scale, z);
    rock(0.075 * scale, 'stoneLight', x, center + 0.48 * scale, z);
  }
  for (const x of [-1.95, 1.95]) {
    lantern(x, 0.22, 5.15);
    lantern(x, 1.23, 0.95);
  }
  for (const x of [-2.0, 2.0]) lantern(x, 1.23, -2.8, 0.8);
  // Guardian foxes flank the inner torii on tall slate plinths.
  for (const side of [-1, 1]) {
    const x = side * 1.88,
      z = -1.5;
    slab(0.61, 0.63, 0.16, 1.23, 'stoneLight', x, z);
    box(0.46, 0.43, 0.47, 'stone', x, 1.59, z);
    slab(0.58, 0.59, 0.09, 1.8, 'stoneLight', x, z);
    rock(0.21, 'ivory', x, 2.08, z, 0.65, 1.2, 0.8);
    rock(0.14, 'ivory', x, 2.35, z + 0.03, 0.85, 1, 0.8);
    b.part(
      new THREE.ConeGeometry(0.09, 0.19, 5),
      'ivory',
      x,
      2.33,
      z + 0.16,
      Math.PI / 2,
    );
    for (const dx of [-0.08, 0.08])
      b.part(
        new THREE.ConeGeometry(0.055, 0.18, 4),
        'ivory',
        x + dx,
        2.5,
        z + 0.015,
      );
    for (const dx of [-0.075, 0.075])
      beam([x + dx, 2.11, z + 0.11], [x + dx, 1.9, z + 0.14], 0.035, 'ivory');
    b.curve(
      [
        [x, 1.96, z - 0.05],
        [x + side * 0.2, 2.07, z - 0.15],
        [x + side * 0.18, 2.27, z - 0.08],
      ],
      0.065,
      'ivory',
    );
    box(0.22, 0.08, 0.19, 'redLight', x, 2.23, z + 0.04);
  }
  // Raised red galleries and the rails around the summit, with black/gold caps.
  for (const side of [-1, 1]) {
    addRailing(b, side * 5.68, 1.35, side * 5.68, -5.75, 1.23);
    addRailing(b, side * 1.7, 1.48, side * 5.65, 1.48, 1.23);
    addRailing(b, side * 1.75, 5.75, side * 5.65, 5.75, 0.22);
    for (let i = 0; i < 4; i++) {
      const z = 4.57 - i * 0.79,
        y = 0.54 + i * 0.22;
      box(0.13, 0.7, 0.13, 'red', side * 1.67, y + 0.35, z);
      box(0.2, 0.075, 0.2, 'dark', side * 1.67, y + 0.73, z);
      cylinder(0.07, 0.055, 'gold', side * 1.67, y + 0.8, z, 0.04);
    }
    for (const dy of [0.24, 0.61])
      beam(
        [side * 1.67, 0.54 + dy, 4.57],
        [side * 1.67, 1.2 + dy, 2.2],
        0.045,
        'redLight',
        0.045,
        4,
      );
  }
  addRailing(b, -5.65, -5.75, 5.65, -5.75, 1.23);
  // Small purification pavilion and calm basin. Water remains subordinate to the tree court.
  const px = -4.15,
    pz = 3.45;
  for (const dx of [-0.74, 0.74])
    for (const dz of [-0.62, 0.62]) {
      slab(0.3, 0.3, 0.12, 0.22, 'stone', px + dx, pz + dz);
      box(0.11, 1.69, 0.11, 'red', px + dx, 1.16, pz + dz);
      box(0.2, 0.1, 0.2, 'gold', px + dx, 1.9, pz + dz);
    }
  addRoof(b, 2.25, 1.85, 1.99, px, pz, 0.74);
  box(1.3, 0.4, 0.8, 'stone', px, 0.64, pz);
  for (const dx of [-0.6, 0.6])
    box(0.15, 0.2, 0.9, 'stoneLight', px + dx, 0.87, pz);
  for (const dz of [-0.38, 0.38])
    box(1.3, 0.2, 0.15, 'stoneLight', px, 0.87, pz + dz);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x719caa,
    metalness: 0.25,
    roughness: 0.26,
  });
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(1.13, 0.03, 0.64),
    waterMaterial,
  );
  water.position.set(px, 0.86, pz);
  beam([px - 0.4, 1.01, pz - 0.25], [px + 0.27, 1.01, pz + 0.22], 0.02, 'gold');
  cylinder(0.075, 0.07, 'woodLight', px + 0.27, 1.04, pz + 0.22);
  // Ema rack, hanging lanterns and tied fortune slips on the quieter right side.
  const ex = 4.15,
    ez = 3.22;
  for (const dx of [-0.85, 0.85])
    box(0.11, 1.4, 0.11, 'red', ex + dx, 0.92, ez);
  addRoof(b, 2.12, 0.72, 1.65, ex, ez, 0.35);
  for (const y of [0.88, 1.38]) box(1.8, 0.07, 0.1, 'woodLight', ex, y, ez);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 6; i++) {
      const x = ex - 0.7 + i * 0.28,
        y = 1.15 - row * 0.48;
      beam([x, y + 0.22, ez], [x, y + 0.1, ez], 0.009, 'gold');
      const plaque = new THREE.Shape();
      plaque.moveTo(-0.1, -0.1);
      plaque.lineTo(0.1, -0.1);
      plaque.lineTo(0.1, 0.06);
      plaque.lineTo(0, 0.14);
      plaque.lineTo(-0.1, 0.06);
      plaque.closePath();
      b.part(
        new THREE.ExtrudeGeometry(plaque, {
          depth: 0.025,
          bevelEnabled: false,
        }),
        'woodLight',
        x,
        y,
        ez,
      );
      addCrest(b, x, y, ez + 0.035, 0.037, 'dark');
    }
  for (const x of [3.15, 4.95]) box(0.09, 0.85, 0.09, 'red', x, 0.65, 4.8);
  for (const y of [0.62, 0.98]) {
    beam([3.15, y, 4.8], [4.95, y, 4.8], 0.014, 'gold');
    for (let i = 0; i < 10; i++)
      b.part(
        new THREE.BoxGeometry(0.065, 0.16, 0.025),
        'ivory',
        3.24 + i * 0.18,
        y - 0.04,
        4.8,
        0,
        0,
        i % 2 ? 0.5 : -0.5,
      );
  }
  for (const [x, z, y] of [
    [-5.15, 0.75, 1.23],
    [5.0, 0.4, 1.23],
    [-2.7, -4.8, 1.23],
    [3, -4.8, 1.23],
    [-5.3, 5.05, 0.22],
    [5.25, 5.17, 0.22],
    [2.45, 3.7, 0.22],
  ]) {
    rock(0.68, 'moss', x!, y! + 0.03, z!, 1.3, 0.22, 1, x);
    rock(0.44, 'stone', x! - 0.2, y! + 0.22, z!, 1.2, 0.8, 0.95, z);
    for (let i = 0; i < 4; i++)
      rock(
        0.27 + random() * 0.15,
        i % 2 ? 'leaf' : 'leafLight',
        x! + (random() - 0.5) * 0.8,
        y! + 0.23,
        z! + (random() - 0.5) * 0.8,
        1,
        0.7,
        1,
        i,
      );
  }
  // Small edge plants and fallen petals leave the main axis deliberately open.
  for (let i = 0; i < 400; i++) {
    const x = (random() - 0.5) * 11.5,
      z = (random() - 0.5) * 11.5;
    if (
      (Math.abs(x) < 1.6 && z > 1.6) ||
      (Math.abs(x) > 2.1 && z < 0.5 && z > -3.8)
    )
      continue;
    const y = z < 1.7 ? 1.268 : 0.257;
    b.part(
      new THREE.CircleGeometry(0.02 + random() * 0.034, 5),
      i % 6 ? 'blossom' : 'ivory',
      x,
      y,
      z,
      -Math.PI / 2,
      0,
      random() * Math.PI,
    );
  }
  const root = b.finish();
  root.name = 'grand-narukami-shrine';
  root.add(sakura, water);
  return root;
}
