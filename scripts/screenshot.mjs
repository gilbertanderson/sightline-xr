// Captures the Projects-card screenshot from a running preview server.
// Usage: node scripts/screenshot.mjs [url] [out]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/sightline-xr/?test=1';
const out = process.argv[3] ?? 'dist/screenshot.jpg';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' })).newPage();
await page.goto(url);
await page.waitForFunction(() => 'window' in globalThis && (window).__sightline, null, { timeout: 60000 });
await page.evaluate(() => (window).__sightline.best(2));
// software rendering in CI is slow, so give the scene several frames to settle
await page.waitForTimeout(9000);
await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
await browser.close();
console.log(`saved ${out}`);
