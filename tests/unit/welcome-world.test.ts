import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { daylightAt } from '../../apps/frontend/app/features/welcome/daylight';
import {
  createWelcomeCamera,
  createWelcomeGarden,
} from '../../apps/frontend/app/features/welcome/world';

function release(world: THREE.Group) {
  const textures = new Set<THREE.Texture>();
  for (const object of world.children) {
    const mesh = object as THREE.Mesh;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (material instanceof THREE.MeshToonMaterial && material.gradientMap)
        textures.add(material.gradientMap);
      material.dispose();
    }
  }
  textures.forEach((texture) => texture.dispose());
}

test('welcome garden has finite, normalized geometry in bounded material batches', () => {
  const world = createWelcomeGarden();
  try {
    assert.ok(world.children.length > 0 && world.children.length <= 20);
    let vertices = 0;
    const plinthBounds = new THREE.Box3();
    const point = new THREE.Vector3();
    for (const object of world.children) {
      assert.ok(object instanceof THREE.Mesh);
      const { geometry } = object;
      const position = geometry.getAttribute('position');
      const normal = geometry.getAttribute('normal');
      assert.equal(position.count, normal.count);
      assert.equal(position.count % 3, 0);
      vertices += position.count;
      for (let i = 0; i < position.count; i++) {
        assert.ok(
          [position.getX(i), position.getY(i), position.getZ(i)].every(
            Number.isFinite,
          ),
        );
        if (position.getY(i) < 0)
          plinthBounds.expandByPoint(point.fromBufferAttribute(position, i));
        const length = Math.hypot(
          normal.getX(i),
          normal.getY(i),
          normal.getZ(i),
        );
        assert.ok(Math.abs(length - 1) < 0.0001);
      }
    }
    // Preserve small-scene performance when adding miniature details.
    assert.ok(vertices < 200_000, `Unexpected vertex count: ${vertices}`);
    const bounds = new THREE.Box3().setFromObject(world);
    assert.ok(bounds.min.y <= -0.99 && bounds.max.y > 5.5);
    assert.ok(bounds.max.y < 7);
    // The complete miniature lives on a genuinely square thick plinth.
    assert.ok(Math.abs(plinthBounds.min.x + 6.3) < 0.0001);
    assert.ok(Math.abs(plinthBounds.max.x - 6.3) < 0.0001);
    assert.ok(Math.abs(plinthBounds.min.z + 6.3) < 0.0001);
    assert.ok(Math.abs(plinthBounds.max.z - 6.3) < 0.0001);
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
      for (const object of world.children) {
        const positions = (object as THREE.Mesh).geometry.getAttribute(
          'position',
        );
        for (let i = 0; i < positions.count; i++)
          projected.expandByPoint(
            point.fromBufferAttribute(positions, i).project(camera),
          );
      }
      assert.ok(
        projected.min.x > -0.9 && projected.max.x < 0.9,
        `${width}×${height}: horizontal framing`,
      );
      assert.ok(
        projected.min.y > -0.85 && projected.max.y < 0.85,
        `${width}×${height}: vertical framing`,
      );
      assert.ok(projected.min.z > -1 && projected.max.z < 1);
    }
  } finally {
    release(world);
  }
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
  assert.ok(
    noon.sunIntensity > 2 && noon.ambientIntensity > midnight.ambientIntensity,
  );
  assert.equal(noon.lampIntensity, 0);
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
