// Renders a video composition (default: compose.html, the product tour) to assets/video/<name>.mp4 and a poster.
//
//   npm i playwright@1.49 && npx playwright install chromium   (ffmpeg must be on PATH)
//   node tools/promo-video/bake-3d.mjs                 # only after changing the 3D scene: re-bakes shots/hd/hero-*.png
//   node tools/promo-video/render.mjs                 # full render → assets/video/
//   node tools/promo-video/render.mjs --preview 5,30  # PNG stills of chosen seconds
//   --frames-dir <dir>   where JPEG frames go (default: OS temp dir; ~350 MB)
//   --encode-only        skip rendering and re-encode the frames already in --frames-dir
//   --start-frame <n>    keep frames before n in --frames-dir and render from n on
//   --end-frame <n>      stop before frame n without encoding (render long videos in resumable chunks)
//   --audio <wav>        add a soundtrack (AAC) to the MP4, e.g. the film's score from tools/film/score.mjs
//   --page <path> --name <base>   render another composition, e.g.
//                        --page tools/film/film.html --name vox-film   (the commercial, 16:9)
//                        --page "tools/film/film.html?format=portrait" --name vox-film-portrait   (its 4:5 phone cut)
//
// Each frame is drawn by window.renderAt(t) and screenshotted, so output is
// deterministic and independent of machine speed.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_DIR = path.join(ROOT, 'assets/video');
const FPS = 30;
const W = 1920;
const H = 1080;

const args = process.argv.slice(2);
const arg = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const previewArg = arg('--preview', null);
const PAGE = arg('--page', 'tools/promo-video/compose.html');
const NAME = arg('--name', 'vox-tour');
const AUDIO = arg('--audio', null);
const framesDir = args.includes('--frames-dir')
  ? path.resolve(args[args.indexOf('--frames-dir') + 1])
  : path.join(os.tmpdir(), `${NAME}-frames`);

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const server = await serve(ROOT);
const url = `http://127.0.0.1:${server.address().port}/${PAGE}`;
// compose.html is plain HTML (the 3D layers are pre-baked), so no GPU is needed
// Keep the footprint small: no GPU process, one renderer, a modest JS heap
const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--disable-gpu', '--renderer-process-limit=1',
    '--disable-extensions', '--disable-background-networking', '--js-flags=--max-old-space-size=256']
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (err) => console.error('pageerror:', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
// A composition can declare its own frame size (the film's phone cut is 1080×1350)
const size = await page.evaluate(() => window.SIZE || null);
if (size) await page.setViewportSize({ width: size[0], height: size[1] });
await page.evaluate(async () => {
  await Promise.all([...document.fonts].map((f) => f.load()));
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
});
const duration = await page.evaluate(() => window.DURATION);

const encodeOnly = args.includes('--encode-only');
// Resume an interrupted render: keep frames before this index, redraw from it on
const startFrame = args.includes('--start-frame') ? Number(args[args.indexOf('--start-frame') + 1]) : 0;
const endFrame = args.includes('--end-frame') ? Number(args[args.indexOf('--end-frame') + 1]) : Infinity;

if (previewArg) {
  const dir = path.join(ROOT, path.dirname(PAGE), 'preview');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of previewArg.split(',')) {
    if (t === 'poster') await page.evaluate(() => window.renderPoster());
    else await page.evaluate((s) => window.renderAt(s), Number(t));
    await page.screenshot({ path: path.join(dir, `t-${t}.png`) });
  }
  console.log(`previews → ${dir}`);
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!encodeOnly) {
    if (!startFrame) fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });

    const total = Math.round(duration * FPS);
    const last = Math.min(endFrame, total);
    const started = Date.now();
    for (let i = startFrame; i < last; i++) {
      await page.evaluate((s) => window.renderAt(s), i / FPS);
      await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
      if (i % 150 === 0) console.log(`frame ${i}/${total} · ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    if (last < total) {
      console.log(`frames ${startFrame}–${last - 1} of ${total} · ${((Date.now() - started) / 1000).toFixed(0)}s`);
      await browser.close();
      server.close();
      process.exit(0);
    }

    await page.evaluate(() => window.renderPoster());
    await page.screenshot({ path: path.join(framesDir, 'poster.png') });
  }
  await browser.close();
  server.close();

  const input = ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'), ...(AUDIO ? ['-i', path.resolve(AUDIO)] : [])];
  const audio = AUDIO ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest'] : ['-an'];
  // JPEG frames are full-range BT.601; convert to standard limited-range BT.709 and tag it
  const color = ['-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  // H.264 MP4 plays in every current browser; a second (VP9) encode isn't worth the CPU time
  console.log('encoding mp4 (H.264)…');
  await run('ffmpeg', [...input, ...color, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-threads', '2', '-profile:v', 'high', '-level', '4.0', '-movflags', '+faststart', ...audio, path.join(OUT_DIR, `${NAME}.mp4`)]);
  console.log('encoding poster…');
  await run('ffmpeg', ['-y', '-i', path.join(framesDir, 'poster.png'), '-c:v', 'libwebp', '-quality', '82', path.join(OUT_DIR, `${NAME}-poster.webp`)]);
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`done → ${OUT_DIR}`);
  process.exit(0);
}

await browser.close();
server.close();
