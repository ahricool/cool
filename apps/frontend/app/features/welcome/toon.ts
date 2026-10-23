import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bright anime palette; shadows come from cool sky light, not darker albedo. */
export const palette = {
  grass: 0x9edb72,
  grassDeep: 0x74c262,
  moss: 0x8fc96a,
  gravel: 0xeedfc2,
  slab: 0xdcd5c6,
  slabDark: 0xc2baab,
  stone: 0xcfc6b6,
  stoneLight: 0xe6dfcf,
  stoneDark: 0xa99e93,
  mortar: 0x8e8782,
  soil: 0xa8744f,
  wood: 0xa4643c,
  woodLight: 0xd3965c,
  woodDark: 0x6b4130,
  red: 0xe8483c,
  redLight: 0xff7a5c,
  redDark: 0xbd3138,
  white: 0xfffaf0,
  paper: 0xfff4dc,
  roof: 0x55403e,
  roofLight: 0x7a5d56,
  roofEdge: 0x3a2b2e,
  gold: 0xf5c95a,
  straw: 0xeed58e,
  navy: 0x4c5b8f,
  bark: 0x7a5244,
  leaf: 0x5cb85e,
  leafLight: 0x94d96c,
  leafDeep: 0x3f9a62,
  pine: 0x3d8f66,
  pineLight: 0x62b276,
  blossom: 0xffbfd5,
  blossomLight: 0xffdde9,
  blossomDeep: 0xf79abb,
  azalea: 0xff8fb4,
  water: 0x79d8e6,
  cloud: 0xffffff,
  glow: 0xffd98a,
  lantern: 0xff7a5a,
  // Late-summer meadow, shrubs and far mountains around the plinth.
  meadow: 0xa8d06a,
  meadowDry: 0xd3cf6e,
  meadowDeep: 0x86bf5c,
  shrubGold: 0xe6c45a,
  shrubAmber: 0xdc9b4c,
  shrubOlive: 0xb0c75e,
  shrubGreen: 0x72b158,
  mountain: 0x6f9e88,
  mountainFar: 0x8eabc9,
};
export type Tone = keyof typeof palette;

const swaying = new Set<Tone>([
  'leaf',
  'leafLight',
  'leafDeep',
  'pine',
  'pineLight',
  'blossom',
  'blossomLight',
  'blossomDeep',
]);
/** Emissive tones keep their own material so lanterns can glow and flicker. */
const glowing = new Set<Tone>(['glow', 'lantern']);

export interface SharedUniforms {
  time: { value: number };
  /** Darkens painted outlines with the scene light so night lines stay soft. */
  ink: { value: number };
  /** Soft sky-coloured edge light that separates silhouettes, anime style. */
  rim: { value: THREE.Color };
}
export const createSharedUniforms = (): SharedUniforms => ({
  time: { value: 0 },
  ink: { value: 1 },
  rim: { value: new THREE.Color(0xffffff).multiplyScalar(0.12) },
});

/** Soft two-tone cel ramp: a narrow blended terminator, like hand-painted shading. */
export function createRamp() {
  const size = 32;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++)
    data[i] = Math.round(
      255 * THREE.MathUtils.smoothstep(i / (size - 1), 0.47, 0.56),
    );
  const ramp = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.LinearFilter;
  ramp.needsUpdate = true;
  return ramp;
}

// Wind displaces foliage in world space; outlines repeat it so hulls stay attached.
const swayGlsl = /* glsl */ `
  float swayAmount = smoothstep(0.9, 4.2, swayed.y) * 0.05;
  swayed.x += sin(time * 1.25 + swayed.x * 0.7 + swayed.z * 0.45) * swayAmount;
  swayed.z += cos(time * 1.05 + swayed.x * 0.4) * swayAmount * 0.6;
`;

// Hanging pieces (shide, ema, ropes, paper lanterns) swing about their own hook.
const dangleGlsl = /* glsl */ `
  vec3 hang = swayed - dangle.xyz;
  float swing = sin(time * (1.2 + fract(dangle.w * 7.31) * 0.8) + dangle.w) * 0.11;
  float twist = cos(time * 0.85 + dangle.w * 1.7) * 0.07;
  hang.xy = mat2(cos(swing), sin(swing), -sin(swing), cos(swing)) * hang.xy;
  hang.yz = mat2(cos(twist), sin(twist), -sin(twist), cos(twist)) * hang.yz;
  swayed = dangle.xyz + hang;
`;
type Motion = 'still' | 'sway' | 'dangle';
const motionGlsl = (motion: Motion) =>
  motion === 'sway' ? swayGlsl : motion === 'dangle' ? dangleGlsl : '';

/** Cel material reading its paint from vertex colours, with wind and rim light. */
function toonMaterial(
  name: string,
  ramp: THREE.Texture,
  shared: SharedUniforms,
  motion: Motion,
  emissive?: number,
) {
  const material = new THREE.MeshToonMaterial({
    gradientMap: ramp,
    vertexColors: true,
  });
  material.name = name;
  if (emissive !== undefined) {
    material.emissive.setHex(emissive);
    material.emissiveIntensity = 0;
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = shared.time;
    shader.uniforms.rim = shared.rim;
    shader.vertexShader =
      `uniform float time;\nattribute vec4 dangle;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 swayed = transformed;${motionGlsl(motion)}transformed = swayed;`,
      );
    shader.fragmentShader =
      `uniform vec3 rim;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `float facing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
      outgoingLight += rim * diffuseColor.rgb * pow(facing, 3.0);
      #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `welcome-${motion}`;
  return material;
}

function outlineMaterial(shared: SharedUniforms, motion: Motion) {
  return new THREE.ShaderMaterial({
    name: 'outline',
    side: THREE.BackSide,
    vertexColors: true,
    uniforms: { time: shared.time, ink: shared.ink },
    vertexShader: /* glsl */ `
      attribute vec3 smoothNormal;
      attribute vec4 dangle;
      uniform float time;
      varying vec3 inkColor;
      void main() {
        inkColor = color;
        vec3 swayed = position;
        ${motionGlsl(motion)}
        vec4 world = modelMatrix * vec4(swayed, 1.0);
        float distance = length(world.xyz - cameraPosition);
        world.xyz += normalize(mat3(modelMatrix) * smoothNormal)
          * 0.03 * clamp(distance / 24.0, 0.5, 1.6);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform float ink;
      varying vec3 inkColor;
      void main() {
        gl_FragColor = vec4(inkColor * ink, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Ink colour: the fill darkened and pulled towards a warm plum, never pure black. */
function inkFor(tone: Tone) {
  return new THREE.Color(palette[tone])
    .multiplyScalar(0.42)
    .lerp(new THREE.Color(0x3a2433), 0.45);
}

function paint(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Averaged normals along shared corners close the hull at hard edges. */
function smoothNormals(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const sums = new Map<string, THREE.Vector3>();
  const key = (i: number) =>
    `${Math.round(position.getX(i) * 1e4)},${Math.round(position.getY(i) * 1e4)},${Math.round(position.getZ(i) * 1e4)}`;
  const n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const k = key(i);
    const sum = sums.get(k) ?? new THREE.Vector3();
    sum.add(n.fromBufferAttribute(normal, i));
    sums.set(k, sum);
  }
  const smooth = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const sum = sums.get(key(i))!;
    if (sum.lengthSq() < 1e-8) sum.fromBufferAttribute(normal, i);
    sum.normalize().toArray(smooth, i * 3);
  }
  const outline = new THREE.BufferGeometry();
  outline.setAttribute('position', position.clone());
  outline.setAttribute('smoothNormal', new THREE.BufferAttribute(smooth, 3));
  const dangle = geometry.getAttribute('dangle');
  if (dangle) outline.setAttribute('dangle', dangle.clone());
  return outline;
}

export interface PartOptions {
  rotation?: [number, number, number];
  scale?: [number, number, number];
  outline?: boolean;
  /** World-space hook and phase for pieces that swing in the breeze. */
  dangle?: [number, number, number, number];
}

/**
 * Collects transformed primitives and merges them into a handful of meshes:
 * one painted fill and one ink hull per kind of motion, plus glowing parts.
 */
export class ToonBuilder {
  private readonly fills = new Map<string, THREE.BufferGeometry[]>();
  private readonly hulls = new Map<string, THREE.BufferGeometry[]>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();

  part(
    geometry: THREE.BufferGeometry,
    tone: Tone,
    x: number,
    y: number,
    z: number,
    {
      rotation = [0, 0, 0],
      scale = [1, 1, 1],
      outline = true,
      dangle,
    }: PartOptions = {},
  ) {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    for (const name of Object.keys(piece.attributes))
      if (name !== 'position' && name !== 'normal') piece.deleteAttribute(name);
    if (!piece.getAttribute('normal')) piece.computeVertexNormals();
    this.matrix.compose(
      new THREE.Vector3(x, y, z),
      this.quaternion.setFromEuler(this.euler.set(...rotation)),
      new THREE.Vector3(...scale),
    );
    piece.applyMatrix4(this.matrix);
    const count = piece.getAttribute('position').count;
    if (dangle)
      piece.setAttribute(
        'dangle',
        new THREE.BufferAttribute(
          new Float32Array(count * 4).map((_, i) => dangle[i % 4]!),
          4,
        ),
      );
    const motion: Motion = dangle
      ? 'dangle'
      : swaying.has(tone)
        ? 'sway'
        : 'still';
    const fill = glowing.has(tone) ? `${motion}|${tone}` : motion;
    paint(piece, new THREE.Color(palette[tone]));
    (this.fills.get(fill) ?? this.fills.set(fill, []).get(fill)!).push(piece);
    if (outline) {
      const hull = smoothNormals(piece);
      paint(hull, inkFor(tone));
      (this.hulls.get(motion) ?? this.hulls.set(motion, []).get(motion)!).push(
        hull,
      );
    }
  }

  box(
    w: number,
    h: number,
    d: number,
    tone: Tone,
    x: number,
    y: number,
    z: number,
    options?: PartOptions,
  ) {
    this.part(new THREE.BoxGeometry(w, h, d), tone, x, y, z, options);
  }

  cylinder(
    radiusBottom: number,
    radiusTop: number,
    h: number,
    tone: Tone,
    x: number,
    y: number,
    z: number,
    sides = 10,
    options?: PartOptions,
  ) {
    this.part(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, h, sides),
      tone,
      x,
      y,
      z,
      options,
    );
  }

  ball(
    r: number,
    tone: Tone,
    x: number,
    y: number,
    z: number,
    scale: [number, number, number] = [1, 1, 1],
    options: PartOptions = {},
    detail = 1,
  ) {
    this.part(new THREE.IcosahedronGeometry(r, detail), tone, x, y, z, {
      ...options,
      scale,
    });
  }

  beam(
    a: THREE.Vector3Tuple,
    b: THREE.Vector3Tuple,
    r: number,
    tone: Tone,
    tip = r,
    options: PartOptions = {},
    sides = 7,
  ) {
    const start = new THREE.Vector3(...a);
    const vector = new THREE.Vector3(...b).sub(start);
    const geometry = new THREE.CylinderGeometry(tip, r, vector.length(), sides);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vector.clone().normalize(),
      ),
    );
    const center = start.addScaledVector(vector, 0.5);
    this.part(geometry, tone, center.x, center.y, center.z, options);
  }

  /** Rounded rectangle slab whose top sits at `top`. */
  slab(
    w: number,
    d: number,
    h: number,
    top: number,
    tone: Tone,
    x = 0,
    z = 0,
    radius = 0.08,
    options?: PartOptions,
  ) {
    const r = Math.min(radius, w / 2 - 0.001, d / 2 - 0.001);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 4,
    });
    geometry.rotateX(Math.PI / 2);
    this.part(geometry, tone, x, top, z, options);
  }

  build(
    shared: SharedUniforms,
    ramp: THREE.Texture = createRamp(),
    { castShadow = true } = {},
  ) {
    const root = new THREE.Group();
    const merge = (pieces: THREE.BufferGeometry[]) => {
      const merged = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      if (!merged) throw new Error('Unable to build garden geometry');
      return merged;
    };
    for (const [key, pieces] of this.fills) {
      const [motion, tone] = key.split('|') as [Motion, Tone | undefined];
      const mesh = new THREE.Mesh(
        merge(pieces),
        toonMaterial(
          tone ?? `paint-${motion}`,
          ramp,
          shared,
          motion,
          tone && palette[tone],
        ),
      );
      mesh.name = mesh.material.name;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    for (const [motion, pieces] of this.hulls) {
      const mesh = new THREE.Mesh(
        merge(pieces),
        outlineMaterial(shared, motion as Motion),
      );
      mesh.name = `ink-${motion}`;
      root.add(mesh);
    }
    this.fills.clear();
    this.hulls.clear();
    return root;
  }
}

/** Deterministic noise so every visit shows the same composition. */
export function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
