import * as THREE from 'three';
import { createBasinWater } from './basin';
import {
  bellRope,
  canopy,
  emaRack,
  groundAt,
  hall,
  isLawn,
  mound,
  office,
  sakuraTrees,
  storehouse,
  torii,
} from './layout';
import { palette, seeded, ToonBuilder, type SharedUniforms } from './toon';

/** Hanging paper, prayer plaques, the bell rope and festival lanterns. */
function buildDangling(shared: SharedUniforms, ramp: THREE.Texture) {
  const b = new ToonBuilder();
  const random = seeded(4242);
  const shide = (x: number, y: number, z: number, ry = 0) => {
    const dangle: [number, number, number, number] = [x, y, z, random() * 6];
    for (let i = 0; i < 4; i++)
      b.box(
        0.075,
        0.1,
        0.012,
        'white',
        x + (i % 2 ? 0.028 : -0.028) * Math.cos(ry),
        y - 0.06 - i * 0.085,
        z + (i % 2 ? -0.028 : 0.028) * Math.sin(ry),
        {
          rotation: [0, ry, (i % 2 ? -1 : 1) * 0.12],
          dangle,
          outline: i === 0,
        },
      );
  };
  for (const t of [-0.62, -0.22, 0.22, 0.62]) {
    const sag = 0.17 * (1 - t * t);
    shide(hall.x + t * canopy.half, canopy.top - 0.43 - sag, canopy.z + 0.09);
  }
  // A slim shimenawa across the torii with its own shide.
  for (const t of [-0.5, 0, 0.5])
    shide(
      t * torii.half,
      torii.height - 0.86 + Math.abs(t) * 0.05,
      torii.z + 0.1,
    );

  // Red-and-white bell rope with a tassel.
  const ropeHook: [number, number, number, number] = [
    bellRope.x,
    bellRope.top,
    bellRope.z,
    1.3,
  ];
  const segments = 9;
  const span = (bellRope.top - bellRope.bottom) / segments;
  for (let i = 0; i < segments; i++)
    b.cylinder(
      0.04,
      0.04,
      span + 0.005,
      i % 2 ? 'white' : 'red',
      bellRope.x,
      bellRope.top - span * (i + 0.5),
      bellRope.z,
      8,
      { dangle: ropeHook, rotation: [0, i * 0.6, 0] },
    );
  b.cylinder(
    0.07,
    0.03,
    0.16,
    'red',
    bellRope.x,
    bellRope.bottom - 0.08,
    bellRope.z,
    8,
    { dangle: ropeHook },
  );

  // Ema plaques, each on its own hook.
  for (const [y, count] of [
    [1.18, 8],
    [0.82, 7],
  ] as const)
    for (let i = 0; i < count; i++) {
      const x =
        emaRack.x - 0.66 + (i * 1.32) / (count - 1) + (y < 1 ? 0.08 : 0);
      const z = emaRack.z + 0.06;
      const dangle: [number, number, number, number] = [
        x,
        y - 0.02,
        z,
        random() * 6,
      ];
      const shape = new THREE.Shape([
        new THREE.Vector2(-0.075, -0.06),
        new THREE.Vector2(0.075, -0.06),
        new THREE.Vector2(0.075, 0.03),
        new THREE.Vector2(0, 0.065),
        new THREE.Vector2(-0.075, 0.03),
      ]);
      b.part(
        new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false }),
        'woodLight',
        x,
        y - 0.12,
        z,
        { dangle },
      );
      b.box(
        0.07,
        0.045,
        0.006,
        i % 3 === 0 ? 'red' : i % 3 === 1 ? 'blossomDeep' : 'navy',
        x,
        y - 0.13,
        z + 0.022,
        { dangle, outline: false },
      );
      b.box(0.008, 0.06, 0.008, 'red', x, y - 0.035, z + 0.01, {
        dangle,
        outline: false,
      });
    }

  // Festival paper lanterns under the eaves.
  const chochin = (x: number, y: number, z: number) => {
    const dangle: [number, number, number, number] = [
      x,
      y + 0.24,
      z,
      random() * 6,
    ];
    b.ball(0.13, 'lantern', x, y, z, [1, 1.3, 1], { dangle }, 2);
    for (const dy of [-0.16, 0.16])
      b.cylinder(0.075, 0.075, 0.04, 'roofEdge', x, y + dy, z, 10, {
        dangle,
        outline: false,
      });
    b.box(0.012, 0.08, 0.012, 'roofEdge', x, y + 0.21, z, {
      dangle,
      outline: false,
    });
    for (let i = -1; i <= 1; i++)
      b.cylinder(0.131, 0.131, 0.012, 'redDark', x, y + i * 0.07, z, 12, {
        dangle,
        outline: false,
        scale: [1, 1, 1],
      });
  };
  chochin(hall.x - 1.62, canopy.top - 0.42, canopy.z - 0.2);
  chochin(hall.x + 1.62, canopy.top - 0.42, canopy.z - 0.2);
  chochin(
    office.x + 0.72,
    office.base + 1.55,
    office.z + office.depth / 2 + 0.16,
  );
  chochin(storehouse.x + 0.42, 1.38, storehouse.z + 0.95);

  // Glass wind chime with its paper tanzaku.
  const chime: [number, number, number, number] = [
    office.x - 0.65,
    office.base + 1.66,
    office.z + office.depth / 2 + 0.16,
    2.2,
  ];
  b.ball(
    0.06,
    'water',
    chime[0],
    chime[1] - 0.07,
    chime[2],
    [1, 0.9, 1],
    { dangle: chime },
    2,
  );
  b.box(
    0.04,
    0.16,
    0.006,
    'blossomLight',
    chime[0],
    chime[1] - 0.22,
    chime[2],
    { dangle: chime, outline: false },
  );

  const root = b.build(shared, ramp);
  root.name = 'dangling';
  root.traverse((object) => {
    object.castShadow = false;
  });
  return root;
}

/** Instanced tufts that ripple with the breeze. */
function buildGrass(
  shared: SharedUniforms,
  ramp: THREE.Texture,
  count: number,
) {
  const blades: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.BufferGeometry();
    const lean = (k - 1) * 0.04;
    blade.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-0.028, 0, 0, 0.028, 0, 0, lean, 0.17 - k * 0.02, 0.01],
        3,
      ),
    );
    blade.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3),
    );
    blade.rotateY((k * Math.PI) / 3);
    blades.push(blade);
  }
  const positions: number[] = [];
  const normals: number[] = [];
  for (const blade of blades) {
    positions.push(...blade.getAttribute('position').array);
    normals.push(...blade.getAttribute('normal').array);
    blade.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const material = new THREE.MeshToonMaterial({
    gradientMap: ramp,
    side: THREE.DoubleSide,
  });
  material.name = 'grass-tufts';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = shared.time;
    shader.vertexShader = `uniform float time;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec2 root = instanceMatrix[3].xz;
      float bend = position.y / 0.17;
      transformed.x += sin(time * 1.9 + root.x * 1.3 + root.y * 0.7) * 0.04 * bend;
      transformed.z += cos(time * 1.6 + root.x * 0.6) * 0.025 * bend;`,
    );
  };
  material.customProgramCacheKey = () => 'welcome-grass';
  const grass = new THREE.InstancedMesh(geometry, material, count);
  grass.name = 'grass';
  // Double-sided tufts sampling a PCF map is fill-rate with almost no silhouette.
  const random = seeded(99);
  const dummy = new THREE.Object3D();
  const tones = [
    palette.grassDeep,
    palette.grass,
    palette.leafLight,
    palette.moss,
  ];
  const color = new THREE.Color();
  let placed = 0;
  for (let attempt = 0; placed < count && attempt < count * 20; attempt++) {
    const x = (random() - 0.5) * 12.4,
      z = (random() - 0.5) * 12.4;
    if (!isLawn(x, z)) continue;
    const onMound = Math.hypot(x - mound.x, z - mound.z) < 1.5;
    const y = onMound
      ? mound.top * (1 - Math.hypot(x - mound.x, z - mound.z) / 1.75) * 0.95
      : groundAt(x, z);
    const s = 0.7 + random() * 0.7;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.set(s, s * (0.8 + random() * 0.5), s);
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    grass.setColorAt(
      placed,
      color.setHex(tones[Math.floor(random() * tones.length)]!),
    );
    placed++;
  }
  grass.count = placed;
  return grass;
}

/** Petals released from the sakura canopies, tumbling down to the ground. */
function buildPetals(count: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.04);
  shape.quadraticCurveTo(0.04, -0.01, 0.02, 0.035);
  shape.lineTo(0, 0.02);
  shape.lineTo(-0.02, 0.035);
  shape.quadraticCurveTo(-0.04, -0.01, 0, -0.04);
  const petals = new THREE.InstancedMesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshLambertMaterial({
      color: palette.blossom,
      side: THREE.DoubleSide,
      emissive: palette.blossomLight,
      emissiveIntensity: 0.25,
    }),
    count,
  );
  petals.name = 'falling-petals';
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  const dummy = new THREE.Object3D();
  return {
    petals,
    update(time: number) {
      for (let i = 0; i < count; i++) {
        const tree = sakuraTrees[i % 3 === 0 ? 1 : 0]!;
        const seed = i * 12.9898;
        const period = 9 + (i % 7) * 1.3;
        const progress = (((time / period + ((i * 0.618) % 1)) % 1) + 1) % 1;
        const angle = seed % (Math.PI * 2);
        const reach = (0.4 + ((i * 0.37) % 1) * 1.1) * tree.scale;
        const startY = tree.y + (2.1 + ((i * 0.53) % 1) * 0.8) * tree.scale;
        const x =
          tree.x +
          Math.cos(angle) * reach +
          progress * 1.6 +
          Math.sin(time * 0.8 + seed) * 0.25;
        const z =
          tree.z +
          Math.sin(angle) * reach +
          progress * 0.9 +
          Math.cos(time * 0.6 + seed) * 0.2;
        const ground =
          Math.abs(x) < 6.2 && Math.abs(z) < 6.2 ? groundAt(x, z) + 0.03 : -8;
        const y = Math.max(ground, startY - progress * (startY - ground + 0.2));
        const fade = Math.min(1, progress * 12, (1 - progress) * 10);
        dummy.position.set(x, y, z);
        dummy.rotation.set(
          time * 1.3 + seed,
          time * 0.9 + i,
          time * 0.7 + seed * 0.5,
        );
        dummy.scale.setScalar(fade);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Faint drifting spirit lights: barely there by day, gentle fireflies at night. */
function buildMotes(shared: SharedUniforms, count: number) {
  const random = seeded(31);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 10;
    positions[i * 3 + 1] = 0.5 + random() * 3.2;
    positions[i * 3 + 2] = (random() - 0.55) * 10;
    seeds[i] = random() * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    time: shared.time,
    strength: { value: 0.4 },
    scale: { value: 1 },
  };
  const motes = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      name: 'motes',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float time;
        uniform float scale;
        varying float twinkle;
        void main() {
          vec3 p = position;
          p.x += sin(time * 0.21 + seed) * 0.6;
          p.y += sin(time * 0.33 + seed * 1.7) * 0.35;
          p.z += cos(time * 0.17 + seed * 0.9) * 0.6;
          twinkle = 0.55 + 0.45 * sin(time * 1.3 + seed * 3.1);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = scale * 34.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float strength;
        varying float twinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.93, 0.7) * a * a * strength * twinkle, 1.0);
        }`,
    }),
  );
  motes.name = 'motes';
  motes.frustumCulled = false;
  return { motes, uniforms };
}

export function createGardenLife(
  shared: SharedUniforms,
  ramp: THREE.Texture,
  mobile: boolean,
) {
  const root = new THREE.Group();
  root.name = 'welcome-life';
  const falling = buildPetals(mobile ? 18 : 36);
  const { motes, uniforms } = buildMotes(shared, mobile ? 26 : 48);
  const basin = createBasinWater(shared, ramp);
  root.add(
    buildDangling(shared, ramp),
    buildGrass(shared, ramp, mobile ? 260 : 520),
    falling.petals,
    motes,
    basin.root,
  );
  return {
    root,
    setMotes(strength: number, pixelRatio: number) {
      uniforms.strength.value = strength;
      uniforms.scale.value = pixelRatio;
    },
    update(time: number) {
      falling.update(time);
      basin.update(time);
    },
  };
}
