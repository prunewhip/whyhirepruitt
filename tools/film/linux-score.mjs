// Writes the Linux film's soundtrack in the same voice as the other films (score.mjs, story-score.mjs): a soft
// ambient bed in D major, felt piano, bells and plucks, timed to the scenes in linux.html. No voice. Same output on
// every run. The instruments, reverb and master are story-score.mjs's own; only the harmony and the cues differ.
//
//   node tools/film/linux-score.mjs <out.wav>     (ffmpeg must be on PATH; loudness is set to -17 LUFS)
// To check the balance, SCORE_SOLO=piano (or pad, bell, pluck, pulse, fx, ticks) renders one part alone, without
// loudness normalisation, and prints its level.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Scene start times, shared with linux.html
const T = createRequire(import.meta.url)('./linux-timeline.js');

const OUT = process.argv[2] || 'score.wav';
const SR = 48000;
const DURATION = T.duration;
const N = SR * DURATION;

// Levels of each part, in one place
const MIX = { pad: 0.62, piano: 1.25, bell: 1.6, pluck: 1.4, pulse: 1.2, fx: 1, ticks: 4 };
const SOLO = process.env.SCORE_SOLO || '';
const level = (bus) => (SOLO && bus !== SOLO ? 0 : MIX[bus]);

const dryL = new Float32Array(N);
const dryR = new Float32Array(N);
const sendL = new Float32Array(N);
const sendR = new Float32Array(N);

const TAU = Math.PI * 2;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x));

// Seeded random numbers, so the noise and phases are the same every run
let seed = 20261121;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Adds a mono voice: fn(t) gives the sample at t seconds after start
function add(start, dur, fn, { gain = 1, pan = 0, send = 0.4, bus = 'fx' } = {}) {
  gain *= level(bus);
  if (!gain) return;
  const a = Math.max(0, Math.round(start * SR));
  const b = Math.min(N, Math.round((start + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = a; i < b; i++) {
    const s = fn(i / SR - start);
    dryL[i] += s * gl;
    dryR[i] += s * gr;
    sendL[i] += s * gl * send;
    sendR[i] += s * gr * send;
  }
}

/* ── Instruments ───────────────────────────────────── */

// Pad: soft sines with a little of the octave and twelfth, slightly detuned left and right
function pad(start, end, notes, gain = 0.05) {
  const att = 1.6;
  const rel = 2.4;
  const len = end - start;
  const g = gain / Math.sqrt(notes.length);
  notes.forEach((m) => {
    const f = hz(m);
    const ph = [rand(), rand(), rand(), rand()].map((p) => p * TAU);
    const lfoRate = 0.08 + rand() * 0.1;
    const tilt = m < 48 ? 1.25 : m > 64 ? 0.8 : 1;
    for (const [side, detune, phase] of [[-0.7, 0.9988, ph[0]], [0.7, 1.0012, ph[1]]]) {
      add(start, len + rel, (t) => {
        const env = smooth(t / att) * (t > len ? 1 - smooth((t - len) / rel) : 1);
        const lfo = 1 + 0.16 * Math.sin(TAU * lfoRate * t + ph[2]);
        const x = Math.sin(TAU * f * detune * t + phase) + 0.28 * Math.sin(TAU * 2 * f * t + ph[3]) + 0.08 * Math.sin(TAU * 3 * f * t);
        return x * env * lfo;
      }, { gain: g * tilt, pan: side, send: 0.55, bus: 'pad' });
    }
  });
}

// Felt piano: slightly stretched partials that fade faster the higher they are, and a soft hammer
function piano(time, m, vel = 0.4, { len = 4.5, pan = null, send = 0.45 } = {}) {
  const f0 = hz(m);
  const B = 0.00035;
  const parts = [];
  for (let n = 1; n <= 8; n++) {
    parts.push([TAU * n * f0 * Math.sqrt(1 + B * n * n), Math.pow(n, -1.3) * Math.exp(-0.38 * (n - 1)), 0.8 + 0.6 * n + (m - 60) * 0.02, rand() * TAU]);
  }
  const p = pan ?? Math.max(-0.6, Math.min(0.6, (m - 64) / 30));
  add(time, len, (t) => {
    let x = 0;
    for (const [w, a, d, ph] of parts) x += a * Math.exp(-d * t) * Math.sin(w * t + ph);
    const hammer = t < 0.012 ? (rand() - 0.5) * 0.06 * (1 - t / 0.012) : 0;
    return (x + hammer) * smooth(t / 0.006) * (1 - smooth((t - (len - 0.4)) / 0.4));
  }, { gain: vel * 0.13, pan: p, send, bus: 'piano' });
}

// FM bell: a glassy chime
function bell(time, m, vel = 0.2, { ratio = 3.5, index = 2, len = 3.2, pan = 0.2, send = 0.6 } = {}) {
  const f = hz(m);
  add(time, len, (t) => {
    const I = index * Math.exp(-t * 2.6);
    return Math.sin(TAU * f * t + I * Math.sin(TAU * f * ratio * t)) * Math.exp(-t * 1.5) * smooth(t / 0.004) * (1 - smooth((t - (len - 0.3)) / 0.3));
  }, { gain: vel * 0.09, pan, send, bus: 'bell' });
}

// Soft wooden pluck, for the quiet pulse and small events
function pluck(time, m, vel = 0.2, { pan = 0, send = 0.35, bus = 'pluck' } = {}) {
  const f = hz(m);
  add(time, 1.2, (t) => {
    const x = Math.sin(TAU * f * t) * Math.exp(-t * 5.5) + 0.25 * Math.sin(TAU * 3.98 * f * t) * Math.exp(-t * 16) + 0.06 * Math.sin(TAU * 9.9 * f * t) * Math.exp(-t * 38);
    return x * smooth(t / 0.003);
  }, { gain: vel * 0.12, pan, send, bus });
}

// Filtered noise (state-variable band-pass) with a moving centre
function noise(time, dur, gain, fFrom, fTo, { q = 0.7, pan = 0, send = 0.4, bus = 'fx', shape = (x) => Math.sin(Math.PI * x) } = {}) {
  let low = 0;
  let band = 0;
  add(time, dur, (t) => {
    const x = rand() * 2 - 1;
    const fc = fFrom * Math.pow(fTo / fFrom, t / dur);
    const k = 2 * Math.sin((Math.PI * fc) / SR);
    low += k * band;
    const high = x - low - q * band;
    band += k * high;
    return band * shape(t / dur);
  }, { gain, pan, send, bus });
}

const whoosh = (time, dur = 0.9, gain = 0.05, up = true, pan = 0) => noise(time, dur, gain, up ? 280 : 2200, up ? 2400 : 300, { q: 0.9, pan, send: 0.5 });
const tick = (time, gain = 0.012) => noise(time, 0.006, gain * (0.7 + 0.6 * rand()), 3200, 3200, { q: 1.4, pan: (rand() - 0.5) * 0.4, send: 0.08, bus: 'ticks', shape: (x) => 1 - x });

// A soft latch: a short click with a small resonant tone
function lock(time, gain = 0.05) {
  noise(time, 0.014, gain, 2200, 1800, { q: 1.2, send: 0.25, shape: (x) => 1 - x });
  add(time, 0.08, (t) => Math.sin(TAU * 1400 * t) * Math.exp(-t * 60), { gain: gain * 0.5, send: 0.3 });
}

// A low, soft hit that drops in pitch
function sub(time, gain = 0.09) {
  add(time, 1.6, (t) => {
    const f = 42 + 38 * Math.exp(-t * 9);
    return Math.sin(TAU * f * t) * Math.exp(-t * 2.2) * smooth(t / 0.01);
  }, { gain, send: 0.15 });
}

// Two soft thumps, like a slow heartbeat
function beat(time, gain = 0.08) {
  for (const [dt, g] of [[0, 1], [0.27, 0.7]]) {
    add(time + dt, 0.3, (t) => Math.sin(TAU * 56 * t) * Math.exp(-t * 16) * smooth(t / 0.004), { gain: gain * g, send: 0.05 });
  }
}

/* ── Harmony: D major, bright for the glasses, a little darker for the turn of the head ─ */

const CH = {
  Dmaj9: [50, 57, 61, 64, 66],
  Bm9: [47, 54, 57, 61, 62],
  Em9: [40, 47, 50, 54, 55],
  Gmaj9: [43, 50, 54, 57, 59],
  Dadd9: [50, 57, 62, 64, 66],
  Asus2: [45, 52, 57, 59, 64],
  Dhigh: [50, 57, 62, 64, 66, 69, 73]
};

// Chords by scene: [time, chord]; each lasts until the next
const at = (scene, offset = 0) => T.scenes[scene] + offset;
const PADS = [
  [0, 'Dmaj9'], [at('A', 3.4), 'Gmaj9'], [at('A', 6.3), 'Asus2'],
  [at('B'), 'Dhigh'],
  [at('C'), 'Bm9'], [at('C', 4.6), 'Gmaj9'],
  [at('D'), 'Dmaj9'], [at('D', 2.4), 'Asus2'], [at('D', 5), 'Dadd9'],
  [at('E'), 'Gmaj9'], [at('E', 5), 'Dadd9'],
  [at('F'), 'Em9'], [at('F', 2.5), 'Asus2'], [at('F', 5.5), 'Bm9'], [at('F', 8), 'Gmaj9'],
  [at('G'), 'Dmaj9'], [at('G', 3), 'Gmaj9'], [at('G', 5.4), 'Asus2'],
  [at('H'), 'Gmaj9'], [at('H', 2.3), 'Dhigh'],
  [at('K'), 'Dmaj9'], [DURATION - 3, null]
];
PADS.forEach(([s, c], i) => {
  if (!c) return;
  pad(s, PADS[i + 1][0], CH[c], 0.05);
});
const chordAt = (t) => PADS.reduce((name, [s, c]) => (t >= s && c ? c : name), 'Dmaj9');

// Light running along the link: a soft pluck from the chord every `every` seconds, panned left and right
function lights(from, to, every = 0.6, vel = 0.18) {
  for (let t = from, k = 0; t < to; t += every, k++) {
    const c = CH[chordAt(t)];
    pluck(t, c[[4, 2, 3, 2][k % 4]] + 12, vel, { pan: k % 2 ? 0.3 : -0.3, bus: 'pulse' });
  }
}

// Key ticks at the film's typing rate
T.typing.forEach(([start, text, rate]) => {
  for (let i = 0; i < text.length; i++) tick(start + i * rate, 0.014);
});
T.enters.forEach((t) => lock(t, 0.05));

/* ── Cues (offsets match the timings in linux.html) ── */

// A · desk, lap, glance: a rising line, one note per line; a bell as each picture arrives
[0.5, 3.4, 6.3].forEach((t, i) => piano(at('A', t), [62, 66, 69][i], 0.32, { len: 5 }));
[1.0, 3.9, 6.8].forEach((t, i) => bell(at('A', t), [74, 78, 81][i], 0.13, { pan: (i - 1) * 0.4 }));
[74, 78, 81, 86].forEach((m, k) => bell(at('A', 7.6 + k * 0.09), m, 0.06, { pan: -0.3 + k * 0.2, len: 2.4 }));

// B · the title: a full chord, and the lenses light with a run of bells
[0, 0.05, 0.1, 0.15, 0.2].forEach((d, k) => piano(at('B', 0.25 + d), [50, 62, 66, 69, 74][k], 0.32, { len: 5.5 }));
whoosh(at('B', 0.4), 1.6, 0.03, true, 0);
[74, 78, 81, 86, 90].forEach((m, k) => bell(at('B', 0.7 + k * 0.11), m, 0.09, { pan: -0.4 + k * 0.2, len: 2.6 }));

// C · the phone rises from the pocket; Termux; the desktop appears
whoosh(at('C', 0.2), 1.3, 0.04, true, 0);
piano(at('C', 0.4), 54, 0.3, { len: 5 });
pluck(at('C', 3.4), 78, 0.16, { pan: -0.2 });
pluck(at('C', 3.95), 81, 0.16, { pan: 0.2 });
[0, 0.06, 0.12].forEach((d, k) => piano(at('C', 4.6 + d), [55, 62, 66][k], 0.3, { len: 5 }));
bell(at('C', 4.7), 83, 0.11, { pan: 0.3 });

// D · to the glasses: the phone steps aside, light runs along the link, the glasses boot, icons pop
whoosh(at('D', 0.1), 1.1, 0.035, false, -0.3);
lights(at('D', 1.0), at('D', 8.6), 0.6, 0.16);
bell(at('D', 1.2), 74, 0.12, { pan: 0.3 });
[0, 0.06, 0.12].forEach((d, k) => piano(at('D', 2.4 + d), [57, 64, 69][k], 0.3, { len: 5 }));
[0, 1, 2, 3].forEach((i) => pluck(at('D', 2.7 + i * 0.12), [74, 78, 81, 86][i], 0.15, { pan: -0.3 + i * 0.2 }));

// E · the keyboard; the terminal opens; Claude Code answers line by line
whoosh(at('E', 0.3), 1.0, 0.03, true, 0);
pluck(at('E', 0.65), 74, 0.16);
bell(at('E', 2.5), 81, 0.1, { pan: 0.2 });
[[5.4, 74], [6.0, 78], [6.5, 76], [7.4, 81]].forEach(([t, m], k) => pluck(at('E', t), m, 0.18, { pan: k % 2 ? 0.3 : -0.3 }));
[0, 0.06, 0.12].forEach((d, k) => piano(at('E', 7.4 + d), [57, 62, 69][k], 0.28, { len: 5 }));
bell(at('E', 7.45), 86, 0.1, { pan: 0.3 });

// F · the head turns: the sound moves left, then right, then home; a pluck as each tab comes up
whoosh(at('F', 2.0), 1.0, 0.03, false, -0.6);
pluck(at('F', 2.75), 74, 0.18, { pan: -0.6 });
whoosh(at('F', 4.6), 1.5, 0.03, true, 0.6);
pluck(at('F', 5.2), 78, 0.15, { pan: 0 });
pluck(at('F', 5.9), 81, 0.18, { pan: 0.6 });
whoosh(at('F', 7.5), 0.9, 0.025, false, 0);
pluck(at('F', 8.0), 78, 0.15, { pan: 0 });

// G · the apps slide in turn
bell(at('G', 1.3), 78, 0.1, { pan: -0.3 });
whoosh(at('G', 2.5), 0.7, 0.025, true, 0.3);
for (let i = 0; i < 6; i++) pluck(at('G', 3.0 + i * 0.08), [74, 76, 78, 81, 83, 86][i], 0.1, { pan: -0.4 + i * 0.16 });
whoosh(at('G', 4.9), 0.7, 0.025, true, 0.3);
for (let i = 0; i < 5; i++) pluck(at('G', 5.3 + i * 0.26), [69, 74, 76, 78, 81][i], 0.11, { pan: i % 2 ? 0.2 : -0.2 });

// H · the screen folds into the lens; the opening line comes back (a musical callback) and resolves
whoosh(at('H', -0.6), 1.0, 0.03, false, 0.2);
[0.3, 1.3, 2.3].forEach((t, i) => piano(at('H', t), [62, 66, 69][i], 0.32, { len: 5 }));
[0, 0.05, 0.1, 0.15].forEach((d, k) => piano(at('H', 2.4 + d), [50, 62, 66, 74][k], 0.3, { len: 5.5 }));
[74, 78, 81, 86, 90].forEach((m, k) => bell(at('H', 1.3 + k * 0.1), m, 0.08, { pan: -0.4 + k * 0.2, len: 2.4 }));

// K · the end card: a warm chord under the name, then the light again
[0, 0.08, 0.16].forEach((d, k) => piano(at('K', 0.5 + d), [57, 66, 73][k], 0.28, { len: 5 }));
piano(at('K', 0.9), 50, 0.32, { len: 6 });
[74, 78, 81, 86].forEach((m, k) => bell(at('K', 0.9 + k * 0.35), m, 0.08, { pan: -0.3 + k * 0.2 }));
lights(at('K', 2.4), DURATION - 3, 0.6, 0.1);

/* ── Reverb (Freeverb) and master ───────────────────── */

function freeverb(input, out, offset, { room = 0.86, damp = 0.38, wet = 2.6 } = {}) {
  const scale = SR / 44100;
  const fb = room * 0.28 + 0.7;
  const d = damp * 0.4;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ buf: new Float32Array(Math.round(n * scale) + offset), i: 0, store: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ buf: new Float32Array(Math.round(n * scale) + offset), i: 0 }));
  for (let s = 0; s < N; s++) {
    const x = input[s] * 0.015;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - d) + c.store * d;
      c.buf[c.i] = x + c.store * fb;
      if (++c.i >= c.buf.length) c.i = 0;
      acc += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      a.buf[a.i] = acc + b * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      acc = b - acc;
    }
    out[s] += acc * wet;
  }
}
freeverb(sendL, dryL, 0);
freeverb(sendR, dryR, Math.round(23 * (SR / 44100)));

// Fade in, fade out, and a peak at -1 dBFS before the loudness pass
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = smooth(t / 0.6) * (1 - smooth((t - (DURATION - 4)) / 4));
  dryL[i] *= g;
  dryR[i] *= g;
  peak = Math.max(peak, Math.abs(dryL[i]), Math.abs(dryR[i]));
}

if (SOLO) {
  let sum = 0;
  let active = 0;
  for (let i = 0; i < N; i++) {
    const e = dryL[i] * dryL[i] + dryR[i] * dryR[i];
    if (e > 1e-10) { sum += e / 2; active++; }
  }
  const db = (x) => (20 * Math.log10(x)).toFixed(1);
  console.log(`${SOLO}: peak ${db(peak)} dBFS, RMS while sounding ${db(Math.sqrt(sum / Math.max(1, active)))} dBFS, sounding ${(active / SR).toFixed(1)} s`);
  process.exit(0);
}
const norm = 0.89 / peak;

const raw = OUT.replace(/\.wav$/, '') + '.raw.wav';
const data = Buffer.alloc(N * 8);
for (let i = 0; i < N; i++) {
  data.writeFloatLE(dryL[i] * norm, i * 8);
  data.writeFloatLE(dryR[i] * norm, i * 8 + 4);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(3, 20); // IEEE float
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 8, 28);
header.writeUInt16LE(8, 32);
header.writeUInt16LE(32, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(raw, Buffer.concat([header, data]));

// Two-pass loudness normalisation to -17 LUFS, true peak -1.5 dB: calm, and level with other web video
const measure = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const stats = JSON.parse(measure.stderr.slice(measure.stderr.lastIndexOf('{'), measure.stderr.lastIndexOf('}') + 1));
const second = `loudnorm=I=-17:TP=-1.5:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
const done = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', raw, '-af', second, '-ar', String(SR), '-c:a', 'pcm_s24le', OUT], { stdio: 'inherit' });
fs.rmSync(raw);
if (done.status !== 0) process.exit(done.status);
console.log(`score → ${OUT} (measured ${stats.input_i} LUFS before normalising)`);
