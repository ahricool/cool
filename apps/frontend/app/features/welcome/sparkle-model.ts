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
/** Self-lit share of the albedo, saturation boost after lighting, and a
 *  contrast curve that deepens midtones so she doesn't read as washed out. */
const LIFT = 0.05;
const SATURATION = 1.8;
const CONTRAST = 1.3;
/** Eye, mouth, expression and inner cloth layers stay free of ink lines. */
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
  // Inner cloth layers sit just under their outer layer; their hulls would
  // poke through and paint the back skirt and sleeves dark.
  '裙后内侧',
  '袖子内侧',
  '头饰内侧',
]);

export type Mood = 'calm' | 'happy' | 'smug';
/** Expression morphs per mood; the GLB only carries these few. */
const moods: Record<Mood, Record<string, number>> = {
  calm: { にこり: 0.35, 笑い: 0, にやり２: 0 },
  happy: { にこり: 0.6, 笑い: 0.85, にやり２: 0 },
  smug: { にこり: 0.15, 笑い: 0.2, にやり２: 0.9 },
};

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
  /** Small eye darts on top of `look`, radians. */
  gaze: number;
  mood: Mood;
}

/**
 * Twin tails' calm hang, keyed along each tail (0 at the ribbon, 1 at the
 * tip): how far a segment leans out and back per unit of drop, and how far
 * the hair ribbon rolls about its length (radians, sign mirrored per side).
 */
const TAIL_KEYS = [
  [0, 0.26, -0.24, -0.15],
  [0.32, 0.17, -0.32, -0.32],
  [0.68, 0.05, -0.14, -0.42],
  [1, -0.16, 0.14, -0.3],
] as const;

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
    // Lift shadows slightly by the surface's own colour, then push saturation
    // and contrast so she reads as vividly as the painted scene.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `outgoingLight += diffuseColor.rgb * ${LIFT.toFixed(2)};
        float luma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
        outgoingLight = max(mix(vec3(luma), outgoingLight, ${SATURATION.toFixed(2)}), 0.0);
        outgoingLight = pow(outgoingLight, vec3(${CONTRAST.toFixed(2)}));
        #include <opaque_fragment>`,
      );
    };
    material.customProgramCacheKey = () => 'sparkle-model';
    // Only the colour map carries over; anything else the GLB attached goes now.
    for (const value of Object.values(source))
      if (value instanceof THREE.Texture && value !== source.map)
        value.dispose();
    source.dispose();
    part.material = material;
    part.frustumCulled = false;
    // She casts into the sun's shadow map; world.ts refreshes it only while
    // she moves, a dozen times a second at most.
    part.castShadow = true;
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

  // Short upper-arm sleeve cuffs (zxx_/yxx__) flare into a wide cone in the
  // PMX A-pose; relax each chain partway towards the upper arm axis so the
  // ruffled bell drapes naturally around the bicep once the arms come down.
  for (const [shoulder, prefix, side] of [
    ['左肩C', 'zxx_', 1],
    ['右肩C', 'yxx__', -1],
  ] as const) {
    const parentBone = bones.get(shoulder)?.bone;
    if (!parentBone) continue;
    for (const rootBone of parentBone.children) {
      if (!rootBone.name.startsWith(prefix)) continue;
      let tipBone = rootBone;
      while (tipBone.children[0]) tipBone = tipBone.children[0];
      const from = figure.worldToLocal(
        rootBone.getWorldPosition(new THREE.Vector3()),
      );
      const to = figure.worldToLocal(
        tipBone.getWorldPosition(new THREE.Vector3()),
      );
      const rest = to.sub(from).normalize();
      const cuffAxis = new THREE.Vector3(
        side * 0.64,
        -0.77,
        rest.z * 0.75,
      ).normalize();
      const relax = new THREE.Quaternion().slerp(
        new THREE.Quaternion().setFromUnitVectors(rest, cuffAxis),
        0.72,
      );
      rotate(rootBone.name, relax);
    }
  }

  // Back obi bow tails (ybs__/zbs_) flare sideways at rest; droop them down
  // beneath the rope bow so their gold hex pattern frames the center pleats.
  for (const [rootName, tipName, side] of [
    ['ybs__1', 'ybs__5', 1],
    ['zbs_0_1', 'zbs_4_1', -1],
  ] as const) {
    const a = bones.get(rootName)?.bone,
      b = bones.get(tipName)?.bone;
    if (!a || !b) continue;
    const from = figure.worldToLocal(a.getWorldPosition(new THREE.Vector3()));
    const to = figure.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    const rest = to.sub(from).normalize();
    const target = new THREE.Vector3(side * 0.85, -1, -0.42).normalize();
    rotate(rootName, new THREE.Quaternion().setFromUnitVectors(rest, target));
  }

  // Back skirt and long pink gradient tails (wh_*) splay out in a wide backward
  // cone at rest; bend them down past the hips so they drape vertically along
  // the backs of her thighs and sit cleanly inside the floral sleeve panels.
  const backSkirt = (bones.get('下半身')?.bone.children ?? [])
    .filter((bone) => bone.name.startsWith('wh_'))
    .map((rootBone) => {
      const chain: string[] = [];
      for (
        let cur: THREE.Object3D | undefined = rootBone;
        cur;
        cur = cur.children[0]
      )
        chain.push(cur.name);
      const tipBone = bones.get(chain[chain.length - 1]!)!.bone;
      const from = figure.worldToLocal(
        rootBone.getWorldPosition(new THREE.Vector3()),
      );
      const to = figure.worldToLocal(
        tipBone.getWorldPosition(new THREE.Vector3()),
      );
      const rest = to.sub(from).normalize();
      const upper = new THREE.Vector3(
        rest.x * 0.38,
        -1,
        rest.z * 0.72,
      ).normalize();
      const lower = new THREE.Vector3(rest.x * 0.28, -1, 0.02).normalize();
      const aim = new THREE.Quaternion().setFromUnitVectors(rest, upper);
      const bends = chain.slice(2, Math.min(6, chain.length));
      const step = new THREE.Quaternion().slerp(
        new THREE.Quaternion().setFromUnitVectors(upper, lower),
        1 / Math.max(1, bends.length),
      );
      const droop = aim.clone().invert().multiply(step).multiply(aim);
      for (const name of bends) rotate(name, droop);
      return { root: rootBone.name, aim };
    });

  // Long sleeve tails hang from the underside of each upper arm, close to
  // the armpit. Near the arm each one angles back behind the obi bow and
  // slightly inward with its floral face turned backward, then droops to
  // flare gently behind her outer thighs as on the official model.
  const sleeves = (
    [
      ['zx_', '左肩C', 1],
      ['yx__', '右肩C', -1],
    ] as const
  ).flatMap(([prefix, shoulder, side]) => {
    const chain = [...bones.keys()]
      .filter((name) => name.startsWith(prefix))
      .sort(
        (a, b) =>
          Number(a.slice(prefix.length).split('_')[0]) -
          Number(b.slice(prefix.length).split('_')[0]),
      );
    const upper = new THREE.Vector3(-side * 0.06, -1, -0.38).normalize();
    const lower = new THREE.Vector3(side * 0.12, -1, 0.01).normalize();
    const a = bones.get(chain[0]!)?.bone,
      b = bones.get(chain[chain.length - 1]!)?.bone;
    if (!a || !b) return [];
    const from = figure.worldToLocal(a.getWorldPosition(new THREE.Vector3()));
    const to = figure.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    const rest = to.sub(from).normalize();
    const aim = new THREE.Quaternion()
      .setFromAxisAngle(upper, side * 0.14)
      .multiply(new THREE.Quaternion().setFromUnitVectors(rest, upper));
    // Spread the droop from `upper` to `lower` over four bones a fifth to
    // half way down, expressed in the aimed chain's frame: aim⁻¹·step·aim.
    const bends = [0.18, 0.28, 0.38, 0.48].map(
      (t) => chain[Math.round(t * (chain.length - 1))]!,
    );
    const step = new THREE.Quaternion().slerp(
      new THREE.Quaternion().setFromUnitVectors(upper, lower),
      1 / bends.length,
    );
    const droop = aim.clone().invert().multiply(step).multiply(aim);
    return [{ root: chain[0]!, shoulder, aim, droop, bends }];
  });
  const parent = new THREE.Quaternion();
  const trail = new THREE.Quaternion();
  const morph = (name: string, value: number) => {
    for (const part of parts) {
      const index = part.morphTargetDictionary?.[name];
      if (index !== undefined && part.morphTargetInfluences)
        part.morphTargetInfluences[index] = value;
    }
  };
  const expression: Record<string, number> = { ...moods.calm };
  /** Finger names and how far each folds relative to the others. */
  const fingers = [
    ['人指', 0.9],
    ['中指', 1],
    ['薬指', 1.05],
    ['小指', 1.15],
  ] as const;

  // Twin tails: the PMX rest pose splays them out and back as if windswept.
  // The chain is laid along a calm hang instead (out past the shoulders and
  // falling well behind her back, as on the official model), and damped
  // springs bend it on top so the hair lags, overshoots and settles.
  const tails = (
    [
      ['zb_', 1],
      ['yb__', -1],
    ] as const
  ).map(([prefix, side]) => {
    const chain = [...bones.keys()]
      .filter((name) => name.startsWith(prefix))
      .sort(
        (a, b) =>
          Number(a.slice(prefix.length).split('_')[0]) -
          Number(b.slice(prefix.length).split('_')[0]),
      );
    const points = chain.map((name) =>
      figure.worldToLocal(
        bones.get(name)!.bone.getWorldPosition(new THREE.Vector3()),
      ),
    );
    const rests = points
      .slice(1)
      .map((point, i) => point.clone().sub(points[i]!));
    const lengths = rests.map((rest) => rest.length());
    rests.forEach((rest) => rest.normalize());
    const total = lengths.reduce((sum, length) => sum + length, 0);
    // The hang as a smooth curve through TAIL_KEYS: from the ribbon heading
    // out and back much as at rest, easing towards vertical (still well behind
    // her back) past the shoulders, the tips flicking out a little, and the
    // ribbon turning its broad side outwards as on the official model.
    let along = 0;
    const shape = lengths.map((length) => {
      const s = (along + length / 2) / total;
      along += length;
      const k = TAIL_KEYS.findIndex(([at]) => at >= s);
      const [a, b] = [TAIL_KEYS[Math.max(0, k - 1)]!, TAIL_KEYS[k]!];
      const f =
        b[0] > a[0]
          ? (1 - Math.cos((Math.PI * (s - a[0])) / (b[0] - a[0]))) / 2
          : 0;
      const mix = (n: 1 | 2 | 3) => THREE.MathUtils.lerp(a[n], b[n], f);
      return {
        target: new THREE.Vector3(side * mix(1), -1, mix(2)).normalize(),
        roll: side * mix(3),
      };
    });
    // Each segment bends from its parent as the curve does, carrying the
    // parent's roll along so the ribbon never kinks or twists at a joint,
    // then turns by its keyed roll. The rotations stack down the chain, so
    // each bone takes only F(i-1)⁻¹·F(i).
    const bend = new THREE.Quaternion(),
      unbend = new THREE.Quaternion();
    const carried: THREE.Quaternion[] = [];
    rests.forEach((rest, i) => {
      carried.push(
        i === 0
          ? new THREE.Quaternion().setFromUnitVectors(rest, shape[0]!.target)
          : bend
              .setFromUnitVectors(shape[i - 1]!.target, shape[i]!.target)
              .clone()
              .multiply(carried[i - 1]!)
              .multiply(
                unbend.setFromUnitVectors(rests[i - 1]!, rest).invert(),
              ),
      );
    });
    const frames = carried.map((frame, i) =>
      new THREE.Quaternion()
        .setFromAxisAngle(shape[i]!.target, shape[i]!.roll)
        .multiply(frame),
    );
    // The tip bone has no segment of its own and simply follows.
    frames.push(frames[frames.length - 1]!.clone());
    const aims = frames.map((frame, i) =>
      i === 0 ? frame : frames[i - 1]!.clone().invert().multiply(frame),
    );
    return {
      side,
      chain,
      aims,
      trail: new Spring(26, 3.2),
      lift: new Spring(22, 3),
      twist: new Spring(18, 3),
    };
  });
  let lastTime = 0,
    lastYaw = 0,
    initialized = false;
  // Cascaded springs give head turns and tilts a jerk-free S-curve: eyes dart
  // first, the neck initiates the turn, and the head follows with soft lag.
  const neckLookSpring = new Spring(14, 7.2);
  const headLookSpring = new Spring(11, 6.4);
  const headTiltSpring = new Spring(9, 5.8);
  const headPitchSpring = new Spring(10, 6.1);
  const eyeGazeSpring = new Spring(42, 12.8);

  return {
    root,
    /** Releases everything the model owns; the shared ramp stays with the scene. */
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>(),
        skeletons = new Set<THREE.Skeleton>();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        materials.add(object.material as THREE.Material);
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      });
      materials.forEach((material) => {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture && value !== ramp)
            textures.add(value);
        material.dispose();
      });
      textures.forEach((texture) => {
        if (
          typeof ImageBitmap !== 'undefined' &&
          texture.image instanceof ImageBitmap
        )
          texture.image.close();
        texture.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      // Frees each skeleton's bone texture.
      skeletons.forEach((skeleton) => skeleton.dispose());
    },
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
      const strideCos = Math.cos(p.stride) * p.walk;
      // Weight rests with a soft contrapposto bias and drifts gently while she stands.
      const shift =
        (0.28 + Math.sin(p.time * 0.32 * Math.PI * 2) * 0.82) * (1 - p.walk);
      // In model space (+x left, +y up, +z forward), +y rotation brings the
      // right (-x) side forward (+z) and the left (+x) side back (-z).
      // When the left leg steps forward (swing > 0), the pelvis turns -y to
      // advance the left hip, while the chest counter-rotates +y with the right arm.
      const hipYaw = -swing * 0.1 - shift * 0.03;
      const hipRoll = strideCos * 0.055 + shift * 0.038;
      const chestYaw = swing * 0.115 + shift * 0.025;
      // Light, buoyant bounce per step and gentle hip sway over the supporting foot.
      const bob = (Math.cos(p.stride * 2 - 0.22) - 0.85) * p.walk * 0.013;
      const swayX = -strideCos * 0.02 + shift * 0.012;
      if (center)
        center.position.set(
          centerRest.x + swayX * unit,
          centerRest.y + bob * unit,
          centerRest.z,
        );
      // Slight lumbar arch and lifted chest give a poised, girlish S-curve silhouette.
      turn(
        '下半身',
        -0.028 * (1 - p.walk) - 0.018 * p.walk,
        hipYaw,
        hipRoll,
      );
      turn(
        '上半身',
        -0.022 * (1 - p.walk) + 0.032 * p.walk,
        chestYaw * 0.65,
        -hipRoll * 0.65,
      );

      if (!initialized) {
        initialized = true;
        neckLookSpring.value = p.look;
        headLookSpring.value = p.look;
        eyeGazeSpring.value = p.gaze;
      }
      const neckLook = neckLookSpring.step(p.look, dt);
      const headLook = headLookSpring.step(neckLook, dt);
      const eyeGaze = eyeGazeSpring.step(p.gaze, dt);
      // Chin dips slightly along a natural arc while the head swings between glances.
      const turnArcDip = Math.min(0.045, Math.abs(neckLookSpring.velocity) * 0.045);
      const pitchTarget =
        -0.02 +
        turnArcDip +
        Math.abs(headLook) * 0.022 -
        Math.cos(p.time * 2.1) * 0.01 * (1 - p.walk);
      const headPitch = headPitchSpring.step(pitchTarget, dt);
      // Soft curious head tilt coupled to the glance, idle weight shift and a
      // playful per-step cadence, shared across both neck and head.
      const idleTiltWave =
        (Math.sin(p.time * 0.68 + 0.5) * 0.038 +
          Math.sin(p.time * 1.22) * 0.016) *
        (1 - p.walk);
      const walkTiltWave = -strideCos * 0.032 * p.walk;
      const tiltTarget =
        0.016 -
        neckLook * 0.14 +
        idleTiltWave +
        walkTiltWave +
        shift * 0.03 +
        hipRoll * 0.4;
      const headTilt = headTiltSpring.step(tiltTarget, dt);

      turn(
        '上半身2',
        0.018 + breath * 0.014 + 0.015 * p.walk,
        chestYaw * 0.55 + neckLook * 0.06,
        -hipRoll * 0.38 + headTilt * 0.1,
      );
      // Neck and head counter-stabilise the torso's yaw and roll, with a gentle nod per step.
      const nod = Math.sin(p.stride * 2 - 0.4) * p.walk * 0.018;
      turn(
        '首',
        headPitch * 0.45 + nod * 0.45,
        neckLook * 0.22 - chestYaw * 0.45,
        headTilt * 0.38,
      );
      turn(
        '頭',
        headPitch * 0.55 + nod * 0.55,
        headLook * 0.3 - chestYaw * 0.35,
        headTilt * 0.62,
      );
      // Eyes lead the head: they reach the glance target first and settle as the head arrives.
      const headYawTotal = neckLook * 0.22 + headLook * 0.3;
      const eyeLead = p.look * 0.52 - headYawTotal;
      const eyeYaw = THREE.MathUtils.clamp(
        headYawTotal * 0.45 + eyeLead * 0.65 + eyeGaze,
        -0.3,
        0.3,
      );
      turn('左目', -headPitch * 0.2, eyeYaw, 0);
      turn('右目', -headPitch * 0.2, eyeYaw, 0);

      // Collarbones subtly follow the arm swing and breathing lift.
      turn('左肩', 0, -swing * 0.045, -0.015 * (1 + breath * 0.3));
      turn('右肩', 0, -swing * 0.045, 0.015 * (1 + breath * 0.3));

      // Arms hang close to the waist from the A-pose at the shoulder, tucking
      // gently inward as they swing with softly bent elbows for a dainty silhouette.
      const down = 0.64 + breath * 0.008;
      const armPose = (phase: number, sign: 1 | -1) => {
        const s = Math.sin(p.stride + phase - 0.16) * p.walk;
        // s < 0 swings the downward arm forward (+z); s > 0 swings it back (-z).
        const pitch =
          (s < 0 ? s * 0.28 : s * 0.19) - 0.025 * (1 - p.walk) - 0.02 * p.walk;
        // Internal humeral rotation (-sign) aims the bent forearm slightly inward
        // across the front of the waist, increasing on the forward swing (s < 0).
        const yaw =
          -sign *
          (0.11 +
            (0.05 + Math.max(0, -s) * 0.14 - Math.max(0, s) * 0.04) * p.walk);
        // Adduct inward during the walk (especially on the forward swing) so
        // the upper arms never flare out to the sides.
        const walkInward = (0.045 + Math.max(0, -s) * 0.065) * p.walk;
        const roll = -sign * (down + walkInward);
        const shoulder = new THREE.Quaternion()
          .setFromEuler(euler.set(pitch, yaw, 0))
          .multiply(delta.setFromEuler(euler.set(0, 0, roll)));
        // Forearm stays softly flexed at rest and through the stride, angling
        // gently inward towards the front of the waist.
        const foreAngle = p.stride + phase - 0.42;
        const foreWave = Math.sin(foreAngle);
        const elbowBend =
          0.18 * (1 - p.walk) +
          (0.27 - foreWave * 0.12 - Math.cos(foreAngle * 2) * 0.025) * p.walk;
        const elbowInward =
          0.11 * (1 - p.walk) +
          (0.16 + Math.max(0, -s) * 0.08) * p.walk;
        const wristFlex =
          -0.04 * (1 - p.walk) +
          Math.sin(p.stride + phase - 0.75) * 0.07 * p.walk;
        return { shoulder, elbowBend, elbowInward, wristFlex, swing: s };
      };
      const leftArm = armPose(0, 1);
      const rightArm = armPose(Math.PI, -1);
      const shoulders = {
        左肩C: leftArm.shoulder,
        右肩C: rightArm.shoulder,
      };
      const curl = 0.32 + p.walk * 0.06;
      rotate('左肩C', shoulders.左肩C);
      rotate('右肩C', shoulders.右肩C);
      for (const hem of backSkirt) {
        trail.setFromEuler(euler.set(p.walk * 0.08, 0, 0));
        rotate(hem.root, trail.multiply(hem.aim));
      }
      // Cancel the shoulder turn above each long sleeve tail, then hang it
      // straight down, trailing smoothly with its arm and the breeze.
      for (const sleeve of sleeves) {
        const arm = sleeve.shoulder === '左肩C' ? leftArm : rightArm;
        parent.copy(shoulders[sleeve.shoulder]);
        trail.setFromEuler(
          euler.set(
            p.walk * 0.15 + Math.max(0, -arm.swing) * 0.1 - arm.swing * 0.06,
            0,
            0,
          ),
        );
        rotate(
          sleeve.root,
          parent.invert().multiply(trail).multiply(sleeve.aim),
        );
        for (const name of sleeve.bends) rotate(name, sleeve.droop);
      }
      // Elbows bend forward and gently inward (z-axis adduction on the downward
      // forearm), with softly cocked wrists and delicately fanned fingers.
      for (const [side, sign, arm] of [
        ['左', 1, leftArm],
        ['右', -1, rightArm],
      ] as const) {
        rotate(
          `${side}ひじ`,
          parent
            .copy(arm.shoulder)
            .invert()
            .multiply(
              delta.setFromEuler(
                euler.set(
                  -arm.elbowBend,
                  -sign * 0.04,
                  -sign * arm.elbowInward,
                ),
              ),
            )
            .multiply(arm.shoulder),
        );
        turn(`${side}手首`, arm.wristFlex, -sign * 0.05, -sign * 0.06);
        // Fingers fold towards the palm, fanning from index to pinky.
        for (const [finger, scale] of fingers)
          [0.45, 0.9, 0.68].forEach((share, i) =>
            turn(
              `${side}${finger}${'１２３'[i]}`,
              0,
              0,
              -sign * curl * share * scale,
            ),
          );
        turn(`${side}親指１`, 0, sign * curl * 0.28, -sign * curl * 0.18);
        turn(`${side}親指２`, 0, sign * curl * 0.36, 0);
      }

      // Legs: the skin follows the MMD "D" bones (their link to 足/ひざ/足首
      // is an MMD-only constraint), so drive those directly. Gently adducted
      // thighs and a slight inward knee turn create a feminine, youthful line
      // both in contrapposto standing and along a narrow walking track.
      for (const [side, phase, sign] of [
        ['左', 0, 1],
        ['右', Math.PI, -1],
      ] as const) {
        const s = p.stride + phase;
        const sin1 = Math.sin(s);
        // Slightly fuller forward reach than back extension, with smooth C∞ velocity.
        const hip = (-sin1 * 0.29 + Math.cos(s * 2) * 0.03 - 0.02) * p.walk;
        // Relaxed contrapposto knee bend on the unweighted leg while standing.
        const rest = Math.max(0, -sign * shift) * 0.15;
        // Smooth raised wave peaking in mid-swing (s ≈ 0.15) plus stance cushion.
        const swingBell = 0.5 + 0.5 * Math.cos(s - 0.18);
        const knee =
          (swingBell * swingBell * 0.58 + 0.035) * p.walk + rest;
        // Push down at toe-off (s ≈ -1.1), lift toes during swing (s ≈ +0.9).
        const ankle =
          -(hip + knee) * 0.72 + Math.sin(s - 0.9) * 0.12 * p.walk;
        // Feminine inward thigh adduction and subtle inward knee rotation.
        const adduction = -sign * (0.036 + 0.026 * p.walk);
        const inwardTurn = -sign * (0.072 * (1 - p.walk) + 0.042 * p.walk);
        turn(
          `${side}足D`,
          hip - rest * 0.58,
          inwardTurn,
          adduction,
        );
        turn(`${side}ひざD`, knee, 0, 0);
        turn(`${side}足首D`, ankle, -inwardTurn * 0.35, -adduction * 0.65);
      }
      // Ease the face towards the mood rather than snapping between them.
      const ease = Math.min(1, dt * 6);
      for (const [name, value] of Object.entries(moods[p.mood])) {
        expression[name] =
          (expression[name] ?? 0) + (value - (expression[name] ?? 0)) * ease;
        morph(name, expression[name]!);
      }
      morph('まばたき', p.blink * (1 - expression['笑い']!));

      // Tails trail back while walking, bounce with each step, swing out
      // against her turns and sway in a breeze. Sized to read at the default
      // camera distance, where she is only a few dozen pixels tall.
      for (const tail of tails) {
        const phase = tail.side > 0 ? 0 : 1.9;
        const breeze =
          Math.sin(p.time * 1.5 + phase) * 0.22 +
          Math.sin(p.time * 2.9 + phase * 2) * 0.08;
        // Walking trails them back and each step bounces them.
        const trail = tail.trail.step(
          p.walk * 0.3 + Math.cos(p.stride * 2) * p.walk * 0.2 + breeze * 0.3,
          dt,
        );
        const headTurnRate = yawRate + neckLookSpring.velocity * 0.45;
        const lift = tail.lift.step(
          breeze * 0.5 +
            Math.abs(swing) * 0.2 -
            headTurnRate * tail.side * 0.12 -
            headTilt * tail.side * 0.18,
          dt,
        );
        const twist = tail.twist.step(
          THREE.MathUtils.clamp(-headTurnRate * 0.3, -0.6, 0.6),
          dt,
        );
        const count = tail.chain.length;
        tail.chain.forEach((name, i) => {
          // Weights rise towards the tip and sum to about 1 along the chain.
          const weight = (0.5 + (i / count) * 1.0) / count;
          // A gentle wave travels down the tail so the hair never hangs rigid.
          const wave =
            Math.sin(p.time * 2.4 - i * 0.45 + phase) * (0.09 + p.walk * 0.08);
          euler.set(
            (trail + wave * 0.6) * weight,
            twist * weight,
            (lift + wave) * tail.side * weight,
          );
          rotate(name, delta.setFromEuler(euler).multiply(tail.aims[i]!));
        });
      }
    },
  };
}
/** Damped spring for hair follow-through, sub-stepped for stability. */
class Spring {
  value = 0;
  velocity = 0;
  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}
  step(target: number, dt: number) {
    if (dt <= 0) return this.value;
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
