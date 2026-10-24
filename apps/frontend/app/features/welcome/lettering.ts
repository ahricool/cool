import * as THREE from 'three';
import { seeded } from './toon';
import type { Tone, ToonBuilder } from './toon';

type Stroke = [number, number][];

/**
 * Hand-drawn strokes in a unit box (x right, y up), written the way a girl
 * might letter a festival sign: round, a little plump, nothing ruler-straight.
 */
const glyphs: Record<string, Stroke[]> = {
  // 梦: two 木 side by side over 夕.
  梦: [
    [
      [0.05, 0.8],
      [0.26, 0.83],
      [0.44, 0.84],
    ],
    [
      [0.25, 0.99],
      [0.25, 0.75],
      [0.24, 0.53],
    ],
    [
      [0.23, 0.79],
      [0.15, 0.68],
      [0.05, 0.6],
    ],
    [
      [0.28, 0.77],
      [0.4, 0.66],
    ],
    [
      [0.55, 0.83],
      [0.76, 0.86],
      [0.95, 0.86],
    ],
    [
      [0.75, 0.99],
      [0.75, 0.76],
      [0.74, 0.53],
    ],
    [
      [0.73, 0.8],
      [0.65, 0.68],
      [0.55, 0.6],
    ],
    [
      [0.78, 0.79],
      [0.87, 0.68],
      [0.97, 0.61],
    ],
    [
      [0.47, 0.5],
      [0.36, 0.36],
      [0.2, 0.25],
    ],
    [
      [0.38, 0.41],
      [0.6, 0.43],
      [0.78, 0.42],
      [0.64, 0.22],
      [0.42, 0.07],
      [0.2, 0.0],
    ],
    [
      [0.42, 0.29],
      [0.55, 0.2],
    ],
  ],
  // 桜: 木 beside three little dabs over 女.
  桜: [
    [
      [0.03, 0.7],
      [0.2, 0.72],
      [0.38, 0.73],
    ],
    [
      [0.21, 0.99],
      [0.21, 0.5],
      [0.2, 0.02],
    ],
    [
      [0.19, 0.66],
      [0.12, 0.48],
      [0.03, 0.32],
    ],
    [
      [0.24, 0.6],
      [0.36, 0.48],
    ],
    [
      [0.5, 0.94],
      [0.56, 0.83],
    ],
    [
      [0.69, 0.97],
      [0.72, 0.85],
    ],
    [
      [0.92, 0.95],
      [0.83, 0.82],
    ],
    [
      [0.69, 0.74],
      [0.6, 0.55],
      [0.53, 0.4],
      [0.7, 0.26],
      [0.9, 0.1],
    ],
    [
      [0.86, 0.64],
      [0.79, 0.38],
      [0.64, 0.17],
      [0.48, 0.05],
    ],
    [
      [0.45, 0.5],
      [0.72, 0.53],
      [0.99, 0.51],
    ],
  ],
};

/**
 * Writes `text` top to bottom as plump, round-ended strokes facing +z, each
 * character centred on (x, y) and `size` tall, at depth z. Points wobble and
 * each character tilts and drifts a little so it reads as hand-lettered.
 */
export function letterVertically(
  b: ToonBuilder,
  text: string,
  x: number,
  y: number,
  z: number,
  size: number,
  gap: number,
  tone: Tone,
  seed = 7,
) {
  const random = seeded(seed);
  random();
  const chars = [...text];
  const pitch = size + gap;
  chars.forEach((char, index) => {
    const strokes = glyphs[char];
    if (!strokes) return;
    // Alternate tilts and a sideways drift: lively rather than typeset.
    const tilt = (index % 2 ? 1 : -1) * (0.06 + random() * 0.05);
    const scale = size * (0.95 + random() * 0.12);
    const cx = x + (random() - 0.5) * size * 0.12,
      cy = y + ((chars.length - 1) / 2 - index) * pitch;
    const c = Math.cos(tilt),
      s = Math.sin(tilt);
    const place = ([px, py]: [number, number]) => {
      const lx = (px - 0.5 + (random() - 0.5) * 0.035) * scale,
        ly = (py - 0.5 + (random() - 0.5) * 0.035) * scale;
      return new THREE.Vector3(cx + lx * c - ly * s, cy + lx * s + ly * c, z);
    };
    for (const stroke of strokes) {
      const points = stroke.map(place);
      // Each stroke a touch bolder or lighter, like a felt-tip pen.
      const width = scale * (0.08 + random() * 0.016);
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const segments = Math.max(6, points.length * 6);
      const tube = new THREE.TubeGeometry(curve, segments, width, 6, false);
      // Flattened against the board so the strokes read as paint, not rope.
      tube.translate(0, 0, -z).scale(1, 1, 0.35).translate(0, 0, z);
      b.part(tube, tone, 0, 0, 0, { outline: false });
      for (const end of [points[0]!, points[points.length - 1]!])
        b.ball(width, tone, end.x, end.y, end.z, [1, 1, 0.35], {
          outline: false,
        });
    }
  });
}
