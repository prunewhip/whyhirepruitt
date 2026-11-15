/**
 * App screens drawn on a canvas, so the 3D phones can show content that changes: a question asked in Vox Amelior and
 * then its answer, or a new Narrator Studio episode on each turn. They follow the apps' own layouts (Vox Amelior's
 * Ask screen, Narrator Studio's player); the questions, answers and episode titles are examples.
 * Each function returns a CanvasTexture ready for createPhone().show().
 */

import { THREE } from './stage.js';

const W = 720;
const H = 1560;
const SANS = 'Geist, system-ui, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function canvasTexture(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
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

// Wraps text to a width and draws it; returns the y after the last line
function wrap(ctx, text, x, y, width, lineHeight) {
  let line = '';
  text.split(' ').forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
  });
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function statusBar(ctx, color, time) {
  ctx.fillStyle = color;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(time, 40, 58);
  // Signal, wifi and battery, simplified
  ctx.fillRect(W - 120, 36, 10, 26);
  ctx.fillRect(W - 100, 30, 10, 32);
  roundRect(ctx, W - 72, 32, 22, 32, 4);
  ctx.fill();
}

/* ── Vox Amelior: Ask, with a question and then its answer ─────────── */

const VOX = { bg: '#fbfaff', ink: '#1c1b22', ink2: '#47464f', purple: '#5b55a3', lilac: '#e6e3f7', line: '#dcdae6', chip: '#ececf0' };

/**
 * @param {{question: string, answer: string[], source: string}} qa
 * @param {'question'|'answer'} mode
 */
export function voxAskScreen(qa, mode) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = VOX.bg;
    ctx.fillRect(0, 0, W, H);
    statusBar(ctx, VOX.ink, '9:41');

    ctx.fillStyle = VOX.ink;
    ctx.font = `600 40px ${SANS}`;
    ctx.fillText('Ask Vox', 40, 150);

    // Quick answer | Go through all
    roundRect(ctx, 40, 196, W - 80, 76, 38);
    ctx.strokeStyle = VOX.ink2;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = VOX.lilac;
    ctx.fillRect(40, 196, (W - 80) / 2, 76);
    ctx.restore();
    ctx.fillStyle = VOX.purple;
    ctx.font = `500 30px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Quick answer', 40 + (W - 80) / 4, 246);
    ctx.fillText('Go through all', 40 + ((W - 80) * 3) / 4, 246);
    ctx.textAlign = 'left';

    // The question, as a bubble on the right
    ctx.font = `500 38px ${SANS}`;
    const qWidth = Math.min(W - 200, ctx.measureText(qa.question).width + 64);
    const qLines = Math.ceil((ctx.measureText(qa.question).width + 64) / (W - 200));
    const qHeight = 40 + qLines * 50;
    roundRect(ctx, W - 40 - qWidth, 330, qWidth, qHeight, 34);
    ctx.fillStyle = VOX.purple;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    wrap(ctx, qa.question, W - 40 - qWidth + 32, 330 + 62, qWidth - 64, 50);

    let y = 330 + qHeight + 60;
    if (mode === 'question') {
      // Thinking: three soft bars where the answer will go
      ctx.fillStyle = VOX.chip;
      [0.92, 0.78, 0.6].forEach((w, i) => {
        roundRect(ctx, 40, y + i * 64, (W - 80) * w, 34, 17);
        ctx.fill();
      });
      ctx.fillStyle = VOX.ink2;
      ctx.font = `400 28px ${SANS}`;
      ctx.fillText('Reading your conversations on this phone…', 40, y + 250);
    } else {
      // The answer card
      const top = y;
      const rows = qa.answer.length;
      const cardH = 120 + rows * 92 + 70;
      roundRect(ctx, 40, top, W - 80, cardH, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = VOX.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      // A four-point sparkle, drawn (not every font has the ✦ glyph), then the name
      ctx.fillStyle = VOX.purple;
      const sx = 88;
      const sy = top + 54;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 13);
      ctx.quadraticCurveTo(sx + 2, sy - 2, sx + 13, sy);
      ctx.quadraticCurveTo(sx + 2, sy + 2, sx, sy + 13);
      ctx.quadraticCurveTo(sx - 2, sy + 2, sx - 13, sy);
      ctx.quadraticCurveTo(sx - 2, sy - 2, sx, sy - 13);
      ctx.fill();
      ctx.font = `600 28px ${SANS}`;
      ctx.fillText('Vox', 112, top + 64);
      ctx.font = `500 36px ${SANS}`;
      qa.answer.forEach((row, i) => {
        const ry = top + 132 + i * 92;
        ctx.fillStyle = VOX.purple;
        ctx.beginPath();
        ctx.arc(88, ry - 12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = VOX.ink;
        wrap(ctx, row, 116, ry, W - 200, 42);
      });
      ctx.fillStyle = VOX.ink2;
      ctx.font = `400 26px ${SANS}`;
      ctx.fillText(qa.source, 76, top + cardH - 34);
    }

    // Input bar and navigation
    roundRect(ctx, 30, H - 290, W - 160, 92, 46);
    ctx.fillStyle = VOX.chip;
    ctx.fill();
    ctx.fillStyle = '#7b7a85';
    ctx.font = `400 32px ${SANS}`;
    ctx.fillText('What did we say about…', 70, H - 232);
    ctx.fillStyle = VOX.purple;
    ctx.beginPath();
    ctx.arc(W - 78, H - 244, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0eff5';
    ctx.fillRect(0, H - 170, W, 170);
    ctx.font = `600 26px ${SANS}`;
    ['Now', 'Timeline', 'Insights', 'Ask', 'People'].forEach((name, i) => {
      const cx = 72 + i * 144;
      if (name === 'Ask') {
        roundRect(ctx, cx - 56, H - 150, 112, 56, 28);
        ctx.fillStyle = VOX.lilac;
        ctx.fill();
      }
      ctx.fillStyle = VOX.ink;
      ctx.textAlign = 'center';
      ctx.fillText(name, cx, H - 60);
      ctx.textAlign = 'left';
    });
  });
}

/* ── Narrator Studio: the player, one episode at a time ────────────── */

const NARR = { bg: '#f8f3ea', ink: '#1f1d1a', ink2: '#5a554d', amber: '#b4651c', chip: '#f6e3c3', card: '#fffdf8', line: '#e6dccb', violet: '#4a3fb8' };

/**
 * @param {{title: string, blurb: string, tags: string[], chapters: [string, string][], hue: [string, string]}} ep
 */
export function narratorScreen(ep) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = NARR.bg;
    ctx.fillRect(0, 0, W, H);
    statusBar(ctx, NARR.ink, '9:41');

    // Cover art: a gradient square with radio waves
    const cover = ctx.createLinearGradient(44, 120, 284, 360);
    cover.addColorStop(0, ep.hue[0]);
    cover.addColorStop(1, ep.hue[1]);
    roundRect(ctx, 44, 130, 230, 230, 34);
    ctx.fillStyle = cover;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 7;
    [44, 88, 132, 176].forEach((r) => {
      ctx.beginPath();
      ctx.arc(90, 318, r, -Math.PI / 2, 0);
      ctx.stroke();
    });
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(90, 318, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = NARR.amber;
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText('P O D C A S T', 304, 186);
    ctx.fillStyle = NARR.ink;
    ctx.font = `700 48px ${SERIF}`;
    let y = wrap(ctx, ep.title, 304, 246, W - 340, 56);

    ctx.fillStyle = NARR.ink2;
    ctx.font = `400 34px ${SERIF}`;
    y = wrap(ctx, ep.blurb, 44, Math.max(y + 34, 430), W - 88, 44);

    // Tags
    ctx.font = `500 28px ${SANS}`;
    let x = 44;
    y += 20;
    ['Podcast · ~3 min', ...ep.tags].forEach((tag) => {
      const w = ctx.measureText(tag).width + 48;
      if (x + w > W - 44) {
        x = 44;
        y += 70;
      }
      roundRect(ctx, x, y, w, 54, 27);
      ctx.fillStyle = NARR.chip;
      ctx.fill();
      ctx.fillStyle = NARR.ink;
      ctx.fillText(tag, x + 24, y + 37);
      x += w + 14;
    });

    // Chapters
    y += 100;
    const cardH = H - 330 - y;
    roundRect(ctx, 44, y, W - 88, cardH, 30);
    ctx.fillStyle = NARR.card;
    ctx.fill();
    ctx.strokeStyle = NARR.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = NARR.ink;
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText(`In this episode · ${ep.chapters.length} chapters`, 80, y + 60);
    ep.chapters.slice(0, 3).forEach(([time, name], i) => {
      const cy = y + 110 + i * 110;
      if (cy + 80 > y + cardH) return;
      if (i === 0) {
        roundRect(ctx, 60, cy - 10, W - 120, 100, 22);
        ctx.fillStyle = '#efecfb';
        ctx.fill();
      }
      ctx.fillStyle = i === 0 ? NARR.violet : '#e7dfd2';
      ctx.beginPath();
      ctx.arc(110, cy + 40, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i === 0 ? '#ffffff' : NARR.ink2;
      ctx.font = `600 24px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 110, cy + 49);
      ctx.textAlign = 'left';
      ctx.fillStyle = NARR.amber;
      ctx.font = `600 24px ${SANS}`;
      ctx.fillText(time, 160, cy + 22);
      ctx.fillStyle = NARR.ink;
      ctx.font = `500 32px ${SANS}`;
      ctx.fillText(name, 160, cy + 64);
    });

    // Player
    ctx.fillStyle = NARR.card;
    roundRect(ctx, 0, H - 300, W, 300, 40);
    ctx.fill();
    ctx.fillStyle = NARR.amber;
    ctx.font = `600 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(`CHAPTER 1 OF ${ep.chapters.length}`, W / 2, H - 250);
    ctx.fillStyle = NARR.ink;
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText(ep.chapters[0][1], W / 2, H - 208);
    ctx.textAlign = 'left';
    ctx.fillStyle = NARR.line;
    ctx.fillRect(60, H - 172, W - 120, 6);
    ctx.fillStyle = NARR.violet;
    ctx.beginPath();
    ctx.arc(72, H - 169, 14, 0, Math.PI * 2);
    ctx.fill();
    const play = ctx.createLinearGradient(W / 2 - 60, H - 130, W / 2 + 60, H - 10);
    play.addColorStop(0, ep.hue[1]);
    play.addColorStop(1, ep.hue[0]);
    ctx.fillStyle = play;
    ctx.beginPath();
    ctx.arc(W / 2, H - 80, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 18, H - 110);
    ctx.lineTo(W / 2 + 28, H - 80);
    ctx.lineTo(W / 2 - 18, H - 50);
    ctx.closePath();
    ctx.fill();
  });
}

/* ── Vox (the glasses app): its home screen, with the source on the glasses lit ─────────── */

// Vox's own colours: a dark app (the glasses' picture reads best against it), one teal-to-indigo accent
const VG = { bg: '#07090d', surface: '#10141b', raised: '#171c25', stroke: '#242b38', text: '#f3f5f9', muted: '#8d96a8',
  faint: '#5b6475', teal: '#5eead4', indigo: '#818cf8', onAccent: '#05110f', good: '#34d399', glass: '#12b25c' };

// What each tile is; `lit` names the one on the glasses now
const VOX_TILES = [['terminal', 'Phone', 'terminal'], ['screen', 'Phone', 'screen'], ['laptop', 'Laptop', 'terminal'], ['look', 'Look up', 'glance']];
const VOX_APPS = [['listen', 'Listen'], ['voice', 'Voice'], ['car', 'Car'], ['ask', 'Ask']];

/**
 * @param {{lit: string, lens: string[]}} state  lit: a tile or app key; lens: the lines the glasses show
 */
export function voxGlassesScreen(state) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = VG.bg;
    ctx.fillRect(0, 0, W, H);
    statusBar(ctx, VG.text, '9:41');

    // Title, the link and the power
    const grad = ctx.createLinearGradient(40, 0, 170, 0);
    grad.addColorStop(0, VG.teal);
    grad.addColorStop(1, VG.indigo);
    ctx.fillStyle = grad;
    ctx.font = `700 64px ${SANS}`;
    ctx.fillText('Vox', 40, 168);
    roundRect(ctx, 400, 122, 220, 58, 29);
    ctx.fillStyle = VG.raised;
    ctx.fill();
    ctx.strokeStyle = VG.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = VG.good;
    ctx.beginPath();
    ctx.arc(430, 151, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = VG.text;
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText('Connected', 450, 160);
    roundRect(ctx, 636, 122, 58, 58, 29);
    ctx.fillStyle = VG.teal;
    ctx.fill();

    // The glasses, live: a dark lens with what they show now
    roundRect(ctx, 40, 216, W - 80, 380, 34);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = VG.stroke;
    ctx.stroke();
    ctx.fillStyle = VG.muted;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText('ON THE GLASSES', 76, 264);
    ctx.fillStyle = VG.good;
    ctx.fillText('84%  ·  81%', W - 230, 264);
    ctx.shadowColor = 'rgba(18, 178, 92, 0.5)';
    ctx.shadowBlur = 10;
    state.lens.slice(0, 5).forEach((row, i) => {
      ctx.fillStyle = i === 0 ? '#5fd394' : VG.glass;
      ctx.font = `${i === 0 ? 600 : 500} 36px ${SANS}`;
      ctx.fillText(row, 76, 330 + i * 54);
    });
    ctx.shadowBlur = 0;

    // The sources: what the glasses can show, the one on them lit
    ctx.fillStyle = VG.muted;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText('SWITCH', 44, 660);
    VOX_TILES.forEach(([key, name, sub], i) => {
      const x = 40 + (i % 2) * 326;
      const y = 688 + Math.floor(i / 2) * 168;
      const on = key === state.lit;
      roundRect(ctx, x, y, 314, 150, 30);
      if (on) {
        const g = ctx.createLinearGradient(x, y, x + 314, y + 150);
        g.addColorStop(0, VG.teal);
        g.addColorStop(1, VG.indigo);
        ctx.fillStyle = g;
      } else ctx.fillStyle = VG.raised;
      ctx.fill();
      if (!on) {
        ctx.strokeStyle = VG.stroke;
        ctx.stroke();
      }
      ctx.fillStyle = on ? VG.onAccent : VG.text;
      ctx.font = `600 34px ${SANS}`;
      ctx.fillText(name, x + 28, y + 84);
      ctx.fillStyle = on ? VG.onAccent : VG.muted;
      ctx.font = `500 26px ${SANS}`;
      ctx.fillText(sub, x + 28, y + 122);
      ctx.fillStyle = on ? VG.onAccent : VG.good;
      ctx.beginPath();
      ctx.arc(x + 280, y + 36, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // The apps, as round buttons
    ctx.fillStyle = VG.muted;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText('APPS', 44, 1048);
    VOX_APPS.forEach(([key, name], i) => {
      const cx = 112 + i * 166;
      const cy = 1140;
      const on = key === state.lit;
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      if (on) {
        const g = ctx.createLinearGradient(cx - 58, cy - 58, cx + 58, cy + 58);
        g.addColorStop(0, VG.teal);
        g.addColorStop(1, VG.indigo);
        ctx.fillStyle = g;
      } else ctx.fillStyle = VG.raised;
      ctx.fill();
      if (!on) {
        ctx.strokeStyle = VG.stroke;
        ctx.stroke();
      }
      // A simple glyph: sound bars
      ctx.strokeStyle = on ? VG.onAccent : VG.text;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      [-18, -6, 6, 18].forEach((dx, k) => {
        const h = [12, 26, 20, 10][k];
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - h);
        ctx.lineTo(cx + dx, cy + h);
        ctx.stroke();
      });
      ctx.lineWidth = 2;
      ctx.fillStyle = on ? VG.text : VG.muted;
      ctx.font = `600 26px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, cx, cy + 100);
      ctx.textAlign = 'left';
    });

    // The status line under it all
    roundRect(ctx, 40, 1300, W - 80, 120, 30);
    ctx.fillStyle = VG.surface;
    ctx.fill();
    ctx.strokeStyle = VG.stroke;
    ctx.stroke();
    ctx.fillStyle = VG.good;
    ctx.beginPath();
    ctx.arc(84, 1360, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = VG.text;
    ctx.font = `600 28px ${SANS}`;
    ctx.fillText('Everything is on', 110, 1370);
  });
}
