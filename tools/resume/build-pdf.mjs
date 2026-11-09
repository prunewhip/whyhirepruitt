// Prints Pruitt_Colon_Resume.html to Pruitt_Colon_Resume.pdf (US Letter) and fails unless it is exactly one page.
//   node tools/resume/build-pdf.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.join(ROOT, 'Pruitt_Colon_Resume.html');
const pdf = path.join(ROOT, 'Pruitt_Colon_Resume.pdf');

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
// The page is a fixed 11 in tall; anything taller would be cut off, not moved to a second page
const overflow = await page.evaluate(() => { const el = document.querySelector('.page'); return el.scrollHeight - el.clientHeight; });
if (overflow > 0) {
  console.error(`the resume is ${overflow}px too tall for one page`);
  await browser.close();
  process.exit(1);
}
await page.pdf({ path: pdf, format: 'Letter', printBackground: true, preferCSSPageSize: true });
await browser.close();

// Each page is one "/Type /Page" object (the page tree is "/Type /Pages")
const pages = (fs.readFileSync(pdf, 'latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
if (pages !== 1) {
  console.error(`expected 1 page, got ${pages}`);
  process.exit(1);
}
console.log(`resume → ${path.relative(ROOT, pdf)} (1 page)`);
