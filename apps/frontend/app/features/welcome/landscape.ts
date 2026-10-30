import * as THREE from 'three';
import type { Daylight } from './daylight';
import { groundAt, lanterns, meadow, plinth } from './layout';
import {
  streamClearance,
  streamEdges,
  streamGeometry,
  streamPoints,
} from './stream';
import { palette, seeded, ToonBuilder, type SharedUniforms } from './toon';

const color = (tone: keyof typeof palette) => new THREE.Color(palette[tone]);

interface HazeOptions {
  near: number;
  far: number;
  strength: number;
  /** Broad light and dark drifts across the ground, independent of mesh density. */
  patches?: boolean;
  /** Sun-coloured edge light along the upper slopes of the ridges. */
  crest?: { value: THREE.Color };
  /** Scene clock for running water: light streaks drift down the brook. */
  flow?: { value: number };
}

/** Value noise shared by the meadow patches and running water. */
export const noiseGlsl = /* glsl */ `
  float hazeHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float hazeNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hazeHash(i), hazeHash(i + vec2(1.0, 0.0)), f.x),
      mix(hazeHash(i + vec2(0.0, 1.0)), hazeHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;
/** Brook water, also used for the purification basin. */
export const waterColor = 0x6ccbe0;
/**
 * Cel water: pale shallows at the edges, a deeper middle and light streaks;
 * hard steps keep it in the cel style. Expects `across` (0 at the middle,
 * 1 at the edge) and `streak` (noise drifting with the current) in scope.
 */
export const waterGlsl = /* glsl */ `
  diffuseColor.rgb *= mix(0.86, 1.0, step(0.38, across));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.97, 1.0),
    max(step(0.72, across) * 0.45, step(0.74, streak) * step(across, 0.6) * 0.6));
`;

/**
 * A few small cel-shaded goldfish lazily looping in the wider pools of the
 * brook: plump body, pectoral fins and a forked fan tail undulating beneath
 * the surface streaks.
 */
const goldfishGlsl = /* glsl */ `
  void addGoldfish(
    inout vec3 col,
    vec2 p,
    float homeU,
    float homeV,
    float scale,
    float speed,
    float phase,
    vec3 bodyTint,
    vec3 spotTint
  ) {
    if (abs(p.x - homeU) > 1.8) return;
    float t = flowTime * speed + phase;
    vec2 center = vec2(
      homeU + sin(t) * 0.82 + cos(t * 0.5) * 0.18,
      homeV + sin(t * 2.0 + 0.7) * 0.22
    );
    vec2 vel = vec2(
      cos(t) * 0.82 - sin(t * 0.5) * 0.09,
      cos(t * 2.0 + 0.7) * 0.44
    );
    vec2 dir = normalize(vel);
    vec2 rel = (p - center) / scale;
    float lx = dot(rel, dir);
    float ly = dot(rel, vec2(-dir.y, dir.x));
    if (lx < -1.1 || lx > 0.65 || abs(ly) > 0.6) return;

    float tailFlex = smoothstep(0.35, -0.95, lx);
    float wiggle = sin(flowTime * 5.6 + phase * 3.7 + lx * 4.2) * 0.16 * tailFlex;
    float wy = ly - wiggle;
    float ay = abs(wy);

    // Subtle riverbed shadow just below the swimming fish.
    float sx = lx + 0.07;
    float sy = abs(ly + 0.13 - wiggle * 0.7);
    float sbt = clamp((sx + 0.38) / 0.9, 0.0, 1.0);
    if (sx > -0.38 && sx < 0.52 && sy < 0.42 * pow(sbt, 0.55) * sqrt(max(0.0, 1.0 - sbt))) {
      col *= 0.85;
    }

    // Rounded snout at lx = 0.52, plump belly around lx = 0.12, narrow tail stalk at lx = -0.38.
    float bt = clamp((lx + 0.38) / 0.9, 0.0, 1.0);
    float bodyHalf = 0.035 * (1.0 - bt) + 0.43 * pow(bt, 0.58) * sqrt(max(0.0, 1.0 - bt));
    float inBody = step(ay, bodyHalf) * step(-0.38, lx) * step(lx, 0.52);

    // Double fan tail: two rounded veil lobes spreading from the tail stalk.
    float tt = clamp((-0.32 - lx) / 0.66, 0.0, 1.0);
    float lobeCenter = 0.03 + tt * 0.17;
    float lobeHalf = (0.045 + tt * 0.09) * sin(pow(tt, 0.45) * 3.14159);
    float inTail = step(abs(ay - lobeCenter), lobeHalf) * step(-0.98, lx) * step(lx, -0.32);

    // Swept pectoral fins beside the gills.
    float finAlong = (ay - 0.14) / 0.2;
    float finCenter = 0.12 - finAlong * 0.11;
    float finHalf = 0.065 * sin(clamp(finAlong, 0.0, 1.0) * 3.14159);
    float inFins = step(abs(lx - finCenter), finHalf) * step(0.14, ay) * step(ay, 0.34);

    float fish = max(inBody, max(inTail, inFins));
    if (fish > 0.5) {
      vec3 ivory = vec3(0.98, 0.92, 0.78);
      vec3 fishCol = inBody > 0.5
        ? mix(bodyTint, spotTint, step(0.1, lx) * step(lx, 0.38) * step(ay, 0.11))
        : mix(bodyTint, ivory, smoothstep(0.1, 0.55, tt + inFins * 0.55));
      col = mix(col, fishCol, 0.88);
    }
  }
`;

/**
 * Cel material that fades into the horizon colour with distance, so the meadow
 * edge and far ridges melt into the sky dome like aerial perspective.
 */
function hazeMaterial(
  name: string,
  ramp: THREE.Texture,
  haze: { value: THREE.Color },
  { near, far, strength, patches = false, crest, flow }: HazeOptions,
) {
  const material = new THREE.MeshToonMaterial({
    gradientMap: ramp,
    vertexColors: true,
  });
  material.name = name;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.haze = haze;
    if (crest) shader.uniforms.crest = crest;
    if (flow) shader.uniforms.flowTime = flow;
    shader.vertexShader =
      `varying vec3 vHazeWorld;\n${flow ? 'attribute vec3 flow;\nvarying vec3 vFlow;\n' : ''}${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      vHazeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;${flow ? '\n      vFlow = flow;' : ''}`,
      );
    let fragment = `uniform vec3 haze;\n${crest ? 'uniform vec3 crest;\n' : ''}${flow ? `uniform float flowTime;\nvarying vec3 vFlow;\n${goldfishGlsl}\n` : ''}varying vec3 vHazeWorld;
      ${noiseGlsl}
      ${shader.fragmentShader}`;
    if (patches)
      fragment = fragment.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 drift = vHazeWorld.xz * 0.065;
        float patchy = hazeNoise(drift) * 0.65 + hazeNoise(drift * 2.3 + 7.1) * 0.35;
        diffuseColor.rgb *= mix(0.76, 1.12, smoothstep(0.25, 0.75, patchy));`,
      );
    if (flow)
      fragment = fragment.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vFlow.z > 0.5) {
          // Gentle current and a few easter-egg goldfish looping in the pools.
          float across = abs(vFlow.y * 2.0 - 1.0);
          float streak = hazeNoise(vec2(vFlow.x * 0.32 - flowTime * 0.16, vFlow.y * 4.0));
          vec2 fishUv = vec2(vFlow.x, (vFlow.y - 0.5) * 2.2);
          addGoldfish(diffuseColor.rgb, fishUv, 91.2, -0.06, 0.155, 0.22, 1.9, vec3(0.86, 0.045, 0.02), vec3(0.98, 0.92, 0.78));
          addGoldfish(diffuseColor.rgb, fishUv, 99.0, -0.08, 0.145, 0.2, 3.2, vec3(0.94, 0.22, 0.02), vec3(0.82, 0.04, 0.02));
          addGoldfish(diffuseColor.rgb, fishUv, 105.2, 0.1, 0.15, 0.23, 4.8, vec3(0.84, 0.05, 0.02), vec3(0.98, 0.92, 0.78));
          ${waterGlsl}
        }`,
      );
    shader.fragmentShader = fragment.replace(
      '#include <opaque_fragment>',
      `${
        crest
          ? `float crestEdge = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0);
        outgoingLight += crest * crestEdge * smoothstep(3.0, 14.0, vHazeWorld.y);`
          : ''
      }
        outgoingLight = mix(outgoingLight, haze,
          smoothstep(${near.toFixed(1)}, ${far.toFixed(1)}, length(vHazeWorld.xz)) * ${strength.toFixed(2)});
        #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () =>
    `welcome-haze-${near}-${far}-${strength}-${patches}-${!!crest}-${!!flow}`;
  return material;
}

/** Soft dark ring where the stone base meets the grass. */
function contactShadow() {
  const reach = 2.2;
  const size = (plinth.half + reach) * 2;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      name: 'plinth-contact',
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: { tint: { value: new THREE.Color(0x26381f) } },
      vertexShader: /* glsl */ `
        varying vec2 local;
        void main() {
          local = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 tint;
        varying vec2 local;
        void main() {
          // Distance to the rounded square of the plinth footprint.
          vec2 q = abs(local) - vec2(${(plinth.half - plinth.radius).toFixed(2)});
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${plinth.radius.toFixed(2)};
          float shade = 1.0 - smoothstep(0.0, ${reach.toFixed(1)}, d);
          gl_FragColor = vec4(tint, shade * shade * 0.42);
          #include <colorspace_fragment>
        }`,
    }),
  );
  mesh.name = 'plinth-contact';
  mesh.position.y = meadow.y + 0.01;
  mesh.renderOrder = 1;
  return mesh;
}

/** Warm pools of lamplight on the ground below each stone lantern. */
function lanternPools() {
  const glow = { value: 0 };
  const material = new THREE.ShaderMaterial({
    name: 'lantern-pool',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: { glow, warm: { value: new THREE.Color(0xffa850) } },
    vertexShader: /* glsl */ `
      varying vec2 local;
      void main() {
        local = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float glow;
      uniform vec3 warm;
      varying vec2 local;
      void main() {
        float falloff = 1.0 - smoothstep(0.0, 1.0, length(local) / 1.5);
        gl_FragColor = vec4(warm * falloff * falloff * glow, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.CircleGeometry(1.5, 32);
  geometry.rotateX(-Math.PI / 2);
  const root = new THREE.Group();
  root.name = 'lantern-pools';
  for (const { x, z } of lanterns) {
    const pool = new THREE.Mesh(geometry, material);
    pool.position.set(x, groundAt(x, z) + 0.03, z);
    pool.renderOrder = 2;
    root.add(pool);
  }
  root.visible = false;
  return { root, glow };
}

/** Soft late-summer patches: green lawn drying to straw in broad drifts. */
function meadowColor(x: number, z: number, target: THREE.Color) {
  const n =
    Math.sin(x * 0.11 + z * 0.07) * 0.5 +
    Math.sin(x * 0.23 - z * 0.19 + 1.3) * 0.3 +
    Math.sin(x * 0.53 + z * 0.41 + 2.1) * 0.2;
  const dry = THREE.MathUtils.smoothstep(n, 0.1, 0.65);
  const deep = THREE.MathUtils.smoothstep(-n, 0.25, 0.75);
  return target
    .copy(color('meadow'))
    .lerp(color('meadowDry'), dry * 0.75)
    .lerp(color('meadowDeep'), deep * 0.6);
}

/**
 * Ring of the meadow disc, warped so detail sits near the plinth. Split so
 * only the inner disc (inside the sun shadow camera) samples the depth map.
 */
function meadowRing(
  inner: number,
  outer: number,
  rings: number,
  sectors: number,
) {
  const field = new THREE.RingGeometry(inner, outer, sectors, rings);
  field.rotateX(-Math.PI / 2);
  const fieldPosition = field.getAttribute('position');
  for (let i = 0; i < fieldPosition.count; i++) {
    const x = fieldPosition.getX(i),
      z = fieldPosition.getZ(i);
    const r = Math.hypot(x, z);
    const scaled = meadow.radius * (r / meadow.radius) ** 1.6;
    const k = r > 0 ? scaled / r : 0;
    fieldPosition.setXYZ(i, x * k, 0, z * k);
  }
  const fieldColors = new Float32Array(fieldPosition.count * 3);
  const patch = new THREE.Color();
  for (let i = 0; i < fieldPosition.count; i++)
    meadowColor(fieldPosition.getX(i), fieldPosition.getZ(i), patch).toArray(
      fieldColors,
      i * 3,
    );
  field.setAttribute('color', new THREE.BufferAttribute(fieldColors, 3));
  field.deleteAttribute('uv');
  return field;
}

/** A ridge of peaks: a noisy cone whose silhouette rises to one summit. */
function mountainGeometry(
  random: () => number,
  radius: number,
  height: number,
  tint: THREE.Color,
) {
  const geometry = new THREE.ConeGeometry(radius, height, 28, 7, true);
  geometry.translate(0, height / 2, 0);
  const position = geometry.getAttribute('position');
  const phases = [random() * 6, random() * 6, random() * 6];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const a = Math.atan2(z, x);
    const ridge =
      1 +
      Math.sin(a * 2 + phases[0]!) * 0.18 +
      Math.sin(a * 5 + phases[1]!) * 0.08 +
      Math.sin(a * 9 + phases[2]!) * 0.04;
    const t = y / height;
    position.setXYZ(i, x * ridge, y * (1 + (ridge - 1) * 0.6 * t), z * ridge);
  }
  // Smooth normals on the indexed mesh give soft cel bands instead of facets.
  geometry.computeVertexNormals();
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  const colors = new Float32Array(flat.getAttribute('position').count * 3);
  const shade = new THREE.Color();
  for (let i = 0; i < colors.length / 3; i++) {
    const t = flat.getAttribute('position').getY(i) / height;
    // Forested lower slopes, lighter rock towards the summits.
    shade.copy(tint).offsetHSL(0, -0.05 * t, 0.08 * t);
    shade.toArray(colors, i * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

/** The meadow the plinth rests on, low shrubs and a ring of distant mountains. */
export function createLandscape(
  shared: SharedUniforms,
  ramp: THREE.Texture,
  mobile: boolean,
) {
  const root = new THREE.Group();
  root.name = 'welcome-landscape';
  // The meadow edge meets the low pink mist; the ridges fade towards the horizon.
  const haze = { value: new THREE.Color(0xffd8e2) };
  const ridgeHaze = { value: new THREE.Color(0xf8e8cc) };
  const crest = { value: new THREE.Color() };
  const random = seeded(2024);

  // Inner disc sits in the sun shadow camera; the far field only needs colour.
  const split = 28;
  const paint = hazeMaterial('meadow', ramp, haze, {
    near: 24,
    far: meadow.radius,
    strength: 0.85,
    patches: true,
  });
  const lawn = new THREE.Mesh(meadowRing(0.01, split + 0.2, 16, 64), paint);
  lawn.name = 'meadow';
  lawn.position.y = meadow.y;
  lawn.receiveShadow = true;
  const farLawn = new THREE.Mesh(
    meadowRing(split - 0.2, meadow.radius, 24, 64),
    paint,
  );
  farLawn.name = 'meadow-far';
  farLawn.position.y = meadow.y;
  const pools = lanternPools();
  // The brook: flat cel strips laid on the lawn, fading into the mist with it.
  const brook = new THREE.Mesh(
    streamGeometry({
      water: new THREE.Color(waterColor),
      sand: new THREE.Color(0xdccb98),
      bank: color('meadowDeep'),
    }),
    hazeMaterial('brook', ramp, haze, {
      near: 24,
      far: meadow.radius,
      strength: 0.85,
      flow: shared.time,
    }),
  );
  brook.name = 'brook';
  brook.material.polygonOffset = true;
  brook.material.polygonOffsetFactor = -1;
  brook.material.polygonOffsetUnits = -1;
  root.add(lawn, farLawn, brook, contactShadow(), pools.root);

  // Low shrubs in light and deep greens, so they read as bushes on the lawn.
  const b = new ToonBuilder();
  const tones = [
    'shrubGreen',
    'shrubDeep',
    'shrubLight',
    'shrubOlive',
    'shrubDeep',
    'shrubGreen',
  ] as const;
  const shrubCount = mobile ? 34 : 60;
  for (let i = 0; i < shrubCount; i++) {
    const a = random() * Math.PI * 2;
    const r = plinth.half * 1.55 + random() ** 1.4 * 22;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (streamClearance(x, z) < 0.6) continue;
    const size = 0.22 + random() * 0.32;
    const tone = tones[i % tones.length]!;
    const puffs = 2 + Math.floor(random() * 3);
    for (let j = 0; j < puffs; j++) {
      const ox = (random() - 0.5) * size * 1.6,
        oz = (random() - 0.5) * size * 1.6;
      const s = size * (0.7 + random() * 0.5);
      b.ball(
        s,
        j === puffs - 1 && random() < 0.4 ? 'shrubLight' : tone,
        x + ox,
        meadow.y + s * 0.45,
        z + oz,
        [1.15, 0.72, 1.05],
        {},
        1,
      );
    }
  }
  // Where the stone base meets the lawn: a few bushes and mossy rocks, each
  // with a small tuft of grass, rather than a continuous fringe.
  const edge = plinth.half + 0.02;
  const tuft = (x: number, z: number) => {
    for (let j = 0; j < 3; j++) {
      const height = 0.14 + random() * 0.16;
      b.cylinder(
        0.03,
        0,
        height,
        j ? 'meadowDeep' : 'shrubGreen',
        x + (random() - 0.5) * 0.16,
        meadow.y + height / 2 - 0.02,
        z + (random() - 0.5) * 0.16,
        4,
        {
          rotation: [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5],
          outline: false,
        },
      );
    }
  };
  const perSide = mobile ? 3 : 4;
  for (let side = 0; side < 4; side++)
    for (let i = 0; i < perSide; i++) {
      const along = -edge + ((i + 0.2 + random() * 0.6) / perSide) * edge * 2;
      const out = 0.22 + random() * 0.3;
      const place = (offset: number, spread = 0): [number, number] =>
        side === 0
          ? [along + spread, edge + offset]
          : side === 1
            ? [along + spread, -edge - offset]
            : side === 2
              ? [edge + offset, along + spread]
              : [-edge - offset, along + spread];
      const [x, z] = place(out);
      if ((i + side) % 2 === 0) {
        // A low bush hugging the wall.
        const size = 0.3 + random() * 0.14;
        for (let j = 0; j < 4; j++) {
          const s = size * (0.7 + random() * 0.4);
          b.ball(
            s,
            j === 3 ? 'shrubLight' : j % 2 ? 'shrubGreen' : 'shrubDeep',
            x + (random() - 0.5) * size * 1.8,
            meadow.y + s * 0.5,
            z + (random() - 0.5) * size * 1.2,
            [1.2, 0.78, 1.05],
            {},
            1,
          );
        }
      } else {
        // One or two faceted rocks, some with a cap of moss.
        const stones = 1 + Math.floor(random() * 2);
        for (let j = 0; j < stones; j++) {
          const s = (j ? 0.14 : 0.22) + random() * 0.08;
          const [rx, rz] = place(out + j * 0.12, j ? 0.32 : 0);
          b.part(
            new THREE.DodecahedronGeometry(s, 0),
            random() < 0.4 ? 'stoneDark' : 'stone',
            rx,
            meadow.y + s * 0.3,
            rz,
            {
              scale: [1.2, 0.7, 1],
              rotation: [random(), random() * 3, random() * 0.3],
            },
          );
          if (random() < 0.6)
            b.ball(
              s * 0.55,
              'moss',
              rx + s * 0.2,
              meadow.y + s * 0.62,
              rz,
              [1.4, 0.35, 1.2],
              { outline: false },
            );
        }
      }
      const [tx, tz] = place(out * 0.6, (random() < 0.5 ? -1 : 1) * 0.45);
      tuft(tx, tz);
    }
  // Along the brook: mossy stones and clumps of reeds on the near banks.
  const rock = (x: number, z: number, size: number) => {
    b.part(
      new THREE.DodecahedronGeometry(size, 0),
      random() < 0.4 ? 'stoneDark' : 'stone',
      x,
      meadow.y + size * 0.3,
      z,
      {
        scale: [1.2, 0.7, 1],
        rotation: [random(), random() * 3, random() * 0.3],
      },
    );
    if (random() < 0.5)
      b.ball(
        size * 0.55,
        'moss',
        x + size * 0.2,
        meadow.y + size * 0.62,
        z,
        [1.4, 0.35, 1.2],
        { outline: false },
      );
  };
  const reeds = (x: number, z: number) => {
    for (let j = 0; j < 5; j++) {
      const height = 0.35 + random() * 0.35;
      b.cylinder(
        0.028,
        0,
        height,
        j % 2 ? 'shrubOlive' : 'meadowDeep',
        x + (random() - 0.5) * 0.3,
        meadow.y + height / 2,
        z + (random() - 0.5) * 0.3,
        4,
        {
          rotation: [(random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3],
          outline: false,
        },
      );
    }
  };
  const every = mobile ? 9 : 6;
  for (let i = every; i + 1 < streamPoints.length; i += every) {
    const point = streamPoints[i]!,
      next = streamPoints[i + 1]!;
    if (Math.hypot(point.x, point.z) > 32) continue;
    const length = Math.hypot(next.x - point.x, next.z - point.z);
    const sx = -(next.z - point.z) / length,
      sz = (next.x - point.x) / length;
    const side = random() < 0.5 ? -1 : 1;
    const out = streamEdges(point.width).sand + 0.05 + random() * 0.3;
    const x = point.x + sx * side * out,
      z = point.z + sz * side * out;
    const pick = random();
    if (pick < 0.45) rock(x, z, 0.16 + random() * 0.14);
    else if (pick < 0.8) reeds(x, z);
  }
  // A few stones breaking the water where the brook passes the front.
  for (const at of [0.53, 0.56, 0.6]) {
    const point = streamPoints[Math.round(streamPoints.length * at)]!;
    if (Math.hypot(point.x, point.z) < 20)
      rock(
        point.x + (random() - 0.5) * point.width,
        point.z + (random() - 0.5) * point.width,
        0.13 + random() * 0.08,
      );
  }
  // Grass tufts scattered further out.
  for (let i = 0; i < (mobile ? 40 : 80); i++) {
    const a = random() * Math.PI * 2;
    const r = plinth.half * 1.45 + random() * 9;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (streamClearance(x, z) < 0.2) continue;
    for (let j = 0; j < 3; j++)
      b.cylinder(
        0.035,
        0,
        0.3 + random() * 0.25,
        j ? 'meadowDeep' : 'shrubOlive',
        x + (random() - 0.5) * 0.2,
        meadow.y + 0.15,
        z + (random() - 0.5) * 0.2,
        4,
        {
          rotation: [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5],
          outline: false,
        },
      );
  }
  const shrubs = b.build(shared, ramp);
  shrubs.name = 'shrubs';
  shrubs.traverse((object) => {
    object.castShadow = false;
    object.receiveShadow = false;
  });
  root.add(shrubs);

  // Two layers of ridges around the horizon: green near, blue-grey far.
  const ranges: THREE.BufferGeometry[] = [];
  const layers = [
    {
      count: mobile ? 9 : 13,
      distance: 56,
      spread: 8,
      height: [7, 12],
      radius: [12, 18],
      tint: color('mountain'),
    },
    {
      count: mobile ? 8 : 11,
      distance: 76,
      spread: 6,
      height: [13, 21],
      radius: [17, 26],
      tint: color('mountainFar'),
    },
  ];
  for (const layer of layers)
    for (let i = 0; i < layer.count; i++) {
      const a = ((i + random() * 0.6) / layer.count) * Math.PI * 2;
      const d = layer.distance + random() * layer.spread;
      const geometry = mountainGeometry(
        random,
        THREE.MathUtils.lerp(layer.radius[0]!, layer.radius[1]!, random()),
        THREE.MathUtils.lerp(layer.height[0]!, layer.height[1]!, random()),
        layer.tint
          .clone()
          .offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.04),
      );
      geometry.translate(Math.cos(a) * d, meadow.y - 0.6, Math.sin(a) * d);
      ranges.push(geometry);
    }
  const merged = mergeAll(ranges);
  const mountains = new THREE.Mesh(
    merged,
    hazeMaterial('mountains', ramp, ridgeHaze, {
      near: 30,
      far: 90,
      strength: 0.9,
      crest,
    }),
  );
  mountains.name = 'mountains';
  root.add(mountains);

  return {
    root,
    setDaylight(state: Daylight) {
      haze.value.copy(state.skyMist).lerp(state.skyHorizon, 0.25);
      ridgeHaze.value.copy(state.skyHorizon).lerp(state.skyMist, 0.3);
      crest.value
        .copy(state.sunColor)
        .multiplyScalar(state.sunIntensity * 0.32);
    },
    /** Lamplight on the ground, 0 by day; follows the lantern flicker. */
    setLamps(intensity: number) {
      pools.glow.value = Math.min(1, intensity / 2.4) * 0.3;
      pools.root.visible = pools.glow.value > 0.005;
    },
  };
}

function mergeAll(pieces: THREE.BufferGeometry[]) {
  let count = 0;
  for (const piece of pieces) count += piece.getAttribute('position').count;
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const array = new Float32Array(count * 3);
    let offset = 0;
    for (const piece of pieces) {
      const attribute = piece.getAttribute(name);
      array.set(attribute.array as Float32Array, offset);
      offset += attribute.count * 3;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, 3));
  }
  pieces.forEach((piece) => piece.dispose());
  return merged;
}
