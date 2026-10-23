import * as THREE from 'three';
import type { Daylight } from './daylight';
import { seeded, ToonBuilder, type SharedUniforms } from './toon';

/** Gradient dome, a sea of slow clouds around the floating base, and night stars. */
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
    sun: { value: new THREE.Vector3(0, 1, 0) },
    haze: { value: 0 },
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
        uniform vec3 sun;
        uniform float haze;
        varying vec3 direction;
        void main() {
          float h = direction.y;
          vec3 color = mix(horizon, top, smoothstep(-0.05, 0.62, h));
          // Below the horizon the sky turns into a pale cloud sea.
          color = mix(color, mix(horizon, vec3(1.0), 0.35), smoothstep(0.0, -0.4, h));
          float glow = pow(max(dot(direction, sun), 0.0), 6.0);
          color += vec3(1.0, 0.72, 0.5) * glow * (0.12 + haze * 0.35);
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
  const count = mobile ? 9 : 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + random() * 0.3;
    const low = i % 3 !== 0;
    const r = low ? 15 + random() * 6 : 26 + random() * 8;
    puffs(
      Math.cos(a) * r,
      low ? -4.6 + random() * 2.2 : 1.5 + random() * 5,
      Math.sin(a) * r,
      low ? 0.8 + random() * 0.5 : 1.3 + random(),
    );
  }
  const clouds = b.build(shared, ramp);
  clouds.name = 'clouds';
  clouds.traverse((object) => {
    object.castShadow = false;
    object.receiveShadow = false;
  });
  root.add(clouds);

  const starPositions = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    const theta = random() * Math.PI * 2,
      phi = Math.acos(0.15 + random() * 0.85);
    new THREE.Vector3()
      .setFromSphericalCoords(70, phi, theta)
      .toArray(starPositions, i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(starPositions, 3),
  );
  const starMaterial = new THREE.PointsMaterial({
    color: 0xfff6dd,
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  root.add(stars);

  return {
    root,
    setDaylight(state: Daylight) {
      uniforms.top.value.copy(state.skyTop);
      uniforms.horizon.value.copy(state.skyHorizon);
      uniforms.sun.value.copy(state.sunPosition).normalize();
      uniforms.haze.value = state.haze;
      starMaterial.opacity = state.stars * 0.9;
      stars.visible = state.stars > 0.01;
    },
    update(time: number) {
      clouds.rotation.y = time * 0.006;
      clouds.position.y = Math.sin(time * 0.1) * 0.15;
      stars.rotation.y = time * 0.002;
    },
  };
}
