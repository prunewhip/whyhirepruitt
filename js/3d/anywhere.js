/**
 * "The screen is anywhere": the G1 glasses, projecting a green screen, turn on one turntable; a computer inside a
 * wire-frame house turns on another; an arrow runs from the glasses over to the computer, with pulses along it and
 * a tag saying how the link is made (SSH over Tailscale, encrypted). Like the other showcases, the content moves on
 * while the devices' backs are turned: each time they come round the building has changed (a house, then an office
 * tower) and Claude Code on that computer is building another app, typed on the computer first and echoed in the
 * glasses a moment later. Drag to turn them yourself.
 * Wide canvases set the scene left to right; tall ones (phones) stack it, the glasses above the house.
 * The sessions are examples.
 */

import { THREE, createStage, damp, reducedMotion, createContactShadow, createMirrorFloor } from './stage.js';
import { createGlasses, hudCard, roundedSlab, glassCoat } from './devices.js';
import { RoundedBoxGeometry } from '../../assets/vendor/three/RoundedBoxGeometry.js';

// Claude Code building apps, on the computer at home and then the one at the office, turn by turn: the first line is
// the window's title. About 25 characters a line, so it fits the lens too.
const SESSIONS = [
  { at: 'home', lines: ['home-pc · Claude Code', '> build a habit tracker', 'Created 9 files.', '18 tests pass.', 'Preview is running.'] },
  { at: 'office', lines: ['work-pc · Claude Code', '> build a sales dashboard', 'Created 14 files.', 'Charts from live data.', '32 tests pass.'] },
  { at: 'home', lines: ['home-pc · Claude Code', '> write a recipe app', 'Created 12 files.', 'Search and favorites.', '24 tests pass.'] },
  { at: 'office', lines: ['work-pc · Claude Code', '> make an Android build', 'Gradle build passed.', 'APK signed: 6.2 MB.', 'Sent to your phone.'] }
];
const TURN_S = 14; // seconds per turn
const CPS = 24; // characters typed per second
const ECHO = 0.45; // the glasses show each character this long after the computer

const SANS = 'Geist, system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
const GREEN = '#12b25c';
const FLOOR = -1.15;
const LINK = 'SSH · TAILSCALE · ENCRYPTED';

// Where things go: the turntables (glasses, home), the arrow (from above the glasses, over to above the computer,
// both on the turntables' axes so it never cuts through them as they turn), the placards and the box fitted.
const LAYOUTS = {
  wide: {
    away: [-2.1, 0, 0.3], home: [2.1, 0, -0.35],
    from: [-2.1, 1.86, 0.3], bend: [0.0, 3.0, 0.4], to: [2.1, 0.95, -0.35],
    awayTag: [-2.1, -0.98, 1.25], homeTag: [2.1, 2.2, -0.35], officeTag: [2.1, 2.78, -0.35],
    size: [7.6, 4.7], center: 0.55
  },
  tall: {
    away: [0, 3.95, 0.3], home: [0, 0, -0.35],
    from: [1.25, 3.2, 0.3], bend: [2.15, 2.1, 0.4], to: [0.2, 0.95, -0.35],
    awayTag: [-1.0, 3.02, 1.0], homeTag: [-1.05, 1.62, 0.6], officeTag: [-0.95, 2.52, 0.6], linkTag: [0.6, 2.72, 0.7],
    size: [3.9, 8.0], center: 2.05
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

// A small padlock, drawn at (x, y) top-left, `s` tall
function padlock(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.arc(x + s * 0.35, y + s * 0.42, s * 0.22, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, x, y + s * 0.4, s * 0.7, s * 0.6, s * 0.1);
  ctx.fill();
  ctx.restore();
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
  const x = 64;
  const y = 50;
  const ww = w - 128;
  const wh = h - 108;
  roundRect(ctx, x, y, ww, wh, 22);
  ctx.fillStyle = '#0a0d12';
  ctx.fill();
  ctx.strokeStyle = '#26303b';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Title bar
  ctx.fillStyle = '#141a22';
  roundRect(ctx, x, y, ww, 74, 22);
  ctx.fill();
  ctx.fillRect(x, y + 44, ww, 30);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 40 + i * 34, y + 37, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `500 36px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(rows[0] || ' ', x + ww / 2, y + 49);
  ctx.textAlign = 'left';
  // The session: the request in white, Claude's work in green
  ctx.font = `500 60px ${MONO}`;
  let last = { x: x + 56, y: y + 186 };
  rows.slice(1).forEach((row, i) => {
    const ry = y + 186 + i * 96;
    ctx.fillStyle = row.startsWith('>') ? '#e8edf3' : '#3ddc84';
    ctx.fillText(row, x + 56, ry);
    if (row.length) last = { x: x + 56 + ctx.measureText(row).width + 8, y: ry };
  });
  if (cursorOn) {
    ctx.fillStyle = '#3ddc84';
    ctx.fillRect(last.x, last.y - 48, 30, 60);
  }
  // The link, along the bottom: how the glasses reach it
  ctx.fillStyle = '#1b222c';
  roundRect(ctx, x + 40, y + wh - 92, ww - 80, 60, 16);
  ctx.fill();
  padlock(ctx, x + 66, y + wh - 80, 36, '#3ddc84');
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `500 30px ${MONO}`;
  ctx.fillText('ssh over tailscale  ·  encrypted  ·  from the glasses', x + 120, y + wh - 51);
}

/* ── The projection: the same session in the glasses' green, with HUD corners ───── */

function drawProjection(ctx, w, h, rows, cursorOn, t) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(18, 178, 92, 0.07)';
  roundRect(ctx, 8, 8, w - 16, h - 16, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(18, 178, 92, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(18, 178, 92, 0.05)';
  for (let y = 12; y < h - 12; y += 8) ctx.fillRect(12, y, w - 24, 2);
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
  ctx.shadowColor = 'rgba(18, 178, 92, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#5fd394';
  ctx.font = `600 38px ${SANS}`;
  ctx.fillText(rows[0] || ' ', 70, 100);
  // Encrypted and live, top right: a padlock and a breathing dot
  padlock(ctx, w - 214, 70, 34, '#5fd394');
  ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2));
  ctx.beginPath();
  ctx.arc(w - 150, 88, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `600 28px ${MONO}`;
  ctx.fillText('LIVE', w - 128, 98);
  ctx.fillStyle = GREEN;
  ctx.font = `500 46px ${SANS}`;
  let last = { x: 70, y: 180 };
  rows.slice(1).forEach((row, i) => {
    const ry = 180 + i * 70;
    ctx.fillText(row, 70, ry);
    if (row.length) last = { x: 70 + ctx.measureText(row).width + 8, y: ry };
  });
  if (cursorOn) ctx.fillRect(last.x, last.y - 36, 22, 42);
  ctx.shadowBlur = 0;
}

/* ── A text tag in the scene ───── */

function tag(text, { width = 640, height = 120, size = 54, color = '#1e6b57', pill = false, lock = false } = {}) {
  const { ctx, tex } = canvasTex(width, height);
  ctx.font = `600 ${size}px ${MONO}`;
  const spaced = text.split('').join(' ');
  const tw = ctx.measureText(spaced).width + (lock ? size * 1.1 : 0);
  if (pill) {
    roundRect(ctx, (width - tw) / 2 - 34, 12, tw + 68, height - 24, (height - 24) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#a9c9bd';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  let x = (width - tw) / 2;
  if (lock) {
    padlock(ctx, x, height / 2 - size * 0.52, size * 0.9, color);
    x += size * 1.1;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(spaced, x, height / 2 + 2);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, height / width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  mesh.renderOrder = 4;
  return mesh;
}

function turntableRing(radius) {
  const points = [];
  for (let i = 0; i < 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x5f6963, transparent: true, opacity: 0.18, depthWrite: false })
  );
}

/* ── The computer at home, inside a wire-frame house, on a turntable ───── */

function createHome() {
  const group = new THREE.Group(); // stays put: the floor's shadow and ring
  const turn = new THREE.Group(); // turns: the house, the display and the keyboard
  group.add(turn);
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.1 });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9ea4aa, metalness: 1, roughness: 0.22, envMapIntensity: 1.2 });
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.1 });

  // The display: a thin slab, black glass in front and graphite behind, on a metal stand
  const W = 1.66;
  const H = 1.04;
  const display = new THREE.Group();
  display.position.y = 0.02;
  turn.add(display);
  display.add(new THREE.Mesh(roundedSlab(W, H, 0.06, 0.05, { edge: 0.02, dome: 0.04 }), [black, graphite, graphite]));
  const screen = canvasTex(1600, 1000);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.08), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  panel.position.z = 0.031;
  display.add(panel);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), glassCoat({ intensity: 0.55 }));
  cover.position.z = 0.034;
  cover.renderOrder = 2;
  display.add(cover);
  // A logo on the back, so the turn reads
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.07, 48), metal);
  badge.position.set(0, 0.12, -0.0305);
  badge.rotation.y = Math.PI;
  display.add(badge);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.66, 0.05, 3, 0.02), metal);
  neck.position.set(0, -H / 2 - 0.2, -0.09);
  neck.rotation.x = -0.08;
  turn.add(neck);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.035, 0.38, 3, 0.016), metal);
  base.position.set(0, FLOOR + 0.0175, -0.05);
  turn.add(base);

  // The keyboard: an aluminium slab with a grid of keys
  const keys = canvasTex(1024, 320);
  {
    const { ctx } = keys;
    ctx.fillStyle = '#c9cdd1';
    ctx.fillRect(0, 0, 1024, 320);
    [14, 14, 13, 12].forEach((n, r) => {
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
  kb.position.set(0, FLOOR + 0.02, 0.5);
  turn.add(kb);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.34), new THREE.MeshStandardMaterial({ map: keys.tex, roughness: 0.5 }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, FLOOR + 0.041, 0.5);
  turn.add(top);

  // The building around it, a wire-frame model with depth in the glasses' lacquer: a house, or an office tower
  const line = new THREE.MeshPhysicalMaterial({ color: 0x16181b, metalness: 0, roughness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const R = 0.012;
  const tubes = [];
  const wire = () => {
    const group = new THREE.Group();
    const corners = new Set();
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const edge = (a, b) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 24, R, 12, false), line);
      group.add(m);
      tubes.push(m);
      [a, b].forEach((p) => corners.add(`${p.x},${p.y},${p.z}`));
    };
    const loop = (pts) => pts.forEach((p, i) => edge(p, pts[(i + 1) % pts.length]));
    const finish = () => corners.forEach((k) => {
      const j = new THREE.Mesh(new THREE.SphereGeometry(R * 1.15, 16, 12), line);
      j.position.set(...k.split(',').map(Number));
      group.add(j);
      tubes.push(j);
    });
    return { group, v, edge, loop, finish };
  };
  // The house: front and back gables joined at every corner
  const house = wire();
  {
    const { v, edge, loop } = house;
    const gable = (z) => [[-1.45, FLOOR], [-1.45, 0.92], [0, 1.88], [1.45, 0.92], [1.45, FLOOR]].map(([x, y]) => v(x, y, z));
    const front = gable(1.0);
    const back = gable(-1.0);
    loop(front);
    loop(back);
    front.forEach((p, i) => edge(p, back[i]));
    house.finish();
  }
  // The office: a flat-roofed tower, its upper floors marked out with floor lines and mullions, a plant room on top
  const office = wire();
  {
    const { v, edge, loop } = office;
    const top = 2.2;
    const box = (x0, x1, y0, y1, z0, z1) => {
      loop([v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)]);
      loop([v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1)]);
      [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z]) => edge(v(x, y0, z), v(x, y1, z)));
    };
    box(-1.45, 1.45, FLOOR, top, -1.0, 1.0);
    [1.05, 1.62].forEach((y) => loop([v(-1.45, y, -1.0), v(1.45, y, -1.0), v(1.45, y, 1.0), v(-1.45, y, 1.0)]));
    [-0.48, 0.48].forEach((x) => [1.0, -1.0].forEach((z) => edge(v(x, 1.05, z), v(x, top, z))));
    [-0.33, 0.33].forEach((z) => [1.45, -1.45].forEach((x) => edge(v(x, 1.05, z), v(x, top, z))));
    box(-0.55, 0.15, top, top + 0.3, -0.45, 0.25);
    office.finish();
  }
  turn.add(house.group, office.group);
  office.group.visible = false;

  const shadow = createContactShadow({ opacity: 0.3 });
  shadow.position.set(0, FLOOR + 0.001, 0.1);
  shadow.scale.set(2.4, 1.5, 1);
  group.add(shadow);
  const ring = turntableRing(1.25);
  ring.position.y = FLOOR + 0.002;
  group.add(ring);

  return {
    group, turn, screen, reflectables: [display, neck, base, kb, ...tubes],
    // Which building stands around the computer
    setPlace(at) {
      house.group.visible = at === 'home';
      office.group.visible = at === 'office';
    }
  };
}

/* ── The glasses and their projection, on a turntable ───── */

function createAway(hud) {
  const group = new THREE.Group();
  const turn = new THREE.Group(); // turns: the glasses with their projection
  group.add(turn);
  const glasses = createGlasses({ hud: hud.texture });
  const pivot = new THREE.Group();
  glasses.group.position.z = 0.85;
  pivot.add(glasses.group);
  pivot.position.set(0, -0.42, 0);
  pivot.scale.setScalar(0.9);
  turn.add(pivot);

  // The projected screen: seen from the front only (from behind it would read backwards)
  const proj = canvasTex(1024, 640);
  const PW = 1.95;
  const PH = PW * (640 / 1024);
  const paneY = 1.0;
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: proj.tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  pane.position.set(0, paneY, 0.05);
  pane.renderOrder = 3;
  turn.add(pane);

  // The light from the lenses up to the pane: a soft green fan, brightest at the glasses, and its two edge rays
  const bottom = paneY - PH / 2;
  const fan = new THREE.BufferGeometry();
  fan.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, -0.3, 0.2, 0.5, -0.3, 0.2, PW / 2, bottom, 0.05, -PW / 2, bottom, 0.05
  ], 3));
  fan.setAttribute('color', new THREE.Float32BufferAttribute([
    0.07, 0.7, 0.36, 0.22, 0.07, 0.7, 0.36, 0.22, 0.07, 0.7, 0.36, 0.05, 0.07, 0.7, 0.36, 0.05
  ], 4));
  fan.setIndex([0, 1, 2, 0, 2, 3]);
  const beam = new THREE.Mesh(fan, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.renderOrder = 1;
  turn.add(beam);
  turn.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, -0.3, 0.2), new THREE.Vector3(-PW / 2, bottom, 0.05),
      new THREE.Vector3(0.5, -0.3, 0.2), new THREE.Vector3(PW / 2, bottom, 0.05)
    ]),
    new THREE.LineBasicMaterial({ color: 0x12b25c, transparent: true, opacity: 0.45, depthWrite: false })
  ));

  const shadow = createContactShadow({ opacity: 0.2 });
  shadow.position.set(0, FLOOR + 0.001, 0);
  shadow.scale.set(1.9, 1.5, 1);
  group.add(shadow);
  const ring = turntableRing(0.95);
  ring.position.y = FLOOR + 0.002;
  group.add(ring);

  return { group, turn, pivot, proj, shadow, ring };
}

/* ── The scene ───── */

export async function mountAnywhere({ canvas, dragTarget = null, still = null, startSession = 0 }) {
  const calm = reducedMotion();
  const stage = createStage(canvas, { fov: 26, maxDpr: 2, manual: still !== null, honorReducedMotion: false });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0.5, 10.5);
  camera.lookAt(0, 0.1, 0);
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

  // Placards in front of each turntable
  const awayTag = tag('ANYWHERE');
  const homeTag = tag('AT HOME');
  const officeTag = tag('AT THE OFFICE', { width: 900 });
  officeTag.scale.setScalar(900 / 640);
  officeTag.visible = false;
  [awayTag, homeTag, officeTag].forEach((t) => content.add(t));
  const setPlace = (at) => {
    home.setPlace(at);
    homeTag.visible = at === 'home';
    officeTag.visible = at === 'office';
  };

  // The arrow: a glossy spruce tube with a sculpted head, pulses running along it, and the link's tag at its middle
  const arrowMat = new THREE.MeshPhysicalMaterial({ color: 0x1e6b57, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x3ddc84, toneMapped: false });
  const arrow = new THREE.Group();
  content.add(arrow);
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), arrowMat);
  const headProfile = [[0.0005, 0.24], [0.03, 0.17], [0.078, 0.02], [0.07, 0.0], [0.045, 0.018], [0.024, 0.03]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const headGeometry = new THREE.LatheGeometry(headProfile, 64);
  headGeometry.computeVertexNormals();
  const head = new THREE.Mesh(headGeometry, arrowMat);
  const pulses = [0, 1, 2].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), pulseMat));
  const linkTag = tag(LINK, { pill: true, size: 40, width: 1100, height: 120, lock: true });
  arrow.add(tube, head, linkTag, ...pulses);
  let curve = null;
  let layout = null;

  const place = (name) => {
    if (layout === name) return;
    layout = name;
    const L = LAYOUTS[name];
    away.group.position.set(...L.away);
    home.group.position.set(...L.home);
    awayTag.position.set(...L.awayTag);
    homeTag.position.set(...L.homeTag);
    officeTag.position.set(...L.officeTag);
    // On a tall canvas the glasses float above the house: no floor under them
    away.shadow.visible = away.ring.visible = name === 'wide';
    curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...L.from), new THREE.Vector3(...L.bend), new THREE.Vector3(...L.to));
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
    linkTag.scale.setScalar(name === 'tall' ? 1.55 : 1.45);
    if (L.linkTag) linkTag.position.set(...L.linkTag);
    else linkTag.position.set(mid.x, mid.y + 0.24, mid.z + 0.3);
  };

  stage.onResize(() => {
    place(camera.aspect < 1 ? 'tall' : 'wide');
    const L = LAYOUTS[layout];
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    const s = Math.min((visibleW * 0.96) / L.size[0], (visibleH * 0.92) / L.size[1]);
    root.scale.setScalar(s);
    root.position.set(0, -L.center * s, 0);
  });

  // Drag to turn them yourself, with inertia
  const spin = { extra: 0, v: 0, dragging: false, x: 0 };
  if (dragTarget) {
    dragTarget.addEventListener('pointerdown', (e) => {
      spin.dragging = true;
      spin.x = e.clientX;
      dragTarget.setPointerCapture(e.pointerId);
    });
    dragTarget.addEventListener('pointermove', (e) => {
      if (!spin.dragging) return;
      spin.v = (e.clientX - spin.x) * 0.012;
      spin.x = e.clientX;
      spin.extra += spin.v;
    });
    const release = (e) => {
      spin.dragging = false;
      if (dragTarget.hasPointerCapture?.(e.pointerId)) dragTarget.releasePointerCapture(e.pointerId);
    };
    dragTarget.addEventListener('pointerup', release);
    dragTarget.addEventListener('pointercancel', release);
  }

  const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const frozen = still !== null;
  // The session on screen, and when it began typing; it moves on while the computer's back is turned
  let session = startSession % SESSIONS.length;
  let begun = frozen ? -100 : 0;
  let front = true;
  setPlace(SESSIONS[session].at);
  hud.show(SESSIONS[session].lines, begun + ECHO);
  let homeShown = '';
  let projShown = '';

  stage.onFrame((t, dt) => {
    if (!spin.dragging && dt) {
      spin.extra += spin.v;
      spin.v = damp(spin.v, 0, 1.6, dt);
    }
    const enter = frozen || calm ? 1 : ease(t / 1.4);
    content.position.y = -0.3 * (1 - enter);
    content.scale.setScalar(0.95 + 0.05 * enter);

    // The two turntables turn together, so both face you at once; a still shows a three-quarter view
    const turnS = TURN_S * (calm ? 2 : 1);
    const angle = frozen ? -0.42 : -0.5 + (t / turnS) * Math.PI * 2 + spin.extra;
    home.turn.rotation.set(0, angle, 0);
    away.turn.rotation.set(0, angle + 0.3, 0);
    away.pivot.rotation.set(-0.1, 0, -0.03);
    away.turn.position.y = Math.sin(t * 0.9) * 0.035;

    // A new app while the backs are turned; it types in as they come round
    if (!frozen) {
      const facing = Math.cos(angle);
      if (front && facing < -0.35) {
        // The back is turned: the next app, and with it, home becomes the office (or back)
        front = false;
        session = (session + 1) % SESSIONS.length;
        setPlace(SESSIONS[session].at);
      } else if (!front && facing > 0.2) {
        front = true;
        begun = t;
        hud.show(SESSIONS[session].lines, t + ECHO);
      }
    }
    const lines = SESSIONS[session].lines;
    const local = t - begun;
    const homeRows = front || frozen ? typed(lines, local * CPS) : typed(lines, 0);
    const awayRows = front || frozen ? typed(lines, (local - ECHO) * CPS) : typed(lines, 0);
    const blink = Math.floor(t * 2) % 2 === 0;
    const homeKey = `${session}|${homeRows.join('|')}|${blink}`;
    if (homeKey !== homeShown) {
      homeShown = homeKey;
      drawMonitor(home.screen.ctx, 1600, 1000, homeRows, blink);
      home.screen.tex.needsUpdate = true;
    }
    const projKey = `${session}|${awayRows.join('|')}|${blink}|${Math.round(t * 6)}`;
    if (projKey !== projShown) {
      projShown = projKey;
      drawProjection(away.proj.ctx, 1024, 640, awayRows, blink, t);
      away.proj.tex.needsUpdate = true;
    }
    hud.update(t);

    // Pulses run from the glasses to home, brightest while the computer is typing
    if (curve) {
      const busy = front && local < lines.join('').length / CPS + 0.8;
      pulses.forEach((p, i) => {
        const u = (t * 0.4 + i / 3) % 1;
        p.position.copy(curve.getPointAt(u * 0.93));
        p.scale.setScalar((busy ? 1 : 0.6) * (0.6 + 0.4 * Math.sin(Math.PI * u)));
      });
    }
  });

  if (frozen) stage.renderOnce(still);
  else stage.start();
  return stage;
}
