// Writes the about-me film's soundtrack, in the same voice as the commercial's (score.mjs): a soft ambient bed in
// D major, felt piano, bells and plucks, timed to the scenes in story.html. No voice. Same output on every run.
// The instruments, reverb and master below are score.mjs's own; only the harmony and the cues differ.
//
//   node tools/film/story-score.mjs <out.wav>     (ffmpeg must be on PATH; loudness is set to -17 LUFS)
//
// To check the balance, SCORE_SOLO=piano (or pad, bell, pluck, pulse, fx, ticks) renders one part alone, without
// loudness normalisation, and prints its level.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Scene start times, shared with story.html
const T = createRequire(import.meta.url)('./story-timeline.js');

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
let seed = 20261026;
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

/* ── Harmony: D major throughout, darker for the question and the irony ─ */

const CH = {
  Dmaj9: [50, 57, 61, 64, 66],
  Bm9: [47, 54, 57, 61, 62],
  Gmaj7s11: [43, 50, 54, 59, 61],
  Em9: [40, 47, 50, 54, 55],
  Bdark: [47, 50, 54, 61],
  Gmaj9: [43, 50, 54, 57, 59],
  Dadd9: [50, 57, 62, 64, 66],
  Asus2: [45, 52, 57, 59, 64],
  Dhigh: [50, 57, 62, 64, 66, 69, 73]
};

// Chords by scene: [time, chord]; each lasts until the next
const at = (scene, offset = 0) => T.scenes[scene] + offset;
const PADS = [
  [0, 'Dmaj9'], [at('A', 5), 'Gmaj9'], [at('A', 9.8), 'Asus2'], [at('A', 12), 'Dmaj9'],
  [at('B'), 'Bm9'], [at('B', 3), 'Gmaj9'],
  [at('C'), 'Em9'], [at('C', 3.5), 'Asus2'], [at('C', 7.2), 'Dhigh'],
  [at('E'), 'Dmaj9'], [at('E', 3.5), 'Gmaj9'], [at('E', 5.5), 'Asus2'],
  [at('F'), 'Bm9'], [at('F', 2.4), 'Bdark'], [at('F', 6), 'Em9'], [at('F', 11), 'Bm9'], [at('F', 12.9), 'Gmaj7s11'],
  [at('H'), 'Dadd9'], [at('H', 3), 'Gmaj9'],
  [at('I'), 'Dmaj9'], [at('I', 2), 'Asus2'],
  [at('J'), 'Bm9'], [at('J', 2.6), 'Gmaj9'], [at('J', 5), 'Dmaj9'],
  [at('K'), 'Dhigh'], [DURATION - 3, null]
];
PADS.forEach(([s, c], i) => {
  if (!c) return;
  const e = PADS[i + 1][0];
  pad(s, e, CH[c], s >= at('F') && s < at('H') ? 0.042 : 0.05);
});
const chordAt = (t) => PADS.reduce((name, [s, c]) => (t >= s && c ? c : name), 'Dmaj9');

// Light running along the road: a soft pluck from the chord, every `every` seconds, panned left and right
function lights(from, to, every = 0.6, vel = 0.2) {
  for (let t = from, k = 0; t < to; t += every, k++) {
    const c = CH[chordAt(t)];
    pluck(t, c[[4, 2, 3, 2][k % 4]] + 12, vel, { pan: k % 2 ? 0.3 : -0.3, bus: 'pulse' });
  }
}

// Typing at the rate story.html types, a tick every 0.06 s; returns when the line is done
const typing = (start, text, rate) => {
  const dur = text.length * rate;
  for (let t = start; t < start + dur; t += 0.06) tick(t);
  return start + dur;
};

/* ── Cues (offsets match the timings in story.html) ── */

// 01 · The roads: a rising line with the opening words; light along the road; a bell as each station arrives
[0.5, 0.85, 1.2].forEach((t, i) => piano(at('A', t), [62, 66, 69][i], 0.32, { len: 5 }));
whoosh(at('A', 0.2), 2.4, 0.014, true, -0.2);
lights(at('A', 1.4), at('A', 12.6));
[4.8, 7.3, 9.8].forEach((t, k) => {
  piano(at('A', t), [57, 62, 66][k], 0.32, { len: 5 });
  bell(at('A', t + 0.15), [74, 78, 81][k], 0.14, { pan: (k - 1) * 0.4 });
});
// The climb: one step up per card, and a small lift as the steps reach the arrow
[1.0, 1.9, 2.8].forEach((t, k) => {
  piano(at('B', t), [55, 59, 62][k], 0.32, { len: 4.5 });
  bell(at('B', t + 0.05), [74, 79, 83][k], 0.11, { pan: -0.3 + k * 0.3 });
});
pluck(at('B', 3.7), 86, 0.2, { pan: 0.4 });

// 02 · The spark: the question is typed; the reply streams in as a run of bells; "wrote back." lands on a chord
const asked = typing(at('C', 1.2), 'How does fiber optic cable carry light?', 0.034);
const reply = asked + 0.85;
piano(at('C', 0.4), 52, 0.3, { len: 5 });
[0, 1, 2, 3, 4, 5, 6, 7].forEach((k) => bell(reply + k * 0.22, [69, 71, 74, 76, 78, 81, 83, 86][k], 0.07 + 0.008 * k, { pan: -0.4 + k * 0.11, len: 2.4 }));
[0, 0.06, 0.12].forEach((d, k) => piano(reply + 0.1 + d, [57, 64, 69][k], 0.3, { len: 5 }));
// Ecstatic: a bright chord and a burst of bells; "I still am." answers softly
[0, 0.05, 0.1, 0.15, 0.2].forEach((d, k) => piano(at('C', 7.7 + d), [50, 62, 66, 69, 74][k], 0.32, { len: 5 }));
[74, 78, 81, 86, 90, 93].forEach((m, k) => bell(at('C', 7.75 + k * 0.07), m, 0.08, { pan: -0.5 + k * 0.2, len: 2.2 }));
piano(at('C', 8.8), 69, 0.28, { len: 4 });
piano(at('C', 9.15), 74, 0.26, { len: 4 });
// Every major model: a pluck as each note lands, and a wink for "Runs on a phone!"
piano(at('E', 0.4), 62, 0.28, { len: 5 });
for (let i = 0; i < 7; i++) pluck(at('E', 1.2 + i * 0.5), [74, 78, 76, 81, 78, 83, 81][i], 0.16, { pan: i % 2 ? 0.35 : -0.35 });
pluck(at('E', 5.1), 74, 0.24, { pan: 0.3 });
pluck(at('E', 5.23), 81, 0.24, { pan: 0.35 });
bell(at('E', 5.25), 86, 0.12, { pan: 0.4 });

// 03 · The question: a low question; its route appears; our words leave; the irony lands low
piano(at('F', 0.4), 47, 0.32, { len: 5 });
piano(at('F', 0.4), 54, 0.28, { len: 5 });
bell(at('F', 2.4), 73, 0.14, { len: 4 });
piano(at('F', 2.4), 61, 0.28, { len: 5 });
[2.6, 2.8, 2.95, 3.1, 3.3].forEach((t, k) => pluck(at('F', t), [62, 66, 69, 73, 57][k] + 12, 0.11, { pan: -0.6 + k * 0.3 }));
piano(at('F', 6.0), 52, 0.3, { len: 5 });
for (let i = 0; i < 6; i++) {
  whoosh(at('F', 6.6 + i * 0.6), 2.6, 0.011, i % 2 === 0, -0.2 + 0.12 * i);
  pluck(at('F', 6.6 + i * 0.6 + 2.5), [81, 78, 76, 74, 71, 69][i], 0.1, { pan: 0.6 });
}
piano(at('F', 11.0), 54, 0.3, { len: 5 });
sub(at('F', 12.9), 0.08);
piano(at('F', 12.9), 43, 0.34, { len: 5 });
piano(at('F', 12.9), 55, 0.28, { len: 5 });
[0, 0.15, 0.3].forEach((d, k) => bell(at('F', 12.95 + d), [78, 74, 71][k], 0.1, { pan: -0.3 + k * 0.3 }));

// 04 · The build: home again; the words fall into the phone; the name; the proof counts up
[0.4, 0.7].forEach((t, k) => piano(at('H', t), [62, 66][k], 0.32, { len: 5 }));
[0, 1, 2, 3].forEach((i) => pluck(at('H', 1.4 + i * 0.45 + 1.0), [81, 78, 74, 69][i], 0.2, { pan: 0.35 }));
bell(at('H', 3.2), 74, 0.16);
bell(at('H', 3.22), 81, 0.12);
pluck(at('H', 3.8), 78, 0.16, { pan: -0.2 });
piano(at('I', 0.3), 57, 0.3, { len: 5 });
[0, 0.06].forEach((d, k) => piano(at('I', 1.3 + d), [62, 69][k], 0.3, { len: 5 }));
[1.9, 2.4, 2.9].forEach((t, k) => {
  piano(at('I', t), [64, 66, 69][k], 0.28, { len: 4 });
  bell(at('I', t + 0.05), [76, 78, 81][k], 0.1, { pan: -0.3 + k * 0.3 });
});

// 05 · What's next: the opening's rising line comes back (a musical callback); light runs home from both ends
[0.2, 0.55, 0.9].forEach((t, i) => piano(at('J', t), [62, 66, 69][i], 0.3, { len: 5 }));
lights(at('J', 0.8), at('J', 7.2), 0.6, 0.16);
bell(at('J', 1.0), 78, 0.14);
[0, 0.05, 0.1, 0.15].forEach((d, k) => piano(at('J', 2.6 + d), [50, 62, 66, 74][k], 0.3, { len: 5.5 }));
// The ask: bells on "Let's build what's next.", a warm chord under the name, and the light on the road again
[74, 78, 81, 86].forEach((m, k) => bell(at('K', 0.5 + k * 0.12), m, 0.1, { pan: -0.3 + k * 0.2 }));
[0, 0.08, 0.16].forEach((d, k) => piano(at('K', 0.5 + d), [57, 66, 73][k], 0.28, { len: 5 }));
piano(at('K', 1.0), 50, 0.32, { len: 6 });
piano(at('K', 1.0), 62, 0.28, { len: 6 });
pluck(at('K', 2.3), 81, 0.18, { pan: 0.3 });
lights(at('K', 1.5), DURATION - 3, 0.6, 0.12);

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
