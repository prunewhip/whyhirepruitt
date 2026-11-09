/**
 * Procedural devices, finished like product shots: a phone in polished metal and glass that shows real app
 * screens, and G1-style smart glasses with a green heads-up display.
 * Sizes are in world units; a phone is 1 unit wide.
 */

import { THREE } from './stage.js';
import { RoundedBoxGeometry } from '../../assets/vendor/three/RoundedBoxGeometry.js';

const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Rounded-corner screen with a crossfade between two textures
const SCREEN_FRAGMENT = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform vec2 uScaleA;
  uniform vec2 uScaleB;
  uniform float uMix;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uBright;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // "cover" fit, anchored to the top of the screen like a real app
  vec2 cover(vec2 uv, vec2 s) {
    return vec2(0.5 + (uv.x - 0.5) * s.x, 1.0 - (1.0 - uv.y) * s.y);
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = roundBox(p, uSize * 0.5, uRadius);
    float aa = fwidth(d) * 1.2;
    float mask = 1.0 - smoothstep(-aa, aa, d);

    vec3 a = texture2D(uA, cover(vUv, uScaleA)).rgb;
    vec3 b = texture2D(uB, cover(vUv, uScaleB)).rgb;
    vec3 col = mix(a, b, smoothstep(0.0, 1.0, uMix)) * uBright;

    // The display dims a little at grazing angles, as real panels do; the cover glass adds the reflections
    float facing = max(dot(vNormalW, vViewDir), 0.0);
    col *= mix(0.78, 1.0, smoothstep(0.0, 0.6, facing));

    gl_FragColor = vec4(col, mask);
    #include <colorspace_fragment>
  }
`;

const placeholder = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([22, 26, 32, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
})();

/** Scale that makes a texture "cover" a screen of the given aspect ratio. */
function coverScale(tex, screenAspect) {
  const img = tex.image;
  const texAspect = img && img.width ? img.width / img.height : screenAspect;
  return texAspect > screenAspect
    ? new THREE.Vector2(screenAspect / texAspect, 1)
    : new THREE.Vector2(1, texAspect / screenAspect);
}

/* ── Smooth shapes ─────────────────────────────────────────────────── */

/** Points around a rounded rectangle (centred, counter-clockwise), each with its outward normal. */
function roundedRectOutline(w, h, r, segments = 16) {
  const out = [];
  const x = w / 2 - r;
  const y = h / 2 - r;
  [[x, y], [-x, y], [-x, -y], [x, -y]].forEach(([cx, cy], k) => {
    for (let i = 0; i <= segments; i++) {
      const a = (k + i / segments) * (Math.PI / 2);
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
    }
  });
  return out;
}

/** Outward normals for any closed counter-clockwise outline, from each point's neighbours. */
function withNormals(points) {
  return points.map((p, i) => {
    const a = points[(i + points.length - 1) % points.length];
    const b = points[(i + 1) % points.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x, y: p.y, nx: (b.y - a.y) / l, ny: -(b.x - a.x) / l };
  });
}

/** A quarter (or any) arc of a cross-section: points { o, z } with normals { nr, nz }, from angle a0 to a1. */
function arc(co, cz, r, a0, a1, steps) {
  const out = [];
  for (let s = 0; s <= steps; s++) {
    const a = a0 + ((a1 - a0) * s) / steps;
    out.push({ o: co + Math.cos(a) * r, z: cz + Math.sin(a) * r, nr: Math.cos(a), nz: Math.sin(a) });
  }
  return out;
}

/**
 * Sweeps a cross-section around a closed outline. Each profile point is an offset out along the outline's normal
 * (o), a depth (z) and a normal in that plane (nr, nz); the profile runs from the front (+z) to the back along the
 * outside. Normals are smooth everywhere, so glossy edges catch one clean, unbroken highlight.
 *   bands  [[fromIndex, toIndex, materialIndex], ...] over the profile, for different finishes
 *   caps   [{ z, normal: 1 | -1, material }], flat faces filling the outline at that depth
 */
function sweepGeometry(outline, profile, { closed = false, bands = [[0, profile.length - 1, 0]], caps = [] } = {}) {
  const positions = [];
  const normals = [];
  const index = [];
  const geometry = new THREE.BufferGeometry();
  const n = new THREE.Vector3();
  outline.forEach((p) => profile.forEach((q) => {
    positions.push(p.x + p.nx * q.o, p.y + p.ny * q.o, q.z);
    n.set(p.nx * q.nr, p.ny * q.nr, q.nz).normalize();
    normals.push(n.x, n.y, n.z);
  }));
  const P = profile.length;
  const N = outline.length;
  const vertex = (i, j) => (i % N) * P + (j % P);
  bands.forEach(([from, to, material]) => {
    const start = index.length;
    for (let j = from; j < to; j++) {
      for (let i = 0; i < N; i++) {
        const a = vertex(i, j);
        const b = vertex(i + 1, j);
        const c = vertex(i + 1, j + 1);
        const d = vertex(i, j + 1);
        index.push(a, c, b, a, d, c);
      }
    }
    geometry.addGroup(start, index.length - start, material);
  });
  if (closed) {
    const start = index.length;
    for (let i = 0; i < N; i++) index.push(vertex(i, P - 1), vertex(i + 1, 0), vertex(i + 1, P - 1), vertex(i, P - 1), vertex(i, 0), vertex(i + 1, 0));
    geometry.addGroup(start, index.length - start, bands[bands.length - 1][2]);
  }
  caps.forEach(({ z, normal, material, offset = 0 }) => {
    const start = index.length;
    const centre = positions.length / 3;
    positions.push(0, 0, z);
    normals.push(0, 0, normal);
    outline.forEach((p) => {
      positions.push(p.x + p.nx * offset, p.y + p.ny * offset, z);
      normals.push(0, 0, normal);
    });
    for (let i = 0; i < N; i++) {
      const a = centre + 1 + i;
      const b = centre + 1 + ((i + 1) % N);
      if (normal > 0) index.push(centre, a, b);
      else index.push(centre, b, a);
    }
    geometry.addGroup(start, index.length - start, material);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  // Planar UVs across the front, for anything that wants a texture
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const uvs = [];
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push((positions[i] - box.min.x) / (box.max.x - box.min.x), (positions[i + 1] - box.min.y) / (box.max.y - box.min.y));
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  return geometry;
}

/**
 * Tilts the normals of a face looking along ±z outward toward its edges, as if it bulged very slightly. A flat
 * face reflects the studio as one even tone; the tilt spreads each softbox into a soft gradient across it, the way
 * glass looks in a product shot. The tilt grows linearly from the centre (bend at the edge, in radians roughly), so
 * plain triangles interpolate it exactly. Side faces (normals with no z) are left alone.
 */
function domeNormals(geometry, bend, halfWidth, halfHeight) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < normal.count; i++) {
    const s = Math.abs(normal.getZ(i)) * bend;
    n.set(normal.getX(i) + (s * position.getX(i)) / halfWidth, normal.getY(i) + (s * position.getY(i)) / halfHeight, normal.getZ(i)).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  return geometry;
}

/**
 * A slab with rounded corners and softly rounded edges, like a phone body or a pane of glass.
 * Bands: 0 the front and its edge, 1 the sides, 2 the back edge and back. `dome` bulges the faces (see domeNormals).
 */
export function roundedSlab(width, height, depth, radius, { edge = depth * 0.36, frontEdge = 0.4, backEdge = 0.4, segments = 16, dome = 0 } = {}) {
  const outline = roundedRectOutline(width - edge * 2, height - edge * 2, Math.max(0.001, radius - edge), segments);
  const front = arc(0, depth / 2 - edge, edge, Math.PI / 2, 0, 10);
  const back = arc(0, -depth / 2 + edge, edge, 0, -Math.PI / 2, 10);
  const profile = [...front, ...back];
  // Where the glass gives way to the frame, as a share of each rounded edge
  const f = Math.round(10 * frontEdge);
  const b = 11 + Math.round(10 * (1 - backEdge));
  const geometry = sweepGeometry(outline, profile, {
    bands: [[0, f, 0], [f, b, 1], [b, profile.length - 1, 2]],
    caps: [{ z: depth / 2, normal: 1, material: 0 }, { z: -depth / 2, normal: -1, material: 2 }]
  });
  return dome ? domeNormals(geometry, dome, width / 2, height / 2) : geometry;
}

/**
 * A transparent sheet that only adds reflections: a glossy coat over a screen or a lens. Its light is added to
 * what's behind it while the canvas's alpha is left alone, so a clear lens stays clear over the page.
 */
export function glassCoat({ intensity = 1, roughness = 0.03 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0,
    roughness,
    envMapIntensity: intensity,
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false
  });
}

/* ── Phone ─────────────────────────────────────────────────────────── */

export function createPhone({ width = 1 } = {}) {
  const height = width * 2.16;
  const depth = width * 0.088;
  const radius = width * 0.14;
  const group = new THREE.Group();

  // Finishes: black front glass, a polished graphite frame, and frosted spruce glass on the back under a glossy coat
  const frontGlass = new THREE.MeshPhysicalMaterial({ color: 0x050607, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 });
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x5a6066, metalness: 1, roughness: 0.22, envMapIntensity: 1.2 });
  const backGlass = new THREE.MeshPhysicalMaterial({
    color: 0x2a5246,
    metalness: 0.1,
    roughness: 0.4,
    clearcoat: 0.75,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.1
  });
  const body = new THREE.Mesh(roundedSlab(width, height, depth, radius, { frontEdge: 0.35, backEdge: 0.35, dome: 0.12 }), [frontGlass, frame, backGlass]);
  group.add(body);

  // Side buttons: pills of the frame metal
  const button = new RoundedBoxGeometry(depth * 0.36, height * 0.085, depth * 0.4, 4, depth * 0.18);
  [0.25, 0.11].forEach((y, i) => {
    const b = new THREE.Mesh(button, frame);
    b.position.set(width / 2 + depth * 0.06, height * y, 0);
    if (i === 1) b.scale.y = 1.6;
    group.add(b);
  });

  // The camera module, top left seen from the back: a raised glass island, three lenses in polished rings and a flash
  const islandGlass = new THREE.MeshPhysicalMaterial({ color: 0x22443a, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  const island = new THREE.Mesh(roundedSlab(width * 0.38, width * 0.38, depth * 0.34, width * 0.1, { edge: depth * 0.14, dome: 0.2 }), [islandGlass, islandGlass, islandGlass]);
  const islandX = width * 0.25;
  const islandY = height * 0.5 - width * 0.29;
  const islandZ = -depth / 2 - depth * 0.15;
  island.position.set(islandX, islandY, islandZ);
  group.add(island);
  const ring = new THREE.MeshPhysicalMaterial({ color: 0x8b9096, metalness: 1, roughness: 0.12, envMapIntensity: 1.4 });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x020304,
    metalness: 0.2,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 520],
    envMapIntensity: 1.6
  });
  const barrel = new THREE.CylinderGeometry(width * 0.068, width * 0.07, depth * 0.36, 48);
  const glassDisc = new THREE.CylinderGeometry(width * 0.053, width * 0.053, depth * 0.06, 48);
  const element = new THREE.TorusGeometry(width * 0.03, width * 0.006, 12, 48);
  // Two lenses stacked on the outer side, one between them on the inner side
  [[0.08, 0.077], [0.08, -0.077], [-0.075, 0]].forEach(([x, y]) => {
    const lens = new THREE.Group();
    const b = new THREE.Mesh(barrel, ring);
    const g = new THREE.Mesh(glassDisc, lensGlass);
    g.position.y = depth * 0.17;
    const e = new THREE.Mesh(element, ring);
    e.rotation.x = Math.PI / 2;
    e.position.y = depth * 0.2;
    lens.add(b, g, e);
    lens.rotation.x = -Math.PI / 2;
    lens.position.set(islandX + width * x, islandY + width * y, islandZ - depth * 0.24);
    group.add(lens);
  });
  const flash = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.026, width * 0.026, depth * 0.1, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xf2ead2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 })
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.set(islandX - width * 0.085, islandY + width * 0.115, islandZ - depth * 0.16);
  group.add(flash);

  // Screen: inset by an even bezel, its corners following the body's
  const bezel = width * 0.035;
  const sw = width - bezel * 2;
  const sh = height - bezel * 2;
  const screenRadius = radius - bezel;
  const screenAspect = sw / sh;
  const uniforms = {
    uA: { value: placeholder },
    uB: { value: placeholder },
    uScaleA: { value: new THREE.Vector2(1, 1) },
    uScaleB: { value: new THREE.Vector2(1, 1) },
    uMix: { value: 0 },
    uSize: { value: new THREE.Vector2(sw, sh) },
    uRadius: { value: screenRadius },
    uBright: { value: 1.0 }
  };
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(sw, sh),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: SCREEN_VERTEX,
      fragmentShader: SCREEN_FRAGMENT,
      transparent: true,
      toneMapped: false
    })
  );
  screen.position.z = depth / 2 + 0.0015;
  group.add(screen);
  // The cover glass over the screen: the studio's softboxes glide across it as the phone turns
  const coverShape = new THREE.Shape();
  coverShape.moveTo(-sw / 2 + screenRadius, -sh / 2);
  coverShape.lineTo(sw / 2 - screenRadius, -sh / 2);
  coverShape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + screenRadius);
  coverShape.lineTo(sw / 2, sh / 2 - screenRadius);
  coverShape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - screenRadius, sh / 2);
  coverShape.lineTo(-sw / 2 + screenRadius, sh / 2);
  coverShape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - screenRadius);
  coverShape.lineTo(-sw / 2, -sh / 2 + screenRadius);
  coverShape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + screenRadius, -sh / 2);
  // (kept flat: a domed cover washes the app out along one edge at an angle)
  const cover = new THREE.Mesh(new THREE.ShapeGeometry(coverShape, 12), glassCoat({ intensity: 0.75 }));
  cover.position.z = depth / 2 + 0.003;
  cover.renderOrder = 2;
  group.add(cover);

  let fade = null;

  return {
    group,
    width,
    height,
    /** Shows a texture, crossfading from whatever is on screen now. */
    show(tex, { instant = false } = {}) {
      if (instant || uniforms.uA.value === placeholder) {
        uniforms.uA.value = tex;
        uniforms.uScaleA.value = coverScale(tex, screenAspect);
        uniforms.uMix.value = 0;
        fade = null;
        return;
      }
      uniforms.uB.value = tex;
      uniforms.uScaleB.value = coverScale(tex, screenAspect);
      fade = { t: 0 };
    },
    update(dt) {
      if (!fade) return;
      fade.t = Math.min(1, fade.t + dt / 0.6);
      uniforms.uMix.value = fade.t;
      if (fade.t >= 1) {
        uniforms.uA.value = uniforms.uB.value;
        uniforms.uScaleA.value = uniforms.uScaleB.value;
        uniforms.uMix.value = 0;
        fade = null;
      }
    }
  };
}

/** Lens outline: a softened circle (a superellipse a little squarer than round), like the G1's round lenses. */
function lensOutline(w, h, n = 2.25, points = 128) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    out.push(new THREE.Vector2((w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), (h / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)));
  }
  return out;
}

/** Canvas texture of green heads-up text, like the G1 display. */
export function hudTexture(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#12b25c';
  ctx.shadowColor = 'rgba(18, 178, 92, 0.45)';
  ctx.shadowBlur = 8;
  ctx.font = '500 34px Geist, system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 28, 64 + i * 50));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Even Realities G1, modelled on the product photos: round lenses in a dark frame, a squared metal hinge block at
 * each corner, and arms that are thin flat bands running straight back, dipping a little near the end and finishing
 * in a blocky paddle angled down. The paddles are the battery and electronics; they sit behind the ears, with a
 * lighter touch panel on the outside. The front faces +z; the arms reach back to about z = -1.85.
 */
export function createGlasses({ hud } = {}) {
  const group = new THREE.Group();
  const lensW = 0.6;
  const lensH = 0.56;
  const gap = 0.22;
  const cx = lensW / 2 + gap / 2;

  // A dark frame under a glossy lacquer, polished metal hinges, and clear lenses that catch the light
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0x16181b,
    metalness: 0,
    roughness: 0.55,
    clearcoat: 0.7,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.2
  });
  const hingeMetal = new THREE.MeshPhysicalMaterial({ color: 0xa7adb3, metalness: 1, roughness: 0.24, envMapIntensity: 1.25 });
  const touch = new THREE.MeshPhysicalMaterial({ color: 0x5f646a, metalness: 0.3, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb9c6d4,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.1,
    depthWrite: false
  });
  const coat = glassCoat({ intensity: 0.85 });

  // The front: two rims, the lenses, the bridge and the nose pads. Each rim is a flat-fronted band with rounded
  // edges, swept around the lens, so its face and edges each carry a clean highlight
  const outline = lensOutline(lensW, lensH);
  const rimProfile = (() => {
    const [o0, o1, z0, z1, r] = [-0.014, 0.05, -0.024, 0.024, 0.015];
    return [
      ...arc(o1 - r, z1 - r, r, Math.PI / 2, 0, 6),
      ...arc(o1 - r, z0 + r, r, 0, -Math.PI / 2, 6),
      ...arc(o0 + r, z0 + r, r, -Math.PI / 2, -Math.PI, 6),
      ...arc(o0 + r, z1 - r, r, Math.PI, Math.PI / 2, 6)
    ];
  })();
  const rimGeometry = sweepGeometry(withNormals(outline), rimProfile, { closed: true });
  // The lenses curve like real ones, so the softboxes slide across them as small bright arcs
  const lensGeometry = domeNormals(new THREE.ShapeGeometry(new THREE.Shape(outline), 48), 0.34, lensW / 2, lensH / 2);
  [-1, 1].forEach((side) => {
    const rim = new THREE.Mesh(rimGeometry, frame);
    rim.position.x = side * cx;
    group.add(rim);
    const lens = new THREE.Mesh(lensGeometry, glass);
    lens.position.x = side * cx;
    group.add(lens);
    const lensCoat = new THREE.Mesh(lensGeometry, coat);
    lensCoat.position.set(side * cx, 0, 0.004);
    lensCoat.renderOrder = 2;
    group.add(lensCoat);
    if (hud) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(lensW * 0.84, lensW * 0.84 * (320 / 512)),
        new THREE.MeshBasicMaterial({ map: hud, transparent: true, depthWrite: false, toneMapped: false })
      );
      plane.position.set(side * cx, 0.02, 0.012);
      plane.renderOrder = 3;
      group.add(plane);
    }
    // Nose pads: small metal teardrops behind the bridge
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), hingeMetal);
    pad.scale.set(0.6, 1, 0.5);
    pad.position.set(side * (gap / 2 + 0.03), -lensH * 0.12, -0.07);
    group.add(pad);
  });
  const bridge = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-gap / 2 - 0.03, lensH * 0.16, 0),
    new THREE.Vector3(0, lensH * 0.3, 0.025),
    new THREE.Vector3(gap / 2 + 0.03, lensH * 0.16, 0)
  );
  group.add(new THREE.Mesh(new THREE.TubeGeometry(bridge, 40, 0.032, 14, false), frame));

  // Each side: hinge block, flat arm, the dip, and the battery paddle at the very end
  const armY = lensH * 0.2;
  [-1, 1].forEach((side) => {
    const x = side * (cx + lensW / 2 + 0.035);
    const hinge = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.12, 0.17, 3, 0.02), hingeMetal);
    hinge.position.set(x, armY, -0.06);
    group.add(hinge);

    // The straight part of the arm, a thin flat band
    const straight = 1.12;
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.07, straight, 2, 0.012), frame);
    arm.position.set(x, armY, -0.14 - straight / 2);
    group.add(arm);

    // The dip: a short segment angling down toward the ear
    const dip = new THREE.Group();
    dip.position.set(x, armY, -0.14 - straight);
    dip.rotation.x = -0.22;
    const dipLen = 0.24;
    const dipArm = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.07, dipLen, 2, 0.012), frame);
    dipArm.position.z = -dipLen / 2;
    dip.add(dipArm);

    // The paddle: the battery, angled further down, behind the ear
    const paddle = new THREE.Group();
    paddle.position.z = -dipLen;
    paddle.rotation.x = -0.2;
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.17, 0.4, 4, 0.05), frame);
    body.position.set(0, -0.04, -0.2);
    paddle.add(body);
    const panel = new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.11, 0.3, 2, 0.004), touch);
    panel.position.set(side * 0.036, -0.04, -0.21);
    paddle.add(panel);
    dip.add(paddle);
    group.add(dip);
  });

  return { group };
}

/**
 * The G1 heads-up display as a message card: show() sets up to five lines, which then type in at a reading pace,
 * the way replies appear on the glasses. Redraws only when the visible text changes.
 */
export function hudCard({ charsPerSecond = 30 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  let rows = [];
  let start = 0;
  let last = null;

  const draw = (visible) => {
    const key = visible.join('|');
    if (key === last) return;
    last = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'rgba(18, 178, 92, 0.45)';
    ctx.shadowBlur = 8;
    visible.forEach((row, i) => {
      // The speaker's name ("You:" or "Claude:") is a little dimmer than the words
      ctx.fillStyle = i === 0 ? '#5fd394' : '#12b25c';
      ctx.font = `${i === 0 ? 600 : 500} 34px Geist, system-ui, sans-serif`;
      ctx.fillText(row, 28, 64 + i * 50);
    });
    tex.needsUpdate = true;
  };

  return {
    texture: tex,
    show(lines, t) {
      rows = lines.slice(0, 5);
      start = t;
    },
    update(t) {
      let budget = Math.floor(Math.max(0, t - start) * charsPerSecond);
      draw(rows.map((row) => {
        const part = row.slice(0, Math.max(0, budget));
        budget -= row.length;
        return part;
      }));
    }
  };
}
