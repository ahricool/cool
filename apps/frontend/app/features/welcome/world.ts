import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDaylight, normalizeHour } from './daylight';
import { createWelcomeGarden } from './garden';

export { createWelcomeGarden } from './garden';

const focus = new THREE.Vector3(0, 0.45, 0);

function fitWelcomeCamera(camera: THREE.PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  // Keep the complete plinth in frame, with breathing room on portrait displays.
  camera.fov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(THREE.MathUtils.degToRad(38) / 2) * Math.max(1, 1.25 / aspect),
      ),
  );
  camera.updateProjectionMatrix();
}

export function createWelcomeCamera(aspect = 1) {
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
  camera.position.set(12.8, 12.5, 18.8);
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
    alpha: true,
    powerPreference: 'low-power',
  });
  let disposed = false,
    lost = false,
    frame = 0,
    last = 0,
    time = 0,
    slowFrames = 0;
  const scene = new THREE.Scene();
  const camera = createWelcomeCamera();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(focus);
  controls.enablePan = false;
  controls.minDistance = 15;
  controls.maxDistance = 36;
  controls.minPolarAngle = Math.PI * 0.17;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.enableDamping = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5),
  );
  renderer.shadowMap.enabled = true;
  // Only the sun moves; petals do not cast shadows. Reuse the static depth map.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
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
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    const textures = new Set<THREE.Texture>();
    materials.forEach((material) => {
      if (material instanceof THREE.MeshToonMaterial && material.gradientMap)
        textures.add(material.gradientMap);
      material.dispose();
    });
    textures.forEach((texture) => texture.dispose());
    daylight.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  const daylight = createDaylight(scene, renderer, mobile ? 1024 : 2048);
  const observer = new ResizeObserver(resize);
  const petalGeometry = new THREE.PlaneGeometry(0.085, 0.06);
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xefceab,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    petalMaterial,
    mobile ? 12 : 22,
  );
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  const dummy = new THREE.Object3D();
  function updatePetals() {
    for (let i = 0; i < petals.count; i++) {
      const phase = i * 2.39996;
      dummy.position.set(
        Math.sin(phase) * 5.5 + Math.sin(time * 0.26 + phase) * 0.5,
        0.4 + ((((i * 0.431 - time * 0.23) % 5) + 5) % 5),
        Math.cos(phase * 1.7) * 4.8,
      );
      dummy.rotation.set(
        phase + time * 0.5,
        phase * 0.7 + time * 0.3,
        phase + time * 0.15,
      );
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
  }
  function draw(now = 0) {
    frame = 0;
    if (disposed || lost || document.hidden) return;
    if (now - last < 33 && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    if (!reducedMotion.matches) time += Math.min((now - last) / 1000, 0.06);
    last = now;
    updatePetals();
    const start = performance.now();
    renderer.render(scene, camera);
    if (performance.now() - start > 45) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 6) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      petals.count = 10;
      slowFrames = 0;
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
  try {
    scene.add(petals);
    scene.add(createWelcomeGarden());
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: 0x243d3b, opacity: 0.23 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.04;
    ground.receiveShadow = true;
    scene.add(ground);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    controls.update();
    updatePetals();
    daylight.setHour(10.5);
    resize();
    renderer.render(scene, camera);
    observer.observe(host);
    controls.addEventListener('change', requestRender);
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motion);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    requestRender();
    return {
      dispose,
      setHour(hour: number) {
        if (disposed || lost) return;
        daylight.setHour(normalizeHour(hour));
        requestRender();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
