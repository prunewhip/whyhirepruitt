// Writes the commercial's soundtrack: a soft ambient bed in D major, a felt-piano line, bells and a few quiet
// effects (typing, a lock, a whoosh), timed to the scenes in film.html. No voice. Same output on every run.
//
//   node tools/film/score.mjs <out.wav>     (ffmpeg must be on PATH; loudness is set to -17 LUFS)
//
// Cues are placed relative to the scenes in timeline.js, and to the card timings in film.html.
// To check the balance, SCORE_SOLO=piano (or pad, bell, pluck, pulse, fx, ticks) renders one part alone, without
// loudness normalisation, and prints its level.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Scene start times, shared with film.html
const T = createRequire(import.meta.url)('./timeline.js');

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
let seed = 20261024;
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

/* ── Harmony: D major, a cooler turn for Act 2, home again from Act 3 ─ */

const CH = {
  Dmaj9: [50, 57, 61, 64, 66],
  Bm9: [47, 54, 57, 61, 62],
  Gmaj7s11: [43, 50, 54, 59, 61],
  Em9: [40, 47, 50, 54, 55],
  Bdark: [47, 50, 54, 61],
  Gmaj9: [43, 50, 54, 57, 59],
  Dadd9: [50, 57, 62, 64, 66],
  Asus2: [45, 52, 57, 59, 64],
  DoverFs: [42, 50, 57, 62, 64],
  Dhigh: [50, 57, 62, 64, 66, 69, 73]
};

// Chords by scene: [scene, offset into it, chord]; each lasts until the next
const at = (scene, offset = 0) => T.scenes[scene] + offset;
const O = (offset) => at('O', offset);
const ARRIVE = T.montage;
// The punchline lands when the last question's answer appears (as in film.html: typing from 0.4 s, up to 1.8 s, then 0.5 s)
const PUNCH = O(ARRIVE[5] + 0.4 + 1.8 + 0.5);
const PADS = [
  [0, 'Dmaj9'], [at('C'), 'Bm9'], [at('D'), 'Gmaj7s11'], [at('E'), 'Em9'], [at('E', 5.2), 'Gmaj7s11'], [at('F'), 'Bdark'], [at('F', 1.7), null],
  [at('G'), 'Gmaj9'], [at('H'), 'Dadd9'], [at('H', 4.6), 'Asus2'], [at('I'), 'Bm9'], [at('I', 6.9), 'Gmaj9'], [at('I', 10.9), 'Dmaj9'],
  [at('J'), 'DoverFs'], [at('J', 3.0), 'Gmaj9'],
  [at('K'), 'Dmaj9'], [at('L'), 'Bm9'], [at('L', 8.0), 'Gmaj9'], [at('M'), 'Em9'], [at('M', 5.2), 'Gmaj9'], [at('N'), 'Asus2'], [at('N', 3.0), 'Dmaj9'],
  [O(ARRIVE[0]), 'Dmaj9'], [O(ARRIVE[1]), 'Bm9'], [O(ARRIVE[2]), 'Gmaj9'], [O(ARRIVE[3]), 'Em9'], [O(ARRIVE[4]), 'Asus2'], [O(ARRIVE[5]), 'Dmaj9'],
  [PUNCH, null], [PUNCH + 3.8, 'Gmaj9'],
  [at('P'), 'Gmaj9'], [at('P', 6.9), 'Dmaj9'],
  [at('Q'), 'Bm9'], [at('Q', 2.2), 'Gmaj9'], [at('Q', 4.6), 'Asus2'], [at('Q', 6.4), 'Dhigh'], [DURATION - 3, null]
];
PADS.forEach(([s, c], i) => {
  if (!c) return;
  const e = PADS[i + 1][0];
  pad(s, e, CH[c], s >= at('C') && s < at('G') ? 0.042 : 0.05);
});

// A quiet pulse under Act 4: chord tones an octave up, one every 0.75 s
function pulse(from, to) {
  for (let t = from, k = 0; t < to; t += 0.75, k++) {
    const c = CH[chordAt(t)];
    const tones = [c[c.length - 1], c[2], c[3], c[2]];
    pluck(t, tones[k % 4] + 12, 0.32, { pan: k % 2 ? 0.25 : -0.25, bus: 'pulse' });
  }
}
const chordAt = (t) => PADS.reduce((name, [s, c]) => (t >= s && c ? c : name), 'Dmaj9');

// Typing at about 30 characters a second, as in film.html; returns when the answer appears
const typing = (start, q, maxType = 1.6, think = 0.4) => {
  const dur = Math.min(maxType, q.length * 0.034);
  for (let t = start; t < start + dur; t += 0.06) tick(t);
  return start + dur + think;
};

/* ── Cues ──────────────────────────────────────────── */

// Act 1 · 16,000 words: a rising line as the number counts; two falling notes as they slip away
[1.2, 1.55, 1.9, 2.25, 2.6].forEach((t, i) => piano(t, [62, 66, 69, 73, 76][i], 0.32 + i * 0.03));
piano(at('B', 0.75), 69, 0.3, { len: 5 });
piano(at('B', 1.45), 66, 0.26, { len: 5 });
whoosh(at('B', 0.1), 2.8, 0.022, false, 0.2);

// Act 2 · their rules: our words online pile up, faster and faster (26 items, revealed as in film.html);
// a slow heartbeat underneath
piano(at('C', 0.3), 59, 0.38, { len: 5 });
whoosh(at('C', 0.7), 4.0, 0.018, true, 0.2);
for (let k = 0; k < 26; k++) {
  pluck(at('C', 0.6 + 3.8 * Math.pow(k / 26, 0.65)), [71, 74, 76, 78, 81, 83, 86][(k * 3) % 7], 0.07 + 0.002 * k, { pan: ((k * 5) % 9 - 4) / 6 });
}
piano(at('C', 3.05), 66, 0.28);
piano(at('C', 3.05), 71, 0.24);
for (let i = 0; i < 14; i++) pluck(at('D', 0.5 + i * 0.12), [86, 88, 90, 93, 95][i % 5], 0.08, { pan: ((i % 7) - 3) / 5 });
for (let t = at('D', 0.3); t < at('F', -0.1); t += 0.9) beat(t, 0.028 + 0.022 * ((t - at('D')) / (at('F') - at('D'))));
[1.75, 4.15, 6.55].forEach((t, k) => piano(at('E', t), [52, 50, 47][k], 0.36, { len: 5 }));
piano(at('F', 0.35), 35, 0.3, { len: 4 });
piano(at('F', 0.35), 47, 0.3, { len: 4 });
sub(at('F', 1.65));
piano(at('F', 1.65), 42, 0.36, { len: 3 });
piano(at('F', 1.65), 47, 0.3, { len: 3 });

// Act 3 · your phone: "Take your words offline." The music comes back; the searches land in the phone; "Start here."
bell(at('G', 0.25), 74, 0.2);
piano(at('G', 0.25), 62, 0.34, { len: 5 });
piano(at('G', 0.25), 69, 0.28, { len: 5 });
whoosh(at('G', 0.5), 1.6, 0.018, false, 0.3);
[1.7, 2.0, 2.3, 2.6].forEach((t, i) => pluck(at('G', t), [74, 76, 78, 81][i], 0.22, { pan: 0.3 }));
piano(at('G', 2.25), 50, 0.32, { len: 5 });
bell(at('G', 2.3), 81, 0.14);
[0.45, 2.05, 3.65].forEach((t, k) => piano(at('H', t), [69, 71, 74][k], 0.34));
bell(at('H', 5.25), 81, 0.14);
[0.5, 3.5, 6.5].forEach((t, k) => {
  lock(at('I', t + 0.05), 0.045);
  piano(at('I', t + 0.1), [50, 54, 57][k], 0.32, { len: 5 });
  bell(at('I', t + 0.95), [74, 78, 81][k], 0.1, { pan: 0.4 });
});
[0, 0.1, 0.2, 0.3].forEach((d, k) => piano(at('I', 10.9 + d), [62, 66, 69, 76][k], 0.3, { len: 5 }));
[0.35, 1.15, 1.95].forEach((t, k) => piano(at('J', t), [62, 66, 69][k], 0.32));
noise(at('J', 3.0), 0.32, 0.02, 900, 2600, { q: 0.6, send: 0.2 });
bell(at('J', 3.55), 74, 0.2);
bell(at('J', 3.57), 78, 0.16);

// Act 4 · your life
pulse(at('K', 0.3), at('M'));
piano(at('K', 0.3), 62, 0.3);
// Remember: typing, then the answer
[[0.6, 'What did Jordan say I shouldn’t forget?'], [8.0, 'What do we need from the store?']].forEach(([t, q]) => {
  whoosh(at('L', t - 0.1), 0.7, 0.014, true, 0.3);
  pluck(typing(at('L', t + 0.4), q), 81, 0.22, { pan: 0.3 });
});
// Bedtime: tender and slow, no pulse
[0.95, 1.3, 1.65].forEach((t, k) => piano(at('M', t), [66, 69, 74][k], 0.28, { len: 5 }));
bell(typing(at('M', 5.5), 'What did Milo say at bedtime when he was five?', 1.7), 74, 0.16);
[0, 0.05, 0.1, 0.15].forEach((d, k) => piano(at('M', 11.15 + d), [50, 62, 69, 78][k], 0.3, { len: 5.5 }));
// Yours
piano(at('N', 0.3), 57, 0.28);
piano(at('N', 3.0), 50, 0.34, { len: 5 });
piano(at('N', 3.0), 74, 0.3, { len: 5 });
bell(at('N', 3.05), 81, 0.14);
// The questions pile up
pulse(O(0.1), PUNCH);
const MONTAGE = [
  'Which words do I use incorrectly?', 'When did I sound sharpest? Why?', 'What thinking traps do I fall into?',
  'Who did I thank this week?', 'What have I promised and not done?', 'Honestly, who starts more of our fights: me or Jordan?'
];
MONTAGE.forEach((q, i) => {
  const start = O(ARRIVE[i]);
  whoosh(start - 0.05, 0.8, 0.02, true, i % 2 ? 0.35 : -0.35);
  const last = i === MONTAGE.length - 1;
  const a = typing(start + 0.4, q, last ? 1.8 : 1.6, last ? 0.5 : 0.4);
  if (!last) pluck(a, [81, 78, 76, 74, 71][i], 0.22, { pan: 0.25 });
  else {
    // "You. Six to five." The pulse stops; a beat; the follow-up; "Not today." gets a wink
    pluck(a, 45, 0.5, { pan: 0 });
    pluck(a + 1.6, 69, 0.14);
    pluck(a + 3.8, 74, 0.24, { pan: 0.3 });
    pluck(a + 3.93, 81, 0.24, { pan: 0.35 });
  }
});
// Three months later
bell(at('P', 0.25), 78, 0.14);
pluck(typing(at('P', 0.8), 'Who starts more of our fights now?'), 81, 0.22, { pan: 0.3 });
[4.3, 4.9].forEach((t, k) => [0, 1, 2, 3, 4].forEach((j) => pluck(at('P', t + 0.1 + j * 0.13), [69, 71, 74, 76, 78][j] + k * 2, 0.1, { pan: k ? 0.3 : -0.3 })));
pulse(at('P', 1.5), at('Q', -0.4));
[0, 0.1, 0.2, 0.3].forEach((d, k) => piano(at('P', 6.9 + d), [62, 66, 69, 74][k], 0.3, { len: 5 }));

// Act 5 · the name: the words fall away with a rising run of bells; the mark lands with a chord
piano(at('Q', 0.25), 59, 0.3, { len: 5 });
piano(at('Q', 0.95), 62, 0.3, { len: 5 });
whoosh(at('Q', 4.0), 1.4, 0.016, true, 0);
[74, 76, 78, 81, 83, 86].forEach((m, k) => bell(at('Q', 4.75 + k * 0.2), m, 0.12, { pan: -0.4 + k * 0.16 }));
bell(at('Q', 6.4), 74, 0.22, { len: 4 });
bell(at('Q', 6.42), 81, 0.18, { len: 4 });
piano(at('Q', 6.4), 50, 0.36, { len: 6 });
piano(at('Q', 6.4), 62, 0.3, { len: 6 });
[3, 2, 4, 1, 5, 0, 6].forEach((k, order) => bell(at('Q', 6.75 + order * 0.07), [86, 88, 90, 93, 90, 88, 86][k], 0.05, { pan: (k - 3) / 5, len: 2 }));
piano(at('Q', 7.45), 66, 0.26, { len: 5 });
piano(at('Q', 8.05), 69, 0.24, { len: 4.8 });

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
