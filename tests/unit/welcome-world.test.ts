import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { daylightAt } from '../../apps/frontend/app/features/welcome/daylight';
import {
  createWelcomeCamera,
  createWelcomeGarden,
  welcomeFocus,
  welcomeCameraLimits,
} from '../../apps/frontend/app/features/welcome/world';

function meshes(world: THREE.Group) {
  const result: THREE.Mesh[] = [];
  world.traverse((object) => {
    if (object instanceof THREE.Mesh) result.push(object);
  });
  return result;
}
function release(world: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  for (const mesh of meshes(world)) {
    if (mesh instanceof THREE.InstancedMesh) mesh.dispose();
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      materials.add(material);
  }
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
function eachPoint(world: THREE.Group, visit: (point: THREE.Vector3) => void) {
  world.updateMatrixWorld(true);
  const point = new THREE.Vector3(),
    matrix = new THREE.Matrix4();
  for (const mesh of meshes(world)) {
    const positions = mesh.geometry.getAttribute('position');
    const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
    for (let instance = 0; instance < count; instance++) {
      if (mesh instanceof THREE.InstancedMesh) {
        mesh.getMatrixAt(instance, matrix);
        matrix.premultiply(mesh.matrixWorld);
      } else matrix.copy(mesh.matrixWorld);
      for (let i = 0; i < positions.count; i++)
        visit(point.fromBufferAttribute(positions, i).applyMatrix4(matrix));
    }
  }
}

test('Narukami has finite normalized geometry, a large sakura and bounded draw/triangle budgets', () => {
  const world = createWelcomeGarden();
  try {
    assert.ok(meshes(world).length < 35);
    let triangles = 0;
    for (const mesh of meshes(world)) {
      const { geometry } = mesh,
        position = geometry.getAttribute('position'),
        normal = geometry.getAttribute('normal');
      assert.equal(position.count, normal.count);
      triangles +=
        ((geometry.index?.count ?? position.count) / 3) *
        (mesh instanceof THREE.InstancedMesh ? mesh.count : 1);
      for (let i = 0; i < position.count; i++) {
        assert.ok(
          [position.getX(i), position.getY(i), position.getZ(i)].every(
            Number.isFinite,
          ),
        );
        assert.ok(
          Math.abs(
            Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1,
          ) < 0.0001,
        );
      }
    }
    assert.ok(triangles < 220_000, `Unexpected triangle count: ${triangles}`);
    const bounds = new THREE.Box3().setFromObject(world);
    assert.ok(bounds.min.y <= -1.49 && bounds.max.y > 9.5 && bounds.max.y < 11);
    assert.ok(world.getObjectByName('sacred-sakura'));
    const flowers = world.getObjectByName('sakura-florets');
    assert.ok(flowers instanceof THREE.InstancedMesh && flowers.count >= 2000);
    const plinth = new THREE.Box3();
    eachPoint(world, (p) => {
      if (p.y < 0) plinth.expandByPoint(p);
    });
    for (const axis of ['x', 'z'] as const) {
      assert.ok(Math.abs(plinth.min[axis] + 6.325) < 0.001);
      assert.ok(Math.abs(plinth.max[axis] - 6.325) < 0.001);
    }
  } finally {
    release(world);
  }
});

test('closest orbit stays outside all shrine geometry at every allowed angle', () => {
  const world = createWelcomeGarden();
  try {
    let radius = 0;
    eachPoint(world, (p) => {
      radius = Math.max(radius, p.distanceTo(welcomeFocus));
    });
    assert.ok(
      radius + 0.2 < welcomeCameraLimits.minDistance,
      `Model radius ${radius}`,
    );
    assert.ok(
      welcomeCameraLimits.minPolarAngle > 0 &&
        welcomeCameraLimits.maxPolarAngle < Math.PI / 2,
    );
  } finally {
    release(world);
  }
});

test('procedural foliage and garden details are reproducible between visits', () => {
  const first = createWelcomeGarden();
  const second = createWelcomeGarden();
  try {
    assert.equal(meshes(first).length, meshes(second).length);
    meshes(first).forEach((object, index) => {
      const a = object as THREE.Mesh;
      const b = meshes(second)[index] as THREE.Mesh;
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
      eachPoint(world, (point) =>
        projected.expandByPoint(point.clone().project(camera)),
      );
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
