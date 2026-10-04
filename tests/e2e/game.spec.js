import { test, expect } from '@playwright/test';
import { SPECIES, SCHOOLS, ROW_POPULATIONS, LANES, SWIM_LOOP } from '../../src/species.js';

async function boot(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/?qa=1');
  await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  await expect(page.locator('#cast')).toBeEnabled();
  return errors;
}
const snapshot = (page) => page.evaluate(() => window.__FISHING_QA__.snapshot());
async function fish(page, id = 'goldfish') {
  await page.evaluate((id) => window.__FISHING_QA__.arrange(id), id);
  await page.locator('#cast').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'reeling');
}
async function reel(page, touch = false) {
  const n = (await snapshot(page)).requiredTaps;
  for (let i = 0; i < n; i++) {
    if (touch) { const rect = await page.locator('#reel').boundingBox(); await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2); }
    else await page.locator('#reel').click();
    await page.waitForTimeout(95);
  }
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase !== 'reeling');
}

test('full-bleed scene loads, moves, fits, and uses the actual raster assets', async ({ page }, info) => {
  const errors = await boot(page);
  const before = await snapshot(page); await page.waitForTimeout(450); const after = await snapshot(page);
  expect(after.fishes[0].x).not.toBe(before.fishes[0].x);
  expect(after.angle).not.toBe(before.angle);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const pixels = await page.locator('canvas').evaluate((canvas) => {
    const ctx = canvas.getContext('2d'); const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let filled = 0; const colors = new Set();
    for (let i = 0; i < image.length; i += 4 * 64) { if (image[i + 3] > 200) filled++; colors.add(`${image[i] >> 4},${image[i + 1] >> 4},${image[i + 2] >> 4}`); }
    const left = ctx.getImageData(1, canvas.height / 2, 1, 1).data[3];
    const right = ctx.getImageData(canvas.width - 2, canvas.height / 2, 1, 1).data[3];
    return { filled, colors: colors.size, left, right };
  });
  expect(pixels.filled).toBeGreaterThan(400); expect(pixels.colors).toBeGreaterThan(80);
  expect(pixels.left).toBe(255); expect(pixels.right).toBe(255);
  for (const id of ['cast', 'reel', 'collection', 'sound', 'pause']) {
    const box = await page.locator(`#${id}`).boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(info.project.use.viewport?.width ?? await page.evaluate(() => innerWidth));
  }
  await page.screenshot({ path: info.outputPath('sea.png') });
  expect(errors).toEqual([]);
});

test('real hook collision, no auto reel, repeated taps land once and save collection', async ({ page }, info) => {
  const errors = await boot(page);
  await page.evaluate(() => localStorage.setItem('little-exam-adventure-v1', 'original'));
  await fish(page);
  const before = await snapshot(page); await page.waitForTimeout(300);
  expect(before.length).toBeGreaterThan(60);
  expect((await snapshot(page)).length).toBe(before.length);
  const reelBox = await page.locator('#reel').boundingBox();
  await page.mouse.move(reelBox.x + 50, reelBox.y + 50); await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up();
  expect((await snapshot(page)).taps).toBe(1);
  const target = (await snapshot(page)).targetLength;
  await page.waitForTimeout(250); expect((await snapshot(page)).length).toBeLessThan(before.length);
  expect((await snapshot(page)).targetLength).toBe(target);
  await page.screenshot({ path: info.outputPath('reeling.png') });
  const rest = before.requiredTaps - 1;
  for (let i = 0; i < rest; i++) { await page.locator('#reel').click(); await page.waitForTimeout(100); }
  await expect(page.locator('#score')).toHaveText('5');
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  await page.locator('#collection').click();
  await expect(page.locator('.collection-item').first()).toContainText('1 ครั้ง');
  await page.screenshot({ path: info.outputPath('collection.png') });
  await page.locator('#close-book').click();
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).collection.goldfish)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('little-exam-adventure-v1'))).toBe('original');
  expect(errors).toEqual([]);
});

test('eight catches reward only once and start a fresh trip without losing the book', async ({ page }, info) => {
  test.setTimeout(100_000); const errors = await boot(page);
  for (let i = 0; i < 8; i++) {
    await fish(page); await reel(page);
    await page.waitForFunction(() => ['aim', 'complete'].includes(window.__FISHING_QA__.snapshot().phase));
  }
  await expect(page.locator('#dialog-title')).toHaveText('นักสำรวจอ่าวสมบัติ!');
  await expect(page.locator('.reward-score')).toContainText('40');
  await page.screenshot({ path: info.outputPath('reward.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
  expect(saved.trips).toBe(1); expect(saved.collection.goldfish).toBe(8); expect(saved.best.relaxed).toBe(40);
  await page.locator('#again').click();
  expect((await snapshot(page)).phase).toBe('aim'); await expect(page.locator('#score')).toHaveText('0');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).collection.goldfish)).toBe(8);
  expect(errors).toEqual([]);
});

test('pause freezes hook and arcade clock; expiry honors a catch already in progress', async ({ page }) => {
  const errors = await boot(page); await page.locator('#arcade').click(); await fish(page, 'turtle');
  await page.locator('#pause').click(); const before = await snapshot(page); await page.waitForTimeout(350);
  const after = await snapshot(page); expect(after.hook).toEqual(before.hook); expect(after.remaining).toBe(before.remaining);
  await page.locator('#resume').click();
  await page.evaluate(() => window.__FISHING_QA__.expire()); await page.waitForTimeout(120);
  expect((await snapshot(page)).phase).toBe('reeling'); await reel(page);
  await expect(page.locator('#dialog-title')).toHaveText('นักสำรวจอ่าวสมบัติ!');
  expect((await snapshot(page)).score).toBe(22); expect(errors).toEqual([]);
});

test('touch taps do not zoom, select text, or double-count; sounds unlock from a gesture', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Touch devices only');
  const errors = await boot(page); await fish(page, 'clownfish');
  const hasAudio = await page.evaluate(() => Boolean(window.AudioContext || window.webkitAudioContext));
  // The Windows WebKit port has no Web Audio API; still exercise every touch assertion.
  expect((await snapshot(page)).audio.state).toBe(hasAudio ? 'running' : 'locked');
  const initial = await snapshot(page); const rect = await page.locator('#reel').boundingBox();
  for (let i = 0; i < 3; i++) { await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.waitForTimeout(110); }
  expect((await snapshot(page)).taps).toBe(initial.taps + 3);
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
  expect(await page.evaluate(() => getSelection().toString())).toBe('');
  expect(await page.locator('#reel').evaluate((button) => getComputedStyle(button).touchAction)).toBe('none');
  expect(errors).toEqual([]);
});

test('rapid touches on the stationary reel cancel native gestures through the final landing tap', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Touch devices only');
  const errors = await boot(page); await fish(page, 'clownfish');
  await page.evaluate(() => {
    window.reelTouchEvents = [];
    for (const type of ['touchstart', 'touchend']) document.addEventListener(type, (event) => {
      if (event.target.closest('.reel-wrap')) window.reelTouchEvents.push({ type, prevented: event.defaultPrevented });
    }, { passive: true });
  });
  const box = await page.locator('#reel').boundingBox();
  const n = (await snapshot(page)).requiredTaps;
  for (let i = 0; i < n; i++) {
    await page.touchscreen.tap(box.x + box.width * (i % 2 ? 0.8 : 0.5), box.y + box.height / 2);
    await page.waitForTimeout(95);
    expect((await page.locator('#reel').boundingBox()).width).toBe(box.width);
  }
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  expect(await page.locator('#reel').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  for (let i = 0; i < 3; i++) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const events = await page.evaluate(() => window.reelTouchEvents);
  expect(events.length).toBeGreaterThanOrEqual((n + 3) * 2);
  expect(events.every((event) => event.prevented)).toBe(true);
  expect((await snapshot(page)).catches).toHaveLength(1);
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
  expect(await page.evaluate(() => getSelection().toString())).toBe('');
  expect(await page.locator('#reel .wheel').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
  expect(errors).toEqual([]);
});

test('deep catch starts black and unnamed, then progressively reveals actual artwork while reeling', async ({ page }, info) => {
  const errors = await boot(page); await fish(page, 'shark');
  const blackFraction = () => page.evaluate(() => {
    const state = window.__FISHING_QA__.snapshot();
    const fish = state.fishes.find((f) => f.id === 'shark' && !f.active && f.alpha === 1);
    const canvas = document.querySelector('#sea canvas');
    const width = Math.round(fish.width * state.view.zoom);
    const height = Math.round(fish.height * state.view.zoom);
    const x = Math.round((fish.x - fish.width / 2 - state.view.x) * state.view.zoom);
    const y = Math.round((fish.y - fish.height / 2 - state.view.y) * state.view.zoom);
    const data = canvas.getContext('2d').getImageData(x, y, width, height).data;
    let black = 0;
    for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) < 12) black++;
    return black / (width * height);
  });
  await page.waitForTimeout(120);
  await expect(page.locator('#caught-name')).toHaveText('สัตว์ลึกลับ');
  expect((await snapshot(page)).fishes.find((f) => f.id === 'shark').reveal).toBe(0);
  const initialBlack = await blackFraction(); expect(initialBlack).toBeGreaterThan(0.15);
  await page.screenshot({ path: info.outputPath('mystery-catch.png') });
  const n = (await snapshot(page)).requiredTaps;
  const half = Math.floor(n * 0.55);
  for (let i = 0; i < half; i++) { await page.locator('#reel').click(); await page.waitForTimeout(95); }
  await page.waitForTimeout(180);
  const partial = (await snapshot(page)).fishes.find((f) => f.id === 'shark');
  expect(partial.reveal).toBeGreaterThan(0.2); expect(partial.reveal).toBeLessThan(1);
  expect(partial.shadowAlpha).toBeGreaterThan(0); expect(partial.shadowAlpha).toBeLessThan(1);
  expect(await blackFraction()).toBeLessThan(initialBlack / 2);
  await page.screenshot({ path: info.outputPath('revealing-catch.png') });
  for (let i = half; i < n - 1; i++) { await page.locator('#reel').click(); await page.waitForTimeout(95); }
  await page.waitForTimeout(180);
  await expect(page.locator('#caught-name')).toHaveText('ฉลาม');
  await page.screenshot({ path: info.outputPath('revealed-catch.png') });
  await page.locator('#reel').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  const respawned = (await snapshot(page)).fishes.find((f) => f.id === 'shark');
  expect(respawned.reveal).toBe(0); expect(respawned.shadowAlpha).toBe(1); expect(respawned.active).toBe(true);
  expect((await snapshot(page)).score).toBe(34);
  expect(errors).toEqual([]);
});

test('sound produces a Web Audio signal and mute stops it without affecting play', async ({ page }) => {
  const errors = await boot(page);
  const button = await page.locator('#cast').boundingBox();
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().audio.level > 0, null, { timeout: 1500 });
  await page.mouse.up();
  await page.locator('#sound').click();
  expect((await snapshot(page)).audio.enabled).toBe(false);
  await page.waitForTimeout(150); expect((await snapshot(page)).audio.level).toBe(0);
  expect(errors).toEqual([]);
});

test('restart from pause and mode confirmation resume animations and keep catches', async ({ page }) => {
  const errors = await boot(page);
  await page.locator('#pause').click(); await page.waitForTimeout(150); await page.locator('#restart').click();
  await fish(page, 'goldfish'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  expect((await snapshot(page)).fishes.find((f) => f.id === 'goldfish').active).toBe(true);
  await page.locator('#arcade').click(); await expect(page.locator('#dialog-title')).toHaveText('ออกเรือรอบใหม่?');
  await page.locator('#keep').click(); await expect(page.locator('#relaxed')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arcade').click(); await page.locator('#new-mode').click();
  await expect(page.locator('#arcade')).toHaveAttribute('aria-pressed', 'true');
  await fish(page, 'clownfish'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  expect((await snapshot(page)).fishes.find((f) => f.id === 'clownfish').active).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).collection.goldfish)).toBe(1);
  expect(errors).toEqual([]);
});

test('keyboard controls activate once and Escape closes a pause dialog', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => window.__FISHING_QA__.arrange('goldfish'));
  await page.locator('#cast').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'reeling');
  await page.locator('#reel').focus(); await page.keyboard.press('Space');
  expect((await snapshot(page)).taps).toBe(1);
  await page.locator('#pause').click(); await expect(page.locator('#modal')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#modal')).not.toBeVisible();
  expect((await snapshot(page)).paused).toBe(false); expect(errors).toEqual([]);
});

test('compact portrait and landscape controls fit without collisions', async ({ page }, info) => {
  const errors = await boot(page);
  for (const [width, height] of [[375, 667], [390, 844], [768, 1024], [1024, 768], [844, 390]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(180);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const cast = await page.locator('#cast').boundingBox(); const reel = await page.locator('#reel').boundingBox();
    expect(cast.x + cast.width).toBeLessThanOrEqual(reel.x);
    expect(Math.min(cast.y, reel.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(cast.y + cast.height, reel.y + reel.height)).toBeLessThanOrEqual(height);
    await page.screenshot({ path: info.outputPath(`fit-${width}x${height}.png`) });
  }
  expect(errors).toEqual([]);
});

test('six aligned rows stay opaque, spaced apart and moving after a screen wrap', async ({ page }, info) => {
  const errors = await boot(page); const before = await snapshot(page);
  expect(before.fishes).toHaveLength(SCHOOLS.length);
  const untilWrap = (f) => (f.velocity > 0 ? SWIM_LOOP.right - f.x : f.x - SWIM_LOOP.left) / Math.abs(f.velocity);
  const wrapping = [...before.fishes].sort((a, b) => untilWrap(a) - untilWrap(b))[0];
  await page.waitForFunction((before) => {
    const fish = window.__FISHING_QA__.snapshot().fishes.find((f) => f.lane === before.lane && f.slot === before.slot);
    return Math.abs(fish.x - before.x) > 350;
  }, wrapping, { timeout: 20_000 });
  const after = await snapshot(page);
  for (const f of after.fishes) {
    expect(f.y).toBe(LANES[f.lane]); expect(f.alpha).toBe(1); expect(f.velocity).not.toBe(0);
    const row = after.fishes.filter((other) => other.lane === f.lane);
    expect(row).toHaveLength(ROW_POPULATIONS[f.lane]);
    const neighbor = row.find((other) => other.slot === (f.slot + 1) % row.length);
    const gap = Math.abs(f.x - neighbor.x);
    const spacing = Math.min(gap, SWIM_LOOP.width - gap);
    // Body.reset at the wrap boundary can differ by one physics step (< 1 world pixel).
    expect(Math.abs(spacing - SWIM_LOOP.width / row.length)).toBeLessThanOrEqual(1);
    expect(spacing - (f.width + neighbor.width) / 2).toBeGreaterThan(20);
    expect(f.reveal).toBe(f.lane >= 4 ? 0 : 1);
    expect(f.shadowAlpha).toBe(f.lane >= 4 ? 1 : 0);
  }
  expect(Math.abs(after.fishes.find((f) => f.lane === wrapping.lane && f.slot === wrapping.slot).x - wrapping.x)).toBeGreaterThan(350);
  await page.screenshot({ path: info.outputPath('depth-rows.png') });
  await page.locator('#collection').click();
  await expect(page.locator('.collection-item')).toHaveCount(12);
  await expect(page.locator('#dialog-title')).toContainText('0 / 12');
  for (const s of SPECIES) {
    const art = page.locator(`.species-art[aria-label="${s.name}"]`);
    await expect(art.locator('image')).toHaveAttribute('clip-path', `url(#sprite-${s.id})`);
    await expect(art.locator('clipPath rect')).toHaveAttribute('width', String(s.rect[2]));
  }
  const crops = await page.evaluate(async (catalog) => {
    const results = [];
    for (const s of catalog) {
      const img = new Image(); img.src = `/assets/${s.atlas === 'deep' ? 'deep-creatures.png' : 'sea-creatures.png'}`;
      await img.decode();
      const canvas = document.createElement('canvas'); const [x, y, w, h] = s.rect;
      canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] >= 128) opaque++;
      results.push({ id: s.id, filled: opaque / (w * h), corner: ctx.getImageData(0, 0, 1, 1).data[3] });
    }
    return results;
  }, SPECIES);
  for (const crop of crops) { expect(crop.filled, crop.id).toBeGreaterThan(0.2); expect(crop.corner, crop.id).toBeLessThan(16); }
  await page.screenshot({ path: info.outputPath('expanded-book.png') });
  expect(errors).toEqual([]);
});

test('catching from the full school restores the vacated slot without overlaps or duplicate rewards', async ({ page }) => {
  test.setTimeout(60_000); const errors = await boot(page);
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.locator('#cast').click();
    await page.waitForFunction(() => ['reeling', 'aim'].includes(window.__FISHING_QA__.snapshot().phase));
    if ((await snapshot(page)).phase === 'reeling') break;
  }
  const hooked = await snapshot(page); expect(hooked.phase).toBe('reeling');
  const target = hooked.fishes.find((f) => !f.active);
  expect(hooked.fishes.filter((f) => f.active)).toHaveLength(31);
  await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  const landed = await snapshot(page);
  expect(landed.catches).toHaveLength(1);
  expect(landed.fishes.filter((f) => f.active)).toHaveLength(32);
  const row = landed.fishes.filter((f) => f.lane === target.lane);
  for (const f of row) {
    const next = row.find((other) => other.slot === (f.slot + 1) % row.length);
    const gap = Math.abs(next.x - f.x);
    const spacing = Math.min(gap, SWIM_LOOP.width - gap);
    expect(Math.abs(spacing - SWIM_LOOP.width / row.length)).toBeLessThanOrEqual(1);
    expect(spacing - (f.width + next.width) / 2).toBeGreaterThan(20);
  }
  expect(errors).toEqual([]);
});

test('new deep animals collide with the real hook, reel, respawn and persist in the book', async ({ page }, info) => {
  test.setTimeout(80_000); const errors = await boot(page);
  const added = SPECIES.filter((s) => s.atlas === 'deep');
  let total = 0;
  for (const s of added) {
    await fish(page, s.id); await expect(page.locator('#caught-name')).toHaveText(s.lane >= 4 ? 'สัตว์ลึกลับ' : s.name);
    await page.screenshot({ path: info.outputPath(`caught-${s.id}.png`) });
    await reel(page); total += s.points;
    await expect(page.locator('#score')).toHaveText(String(total));
    await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
    const landed = (await snapshot(page)).fishes.find((f) => f.id === s.id);
    expect(landed.active).toBe(true); expect(landed.alpha).toBe(1); expect(landed.velocity).not.toBe(0);
  }
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  await page.locator('#collection').click();
  for (const s of added) await expect(page.locator('.collection-item').filter({ hasText: s.name })).toContainText('1 ครั้ง');
  await page.screenshot({ path: info.outputPath('new-animals-collected.png') });
  expect(errors).toEqual([]);
});
