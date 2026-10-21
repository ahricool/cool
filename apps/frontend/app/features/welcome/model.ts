import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const palette = {
  ivory: 0xf5e6db,
  stone: 0x858493,
  stoneLight: 0xb6b1bb,
  mortar: 0x555260,
  gravel: 0xc3b7b9,
  wood: 0x78513f,
  woodLight: 0xa77a5d,
  red: 0x9f3547,
  redLight: 0xc75a65,
  roof: 0x39354b,
  roofLight: 0x5d5875,
  dark: 0x2d273c,
  gold: 0xcba976,
  leaf: 0x596e62,
  leafLight: 0x84916d,
  moss: 0x727d64,
  blossom: 0xdf9abf,
  glow: 0xffdb9b,
} as const;
export type Color = keyof typeof palette;

/** One draw call per material. All temporary source geometries are released. */
export function createModelBuilder() {
  const batches = new Map<Color, THREE.BufferGeometry[]>();
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: key === 'gold' ? 0.48 : 0.88,
        metalness: key === 'gold' ? 0.32 : 0,
      });
      material.name = key;
      if (key === 'glow') {
        material.emissive.setHex(color);
        material.emissiveIntensity = 0.15;
      }
      return [key, material];
    }),
  ) as Record<Color, THREE.MeshStandardMaterial>;
  function part(
    geometry: THREE.BufferGeometry,
    color: Color,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const transformed = geometry.index
      ? geometry.toNonIndexed()
      : geometry.clone();
    geometry.dispose();
    transformed.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    for (const name of Object.keys(transformed.attributes))
      if (!['position', 'normal'].includes(name))
        transformed.deleteAttribute(name);
    const batch = batches.get(color) ?? [];
    batch.push(transformed);
    batches.set(color, batch);
  }
  function box(
    w: number,
    h: number,
    d: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ) {
    part(new THREE.BoxGeometry(w, h, d), c, x, y, z, 0, ry);
  }
  function cylinder(
    r: number,
    h: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    top = r,
    sides = 10,
  ) {
    part(new THREE.CylinderGeometry(top, r, h, sides), c, x, y, z);
  }
  function beam(
    a: number[],
    b: number[],
    radius: number,
    c: Color,
    tip = radius,
    sides = 8,
  ) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      vector = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(
      tip,
      radius,
      vector.length(),
      sides,
    );
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vector.normalize(),
      ),
    );
    const center = start.add(end).multiplyScalar(0.5);
    part(geometry, c, center.x, center.y, center.z);
  }
  function slab(
    w: number,
    d: number,
    h: number,
    y: number,
    c: Color,
    x = 0,
    z = 0,
    bevel = 0.08,
  ) {
    const shape = new THREE.Shape(),
      l = -w / 2,
      r = w / 2,
      b = -d / 2,
      f = d / 2;
    shape.moveTo(l + bevel, b);
    shape.lineTo(r - bevel, b);
    shape.quadraticCurveTo(r, b, r, b + bevel);
    shape.lineTo(r, f - bevel);
    shape.quadraticCurveTo(r, f, r - bevel, f);
    shape.lineTo(l + bevel, f);
    shape.quadraticCurveTo(l, f, l, f - bevel);
    shape.lineTo(l, b + bevel);
    shape.quadraticCurveTo(l, b, l + bevel, b);
    part(
      new THREE.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: false,
        curveSegments: 3,
      }),
      c,
      x,
      y,
      z,
      -Math.PI / 2,
    );
  }
  function rock(
    r: number,
    c: Color,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    seed = 0,
  ) {
    const geo = new THREE.IcosahedronGeometry(r, 1),
      positions = geo.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i),
        py = positions.getY(i),
        pz = positions.getZ(i);
      const bump = 1 + Math.sin(px * 7.1 + py * 4.7 + pz * 9.3 + seed) * 0.12;
      positions.setXYZ(i, px * sx * bump, py * sy * bump, pz * sz * bump);
    }
    geo.computeVertexNormals();
    part(geo, c, x, y, z);
  }
  function curve(points: number[][], radius: number, c: Color, segments = 20) {
    part(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        segments,
        radius,
        6,
        false,
      ),
      c,
    );
  }
  function finish() {
    const root = new THREE.Group();
    for (const [color, geometries] of batches) {
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (!merged) throw new Error('Unable to build garden geometry');
      const mesh = new THREE.Mesh(merged, materials[color]);
      mesh.name = color;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    // A palette entry need not occur in every model.
    for (const color of Object.keys(materials) as Color[])
      if (!batches.has(color)) materials[color].dispose();
    return root;
  }
  return { part, box, cylinder, beam, slab, rock, curve, finish };
}
export type ModelBuilder = ReturnType<typeof createModelBuilder>;
