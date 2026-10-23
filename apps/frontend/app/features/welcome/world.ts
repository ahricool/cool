import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDaylight, normalizeHour } from './daylight';
import { createWelcomeGarden } from './garden';
import { createGardenLife } from './life';
import { createLandscape } from './landscape';
import { createSparkle } from './sparkle';
import { createSky } from './sky';
import { createRamp, createSharedUniforms } from './toon';

export { createWelcomeGarden } from './garden';

export const welcomeFocus = new THREE.Vector3(0, 0.75, -0.2);
export const welcomeCameraLimits = {
  minDistance: 9,
  maxDistance: 34,
  minPolarAngle: Math.PI * 0.17,
  maxPolarAngle: Math.PI * 0.47,
};
const focus = welcomeFocus;

function fitWelcomeCamera(camera: THREE.PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  // Keep the complete plinth in frame, with breathing room on portrait displays.
  camera.fov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(THREE.MathUtils.degToRad(38) / 2) * Math.max(1, 1.3 / aspect),
      ),
  );
  camera.updateProjectionMatrix();
}

export function createWelcomeCamera(aspect = 1) {
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 200);
  camera.position.set(14.1, 9.6, 19.9);
  camera.lookAt(focus);
  fitWelcomeCamera(camera, aspect);
  camera.updateMatrixWorld();
  return camera;
}

export interface WelcomeWorld {
  dispose(): void;
  setHour(hour: number): void;
}

export function mountWelcomeWorld(
  host: HTMLElement,
  unavailable: () => void,
): WelcomeWorld {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = host.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    powerPreference: 'low-power',
    // Sparkle's projected shadow uses the stencil to darken each pixel once.
    stencil: true,
  });
  let disposed = false,
    lost = false,
    frame = 0,
    last = 0,
    slowFrames = 0,
    degraded = false;
  const scene = new THREE.Scene();
  const camera = createWelcomeCamera();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(focus);
  controls.enablePan = false;
  Object.assign(controls, welcomeCameraLimits);
  controls.enableDamping = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5),
  );
  renderer.shadowMap.enabled = true;
  // The sun only moves with the time slider. Reuse the static depth map between frames.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Painted colours are already final; tone mapping would grey them out.
  renderer.toneMapping = THREE.NoToneMapping;
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
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    });
    textures.add(ramp);
    textures.forEach((texture) => texture.dispose());
    daylight.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  const shared = createSharedUniforms();
  const ramp = createRamp();
  const daylight = createDaylight(scene, renderer, mobile ? 1024 : 2048);
  const observer = new ResizeObserver(resize);
  // Built inside the guarded block below so a failure still releases the renderer.
  let sky: ReturnType<typeof createSky>,
    life: ReturnType<typeof createGardenLife>,
    landscape: ReturnType<typeof createLandscape>,
    sparkle: ReturnType<typeof createSparkle>;
  const glowing: THREE.MeshToonMaterial[] = [];
  let time = 0;
  function animate(dt: number) {
    const state = daylight.state;
    shared.time.value = time;
    shared.ink.value = state.ink;
    shared.rim.value
      .copy(state.skyColor)
      .multiplyScalar(0.05 + state.day * 0.13);
    sky.update(time);
    life.update(time);
    daylight.flicker(time);
    const flame =
      0.9 + Math.sin(time * 6.1) * 0.06 + Math.sin(time * 10.3) * 0.04;
    for (const material of glowing)
      material.emissiveIntensity =
        state.lampIntensity *
        (material.name === 'lantern' ? 0.32 : 0.55) *
        flame;
    sparkle.update(dt, time, camera, state);
  }
  function draw(now = 0) {
    frame = 0;
    if (disposed || lost || document.hidden) return;
    if (now - last < 33 && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const dt = reducedMotion.matches ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    time += dt;
    animate(dt);
    const start = performance.now();
    renderer.render(scene, camera);
    if (performance.now() - start > 45) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 6 && !degraded) {
      degraded = true;
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      life.setMotes(daylight.state.motes, 1);
      slowFrames = 0;
      // Resizing clears the drawing buffer. Redraw now, including on-demand reduced-motion frames.
      renderer.render(scene, camera);
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
  function setHour(hour: number) {
    daylight.setHour(normalizeHour(hour));
    sky.setDaylight(daylight.state);
    landscape.setDaylight(daylight.state);
    life.setMotes(daylight.state.motes, renderer.getPixelRatio());
  }
  try {
    sky = createSky(shared, ramp, mobile);
    life = createGardenLife(shared, ramp, mobile);
    landscape = createLandscape(shared, ramp, mobile);
    sparkle = createSparkle(mobile);
    const garden = createWelcomeGarden(shared, ramp);
    scene.add(sky.root, landscape.root, garden, life.root, sparkle.root);
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshToonMaterial &&
        ['glow', 'lantern'].includes(object.material.name)
      )
        glowing.push(object.material);
    });
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    controls.update();
    setHour(10.5);
    animate(0);
    resize();
    renderer.render(scene, camera);
    observer.observe(host);
    controls.addEventListener('change', requestRender);
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motion);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    // Swap in the official model when it exists locally; keep the standee otherwise.
    import('./sparkle-model')
      .then(({ loadSparkleModel }) => loadSparkleModel(shared, ramp))
      .then((model) => {
        if (disposed) return;
        sparkle.attachModel(model);
        requestRender();
      })
      .catch(() => {});
    requestRender();
    return {
      dispose,
      setHour(hour: number) {
        if (disposed || lost) return;
        setHour(hour);
        requestRender();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
