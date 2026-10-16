import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** An original, asset-free miniature. Static parts are baked into material batches. */
export function createWelcomeGarden() {
  const root = new THREE.Group();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const palette = {
    chalk: 0xf8eee8,
    stone: 0xd8cdd7,
    edge: 0xb8aaba,
    wood: 0xbd8998,
    rose: 0xe8adc3,
    blush: 0xf4c9dc,
    light: 0xffe4eb,
    roof: 0x8b829d,
    roofLight: 0xaaa0b9,
    gold: 0xd9b887,
    leaf: 0xaabbb1,
    leafLight: 0xc9d2bd,
    dark: 0x655469,
    water: 0xb9d5d8,
  };
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        flatShading: true,
      }),
    ]),
  ) as Record<keyof typeof palette, THREE.MeshStandardMaterial>;
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
    const points = [
      [-w / 2 + bevel, -d / 2],
      [w / 2 - bevel, -d / 2],
      [w / 2, -d / 2 + bevel],
      [w / 2, d / 2 - bevel],
      [w / 2 - bevel, d / 2],
      [-w / 2 + bevel, d / 2],
      [-w / 2, d / 2 - bevel],
      [-w / 2, -d / 2 + bevel],
    ];
    shape.moveTo(...(points[0] as [number, number]));
    for (const point of points.slice(1))
      shape.lineTo(...(point as [number, number]));
    shape.closePath();
    part(
      new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }),
      color,
      x,
      y,
      z,
      -Math.PI / 2,
    );
  }
  // A stepped, thick square collector's plinth with porcelain inset and brass seam.
  slab(12.6, 12.6, 0.46, -1.0, 'edge', 0, 0, 0.35);
  slab(12.55, 12.55, 0.09, -0.54, 'gold', 0, 0, 0.3);
  slab(12.5, 12.5, 0.42, -0.45, 'chalk', 0, 0, 0.3);
  slab(12.1, 12.1, 0.12, -0.03, 'stone', 0, 0, 0.23);
  slab(11.8, 11.8, 0.08, 0.09, 'chalk', 0, 0, 0.24);
  // The rear terrace rises above the intimate open courtyard.
  slab(8.8, 5.5, 0.46, 0.17, 'stone', 0, -2.35);
  slab(8.95, 5.6, 0.12, 0.63, 'chalk', 0, -2.35);
  for (let i = 0; i < 4; i++)
    box(
      3.1,
      0.14,
      0.48,
      i % 2 ? 'chalk' : 'stone',
      0,
      0.19 + i * 0.14,
      0.95 - i * 0.4,
    );
  for (let i = 0; i < 6; i++) {
    box(
      1.55,
      0.07,
      0.56,
      i % 2 ? 'stone' : 'chalk',
      0.04 * (i % 2),
      0.21,
      1.6 + i * 0.64,
      ((i % 2) - 0.5) * 0.025,
    );
    for (const side of [-1, 1])
      box(0.16, 0.05, 0.48, 'edge', side * 0.96, 0.21, 1.6 + i * 0.64);
  }
  // Broad roof rings curve upward at the corners, with a separate pale eave edge.
  function roof(
    w: number,
    d: number,
    y: number,
    x: number,
    z: number,
    height: number,
  ) {
    function skin(offset: number, c: Color) {
      const rings = [
        { w: w, d: d, h: 0, lift: 0.17 },
        { w: w * 0.83, d: d * 0.8, h: 0.17, lift: 0.07 },
        { w: w * 0.58, d: d * 0.07, h: height, lift: 0 },
      ];
      const vertices: number[] = [];
      const ring = (r: (typeof rings)[number]) => [
        [-r.w / 2, r.h + r.lift, -r.d / 2],
        [0, r.h, -r.d / 2],
        [r.w / 2, r.h + r.lift, -r.d / 2],
        [r.w / 2, r.h, 0],
        [r.w / 2, r.h + r.lift, r.d / 2],
        [0, r.h, r.d / 2],
        [-r.w / 2, r.h + r.lift, r.d / 2],
        [-r.w / 2, r.h, 0],
      ];
      for (let level = 0; level < rings.length - 1; level++) {
        const low = ring(rings[level]!),
          high = ring(rings[level + 1]!);
        for (let j = 0; j < 8; j++) {
          const next = (j + 1) % 8;
          for (const index of [
            low[j],
            high[next],
            low[next],
            low[j],
            high[j],
            high[next],
          ])
            vertices.push(...index!);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.computeVertexNormals();
      part(geometry, c, x, y + offset, z);
    }
    skin(-0.095, 'chalk');
    skin(0, 'roof');
    box(w * 0.6, 0.15, 0.2, 'roofLight', x, y + height + 0.035, z);
    for (const side of [-1, 1]) {
      beam(
        [x + side * w * 0.3, y + height + 0.02, z],
        [x + side * (w * 0.3 + 0.18), y + height + 0.25, z],
        0.09,
        'roofLight',
        0.06,
      );
      for (let i = 0; i < 8; i++) {
        const tx = x - w * 0.36 + (i * w * 0.72) / 7;
        beam(
          [tx, y + 0.2, z + side * d * 0.4],
          [tx, y + height - 0.02, z + side * 0.09],
          0.018,
          'roofLight',
        );
      }
    }
  }
  // Shrine: exposed joinery, framed plaster panels, veranda and hanging bell.
  box(5.15, 0.28, 3.2, 'edge', 0, 0.91, -2.15);
  box(5.4, 0.2, 3.4, 'wood', 0, 1.13, -2.15);
  for (let i = 0; i < 18; i++)
    box(0.25, 0.035, 3.35, 'rose', -2.55 + i * 0.3, 1.25, -2.15);
  box(4.5, 2.2, 2.5, 'chalk', 0, 2.3, -2.4);
  for (const x of [-2.15, 0, 2.15])
    for (const z of [-3.68, -1.12]) {
      box(0.2, 2.52, 0.2, 'wood', x, 2.43, z);
      box(0.35, 0.13, 0.32, 'rose', x, 3.55, z);
    }
  box(4.8, 0.22, 2.85, 'wood', 0, 3.58, -2.4);
  for (const x of [-1.1, 1.1]) {
    box(1.6, 1.85, 0.06, 'dark', x, 2.3, -1.125);
    box(1.47, 1.73, 0.07, 'rose', x, 2.3, -1.08);
    for (let i = 0; i < 6; i++)
      box(0.035, 1.7, 0.09, 'wood', x - 0.61 + i * 0.245, 2.3, -1.03);
    for (const y of [1.8, 2.3, 2.8]) box(1.5, 0.04, 0.09, 'wood', x, y, -1.03);
  }
  roof(6.1, 4.15, 3.7, 0, -2.4, 1.23);
  box(2.3, 0.43, 1.3, 'chalk', 0, 4.94, -2.4);
  roof(3.6, 2.05, 5.13, 0, -2.4, 0.72);
  // A small front portico echoes the large roof without hiding its silhouette.
  for (const x of [-0.82, 0.82]) box(0.14, 2.5, 0.14, 'wood', x, 2.45, -0.48);
  roof(2.45, 1.65, 3.42, 0, -0.65, 0.65);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++)
      box(0.075, 0.7, 0.075, 'wood', side * (1.08 + i * 0.29), 1.62, -0.61);
    box(1.72, 0.095, 0.15, 'rose', side * 1.8, 1.98, -0.61);
    box(1.72, 0.07, 0.12, 'wood', side * 1.8, 1.42, -0.61);
  }
  for (let i = 0; i < 4; i++)
    box(1.58, 0.17, 0.39, 'wood', 0, 0.76 + i * 0.17, 0.7 - i * 0.32);
  for (let i = 0; i < 9; i++) {
    const x = -0.85 + i * 0.21;
    ball(
      0.063,
      'gold',
      x,
      3.09 - Math.sin((i / 8) * Math.PI) * 0.18,
      -0.04,
      1.4,
      0.8,
      0.8,
    );
  }
  for (const x of [-0.57, 0.57]) {
    box(0.12, 0.24, 0.025, 'chalk', x, 2.8, -0.04, 0.2);
    box(0.12, 0.18, 0.025, 'chalk', x + 0.06, 2.62, -0.04, -0.25);
  }
  beam([0, 3.03, -0.02], [0, 1.6, -0.02], 0.035, 'gold');
  cylinder(0.15, 0.18, 'gold', 0, 2.98, -0.02, 0.08);
  ball(0.09, 'rose', 0, 1.62, -0.02);
  box(0.75, 0.48, 0.5, 'wood', 0, 1.47, 0.12);
  box(0.85, 0.07, 0.57, 'gold', 0, 1.74, 0.12);
  for (let i = 0; i < 5; i++)
    box(0.04, 0.015, 0.48, 'dark', -0.29 + i * 0.145, 1.785, 0.12);
  // Torii in the foreground, with bowed lintel tips and stone shoes.
  for (const x of [-1.34, 1.34]) {
    cylinder(0.23, 0.23, 'stone', x, 0.28, 3.55);
    cylinder(0.145, 2.8, 'wood', x, 1.77, 3.55, 0.12);
    cylinder(0.17, 0.23, 'dark', x, 0.52, 3.55);
  }
  box(3.22, 0.19, 0.24, 'rose', 0, 2.75, 3.55);
  box(3.8, 0.22, 0.38, 'wood', 0, 3.2, 3.55);
  box(3.85, 0.08, 0.44, 'roof', 0, 3.35, 3.55);
  for (const side of [-1, 1]) {
    beam(
      [side * 1.64, 3.3, 3.55],
      [side * 2.02, 3.45, 3.55],
      0.105,
      'roof',
      0.08,
    );
    box(0.1, 0.38, 0.18, 'wood', side * 0.63, 3.0, 3.55);
  }
  box(0.38, 0.53, 0.12, 'gold', 0, 3.0, 3.79);
  box(0.29, 0.4, 0.025, 'chalk', 0, 3.0, 3.86);
  // Stone lantern pairs keep the processional axis legible.
  function lantern(x: number, z: number, scale = 1) {
    cylinder(0.36 * scale, 0.14 * scale, 'stone', x, 0.23, z);
    cylinder(0.21 * scale, 0.17 * scale, 'chalk', x, 0.37, z);
    cylinder(0.12 * scale, 0.7 * scale, 'stone', x, 0.72, z, 0.17 * scale);
    box(0.52 * scale, 0.12 * scale, 0.52 * scale, 'chalk', x, 1.1, z);
    box(0.32 * scale, 0.4 * scale, 0.32 * scale, 'gold', x, 1.35, z);
    for (const dx of [-0.2, 0.2])
      for (const dz of [-0.2, 0.2])
        box(0.07, 0.43, 0.07, 'stone', x + dx * scale, 1.35, z + dz * scale);
    part(
      new THREE.ConeGeometry(0.5 * scale, 0.28 * scale, 4),
      'roofLight',
      x,
      1.7,
      z,
      0,
      Math.PI / 4,
    );
    ball(0.1 * scale, 'stone', x, 1.92, z);
  }
  for (const x of [-1.9, 1.9]) for (const z of [1.5, 4.45]) lantern(x, z);
  // Quiet perimeter fence, stepped at the terrace.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const z = -4.7 + i * 0.95;
      box(0.14, 0.75, 0.14, 'wood', side * 5.45, 0.56, z);
      box(0.23, 0.08, 0.23, 'chalk', side * 5.45, 0.96, z);
    }
    for (const y of [0.43, 0.83])
      box(0.1, 0.09, 9, 'rose', side * 5.45, y, -0.25);
  }
  for (let i = 0; i < 15; i++)
    box(0.12, 0.7, 0.12, 'wood', -5.4 + i * 0.77, 0.6, -5.0);
  box(10.9, 0.1, 0.1, 'rose', 0, 0.89, -5.0);
  // Deterministic blossoms: faceted cloud clusters, branches visible between layers.
  let seed = 731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function tree(x: number, z: number, s: number) {
    cylinder(0.5 * s, 0.13, 'stone', x, 0.24, z, 0.46 * s);
    beam([x, 0.26, z], [x - 0.14 * s, 2.6 * s, z], 0.18 * s, 'wood', 0.1 * s);
    const clusters = [
      [-0.96, 2.95, 0.02],
      [0.83, 3.26, 0.12],
      [-0.24, 3.94, -0.06],
      [0.1, 3.25, 0.72],
      [-0.24, 3.45, -0.75],
    ];
    for (const [dx, dy, dz] of clusters) {
      beam(
        [x - 0.1 * s, 1.65 * s, z],
        [x + dx! * s, dy! * s, z + dz! * s],
        0.095 * s,
        'wood',
        0.03 * s,
      );
      for (let i = 0; i < 5; i++)
        ball(
          (0.6 + random() * 0.22) * s,
          i % 3 === 0 ? 'light' : i % 3 === 1 ? 'blush' : 'rose',
          x + (dx! + (random() - 0.5) * 0.87) * s,
          (dy! + (random() - 0.5) * 0.48) * s,
          z + (dz! + (random() - 0.5) * 0.8) * s,
          1.12,
          0.83,
          1,
        );
    }
  }
  tree(-4, -2.05, 1.13);
  tree(4.1, -2.35, 1.05);
  tree(-4.23, 2.3, 0.8);
  // A small purification pavilion and still water bowl, separate from the main shrine.
  for (const x of [3.08, 4.5])
    for (const z of [1.45, 2.62]) box(0.1, 1.8, 0.1, 'wood', x, 1.1, z);
  roof(2.15, 1.85, 2.0, 3.79, 2.03, 0.52);
  box(1.34, 0.38, 0.76, 'stone', 3.79, 0.58, 2.04);
  box(1.1, 0.035, 0.55, 'water', 3.79, 0.79, 2.04);
  for (const dx of [-0.64, 0.64])
    box(0.13, 0.13, 0.85, 'chalk', 3.79 + dx, 0.82, 2.04);
  for (const dz of [-0.38, 0.38])
    box(1.34, 0.13, 0.13, 'chalk', 3.79, 0.82, 2.04 + dz);
  beam([3.34, 0.97, 1.8], [4.13, 0.97, 2.27], 0.035, 'gold');
  cylinder(0.09, 0.06, 'gold', 4.13, 1, 2.27);
  // Ema wishing plaques and a little bench.
  for (const x of [2.75, 4.45]) box(0.1, 1.2, 0.1, 'wood', x, 0.83, -0.12);
  box(1.9, 0.12, 0.14, 'rose', 3.6, 1.44, -0.12);
  for (let i = 0; i < 5; i++) {
    beam(
      [2.95 + i * 0.32, 1.43, -0.12],
      [2.95 + i * 0.32, 1.27, -0.12],
      0.012,
      'gold',
    );
    box(
      0.24,
      0.27,
      0.055,
      i % 2 ? 'blush' : 'chalk',
      2.95 + i * 0.32,
      1.14,
      -0.12,
    );
    box(0.07, 0.07, 0.06, 'rose', 2.95 + i * 0.32, 1.17, -0.085);
  }
  for (const x of [-3.9, -2.7]) box(0.12, 0.37, 0.38, 'wood', x, 0.38, 4.45);
  box(1.65, 0.12, 0.57, 'rose', -3.3, 0.62, 4.45);
  // Rock gardens, clipped azaleas, moss cushions and scattered fallen petals.
  for (const [x, z] of [
    [-2.9, -4.5],
    [3.2, -4.6],
    [-3.15, 0.5],
    [4.55, 3.8],
    [-4.65, 4.45],
    [2.8, 4.7],
  ]) {
    ball(0.57, 'leaf', x!, 0.38, z!, 1.3, 0.6, 1);
    ball(0.38, 'leafLight', x! + 0.37, 0.35, z! + 0.3, 1, 0.65, 1);
    ball(0.33, 'stone', x! - 0.4, 0.3, z! + 0.3, 1, 0.8, 1);
    for (let i = 0; i < 6; i++)
      ball(
        0.11,
        i % 2 ? 'rose' : 'light',
        x! + (random() - 0.5),
        0.59,
        z! + (random() - 0.5) * 0.55,
      );
  }
  for (let i = 0; i < 145; i++) {
    const x = (random() - 0.5) * 10.2,
      z = (random() - 0.5) * 10;
    if (z < 0.6 && Math.abs(x) < 2.8) continue;
    part(
      new THREE.CircleGeometry(0.025 + random() * 0.035, 5),
      i % 3 ? 'blush' : 'rose',
      x,
      z < 0.3 && Math.abs(x) < 4.4 ? 0.765 : 0.18,
      z,
      -Math.PI / 2,
      0,
      random() * 6.28,
    );
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('Unable to build garden geometry');
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

const focus = new THREE.Vector3(0, 0.5, 0);

function fitWelcomeCamera(camera: THREE.PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  // Keep the complete plinth in frame, with breathing room on portrait displays.
  camera.fov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(THREE.MathUtils.degToRad(36) / 2) * Math.max(1, 1.25 / aspect),
      ),
  );
  camera.updateProjectionMatrix();
}

export function createWelcomeCamera(aspect = 1) {
  const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 100);
  camera.position.set(13.8, 11.4, 18.8);
  camera.lookAt(focus);
  fitWelcomeCamera(camera, aspect);
  camera.updateMatrixWorld();
  return camera;
}

export function mountWelcomeWorld(
  host: HTMLElement,
  unavailable: () => void,
): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = host.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'low-power',
  });
  let disposed = false,
    lost = false,
    frame = 0,
    last = 0,
    time = 0,
    slowFrames = 0;
  const scene = new THREE.Scene();
  const camera = createWelcomeCamera();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(focus);
  controls.enablePan = false;
  controls.minDistance = 15;
  controls.maxDistance = 36;
  controls.minPolarAngle = Math.PI * 0.17;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.enableDamping = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5),
  );
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    reducedMotion.removeEventListener('change', motion);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    controls.removeEventListener('change', requestRender);
    controls.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    sun.shadow.map?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  const sun = new THREE.DirectionalLight(0xfff0df, 3.1);
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.normalBias = 0.045;
  sun.shadow.bias = -0.0003;
  scene.add(new THREE.HemisphereLight(0xfff6fa, 0xb8a4bb, 2.5), sun);
  const fill = new THREE.DirectionalLight(0xcad7ff, 1.2);
  fill.position.set(7, 5, -6);
  scene.add(fill);
  const observer = new ResizeObserver(resize);
  const petalGeometry = new THREE.PlaneGeometry(0.085, 0.06);
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2bbd2,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    petalMaterial,
    mobile ? 30 : 55,
  );
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  const dummy = new THREE.Object3D();
  function updatePetals() {
    for (let i = 0; i < petals.count; i++) {
      const phase = i * 2.39996;
      dummy.position.set(
        Math.sin(phase) * 5.5 + Math.sin(time * 0.26 + phase) * 0.5,
        0.4 + ((((i * 0.431 - time * 0.23) % 5) + 5) % 5),
        Math.cos(phase * 1.7) * 4.8,
      );
      dummy.rotation.set(
        phase + time * 0.5,
        phase * 0.7 + time * 0.3,
        phase + time * 0.15,
      );
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
  }
  function draw(now = 0) {
    frame = 0;
    if (disposed || lost || document.hidden) return;
    if (now - last < 33 && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    if (!reducedMotion.matches) time += Math.min((now - last) / 1000, 0.06);
    last = now;
    updatePetals();
    const start = performance.now();
    renderer.render(scene, camera);
    if (performance.now() - start > 45) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 6) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      petals.count = 20;
      slowFrames = 0;
    }
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  }
  function requestRender() {
    if (!disposed && !lost && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function resize() {
    if (disposed) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    fitWelcomeCamera(camera, w / h);
    requestRender();
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = performance.now();
    if (!document.hidden) requestRender();
  }
  function motion() {
    cancelAnimationFrame(frame);
    frame = 0;
    requestRender();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    unavailable();
  }
  try {
    scene.add(createWelcomeGarden(), petals);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: 0x9a7c9f, opacity: 0.13 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.04;
    ground.receiveShadow = true;
    scene.add(ground);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    controls.update();
    updatePetals();
    resize();
    renderer.render(scene, camera);
    observer.observe(host);
    controls.addEventListener('change', requestRender);
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motion);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    requestRender();
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
