import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { speciesWithArt } from '../src/species.js';

// Production lists only creatures that already have artwork (no DEV emoji placeholders).
const BOOK = speciesWithArt(false);

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) throw new Error('Usage: npm run test:pages -- <site-url>');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const response = await page.goto(url);
  expect(response.status()).toBe(200);
  await expect(page.locator('#cast')).toBeEnabled();
  // Home-screen install assets resolve under the site base (manifest, its icons and the Apple touch icon).
  const manifestUrl = new URL(await page.locator('link[rel="manifest"]').getAttribute('href'), page.url());
  const manifest = await (await page.request.get(manifestUrl.href)).json();
  expect(manifest.display).toBe('standalone');
  for (const src of [...manifest.icons.map((icon) => icon.src), await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')]) {
    const response = await page.request.get(new URL(src, src.startsWith('/') ? page.url() : manifestUrl).href);
    expect(response.status(), src).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  expect(await page.evaluate(() => Boolean(window.__FISHING_QA__))).toBe(false);
  const pixels = () => page.locator('canvas').evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set(); let hash = 0;
    for (let i = 0; i < data.length; i += 256) {
      colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
      hash = (Math.imul(hash, 31) + data[i] + data[i + 1] + data[i + 2]) | 0;
    }
    return { hash, colors: colors.size };
  });
  const first = await pixels();
  expect(first.colors).toBeGreaterThan(80);
  await expect.poll(async () => (await pixels()).hash).not.toBe(first.hash);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/pages-sea.png' });
  await page.locator('#collection').click();
  await expect(page.locator('.collection-item')).toHaveCount(BOOK.length);
  await expect(page.locator('.species-art')).toHaveCount(BOOK.length);
  await expect(page.locator('.species-art.emoji')).toHaveCount(0);
  await page.waitForFunction(() => [...document.querySelectorAll('img.species-art')].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15_000 });
  await expect(page.locator('#music')).toBeVisible();
  await page.screenshot({ path: 'test-results/pages-book.png' });
  await page.locator('#close-book').click();
  await page.locator('#cast').click();
  await expect(page.locator('#phase-text')).toHaveText(/เบ็ดกำลังลง|ติดเบ็ดแล้ว/);
  expect(errors).toEqual([]);
  // Offline play: the service worker keeps the game on the device, so it still starts with the network cut.
  const worker = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return { scope: reg.scope, active: Boolean(reg.active) }; });
  expect(worker.active).toBe(true);
  await expect.poll(() => page.evaluate(async () => { const keys = await caches.keys(); return keys.length ? (await (await caches.open(keys[0])).keys()).length : 0; })).toBeGreaterThan(50);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#cast')).toBeEnabled();
  const offline = await pixels();
  expect(offline.colors).toBeGreaterThan(80);
  await expect.poll(async () => (await pixels()).hash).not.toBe(offline.hash);
  await page.locator('#collection').click();
  await page.waitForFunction(() => [...document.querySelectorAll('img.species-art')].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15_000 });
  await context.setOffline(false);
  console.log(JSON.stringify({ url: page.url(), status: 'passed', collectionEntries: BOOK.length, canvas: 'colored and moving', offline: 'starts and shows every picture with no network', errors }));
} finally {
  await browser.close();
}
