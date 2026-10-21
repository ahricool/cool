import * as THREE from 'three';
import { createEnvironment } from './environment';

export const normalizeHour = (hour: number) =>
  Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 10.5;

/** Periodic solar cycle, with twilight blending into a readable moonlit miniature. */
export function daylightAt(hour: number) {
  const angle = ((normalizeHour(hour) - 6) / 24) * Math.PI * 2;
  const altitude = Math.sin(angle);
  const day = THREE.MathUtils.smoothstep(altitude, -0.12, 0.3);
  const noon = THREE.MathUtils.smoothstep(altitude, 0.05, 0.75);
  const twilight = (1 - noon) * day;
  const background = new THREE.Color(0x182c43)
    .lerp(new THREE.Color(0xe9c9d1), day)
    .lerp(new THREE.Color(0xd8d7e7), noon);
  return {
    day,
    background,
    sunPosition: new THREE.Vector3(
      -Math.cos(angle) * 13,
      Math.max(0.5, altitude * 15),
      7,
    ),
    sunColor: new THREE.Color(0xffb566).lerp(new THREE.Color(0xfff3d5), noon),
    sunIntensity: day * (1.4 + noon * 0.9),
    skyColor: new THREE.Color(0x89b4eb).lerp(new THREE.Color(0xc5e4ff), day),
    ambientIntensity: 0.8 + day * 0.85,
    moonIntensity: (1 - day) * 1.35,
    lampIntensity: (1 - day) * 2.4,
    groundShadowOpacity: 0.23 * day * (0.2 + noon * 0.8),
    exposure: 1.0 + day * 0.08 + twilight * 0.03,
  };
}

export function createDaylight(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  shadowMapSize = 2048,
) {
  const environment = createEnvironment(scene);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 13,
    bottom: -10,
    near: 0.5,
    far: 65,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  const sky = new THREE.HemisphereLight(0xc5e4ff, 0x6d8052, 1.5);
  const moon = new THREE.DirectionalLight(0x96beff, 0);
  moon.position.set(6, 10, -5);
  const lamps: THREE.PointLight[] = [];
  for (const x of [-1.95, 1.95])
    for (const z of [0.95, 5.15]) {
      const light = new THREE.PointLight(0xffb74e, 0, 3.3, 2);
      light.position.set(x, z < 2 ? 2.2 : 1.2, z);
      lamps.push(light);
    }
  scene.add(sun, sky, moon, ...lamps);
  const background = new THREE.Color();
  scene.background = background;
  return {
    setHour(hour: number) {
      const state = daylightAt(hour);
      sun.position.copy(state.sunPosition);
      sun.color.copy(state.sunColor);
      sun.intensity = state.sunIntensity;
      sun.castShadow = state.day > 0.04;
      sky.color.copy(state.skyColor);
      sky.intensity = state.ambientIntensity;
      moon.intensity = state.moonIntensity;
      lamps.forEach((light) => {
        light.intensity = state.lampIntensity;
      });
      background.copy(state.background);
      environment.setDaylight(state.day, background);
      renderer.toneMappingExposure = state.exposure;
      renderer.shadowMap.needsUpdate = true;
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.ShadowMaterial)
            material.opacity = state.groundShadowOpacity;
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.name === 'glow'
          )
            material.emissiveIntensity = state.lampIntensity * 0.65;
        }
      });
    },
    dispose() {
      sun.shadow.map?.dispose();
    },
  };
}
