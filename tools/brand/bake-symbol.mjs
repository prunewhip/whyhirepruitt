// Bakes the hero's interface symbol (tools/brand/symbol.html) to assets/img/interface-symbol.webp, a transparent
// still the home page shows until the live 3D is ready, or instead of it without WebGL.
//
//   node tools/brand/bake-symbol.mjs [seconds]
//
// A single WebGL render, which stays reliable on machines without a GPU.

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const t = process.argv[2] || '4.2';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
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

// Headless Chromium without a GPU: Mesa llvmpipe through ANGLE renders WebGL reliably on Linux
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  env: { ...process.env, GALLIUM_DRIVER: 'llvmpipe', LIBGL_ALWAYS_SOFTWARE: '1', EGL_PLATFORM: 'surfaceless' }
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on('pageerror', (err) => console.error('pageerror:', err.message));
await page.goto(`http://127.0.0.1:${server.address().port}/tools/brand/symbol.html?t=${t}`, { waitUntil: 'networkidle' });
const status = await page.evaluate(() => window.ready);
if (status !== 'ok') throw new Error(status);
const png = path.join(os.tmpdir(), 'interface-symbol.png');
await page.screenshot({ path: png, omitBackground: true });
await browser.close();
server.close();

const out = path.join(ROOT, 'assets/img/interface-symbol.webp');
const done = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '86', out], { stdio: 'inherit' });
if (done.status !== 0) process.exit(done.status);
fs.copyFileSync(png, path.join(ROOT, 'tools/brand/interface-symbol.png'));
console.log(`symbol → ${path.relative(ROOT, out)}`);
