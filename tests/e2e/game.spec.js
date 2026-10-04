import { test, expect } from '@playwright/test';
import { SPECIES, ZONES } from '../../src/species.js';

async function boot(page, query = '') {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`/?qa=1${query}`);
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
async function landed(page) { await page.waitForFunction(() => ['aim', 'complete'].includes(window.__FISHING_QA__.snapshot().phase)); }
const key = (f) => f.uid;

test('full-bleed scene loads, moves, fits, and uses the actual raster assets', async ({ page }, info) => {
  const errors = await boot(page);
  const before = await snapshot(page); await page.waitForTimeout(450); const after = await snapshot(page);
  const moved = after.fishes.filter((f) => { const old = before.fishes.find((b) => key(b) === key(f)); return old && old.x !== f.x; });
  expect(moved.length).toBeGreaterThan(5);
  expect(after.angle).not.toBe(before.angle);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const pixels = await page.locator('canvas').evaluate((canvas) => {
    const ctx = canvas.getContext('2d'); const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let filled = 0; const colors = new Set();
    for (let i = 0; i < image.length; i += 4 * 64) { if (image[i + 3] > 200) filled++; colors.add(`${image[i] >> 4},${image[i + 1] >> 4},${image[i + 2] >> 4}`); }
    const left = ctx.getImageData(1, canvas.height / 2, 1, 1).data[3];
    const right = ctx.getImageData(canvas.width - 2, canvas.height / 2, 1, 1).data[3];
    const top = ctx.getImageData(canvas.width / 2, 2, 1, 1).data[3];
    return { filled, colors: colors.size, left, right, top };
  });
  expect(pixels.filled).toBeGreaterThan(400); expect(pixels.colors).toBeGreaterThan(80);
  expect(pixels.left).toBe(255); expect(pixels.right).toBe(255); expect(pixels.top).toBe(255);
  for (const id of ['cast', 'reel', 'collection', 'music', 'sound', 'pause']) {
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
  expect(before.length).toBeGreaterThan(100);
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
  await expect(page.locator('.collection-item').filter({ hasText: 'ปลาทอง' })).toContainText('1 ครั้ง');
  await page.screenshot({ path: info.outputPath('collection.png') });
  await page.locator('#close-book').click();
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).collection.goldfish)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('little-exam-adventure-v1'))).toBe('original');
  expect(errors).toEqual([]);
});

test('a real cast into the live sea hooks whatever swims under the line', async ({ page }) => {
  test.setTimeout(90_000); const errors = await boot(page, '&seed=3');
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
    await page.locator('#cast').click();
    await page.waitForFunction(() => ['reeling', 'aim'].includes(window.__FISHING_QA__.snapshot().phase));
    if ((await snapshot(page)).phase === 'reeling') break;
  }
  const hooked = await snapshot(page); expect(hooked.phase).toBe('reeling');
  const caught = hooked.fishes.filter((f) => f.caught);
  expect(caught).toHaveLength(1);
  await reel(page); await landed(page);
  const after = await snapshot(page);
  expect(after.catches).toEqual([caught[0].id]);
  expect(after.fishes.some((f) => f.caught)).toBe(false);
  expect(errors).toEqual([]);
});

test('eight catches reward only once and start a fresh trip without losing the book', async ({ page }, info) => {
  test.setTimeout(100_000); const errors = await boot(page);
  for (let i = 0; i < 8; i++) { await fish(page); await reel(page); await landed(page); }
  await expect(page.locator('#dialog-title')).toHaveText('นักสำรวจอ่าวสมบัติ!');
  await expect(page.locator('.reward-score')).toContainText('40');
  await page.screenshot({ path: info.outputPath('reward.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
  expect(saved.trips).toBe(1); expect(saved.collection.goldfish).toBe(8); expect(saved.best.relaxed).toBe(40);
  await page.locator('#again').click();
  const fresh = await snapshot(page);
  expect(fresh.phase).toBe('aim'); expect(fresh.fishes.length).toBeGreaterThan(10); await expect(page.locator('#score')).toHaveText('0');
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
    const fish = state.fishes.find((f) => f.id === 'shark' && f.caught);
    const canvas = document.querySelector('#sea canvas');
    const width = Math.round(fish.width * state.view.zoom * 0.6);
    const height = Math.round(fish.height * state.view.zoom * 0.5);
    const x = Math.round((fish.x - fish.width * 0.3 - state.view.x) * state.view.zoom);
    const y = Math.round((fish.y - fish.height * 0.25 - state.view.y) * state.view.zoom);
    const data = canvas.getContext('2d').getImageData(x, y, width, height).data;
    let black = 0;
    for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) < 40) black++;
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
  expect((await snapshot(page)).score).toBe(34);
  expect(errors).toEqual([]);
});

test('sound produces a Web Audio signal; music and mute toggles persist without affecting play', async ({ page }) => {
  const errors = await boot(page);
  const button = await page.locator('#cast').boundingBox();
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().audio.level > 0, null, { timeout: 1500 });
  await page.mouse.up();
  expect((await snapshot(page)).audio.music).toBe(true);
  await page.locator('#music').click();
  expect((await snapshot(page)).audio.music).toBe(false);
  await expect(page.locator('#music')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).music)).toBe(false);
  await page.locator('#sound').click();
  expect((await snapshot(page)).audio.enabled).toBe(false);
  await page.waitForTimeout(150); expect((await snapshot(page)).audio.level).toBe(0);
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  const reloaded = (await snapshot(page)).audio; expect(reloaded.enabled).toBe(false); expect(reloaded.music).toBe(false);
  expect(errors).toEqual([]);
});

test('restart from pause and mode confirmation refill the sea and keep catches', async ({ page }) => {
  const errors = await boot(page);
  await page.locator('#pause').click(); await page.waitForTimeout(150); await page.locator('#restart').click();
  expect((await snapshot(page)).fishes.length).toBeGreaterThan(10);
  await fish(page, 'goldfish'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
  await page.locator('#arcade').click(); await expect(page.locator('#dialog-title')).toHaveText('ออกเรือรอบใหม่?');
  await page.locator('#keep').click(); await expect(page.locator('#relaxed')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arcade').click(); await page.locator('#new-mode').click();
  await expect(page.locator('#arcade')).toHaveAttribute('aria-pressed', 'true');
  const arcadeSea = await snapshot(page); expect(arcadeSea.fishes.length).toBeGreaterThan(10); expect(arcadeSea.score).toBe(0);
  await fish(page, 'clownfish'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim');
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

test('compact portrait and landscape: controls fit and the lanes fill the sea down to them', async ({ page }, info) => {
  const errors = await boot(page);
  for (const [width, height] of [[375, 667], [390, 844], [768, 1024], [1024, 768], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const cast = await page.locator('#cast').boundingBox(); const reel = await page.locator('#reel').boundingBox();
    expect(cast.x + cast.width).toBeLessThanOrEqual(reel.x);
    expect(Math.min(cast.y, reel.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(cast.y + cast.height, reel.y + reel.height)).toBeLessThanOrEqual(height);
    const { view } = await snapshot(page);
    const stage = await page.locator('.stage').boundingBox();
    const seabedCss = stage.y + (view.seabedLine - view.y) * view.zoom;
    const controlsTop = Math.min(cast.y, reel.y);
    expect(Math.abs(seabedCss - controlsTop), `${width}x${height} seabed meets the controls`).toBeLessThan(12);
    expect(view.lanes[6] - view.lanes[0]).toBeGreaterThan(300);
    expect(Math.abs(view.left - view.x)).toBeLessThan(1.5); expect(Math.abs(view.right - view.left - stage.width / view.zoom)).toBeLessThan(1.5);
    await page.screenshot({ path: info.outputPath(`fit-${width}x${height}.png`) });
  }
  expect(errors).toEqual([]);
});

test('creatures enter from beyond the screen edge at uneven times and leave on the far side', async ({ page }, info) => {
  test.setTimeout(60_000); const errors = await boot(page);
  const seen = new Map(); const gone = new Set(); let view;
  // Watch 14 seconds of game time (slow software-rendered engines advance it more slowly than the wall clock).
  const start = (await snapshot(page)).time;
  for (let i = 0; i < 400; i++) {
    const s = await snapshot(page); view = s.view;
    if (s.time - start > 14) break;
    const keys = new Set();
    for (const f of s.fishes) {
      const k = key(f); keys.add(k);
      if (!seen.has(k)) seen.set(k, { first: f, last: f, sample: i }); else seen.get(k).last = f;
    }
    for (const k of seen.keys()) if (!keys.has(k)) gone.add(k);
    await page.waitForTimeout(250);
  }
  const fresh = [...seen.values()].filter((entry) => entry.sample > 0);
  expect(fresh.length).toBeGreaterThan(3);
  for (const { first: f } of fresh) {
    // New arrivals always start outside the visible sea (one sample of travel allowed).
    if (f.dir > 0) expect(f.x - f.width / 2, f.id).toBeLessThan(view.left + 20);
    else expect(f.x + f.width / 2, f.id).toBeGreaterThan(view.right - 20);
  }
  for (const k of gone) {
    const f = seen.get(k).last;
    expect(f.dir > 0 ? f.x + f.width / 2 > view.right - 30 : f.x - f.width / 2 < view.left + 30, `${k} left at the far edge`).toBe(true);
  }
  const final = await snapshot(page);
  const gaps = [];
  for (let lane = 0; lane < 7; lane++) {
    const row = final.fishes.filter((f) => f.lane === lane && !f.caught).sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) gaps.push(row[i].x - row[i - 1].x);
  }
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const spread = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  expect(spread / mean, 'spacing is uneven').toBeGreaterThan(0.3);
  await page.screenshot({ path: info.outputPath('live-sea.png') });
  expect(errors).toEqual([]);
});

test('special items: the bottle doubles the next catch and four map pieces start the treasure rain', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await fish(page, 'bottle'); await reel(page); await landed(page);
  await expect(page.locator('#double')).toBeVisible();
  await expect(page.locator('#toast')).toContainText('x2');
  await fish(page, 'goldfish'); await reel(page); await landed(page);
  expect((await snapshot(page)).score).toBe(5 + 10);
  await expect(page.locator('#double')).toBeHidden();
  await page.evaluate(() => window.__FISHING_QA__.setMaps(3));
  await fish(page, 'map'); await reel(page); await landed(page);
  const rain = await snapshot(page);
  expect(rain.maps).toBe(0); expect(rain.bonus).toBeGreaterThan(15);
  await expect(page.locator('#bonus')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).maps)).toBe(0);
  const start = rain.fishes.length ? Math.max(...rain.fishes.map((f) => f.born)) : 0;
  await page.evaluate(() => window.__FISHING_QA__.release());
  await page.waitForTimeout(3500);
  const during = await snapshot(page);
  const arrivals = during.fishes.filter((f) => f.born > start);
  expect(arrivals.length).toBeGreaterThan(3);
  const pool = SPECIES.filter((s) => s.bonus).map((s) => s.id);
  for (const f of arrivals) expect(pool).toContain(f.id);
  await page.screenshot({ path: info.outputPath('treasure-rain.png') });
  // Catches during the rain need half the taps and do not count towards the trip goal.
  await fish(page, 'chest');
  expect((await snapshot(page)).requiredTaps).toBe(8);
  await reel(page); await landed(page);
  const after = await snapshot(page); expect(after.tripCatches).toBe(3);
  expect(errors).toEqual([]);
});

test('the pocket watch adds ten seconds in arcade mode', async ({ page }) => {
  const errors = await boot(page); await page.locator('#arcade').click();
  await fish(page, 'watch');
  const before = await snapshot(page);
  await reel(page); await landed(page);
  const after = await snapshot(page);
  // The clock kept running while reeling; the watch added exactly ten seconds on top.
  expect(Math.abs(after.remaining - (before.remaining + 10 - (after.time - before.time)))).toBeLessThan(0.3);
  await expect(page.locator('#toast')).toContainText('+10');
  expect(errors).toEqual([]);
});

test('every creature collides with the real hook, lands and persists in the zoned book', async ({ page }, info) => {
  test.setTimeout(240_000); const errors = await boot(page);
  const sample = info.project.name === 'desktop' ? SPECIES : SPECIES.filter((s) => ['seal', 'anglerfish', 'giant-squid', 'crab', 'lobster-king', 'boot'].includes(s.id));
  let total = 0; let doubled = false;
  for (const s of sample) {
    await fish(page, s.id);
    await expect(page.locator('#caught-name')).toHaveText(s.kind === 'animal' && s.lane >= 4 ? 'สัตว์ลึกลับ' : s.name);
    await reel(page);
    // A message bottle doubles the following catch.
    total += s.points * (doubled && s.effect !== 'double' ? 2 : 1);
    doubled = s.effect === 'double' || (doubled && s.effect === 'double');
    await expect(page.locator('#score')).toHaveText(String(total));
    await landed(page);
    if ((await snapshot(page)).phase === 'complete') { await page.locator('#again').click(); total = 0; doubled = false; }
  }
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  await page.locator('#collection').click();
  await expect(page.locator('.zone-title')).toHaveCount(ZONES.length);
  await expect(page.locator('.collection-item')).toHaveCount(SPECIES.length);
  await expect(page.locator('#dialog-title')).toContainText(`${sample.length} / ${SPECIES.length}`);
  for (const s of sample) await expect(page.locator('.collection-item').filter({ has: page.locator(`h4:text-is("${s.name}")`) })).toContainText('1 ครั้ง');
  await page.screenshot({ path: info.outputPath('book.png'), fullPage: true });
  expect(errors).toEqual([]);
});
