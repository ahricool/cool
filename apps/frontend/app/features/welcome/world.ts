import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createDaylight, normalizeHour } from './daylight';
import { createWelcomeGarden } from './garden';
import { createGardenLife } from './life';
import { createLandscape } from './landscape';
import { createMenuBar } from './menu';
import { createRain } from './rain';
import type { SparkleModel } from './sparkle-model';
import { createSparkle } from './sparkle';
import { createSky } from './sky';
import { canStand, surfaceAt } from './walk';
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

/**
 * Bloom only after dusk and only on larger screens: a high threshold so just
 * lanterns, lit shoji and fireflies glow. By day the scene renders directly.
 */
export function welcomeBloom(lampIntensity: number, mobile: boolean) {
  return mobile ? 0 : THREE.MathUtils.clamp(lampIntensity / 2.4, 0, 1);
}

/** Cel outlines hide most aliasing, so a modest cap is enough for a miniature. */
export function welcomePixelRatio(devicePixelRatio: number, mobile: boolean) {
  return Math.min(devicePixelRatio || 1, mobile ? 1 : 1.25);
}

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

export type Weather = 'clear' | 'rain';

export interface WelcomeWorld {
  dispose(): void;
  setHour(hour: number): void;
  setWeather(weather: Weather): void;
}

export function mountWelcomeWorld(
  host: HTMLElement,
  unavailable: () => void,
  /** Scene controls to dress as a wooden board drawn over the world. */
  menuElement?: HTMLElement,
  /** The floating enter button, dressed as a small plaque of the same wood. */
  enterElement?: HTMLElement,
): WelcomeWorld {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = host.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({
    // MSAA on a fullscreen canvas is why a discrete GPU sits at 100% for a
    // miniature. Ink hulls already hide the jaggies toon shading would show.
    antialias: false,
    powerPreference: 'low-power',
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
  renderer.setPixelRatio(welcomePixelRatio(window.devicePixelRatio, mobile));
  renderer.shadowMap.enabled = true;
  // Static casters only. Sparkle uses a contact blob, so the depth map is
  // rebuilt when the sun moves, not every frame she idles or walks.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Painted colours are already final; tone mapping would grey them out.
  renderer.toneMapping = THREE.NoToneMapping;
  function dispose() {
    if (disposed) return;
    disposed = true;
    // The model owns its skeletons and textures; release it on its own path.
    if (model) {
      model.root.removeFromParent();
      model.dispose();
      model = undefined;
    }
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    reducedMotion.removeEventListener('change', motion);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    controls.removeEventListener('change', requestRender);
    controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    const visit = (object: THREE.Object3D) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    };
    scene.traverse(visit);
    menu?.scene.traverse(visit);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    });
    textures.add(ramp);
    textures.forEach((texture) => texture.dispose());
    bloom?.dispose();
    composer?.dispose();
    daylight.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  const shared = createSharedUniforms();
  const ramp = createRamp();
  const daylight = createDaylight(scene, renderer, mobile ? 512 : 1024);
  const observer = new ResizeObserver(resize);
  // Built inside the guarded block below so a failure still releases the renderer.
  let sky: ReturnType<typeof createSky>,
    life: ReturnType<typeof createGardenLife>,
    landscape: ReturnType<typeof createLandscape>,
    sparkle: ReturnType<typeof createSparkle>,
    rain: ReturnType<typeof createRain>,
    model: SparkleModel | undefined,
    menu: ReturnType<typeof createMenuBar> | undefined;
  const glowing: THREE.MeshToonMaterial[] = [];
  // Built lazily the first night so daytime visits never allocate the targets.
  let composer: EffectComposer | undefined,
    bloom: UnrealBloomPass | undefined,
    bloomStrength = 0;
  let time = 0,
    hourNow = 10.5,
    // Eased towards the target over a few seconds so rain rolls in and out.
    wet = 0,
    wetTarget = 0;
  function animate(dt: number) {
    const state = daylight.state;
    shared.time.value = time;
    shared.ink.value = state.ink;
    shared.blossom.value = state.blossomGlow;
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
        (material.name === 'lantern'
          ? 0.62
          : material.name === 'shoji'
            ? 0.3
            : 0.6) *
        flame;
    landscape.setLamps(state.lampIntensity * flame);
    sparkle.update(dt, time, camera, state);
    if (wet !== wetTarget) {
      wet =
        reducedMotion.matches || Math.abs(wetTarget - wet) < 0.005
          ? wetTarget
          : wet + (wetTarget - wet) * Math.min(1, dt * 0.6);
      applyLight();
    }
    rain.update(time);
    menu?.update(time);
  }
  function bloomComposer() {
    if (composer) return composer;
    const size = renderer.getSize(new THREE.Vector2());
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(size, 0, 0.55, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(size.x, size.y);
    return composer;
  }
  /** The world, then the menu board on top with a fresh depth buffer. */
  function present() {
    if (bloomStrength > 0.01 && !degraded) {
      const pass = bloomComposer();
      bloom!.strength = bloomStrength * 0.85;
      pass.render();
    } else renderer.render(scene, camera);
    if (!menu) return;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(menu.scene, menu.camera);
    renderer.autoClear = true;
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
    present();
    if (performance.now() - start > 45) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 6 && !degraded) {
      degraded = true;
      renderer.setPixelRatio(1);
      composer?.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      life.setMotes(daylight.state.motes, 1);
      slowFrames = 0;
      // Resizing clears the drawing buffer. Redraw now, including on-demand reduced-motion frames.
      present();
    }
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  }
  function requestRender() {
    if (!disposed && !lost && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  let viewportWidth = 0,
    viewportHeight = 0;
  function resize() {
    if (disposed) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    // Menu animation changes its width, but not the canvas or world camera.
    if (w !== viewportWidth || h !== viewportHeight) {
      viewportWidth = w;
      viewportHeight = h;
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      fitWelcomeCamera(camera, w / h);
    }
    menu?.layout();
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
  // A short press without dragging the view sends Sparkle to that spot.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let ground: THREE.Mesh[] = [];
  let press: { x: number; y: number; at: number } | undefined;
  function pointerDown(event: PointerEvent) {
    press = event.isPrimary
      ? { x: event.clientX, y: event.clientY, at: performance.now() }
      : undefined;
  }
  function pointerUp(event: PointerEvent) {
    const start = press;
    press = undefined;
    if (
      !start ||
      !event.isPrimary ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 ||
      performance.now() - start.at > 500
    )
      return;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(ground, false)[0]?.point;
    // Only the floor counts: roofs, trees and walls in front of it do not.
    if (
      hit &&
      canStand(hit.x, hit.z) &&
      Math.abs(hit.y - surfaceAt(hit.x, hit.z)) < 0.2 &&
      sparkle.goTo(hit.x, hit.z)
    )
      requestRender();
  }
  function setHour(hour: number) {
    hourNow = normalizeHour(hour);
    applyLight();
    // Light treats 24:00 as midnight, but the thumb stays at the slider's end.
    menu?.setHour(THREE.MathUtils.clamp(hour, 0, 24));
  }
  function applyLight() {
    const hour = hourNow;
    daylight.setHour(hour, wet);
    rain.setWet(wet);
    sky.setWeather(wet);
    sky.setDaylight(daylight.state);
    bloomStrength = welcomeBloom(daylight.state.lampIntensity, mobile);
    landscape.setDaylight(daylight.state);
    life.setMotes(daylight.state.motes, renderer.getPixelRatio());
  }
  try {
    sky = createSky(shared, ramp, mobile);
    life = createGardenLife(shared, ramp, mobile);
    landscape = createLandscape(shared, ramp, mobile);
    sparkle = createSparkle(mobile);
    rain = createRain(mobile);
    const garden = createWelcomeGarden(shared, ramp);
    ground = garden.children.filter(
      (object): object is THREE.Mesh =>
        object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshToonMaterial,
    );
    scene.add(
      sky.root,
      landscape.root,
      garden,
      life.root,
      sparkle.root,
      rain.root,
    );
    if (menuElement)
      menu = createMenuBar(host, menuElement, ramp, enterElement);
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshToonMaterial &&
        ['glow', 'lantern', 'shoji'].includes(object.material.name)
      )
        glowing.push(object.material);
    });
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    controls.update();
    setHour(10.5);
    animate(0);
    resize();
    present();
    observer.observe(host);
    // Collapsing the daylight group or reflowing the controls reshapes the board.
    if (menuElement) observer.observe(menuElement);
    if (enterElement) observer.observe(enterElement);
    controls.addEventListener('change', requestRender);
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motion);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    // Swap in the official model when it exists locally; keep the standee otherwise.
    import('./sparkle-model')
      .then(({ loadSparkleModel }) => loadSparkleModel(shared, ramp))
      .then((loaded) => {
        // Leaving while the GLB was still loading: nothing else will free it.
        if (disposed) {
          loaded.dispose();
          return;
        }
        model = loaded;
        sparkle.attachModel(loaded);
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
      setWeather(weather: Weather) {
        if (disposed || lost) return;
        wetTarget = weather === 'rain' ? 1 : 0;
        menu?.setWeather(weather);
        requestRender();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
