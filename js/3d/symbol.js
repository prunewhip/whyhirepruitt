/**
 * The interface: the site's symbol for a human–AI interface.
 *
 *   The mind     a geodesic lattice inside, with signals racing along its connections (the AI)
 *   The shell    an iridescent glass sphere around it: clear in the middle, reflective at the rim
 *   The voices   two rings of speech on the shell that take turns: ink for the person, spruce for the AI
 *   The ways in  three orbits, each with a bead trailing light: it hears you, shows you, speaks to you
 *   The dust     a slow field of points that gives the scene depth
 *
 * Bar lengths, signals and trails are computed in shaders, so the CPU only updates a few uniforms a frame.
 * `quality` scales the detail down for phones.
 */

import { THREE } from './stage.js';

const INK = new THREE.Color('#18201c');
const SPRUCE = new THREE.Color('#1e6b57');
const MINT = new THREE.Color('#3fae8c');
const IDLE = new THREE.Color('#dfe6e1');

const hash = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ── The voices: bars on the shell that grow with speech ───────────── */

const VOICE = /* glsl */ `
  attribute vec3 aDir;
  attribute float aSeed;
  uniform float uTime;
  varying float vLen;
  varying float vAi;

  float hash1(float n) { return fract(sin(n) * 43758.5453123); }

  // How loud one ring of speech is at direction d: a band around a great circle, broken into syllables and words
  float ring(vec3 d, vec3 axis, float t, float syllables, float speed) {
    vec3 b = normalize(cross(axis, vec3(0.0, 0.0, 1.0)));
    vec3 c = cross(axis, b);
    float u = dot(d, axis);
    float band = exp(-u * u / 0.016);
    float phi = atan(dot(d, c), dot(d, b));
    float syl = 0.5 + 0.5 * sin(phi * syllables - t * speed);
    float word = smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(phi * 1.6 - t * speed * 0.38 + 1.3));
    return band * (0.3 + 0.7 * syl) * word;
  }

  float voiceLength(vec3 d, float t, float seed) {
    // Turn-taking: one speaks, then the other replies
    float turn = 0.5 + 0.5 * sin(t * 0.55);
    float person = smoothstep(0.25, 0.75, turn);
    float ai = 1.0 - person;
    vec3 a1 = normalize(vec3(sin(t * 0.11), 0.62, cos(t * 0.11)));
    vec3 a2 = normalize(vec3(cos(t * 0.09 + 2.0), -0.38, sin(t * 0.09 + 2.0)));
    float h = ring(d, a1, t, 9.0, 2.6) * (0.2 + 0.8 * person);
    float m = ring(d, a2, t + 3.0, 7.0, 2.2) * (0.2 + 0.8 * ai);
    vAi = m / (h + m + 1e-4);
    float idle = 0.004 + 0.006 * hash1(seed * 17.0);
    return idle + 0.85 * max(h, m);
  }
`;

function createVoices(count, R) {
  const bar = new THREE.CylinderGeometry(0.0058, 0.0058, 1, 6, 1);
  bar.translate(0, 0.5, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.3 });
  const uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uInk = { value: INK };
    shader.uniforms.uSpruce = { value: SPRUCE };
    shader.uniforms.uIdle = { value: IDLE };
    shader.vertexShader = VOICE + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position);
       float len = voiceLength(aDir, uTime, aSeed);
       transformed.y *= len;
       vLen = len;`
    );
    shader.fragmentShader = `
      varying float vLen;
      varying float vAi;
      uniform vec3 uInk;
      uniform vec3 uSpruce;
      uniform vec3 uIdle;
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       vec3 voiced = mix(uInk, uSpruce, vAi);
       // Resting bars all but vanish, so the glass reads clean and only speech stands out
       if (vLen < 0.02) discard;
       diffuseColor.rgb = mix(uIdle, voiced, smoothstep(0.03, 0.18, vLen));`
    );
  };

  const mesh = new THREE.InstancedMesh(bar, material, count);
  const dirs = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) * (2 / count);
    const r = Math.sqrt(1 - y * y);
    dir.set(Math.cos(i * golden) * r, y, Math.sin(i * golden) * r);
    q.setFromUnitVectors(up, dir);
    m.compose(dir.clone().multiplyScalar(R), q, one);
    mesh.setMatrixAt(i, m);
    dirs.set([dir.x, dir.y, dir.z], i * 3);
    seeds[i] = (i * 0.6180339) % 1;
  }
  bar.setAttribute('aDir', new THREE.InstancedBufferAttribute(dirs, 3));
  bar.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  // The bars grow outward in the shader, so don't let the original bounds cull them
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/* ── The shell: glass that is clear in the middle and reflective at the rim ── */

function createShell(R) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf4f8f6,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [140, 460],
    specularIntensity: 1,
    envMapIntensity: 1.4,
    transparent: true,
    depthWrite: false
  });
  material.onBeforeCompile = (shader) => {
    // Fresnel opacity: you see into the middle, while the rim catches the light like glass
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
       diffuseColor.a = mix(0.04, 0.96, pow(rim, 2.2));
       #include <opaque_fragment>`
    );
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), material);
  mesh.renderOrder = 2;
  return mesh;
}

/* ── The mind: a geodesic lattice with signals travelling along its edges ── */

const MIND_VERTEX = /* glsl */ `
  attribute float aT;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  varying float vGlow;
  varying float vDepth;
  float hash1(float n) { return fract(sin(n) * 43758.5453123); }
  void main() {
    // A quarter of the connections carry a signal at any moment; each signal is a short bright pulse
    float cycle = uTime * aSpeed + aPhase;
    float lit = step(0.6, hash1(floor(cycle) + aPhase * 91.0));
    float head = fract(cycle);
    float d = aT - head;
    float pulse = lit * exp(-d * d / 0.007);
    vGlow = pulse;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = smoothstep(-14.0, -10.0, mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const MIND_FRAGMENT = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uSpruce;
  uniform vec3 uMint;
  varying float vGlow;
  varying float vDepth;
  void main() {
    vec3 color = mix(uInk, mix(uSpruce, uMint, vGlow), clamp(vGlow * 1.6, 0.0, 1.0));
    float alpha = mix(0.14, 0.3, vDepth) + vGlow * 0.9;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

function createMind(radius, detail) {
  const ico = new THREE.IcosahedronGeometry(radius, detail);
  const pos = ico.getAttribute('position');
  // Merge duplicated vertices and collect each edge once
  const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  const index = new Map();
  const points = [];
  const ids = [];
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    if (!index.has(k)) {
      index.set(k, points.length);
      points.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    ids.push(index.get(k));
  }
  const edges = new Set();
  for (let i = 0; i < ids.length; i += 3) {
    [[ids[i], ids[i + 1]], [ids[i + 1], ids[i + 2]], [ids[i + 2], ids[i]]].forEach(([a, b]) => {
      edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    });
  }
  // Pull alternate vertices inward a little so the lattice reads as a structure, not a ball
  points.forEach((p, i) => p.multiplyScalar(0.78 + 0.22 * hash(i * 3.1)));

  const list = [...edges].map((e) => e.split('-').map(Number));
  const position = new Float32Array(list.length * 6);
  const t = new Float32Array(list.length * 2);
  const phase = new Float32Array(list.length * 2);
  const speed = new Float32Array(list.length * 2);
  list.forEach(([a, b], i) => {
    position.set([points[a].x, points[a].y, points[a].z, points[b].x, points[b].y, points[b].z], i * 6);
    t.set([0, 1], i * 2);
    const ph = hash(i + 0.5) * 10;
    const sp = 0.35 + 0.5 * hash(i + 7.7);
    phase.set([ph, ph], i * 2);
    speed.set([sp, sp], i * 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const uniforms = { uTime: { value: 0 }, uInk: { value: INK }, uSpruce: { value: SPRUCE }, uMint: { value: MINT } };
  const lines = new THREE.LineSegments(geometry, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: MIND_VERTEX,
    fragmentShader: MIND_FRAGMENT,
    transparent: true,
    depthWrite: false
  }));

  // Nodes: small dark beads where the connections meet
  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const nodes = new THREE.Points(nodeGeometry, new THREE.PointsMaterial({
    color: INK, size: 0.028, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false
  }));

  const group = new THREE.Group();
  group.add(lines, nodes);
  return { group, uniforms };
}

/* ── The ways in: orbits whose beads leave a fading trail ─────────── */

const TRAIL_VERTEX = /* glsl */ `
  attribute float aAngle;
  uniform float uHead;
  varying float vTrail;
  void main() {
    float d = mod(uHead - aAngle + 6.2831853, 6.2831853);
    vTrail = exp(-d * 1.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TRAIL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vTrail;
  void main() {
    gl_FragColor = vec4(uColor, 0.16 + 0.78 * vTrail);
  }
`;

function createOrbit({ radius, tilt, speed, size, color, phase }) {
  const pivot = new THREE.Group();
  pivot.rotation.set(...tilt);
  const segments = 384;
  const position = new Float32Array((segments + 1) * 3);
  const angle = new Float32Array(segments + 1);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    position.set([Math.cos(a) * radius, 0, Math.sin(a) * radius], i * 3);
    angle[i] = a;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  const uniforms = { uHead: { value: 0 }, uColor: { value: new THREE.Color(color) } };
  const trail = new THREE.Line(geometry, new THREE.ShaderMaterial({
    uniforms, vertexShader: TRAIL_VERTEX, fragmentShader: TRAIL_FRAGMENT, transparent: true, depthWrite: false
  }));
  pivot.add(trail);
  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(size, 40, 24),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.16, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.4 })
  );
  pivot.add(bead);
  return {
    pivot,
    update(t) {
      // Positive angles run counter-clockwise in this plane, so the trail follows behind the bead
      const a = (t * speed + phase) % (Math.PI * 2);
      const head = (a + Math.PI * 2) % (Math.PI * 2);
      bead.position.set(Math.cos(head) * radius, 0, Math.sin(head) * radius);
      uniforms.uHead.value = head;
    }
  };
}

/* ── The dust: depth around everything ────────────────────────────── */

function createDust(count) {
  const position = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = hash(i * 1.7) * 2 - 1;
    const a = hash(i * 2.3) * Math.PI * 2;
    const r = 2.6 + 1.8 * Math.pow(hash(i * 3.9), 0.7);
    const s = Math.sqrt(1 - u * u);
    position.set([Math.cos(a) * s * r, u * r * 0.7, Math.sin(a) * s * r], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0x5f6963, size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.45, depthWrite: false
  }));
}

/* ── Assembly ─────────────────────────────────────────────────────── */

export function createSymbol({ quality = 'high' } = {}) {
  const high = quality === 'high';
  const R = 1;
  const group = new THREE.Group();

  const mind = createMind(R * 0.66, high ? 3 : 2);
  group.add(mind.group);

  const shell = createShell(R);
  group.add(shell);

  const voices = createVoices(high ? 2600 : 1500, R * 0.995);
  group.add(voices.mesh);

  const orbits = [
    { radius: 1.72, tilt: [0.32, 0, 0.18], speed: 0.34, size: 0.065, color: '#1e6b57', phase: 0.4 },
    { radius: 1.98, tilt: [-0.5, 0.4, -0.22], speed: 0.26, size: 0.05, color: '#18201c', phase: 2.5 },
    { radius: 2.24, tilt: [1.05, -0.3, 0.12], speed: 0.2, size: 0.05, color: '#18201c', phase: 4.6 }
  ].map(createOrbit);
  orbits.forEach((o) => group.add(o.pivot));

  const dust = createDust(high ? 700 : 360);
  group.add(dust);

  return {
    group,
    radius: 2.3,
    update(t) {
      voices.uniforms.uTime.value = t;
      mind.uniforms.uTime.value = t;
      // The mind turns against the shell, so the two read as separate layers
      mind.group.rotation.set(t * 0.05, -t * 0.21, 0);
      dust.rotation.y = t * 0.03;
      orbits.forEach((o) => o.update(t));
    }
  };
}
