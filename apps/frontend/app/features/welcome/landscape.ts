import * as THREE from 'three';
import type { Daylight } from './daylight';
import { meadow, plinth } from './layout';
import { palette, seeded, ToonBuilder, type SharedUniforms } from './toon';

const color = (tone: keyof typeof palette) => new THREE.Color(palette[tone]);

/**
 * Cel material that fades into the horizon colour with distance, so the meadow
 * edge and far ridges melt into the sky dome like aerial perspective.
 */
function hazeMaterial(
  name: string,
  ramp: THREE.Texture,
  haze: { value: THREE.Color },
  near: number,
  far: number,
  strength: number,
) {
  const material = new THREE.MeshToonMaterial({
    gradientMap: ramp,
    vertexColors: true,
  });
  material.name = name;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.haze = haze;
    shader.vertexShader =
      `varying vec3 vHazeWorld;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      vHazeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader =
      `uniform vec3 haze;\nvarying vec3 vHazeWorld;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `outgoingLight = mix(outgoingLight, haze,
          smoothstep(${near.toFixed(1)}, ${far.toFixed(1)}, length(vHazeWorld.xz)) * ${strength.toFixed(2)});
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () =>
    `welcome-haze-${near}-${far}-${strength}`;
  return material;
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
  const haze = { value: new THREE.Color(0xd4f0ff) };
  const random = seeded(2024);

  // A finely divided disc so the colour drifts read as soft patches.
  const rings = 40,
    sectors = 96;
  const field = new THREE.RingGeometry(0.01, meadow.radius, sectors, rings);
  field.rotateX(-Math.PI / 2);
  const fieldPosition = field.getAttribute('position');
  // Pull rings inward so detail sits near the plinth.
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
  const lawn = new THREE.Mesh(
    field,
    hazeMaterial('meadow', ramp, haze, 24, meadow.radius, 0.85),
  );
  lawn.name = 'meadow';
  lawn.position.y = meadow.y;
  lawn.receiveShadow = true;
  root.add(lawn);

  // Low shrubs in gold, amber, olive and green — the turn from summer to autumn.
  const b = new ToonBuilder();
  const tones = [
    'shrubGold',
    'shrubOlive',
    'shrubGreen',
    'shrubAmber',
    'shrubOlive',
    'shrubGold',
  ] as const;
  const shrubCount = mobile ? 34 : 60;
  for (let i = 0; i < shrubCount; i++) {
    const a = random() * Math.PI * 2;
    const r = plinth.half * 1.55 + random() ** 1.4 * 22;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const size = 0.22 + random() * 0.32;
    const tone = tones[i % tones.length]!;
    const puffs = 2 + Math.floor(random() * 3);
    for (let j = 0; j < puffs; j++) {
      const ox = (random() - 0.5) * size * 1.6,
        oz = (random() - 0.5) * size * 1.6;
      const s = size * (0.7 + random() * 0.5);
      b.ball(
        s,
        j === puffs - 1 && random() < 0.4 ? 'shrubGreen' : tone,
        x + ox,
        meadow.y + s * 0.45,
        z + oz,
        [1.15, 0.72, 1.05],
        {},
        1,
      );
    }
  }
  // Dry grass tufts close to the base.
  for (let i = 0; i < (mobile ? 40 : 80); i++) {
    const a = random() * Math.PI * 2;
    const r = plinth.half * 1.45 + random() * 9;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    for (let j = 0; j < 3; j++)
      b.cylinder(
        0.035,
        0,
        0.3 + random() * 0.25,
        j ? 'meadowDry' : 'shrubOlive',
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
  shrubs.traverse((object) => (object.castShadow = false));
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
    hazeMaterial('mountains', ramp, haze, 40, 95, 0.8),
  );
  mountains.name = 'mountains';
  root.add(mountains);

  return {
    root,
    setDaylight(state: Daylight) {
      haze.value.copy(state.skyHorizon).lerp(state.skyTop, 0.15);
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
