import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { SPECIES } from '../src/species.js';

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) throw new Error('Usage: npm run test:pages -- <site-url>');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const response = await page.goto(url);
  expect(response.status()).toBe(200);
  await expect(page.locator('#cast')).toBeEnabled();
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
  await expect(page.locator('.collection-item')).toHaveCount(SPECIES.length);
  await expect(page.locator('.species-art image')).toHaveCount(SPECIES.length);
  await page.screenshot({ path: 'test-results/pages-book.png' });
  await page.locator('#close-book').click();
  await page.locator('#cast').click();
  await expect(page.locator('#phase-text')).toHaveText(/เบ็ดกำลังลง|ติดเบ็ดแล้ว/);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ url: page.url(), status: 'passed', collectionEntries: SPECIES.length, canvas: 'colored and moving', errors }));
} finally {
  await browser.close();
}
