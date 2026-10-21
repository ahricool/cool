import * as THREE from 'three';
import { seededRandom } from './sakura';

/** Cheap, fully local sky and layered mountain silhouettes beyond the miniature. */
export function createEnvironment(scene: THREE.Scene) {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x93b2d2) },
      horizon: { value: new THREE.Color(0xddd5e3) },
    },
    vertexShader:
      'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:
      'uniform vec3 top; uniform vec3 horizon; varying vec3 vDirection; void main(){float h=smoothstep(-0.8,0.35,normalize(vDirection).y);gl_FragColor=vec4(mix(horizon,top,h),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), skyMaterial);
  sky.name = 'gradient-sky';
  sky.renderOrder = -2;
  scene.add(sky);
  const fog = new THREE.Fog(0xd5d2e1, 27, 70);
  scene.fog = fog;
  const random = seededRandom(53),
    materials: THREE.MeshBasicMaterial[] = [];
  for (let layer = 0; layer < 2; layer++) {
    const material = new THREE.MeshBasicMaterial({
      color: layer ? 0x929bb8 : 0xb8bfd3,
    });
    materials.push(material);
    const radius = layer ? 34 : 49,
      count = 96,
      positions: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= count; i++) {
      const angle = (i / count) * Math.PI * 2,
        peak =
          -9 +
          Math.sin(i * 0.43) * 2 +
          Math.sin(i * 0.97) * 1.2 +
          random() * 1.5;
      positions.push(
        Math.cos(angle) * radius,
        -20,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius,
        peak,
        Math.sin(angle) * radius,
      );
      if (i < count) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    material.side = THREE.DoubleSide;
    const mountains = new THREE.Mesh(geometry, material);
    mountains.name = 'distant-mountain-layer';
    scene.add(mountains);
  }
  return {
    setDaylight(day: number, background: THREE.Color) {
      skyMaterial.uniforms.top!.value.copy(
        new THREE.Color(0x15243f).lerp(new THREE.Color(0x9dbad6), day),
      );
      skyMaterial.uniforms.horizon!.value.copy(background);
      fog.color.copy(background);
      materials.forEach((material, i) =>
        material.color.copy(
          new THREE.Color(i ? 0x26354e : 0x3c4a64).lerp(
            new THREE.Color(i ? 0x9da8be : 0xbac4d4),
            day,
          ),
        ),
      );
    },
  };
}
