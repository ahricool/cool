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
/** The bamboo spout, relative to the pavilion centre. */
const SPOUT: THREE.Vector3Tuple = [-0.3, 0.62, -0.05];
/** Mouth of the spout, where its drops gather. */
const MOUTH: THREE.Vector3Tuple = [SPOUT[0] + 0.04, SPOUT[1] - 0.02, SPOUT[2]];
/** Where the spout's drops meet the water. */
const SPLASH: [number, number] = [MOUTH[0], MOUTH[2] + 0.018];
/** How long a landing ring spreads. */
const RIPPLE = 0.8;

/** The brook's cel water on the basin: pale rim, deeper middle, rings drifting out from the drip. */
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
      float streak = hazeNoise(vec2(length(out_) * 9.0 - flowTime * 0.4,
        dot(normalize(out_ + 1e-4), vec2(1.7, 2.3)) * 1.5));
      ${waterGlsl}`,
      );
  };
  material.customProgramCacheKey = () => 'basin-surface';
  return material;
}

/**
 * Water at the purification basin: filled to the brim and shaded like the
 * brook, a steady drip from the spout, and now and then a drop slipping off
 * the lip.
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
  // Drops swell, let go, fall under gravity and ring out where they land:
  // a steady drip from the spout into the water, and now and then one
  // slipping off the lip onto the base.
  const drop = new THREE.IcosahedronGeometry(0.013, 1);
  const beading = new THREE.MeshToonMaterial({
    name: 'basin-drop',
    color: new THREE.Color(waterColor).lerp(new THREE.Color(0xdbf7ff), 0.35),
    gradientMap: ramp,
  });
  const drips = [
    {
      from: MOUTH,
      to: SURFACE,
      drift: 0.018,
      period: 1.1,
      offset: 0,
      swell: 0.75,
      spread: 0.09,
      at: [SPLASH[0], SURFACE + 0.002, SPLASH[1]] as const,
    },
    ...[
      { x: 0.12, period: 2.7, offset: 0 },
      { x: -0.2, period: 3.9, offset: 1.6 },
    ].map(({ x, period, offset }) => ({
      from: [x, RIM - 0.008, LIP] as const,
      to: BASE,
      drift: 0.026,
      period,
      offset,
      swell: 1.2,
      spread: 0.07,
      at: [x, BASE + 0.002, LIP + 0.01] as const,
    })),
  ].map((drip) => ({
    ...drip,
    // Seconds it takes to fall, under gravity.
    fall: Math.sqrt((2 * (drip.from[1] - 0.01 - drip.to)) / 9.8),
    bead: new THREE.Mesh(drop, beading),
    landing: ring(...drip.at),
  }));

  root.add(
    surface,
    puddle,
    ...drips.flatMap(({ bead, landing }) => [bead, landing]),
  );
  return {
    root,
    update(time: number) {
      for (const drip of drips) {
        const { from, drift, period, offset, swell, fall, bead } = drip;
        const local = (time + offset) % period;
        const falling = local - swell;
        bead.visible = falling < fall;
        if (falling < 0) {
          // Swelling where it gathers, sagging as it fills.
          const grow = local / swell;
          bead.position.set(from[0], from[1] - grow * 0.01, from[2]);
          bead.scale.set(grow, grow * (1 + grow * 0.3), grow);
        } else if (falling < fall) {
          bead.position.set(
            from[0],
            from[1] - 0.01 - 4.9 * falling * falling,
            from[2] + (falling / fall) * drift,
          );
          bead.scale.set(0.85, 1.5, 0.85);
        }
        // The ring may outlast the cycle (the spout drips faster than a
        // ring fades), so time it from the last landing, wrapping round.
        const { landing, spread } = drip;
        const ripple = ((falling - fall + period) % period) / RIPPLE;
        landing.visible = ripple >= 0 && ripple < 1;
        if (landing.visible) {
          landing.scale.setScalar(spread * (0.2 + ripple));
          (landing.material as THREE.MeshBasicMaterial).opacity =
            (1 - ripple) * 0.6;
        }
      }
    },
  };
}
