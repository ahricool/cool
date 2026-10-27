import * as THREE from 'three';
import { noiseGlsl, waterColor, waterGlsl } from './landscape';
import { temizuya } from './layout';
import { palette, type SharedUniforms } from './toon';

/** Brim of the stone basin and the water just proud of it. */
const RIM = 0.5;
const SURFACE = RIM + 0.006;
/** Inner half extents of the basin, along x and z. */
const HALF = [0.44, 0.22] as const;
/** Outer face of the basin's front lip, where drops gather and fall. */
const LIP = 0.29;
/** Top of the paved base the drops land on. */
const BASE = 0.083;
/** Where the bamboo spout pours, relative to the pavilion centre. */
const SPOUT: THREE.Vector3Tuple = [-0.3, 0.62, -0.05];
/** Where the pour meets the water. */
const SPLASH: [number, number] = [SPOUT[0] + 0.04, SPOUT[2] + 0.018];
/** Seconds a drop swells on the lip before it lets go. */
const SWELL = 1.2;
/** Seconds it takes to fall to the base, under gravity. */
const FALL = Math.sqrt((2 * (RIM - 0.018 - BASE)) / 9.8);
/** How long a landing ring spreads. */
const RIPPLE = 0.8;

/** Soft vertical streaks; each column runs out of step with its neighbours. */
function streaks() {
  const w = 8,
    h = 32;
  const data = new Uint8Array(w * h * 4);
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      const v = 0.5 + 0.5 * Math.sin((y / h) * Math.PI * 2 * 2 + x * 2.3);
      const light = 205 + Math.round(Math.pow(v, 6) * 50);
      data.set([light, light, light, 255], (y * w + x) * 4);
    }
  const texture = new THREE.DataTexture(data, w, h);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A ribbon swept along a side profile (z, y) and `width` wide in x; v runs
 * down the profile so a scrolling texture reads as water flowing over it.
 */
function ribbon(profile: [number, number][], width: number) {
  const positions: number[] = [],
    uvs: number[] = [],
    index: number[] = [];
  let along = 0;
  profile.forEach(([z, y], i) => {
    if (i) {
      const [pz, py] = profile[i - 1]!;
      along += Math.hypot(z - pz, y - py);
    }
    positions.push(-width / 2, y, z, width / 2, y, z);
    uvs.push(0, along, 1, along);
    if (i) {
      const a = (i - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The brook's cel water on the basin: pale rim, deeper middle, rings drifting out from the pour. */
function surfaceMaterial(shared: SharedUniforms, ramp: THREE.Texture) {
  const material = new THREE.MeshToonMaterial({
    name: 'basin-surface',
    color: waterColor,
    gradientMap: ramp,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.flowTime = shared.time;
    shader.vertexShader =
      `varying vec2 vBasin;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      vBasin = position.xz;`,
      );
    shader.fragmentShader =
      `uniform float flowTime;\nvarying vec2 vBasin;\n${noiseGlsl}\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      // Distance in from the nearest edge, against the narrow half width.
      vec2 edge = vec2(${HALF[0]}, ${HALF[1]}) - abs(vBasin);
      float across = 1.0 - min(edge.x, edge.y) / ${HALF[1]};
      vec2 out_ = vBasin - vec2(${SPLASH[0]}, ${SPLASH[1]});
      float streak = hazeNoise(vec2(length(out_) * 9.0 - flowTime * 0.8,
        dot(normalize(out_ + 1e-4), vec2(1.7, 2.3)) * 1.5));
      ${waterGlsl}`,
      );
  };
  material.customProgramCacheKey = () => 'basin-surface';
  return material;
}

/**
 * Water at the purification basin: filled to the brim and shaded like the
 * brook, the spout's pour, and now and then a drop slipping off the lip.
 */
export function createBasinWater(shared: SharedUniforms, ramp: THREE.Texture) {
  const root = new THREE.Group();
  root.name = 'basin-water';
  root.position.set(temizuya.x, 0, temizuya.z);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF[0] * 2, HALF[1] * 2).rotateX(-Math.PI / 2),
    surfaceMaterial(shared, ramp),
  );
  surface.position.y = SURFACE;

  // The pour from the bamboo spout: two crossed ribbons so it has body
  // from every side, bowing slightly as it falls.
  const flowMap = streaks();
  const pouring = new THREE.MeshToonMaterial({
    name: 'basin-pour',
    color: waterColor,
    gradientMap: ramp,
    map: flowMap,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pour = new THREE.Group();
  const fall = ribbon(
    [
      [0, SPOUT[1] - 0.02],
      [0.012, SPOUT[1] - 0.06],
      [0.018, SURFACE],
    ],
    0.02,
  );
  for (const turn of [0, Math.PI / 2]) {
    const strand = new THREE.Mesh(fall, pouring);
    strand.rotation.y = turn;
    pour.add(strand);
  }
  pour.position.set(SPOUT[0] + 0.04, 0, SPOUT[2]);

  // A damp patch on the base where the drops land.
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
    new THREE.MeshToonMaterial({
      name: 'basin-puddle',
      color: waterColor,
      gradientMap: ramp,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  puddle.position.set(-0.04, BASE - 0.0015, LIP + 0.04);
  puddle.scale.set(0.26, 1, 0.07);

  const ring = (x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        name: 'basin-ring',
        color: palette.white,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.set(x, y, z);
    return mesh;
  };
  // Rings spreading steadily where the pour lands.
  const splashes = [0, 0.5].map((phase) => ({
    mesh: ring(SPLASH[0], SURFACE + 0.002, SPLASH[1]),
    phase,
  }));

  // Drops gather on the lip at their own unhurried pace, fall and ring out.
  const drop = new THREE.IcosahedronGeometry(0.013, 1);
  const beading = new THREE.MeshToonMaterial({
    name: 'basin-drop',
    color: new THREE.Color(waterColor).lerp(new THREE.Color(0xdbf7ff), 0.35),
    gradientMap: ramp,
  });
  const drips = [
    { x: 0.12, period: 2.7, offset: 0 },
    { x: -0.2, period: 3.9, offset: 1.6 },
  ].map(({ x, period, offset }) => {
    const bead = new THREE.Mesh(drop, beading);
    return {
      x,
      period,
      offset,
      bead,
      landing: ring(x, BASE + 0.002, LIP + 0.01),
    };
  });

  root.add(
    surface,
    pour,
    puddle,
    ...splashes.map(({ mesh }) => mesh),
    ...drips.flatMap(({ bead, landing }) => [bead, landing]),
  );
  return {
    root,
    update(time: number) {
      flowMap.offset.y = -time * 1.6;
      for (const { mesh, phase } of splashes) {
        const t = (time * 0.9 + phase) % 1;
        mesh.scale.setScalar(0.09 * (0.15 + t));
        (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.55;
      }
      for (const { x, period, offset, bead, landing } of drips) {
        const local = (time + offset) % period;
        const falling = local - SWELL;
        bead.visible = falling < FALL;
        if (falling < 0) {
          // Swelling on the lip, sagging as it fills.
          const grow = local / SWELL;
          bead.position.set(x, RIM - 0.008 - grow * 0.01, LIP);
          bead.scale.set(grow, grow * (1 + grow * 0.3), grow);
        } else if (falling < FALL) {
          bead.position.set(
            x,
            RIM - 0.018 - 4.9 * falling * falling,
            LIP + falling * 0.03,
          );
          bead.scale.set(0.85, 1.5, 0.85);
        }
        const ripple = (falling - FALL) / RIPPLE;
        landing.visible = ripple >= 0 && ripple < 1;
        if (landing.visible) {
          landing.scale.setScalar(0.07 * (0.2 + ripple));
          (landing.material as THREE.MeshBasicMaterial).opacity =
            (1 - ripple) * 0.6;
        }
      }
    },
  };
}
