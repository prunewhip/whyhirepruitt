// Renders favicons and the Open Graph image from icon.html and og.html.
//   node tools/brand/render-brand.mjs        (needs playwright + ffmpeg)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, '../../assets');
const ROOT = path.resolve(HERE, '../..');
const tmp = (name) => path.join(HERE, `.${name}`);

// og.html imports the site's 3D modules, which need http:// rather than file://
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
const base = `http://127.0.0.1:${server.address().port}/tools/brand`;

// Headless Chromium without a GPU: Mesa llvmpipe through ANGLE renders WebGL reliably on Linux
const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  env: { ...process.env, GALLIUM_DRIVER: 'llvmpipe', LIBGL_ALWAYS_SOFTWARE: '1', EGL_PLATFORM: 'surfaceless' }
});
const page = await browser.newPage();

async function shot(file, width, height, out, opts = {}) {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
  if (opts.full) await page.evaluate(() => document.body.classList.add('full'));
  await page.evaluate(async () => {
    if (window.ready) await window.ready;
    await Promise.all([...document.fonts].map((f) => f.load()));
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  await page.screenshot({ path: out, omitBackground: true });
}

await shot('icon.html', 512, 512, tmp('icon-512.png'));
await shot('icon.html', 512, 512, tmp('icon-512-full.png'), { full: true });
await shot('og.html', 1200, 630, tmp('og.png'));
await browser.close();
server.close();

const scale = (src, size, out) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale=${size}:${size}:flags=lanczos`, out]);
scale(tmp('icon-512.png'), 32, path.join(ASSETS, 'favicon-32.png'));
scale(tmp('icon-512.png'), 192, path.join(ASSETS, 'favicon-192.png'));
scale(tmp('icon-512-full.png'), 180, path.join(ASSETS, 'apple-touch-icon.png'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(ASSETS, 'favicon-32.png'), path.join(ROOT, 'favicon.ico')]);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp('og.png'), '-q:v', '3', path.join(ASSETS, 'og-image.jpg')]);
for (const f of ['icon-512.png', 'icon-512-full.png', 'og.png']) execFileSync('rm', ['-f', tmp(f)]);
console.log('brand assets written');
