/**
 * Showcases: the real devices, rendered like product shots, each showing what its AI actually does.
 *
 *   hero      the phone and the G1 glasses turning together. Each turn brings a question, the next turn its answer:
 *             the phone answers from your own conversations (Vox Amelior), the glasses answer with Claude
 *             (Even Suite). The questions shuffle.
 *   vox       the phone, which comes apart as you scroll into the five layers of AI that run inside it, each
 *             labelled with its model, while its screen moves from a question to its answer
 *   glasses   the G1 glasses turning on their own, a question to Claude on one turn and its answer on the next,
 *             with the phone running Even Suite behind them
 *   narrator  the phone reading aloud: every turn shows a new episode, its words flowing in and sound rippling out
 *
 * Content changes while a device's back is to you, so you never see it switch; the text then types in as it turns
 * back. Each device stands on a glossy floor that reflects it, with a soft contact shadow. Devices rise into place the
 * first time they're on screen; drag to turn them yourself. With reduced motion, one still frame at a good angle.
 * The questions, answers and episode titles are examples.
 */

import { THREE, createStage, loadTexture, anchorToWorld, damp, reducedMotion, createContactShadow, createMirrorFloor } from './stage.js';
import { createPhone, createGlasses, hudCard, roundedSlab } from './devices.js';
import { createVoiceField } from './voice-field.js';
import { voxAskScreen, narratorScreen } from './screens.js';

// Asked in Vox Amelior: answered from conversations on the phone
const VOX_QA = [
  { question: 'What did Jordan say I shouldn’t forget?', answer: ['Plumber, Thursday at 9', 'Cake pickup by 5', 'Your mom’s birthday is Sunday'], source: 'From Jordan · this morning, 7:41 AM' },
  { question: 'What did we decide about the trip?', answer: ['Leave Friday at 6', 'Sam books the cabin', 'You bring the cooler'], source: 'Kitchen · Tuesday, 8:15 PM' },
  { question: 'What were Dana’s reset steps?', answer: ['Breaker off', 'Wait thirty seconds', 'Hold reset until it blinks amber'], source: 'From Dana · Monday, 9:12 AM' },
  { question: 'What needs to be bought?', answer: ['Eggs', 'The good bread', 'You still have milk'], source: 'From Jordan · Tuesday, 8:10 AM' }
];

// Asked out loud through Even Suite: answered by Claude, five lines a page on the glasses
const CLAUDE_QA = [
  { question: ['You:', 'Why is the sky blue?'], answer: ['Claude:', 'Air scatters blue light', 'more than red, so blue', 'reaches you from', 'every direction.'] },
  { question: ['You:', 'How do I say thank', 'you in Japanese?'], answer: ['Claude:', 'Arigatō gozaimasu.', 'Arigatō on its own', 'is more casual.'] },
  { question: ['You:', 'What’s an 18% tip', 'on $64?'], answer: ['Claude:', '$11.52, so $75.52', 'in total.'] },
  { question: ['You:', 'Spanish for', '“Where’s the station?”'], answer: ['Claude:', '¿Dónde está', 'la estación?'] }
];

// Made in Narrator Studio from text you choose (the first is the app's own sample episode)
const EPISODES = [
  {
    title: 'Why Is the Sky Blue?', blurb: 'Why sunlight turns the sky blue, why it isn’t violet, and why sunsets glow orange.',
    tags: ['Science', 'Physics'], hue: ['#3b2a8f', '#d9547a'],
    chapters: [['0:02', 'Welcome'], ['0:41', 'Sunlight is a mixture'], ['1:11', 'The scattering trick'], ['2:10', 'Sunsets']],
    words: ['Sunlight', 'is a mixture', 'of every colour.', 'Air scatters', 'blue light', 'more than red,', 'so the sky', 'glows blue.']
  },
  {
    title: 'How Bees Find Their Way Home', blurb: 'How a bee reads the sun, remembers landmarks and tells the hive where the flowers are.',
    tags: ['Nature', 'Biology'], hue: ['#a8670c', '#e9b23e'],
    chapters: [['0:02', 'Welcome'], ['0:38', 'A compass in the sky'], ['1:20', 'The waggle dance']],
    words: ['Bees read', 'the sun’s angle,', 'remember', 'landmarks,', 'and dance', 'to tell the hive', 'where flowers are.']
  },
  {
    title: 'A Short History of Coffee', blurb: 'From a goat herder’s legend to the world’s morning ritual, in three minutes.',
    tags: ['History', 'Food'], hue: ['#3d2418', '#a8653a'],
    chapters: [['0:02', 'Welcome'], ['0:35', 'The legend'], ['1:30', 'Coffee houses']],
    words: ['A goat herder', 'noticed', 'his goats', 'dancing', 'after eating', 'red berries.']
  },
  {
    title: 'Sleep and Memory', blurb: 'From an article you saved: what your brain files away overnight, and why it matters.',
    tags: ['Saved article', 'Health'], hue: ['#14513f', '#5cb89a'],
    chapters: [['0:02', 'Welcome'], ['0:44', 'What sleep sorts'], ['1:52', 'Better nights']],
    words: ['While you sleep,', 'the brain', 'replays the day', 'and keeps', 'what matters.']
  }
];

// The AI inside Vox Amelior, front to back, as it runs on the phone
const STACK = [
  { kicker: 'Hears', title: 'Speech to text', model: 'NVIDIA Parakeet' },
  { kicker: 'Knows who', title: 'Speaker ID', model: 'TitaNet · Sortformer' },
  { kicker: 'Finds', title: 'Search by meaning', model: 'EmbeddingGemma' },
  { kicker: 'Thinks', title: 'Answers and reviews', model: 'Gemma, on the phone' },
  { kicker: 'Keeps', title: 'Private storage', model: 'Android encryption' }
];

// Placement in world units (a phone is 1 wide and 2.16 tall); size is the content box used to fit the canvas.
// turn is seconds per full turn; lead is the device whose turn moves the content on.
const KINDS = {
  hero: { turn: 13, lead: 'phone', phone: { x: 0.62, y: 0.12, z: 0, s: 1 }, glasses: { x: -0.6, y: -0.56, z: 0.75, s: 0.7 }, size: [2.95, 2.3], sizeNarrow: [2.45, 2.3] },
  // On tall, narrow canvases (phones) the stack pulls its labels in over the layers so everything renders larger
  vox: { turn: 0, phone: { x: -1.3, y: 0.04, z: 0, s: 1 }, stack: true, size: [4.7, 2.8], narrow: { phoneX: -0.78, signX: 0.92, size: [3.25, 2.8] } },
  glasses: { turn: 12, lead: 'glasses', phone: { x: 0.8, y: 0.25, z: -1.0, s: 0.82 }, glasses: { x: -0.38, y: -0.55, z: 0.25, s: 0.8 }, size: [3.0, 2.45] },
  narrator: { turn: 12, lead: 'phone', phone: { x: 0.35, y: 0.04, z: 0, s: 1 }, rings: true, words: true, size: [3.1, 2.55] }
};

const FLOOR_GAP = 0.06;
const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

// A fresh shuffled order of 0..n-1 (seeded, so a still render is repeatable)
function shuffled(n, seed = 7) {
  const order = [...Array(n).keys()];
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
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

// A text label drawn on a canvas, for use as a flat sign in the scene
function label(draw, width = 640, height = 160) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ── Vox Amelior: the phone opens into its layers of AI ───────────── */

// A layer's circuitry: a chip with traces running out to vias near the edges, different on every layer
function circuitTexture(seed) {
  return label((ctx, w, h) => {
    let s = seed * 7919 + 13;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    ctx.strokeStyle = '#1e6b57';
    ctx.fillStyle = '#1e6b57';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const m = 34;
    const chip = 150 + rand() * 40;
    const cx = w / 2 + (rand() - 0.5) * 140;
    const cy = h * (0.3 + rand() * 0.4);
    // Traces from pins on all four sides: out, a 45° jog, then a long run to a via
    ctx.lineWidth = 3;
    for (let side = 0; side < 4; side++) {
      const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][side];
      for (let i = 0; i < 6; i++) {
        const t = ((i + 0.5) / 6 - 0.5) * chip * 0.8;
        let x = cx + dx * chip / 2 - dy * t;
        let y = cy + dy * chip / 2 + dx * t;
        ctx.beginPath();
        ctx.moveTo(x, y);
        x += dx * (14 + rand() * 50);
        y += dy * (14 + rand() * 50);
        ctx.lineTo(x, y);
        const jog = (rand() < 0.5 ? -1 : 1) * (10 + rand() * 50);
        x += dx * Math.abs(jog) - dy * jog;
        y += dy * Math.abs(jog) + dx * jog;
        ctx.lineTo(x, y);
        x += dx * (30 + rand() * 260);
        y += dy * (30 + rand() * 260);
        x = Math.min(w - m, Math.max(m, x));
        y = Math.min(h - m, Math.max(m, y));
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The chip, its die and a ring of pads
    ctx.globalAlpha = 0.16;
    ctx.fillRect(cx - chip / 2, cy - chip / 2, chip, chip);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - chip / 2, cy - chip / 2, chip, chip);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - chip * 0.27, cy - chip * 0.27, chip * 0.54, chip * 0.54);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(cx - chip * 0.27, cy - chip * 0.27, chip * 0.54, chip * 0.54);
    ctx.globalAlpha = 1;
    // A fine border just inside the layer's edge
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(16, 16, w - 32, h - 32, 56);
    else ctx.rect(16, 16, w - 32, h - 32);
    ctx.stroke();
  }, 512, 1104);
}

function createStack(phone) {
  const group = new THREE.Group();
  let signX = 1.55;
  const slabW = phone.width * 0.94;
  const slabH = phone.height * 0.94;
  const slabGeometry = roundedSlab(slabW, slabH, 0.03, 0.13, { edge: 0.012, dome: 0.12 });
  const circuitGeometry = new THREE.PlaneGeometry(slabW * 0.98, slabH * 0.98);
  const dotGeometry = new THREE.CircleGeometry(0.024, 24);
  const layers = STACK.map((item, k) => {
    const slab = new THREE.Mesh(
      slabGeometry,
      new THREE.MeshPhysicalMaterial({
        color: k === STACK.length - 1 ? 0xb9dccf : 0xe9f2ee,
        roughness: 0.14,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.3,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    // Circuitry etched into each layer, so it reads as hardware doing work
    const circuit = new THREE.Mesh(
      circuitGeometry,
      new THREE.MeshBasicMaterial({ map: circuitTexture(k + 3), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    );
    circuit.position.z = 0.017;
    slab.add(circuit);
    const tex = label((ctx) => {
      ctx.font = '500 30px "Geist Mono", ui-monospace, monospace';
      ctx.fillStyle = '#1e6b57';
      ctx.fillText(`${String(k + 1).padStart(2, '0')} · ${item.kicker.toUpperCase()}`, 8, 40);
      ctx.font = '600 50px Geist, system-ui, sans-serif';
      ctx.fillStyle = '#18201c';
      ctx.fillText(item.title, 8, 98);
      ctx.font = '400 32px Geist, system-ui, sans-serif';
      ctx.fillStyle = '#4a544e';
      ctx.fillText(item.model, 8, 144);
    });
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.375),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    );
    // A thin leader line from a point on the layer's edge, level with its sign, with a dot where it meets the layer
    const leader = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0x5f6963, transparent: true, opacity: 0, depthWrite: false })
    );
    const dot = new THREE.Mesh(dotGeometry, new THREE.MeshBasicMaterial({ color: 0x1e6b57, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    // Signs and leaders draw over the glass layers, so the labels always read cleanly
    [sign, leader, dot].forEach((o) => {
      o.renderOrder = 10;
      o.material.depthTest = false;
    });
    group.add(slab, sign, leader, dot);
    return { slab, circuit, sign, leader, dot };
  });
  const anchor = new THREE.Vector3();
  const end = new THREE.Vector3();
  return {
    group,
    slabs: layers.map((layer) => layer.slab),
    setSignX(x) {
      signX = x;
    },
    // e: 0 closed, 1 fully open. Layers slide out behind the phone, each to its own depth, with signs on the right.
    // A signal pulses through them in the order a conversation takes: heard, attributed, indexed, understood, kept.
    update(e, phoneMatrix, phoneQuaternion, t = 0) {
      layers.forEach((layer, k) => {
        const local = Math.min(1, Math.max(0, e * 1.25 - k * 0.06));
        const p = ease(local);
        const depth = -0.12 - (k + 1) * 0.55 * p;
        layer.slab.position.set(0.04 * (k + 1) * p, 0.05 * k * p, depth).applyMatrix4(phoneMatrix);
        layer.slab.quaternion.copy(phoneQuaternion);
        const wave = ((t * 0.55 - k * 0.16) % 1 + 1) % 1;
        const pulse = Math.exp(-((wave - 0.12) ** 2) / 0.006);
        layer.slab.material.opacity = (0.5 + 0.25 * pulse) * p;
        layer.circuit.material.opacity = (0.26 + 0.64 * pulse) * p;
        anchor.set(slabW / 2 + 0.04 * (k + 1) * p, 0.05 * k * p + 0.9 - k * 0.45, depth).applyMatrix4(phoneMatrix);
        layer.sign.position.set(signX, 1.0 - k * 0.48, 0.3);
        const show = ease(local * 1.4 - 0.25);
        layer.sign.material.opacity = show;
        end.set(layer.sign.position.x - 0.78, layer.sign.position.y + 0.06, layer.sign.position.z);
        layer.leader.geometry.setFromPoints([anchor, end]);
        layer.leader.material.opacity = 0.55 * show;
        layer.dot.position.copy(anchor);
        layer.dot.material.opacity = show * (0.7 + 0.3 * pulse);
      });
    }
  };
}

/* ── Narrator Studio: text in, voice out ───────────────────────────── */

// Sound rippling out of the phone: thin rings of polished spruce metal, so each catches the light as it grows
function soundRings(count = 4) {
  const group = new THREE.Group();
  const rings = [];
  const geometry = new THREE.TorusGeometry(1, 0.011, 16, 200);
  for (let i = 0; i < count; i++) {
    const ring = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x2a8a6f,
        metalness: 0.75,
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.4,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    group.add(ring);
    rings.push(ring);
  }
  return {
    group,
    update(t) {
      rings.forEach((ring, i) => {
        const p = (t * 0.3 + i / rings.length) % 1;
        ring.scale.setScalar(0.75 + 0.95 * p);
        ring.material.opacity = 0.8 * Math.pow(1 - p, 1.6) * Math.min(1, p * 6);
      });
    }
  };
}

function flowingWords(target, initial) {
  const group = new THREE.Group();
  let words = [];
  const wordTexture = (text) => label((ctx, w, h) => {
    ctx.font = '500 56px Geist, system-ui, sans-serif';
    ctx.fillStyle = '#18201c';
    ctx.fillText(text, 6, h * 0.66);
  }, 512, 96);
  const setWords = (list) => {
    words.forEach((w) => {
      w.mesh.material.map.dispose();
      w.mesh.material.dispose();
      group.remove(w.mesh);
    });
    words = list.map((text, i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.12, 0.21),
        new THREE.MeshBasicMaterial({ map: wordTexture(text), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
      );
      group.add(mesh);
      return { mesh, phase: i / list.length, lane: ((i * 5) % 7) / 6 - 0.5 };
    });
  };
  setWords(initial);
  return {
    group,
    setWords,
    update(t) {
      words.forEach((w) => {
        // Each word drifts in from the left along its lane and is drawn into the phone
        const p = (t * 0.11 + w.phase) % 1;
        const x = THREE.MathUtils.lerp(-1.55, target.x - 0.1, p);
        const y = THREE.MathUtils.lerp(target.y + w.lane * 1.9, target.y + 0.2, p * p);
        w.mesh.position.set(x, y, THREE.MathUtils.lerp(0.4, 0, p));
        w.mesh.scale.setScalar(THREE.MathUtils.lerp(1, 0.25, p * p));
        w.mesh.material.opacity = Math.min(1, p * 3) * (1 - Math.pow(p, 3)) * 0.9;
      });
    }
  };
}

/* ── Mount ─────────────────────────────────────────────────────────── */

export async function mountShowcase({ canvas, kind = 'vox', screens = [], anchor = null, dragTarget = null, field = false, still = null }) {
  const spec = KINDS[kind];
  // The devices always turn; with reduced motion they turn at half speed and skip the entrance
  const calm = reducedMotion();
  const stage = createStage(canvas, { fov: 26, maxDpr: 2, manual: still !== null, honorReducedMotion: false });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0.35, 9);
  camera.lookAt(0, 0, 0);
  await document.fonts.load('500 34px Geist');

  // Phones and small screens get a lighter scene
  const small = matchMedia('(max-width: 860px)').matches;
  // The hero keeps a quiet voice field rolling along its bottom edge
  let voiceField = null;
  const fieldGroup = new THREE.Group();
  if (field) {
    voiceField = createVoiceField({ rows: small ? 46 : 78, cols: small ? 150 : 260, width: 24, depth: 10 });
    voiceField.uniforms.uAmp.value *= 0.6;
    fieldGroup.add(voiceField.mesh);
    fieldGroup.rotation.x = 0.4;
    scene.add(fieldGroup);
  }

  const root = new THREE.Group();
  scene.add(root);
  const content = new THREE.Group();
  root.add(content);

  // The phone on its turntable
  const phone = createPhone();
  const phonePivot = new THREE.Group();
  const p = spec.phone;
  phonePivot.position.set(p.x, p.y, p.z);
  phonePivot.scale.setScalar(p.s);
  phonePivot.add(phone.group);
  content.add(phonePivot);
  const phoneFloor = p.y - (phone.height / 2) * p.s - FLOOR_GAP;
  const phoneShadow = createContactShadow({ opacity: 0.4 });
  phoneShadow.position.set(p.x, phoneFloor, p.z);
  content.add(phoneShadow);
  const phoneRing = turntableRing(0.82 * p.s);
  phoneRing.position.set(p.x, phoneFloor, p.z);
  content.add(phoneRing);

  // The glasses, floating above their own shadow, with the heads-up display
  let glassesPivot = null;
  let glassesFloor = null;
  let hud = null;
  if (spec.glasses) {
    hud = hudCard();
    const glasses = createGlasses({ hud: hud.texture });
    glassesPivot = new THREE.Group();
    const g = spec.glasses;
    glassesPivot.position.set(g.x, g.y, g.z);
    glassesPivot.scale.setScalar(g.s);
    // Turn around the middle of the frames: the front is at z 0 and the arms reach back about 1.75
    glasses.group.position.z = 0.85;
    glassesPivot.add(glasses.group);
    content.add(glassesPivot);
    const glassesShadow = createContactShadow({ opacity: 0.22 });
    glassesFloor = Math.min(phoneFloor, g.y - 0.55 * g.s);
    glassesShadow.position.set(g.x, glassesFloor, g.z);
    glassesShadow.scale.set(2.1 * g.s, 1.9 * g.s, 1);
    content.add(glassesShadow);
  }

  const stack = spec.stack ? createStack(phone) : null;
  if (stack) content.add(stack.group);

  // The glossy floor, at the feet of the lowest device
  const floor = createMirrorFloor(renderer, { resolution: small ? 0.35 : 0.5, samples: small ? 0 : 4 });
  floor.mesh.position.y = Math.min(phoneFloor, glassesFloor ?? phoneFloor);
  content.add(floor.mesh);
  floor.reflect(phone.group);
  if (glassesPivot) floor.reflect(glassesPivot);
  if (stack) stack.slabs.forEach((slab) => floor.reflect(slab));
  const rings = spec.rings ? soundRings() : null;
  if (rings) {
    rings.group.position.set(p.x, p.y + 0.15, p.z - 0.35);
    content.add(rings.group);
  }
  const words = spec.words ? flowingWords(new THREE.Vector3(p.x, p.y, p.z), EPISODES[0].words) : null;
  if (words) content.add(words.group);

  // Fit: either to a DOM anchor (the hero, where the canvas covers the whole section) or to the canvas itself
  stage.onResize(() => {
    const narrow = camera.aspect < 1;
    if (anchor) {
      const a = anchorToWorld(anchor, canvas, camera, 0);
      const size = matchMedia('(max-width: 860px)').matches && spec.sizeNarrow ? spec.sizeNarrow : spec.size;
      root.visible = a.visible;
      root.scale.setScalar(Math.min(a.width / size[0], a.height / size[1]));
      root.position.set(a.x, a.y, 0);
      fieldGroup.position.set(0, -a.visibleH * 0.5, -3.5);
    } else {
      const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const visibleW = visibleH * camera.aspect;
      let size = spec.size;
      if (spec.narrow && stack) {
        const layout = narrow ? spec.narrow : { phoneX: spec.phone.x, signX: 1.55, size: spec.size };
        phonePivot.position.x = layout.phoneX;
        phoneShadow.position.x = layout.phoneX;
        phoneRing.position.x = layout.phoneX;
        stack.setSignX(layout.signX);
        size = layout.size;
      }
      root.scale.setScalar(Math.min((visibleW * 0.94) / size[0], (visibleH * 0.88) / size[1]));
      root.position.set(0, 0.1, 0);
    }
  });

  // Drag to turn, with inertia
  const spin = { extra: 0, v: 0, dragging: false, x: 0 };
  if (dragTarget) {
    dragTarget.addEventListener('pointerdown', (event) => {
      spin.dragging = true;
      spin.x = event.clientX;
      dragTarget.setPointerCapture(event.pointerId);
      dragTarget.classList.add('is-dragging');
    });
    dragTarget.addEventListener('pointermove', (event) => {
      if (!spin.dragging) return;
      const dx = event.clientX - spin.x;
      spin.x = event.clientX;
      spin.v = dx * 0.012;
      spin.extra += spin.v;
    });
    const release = (event) => {
      spin.dragging = false;
      dragTarget.classList.remove('is-dragging');
      if (dragTarget.hasPointerCapture?.(event.pointerId)) dragTarget.releasePointerCapture(event.pointerId);
    };
    dragTarget.addEventListener('pointerup', release);
    dragTarget.addEventListener('pointercancel', release);
  }

  // Scroll progress through the section (0 to 1), set from the page; the stack opens with it
  let progress = still !== null ? 0.85 : 0;
  let opened = progress;

  /* What each device shows, one step per turn: a question, then its answer; or the next episode */
  const voxOrder = shuffled(VOX_QA.length, 11);
  const claudeOrder = shuffled(CLAUDE_QA.length, 5);
  const voxScreens = new Map();
  const voxScreen = (i, mode) => {
    const key = `${i}:${mode}`;
    if (!voxScreens.has(key)) voxScreens.set(key, voxAskScreen(VOX_QA[i], mode));
    return voxScreens.get(key);
  };
  const episodeScreens = kind === 'narrator' ? EPISODES.map((ep) => narratorScreen(ep)) : [];
  // Only Even Suite's phone uses the real screenshots; the others draw their screens
  const realScreens = kind === 'glasses' ? await Promise.all(screens.map((url) => loadTexture(url, renderer))) : [];
  // A reduced-motion still shows an answer, the more telling half of the pair
  const frozen = still !== null;
  let step = frozen ? 1 : 0;

  const showStep = (t) => {
    const pair = Math.floor(step / 2);
    const mode = step % 2 ? 'answer' : 'question';
    if (kind === 'hero') phone.show(voxScreen(voxOrder[pair % VOX_QA.length], mode), { instant: true });
    if (kind === 'narrator') {
      const ep = step % EPISODES.length;
      phone.show(episodeScreens[ep], { instant: true });
      words.setWords(EPISODES[ep].words);
    }
    if (kind === 'glasses' && realScreens.length) phone.show(realScreens[pair % realScreens.length], { instant: true });
    if (hud) {
      const qa = CLAUDE_QA[claudeOrder[pair % CLAUDE_QA.length]];
      hud.show(mode === 'answer' ? qa.answer : qa.question, t);
    }
  };
  // A still frame shows its text already typed out
  if (kind === 'vox') phone.show(voxScreen(voxOrder[0], frozen ? 'answer' : 'question'), { instant: true });
  else showStep(frozen ? -100 : 0);
  let front = true;
  let turnedBack = false;
  const local = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const unscale = new THREE.Vector3(1 / p.s, 1 / p.s, 1 / p.s);

  stage.onFrame((t, dt) => {
    const stepDt = dt || 1;
    if (voiceField) voiceField.uniforms.uTime.value = t;
    if (!spin.dragging && dt) {
      spin.extra += spin.v;
      spin.v = damp(spin.v, 0, 1.6, dt);
    }

    // The first time it's on screen, the scene rises into place
    const enter = still !== null || calm ? 1 : ease(t / 1.4);
    content.position.y = -0.35 * (1 - enter);
    content.scale.setScalar(0.94 + 0.06 * enter);

    let angle;
    const turnSeconds = (spec.turn || 14) * (calm ? 2 : 1);
    if (spec.turn) {
      // A slow, even turn; the start angle shows the screen at a three-quarter view
      angle = -0.5 + (t / turnSeconds) * Math.PI * 2 + spin.extra;
    } else {
      // Closed, the phone turns on its turntable; as the stack opens it settles into a three-quarter view (so the
      // layers fan out to the side) and keeps a gentle sway
      opened = damp(opened, progress, 4, stepDt);
      const settle = ease(opened * 2.5);
      const turning = -0.5 + (t / turnSeconds) * Math.PI * 2;
      const resting = -0.12 - 0.55 * ease(opened) + Math.sin(t * 0.6) * 0.32;
      // Blend the angles through the nearest equivalent turn, so the phone never spins backward to settle
      const nearest = turning - Math.round((turning - resting) / (Math.PI * 2)) * Math.PI * 2;
      angle = THREE.MathUtils.lerp(nearest, resting, settle) + spin.extra;
    }
    phonePivot.rotation.set(0.04, angle, 0);
    phonePivot.position.y = p.y + Math.sin(t * 0.8) * 0.03;
    // The shadow narrows as the phone turns edge-on
    phoneShadow.scale.set((0.45 + 0.95 * Math.abs(Math.cos(angle))) * p.s, 0.55 * p.s, 1);

    if (glassesPivot) {
      // The glasses turn on their own, in step with the phone so both face you together
      const g = spec.glasses;
      // Tipped back a touch so the arms run level away from you instead of rising
      glassesPivot.rotation.set(-0.12, angle + 0.35, -0.04);
      glassesPivot.position.y = g.y + Math.sin(t * 0.9 + 1.4) * 0.04;
    }

    // Move on while the lead device's back is turned; the new text types in as it comes round to face you
    if (spec.turn && still === null) {
      const facing = Math.cos(angle + (spec.lead === 'glasses' ? 0.35 : 0));
      if (front && facing < -0.35) {
        front = false;
        step += 1;
        turnedBack = true;
      } else if (!front && facing > 0.2) {
        front = true;
        if (turnedBack) showStep(t);
        turnedBack = false;
      }
    }

    if (kind === 'vox' && dt) {
      // The stack faces you, so its screen alternates on a timer: a question, then its answer
      const s = Math.floor(t / 4.5);
      if (s !== step) {
        step = s;
        phone.show(voxScreen(voxOrder[Math.floor(s / 2) % VOX_QA.length], s % 2 ? 'answer' : 'question'));
      }
    }
    phone.update(dt);

    if (stack) {
      // Layers follow the phone: its transform relative to the content group
      phonePivot.updateMatrix();
      local.copy(phonePivot.matrix);
      quat.setFromRotationMatrix(local.clone().scale(unscale));
      stack.update(opened, local, quat, t);
    }
    if (hud) hud.update(t);
    if (rings) rings.update(t);
    if (words) words.update(t);
  });

  if (still !== null) stage.renderOnce(still);
  else stage.start();
  return {
    ...stage,
    setProgress(value) {
      progress = Math.min(1, Math.max(0, value));
    }
  };
}
