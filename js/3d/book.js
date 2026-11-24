/**
 * What I've built: The Tech Stack, a book of glass cards that turn on an unseen axis, a generated model live in WebGL,
 * animated throughout. It is the book from tools/render/book.py (whose path-traced stills stand in when WebGL can't): every
 * page a slab of black glass with a chrome rim and a screen in each face. It waits closed on its cover, opens (the
 * cover alone turns, as in a real book) onto Vox Amelior, then turns one page per tool: Linux, the podcast, Vox Learn,
 * and at the end it closes again and turns to show its back cover: and more to come.
 *
 * The motion graphics:
 *   - the screens are alive: each powers on behind a scan line as it comes into view, then its waveforms move, its
 *     lines type themselves out, the cursor blinks, the podcast plays, the score ring fills, the microphone listens
 *     (the screen pictures come from tools/render/book-screens.html without those parts; screens.json says where
 *     they go, and a shader per screen draws them)
 *   - a turning page sweeps a trail of light behind its edge and throws sparks; it lands with a ripple across the
 *     grid floor; the backdrop glows brighter while a page is in the air
 *   - the camera leans into each turn; the book leans toward the pointer and sways at rest, so the studio's lights
 *     slide over the glass; bloom makes the light glow
 *   - on the first spread the Vox film plays inside the left-hand screen
 *
 *   const book = await createBook(canvas, { screens: 'assets/img/book/screen-', film: videoElement, calm });
 *   book.open(); book.setPage(2); book.setVisible(true);
 *   book.dragStart(); book.dragMove(0.4); book.dragEnd();   // a page turned by hand: it follows, then settles
 *
 * calm (reduced motion): it still opens and turns when asked, but doesn't sway, drift or throw sparks, and its
 * screens hold still once they've lit.
 */
import { THREE, createStage, createMirrorFloor, createContactShadow, loadTexture, damp } from './stage.js';
import { EffectComposer } from '../../assets/vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from '../../assets/vendor/three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../assets/vendor/three/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../assets/vendor/three/postprocessing/OutputPass.js';

const DEG = Math.PI / 180;
// Dimensions in decimetres, as book.py (metres × 10)
const SCW = 1.34; // screen
const TEX_H = 1600; // the screen pictures are 1000 × 1600: tall cards, so the type can be big
const SCH = SCW * TEX_H / 1000;
const BZ = 0.05; // bezel
const SW = SCW + 2 * BZ; // page
const SH = SCH + 2 * BZ;
const PT = 0.042;
const GAP0 = 0.022; // the axis the cards turn on, to each card's inner edge: no spine, the cards nearly meet
const XC = GAP0 + SW / 2;
const A = 26 * DEG; // each half of the open book leans this far toward you
const D = 3.8 * DEG; // and each page deeper in a stack opens a little flatter
const SP = PT + 0.032; // and sits a little further back
const COVER = { w: SW + 0.06, h: SH + 0.08, t: 0.055 };
const FLOOR_Y = -COVER.h / 2 - 0.002;
// The film's square on the first left-hand screen: 880 px at (60, 200) in the 1000 × 1600 picture
const FILM = { size: SCW * 0.88, y: (0.5 - 640 / TEX_H) * SCH, r: SCW * 0.04 };
const LAST = 4; // 0..3: the four tools, open; 4: the end, the book closed again and turned to show its back cover
const PAGE_BG = 0x050807; // the page behind the canvas (--paper)
const CYAN = new THREE.Color(0x7fd6ff);
const GREEN = new THREE.Color(0x6ff0a6);

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Smooth normals across the rounded rim, sharp where the rim meets the flat glass (an extrusion's own are faceted)
function creaseNormals(geo, crease = 40 * DEG) {
  const pos = geo.attributes.position;
  const tris = pos.count / 3;
  const fn = new Float32Array(pos.count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const byPoint = new Map();
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    b.sub(a);
    c.sub(a);
    b.cross(c).normalize();
    fn[t * 3] = b.x;
    fn[t * 3 + 1] = b.y;
    fn[t * 3 + 2] = b.z;
    for (let k = 0; k < 3; k++) {
      const id = key(t * 3 + k);
      if (!byPoint.has(id)) byPoint.set(id, []);
      byPoint.get(id).push(t);
    }
  }
  const cos = Math.cos(crease);
  const normals = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.floor(i / 3);
    let x = 0;
    let y = 0;
    let z = 0;
    for (const u of byPoint.get(key(i))) {
      if (fn[u * 3] * fn[t * 3] + fn[u * 3 + 1] * fn[t * 3 + 1] + fn[u * 3 + 2] * fn[t * 3 + 2] < cos) continue;
      x += fn[u * 3];
      y += fn[u * 3 + 1];
      z += fn[u * 3 + 2];
    }
    const l = Math.hypot(x, y, z) || 1;
    normals[i * 3] = x / l;
    normals[i * 3 + 1] = y / l;
    normals[i * 3 + 2] = z / l;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

// A page: glass faces (group 0) on a chrome rim (group 1), its rounded edge the bevel
function slabGeometry(w, h, t, r) {
  const bevel = Math.min(0.014, t / 3);
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, r - bevel), {
    depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 20, steps: 1
  });
  g.translate(0, 0, -(t - 2 * bevel) / 2);
  return creaseNormals(g);
}

// A flat rounded panel with 0..1 UVs across it
function panelGeometry(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 16);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const TONE = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;

/* ── The live screen: one shader per screen draws its moving parts over the picture, in the picture's pixels ── */
const MAXR = 12;
const KIND = { wave: 1, dot: 2, cursor: 3, progress: 4, eq: 5, ring: 6, pulse: 7, glow: 8, shine: 9, type: 10 };
const SCREEN_FX_FRAG = /* glsl */ `
  #define MAXR ${MAXR}
  #define PI 3.14159265
  uniform float uTime;
  uniform float uSince;
  uniform int uCount;
  uniform vec4 uRect[MAXR];
  uniform vec4 uKind[MAXR];
  uniform vec3 uColA[MAXR];
  uniform vec3 uColB[MAXR];
  uniform vec3 uAccent;
  varying vec2 vUv;
  float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  float fillAA(float d) { return clamp(0.5 - d, 0.0, 1.0); }
  void main() {
    vec2 px = vec2(vUv.x * 1000.0, (1.0 - vUv.y) * ${TEX_H}.0);
    vec4 col = vec4(0.0); // premultiplied, painted over the picture
    vec3 add = vec3(0.0); // light, added on top
    for (int i = 0; i < MAXR; i++) {
      if (i >= uCount) break;
      vec4 r = uRect[i];
      vec4 k = uKind[i];
      vec2 c = r.xy + r.zw * 0.5;
      vec2 q = px - c;
      vec2 l = px - r.xy;
      if (any(greaterThan(abs(q), r.zw * 0.5 + 70.0))) continue;
      vec3 A = uColA[i];
      vec3 B = uColB[i];
      float kind = k.x;
      if (kind < 1.5) {
        // a waveform: bars that rise as the screen lights, then keep moving
        float n = k.y;
        float bw = r.z / n;
        float idx = floor(l.x / bw);
        if (idx >= 0.0 && idx < n) {
          float t = idx / max(n - 1.0, 1.0);
          float env = 0.18 + 0.82 * sqrt(max(sin(PI * t), 0.0));
          float m = 0.3 + 0.7 * abs(sin(uTime * 2.3 + idx * 0.55) * 0.6 + sin(uTime * 3.7 + idx * 1.31) * 0.4);
          float h = max(0.1, env * m * smoothstep(0.2, 1.0, uSince)) * r.w;
          float hw = bw * 0.36;
          float d = box(vec2(l.x - (idx + 0.5) * bw, q.y), vec2(hw, max(h * 0.5, hw)), hw);
          vec3 bar = k.z > 0.5 ? vec3(0.95) : mix(A, B, clamp(1.0 - l.y / r.w, 0.0, 1.0));
          float f = fillAA(d);
          col = vec4(bar * f, f) + col * (1.0 - f);
          add += bar * exp(-max(d, 0.0) / 9.0) * 0.3 * (1.0 - f);
        }
      } else if (kind < 2.5) {
        // a status dot: a core, and a ring going out
        float rad = r.z * 0.5;
        float d = length(q);
        float f = fillAA(d - rad);
        float ph = fract(uTime / 1.7 + c.x * 0.001);
        col = vec4(A * f, f) + col * (1.0 - f);
        add += A * (smoothstep(2.5, 0.0, abs(d - rad - ph * rad * 3.0)) * (1.0 - ph) * 0.9 + exp(-max(d - rad, 0.0) / 7.0) * 0.6);
      } else if (kind < 3.5) {
        // the cursor, blinking once its line is written
        float on = step(k.y, uSince) * step(0.5, fract(uTime * 1.05));
        float d = box(q, r.zw * 0.5, 1.0);
        float f = fillAA(d) * on;
        col = vec4(A * f, f) + col * (1.0 - f);
        add += A * exp(-max(d, 0.0) / 8.0) * 0.5 * on;
      } else if (kind < 4.5) {
        // the podcast playing: the played part of the track, and its knob
        float p = clamp(k.y + uSince * 0.004, 0.0, 0.97);
        float d = box(q, r.zw * 0.5, r.w * 0.5);
        float f = fillAA(d) * step(l.x, p * r.z);
        col = vec4(mix(B, A, clamp(l.x / r.z, 0.0, 1.0)) * f, f) + col * (1.0 - f);
        float kd = length(px - vec2(r.x + p * r.z, c.y)) - 14.0;
        float kf = fillAA(kd);
        col = vec4(vec3(kf), kf) + col * (1.0 - kf);
        add += A * (exp(-max(kd, 0.0) / 10.0) * 0.7 + f * 0.25);
      } else if (kind < 5.5) {
        // level bars, bouncing
        float n = k.y;
        float bw = r.z / n;
        float idx = floor(l.x / bw);
        if (idx >= 0.0 && idx < n) {
          float h = (0.25 + 0.75 * abs(sin(uTime * (4.0 + idx * 0.9) + idx * 1.7))) * r.w;
          float hw = bw * 0.3;
          float f = fillAA(box(vec2(l.x - (idx + 0.5) * bw, l.y - (r.w - h * 0.5)), vec2(hw, h * 0.5), hw));
          col = vec4(A * f, f) + col * (1.0 - f);
        }
      } else if (kind < 6.5) {
        // the score ring, filling once the screen lights (k.y amount, k.z thickness, k.w delay)
        float R = r.z * 0.5;
        float d = length(q);
        float a = atan(q.x, -q.y + 1e-4) / (2.0 * PI);
        a = a < 0.0 ? a + 1.0 : a;
        float amt = k.y * smoothstep(k.w, k.w + 1.4, uSince);
        float f = fillAA(abs(d - (R - k.z * 0.5)) - k.z * 0.5) * step(a, amt);
        col = vec4(A * f, f) + col * (1.0 - f);
        vec2 head = vec2(sin(amt * 2.0 * PI), -cos(amt * 2.0 * PI)) * (R - k.z * 0.5);
        add += A * (exp(-length(q - head) / 10.0) * 0.9 * step(0.01, amt) + f * 0.3);
      } else if (kind < 7.5) {
        // the microphone, listening: a dot and rings going out
        float rad = r.z * 0.5;
        float d = length(q);
        float f = fillAA(d - rad);
        col = vec4(A * f, f) + col * (1.0 - f);
        for (int j = 0; j < 2; j++) {
          float ph = fract(uTime / 1.4 + float(j) * 0.5);
          add += A * smoothstep(3.0, 0.0, abs(d - rad - ph * 30.0)) * (1.0 - ph) * 0.8;
        }
        add += A * exp(-max(d - rad, 0.0) / 8.0) * 0.5;
      } else if (kind < 8.5) {
        // a glow round the right answer (k.y radius, k.z delay)
        float d = box(q, r.zw * 0.5, k.y);
        float on = smoothstep(k.z, k.z + 0.4, uSince) * (0.6 + 0.4 * sin(uTime * 2.6));
        add += B * (smoothstep(2.5, 0.0, abs(d)) * 0.7 + exp(-abs(d) / 16.0) * 0.35) * on;
      } else if (kind < 9.5) {
        // a sweep of light across a picture (k.y radius, k.z period, k.w offset)
        float d = box(q, r.zw * 0.5, k.y);
        float s = (l.x + l.y * 0.55) / (r.z + r.w * 0.55);
        float ph = fract((uTime + k.w) / k.z) * 1.8 - 0.4;
        float e = (s - ph) / 0.07;
        add += vec3(exp(-e * e) * 0.16 * step(d, 0.0));
      } else {
        // a line typing itself out: hidden behind its own background (A) until written, a caret (B) at the front
        float p = clamp((uSince - k.y) / k.z, 0.0, 1.0);
        float x = r.x + p * r.z;
        float inside = step(abs(q.y), r.w * 0.5) * step(abs(q.x), r.z * 0.5);
        float hide = inside * step(x, px.x);
        col = vec4(A * hide, hide) + col * (1.0 - hide);
        add += B * inside * step(abs(px.x - x - 4.0), 3.0) * step(0.001, p) * step(p, 0.999) * 1.4;
      }
    }
    // Power on: the screen lights from the top down behind a bright scan line
    float boot = smoothstep(0.0, 0.6, uSince);
    float edge = boot * ${TEX_H + 90}.0 - 50.0;
    float dark = step(edge, px.y);
    col = vec4(0.0, 0.0, 0.0, 1.0) * dark + col * (1.0 - dark);
    add *= 1.0 - dark;
    add += uAccent * exp(-abs(px.y - edge) / 6.0) * 2.2 * (1.0 - boot * boot);
    // and every few seconds a faint scan line passes
    float sy = fract(uTime / 6.5) * ${TEX_H + 400}.0 - 200.0;
    add += uAccent * exp(-abs(px.y - sy) / 14.0) * 0.05;
    gl_FragColor = vec4(col.rgb + add, col.a);
    ${TONE}
  }`;
const PLAIN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function screenFX(spec, time) {
  const rects = [];
  const kinds = [];
  const colA = [];
  const colB = [];
  for (const r of (spec ? spec.regions : []).slice(0, MAXR)) {
    const a = new THREE.Color(r.kind === 'type' ? r.mask : r.color || '#ffffff');
    const b = new THREE.Color(r.color2 || r.color || '#ffffff');
    const k = {
      wave: [r.bars, r.white ? 1 : 0, 0], dot: [0, 0, 0], cursor: [r.delay, 0, 0], progress: [r.from, 0, 0], eq: [r.bars, 0, 0],
      ring: [r.amount, r.thickness, r.delay], pulse: [0, 0, 0], glow: [r.radius, r.delay, 0], shine: [r.radius, r.period, r.offset],
      type: [r.delay, r.dur, 0]
    }[r.kind];
    if (!k) continue;
    if (r.kind === 'type') b.set(r.color);
    rects.push(new THREE.Vector4(...r.rect));
    kinds.push(new THREE.Vector4(KIND[r.kind], ...k));
    colA.push(a);
    colB.push(b);
  }
  const count = rects.length;
  while (rects.length < MAXR) {
    rects.push(new THREE.Vector4());
    kinds.push(new THREE.Vector4());
    colA.push(new THREE.Color());
    colB.push(new THREE.Color());
  }
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: time,
      uSince: { value: 0 },
      uCount: { value: count },
      uRect: { value: rects },
      uKind: { value: kinds },
      uColA: { value: colA },
      uColB: { value: colB },
      uAccent: { value: new THREE.Color(spec ? spec.accent : '#6ff0a6') }
    },
    vertexShader: PLAIN_VERT,
    fragmentShader: SCREEN_FX_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false
  });
}

/* ── The set: a lit grid behind, a grid floor in perspective; both glow more while a page is in the air ── */
function setMaterial(floor, shared) {
  return new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uLine;
      uniform vec3 uGlowA;
      uniform vec3 uGlowB;
      uniform float uEnergy;
      uniform float uRipple;
      uniform float uTime;
      varying vec3 vWorld;
      float grid(vec2 p, float cell) {
        vec2 g = abs(fract(p / cell - 0.5) - 0.5) / fwidth(p / cell);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec3 c = uBase;
        ${floor ? `
        vec2 p = vWorld.xz;
        float fade = exp(-length(p * vec2(0.32, 0.55)));
        c += uLine * grid(p, 0.5) * fade * 0.9;
        vec2 pool = p * vec2(0.42, 1.1);
        c += mix(uGlowA, uGlowB, smoothstep(-2.0, 2.0, p.x)) * exp(-dot(pool, pool)) * (0.05 + uEnergy * 0.07);
        float rr = uRipple * 2.6;
        float e = (length(p * vec2(1.0, 1.6)) - rr) / 0.06;
        float ring = exp(-e * e) * max(0.0, 1.0 - uRipple / 1.3);
        c += mix(uGlowA, uGlowB, 0.5) * ring * 1.8;` : `
        vec2 p = vWorld.xy;
        float fade = exp(-length((p - vec2(0.0, 0.4)) * vec2(0.26, 0.42)));
        c += uLine * grid(p, 0.6) * fade * 0.7;
        float glow = 0.07 + uEnergy * 0.08 + sin(uTime * 0.6) * 0.01;
        c += uGlowA * exp(-dot(p - vec2(-2.1, 0.5), p - vec2(-2.1, 0.5)) / 1.6) * glow;
        c += uGlowB * exp(-dot(p - vec2(2.1, 0.5), p - vec2(2.1, 0.5)) / 1.6) * glow;`}
        gl_FragColor = vec4(c, 1.0);
        ${TONE}
      }`
  });
}

/* ── A ribbon of light swept by a turning page's outer edge ── */
const TRAIL_N = 40;
function createRibbon(time) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 2 * 3), 3));
  geo.setAttribute('aBirth', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 2), 1));
  const v = new Float32Array(TRAIL_N * 2);
  const index = [];
  for (let i = 0; i < TRAIL_N; i++) {
    v[i * 2] = 0;
    v[i * 2 + 1] = 1;
    if (i < TRAIL_N - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  geo.setAttribute('aV', new THREE.BufferAttribute(v, 1));
  geo.setIndex(index);
  geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uA: { value: CYAN }, uB: { value: GREEN } },
    vertexShader: /* glsl */ `
      attribute float aBirth;
      attribute float aV;
      uniform float uTime;
      varying float vAge;
      varying float vV;
      void main() { vAge = (uTime - aBirth) / 0.55; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA;
      uniform vec3 uB;
      varying float vAge;
      varying float vV;
      void main() {
        float a = pow(clamp(1.0 - vAge, 0.0, 1.0), 2.2) * pow(max(sin(3.14159 * vV), 0.0), 0.6);
        gl_FragColor = vec4(mix(uA, uB, vV) * a * 1.5, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  }));
  mesh.frustumCulled = false;
  const samples = [];
  return {
    mesh,
    clear() { samples.length = 0; geo.setDrawRange(0, 0); },
    push(top, bottom, t) {
      samples.unshift({ top: top.clone(), bottom: bottom.clone(), t });
      if (samples.length > TRAIL_N) samples.pop();
      const pos = geo.attributes.position;
      const birth = geo.attributes.aBirth;
      samples.forEach((s, i) => {
        pos.setXYZ(i * 2, s.bottom.x, s.bottom.y, s.bottom.z);
        pos.setXYZ(i * 2 + 1, s.top.x, s.top.y, s.top.z);
        birth.setX(i * 2, s.t);
        birth.setX(i * 2 + 1, s.t);
      });
      pos.needsUpdate = true;
      birth.needsUpdate = true;
      geo.setDrawRange(0, Math.max(0, samples.length - 1) * 6);
    }
  };
}

/* ── Sparks thrown off a turning page's edge ── */
const SPARKS = 180;
function createSparks(time) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(SPARKS * 3);
  const birth = new Float32Array(SPARKS).fill(-99);
  const hue = new Float32Array(SPARKS);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1));
  geo.setAttribute('aHue', new THREE.BufferAttribute(hue, 1));
  const vel = new Float32Array(SPARKS * 3);
  const life = new Float32Array(SPARKS).fill(1);
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uA: { value: CYAN }, uB: { value: GREEN }, uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      attribute float aBirth;
      attribute float aHue;
      uniform float uTime;
      uniform float uScale;
      varying float vAge;
      varying float vHue;
      void main() {
        vAge = (uTime - aBirth) / 0.9;
        vHue = aHue;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = vAge < 1.0 ? uScale * (0.022 + 0.02 * (1.0 - vAge)) / -mv.z : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA;
      uniform vec3 uB;
      varying float vAge;
      varying float vHue;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0) * pow(clamp(1.0 - vAge, 0.0, 1.0), 1.5);
        gl_FragColor = vec4(mix(uA, uB, vHue) * a * 3.0, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  points.frustumCulled = false;
  let next = 0;
  return {
    points,
    setScale(px) { points.material.uniforms.uScale.value = px; },
    emit(at, v, t) {
      const i = next;
      next = (next + 1) % SPARKS;
      pos.set([at.x, at.y, at.z], i * 3);
      vel.set([v.x, v.y, v.z], i * 3);
      birth[i] = t;
      life[i] = 0.9;
      hue[i] = Math.random();
    },
    update(dt, t) {
      const drag = Math.exp(-1.8 * dt);
      for (let i = 0; i < SPARKS; i++) {
        if (t - birth[i] > life[i]) continue;
        vel[i * 3] *= drag;
        vel[i * 3 + 1] = vel[i * 3 + 1] * drag + 0.25 * dt;
        vel[i * 3 + 2] *= drag;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aBirth.needsUpdate = true;
      geo.attributes.aHue.needsUpdate = true;
    }
  };
}

export async function createBook(canvas, { screens, version = '', film = null, calm = false, mirror = true, glow = true, msaa = null }) {
  const v = version ? `?v=${version}` : '';
  // Always running while on screen: even with reduced motion, a page someone turns should turn
  const stage = createStage(canvas, { fov: 30, exposure: 1.0, honorReducedMotion: false });
  const { scene, camera, renderer } = stage;
  renderer.setClearColor(PAGE_BG, 1);
  const names = ['cover', 'ui-0', 'ui-1', 'ui-2', 'ui-3', 'media-0', 'media-1', 'media-2', 'media-3', 'back'];
  const tex = {};
  const [spec] = await Promise.all([
    fetch(`${screens}live.json${v}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ...names.map(async (name) => { tex[name] = await loadTexture(`${screens}${name}.webp${v}`, renderer); })
  ]);
  const time = { value: 0 }; // for the trail and sparks
  const screenTime = { value: 2 }; // for the screens' moving parts (held still when calm)

  // ── Post-processing: the lit parts bloom ──
  // (a render target of its own, multisampled: post-processing skips the canvas's antialiasing)
  let composer = null;
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
  // Smooth edges need a multisampled float target: only where the GPU says it can (software renderers can't)
  if (msaa === null) msaa = renderer.extensions.has('EXT_color_buffer_float') && !/llvmpipe|swiftshader|software/i.test(gpu) ? 4 : 0;
  if (glow) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa }));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.85));
    composer.addPass(new OutputPass());
    stage.setRender(() => composer.render());
  }

  // ── Materials: black glass with a clear coat, mirror-polished chrome, lit screens under glass ──
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd6dadf, metalness: 1, roughness: 0.13 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x030405, metalness: 0, roughness: 0.42, specularIntensity: 0.3, clearcoat: 1, clearcoatRoughness: 0.03
  });
  const screenMaterial = (map) => new THREE.MeshPhysicalMaterial({
    color: 0x000000, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1, metalness: 0, roughness: 0.5,
    specularIntensity: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.15
  });

  const pageGeo = slabGeometry(SW, SH, PT, 0.12);
  const coverGeo = slabGeometry(COVER.w, COVER.h, COVER.t, 0.14);
  const screenGeo = panelGeometry(SCW, SCH, 0.08);

  const rig = new THREE.Group(); // leans with the pointer
  const book = new THREE.Group(); // turns and shifts as it opens
  rig.add(book);
  scene.add(rig);

  // ── The pages, as in a real book: CL, the front cover (its face is what you see while it's closed; its inside,
  // media-0, is the first left-hand page, so opening turns the cover alone); P0..P3, the pages that turn (the last
  // one's back, end-0, opens the last spread); CR, the back cover, end-1 inside. The covers are a little larger ──
  const pages = {};
  const faces = {}; // "P1:front" → { fx, since }
  let filmMesh = null;
  function page(name, { front, back, cover = false } = {}) {
    const pivot = new THREE.Group();
    const geo = cover ? coverGeo : pageGeo;
    const xc = cover ? GAP0 + COVER.w / 2 : XC;
    const t = cover ? COVER.t : PT;
    const slab = new THREE.Mesh(geo, [glass, chrome]);
    slab.position.x = xc;
    pivot.add(slab);
    const face = (picture, side) => {
      const m = new THREE.Mesh(screenGeo, screenMaterial(tex[picture]));
      m.position.set(xc, 0, side * (t / 2 + 0.0015));
      if (side < 0) m.rotation.y = Math.PI;
      pivot.add(m);
      // its live layer, just above the glass
      const fx = new THREE.Mesh(screenGeo, screenFX(spec[picture], screenTime));
      fx.position.z = 0.0006;
      fx.renderOrder = 1;
      m.add(fx);
      faces[`${name}:${side > 0 ? 'front' : 'back'}`] = { fx, since: 0, mesh: m };
      return m;
    };
    const faceFront = front ? face(front, 1) : null;
    const faceBack = back ? face(back, -1) : null;
    const filmFace = front === 'media-0' ? faceFront : back === 'media-0' ? faceBack : null;
    if (filmFace && film) {
      // The film's own panel, over the square in the picture; it shows once the film is playing
      const video = new THREE.VideoTexture(film);
      video.colorSpace = THREE.SRGBColorSpace;
      const mat = screenMaterial(video);
      mat.transparent = true;
      mat.opacity = 0;
      filmMesh = new THREE.Mesh(panelGeometry(FILM.size, FILM.size, FILM.r), mat);
      filmMesh.position.set(0, FILM.y, 0.001);
      filmMesh.renderOrder = 2;
      filmFace.add(filmMesh);
    }
    book.add(pivot);
    pages[name] = pivot;
  }
  // Each open spread: its words on the left (the back of the card before), its picture on the right (the card's face)
  page('CL', { front: 'cover', back: 'ui-0', cover: true });
  for (let i = 0; i < 4; i++) page(`P${i}`, { front: `media-${i}`, back: i < 3 ? `ui-${i + 1}` : null });
  page('CR', { back: 'back', cover: true });

  // ── Motion graphics: the trail of light (two, so one can fade while the next page starts), the sparks ──
  const trails = [createRibbon(time), createRibbon(time)];
  trails.forEach((t) => book.add(t.mesh));
  let trailIndex = 0;
  let trailPage = null;
  const sparks = createSparks(time);
  book.add(sparks.points);

  // ── The set: a lit grid behind, a grid floor, a black mirror over it, a soft shadow under the book ──
  const setUniforms = {
    uBase: { value: new THREE.Color(PAGE_BG) },
    uLine: { value: new THREE.Color(0x58c8a8).multiplyScalar(0.07) },
    uGlowA: { value: CYAN.clone() },
    uGlowB: { value: GREEN.clone() },
    uEnergy: { value: 0 },
    uRipple: { value: 9 },
    uTime: time
  };
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), setMaterial(false, setUniforms));
  backdrop.position.set(0, 1.5, -4.5);
  scene.add(backdrop);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), setMaterial(true, setUniforms));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = FLOOR_Y - 0.004;
  ground.renderOrder = -3;
  scene.add(ground);
  if (mirror) {
    const floor = createMirrorFloor(renderer, { strength: 0.32, fade: 0.9, resolution: 0.5 });
    floor.mesh.position.y = FLOOR_Y;
    scene.add(floor.mesh);
    floor.reflect(rig);
  }
  const shadow = createContactShadow({ opacity: 0.55, color: '0, 0, 0' });
  shadow.scale.set(4.2, 1.1, 1);
  shadow.position.y = FLOOR_Y + 0.001;
  scene.add(shadow);

  // ── Where every page rests: the right (side 1) or left (-1) stack, j pages deep ──
  const pose = (side, j) => (side > 0
    ? [-A + j * D, j * SP * Math.sin(A), j * SP * Math.cos(A)]
    : [-(Math.PI - A) - j * D, -j * SP * Math.sin(A), j * SP * Math.cos(A)]);
  // Spread k (0..3) open; k = -1: closed on its cover, everything on the right; k = LAST: closed again at the end,
  // everything on the left, the back cover on top
  const SPREADS = new Map();
  const spread = (k) => {
    if (SPREADS.has(k)) return SPREADS.get(k);
    const left = k < 0 ? [] : k >= LAST
      ? ['CR', 'P3', 'P2', 'P1', 'P0', 'CL']
      : [...Array.from({ length: k }, (_, i) => `P${k - 1 - i}`), 'CL'];
    const right = k < 0
      ? ['CL', 'P0', 'P1', 'P2', 'P3', 'CR']
      : k >= LAST ? [] : [...Array.from({ length: LAST - k }, (_, i) => `P${k + i}`), 'CR'];
    const s = {};
    left.forEach((n, j) => { s[n] = pose(-1, j); });
    right.forEach((n, j) => { s[n] = pose(1, j); });
    SPREADS.set(k, s);
    return s;
  };

  // Closing at the end: when, within that last turn, the last card and then the back cover make their moves
  const CLOSING = { P3: [0, 0.68], CR: [0.32, 1] };
  let pos = -1; // -1 closed, 0..3 the spreads, LAST closed again at the back; fractional mid-turn
  let goal = pos;
  let dragFrom = null; // a page turned by hand: the spread it started from, and where the finger has it
  let dragTo = 0;
  let visible = false;
  let yaw = 0;
  let pitch = 0;
  let tYaw = 0;
  let tPitch = 0;
  let pointer = false;
  let filmWanted = false;
  let anchorFn = null;
  let anchorShown = false;
  const anchorPoint = new THREE.Vector3();
  // the page that faces you on the open spread: the card's picture, or at the end the back cover
  const openFace = () => (pos >= 0 && Number.isInteger(pos) ? faces[pos < LAST ? `P${pos}:front` : 'CR:back'] : null);
  let wasMoving = false;
  const base = new THREE.Vector3();
  let lookY = -0.08;

  function layout() {
    const k = Math.min(Math.floor(pos), LAST - 1);
    const p = pos - k;
    const a = spread(k);
    const b = spread(k + 1);
    for (const [name, pivot] of Object.entries(pages)) {
      // closing at the end, the last card goes over first and the back cover follows it down
      const lag = k === LAST - 1 ? CLOSING[name] : null;
      const e = lag ? ease(clamp01((p - lag[0]) / (lag[1] - lag[0]))) : ease(p);
      const [a0, x0, z0] = a[name];
      const [a1, x1, z1] = b[name];
      pivot.rotation.y = a0 + (a1 - a0) * e;
      pivot.position.set(x0 + (x1 - x0) * e, 0, -(z0 + (z1 - z0) * e));
    }
    // Closed, the book turns its cover to face you and stands in the middle; it swings round as it opens. Closed
    // again at the end, it turns the other way, to show you its back
    const closed = ease(clamp01(-pos));
    const shut = ease(clamp01(pos - (LAST - 1)));
    const r = (closed - shut) * A;
    book.rotation.y = r;
    // centred on its own width, so a heavier stack on one side never pushes it off the middle
    let lo = Infinity;
    let hi = -Infinity;
    for (const [name, pivot] of Object.entries(pages)) {
      const reach = name[0] === 'C' ? GAP0 + COVER.w : GAP0 + SW;
      const a = pivot.rotation.y;
      for (const d of [0, reach]) {
        const x = pivot.position.x + Math.cos(a) * d;
        const z = pivot.position.z - Math.sin(a) * d;
        const wx = x * Math.cos(r) + z * Math.sin(r);
        lo = Math.min(lo, wx);
        hi = Math.max(hi, wx);
      }
    }
    book.position.x = -(lo + hi) / 2;
  }

  // Which screens can be seen now: the open spread's two, and while a page turns, the ones it uncovers and the one
  // on its back once it has swung past the middle
  const swung = (name) => pages[name].rotation.y < -Math.PI / 2;
  function seenFaces() {
    const seen = new Set();
    if (pos < 0) {
      if (!swung('CL')) seen.add('CL:front');
      if (pos > -1) {
        seen.add('P0:front');
        if (swung('CL')) seen.add('CL:back');
      }
      return seen;
    }
    const k = Math.min(Math.floor(pos), LAST);
    const p = pos - k;
    if (k >= LAST) {
      seen.add('CR:back');
      return seen;
    }
    seen.add(`${k === 0 ? 'CL' : `P${k - 1}`}:back`);
    seen.add(`P${k}:${p > 0 && swung(`P${k}`) ? 'back' : 'front'}`);
    if (p > 0) seen.add(k + 1 < LAST ? `P${k + 1}:front` : `CR:${swung('CR') ? 'back' : 'front'}`);
    return seen;
  }

  // The turning page (if any) and its outer edge, top and bottom, in the book's space
  const top = new THREE.Vector3();
  const bottom = new THREE.Vector3();
  const lastTop = new THREE.Vector3();
  const lastBottom = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const vel = new THREE.Vector3();
  function turningPage() {
    if (pos === goal && Number.isInteger(pos)) return null;
    if (pos < 0) return pos > -1 ? 'CL' : null;
    const k = Math.floor(pos);
    if (!(pos - k > 0) || k >= LAST) return null;
    return k === LAST - 1 && pos - k > 0.55 ? 'CR' : `P${k}`;
  }
  function edge(name) {
    const pivot = pages[name];
    const reach = name[0] === 'C' ? GAP0 + COVER.w : GAP0 + SW;
    const h = (name[0] === 'C' ? COVER.h : SH) / 2 - 0.06;
    const a = pivot.rotation.y;
    const x = pivot.position.x + Math.cos(a) * reach;
    const z = pivot.position.z - Math.sin(a) * reach;
    top.set(x, h, z);
    bottom.set(x, -h, z);
  }

  // Framing: the open book, its fanned pages and a little of its reflection, whatever the shape of the canvas
  stage.onResize(({ width, height }) => {
    const aspect = width / height;
    const t = Math.tan((camera.fov / 2) * DEG);
    const dist = Math.max(2.02 / (t * aspect), (0.715 * COVER.h) / t) / 1.21; // a fifth closer than a loose fit: bigger, bolder
    const el = 7 * DEG;
    base.set(0, lookY + dist * Math.sin(el), dist * Math.cos(el));
    camera.position.copy(base);
    camera.lookAt(0, lookY, 0);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    }
    sparks.setScale(height * renderer.getPixelRatio() / (2 * t));
  });

  stage.onFrame((now, dt) => {
    time.value = now;
    if (!calm) screenTime.value = now;
    // Under a finger, the page follows it; otherwise it turns toward the goal: a page in a little over a second, a
    // riffle through several faster, the opening slower
    const before = pos;
    if (dragFrom !== null) pos = Math.abs(dragTo - pos) < 1e-4 ? dragTo : damp(pos, dragTo, 14, dt || 1);
    else if (pos !== goal && dt > 0) {
      const span = Math.abs(goal - pos);
      const perTurn = pos < 0 ? 2.2 : span > 1.001 ? 0.62 : 1.35;
      const move = dt / perTurn;
      pos = span <= move ? goal : pos + Math.sign(goal - pos) * move;
    }
    layout();
    const moving = pos !== before;
    // A page in the air: how far through its turn, for the light, the camera and the glow
    const frac = pos - Math.floor(pos);
    const energy = moving ? Math.sin(Math.PI * (pos < 0 ? pos + 1 : frac || 1)) : 0;
    setUniforms.uEnergy.value = damp(setUniforms.uEnergy.value, energy, 6, dt || 1);

    // The trail and the sparks off the turning page's edge
    const turning = turningPage();
    if (turning && moving) {
      if (turning !== trailPage) {
        trailIndex = 1 - trailIndex;
        trails[trailIndex].clear();
        trailPage = turning;
        edge(turning);
        lastTop.copy(top);
        lastBottom.copy(bottom);
      }
      edge(turning);
      trails[trailIndex].push(top, bottom, now);
      if (dt > 0) {
        vel.copy(top).sub(lastTop).divideScalar(dt);
        const n = calm ? 0 : Math.min(6, Math.round(dt * 140 * energy));
        for (let i = 0; i < n; i++) {
          const f = Math.random();
          tmp.copy(bottom).lerp(top, f);
          sparks.emit(tmp, vel.clone().multiplyScalar(0.25 + Math.random() * 0.2)
            .add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.4, (Math.random() - 0.5) * 0.5)), now);
        }
      }
      lastTop.copy(top);
      lastBottom.copy(bottom);
    } else if (!moving) trailPage = null;
    sparks.update(dt, now);

    // Landing: a ripple across the floor
    if (wasMoving && !moving && dragFrom === null && Number.isInteger(pos)) setUniforms.uRipple.value = 0;
    wasMoving = moving;
    setUniforms.uRipple.value += dt;

    // The live screens: each starts (powers on, types) when it comes into view
    const seen = seenFaces();
    for (const [key, f] of Object.entries(faces)) {
      const on = seen.has(key);
      f.since = on ? f.since + dt : 0;
      f.fx.material.uniforms.uSince.value = f.since;
      f.fx.visible = on;
    }

    // The camera leans in a little while a page is in the air, straight on, so the book stays in the middle
    const lean = calm ? 0 : energy * energy;
    camera.position.set(base.x, base.y + lean * 0.05, base.z - lean * 0.22);
    camera.lookAt(0, lookY, 0);

    // The book leans toward the pointer, or sways a touch at rest
    const sway = pointer || calm ? 0 : 1;
    yaw = damp(yaw, tYaw + sway * Math.sin(now * 0.33) * 0.05, 3.2, dt || 1);
    pitch = damp(pitch, tPitch + sway * Math.sin(now * 0.27) * 0.02, 3.2, dt || 1);
    rig.rotation.set(pitch, yaw, 0);

    // Where Learn more rides: on the open page's bezel, just under its screen (canvas pixels); nowhere mid-turn
    if (anchorFn) {
      const settled = dragFrom === null && pos === goal && Number.isInteger(pos) && pos >= 0;
      const f = settled ? openFace() : null;
      if (f) {
        camera.updateMatrixWorld();
        f.mesh.updateWorldMatrix(true, false);
        anchorPoint.set(0, -SCH / 2 - 0.035, 0.002).applyMatrix4(f.mesh.matrixWorld).project(camera);
        const { width, height } = stage.size;
        anchorFn({ x: ((anchorPoint.x + 1) / 2) * width, y: ((1 - anchorPoint.y) / 2) * height, show: true });
        anchorShown = true;
      } else if (anchorShown) {
        anchorFn({ show: false });
        anchorShown = false;
      }
    }

    // The film plays while its page can be seen, and shows once it is running
    if (film && filmMesh) {
      const want = visible && goal >= 0 && pos > -0.4 && pos < 1;
      if (want !== filmWanted) {
        filmWanted = want;
        if (want) {
          if (!film.getAttribute('src') && film.dataset.src) film.src = film.dataset.src;
          film.play().catch(() => {});
        } else film.pause();
      }
      const end = Number(film.dataset.loopEnd) || 0;
      if (end && film.currentTime > end) film.currentTime = 0;
      const on = !film.paused && film.currentTime > 0 && film.readyState >= 2;
      filmMesh.material.opacity = damp(filmMesh.material.opacity, on ? 1 : 0, 6, dt || 1);
    }
  });
  layout();
  stage.renderOnce();

  return {
    canvas,
    /** What it's running on, for ?debug. */
    info: `${gpu.replace(/^ANGLE \((.*)\)$/, '$1') || 'WebGL'} · msaa ${msaa}${calm ? ' · calm' : ''}`,
    isOpen: () => goal >= 0,
    /** A page put back where it was, mid-drag. */
    dragCancel() {
      if (dragFrom === null) return;
      goal = dragFrom;
      dragFrom = null;
    },
    /** Opens the book onto its first spread. */
    open() {
      if (goal < 0) goal = 0;
    },
    /** Closes it again, onto its cover. */
    close() {
      goal = -1;
    },
    /** Turns to spread k; jumps of several pages riffle through. */
    setPage(k) {
      goal = k;
    },
    /** A page by hand: start, move (in pages: +1 a whole page on, -1 one back), let go (returns where it settles:
        the next or previous spread if it went far enough, else where it started; -1 if still closed). */
    dragStart() {
      dragFrom = Math.max(-1, Math.min(LAST, Math.round(dragFrom ?? goal)));
      dragTo = pos;
    },
    dragMove(d) {
      if (dragFrom === null) return;
      const lo = Math.max(-1, dragFrom - 1); // back from the first spread closes the book
      dragTo = Math.min(Math.min(LAST, dragFrom + 1), Math.max(lo, dragFrom + d));
    },
    dragEnd() {
      if (dragFrom === null) return goal;
      const d = dragTo - dragFrom;
      goal = Math.abs(d) > 0.2 ? dragFrom + Math.sign(d) : dragFrom;
      dragFrom = null;
      return goal;
    },
    /** Opens straight onto spread k, no animation (a page was chosen while it loaded). */
    jumpTo(k) {
      pos = goal = k;
      layout();
      stage.renderOnce();
    },
    setVisible(v) { visible = v; },
    /** A pop-up covers the book: stop drawing it until it's gone. */
    hold(v) { stage.hold(v); },
    /** Each frame, where Learn more should ride: fn({ x, y, show }) in canvas pixels. */
    onAnchor(fn) { anchorFn = fn; },
    /** The open page powers on again (its scan line runs down), as it fires the laser. */
    reboot() {
      const f = openFace();
      if (f) f.since = 0;
    },
    /** Lean toward the pointer: x, y in -1..1; null when it leaves. */
    lean(x, y) {
      pointer = x !== null;
      tYaw = pointer ? x * 0.2 : 0;
      tPitch = pointer ? y * 0.07 : 0;
    }
  };
}
