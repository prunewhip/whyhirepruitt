// Bakes the site's Three.js scenes into transparent stills for the product tour video.
//
//   node tools/promo-video/bake-3d.mjs
//
// Writes shots/hd/hero-field.png and shots/hd/hero-devices.png (from hero-3d.html) and
// shots/hd/glasses-3d.png (from tools/3d/glasses-still.html). Re-run only after changing js/3d/.

import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'shots/hd');

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
const base = `http://127.0.0.1:${server.address().port}`;

// Headless Chromium without a GPU: Mesa llvmpipe through ANGLE renders WebGL reliably on Linux
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  env: { ...process.env, GALLIUM_DRIVER: 'llvmpipe', LIBGL_ALWAYS_SOFTWARE: '1', EGL_PLATFORM: 'surfaceless' }
});

const JOBS = [
  ['tools/promo-video/hero-3d.html?layer=field', 1920, 1080, 'hero-field.png'],
  ['tools/promo-video/hero-3d.html?layer=devices', 1920, 1080, 'hero-devices.png'],
  ['tools/3d/glasses-still.html', 1400, 800, 'glasses-3d.png']
];

for (const [url, width, height, name] of JOBS) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (err) => console.error('pageerror:', err.message));
  await page.goto(`${base}/${url}`, { waitUntil: 'networkidle' });
  const status = await page.evaluate(() => window.ready);
  if (status !== 'ok') throw new Error(`${url}: ${status}`);
  await page.screenshot({ path: path.join(OUT, name), omitBackground: true });
  await page.close();
  console.log(`${name} written`);
}

await browser.close();
server.close();
