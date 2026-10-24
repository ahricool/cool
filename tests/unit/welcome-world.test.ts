import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createDaylight,
  daylightAt,
} from '../../apps/frontend/app/features/welcome/daylight';
import {
  groundAt,
  isLawn,
  obstacles,
  plinth,
  roamSpots,
  terrace,
} from '../../apps/frontend/app/features/welcome/layout';
import { createSparkle } from '../../apps/frontend/app/features/welcome/sparkle';
import {
  createWelcomeCamera,
  createWelcomeGarden,
  welcomePixelRatio,
} from '../../apps/frontend/app/features/welcome/world';

function release(world: THREE.Group) {
  const textures = new Set<THREE.Texture>();
  for (const object of world.children) {
    const mesh = object as THREE.Mesh;
    mesh.geometry.dispose();
    const material = mesh.material as THREE.Material;
    if (material instanceof THREE.MeshToonMaterial && material.gradientMap)
      textures.add(material.gradientMap);
    material.dispose();
  }
  textures.forEach((texture) => texture.dispose());
}

const fills = (world: THREE.Group) =>
  world.children.filter(
    (object): object is THREE.Mesh =>
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshToonMaterial,
  );

test('welcome garden has finite geometry in bounded toon and ink batches', () => {
  const world = createWelcomeGarden();
  try {
    assert.ok(world.children.length > 0 && world.children.length <= 100);
    let vertices = 0;
    const plinthBounds = new THREE.Box3();
    const point = new THREE.Vector3();
    for (const object of world.children) {
      assert.ok(object instanceof THREE.Mesh);
      const position = object.geometry.getAttribute('position');
      assert.equal(position.count % 3, 0);
      vertices += position.count;
      for (let i = 0; i < position.count; i++)
        assert.ok(
          [position.getX(i), position.getY(i), position.getZ(i)].every(
            Number.isFinite,
          ),
        );
      // Every ink hull carries smoothed normals to extrude along.
      if (object.material instanceof THREE.ShaderMaterial)
        assert.ok(object.geometry.getAttribute('smoothNormal'));
    }
    for (const mesh of fills(world)) {
      const position = mesh.geometry.getAttribute('position');
      const normal = mesh.geometry.getAttribute('normal');
      assert.equal(position.count, normal.count);
      for (let i = 0; i < position.count; i++) {
        if (position.getY(i) < -0.4)
          plinthBounds.expandByPoint(point.fromBufferAttribute(position, i));
        const length = Math.hypot(
          normal.getX(i),
          normal.getY(i),
          normal.getZ(i),
        );
        assert.ok(Math.abs(length - 1) < 0.001);
      }
    }
    // Preserve small-scene performance when adding miniature details.
    assert.ok(vertices < 400_000, `Unexpected vertex count: ${vertices}`);
    const bounds = new THREE.Box3().setFromObject(world);
    assert.ok(bounds.min.y >= plinth.bottom - 0.05 && bounds.max.y > 4.5);
    assert.ok(bounds.max.y < 7);
    // The complete miniature lives on a genuinely square stone plinth.
    for (const value of [
      -plinthBounds.min.x,
      plinthBounds.max.x,
      -plinthBounds.min.z,
      plinthBounds.max.z,
    ])
      assert.ok(Math.abs(value - plinth.half) < 0.02, `plinth edge ${value}`);
  } finally {
    release(world);
  }
});

test('procedural foliage and garden details are reproducible between visits', () => {
  const first = createWelcomeGarden();
  const second = createWelcomeGarden();
  try {
    assert.equal(first.children.length, second.children.length);
    first.children.forEach((object, index) => {
      const a = object as THREE.Mesh;
      const b = second.children[index] as THREE.Mesh;
      assert.equal(a.name, b.name);
      assert.deepEqual(
        a.geometry.getAttribute('position').array,
        b.geometry.getAttribute('position').array,
      );
    });
  } finally {
    release(first);
    release(second);
  }
});

test('initial desktop and portrait views keep the whole miniature clear of viewport edges', () => {
  const world = createWelcomeGarden();
  try {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [320, 844],
      [844, 390],
    ]) {
      const camera = createWelcomeCamera(width! / height!);
      const projected = new THREE.Box3();
      const point = new THREE.Vector3();
      for (const mesh of fills(world)) {
        const positions = mesh.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++)
          projected.expandByPoint(
            point.fromBufferAttribute(positions, i).project(camera),
          );
      }
      assert.ok(
        projected.min.x > -0.92 && projected.max.x < 0.92,
        `${width}×${height}: horizontal framing`,
      );
      assert.ok(
        projected.min.y > -0.88 && projected.max.y < 0.88,
        `${width}×${height}: vertical framing`,
      );
      assert.ok(projected.min.z > -1 && projected.max.z < 1);
    }
  } finally {
    release(world);
  }
});

test('Sparkle roams open court ground and can always reach a nearby spot', () => {
  for (const [x, z] of roamSpots) {
    assert.ok(
      z > terrace.front + 1.2 && Math.abs(x) < plinth.half - 1,
      `${x}, ${z}`,
    );
    assert.ok(groundAt(x, z) < 0.1);
    assert.ok(!isLawn(x, z) || groundAt(x, z) === 0);
    for (const obstacle of obstacles)
      assert.ok(
        Math.hypot(x - obstacle.x, z - obstacle.z) > obstacle.r,
        `spot ${x}, ${z} inside obstacle`,
      );
    assert.ok(
      roamSpots.some(([ox, oz]) => {
        const distance = Math.hypot(ox - x, oz - z);
        return distance > 0.8 && distance < 2.8;
      }),
      `spot ${x}, ${z} has no nearby target`,
    );
  }
  // Raised terrace and paving are reported so feet and litter stay on the surface.
  assert.equal(groundAt(0, -3), terrace.top);
  assert.ok(groundAt(0, 3) > groundAt(-2.5, 3));
});

test('solar cycle is continuous across midnight and lights the night without daylight', () => {
  const midnight = daylightAt(0),
    next = daylightAt(24),
    noon = daylightAt(12);
  assert.deepEqual(midnight, next);
  assert.deepEqual(daylightAt(-1), daylightAt(23));
  assert.deepEqual(daylightAt(Number.NaN), daylightAt(10.5));
  assert.equal(midnight.sunIntensity, 0);
  assert.ok(midnight.moonIntensity > 0 && midnight.lampIntensity > 0);
  assert.ok(midnight.stars > 0.9 && noon.stars === 0);
  assert.ok(
    noon.sunIntensity > 1.2 &&
      noon.ambientIntensity > midnight.ambientIntensity,
  );
  assert.equal(noon.lampIntensity, 0);
  // Dusk is warm at the horizon rather than a grey blend of day and night.
  const dusk = daylightAt(17.6);
  assert.ok(dusk.haze > 0.5 && dusk.skyHorizon.r > dusk.skyHorizon.b);
  assert.ok(
    daylightAt(8).sunPosition.x < 0 && daylightAt(16).sunPosition.x > 0,
  );
  for (let hour = 0; hour < 24; hour += 0.1) {
    const state = daylightAt(hour),
      following = daylightAt(hour + 0.1);
    assert.ok(Math.abs(state.sunIntensity - following.sunIntensity) < 0.2);
    assert.ok(state.sunPosition.toArray().every(Number.isFinite));
  }
});

test('welcome pixel ratio stays modest so a fullscreen canvas does not shade 4K', () => {
  assert.equal(welcomePixelRatio(2, false), 1.25);
  assert.equal(welcomePixelRatio(2, true), 1);
  assert.equal(welcomePixelRatio(1, false), 1);
});

test('daylight hides lanterns by day and dirties the shadow map only when the sun moves', () => {
  const scene = new THREE.Scene();
  const renderer = { shadowMap: { needsUpdate: false } };
  const light = createDaylight(
    scene,
    renderer as unknown as THREE.WebGLRenderer,
  );
  const lamps = scene.children.filter(
    (object): object is THREE.PointLight => object instanceof THREE.PointLight,
  );
  assert.equal(lamps.length, 4);
  light.setHour(10.5);
  assert.ok(lamps.every((lamp) => lamp.visible === false));
  renderer.shadowMap.needsUpdate = false;
  light.setHour(10.51);
  assert.equal(renderer.shadowMap.needsUpdate, false);
  light.setHour(16);
  assert.equal(renderer.shadowMap.needsUpdate, true);
  light.setHour(0);
  assert.ok(lamps.every((lamp) => lamp.visible));
  assert.equal(light.state.sunIntensity, 0);
});

test('Sparkle keeps a contact blob instead of a shadow-map caster', () => {
  const sparkle = createSparkle(true);
  try {
    const blob = sparkle.root.getObjectByName('sparkle-contact');
    assert.ok(blob instanceof THREE.Mesh);
    assert.equal(blob.castShadow, false);
    assert.equal(blob.visible, false);
  } finally {
    sparkle.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const material = object.material as THREE.Material;
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    });
  }
});
