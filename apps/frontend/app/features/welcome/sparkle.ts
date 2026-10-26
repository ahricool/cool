import * as THREE from 'three';
import type { Daylight } from './daylight';
import { groundAt, roamSpots, terrace } from './layout';
import type { SparkleModel } from './sparkle-model';
import { seeded } from './toon';
import { canStand, randomSpot, routeBetween, surfaceAt } from './walk';

/** Soft disc for the contact blob; red channel is the alpha map. */
function softDisc() {
  const size = 64;
  const data = new Uint8Array(size * size);
  const mid = (size - 1) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - mid, y - mid) / mid;
      data[y * size + x] = Math.round(
        255 * (1 - THREE.MathUtils.smoothstep(r, 0.35, 1)),
      );
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.needsUpdate = true;
  return texture;
}

/** Petals and leaves on the court that scatter when she lands or runs past. */
function createLitter(count: number) {
  const random = seeded(512);
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.045);
  shape.quadraticCurveTo(0.04, 0, 0, 0.045);
  shape.quadraticCurveTo(-0.04, 0, 0, -0.045);
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    count,
  );
  mesh.name = 'litter';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  const items = Array.from({ length: count }, (_, i) => {
    const spot = roamSpots[i % roamSpots.length]!;
    const near = i % 3 !== 0;
    return {
      x: near ? spot[0] + (random() - 0.5) * 1.6 : -4.5 + random() * 8.6,
      z: near ? spot[1] + (random() - 0.5) * 1.4 : 1.0 + random() * 4.8,
      vx: 0,
      vz: 0,
      lift: 0,
      angle: random() * Math.PI * 2,
      spin: 0,
      tilt: random() * 0.3,
    };
  });
  const tones = ['#ffc1d6', '#f79abb', '#ffd9e6', '#e8b65c', '#b8d77a'];
  const color = new THREE.Color();
  items.forEach((_, i) =>
    mesh.setColorAt(
      i,
      color.set(tones[i % 5 === 3 ? 3 : i % 7 === 4 ? 4 : i % 3]!),
    ),
  );
  const dummy = new THREE.Object3D();
  return {
    mesh,
    /** Blows nearby litter away from (x, z). */
    scatter(x: number, z: number, radius: number, strength: number) {
      for (const item of items) {
        const dx = item.x - x,
          dz = item.z - z;
        const distance = Math.hypot(dx, dz);
        if (distance > radius || distance < 1e-4) continue;
        const push =
          (1 - distance / radius) * strength * (0.7 + random() * 0.6);
        item.vx += (dx / distance) * push + (random() - 0.5) * 0.2;
        item.vz += (dz / distance) * push + (random() - 0.5) * 0.2;
        item.lift = Math.max(item.lift, 0.03 + random() * 0.05 * strength);
        item.spin += (random() - 0.5) * 8;
      }
    },
    update(dt: number) {
      const damping = Math.exp(-dt * 3.2);
      items.forEach((item, i) => {
        item.x += item.vx * dt;
        item.z += item.vz * dt;
        item.vx *= damping;
        item.vz *= damping;
        item.angle += item.spin * dt;
        item.spin *= damping;
        item.lift *= Math.exp(-dt * 5);
        // Keep litter on the court: off the stairs, inside the fence.
        item.x = THREE.MathUtils.clamp(item.x, -5.85, 5.85);
        item.z = THREE.MathUtils.clamp(item.z, terrace.front + 1.45, 5.85);
        dummy.position.set(
          item.x,
          groundAt(item.x, item.z) + 0.012 + item.lift,
          item.z,
        );
        dummy.rotation.set(item.tilt * Math.sin(item.angle), item.angle, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

type Phase = 'idle' | 'walk';

/**
 * Sparkle's life in the courtyard: where she stands and walks. Nothing is
 * drawn until the 3D model has loaded and been attached.
 */
export function createSparkle(mobile: boolean) {
  const root = new THREE.Group();
  root.name = 'sparkle';
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x3b2f55,
      alphaMap: softDisc(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  blob.name = 'sparkle-contact';
  blob.visible = false;
  const litter = createLitter(mobile ? 60 : 110);
  root.add(litter.mesh, blob);

  // Unseeded, so every visit starts somewhere new and wanders differently.
  const random = Math.random;
  const start = randomSpot(random);
  const position = new THREE.Vector2(start.x, start.z);
  /** Remaining legs of the current walk; the first is where she heads now. */
  let route: { x: number; z: number }[] = [];
  let height = surfaceAt(position.x, position.y);
  const heading = new THREE.Vector3(1, 0, 0);
  const toCamera = new THREE.Vector3();
  let model: SparkleModel | undefined;
  let phase: Phase = 'idle';
  let elapsed = 0,
    idleFor = 2.5,
    stride = 0,
    stepping = 0,
    blinkAt = 1.2,
    yaw = random() * Math.PI * 2,
    look = 0,
    lookTimer = 0,
    // A visitor picked this spot: linger there before wandering on.
    summoned = false;

  /** Somewhere new anywhere she can reach, usually a short stroll away. */
  function chooseRoute() {
    const far = random() < 0.25;
    const goal = randomSpot(random, position, far ? 2.5 : 0.8, far ? 9 : 3);
    route = routeBetween(position.x, position.y, goal.x, goal.z);
  }
  function enter(next: Phase) {
    phase = next;
    elapsed = 0;
    if (next === 'idle') {
      idleFor = summoned ? 10 + random() * 3 : 2.4 + random() * 2.6;
      summoned = false;
      blinkAt = 0.6 + random() * 1.2;
    }
  }
  /** Face the way she travels, in world terms. */
  function faceTowards(x: number, z: number) {
    const dx = x - position.x,
      dz = z - position.y;
    if (Math.hypot(dx, dz) > 0.05) heading.set(dx, 0, dz).normalize();
  }

  return {
    root,
    /** Walk straight to a clicked spot if she can reach it; false otherwise. */
    goTo(x: number, z: number) {
      if (!canStand(x, z)) return false;
      const next = routeBetween(position.x, position.y, x, z);
      if (!next.length) return false;
      route = next;
      summoned = true;
      enter('walk');
      return true;
    },
    attachModel(next: SparkleModel) {
      model = next;
      root.add(next.root);
      blob.visible = true;
    },
    update(dt: number, time: number, camera: THREE.Camera, light: Daylight) {
      elapsed += dt;
      if (phase === 'idle') {
        if (elapsed > idleFor) {
          chooseRoute();
          if (route.length) enter('walk');
          else enter('idle');
        }
      } else {
        const to = route[0]!;
        const dx = to.x - position.x,
          dz = to.z - position.y,
          distance = Math.hypot(dx, dz);
        faceTowards(to.x, to.z);
        const step = Math.min(distance, 0.55 * dt);
        if (distance > 1e-4) {
          position.x += (dx / distance) * step;
          position.y += (dz / distance) * step;
        }
        const previous = Math.floor(stride);
        // About 0.8 gait cycles a second, matching her walking pace.
        stride += dt * 3.2;
        // Each footfall nudges the petals under her feet.
        if (Math.floor(stride) !== previous && Math.floor(stride) % 2 === 0)
          litter.scatter(position.x, position.y, 0.32, 0.45);
        if (distance < 0.02) {
          route.shift();
          if (!route.length) enter('idle');
        }
      }
      // Ease in and out of the stride rather than snapping between poses.
      stepping += ((phase === 'walk' ? 1 : 0) - stepping) * Math.min(1, dt * 8);
      litter.update(dt);
      if (!model) return;

      // Ease onto each stair step rather than popping up it.
      const ground = surfaceAt(position.x, position.y);
      height += (ground - height) * Math.min(1, dt * 10);
      blob.position.set(position.x, height + 0.004, position.y);
      blob.scale.set(1.15, 1, 0.85);
      (blob.material as THREE.MeshBasicMaterial).opacity =
        0.22 + light.day * 0.1;

      // Turn to travel, then settle facing the viewer with idle glances.
      toCamera.set(
        camera.position.x - position.x,
        0,
        camera.position.z - position.y,
      );
      const target =
        phase === 'idle'
          ? Math.atan2(toCamera.x, toCamera.z) + Math.sin(time * 0.3) * 0.3
          : Math.atan2(heading.x, heading.z);
      yaw +=
        Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)) *
        Math.min(1, dt * (phase === 'idle' ? 1.5 : 8));
      lookTimer -= dt;
      if (lookTimer <= 0) {
        lookTimer = 1.5 + random() * 2.5;
        look = phase === 'idle' ? (random() - 0.5) * 0.7 : 0;
      }
      const blink =
        phase === 'idle' && elapsed > blinkAt && elapsed < blinkAt + 0.16
          ? Math.sin(((elapsed - blinkAt) / 0.16) * Math.PI)
          : 0;
      model.pose({
        x: position.x,
        y: height,
        z: position.y,
        yaw,
        walk: stepping,
        stride: stride * (Math.PI / 2),
        time,
        blink,
        look,
      });
    },
  };
}
