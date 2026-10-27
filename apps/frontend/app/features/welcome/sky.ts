import * as THREE from 'three';
import type { Daylight } from './daylight';
import { seeded, ToonBuilder, type SharedUniforms } from './toon';

/**
 * The sun and moon cross the backdrop the default camera looks at: up from
 * behind the left ridges, low over the hall, down behind the right ridges,
 * moving left to right like the sunlight. `back` points away from the
 * camera across the plinth and `right` along the screen.
 */
const back = new THREE.Vector3(-0.58, 0, -0.81);
const right = new THREE.Vector3(0.81, 0, -0.58);
/** Half the sweep either side of the hall, and the highest climb, in radians. */
const SWEEP = 0.95;
const CLIMB = 0.3;
function skyPath(arc: number, target: THREE.Vector3) {
  const across = (arc - 0.5) * SWEEP * 2;
  const up = Math.sin(arc * Math.PI) * CLIMB;
  return target
    .copy(back)
    .multiplyScalar(Math.cos(across))
    .addScaledVector(right, Math.sin(across))
    .multiplyScalar(Math.cos(up))
    .setY(Math.sin(up))
    .normalize();
}
const clearCloud = new THREE.Color(0xffffff);
const rainCloud = new THREE.Color(0x9ea7b6);

/** Three-band dome with moon and stars, and slow high clouds. */
export function createSky(
  shared: SharedUniforms,
  ramp: THREE.Texture,
  mobile: boolean,
) {
  const root = new THREE.Group();
  root.name = 'welcome-sky';
  const uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    mist: { value: new THREE.Color() },
    sun: { value: new THREE.Vector3(0, 1, 0) },
    moon: { value: new THREE.Vector3(0, 1, 0) },
    /** How much of each disc shows: 0 below the horizon or behind rain. */
    sunShown: { value: 0 },
    moonShown: { value: 0 },
    haze: { value: 0 },
    night: { value: 0 },
    time: shared.time,
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 16),
    new THREE.ShaderMaterial({
      name: 'sky',
      side: THREE.BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 direction;
        void main() {
          direction = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 mist;
        uniform vec3 sun;
        uniform vec3 moon;
        uniform float sunShown;
        uniform float moonShown;
        uniform float haze;
        uniform float night;
        uniform float time;
        varying vec3 direction;
        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        void main() {
          vec3 d = normalize(direction);
          float h = d.y;
          // Zenith blue to a warm cream horizon, then a pink mist on the ground.
          vec3 color = mix(horizon, top, smoothstep(0.06, 0.6, h));
          color = mix(mist, color, smoothstep(-0.03, 0.1, h));
          // Warm sky round the sun, lingering a while after it sets.
          float s = dot(d, sun);
          float glow = pow(max(s, 0.0), 6.0) * smoothstep(-0.12, 0.04, sun.y);
          color += vec3(1.0, 0.72, 0.5) * glow * (0.12 + haze * 0.35);
          // The sun's disc, a little larger than the moon's, warmer when low.
          vec3 sunTint = mix(vec3(1.0, 0.66, 0.4), vec3(1.0, 0.93, 0.7),
            smoothstep(0.03, 0.22, sun.y));
          float sunDisc = smoothstep(0.99972, 0.9998, s);
          float sunHalo = pow(max(s, 0.0), 900.0) * 0.35;
          color = mix(color, sunTint, sunDisc * sunShown);
          color += sunTint * sunHalo * sunShown;
          if (night > 0.001) {
            // Stars live on the dome itself, so ridges and clouds always hide them.
            vec3 p = d * 150.0;
            vec3 cell = floor(p);
            float n = hash(cell);
            vec3 star = cell + 0.25 + 0.5 * vec3(
              hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1));
            float twinkle = 0.65 + 0.35 * sin(time * (1.5 + n * 2.0) + n * 80.0);
            float lit = step(0.94, n) * smoothstep(0.24, 0.02, length(p - star));
            color += vec3(1.0, 0.96, 0.86) * lit * twinkle * night
              * smoothstep(0.0, 0.1, h);
            // A pale full moon with a soft halo.
            float m = dot(d, moon);
            float disc = smoothstep(0.99978, 0.99986, m);
            float halo = pow(max(m, 0.0), 1500.0) * 0.18 + pow(max(m, 0.0), 120.0) * 0.05;
            color = mix(color, vec3(0.86, 0.82, 0.7), disc * moonShown);
            color += vec3(0.75, 0.8, 1.0) * halo * moonShown;
          }
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  root.add(dome);

  // Toon clouds: soft puffs without ink lines, slowly orbiting the miniature.
  const random = seeded(77);
  const b = new ToonBuilder();
  const puffs = (x: number, y: number, z: number, s: number) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = (0.4 + random() * 0.8) * s;
      b.ball(
        (0.75 + random() * 0.6) * s,
        'cloud',
        x + Math.cos(a) * r * 1.6,
        y + random() * 0.3 * s,
        z + Math.sin(a) * r,
        [1.25, 0.62, 1],
        { outline: false },
        2,
      );
    }
    b.ball(
      1.1 * s,
      'cloud',
      x,
      y + 0.45 * s,
      z,
      [1.3, 0.75, 1.1],
      { outline: false },
      2,
    );
  };
  // A few high clouds drifting above the mountain ridges.
  const count = mobile ? 6 : 10;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + random() * 0.4;
    const r = 50 + random() * 8;
    puffs(
      Math.cos(a) * r,
      14 + random() * 7,
      Math.sin(a) * r,
      1.6 + random() * 1.1,
    );
  }
  const clouds = b.build(shared, ramp, { castShadow: false });
  clouds.name = 'clouds';
  const cloudPaint: THREE.MeshToonMaterial[] = [];
  clouds.traverse((object) => {
    object.castShadow = false;
    object.receiveShadow = false;
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshToonMaterial
    )
      cloudPaint.push(object.material);
  });
  root.add(clouds);

  return {
    root,
    setDaylight(state: Daylight) {
      uniforms.top.value.copy(state.skyTop);
      uniforms.horizon.value.copy(state.skyHorizon);
      uniforms.mist.value.copy(state.skyMist);
      skyPath(state.sunArc, uniforms.sun.value);
      skyPath(state.moonArc, uniforms.moon.value);
      // Each disc rises out from behind the ridges and sinks back into them.
      const shown = (direction: THREE.Vector3) =>
        THREE.MathUtils.smoothstep(direction.y, 0, 0.03) * state.clearSky;
      uniforms.sunShown.value = shown(uniforms.sun.value);
      uniforms.moonShown.value = shown(uniforms.moon.value);
      uniforms.haze.value = state.haze;
      uniforms.night.value = state.stars;
    },
    /** Rain greys the clouds. */
    setWeather(wet: number) {
      for (const material of cloudPaint)
        material.color.copy(clearCloud).lerp(rainCloud, wet);
    },
    update(time: number) {
      clouds.rotation.y = time * 0.006;
      clouds.position.y = Math.sin(time * 0.1) * 0.15;
    },
  };
}
