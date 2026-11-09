/**
 * Voice field: a landscape of fine lines shaped like a scrolling spectrogram.
 * Each row is a slice of time; bumps are formant-like bands of speech energy
 * that drift toward the viewer, with pauses between "phrases".
 */

import { THREE } from './stage.js';

const VERTEX = /* glsl */ `
  attribute float aRow;
  uniform float uTime;
  uniform float uAmp;
  uniform float uWidth;
  varying float vRow;
  varying float vY;
  varying float vEdge;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + (i.y + 1.0) * 57.0);
    float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    float t = aRow * 9.0 - uTime * 0.42;
    float x = position.x;

    // Speech comes in phrases: a soft gate opens and closes over time
    float gate = smoothstep(0.32, 0.62, noise(t * 0.85 + 4.7));

    float y = 0.0;
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float center = (noise(t * 0.55 + fk * 17.3) - 0.5) * uWidth * 0.62;
      float width = 0.35 + noise(t * 0.9 + fk * 5.1) * 0.85;
      float amp = (0.35 + noise(t * 1.4 + fk * 9.7)) * (1.0 - fk * 0.17);
      float dx = (x - center) / width;
      y += amp * exp(-dx * dx);
    }
    y *= 0.12 + gate * 0.88;
    y += (noise2(vec2(x * 1.6, t * 2.2)) - 0.5) * 0.08;

    float edge = smoothstep(uWidth * 0.5, uWidth * 0.12, abs(x));
    y *= edge * uAmp;

    vRow = aRow;
    vY = y;
    vEdge = edge;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, position.z, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uOpacity;
  varying float vRow;
  varying float vY;
  varying float vEdge;

  void main() {
    float peak = smoothstep(0.12, 1.0, vY);
    vec3 col = mix(uColor, uAccent, peak);
    float depthFade = smoothstep(0.0, 0.35, vRow) * (1.0 - smoothstep(0.92, 1.0, vRow) * 0.4);
    float alpha = (0.13 + 0.62 * peak) * depthFade * (0.25 + 0.75 * vEdge) * uOpacity;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

export function createVoiceField({ rows = 72, cols = 220, width = 16, depth = 9 } = {}) {
  const segments = cols - 1;
  const positions = new Float32Array(rows * segments * 2 * 3);
  const rowAttr = new Float32Array(rows * segments * 2);
  let p = 0;
  let r = 0;
  for (let row = 0; row < rows; row++) {
    const v = row / (rows - 1);
    const z = -depth + v * depth;
    for (let c = 0; c < segments; c++) {
      const x0 = -width / 2 + (c / segments) * width;
      const x1 = -width / 2 + ((c + 1) / segments) * width;
      positions.set([x0, 0, z, x1, 0, z], p);
      p += 6;
      rowAttr[r++] = v;
      rowAttr[r++] = v;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRow', new THREE.BufferAttribute(rowAttr, 1));
  // The shader moves vertices, so the bounds must cover the raised shape
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -depth / 2), width);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 1 },
    uWidth: { value: width },
    uOpacity: { value: 1 },
    // Grey-green lines that deepen to spruce at speech peaks, tuned for the light page
    uColor: { value: new THREE.Color(0x6b756f) },
    uAccent: { value: new THREE.Color(0x1e6b57) }
  };
  const mesh = new THREE.LineSegments(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  mesh.frustumCulled = false;

  return { mesh, uniforms };
}
