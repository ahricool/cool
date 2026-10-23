import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { SharedUniforms } from './toon';

/**
 * Official Sparkle model (miHoYo; MMD edit by 神帝宇), converted from PMX to
 * GLB for local preview only: its licence forbids redistribution, so the file
 * stays out of Git and the pixel standee remains the fallback.
 */
export const sparkleModelUrl = '/models/sparkle.glb';

/** Standing height in scene units, close to the pixel standee. */
const HEIGHT = 1.35;
/** Ink hull width in model units (the PMX is about 18 units tall). */
const INK = 0.075;
/** Self-lit share of the albedo, and saturation boost after lighting. */
const LIFT = 0.12;
const SATURATION = 1.35;
/** Eye, mouth and expression layers stay free of ink lines. */
const unlined = new Set([
  '表情',
  '眼睛',
  '眼睛1',
  '眼白',
  '牙齿',
  '舌头',
  '口腔',
  '眉毛',
  '腰饰球',
  '腰饰球2',
]);

export interface ModelPose {
  x: number;
  y: number;
  z: number;
  /** World heading; the model faces +z at 0. */
  yaw: number;
  /** 0 standing, 1 walking at full stride. */
  walk: number;
  /** Walk cycle phase in radians. */
  stride: number;
  /** Seconds, drives breathing and glances. */
  time: number;
  blink: number;
  /** Look left/right, radians. */
  look: number;
}

export async function loadSparkleModel(
  shared: SharedUniforms,
  ramp: THREE.Texture,
) {
  // Draco decodes to plain float positions; quantised meshopt data skewed the
  // skin binding once bones moved.
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const gltf = await new GLTFLoader()
    .setDRACOLoader(draco)
    .loadAsync(sparkleModelUrl)
    .finally(() => draco.dispose());
  const parts: THREE.SkinnedMesh[] = [];
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) parts.push(object);
  });
  const first = parts[0];
  if (!first) throw new Error('Sparkle model has no skinned mesh');
  // One skinned mesh per material, all sharing a single skeleton.
  const figure = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(figure);
  figure.scale.setScalar(HEIGHT / (bounds.max.y - bounds.min.y));
  const root = new THREE.Group();
  root.name = 'sparkle-model';
  root.add(figure);

  // Plum ink hull: the same skinned geometry pushed out along its normals.
  const ink = new THREE.MeshBasicMaterial({
    name: 'sparkle-ink',
    color: 0x3a2433,
    side: THREE.BackSide,
  });
  ink.onBeforeCompile = (shader) => {
    shader.uniforms.ink = shared.ink;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <skinning_vertex>',
      `#include <skinning_vertex>
      transformed += normalize(objectNormal) * ${INK.toFixed(3)};`,
    );
    shader.fragmentShader =
      `uniform float ink;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `outgoingLight *= ink;\n#include <opaque_fragment>`,
      );
  };
  for (const part of parts) {
    const source = part.material as THREE.MeshStandardMaterial;
    // Painted MMD textures under the scene's soft two-tone cel light.
    const material = new THREE.MeshToonMaterial({
      name: source.name,
      map: source.map,
      gradientMap: ramp,
      transparent: source.transparent,
      opacity: source.opacity,
      alphaTest: source.alphaTest,
      side: source.side,
      depthWrite: source.depthWrite,
    });
    // Lift shadows by the surface's own colour, then push saturation so she
    // reads as vividly as the painted scene.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `outgoingLight += diffuseColor.rgb * ${LIFT.toFixed(2)};
        float luma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
        outgoingLight = max(mix(vec3(luma), outgoingLight, ${SATURATION.toFixed(2)}), 0.0);
        #include <opaque_fragment>`,
      );
    };
    material.customProgramCacheKey = () => 'sparkle-model';
    source.dispose();
    part.material = material;
    part.frustumCulled = false;
    part.castShadow = false;
    part.receiveShadow = true;
    if (unlined.has(material.name)) continue;
    const outline = new THREE.SkinnedMesh(part.geometry, ink);
    outline.name = 'sparkle-outline';
    outline.bind(part.skeleton, part.bindMatrix);
    outline.morphTargetInfluences = part.morphTargetInfluences;
    outline.morphTargetDictionary = part.morphTargetDictionary;
    outline.frustumCulled = false;
    outline.position.copy(part.position);
    outline.quaternion.copy(part.quaternion);
    outline.scale.copy(part.scale);
    part.parent!.add(outline);
  }

  // Rotations are authored in model space (+x her left, +z forward), so each
  // bone keeps its rest orientation in that space to convert them locally.
  figure.updateMatrixWorld(true);
  const bones = new Map<
    string,
    { bone: THREE.Bone; rest: THREE.Quaternion; world: THREE.Quaternion }
  >();
  for (const bone of first.skeleton.bones)
    bones.set(bone.name, {
      bone,
      rest: bone.quaternion.clone(),
      world: bone.getWorldQuaternion(new THREE.Quaternion()),
    });
  const center = bones.get('センター')?.bone;
  const centerRest = center?.position.clone() ?? new THREE.Vector3();
  const unit = 1 / figure.scale.x;
  const euler = new THREE.Euler();
  const delta = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  /** Rotates a bone by `rotation` given in model space. */
  const rotate = (name: string, rotation: THREE.Quaternion) => {
    const entry = bones.get(name);
    if (!entry) return;
    // local = rest · world⁻¹ · rotation · world
    entry.bone.quaternion
      .copy(entry.rest)
      .multiply(inverse.copy(entry.world).invert())
      .multiply(rotation)
      .multiply(entry.world);
  };
  const turn = (name: string, x: number, y: number, z: number) =>
    rotate(name, delta.setFromEuler(euler.set(x, y, z)));

  // Long sleeve tails hanging from each upper arm: aim them straight down
  // (a little behind her) whatever the arm does, so they never float.
  const hang = new THREE.Vector3(0, -1, -0.22).normalize();
  const sleeves = (
    [
      ['zx_0_1', 'zx_15_1', '左肩C'],
      ['yx__1', 'yx__16', '右肩C'],
    ] as const
  ).flatMap(([root, tip, shoulder]) => {
    const a = bones.get(root)?.bone,
      b = bones.get(tip)?.bone;
    if (!a || !b) return [];
    const from = figure.worldToLocal(a.getWorldPosition(new THREE.Vector3()));
    const to = figure.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    const rest = to.sub(from).normalize();
    return [
      {
        root,
        shoulder,
        aim: new THREE.Quaternion().setFromUnitVectors(rest, hang),
      },
    ];
  });
  const parent = new THREE.Quaternion();
  const sway = new THREE.Quaternion();
  const morph = (name: string, value: number) => {
    for (const part of parts) {
      const index = part.morphTargetDictionary?.[name];
      if (index !== undefined && part.morphTargetInfluences)
        part.morphTargetInfluences[index] = value;
    }
  };
  morph('にこり', 0.35);

  // Twin tails: each bone chain bends a little more towards its tip, driven
  // by damped springs so the hair lags, overshoots and settles.
  const tails = (
    [
      ['zb_', 1],
      ['yb__', -1],
    ] as const
  ).map(([prefix, side]) => ({
    side,
    chain: [...bones.keys()]
      .filter((name) => name.startsWith(prefix))
      .sort(
        (a, b) =>
          Number(a.slice(prefix.length).split('_')[0]) -
          Number(b.slice(prefix.length).split('_')[0]),
      ),
    trail: new Spring(26, 3.2),
    lift: new Spring(22, 3),
    twist: new Spring(18, 3),
  }));
  let lastTime = 0,
    lastYaw = 0;

  return {
    root,
    pose(p: ModelPose) {
      const dt = Math.min(0.1, Math.max(0, p.time - lastTime));
      lastTime = p.time;
      const yawRate =
        dt > 0
          ? Math.atan2(Math.sin(p.yaw - lastYaw), Math.cos(p.yaw - lastYaw)) /
            dt
          : 0;
      lastYaw = p.yaw;
      root.position.set(p.x, p.y, p.z);
      root.rotation.y = p.yaw;

      const breath = Math.sin(p.time * 2.1);
      // One gait cycle per 2π: the left leg leads while sin(stride) > 0.
      const swing = Math.sin(p.stride) * p.walk;
      // Hips ride highest as the legs pass each other, twice per cycle.
      const bob = (Math.cos(p.stride * 2) - 1) * p.walk * 0.008;
      if (center)
        center.position.set(
          centerRest.x,
          centerRest.y + bob * unit,
          centerRest.z,
        );
      // Weight drifts gently from foot to foot while she stands.
      const shift = Math.sin(p.time * 0.32 * Math.PI * 2) * (1 - p.walk);
      turn('下半身', 0, 0, shift * 0.025);
      turn('上半身', 0.04 * p.walk, 0, -shift * 0.02);
      turn('上半身2', breath * 0.012, 0, 0);
      turn('首', 0, p.look * 0.5, 0);
      turn('頭', -0.04, p.look * 0.5, shift * 0.03);

      // Arms down from the rest A-pose at the shoulder (so the frills on 肩C
      // follow), held a little forward of the hips and swung with the walk.
      const down = 0.72 + breath * 0.01;
      const forward = 0.08;
      const shoulders = {
        左肩C: new THREE.Quaternion()
          .setFromEuler(euler.set(swing * 0.2 - forward, 0, 0))
          .multiply(delta.setFromEuler(euler.set(0, 0, -down))),
        右肩C: new THREE.Quaternion()
          .setFromEuler(euler.set(-swing * 0.2 - forward, 0, 0))
          .multiply(delta.setFromEuler(euler.set(0, 0, down))),
      };
      rotate('左肩C', shoulders.左肩C);
      rotate('右肩C', shoulders.右肩C);
      // Cancel the shoulder turn above each long sleeve tail, then hang it
      // straight down, trailing slightly with the walk.
      for (const sleeve of sleeves) {
        parent.copy(shoulders[sleeve.shoulder]);
        sway.setFromEuler(euler.set(-Math.abs(swing) * 0.15, 0, 0));
        rotate(
          sleeve.root,
          parent.invert().multiply(sway).multiply(sleeve.aim),
        );
      }
      // Elbows bend forward in the lowered arm's own frame.
      const bend = 0.22;
      for (const [elbow, shoulder] of [
        ['左ひじ', shoulders.左肩C],
        ['右ひじ', shoulders.右肩C],
      ] as const)
        rotate(
          elbow,
          parent
            .copy(shoulder)
            .invert()
            .multiply(delta.setFromEuler(euler.set(-bend, 0, 0)))
            .multiply(shoulder),
        );

      // Legs: the skin follows the MMD "D" bones (their link to 足/ひざ/足首
      // is an MMD-only constraint), so drive those directly. Each knee folds
      // while its leg swings forward and the ankle keeps the sole level.
      for (const [side, phase] of [
        ['左', 0],
        ['右', Math.PI],
      ] as const) {
        const hip = -Math.sin(p.stride + phase) * 0.28 * p.walk;
        const knee =
          (Math.max(0, Math.cos(p.stride + phase)) * 0.55 + 0.04) * p.walk;
        turn(`${side}足D`, hip, 0, 0);
        turn(`${side}ひざD`, knee, 0, 0);
        turn(`${side}足首D`, -(hip + knee) * 0.7, 0, 0);
      }
      morph('まばたき', p.blink);

      // Tails trail back while walking, bounce with each step, swing out
      // against her turns and sway in a breeze. Sized to read at the default
      // camera distance, where she is only a few dozen pixels tall.
      for (const tail of tails) {
        const phase = tail.side > 0 ? 0 : 1.9;
        const breeze =
          Math.sin(p.time * 1.5 + phase) * 0.22 +
          Math.sin(p.time * 2.9 + phase * 2) * 0.08;
        // Biased back and outward so the larger swing clears her body.
        const trail = tail.trail.step(
          0.06 +
            p.walk * 0.45 +
            Math.cos(p.stride * 2) * p.walk * 0.2 +
            breeze * 0.45,
          dt,
        );
        const lift = tail.lift.step(
          0.2 + breeze + Math.abs(swing) * 0.2 - yawRate * tail.side * 0.12,
          dt,
        );
        const twist = tail.twist.step(
          THREE.MathUtils.clamp(-yawRate * 0.3, -0.6, 0.6),
          dt,
        );
        const count = tail.chain.length;
        tail.chain.forEach((name, i) => {
          // Weights rise towards the tip and sum to about 1 along the chain.
          const weight = (0.5 + (i / count) * 1.0) / count;
          // A gentle wave travels down the tail so the hair never hangs rigid.
          const wave =
            Math.sin(p.time * 2.4 - i * 0.45 + phase) * (0.09 + p.walk * 0.08);
          turn(
            name,
            (trail + wave * 0.6) * weight,
            twist * weight,
            (lift + wave) * tail.side * weight,
          );
        });
      }
    },
  };
}
/** Damped spring for hair follow-through, sub-stepped for stability. */
class Spring {
  value = 0;
  private velocity = 0;
  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}
  step(target: number, dt: number) {
    const steps = Math.max(1, Math.ceil(dt / 0.016));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity +=
        (this.stiffness * (target - this.value) -
          this.damping * this.velocity) *
        h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}

export type SparkleModel = Awaited<ReturnType<typeof loadSparkleModel>>;
