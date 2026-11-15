/**
 * "The screen is anywhere": the G1 glasses project a green screen in front of you, and an arrow runs from it to a
 * computer at home, inside a drawn house. The computer's terminal and the projection show the same session: each
 * line types on the computer first and in the glasses a moment later, while pulses run along the arrow. Wide
 * canvases set the scene left to right; tall ones (phones) stack it, the glasses above the house.
 * The sessions are examples of a terminal reached over SSH and mosh.
 */

import { THREE, createStage, damp, reducedMotion, createContactShadow, createMirrorFloor } from './stage.js';
import { createGlasses, hudCard, roundedSlab, glassCoat } from './devices.js';
import { RoundedBoxGeometry } from '../../assets/vendor/three/RoundedBoxGeometry.js';

// What the computer at home is doing; the first line is the window's title. About 25 characters a line.
const SESSIONS = [
  ['home-pc · Claude Code', '> why is the build red?', 'A test needs a new key.', 'Fixed: 214 tests pass.'],
  ['home-pc · Claude Code', '> summarize today’s logs', '3 warnings, no errors.', 'Backup done at 2:04 AM.'],
  ['home-pc · Claude Code', '> deploy the website', 'Built in 41 s.', 'Live on whyhirepruitt.dev']
];
const SESSION_S = 7.5; // seconds per session
const CPS = 26; // characters typed per second
const ECHO = 0.45; // the glasses show each character this long after the computer

const SANS = 'Geist, system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
const GREEN = '#12b25c';
const FLOOR = -1.15;

// Where things go: the glasses' group, the home's group, the arrow (from: off the projection's edge, relative to
// the glasses' group; bend: in the scene; to: at the display, relative to the home's group) and the box fitted
const LAYOUTS = {
  wide: {
    away: [-2.05, 0, 0.3], home: [2.05, 0, -0.2],
    from: [1.16, 1.0, 0.0], bend: [-0.1, 1.45, 0.6], to: [-0.9, 0.36, 0.08],
    size: [7.1, 3.7], center: 0.5
  },
  tall: {
    away: [0, 3.45, 0.3], home: [0, 0, -0.2],
    from: [1.16, 1.0, 0.0], bend: [2.25, 2.55, 0.6], to: [0.56, 0.66, 0.08],
    size: [3.55, 6.9], center: 2.1
  }
};

function canvasTex(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The rows of a session as far as `budget` characters have typed
function typed(lines, budget) {
  let left = Math.max(0, Math.floor(budget));
  return lines.map((row) => {
    const part = row.slice(0, left);
    left -= row.length;
    return part;
  });
}

/* ── The computer's screen: a terminal window on a dark desktop ───── */

function drawMonitor(ctx, w, h, rows, cursorOn) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0d2a23');
  bg.addColorStop(1, '#101626');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // The window
  const x = 70;
  const y = 56;
  const ww = w - 140;
  const wh = h - 120;
  roundRect(ctx, x, y, ww, wh, 22);
  ctx.fillStyle = '#0a0d12';
  ctx.fill();
  ctx.strokeStyle = '#26303b';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Title bar: three dots and the title
  ctx.fillStyle = '#141a22';
  roundRect(ctx, x, y, ww, 70, 22);
  ctx.fill();
  ctx.fillRect(x, y + 40, ww, 30);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 40 + i * 34, y + 35, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `500 36px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(rows[0] || ' ', x + ww / 2, y + 46);
  ctx.textAlign = 'left';
  // The session: prompts in white, Claude's lines in green
  ctx.font = `500 64px ${MONO}`;
  let last = { x: x + 56, y: y + 200 };
  rows.slice(1).forEach((row, i) => {
    const ry = y + 200 + i * 104;
    ctx.fillStyle = row.startsWith('>') ? '#e8edf3' : '#3ddc84';
    ctx.fillText(row, x + 52, ry);
    if (row.length) last = { x: x + 52 + ctx.measureText(row).width + 8, y: ry };
  });
  if (cursorOn) {
    ctx.fillStyle = '#3ddc84';
    ctx.fillRect(last.x, last.y - 52, 32, 64);
  }
  // A quiet status line along the bottom
  ctx.fillStyle = '#5b6475';
  ctx.font = `500 32px ${MONO}`;
  ctx.fillText('ssh · mosh  ·  connected from the glasses', x + 56, y + wh - 40);
}

/* ── The projection: the same session in the glasses' green, with HUD corners ───── */

function drawProjection(ctx, w, h, rows, cursorOn, t) {
  ctx.clearRect(0, 0, w, h);
  // A faint pane and scanlines, so it reads as projected light
  ctx.fillStyle = 'rgba(18, 178, 92, 0.07)';
  roundRect(ctx, 8, 8, w - 16, h - 16, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(18, 178, 92, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(18, 178, 92, 0.05)';
  for (let y = 12; y < h - 12; y += 8) ctx.fillRect(12, y, w - 24, 2);
  // Corner brackets
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const k = 46;
  const m = 26;
  [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * k);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * k, y);
    ctx.stroke();
  });
  // The header: where it comes from, and a live dot that breathes
  ctx.shadowColor = 'rgba(18, 178, 92, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#5fd394';
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(rows[0] || ' ', 70, 104);
  ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2));
  ctx.beginPath();
  ctx.arc(w - 150, 92, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `600 28px ${MONO}`;
  ctx.fillText('LIVE', w - 128, 102);
  ctx.fillStyle = GREEN;
  ctx.font = `500 50px ${SANS}`;
  let last = { x: 70, y: 196 };
  rows.slice(1).forEach((row, i) => {
    const ry = 196 + i * 78;
    ctx.fillText(row, 70, ry);
    if (row.length) last = { x: 70 + ctx.measureText(row).width + 8, y: ry };
  });
  if (cursorOn) ctx.fillRect(last.x, last.y - 40, 24, 46);
  ctx.shadowBlur = 0;
}

/* ── A text tag in the scene ───── */

function tag(text, { width = 640, height = 120, size = 54, color = '#1e6b57', pill = false } = {}) {
  const { ctx, tex } = canvasTex(width, height);
  ctx.font = `600 ${size}px ${MONO}`;
  const spaced = text.split('').join(' ');
  const tw = ctx.measureText(spaced).width;
  if (pill) {
    roundRect(ctx, (width - tw) / 2 - 34, 12, tw + 68, height - 24, (height - 24) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#a9c9bd';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(spaced, width / 2, height / 2 + 2);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, height / width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  mesh.renderOrder = 4;
  return mesh;
}

/* ── The computer at home ───── */

function createHome() {
  const group = new THREE.Group();
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.1 });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9ea4aa, metalness: 1, roughness: 0.22, envMapIntensity: 1.2 });
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.1 });

  // The display: a thin slab with a black glass front and a graphite back, on a metal stand
  const W = 1.66;
  const H = 1.04;
  const body = new THREE.Mesh(roundedSlab(W, H, 0.06, 0.05, { edge: 0.02, dome: 0.04 }), [black, graphite, graphite]);
  group.add(body);
  const screen = canvasTex(1600, 1000);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.08, H - 0.08),
    new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false })
  );
  panel.position.z = 0.031;
  group.add(panel);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), glassCoat({ intensity: 0.55 }));
  cover.position.z = 0.034;
  cover.renderOrder = 2;
  group.add(cover);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.66, 0.05, 3, 0.02), metal);
  neck.position.set(0, -H / 2 - 0.22, -0.09);
  neck.rotation.x = -0.08;
  group.add(neck);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.035, 0.38, 3, 0.016), metal);
  base.position.set(0, FLOOR + 0.0175, -0.05);
  group.add(base);
  // Raise the display so the stand meets the base
  body.position.y = panel.position.y = cover.position.y = 0.02;

  // The keyboard: an aluminium slab with a grid of keys
  const keys = canvasTex(1024, 320);
  {
    const { ctx } = keys;
    ctx.fillStyle = '#c9cdd1';
    ctx.fillRect(0, 0, 1024, 320);
    const rowsK = [14, 14, 13, 12];
    rowsK.forEach((n, r) => {
      const kw = (1024 - 40) / 14.6;
      for (let i = 0; i < n; i++) {
        roundRect(ctx, 22 + r * kw * 0.25 + i * kw, 20 + r * 66, kw - 8, 56, 8);
        ctx.fillStyle = '#f4f5f6';
        ctx.fill();
      }
    });
    roundRect(ctx, 22 + 3.5 * 70, 20 + 4 * 66 - 2, 7 * 70, 34, 8);
    ctx.fillStyle = '#f4f5f6';
    ctx.fill();
    keys.tex.needsUpdate = true;
  }
  const kb = new THREE.Mesh(
    new RoundedBoxGeometry(1.2, 0.04, 0.38, 3, 0.016),
    new THREE.MeshPhysicalMaterial({ color: 0xc9cdd1, metalness: 0.7, roughness: 0.3, envMapIntensity: 1.1 })
  );
  kb.position.set(0, FLOOR + 0.02, 0.52);
  group.add(kb);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.34), new THREE.MeshStandardMaterial({ map: keys.tex, roughness: 0.5 }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, FLOOR + 0.041, 0.52);
  group.add(top);

  // The house, drawn in the air around it: walls, roof and a chimney
  // Fine lines in the glasses' own lacquer, so the house reads as a drawn model, not wire
  const line = new THREE.MeshPhysicalMaterial({ color: 0x16181b, metalness: 0, roughness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const R = 0.012;
  const z = -0.6;
  const v = (x, y) => new THREE.Vector3(x, y, z);
  const outline = [v(-1.45, FLOOR), v(-1.45, 0.92), v(0, 1.88), v(1.45, 0.92), v(1.45, FLOOR)];
  const roofY = (x) => 1.88 - (0.96 / 1.45) * x;
  const chimney = [v(0.78, roofY(0.78)), v(0.78, 1.66), v(1.06, 1.66), v(1.06, roofY(1.06))];
  [outline, chimney].forEach((pts) => {
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24 * pts.length, R, 12, false), line));
    // Round joints at the corners, the tube's own size
    pts.forEach((p) => {
      const j = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 12), line);
      j.position.copy(p);
      group.add(j);
    });
  });
  const label = tag('AT HOME');
  label.scale.setScalar(1.05);
  label.position.set(0, 2.16, z);
  group.add(label);

  const shadow = createContactShadow({ opacity: 0.32 });
  shadow.position.set(0, FLOOR + 0.001, 0.2);
  shadow.scale.set(2.3, 1.2, 1);
  group.add(shadow);

  return { group, screen, reflectables: [body, panel, neck, base, kb] };
}

/* ── The glasses and their projection ───── */

function createAway(hud) {
  const group = new THREE.Group();
  const glasses = createGlasses({ hud: hud.texture });
  const pivot = new THREE.Group();
  glasses.group.position.z = 0.85;
  pivot.add(glasses.group);
  pivot.position.set(0, -0.42, 0);
  pivot.scale.setScalar(0.9);
  group.add(pivot);

  const proj = canvasTex(1024, 620);
  const PW = 1.95;
  const PH = PW * (620 / 1024);
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: proj.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
  );
  pane.position.set(0.12, 1.0, -0.1);
  pane.renderOrder = 3;
  group.add(pane);

  // The light from the lenses up to the pane: a soft green fan, brightest at the glasses
  const bottom = 1.0 - PH / 2;
  const fan = new THREE.BufferGeometry();
  fan.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, -0.28, 0.12, 0.5, -0.28, 0.12, 0.12 + PW / 2, bottom, -0.1, 0.12 - PW / 2, bottom, -0.1
  ], 3));
  fan.setAttribute('color', new THREE.Float32BufferAttribute([
    0.07, 0.7, 0.36, 0.22, 0.07, 0.7, 0.36, 0.22, 0.07, 0.7, 0.36, 0.05, 0.07, 0.7, 0.36, 0.05
  ], 4));
  fan.setIndex([0, 1, 2, 0, 2, 3]);
  const beam = new THREE.Mesh(fan, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.renderOrder = 1;
  group.add(beam);
  // Two thin edge rays
  const rays = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, -0.28, 0.12), new THREE.Vector3(0.12 - PW / 2, bottom, -0.1),
      new THREE.Vector3(0.5, -0.28, 0.12), new THREE.Vector3(0.12 + PW / 2, bottom, -0.1)
    ]),
    new THREE.LineBasicMaterial({ color: 0x12b25c, transparent: true, opacity: 0.45, depthWrite: false })
  );
  group.add(rays);

  const label = tag('ANYWHERE');
  label.scale.setScalar(1.05);
  label.position.set(0.12, 1.0 + PH / 2 + 0.24, -0.1);
  group.add(label);

  const shadow = createContactShadow({ opacity: 0.2 });
  shadow.position.set(0, FLOOR + 0.001, 0);
  shadow.scale.set(1.9, 1.5, 1);
  group.add(shadow);

  return { group, pivot, proj, shadow };
}

/* ── The scene ───── */

export async function mountAnywhere({ canvas, dragTarget = null, still = null }) {
  const calm = reducedMotion();
  const stage = createStage(canvas, { fov: 26, maxDpr: 2, manual: still !== null, honorReducedMotion: false });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0.45, 10);
  camera.lookAt(0, 0, 0);
  await Promise.all([document.fonts.load(`500 34px ${SANS}`), document.fonts.load(`500 34px ${MONO}`)]);

  const small = matchMedia('(max-width: 860px)').matches;
  const root = new THREE.Group();
  scene.add(root);
  const content = new THREE.Group();
  root.add(content);

  const hud = hudCard({ charsPerSecond: CPS });
  const away = createAway(hud);
  const home = createHome();
  content.add(away.group, home.group);

  const floor = createMirrorFloor(renderer, { resolution: small ? 0.35 : 0.5, samples: small ? 0 : 4 });
  floor.mesh.position.y = FLOOR;
  content.add(floor.mesh);
  home.reflectables.forEach((o) => floor.reflect(o));
  floor.reflect(away.pivot);

  // The arrow: a glossy spruce tube from the projection to the computer, an arrowhead, pulses running along it,
  // and a tag at its middle. Rebuilt when the layout changes.
  const arrowMat = new THREE.MeshPhysicalMaterial({ color: 0x1e6b57, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x3ddc84, toneMapped: false });
  const arrow = new THREE.Group();
  content.add(arrow);
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat);
  // The arrowhead: a lathe-turned point whose back sweeps in to the tube, so no flat disc catches the light
  const headProfile = [[0.0005, 0.24], [0.03, 0.17], [0.078, 0.02], [0.07, 0.0], [0.045, 0.018], [0.024, 0.03]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const headGeometry = new THREE.LatheGeometry(headProfile, 64);
  headGeometry.computeVertexNormals();
  const head = new THREE.Mesh(headGeometry, arrowMat);
  const pulses = [0, 1, 2].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), pulseMat));
  const linkTag = tag('SSH · MOSH', { pill: true, size: 44 });
  linkTag.scale.setScalar(0.62);
  arrow.add(tube, head, linkTag, ...pulses);
  let curve = null;
  let layout = null;

  const place = (name) => {
    if (layout === name) return;
    layout = name;
    const L = LAYOUTS[name];
    away.group.position.set(...L.away);
    home.group.position.set(...L.home);
    const add = (a, b) => new THREE.Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
    const from = add(L.away, L.from);
    const to = add(L.home, L.to);
    // On a tall canvas the glasses float above the house: no shadow under them
    away.shadow.visible = name === 'wide';
    curve = new THREE.QuadraticBezierCurve3(from, new THREE.Vector3(...L.bend), to);
    // The tube stops short of the end so the arrowhead sits on it
    const lengthToHead = 1 - 0.2 / curve.getLength();
    const body = new THREE.CurvePath();
    const pts = [];
    for (let i = 0; i <= 64; i++) pts.push(curve.getPointAt((i / 64) * lengthToHead));
    body.add(new THREE.CatmullRomCurve3(pts));
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(body, 120, 0.024, 14, false);
    const end = curve.getPointAt(lengthToHead);
    const dir = curve.getTangentAt(lengthToHead).normalize();
    head.position.copy(end).addScaledVector(dir, -0.02);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const mid = curve.getPointAt(0.5);
    // Larger where the whole scene is drawn smaller (phones)
    linkTag.scale.setScalar(name === 'tall' ? 1.0 : 0.62);
    linkTag.position.set(mid.x + (name === 'tall' ? -0.62 : 0), mid.y + (name === 'tall' ? 0 : 0.2), mid.z + 0.05);
  };

  stage.onResize(() => {
    const tall = camera.aspect < 1;
    place(tall ? 'tall' : 'wide');
    const L = LAYOUTS[layout];
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    const s = Math.min((visibleW * 0.96) / L.size[0], (visibleH * 0.92) / L.size[1]);
    root.scale.setScalar(s);
    root.position.set(0, -L.center * s, 0);
  });

  // Drag to turn the whole scene a little, with inertia; otherwise a slow sway
  const spin = { extra: 0, v: 0, dragging: false, x: 0 };
  if (dragTarget) {
    dragTarget.addEventListener('pointerdown', (e) => {
      spin.dragging = true;
      spin.x = e.clientX;
      dragTarget.setPointerCapture(e.pointerId);
    });
    dragTarget.addEventListener('pointermove', (e) => {
      if (!spin.dragging) return;
      spin.v = (e.clientX - spin.x) * 0.006;
      spin.x = e.clientX;
      spin.extra = Math.max(-0.7, Math.min(0.7, spin.extra + spin.v));
    });
    const release = (e) => {
      spin.dragging = false;
      if (dragTarget.hasPointerCapture?.(e.pointerId)) dragTarget.releasePointerCapture(e.pointerId);
    };
    dragTarget.addEventListener('pointerup', release);
    dragTarget.addEventListener('pointercancel', release);
  }

  let shownKey = '';
  let projShown = '';
  const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  let session = -1;
  stage.onFrame((t, dt) => {
    const time = t;
    if (!spin.dragging && dt) {
      spin.extra += spin.v;
      spin.v = damp(spin.v, 0, 2.2, dt);
      spin.extra = damp(spin.extra, 0, 0.6, dt);
    }
    const enter = still !== null || calm ? 1 : ease(t / 1.4);
    content.position.y = -0.3 * (1 - enter);
    root.rotation.y = Math.sin(time * 0.22) * 0.1 + spin.extra;

    // The glasses turn a little toward the house and back, and float
    away.pivot.rotation.set(-0.1, 0.38 + Math.sin(time * 0.5) * 0.18, -0.03);
    away.pivot.position.y = -0.42 + Math.sin(time * 0.9) * 0.035;

    // The session: typed on the computer, echoed in the glasses
    const s = Math.floor(time / SESSION_S);
    const local = time - s * SESSION_S;
    const lines = SESSIONS[((s % SESSIONS.length) + SESSIONS.length) % SESSIONS.length];
    if (s !== session) {
      session = s;
      hud.show(lines, t - local + ECHO);
    }
    const homeRows = typed(lines, local * CPS);
    const awayRows = typed(lines, (local - ECHO) * CPS);
    const blink = Math.floor(time * 2) % 2 === 0;
    // Each screen is drawn again only when what it shows changes (the projection's live dot breathes 6 times a second)
    const homeKey = `${s}|${homeRows.join('|')}|${blink}`;
    if (homeKey !== shownKey) {
      shownKey = homeKey;
      drawMonitor(home.screen.ctx, 1600, 1000, homeRows, blink);
      home.screen.tex.needsUpdate = true;
    }
    const projKey = `${s}|${awayRows.join('|')}|${blink}|${Math.round(time * 6)}`;
    if (projKey !== projShown) {
      projShown = projKey;
      drawProjection(away.proj.ctx, 1024, 620, awayRows, blink, time);
      away.proj.tex.needsUpdate = true;
    }
    hud.update(t);

    // Pulses run toward home while the computer is typing, spaced along the arrow
    if (curve) {
      const busy = local < (lines.join('').length / CPS) + 0.8;
      pulses.forEach((p, i) => {
        const u = ((time * 0.42 + i / 3) % 1);
        p.position.copy(curve.getPointAt(u * 0.94));
        const fade = Math.sin(Math.PI * u);
        p.scale.setScalar((busy ? 1 : 0.55) * (0.6 + 0.4 * fade));
        p.visible = busy || i === 0;
      });
    }
  });

  if (still !== null) stage.renderOnce(still);
  else stage.start();
  return stage;
}
