// Photographs each screen in book-screens.html (1000 × 1600) for the book, without its live parts, and lists where
// those parts are (screens.json), so js/3d/book.js can draw them moving on top: status dots, waveforms, the cursor,
// the podcast's progress and level bars, the score ring, the microphone, light sweeps, and lines that type
// themselves out (each with the colour behind it, sampled from the photograph, to hide it until it's written).
//   cd /root/site-tools && node /root/whyhirepruitt/tools/render/book-tex.mjs http://127.0.0.1:8000/tools/render/book-screens.html OUTDIR
import { chromium } from '/root/site-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// Where the live parts are, in each screen's own pixels
const regions = await page.evaluate(() => {
  const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim();
  const out = {};
  for (const s of document.querySelectorAll('section.screen')) {
    const o = s.getBoundingClientRect();
    const box = (el, pad = 0) => { const r = el.getBoundingClientRect(); return [r.left - o.left - pad, r.top - o.top - pad, r.width + 2 * pad, r.height + 2 * pad].map((v) => Math.round(v * 10) / 10); };
    const a = css(s, '--a');
    const b = css(s, '--b');
    const list = [];
    // A line of text as typed: one rect per wrapped line, and where to sample the colour behind it
    let delay = 0.75;
    const type = (el, { speed = 34, gap = 0.12, sampleFrom = null } = {}) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = [];
      for (const r of range.getClientRects()) {
        if (r.width < 1) continue;
        const line = lines.find((l) => Math.abs(l.top - r.top) < r.height / 2);
        if (line) { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); line.bottom = Math.max(line.bottom, r.bottom); }
        else lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      }
      const sx = sampleFrom ? sampleFrom.getBoundingClientRect().left - o.left + 10 : null;
      for (const l of lines) {
        const chars = Math.max(4, Math.round((l.right - l.left) / 15));
        const dur = chars / speed;
        list.push({ kind: 'type', rect: [l.left - o.left - 3, l.top - o.top - 2, l.right - l.left + 8, l.bottom - l.top + 4].map(Math.round), delay, dur,
          sample: [Math.round(sx ?? (l.left - o.left - 14)), Math.round((l.top + l.bottom) / 2 - o.top)], color: b });
        delay += dur + gap;
      }
    };
    s.querySelectorAll('.live i').forEach((el) => list.push({ kind: 'dot', rect: box(el), color: a }));
    s.querySelectorAll('.frame').forEach((el) => list.push({ kind: 'shine', rect: box(el), radius: 40, period: 7, offset: 1.5 }));
    s.querySelectorAll('.art').forEach((el) => list.push({ kind: 'shine', rect: box(el), radius: 38, period: 6, offset: 0.4 }));
    s.querySelectorAll('.greys').forEach((el) => list.push({ kind: 'shine', rect: box(el), radius: 8, period: 4, offset: 0 }));
    s.querySelectorAll('.foot-line i').forEach((el) => list.push({ kind: 'shine', rect: box(el, 6), radius: 6, period: 3, offset: 0 }));
    s.querySelectorAll('.wave').forEach((el) => list.push({ kind: 'wave', rect: box(el), bars: el.children.length, white: Boolean(el.closest('.art')), color: a, color2: b }));
    // Typed: the question and answer, the terminal, the quiz options
    s.querySelectorAll('[data-type]').forEach((el) => type(el, { speed: 22, gap: 0.2 }));
    s.querySelectorAll('.ask .q, .ask .a, .ask .src').forEach((el) => type(el, { sampleFrom: el.closest('.panel') }));
    s.querySelectorAll('.term .ln').forEach((el, i, all) => { if (i < all.length - 1) type(el, { speed: 40, gap: 0.3, sampleFrom: el.closest('pre') }); });
    s.querySelectorAll('.term .ln:last-child .p').forEach((el) => type(el, { sampleFrom: el.closest('pre') }));
    s.querySelectorAll('.cur').forEach((el) => list.push({ kind: 'cursor', rect: box(el), color: a, delay }));
    s.querySelectorAll('.opts li').forEach((el) => {
      const r = box(el, 3);
      list.push({ kind: 'type', rect: r, delay, dur: 0.32, sample: [Math.round(r[0] - 8), Math.round(r[1] + r[3] / 2)], color: b });
      delay += 0.28;
    });
    s.querySelectorAll('.opts li.ok').forEach((el) => list.push({ kind: 'glow', rect: box(el), radius: 24, color: b, delay }));
    s.querySelectorAll('[data-glow]').forEach((el) => list.push({ kind: 'glow', rect: box(el), radius: 22, color: a, delay: 0.6 }));
    s.querySelectorAll('.track').forEach((el) => list.push({ kind: 'progress', rect: box(el), from: 0.41, color: a, color2: b }));
    s.querySelectorAll('.host:first-child .eq').forEach((el) => list.push({ kind: 'eq', rect: box(el), bars: 5, color: a }));
    s.querySelectorAll('.ring').forEach((el) => list.push({ kind: 'ring', rect: box(el), amount: 0.72, thickness: 16, color: a, delay: 0.5 }));
    s.querySelectorAll('.mic i').forEach((el) => list.push({ kind: 'pulse', rect: box(el), color: a }));
    out[s.id] = { accent: a, regions: list };
  }
  return out;
});

// The photographs: the live parts hidden, the score ring's track left bare
await page.addStyleTag({ content: `
  .live i, .wave i, .cur, .track i, .host:first-child .eq i, .mic i { visibility: hidden !important; }
  .ring { background: rgba(255,255,255,.09) !important; }` });
for (const id of Object.keys(regions)) {
  const file = path.join(out, `${id}.png`);
  const png = await page.locator(`#${id}`).screenshot({ path: file });
  // The colour behind each typed line, from the photograph itself
  const samples = regions[id].regions.filter((r) => r.kind === 'type').map((r) => r.sample);
  if (samples.length) {
    const colors = await page.evaluate(async ({ data, samples }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return samples.map(([x, y]) => { const d = g.getImageData(x, y, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; });
    }, { data: png.toString('base64'), samples });
    let i = 0;
    regions[id].regions.forEach((r) => { if (r.kind === 'type') r.mask = colors[i++]; });
  }
  console.log('shot', id, regions[id].regions.length, 'live parts');
}
fs.writeFileSync(path.join(out, 'screens.json'), JSON.stringify(regions));
await browser.close();
