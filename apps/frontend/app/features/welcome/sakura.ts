import * as THREE from 'three';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
import type { ModelBuilder } from './model';

export function seededRandom(initial = 731) {
  let seed = initial;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Continuous tapered wood with irregular radial fluting, not disconnected cylinders. */
function limb(points: number[][], radii: number[], segments = 22) {
  const path = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const frames = path.computeFrenetFrames(segments, false),
    positions: number[] = [],
    indices: number[] = [];
  const sides = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      point = path.getPointAt(t),
      along = t * (radii.length - 1),
      k = Math.min(Math.floor(along), radii.length - 2);
    const radius = THREE.MathUtils.lerp(radii[k]!, radii[k + 1]!, along - k);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const r =
        radius *
        (1 + Math.sin(a * 5 + t * 9) * 0.095 + Math.cos(a * 3 - t * 6) * 0.08);
      const v = point
        .clone()
        .addScaledVector(frames.normals[i]!, Math.cos(a) * r)
        .addScaledVector(frames.binormals[i]!, Math.sin(a) * r);
      positions.push(v.x, v.y, v.z);
      if (i < segments && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function addSacredSakura(b: ModelBuilder) {
  const root = new THREE.Group();
  root.name = 'sacred-sakura';
  const wood = (
    points: number[][],
    radii: number[],
    color: 'wood' | 'woodLight' = 'wood',
  ) => b.part(limb(points, radii), color);
  // The root flare, hollow neck and swept fox profile are the shrine's identifying silhouette.
  wood(
    [
      [0, 1.22, -4.05],
      [0.4, 2.45, -4.15],
      [0.12, 3.65, -4.05],
      [0.55, 4.8, -3.9],
      [0.1, 6.25, -3.8],
      [0.65, 7.2, -3.6],
    ],
    [0.84, 0.66, 0.57, 0.6, 0.51, 0.25],
  );
  wood(
    [
      [0.5, 2.4, -4],
      [1.12, 3.3, -3.85],
      [1.05, 4.5, -3.8],
      [0.45, 5.5, -3.65],
    ],
    [0.4, 0.38, 0.3, 0.22],
    'woodLight',
  );
  wood(
    [
      [0.35, 5.2, -3.65],
      [-0.35, 6.1, -3.5],
      [-1.25, 6.15, -3.3],
      [-1.9, 5.6, -3.08],
      [-2.23, 5.23, -2.96],
    ],
    [0.55, 0.6, 0.5, 0.29, 0.065],
    'woodLight',
  );
  // Sharp ears continue organically from the crown of the fox's head.
  wood(
    [
      [-0.95, 6.08, -3.32],
      [-1.04, 6.63, -3.36],
      [-0.95, 7.3, -3.4],
    ],
    [0.32, 0.2, 0.01],
  );
  wood(
    [
      [-0.3, 6.25, -3.65],
      [-0.18, 6.77, -3.73],
      [0.05, 7.18, -3.8],
    ],
    [0.24, 0.14, 0.01],
  );
  wood(
    [
      [-1.65, 5.66, -3.16],
      [-1.3, 5.28, -3.12],
      [-0.9, 5.22, -3.28],
    ],
    [0.18, 0.17, 0.035],
  );
  const branches = [
    {
      p: [
        [0.2, 4.4, -4.2],
        [-1.3, 5.5, -4.7],
        [-2.4, 6.65, -4.85],
        [-4.35, 7.2, -4.35],
      ],
      r: [0.43, 0.35, 0.25, 0.055],
    },
    {
      p: [
        [0.5, 4.9, -3.9],
        [1.6, 5.75, -4.1],
        [2.5, 7.1, -4.55],
        [4.2, 8.0, -4.6],
      ],
      r: [0.4, 0.31, 0.2, 0.04],
    },
    {
      p: [
        [0.15, 6.0, -3.8],
        [0.8, 7.25, -3.6],
        [0.35, 8.45, -3.5],
        [-0.7, 9.25, -3.6],
      ],
      r: [0.34, 0.25, 0.17, 0.035],
    },
    {
      p: [
        [0.5, 6.2, -3.8],
        [1.7, 6.85, -2.9],
        [2.9, 7.5, -1.75],
        [4.05, 7.85, -1.1],
      ],
      r: [0.31, 0.25, 0.15, 0.035],
    },
    {
      p: [
        [-0.7, 5.9, -3.9],
        [-1.8, 6.55, -2.9],
        [-2.65, 7.25, -1.9],
        [-4.2, 7.55, -1.6],
      ],
      r: [0.3, 0.23, 0.15, 0.035],
    },
    {
      p: [
        [0.2, 5.3, -4.4],
        [0, 6.5, -5.15],
        [-1.45, 7.5, -5.25],
        [-2.2, 8.35, -5.5],
      ],
      r: [0.35, 0.28, 0.18, 0.035],
    },
  ];
  for (const { p, r } of branches) {
    wood(p, r);
    const end = p[p.length - 1]!,
      prior = p[p.length - 2]!;
    for (const side of [-1, 1])
      wood(
        [
          prior,
          [end[0]! + side * 0.25, end[1]! + 0.3, end[2]!],
          [end[0]! + side * 0.9, end[1]! + 0.7, end[2]! + side * 0.35],
        ],
        [0.13, 0.075, 0.012],
      );
  }
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    wood(
      [
        [0.2, 2, -4.05],
        [Math.cos(a) * 0.95, 1.35, -4.05 + Math.sin(a) * 0.8],
        [Math.cos(a) * 1.8, 1.21, -4.05 + Math.sin(a) * 1.25],
      ],
      [0.29, 0.2, 0.018],
    );
  }
  // Long bark ridges follow the wood grain and reveal its twisting volume in close-up.
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9;
    b.curve(
      [
        [Math.cos(a) * 0.75, 1.4, -4.05 + Math.sin(a) * 0.7],
        [0.4 + Math.cos(a + 0.3) * 0.58, 2.5, -4.15 + Math.sin(a + 0.3) * 0.58],
        [
          0.12 + Math.cos(a + 0.65) * 0.5,
          3.65,
          -4.05 + Math.sin(a + 0.65) * 0.5,
        ],
        [0.55 + Math.cos(a + 0.8) * 0.53, 4.8, -3.9 + Math.sin(a + 0.8) * 0.53],
      ],
      0.026,
      i % 2 ? 'woodLight' : 'dark',
    );
  }
  const energyMaterial = new THREE.MeshStandardMaterial({
    color: 0x6fe1ee,
    emissive: 0x248fae,
    emissiveIntensity: 0.7,
    roughness: 0.5,
  });
  const energies = [
    [
      [-1.52, 6.02, -2.985],
      [-1.25, 6.06, -2.88],
      [-1.05, 6.03, -2.9],
    ],
    [
      [0.67, 5.88, -3.28],
      [0.93, 5.47, -3.27],
      [0.78, 5.22, -3.17],
      [1.02, 4.83, -3.3],
    ],
    [
      [0.6, 3.62, -3.52],
      [0.73, 3.22, -3.44],
      [0.56, 2.92, -3.51],
    ],
  ];
  for (const points of energies) {
    const mesh = new THREE.Mesh(
      limb(points, [0.025, 0.04, 0.025], 14),
      energyMaterial,
    );
    root.add(mesh);
  }

  const random = seededRandom(1347),
    crowns: THREE.BufferGeometry[] = [];
  const anchors = [
    [-4.2, 7.95, -4.4, 1.8, 0.7, 1.35],
    [-2.8, 8.65, -4.7, 2.0, 0.82, 1.5],
    [-0.9, 9.1, -4.7, 1.9, 0.9, 1.55],
    [1.0, 9.2, -4.4, 2.2, 0.8, 1.6],
    [3.0, 8.8, -4.1, 2.0, 0.85, 1.45],
    [4.6, 8.2, -3.4, 1.5, 0.7, 1.4],
    [-4.1, 7.5, -1.85, 1.65, 0.63, 1.25],
    [-2.4, 8.12, -2.1, 1.7, 0.7, 1.3],
    [-0.5, 8.65, -2.0, 1.7, 0.65, 1.25],
    [1.45, 8.4, -1.9, 1.7, 0.68, 1.3],
    [3.3, 7.95, -1.5, 1.9, 0.72, 1.3],
    [4.8, 7.5, -1.3, 1.1, 0.52, 0.9],
  ];
  const pinks = [0xd28ab7, 0xe6a9ca, 0xf1bdd6, 0xc67cac].map(
    (c) => new THREE.Color(c),
  );
  for (let k = 0; k < anchors.length; k++) {
    const [x, y, z, sx, sy, sz] = anchors[k]!;
    for (let l = 0; l < 3; l++) {
      const geometry = new THREE.IcosahedronGeometry(1, 2),
        p = geometry.getAttribute('position'),
        colors: number[] = [];
      const ox = (random() - 0.5) * sx!,
        oz = (random() - 0.5) * sz!,
        oy = (random() - 0.5) * 0.4;
      for (let i = 0; i < p.count; i++) {
        const a = p.getX(i),
          c = p.getY(i),
          e = p.getZ(i);
        const n =
          1 +
          0.11 * Math.sin(a * 13 + e * 7) +
          0.08 * Math.cos(c * 15 - e * 12) +
          0.06 * Math.sin(a * 28 + c * 9);
        p.setXYZ(
          i,
          x! + ox + a * sx! * 0.78 * n,
          y! + oy + c * sy! * n,
          z! + oz + e * sz! * 0.82 * n,
        );
        const color = pinks[(k + l) % pinks.length]!.clone().lerp(
          pinks[2]!,
          Math.max(0, c) * 0.24,
        );
        colors.push(color.r, color.g, color.b);
      }
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geometry.deleteAttribute('uv');
      geometry.deleteAttribute('normal');
      const smooth = mergeVertices(geometry);
      smooth.computeVertexNormals();
      crowns.push(smooth);
      geometry.dispose();
    }
  }
  const canopyGeometry = mergeGeometries(crowns)!;
  crowns.forEach((g) => g.dispose());
  const canopy = new THREE.Mesh(
    canopyGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  canopy.name = 'layered-blossom-canopy';
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  root.add(canopy);
  // Opaque five-petal florets break up crown edges without transparent sorting or per-flower draws.
  const vertices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    vertices.push(
      0,
      0,
      0,
      Math.cos(a - 0.43) * 0.65,
      Math.sin(a - 0.43) * 0.65,
      0.12,
      Math.cos(a),
      Math.sin(a),
      0,
      0,
      0,
      0,
      Math.cos(a),
      Math.sin(a),
      0,
      Math.cos(a + 0.43) * 0.65,
      Math.sin(a + 0.43) * 0.65,
      0.12,
    );
  }
  const flowerGeometry = new THREE.BufferGeometry();
  flowerGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  flowerGeometry.computeVertexNormals();
  const flowers = new THREE.InstancedMesh(
    flowerGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    8000,
  );
  flowers.name = 'sakura-florets';
  const dummy = new THREE.Object3D();
  const surface = canopyGeometry.getAttribute('position'),
    normals = canopyGeometry.getAttribute('normal'),
    index = canopyGeometry.index!;
  const a = new THREE.Vector3(),
    c = new THREE.Vector3(),
    e = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < flowers.count; i++) {
    const triangle = Math.floor((random() * index.count) / 3) * 3;
    const ia = index.getX(triangle),
      ic = index.getX(triangle + 1),
      ie = index.getX(triangle + 2);
    a.fromBufferAttribute(surface, ia);
    c.fromBufferAttribute(surface, ic);
    e.fromBufferAttribute(surface, ie);
    const u = Math.sqrt(random()),
      v = random();
    dummy.position
      .copy(a)
      .multiplyScalar(1 - u)
      .addScaledVector(c, u * (1 - v))
      .addScaledVector(e, u * v);
    normal
      .fromBufferAttribute(normals, ia)
      .multiplyScalar(1 - u)
      .addScaledVector(a.fromBufferAttribute(normals, ic), u * (1 - v))
      .addScaledVector(c.fromBufferAttribute(normals, ie), u * v)
      .normalize();
    dummy.position.addScaledVector(normal, 0.025);
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateZ(random() * Math.PI * 2);
    dummy.scale.setScalar(0.09 + random() * 0.085);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, pinks[i % pinks.length]!);
  }
  flowers.computeBoundingSphere();
  root.add(flowers);
  return root;
}
