import * as THREE from 'three';
import { gravel, groundAt, obstacles } from './layout';
import { seeded } from './toon';

/** Drop height range and fall speed, in scene units. */
const CEILING = 13;
const SPEED = 6;

/** Thin light-rain streaks over the plinth, animated entirely in the shader. */
function buildStreaks(count: number) {
  const random = seeded(77);
  // Two vertices per drop share (x, z, phase); `tip` marks the trailing end.
  const drops = new Float32Array(count * 6);
  const tips = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = (random() - 0.5) * 20,
      z = (random() - 0.5) * 20,
      phase = random() * CEILING;
    drops.set([x, z, phase, x, z, phase], i * 6);
    tips[i * 2 + 1] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(drops, 3));
  geometry.setAttribute('tip', new THREE.BufferAttribute(tips, 1));
  const uniforms = {
    time: { value: 0 },
    wet: { value: 0 },
    color: { value: new THREE.Color(0xe4eeff) },
  };
  const streaks = new THREE.LineSegments(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float tip;
        uniform float time;
        varying float vTip;
        void main() {
          vTip = tip;
          float y = mod(position.z - time * ${SPEED.toFixed(1)}, ${CEILING.toFixed(1)}) - 1.0 + tip * 0.32;
          // A light breeze slants the rain towards the viewer's right.
          vec3 world = vec3(position.x - y * 0.07, y, position.y - y * 0.03);
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform float wet;
        varying float vTip;
        void main() {
          gl_FragColor = vec4(color, wet * mix(0.05, 0.42, vTip));
          #include <colorspace_fragment>
        }`,
    }),
  );
  streaks.name = 'rain';
  streaks.frustumCulled = false;
  return { streaks, uniforms };
}

/** Clear of obstacles and roofs: the open courtyard where puddle rings form. */
function rippleSpot(random: () => number) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const x = gravel.minX + random() * (gravel.maxX - gravel.minX),
      z = gravel.minZ + random() * (gravel.maxZ - gravel.minZ);
    if (obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + 0.1))
      return [x, z] as const;
  }
  return [0, 3] as const;
}

/**
 * Light rain: streaks that fade in and out with `setWet`, and now and then a
 * small expanding ring on the courtyard floor.
 */
export function createRain(mobile: boolean) {
  const root = new THREE.Group();
  root.name = 'weather';
  const { streaks, uniforms } = buildStreaks(mobile ? 350 : 700);
  const count = 20;
  const ripples = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.92, 1, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    count,
  );
  ripples.name = 'ripples';
  ripples.frustumCulled = false;
  ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const spots = Array.from({ length: count }, () => ({
    cycle: -1,
    x: 0,
    y: 0,
    z: 0,
  }));
  const dummy = new THREE.Object3D();
  const fade = new THREE.Color();
  root.add(streaks, ripples);
  root.visible = false;
  let wet = 0;

  return {
    root,
    /** 0 dry to 1 raining; the streaks and rings scale with it. */
    setWet(value: number) {
      wet = value;
      uniforms.wet.value = value;
      root.visible = value > 0.001;
    },
    update(time: number) {
      if (!root.visible) return;
      uniforms.time.value = time;
      for (let i = 0; i < count; i++) {
        // Each ring waits a while between drops, so only a few show at once.
        const period = 2.2 + (i % 4) * 0.7;
        const clock = time / period + i * 0.37;
        const cycle = Math.floor(clock);
        const spot = spots[i]!;
        if (spot.cycle !== cycle) {
          const random = seeded(cycle * 31 + i * 7 + 1);
          random(); // The first draw barely moves for small seeds.
          const [x, z] = rippleSpot(random);
          Object.assign(spot, { cycle, x, y: groundAt(x, z) + 0.012, z });
        }
        const t = (clock - cycle) / 0.4;
        const live = t < 1 && wet > 0.4;
        dummy.position.set(spot.x, spot.y, spot.z);
        dummy.scale.setScalar(live ? 0.03 + t * 0.13 : 0);
        dummy.updateMatrix();
        ripples.setMatrixAt(i, dummy.matrix);
        ripples.setColorAt(i, fade.setScalar(live ? (1 - t) * 0.25 * wet : 0));
      }
      ripples.instanceMatrix.needsUpdate = true;
      if (ripples.instanceColor) ripples.instanceColor.needsUpdate = true;
    },
  };
}
