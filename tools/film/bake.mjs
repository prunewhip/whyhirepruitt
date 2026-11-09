// Bakes the concept film's 3D stills from bake.html into tools/film/shots/.
//
//   node tools/film/bake.mjs                 # all shots
//   node tools/film/bake.mjs glasses-1       # one shot
//
// Each still is a single WebGL render, which stays reliable on machines without a GPU.

import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'shots');
const ALL = ['field-a', 'field-b', 'phone-now', 'phone-conversation', 'phone-ask', 'glasses', 'hud-1', 'hud-2'];
const shots = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/tools/film/bake.html`;

// Headless Chromium without a GPU: Mesa llvmpipe through ANGLE renders WebGL reliably on Linux
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  env: { ...process.env, GALLIUM_DRIVER: 'llvmpipe', LIBGL_ALWAYS_SOFTWARE: '1', EGL_PLATFORM: 'surfaceless' }
});
fs.mkdirSync(OUT, { recursive: true });

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (err) => console.error('pageerror:', err.message));
  await page.goto(`${base}?shot=${shot}`, { waitUntil: 'networkidle' });
  const status = await page.evaluate(() => window.ready);
  if (status !== 'ok') throw new Error(`${shot}: ${status}`);
  await page.screenshot({ path: path.join(OUT, `${shot}.png`), omitBackground: true });
  await page.close();
  console.log(`${shot}.png written`);
}

await browser.close();
server.close();
