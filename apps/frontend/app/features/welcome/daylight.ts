import * as THREE from 'three';
import { lanterns } from './layout';

export const normalizeHour = (hour: number) =>
  Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 10.5;

const color = (hex: number) => new THREE.Color(hex);

const overcast = color(0x9aa6b8);

/**
 * Periodic solar cycle tuned for cel shading: lit faces stay near their painted
 * colour, shade comes from a cool sky light, and night is a readable blue.
 * `wet` (0 to 1) veils it for light rain: a dimmer sun and a greyer sky.
 */
export function daylightAt(hour: number, wet = 0) {
  const angle = ((normalizeHour(hour) - 6) / 24) * Math.PI * 2;
  const altitude = Math.sin(angle);
  const day = THREE.MathUtils.smoothstep(altitude, -0.12, 0.3);
  const noon = THREE.MathUtils.smoothstep(altitude, 0.05, 0.75);
  const twilight = (1 - noon) * day;
  // Peaks at sunrise and sunset so dusk gets its own colours instead of grey midpoints.
  const dusk = Math.min(1, twilight * 3.2);
  const veil = wet * day;
  return {
    day,
    sunPosition: new THREE.Vector3(
      -Math.cos(angle) * 13,
      Math.max(0.5, altitude * 15),
      7,
    ),
    sunColor: color(0xffa463).lerp(color(0xfff3de), noon),
    sunIntensity: day * (1.15 + noon * 0.5) * (1 - wet * 0.5),
    skyColor: color(0x7086cf)
      .lerp(color(0xc3d3ff), day)
      .lerp(color(0xf2b9cf), dusk * 0.8)
      .lerp(overcast, veil * 0.3),
    groundColor: color(0x403c6a).lerp(color(0xd9c4b3), day),
    ambientIntensity: 1.15 + day * 0.4,
    moonIntensity: (1 - day) * 0.75,
    lampIntensity: (1 - day) * 2.4,
    // Three bands: pale blue zenith, warm cream horizon, a pink mist at ground level.
    skyTop: color(0x0f1a3e)
      .lerp(color(0x74c0f0), day)
      .lerp(color(0x6d76d0), dusk * 0.75)
      .lerp(overcast, veil * 0.55),
    skyHorizon: color(0x2b3c78)
      .lerp(color(0xf8e8cc), day)
      .lerp(color(0xffa58c), dusk)
      .lerp(color(0xc9d0da), veil * 0.5),
    skyMist: color(0x3a3a72)
      .lerp(color(0xffd8e2), day)
      .lerp(color(0xff9fb0), dusk * 0.85)
      .lerp(color(0xc8c6d2), veil * 0.6),
    /** Faint self-light on blossoms once the sun is down. */
    blossomGlow: (1 - day) * 0.24,
    haze: dusk * (1 - wet * 0.6),
    stars: (1 - THREE.MathUtils.smoothstep(altitude, -0.3, 0.02)) * (1 - wet),
    ink: 0.55 + day * 0.45,
    motes: 0.35 + (1 - day) * 0.65,
  };
}
export type Daylight = ReturnType<typeof daylightAt>;

/** Rebuild the depth map after the sun has travelled this far, in scene units. */
const shadowMove = 0.08 ** 2;

export function createDaylight(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  shadowMapSize = 1024,
) {
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 0.5,
    far: 55,
  });
  sun.shadow.normalBias = 0.03;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 2;
  const sky = new THREE.HemisphereLight();
  const moon = new THREE.DirectionalLight(0x9db8ff, 0);
  moon.position.set(6, 10, -5);
  /** Stone lantern light at full night: a soft glow, not a floodlight. */
  const lampStrength = 0.55;
  const lamps = lanterns.map(({ x, y, z }) => {
    const light = new THREE.PointLight(0xffb45e, 0, 3.6, 1.6);
    light.position.set(x, y, z);
    return light;
  });
  scene.add(sun, sky, moon, ...lamps);
  let state = daylightAt(10.5);
  const lastShadowSun = new THREE.Vector3();
  let lastCast = true;
  let shadowReady = false;
  return {
    get state() {
      return state;
    },
    setHour(hour: number, wet = 0) {
      state = daylightAt(hour, wet);
      sun.position.copy(state.sunPosition);
      sun.color.copy(state.sunColor);
      sun.intensity = state.sunIntensity;
      sun.visible = state.sunIntensity > 0.02;
      sun.castShadow = sun.visible && state.day > 0.04;
      sky.color.copy(state.skyColor);
      sky.groundColor.copy(state.groundColor);
      sky.intensity = state.ambientIntensity;
      moon.intensity = state.moonIntensity;
      moon.visible = state.moonIntensity > 0.02;
      const lamplit = state.lampIntensity > 0.02;
      lamps.forEach((light) => {
        light.intensity = state.lampIntensity * lampStrength;
        // Hidden lights drop out of the toon shader. Daytime otherwise pays for
        // four point lights on every fragment of the meadow.
        light.visible = lamplit;
      });
      const sunMoved =
        !shadowReady ||
        lastShadowSun.distanceToSquared(sun.position) > shadowMove;
      if (sunMoved || sun.castShadow !== lastCast) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowSun.copy(sun.position);
        lastCast = sun.castShadow;
        shadowReady = true;
      }
    },
    /** Candle-like flicker for the lantern lights. */
    flicker(time: number) {
      if (!lamps[0]?.visible) return;
      lamps.forEach((light, i) => {
        light.intensity =
          state.lampIntensity *
          lampStrength *
          (0.9 +
            Math.sin(time * 7.3 + i * 2.1) * 0.05 +
            Math.sin(time * 13.7 + i) * 0.05);
      });
    },
    dispose() {
      sun.shadow.map?.dispose();
    },
  };
}
