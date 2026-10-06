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
async function fish(page, id = 'goldfish', extras = []) {
  await page.evaluate(([id, extras]) => window.__FISHING_QA__.arrange(id, extras), [id, extras]);
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
  // Drawn at the screen's real resolution (device pixel ratio, capped at 2), not blown up by the browser.
  const backing = await page.locator('#sea canvas').evaluate((canvas) => ({ ratio: canvas.width / canvas.clientWidth, expected: Math.min(2, Math.max(1, devicePixelRatio)) }));
  expect(Math.abs(backing.ratio - backing.expected)).toBeLessThan(0.02);
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
  // Eight in a row include a fever, so the trip scores more than 8 x 5.
  const total = (await snapshot(page)).score; expect(total).toBeGreaterThan(40);
  await expect(page.locator('.reward-score')).toContainText(String(total));
  await page.screenshot({ path: info.outputPath('reward.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
  expect(saved.trips).toBe(1); expect(saved.collection.goldfish).toBe(8); expect(saved.best.relaxed).toBe(total);
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
    // view.zoom is canvas pixels per world unit; the canvas has view.dpr pixels per CSS pixel.
    const seabedCss = stage.y + (view.seabedLine - view.y) * view.zoom / view.dpr;
    const controlsTop = Math.min(cast.y, reel.y);
    expect(Math.abs(seabedCss - controlsTop), `${width}x${height} seabed meets the controls`).toBeLessThan(12);
    expect(view.lanes[6] - view.lanes[0]).toBeGreaterThan(300);
    expect(Math.abs(view.left - view.x)).toBeLessThan(1.5); expect(Math.abs(view.right - view.left - stage.width * view.dpr / view.zoom)).toBeLessThan(1.5);
    await page.screenshot({ path: info.outputPath(`fit-${width}x${height}.png`) });
  }
  expect(errors).toEqual([]);
});

test('creatures enter from beyond the screen edge at uneven times and leave on the far side', async ({ page }, info) => {
  // Software-rendered WebKit on Windows advances game time far slower than the wall clock.
  test.setTimeout(180_000); const errors = await boot(page);
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
  // Like the cabinet: no creature swims against the others in its lane, and neighbouring lanes alternate.
  const laneDirs = Array.from({ length: 7 }, (_, lane) => [...new Set(final.fishes.filter((f) => f.lane === lane && !f.caught).map((f) => f.dir))]);
  laneDirs.forEach((dirs, lane) => expect(dirs.length, `lane ${lane} directions ${dirs}`).toBeLessThanOrEqual(1));
  const known = laneDirs.map((dirs) => dirs[0]);
  for (let lane = 1; lane < 7; lane++) if (known[lane] && known[lane - 1]) expect(known[lane]).toBe(-known[lane - 1]);
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
  // Even turns bring the pirate battle; this test wants the treasure rain.
  await page.evaluate(() => { window.__FISHING_QA__.setMaps(3); window.__FISHING_QA__.setBonusTurn(1); });
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
  test.setTimeout(480_000); const errors = await boot(page);
  const sample = info.project.name === 'desktop' ? SPECIES : SPECIES.filter((s) => ['seal', 'anglerfish', 'giant-squid', 'crab', 'lobster-king', 'boot'].includes(s.id));
  let total = 0;
  for (const s of sample) {
    await fish(page, s.id);
    // Deep animals are mysteries unless a spyglass caught earlier in this run is still active.
    const spyglass = (await snapshot(page)).powers.spyglass > 0;
    await expect(page.locator('#caught-name')).toHaveText(s.kind === 'animal' && s.lane >= 4 && !spyglass ? 'สัตว์ลึกลับ' : s.name);
    await reel(page);
    // Bottle and fever multipliers: each catch scores its points x1, x2 or x4.
    const { landing } = await snapshot(page);
    expect(landing.id).toBe(s.id);
    expect([1, 2, 4]).toContain(landing.multiplier);
    if (s.prizes) expect(s.prizes.map(([p]) => p * landing.multiplier)).toContain(landing.points); else expect(landing.points).toBe(s.points * landing.multiplier);
    total += landing.points;
    await expect(page.locator('#score')).toHaveText(String(total));
    await landed(page);
    if ((await snapshot(page)).phase === 'complete') { await page.locator('#again').click(); total = 0; }
  }
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  await page.locator('#collection').click();
  // One heading per book section plus the boat-looks panel.
  await expect(page.locator('.zone-title')).toHaveCount(ZONES.length + 1);
  await expect(page.locator('.collection-item')).toHaveCount(SPECIES.length);
  // Every book picture is a real, decoded sprite (no broken images, no emoji placeholders).
  await page.waitForFunction(() => [...document.querySelectorAll('img.species-art')].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 15_000 });
  // Creatures still waiting for their sheet (the bosses until prompt K) show the DEV emoji placeholder.
  expect(await page.locator('img.species-art').count()).toBe(SPECIES.filter((s) => s.art).length);
  expect(await page.locator('.species-art.emoji').count()).toBe(SPECIES.filter((s) => !s.art).length);
  await expect(page.locator('#dialog-title')).toContainText(`${sample.length} / ${SPECIES.length}`);
  for (const s of sample) await expect(page.locator('.collection-item').filter({ has: page.locator(`h4:text-is("${s.name}")`) })).toContainText('1 ครั้ง');
  await page.screenshot({ path: info.outputPath('book.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('three catches in a row start FEVER: banner, golden line, doubled points and coins flying to the score', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  for (let i = 0; i < 2; i++) { await fish(page, 'goldfish'); await reel(page); await landed(page); }
  expect((await snapshot(page)).combo).toBe(2);
  await expect(page.locator('#toast')).toContainText('คอมโบ 2');
  await fish(page, 'goldfish'); await reel(page);
  // Coins fly to the score box and are cleaned up afterwards.
  await page.waitForFunction(() => document.querySelectorAll('.coin-fly').length > 0, null, { timeout: 3000 });
  await landed(page);
  await expect(page.locator('#fever')).toBeVisible();
  const fever = await snapshot(page); expect(fever.fever).toBeGreaterThan(10); expect(fever.score).toBe(15);
  await page.screenshot({ path: info.outputPath('fever.png') });
  await fish(page, 'clownfish'); await reel(page); await landed(page);
  const doubled = await snapshot(page);
  expect(doubled.landing).toMatchObject({ id: 'clownfish', points: 16, multiplier: 2, extras: [] });
  expect(doubled.score).toBe(31);
  await page.waitForFunction(() => document.querySelectorAll('.coin-fly').length === 0, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('power-ups: the net scoops a neighbour, turbo halves taps, the spyglass shows deep colours, the golden hook grows', async ({ page }, info) => {
  test.setTimeout(150_000); const errors = await boot(page);
  await fish(page, 'net'); await reel(page); await landed(page);
  expect((await snapshot(page)).powers.net).toBe(1);
  await expect(page.locator('#powers .power')).toHaveCount(1);
  await fish(page, 'goldfish', ['clownfish']);
  const netted = await snapshot(page);
  expect(netted.extras).toEqual(['clownfish']); expect(netted.netted).toBe(1);
  await page.screenshot({ path: info.outputPath('net.png') });
  await reel(page); await landed(page);
  const afterNet = await snapshot(page);
  expect(afterNet.landing.extras).toEqual(['clownfish']); expect(afterNet.catches.slice(-2)).toEqual(['goldfish', 'clownfish']);
  expect(afterNet.powers.net).toBe(0);
  await fish(page, 'turbo-reel'); await reel(page); await landed(page);
  await fish(page, 'shark'); expect((await snapshot(page)).requiredTaps).toBe(8); await reel(page); await landed(page);
  await fish(page, 'spyglass'); await reel(page); await landed(page);
  await page.evaluate(() => window.__FISHING_QA__.arrange('grouper'));
  await page.waitForTimeout(150);
  const seen = (await snapshot(page)).fishes.find((f) => f.id === 'grouper');
  expect(seen.reveal).toBe(1); expect(seen.shadowAlpha).toBe(0);
  await page.locator('#cast').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'reeling');
  await expect(page.locator('#caught-name')).toHaveText('ปลาเก๋ายักษ์');
  await reel(page); await landed(page);
  await fish(page, 'gold-hook'); await reel(page); await landed(page);
  const gold = await snapshot(page); expect(gold.powers.goldHook).toBeGreaterThan(10); expect(gold.powers.bigHook).toBe(true);
  // The turbo reel was used up by the catches after it; spyglass and golden hook are still running.
  await expect(page.locator('#powers .power')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('powers.png') });
  expect(errors).toEqual([]);
});

test('four map pieces on an even turn start the 30 second pirate battle: aim, fire without limit, hit, back to fishing', async ({ page }, info) => {
  test.setTimeout(150_000); const errors = await boot(page); await page.locator('#arcade').click();
  await page.evaluate(() => { window.__FISHING_QA__.setMaps(3); window.__FISHING_QA__.setBonusTurn(0); });
  await fish(page, 'map'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'pirate', null, { timeout: 5000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).bonusTurn)).toBe(1);
  await expect(page.locator('#bonus')).toContainText('ยิงเรือโจรสลัด');
  await expect(page.locator('#bonus-time')).toContainText('วิ');
  await expect(page.locator('#cast')).toContainText('ยิงปืนใหญ่');
  await expect(page.locator('#reel')).toBeDisabled();
  const clock = (await snapshot(page)).remaining;
  await page.evaluate(() => window.__FISHING_QA__.freezeShips());
  const ship = (await snapshot(page)).battle.ships.find((s) => !s.leaving);
  await page.evaluate((x) => window.__FISHING_QA__.aimAt(x), ship.x);
  await page.waitForTimeout(150);
  await page.screenshot({ path: info.outputPath('pirate-aim.png') });
  const before = (await snapshot(page)).score;
  await page.locator('#cast').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().pirate.flying === 0, null, { timeout: 3000 });
  const hit = await snapshot(page);
  expect(hit.pirate.hits).toBe(1); expect(hit.score).toBeGreaterThan(before);
  await page.screenshot({ path: info.outputPath('pirate-hit.png') });
  // No ball limit: far more than ten shots are accepted (aimed at open water).
  await page.evaluate((x) => window.__FISHING_QA__.aimAt(x), ship.x > 240 ? 40 : 440);
  for (let i = 0; i < 14; i++) { await page.locator('#cast').click(); await page.waitForTimeout(500); }
  expect((await snapshot(page)).pirate.shots).toBeGreaterThan(12);
  // Run the clock down: the battle ends by itself and fishing resumes with the arcade clock untouched.
  await page.evaluate(() => window.__FISHING_QA__.setPirateTime(1.2));
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim', null, { timeout: 8000 });
  const done = await snapshot(page);
  expect(done.pirate).toBe(null); expect(done.remaining).toBeGreaterThan(clock - 4);
  await expect(page.locator('#toast')).toContainText('สมบัติจากเรือโจรสลัด');
  await expect(page.locator('#cast')).toContainText('หย่อนเบ็ด');
  expect(errors).toEqual([]);
});

test('the trip-end dialog with the lucky wheel fits one phone screen: no scrolling, the play-again button in view', async ({ page }, info) => {
  const errors = await boot(page);
  for (const [width, height] of [[390, 664], [375, 560], [430, 740], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    await page.evaluate(() => window.__FISHING_QA__.finishTrip(['goldfish', 'clownfish', 'turtle', 'shark', 'chest', 'net', 'goldfish', 'sardine']));
    await expect(page.locator('#again')).toBeVisible();
    const fit = await page.evaluate(() => {
      const modal = document.querySelector('#modal'); const again = document.querySelector('#again').getBoundingClientRect();
      const wheel = document.querySelector('#lucky-wheel').getBoundingClientRect();
      return { overflow: modal.scrollHeight - modal.clientHeight, againBottom: again.bottom, againTop: again.top, wheel: wheel.width, inner: innerHeight, innerWidth, right: Math.max(again.right, wheel.right) };
    });
    expect(fit.overflow, `${width}x${height} dialog needs no scrolling`).toBeLessThanOrEqual(1);
    expect(fit.againTop).toBeGreaterThanOrEqual(0); expect(fit.againBottom, `${width}x${height}: play again in view`).toBeLessThanOrEqual(fit.inner);
    expect(fit.right).toBeLessThanOrEqual(fit.innerWidth);
    expect(fit.wheel).toBeGreaterThanOrEqual(100);
    await page.screenshot({ path: info.outputPath(`reward-${width}x${height}.png`) });
    // After a spin the prize line appears and the button must still be in view.
    await page.locator('#spin').click();
    await expect(page.locator('#prize')).not.toHaveText('', { timeout: 6000 });
    const after = await page.evaluate(() => ({ again: document.querySelector('#again').getBoundingClientRect().bottom, inner: innerHeight, overflow: document.querySelector('#modal').scrollHeight - document.querySelector('#modal').clientHeight }));
    expect(after.again).toBeLessThanOrEqual(after.inner); expect(after.overflow).toBeLessThanOrEqual(1);
    await page.locator('#again').click();
  }
  expect(errors).toEqual([]);
});

test('trip end: the lucky wheel spins once and pays out; wheel powers start the next trip', async ({ page }, info) => {
  test.setTimeout(150_000); const errors = await boot(page);
  for (let i = 0; i < 8; i++) { await fish(page); await reel(page); await landed(page); }
  await expect(page.locator('#dialog-title')).toHaveText('นักสำรวจอ่าวสมบัติ!');
  await expect(page.locator('#lucky-wheel .seg')).toHaveCount(8);
  const before = (await snapshot(page)).score;
  await page.locator('#spin').click();
  await expect(page.locator('#prize')).not.toHaveText('', { timeout: 6000 });
  await expect(page.locator('#spin')).toBeDisabled();
  await page.screenshot({ path: info.outputPath('wheel.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
  const after = (await snapshot(page)).score;
  const prize = await page.locator('#prize').textContent();
  if (/คะแนน/.test(prize)) { expect(after).toBeGreaterThan(before); expect(saved.best.relaxed).toBe(after); }
  else if (/รอบหน้า/.test(prize)) expect(Object.keys(saved.startPowers)).toHaveLength(1);
  else expect(saved.maps).toBe(1);
  // A power won on the wheel is ready when the next trip starts, then cleared from the save.
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('tap-tap-fishing-v1')); p.startPowers = { net: true }; localStorage.setItem('tap-tap-fishing-v1', JSON.stringify(p)); });
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  expect((await snapshot(page)).powers.net).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).startPowers)).toEqual({});
  expect((await snapshot(page)).timeOfDay).toBe('sunset');
  expect(errors).toEqual([]);
});

test('boat looks unlock from the book, apply in the scene, and the sea changes with the time of day', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await page.locator('#collection').click();
  await expect(page.locator('.look[data-look="bamboo"]')).toBeDisabled();
  await page.locator('#close-book').click();
  const shallow = SPECIES.filter((s) => s.kind === 'animal' && !s.boss && s.lane <= 1).map((s) => s.id);
  const middle = SPECIES.filter((s) => s.kind === 'animal' && !s.boss && (s.lane === 2 || s.lane === 3)).map((s) => s.id);
  await page.evaluate((ids) => window.__FISHING_QA__.setCollection(ids), [...shallow, ...middle]);
  await page.locator('#collection').click();
  await page.locator('.look[data-look="bamboo"]').click();
  await page.locator('.look[data-look="pennants"]').click();
  await expect(page.locator('.look[data-look="pennants"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.look[data-look="gold"]')).toBeDisabled();
  await page.screenshot({ path: info.outputPath('looks-panel.png') });
  await page.locator('#close-book').click();
  expect((await snapshot(page)).looks).toMatchObject({ rod: 'bamboo', boat: 'pennants' });
  await page.evaluate(() => window.__FISHING_QA__.setTimeOfDay('night'));
  await page.waitForTimeout(300);
  const night = await snapshot(page); expect(night.timeOfDay).toBe('night');
  await page.screenshot({ path: info.outputPath('night-pennants.png') });
  await page.evaluate(() => { window.__FISHING_QA__.setLooks({ boat: 'lanterns' }); window.__FISHING_QA__.setTimeOfDay('sunset'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: info.outputPath('sunset-lanterns.png') });
  await page.reload(); await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  expect((await snapshot(page)).looks).toMatchObject({ rod: 'bamboo', boat: 'lanterns' });
  expect(errors).toEqual([]);
});

test('two boss warnings at once both deliver their boss (none is lost while waiting in the wings)', async ({ page }) => {
  test.setTimeout(90_000); const errors = await boot(page);
  const present = (await snapshot(page)).fishes.map((f) => f.id);
  const [first, second] = SPECIES.filter((s) => s.boss && s.art).map((s) => s.id).filter((id) => !present.includes(id));
  await page.evaluate(([a, b]) => { window.__FISHING_QA__.spawnBoss(a); window.__FISHING_QA__.spawnBoss(b); }, [first, second]);
  await page.waitForFunction(([a, b]) => { const ids = window.__FISHING_QA__.snapshot().fishes.map((f) => f.id); return ids.includes(a) && ids.includes(b); },
    [first, second], { timeout: 40_000 });
  expect(errors).toEqual([]);
});

test('a boss swims in with a warning, takes many taps and lands in the giants section of the book', async ({ page }, info) => {
  test.setTimeout(120_000); const errors = await boot(page);
  // A natural boss may already be swimming (they come early); test with one that is not on screen.
  const present = (await snapshot(page)).fishes.map((f) => f.id);
  const bossId = SPECIES.filter((s) => s.boss && s.art).map((s) => s.id).find((id) => !present.includes(id));
  const boss0 = SPECIES.find((s) => s.id === bossId);
  await page.evaluate((id) => window.__FISHING_QA__.spawnBoss(id), bossId);
  await expect(page.locator('#toast')).toContainText('ปลายักษ์');
  // Warning layers: flashing frame, a shadow gliding beneath, the real boss still waiting in the wings.
  expect(await page.evaluate(() => window.__FISHING_QA__.edgeVisible())).toBe(true);
  await page.waitForTimeout(500);
  const warning = await snapshot(page);
  expect(warning.bossPending).toBe(true); expect(warning.bossShadow).toBe(true);
  expect(warning.fishes.some((f) => f.id === bossId)).toBe(false);
  await page.screenshot({ path: info.outputPath('boss-shadow.png') });
  await page.waitForFunction((id) => window.__FISHING_QA__.snapshot().fishes.some((f) => f.id === id), bossId, { timeout: 25_000 });
  await page.waitForTimeout(1200);
  const boss = (await snapshot(page)).fishes.find((f) => f.id === bossId);
  expect(boss).toBeTruthy(); expect(boss.lane).toBe(3);
  const normal = (await snapshot(page)).fishes.find((f) => f.lane === 3 && f.id !== bossId);
  // A giant is long and slender: compare its length and its area with the ordinary lane animals.
  if (normal) expect(boss.width).toBeGreaterThan(normal.width * 1.8);
  await page.screenshot({ path: info.outputPath('boss-warning.png') });
  await fish(page, bossId);
  expect((await snapshot(page)).requiredTaps).toBe(boss0.taps);
  await reel(page); await landed(page);
  expect((await snapshot(page)).catches).toContain(bossId);
  await page.locator('#collection').click();
  await expect(page.locator('.zone-title').filter({ hasText: 'ยักษ์ใหญ่' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the reel can also be cranked: turning around the wheel pulls the line, holding still does not', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await fish(page, 'shark');
  const box = await page.locator('#reel').boundingBox();
  const cx = box.x + box.width / 2; const cy = box.y + box.height / 2; const r = box.width * 0.36;
  const point = (deg) => [cx + Math.cos(deg * Math.PI / 180) * r, cy + Math.sin(deg * Math.PI / 180) * r];
  const angleBefore = await page.locator('#reel').evaluate((el) => parseFloat(el.style.getPropertyValue('--wheel-angle')) || 0);
  if (info.project.name === 'desktop') {
    await page.mouse.move(...point(0)); await page.mouse.down();
    await page.waitForTimeout(400);
    expect((await snapshot(page)).taps).toBe(1);
    for (let a = 12; a <= 720; a += 12) { await page.mouse.move(...point(a)); await page.waitForTimeout(16); }
    await page.mouse.up();
  } else {
    // Touch: dispatch a real one-finger circle on the stationary reel wrapper.
    const client = await page.context().newCDPSession(page);
    const send = (type, deg) => { const [x, y] = point(deg); return client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }); };
    await send('touchStart', 0);
    for (let a = 12; a <= 720; a += 12) { await send('touchMove', a); await page.waitForTimeout(16); }
    await send('touchEnd', 720);
  }
  const s = await snapshot(page);
  // One pull for the first touch, plus one per 180 degrees (half a turn): 1 + 4 for two turns.
  expect(s.taps).toBe(5);
  const angleAfter = await page.locator('#reel').evaluate((el) => parseFloat(el.style.getPropertyValue('--wheel-angle')) || 0);
  expect(angleAfter - angleBefore).toBeGreaterThan(600);
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
  await page.screenshot({ path: info.outputPath('crank.png') });
  // Taps still finish the catch.
  const rest = s.requiredTaps - s.taps;
  for (let i = 0; i < rest; i++) { await page.locator('#reel').click(); await page.waitForTimeout(95); }
  await landed(page);
  expect((await snapshot(page)).catches).toContain('shark');
  expect(errors).toEqual([]);
});

test('a big fish fights back: the wheel shakes and tugs are counted, a small fish is calm, the hit area never moves', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await fish(page, 'goldfish');
  const box = await page.locator('#reel').boundingBox();
  await page.waitForTimeout(2600);
  expect((await snapshot(page)).tugs).toBe(0);
  await reel(page); await landed(page);
  await fish(page, 'shark');
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().tugs >= 1, null, { timeout: 5000 });
  await expect(page.locator('#reel')).toHaveClass(/tug/);
  const during = await page.locator('#reel').boundingBox();
  expect(during).toEqual(box);
  await page.screenshot({ path: info.outputPath('tug.png') });
  await page.locator('#reel').click();
  expect((await snapshot(page)).taps).toBe(1);
  const { requiredTaps } = await snapshot(page);
  for (let i = 1; i < requiredTaps; i++) { await page.locator('#reel').click(); await page.waitForTimeout(95); }
  await landed(page);
  expect(errors).toEqual([]);
});

test('the treasure chest opens for a surprise amount and says so', async ({ page }) => {
  test.setTimeout(60_000); const errors = await boot(page);
  await fish(page, 'chest'); await reel(page); await landed(page);
  const s = await snapshot(page);
  expect([30, 40, 60, 100]).toContain(s.score);
  await expect(page.locator('#toast')).toContainText(`เปิดหีบได้ ${s.score}`);
  expect(errors).toEqual([]);
});

test('stop the wheel: the stage opens after the map pieces, a tap stops each of three spins, points are added and fishing resumes', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await page.evaluate(() => { window.__FISHING_QA__.setMaps(3); window.__FISHING_QA__.setBonusTurn(2); });
  await fish(page, 'map'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'wheel', null, { timeout: 15_000 });
  await expect(page.locator('#stopwheel')).toBeVisible();
  await expect(page.locator('#cast')).toContainText('หยุด');
  await expect(page.locator('#bonus-label')).toContainText('วงล้อ');
  const before = await snapshot(page);
  await page.waitForTimeout(350);
  const later = await snapshot(page);
  expect(later.stopWheel.angle).toBeGreaterThan(before.stopWheel.angle + 20);
  await page.screenshot({ path: info.outputPath('stop-wheel.png') });
  const start = later.score;
  for (let spin = 0; spin < 3; spin++) {
    await page.waitForFunction((n) => { const w = window.__FISHING_QA__.snapshot().stopWheel; return w && w.spin === n && w.state === 'spinning'; }, spin);
    await page.waitForTimeout(150 + spin * 90);
    await page.locator('#cast').click();
    await page.waitForFunction((n) => { const w = window.__FISHING_QA__.snapshot().stopWheel; return !w || w.results.length === n + 1; }, spin);
    if (spin === 0) await expect(page.locator('#sw-result')).not.toHaveText('');
  }
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'aim', null, { timeout: 15_000 });
  const done = await snapshot(page);
  expect(done.stopWheel).toBeNull(); expect(done.wheelResult.results).toHaveLength(3);
  expect(done.score).toBe(start + done.wheelResult.total);
  await expect(page.locator('#stopwheel')).toBeHidden();
  await expect(page.locator('#cast')).toContainText('หย่อนเบ็ด'); await expect(page.locator('#cast')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('stop the wheel: a tap anywhere on the sea also stops it, and an idle spin stops by itself', async ({ page }) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await page.evaluate(() => { window.__FISHING_QA__.setMaps(3); window.__FISHING_QA__.setBonusTurn(2); });
  await fish(page, 'map'); await reel(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().phase === 'wheel', null, { timeout: 15_000 });
  const box = await page.locator('#sea').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.3);
  await page.waitForFunction(() => { const w = window.__FISHING_QA__.snapshot().stopWheel; return w && w.results.length === 1; });
  // Spin two is left alone: it must stop by itself within its time limit.
  await page.waitForFunction(() => { const w = window.__FISHING_QA__.snapshot().stopWheel; return w && w.results.length === 2; }, null, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('the fog horn: a call sounds, a pale fog rolls in and a giant is on its way at once', async ({ page }) => {
  test.setTimeout(90_000); const errors = await boot(page);
  await fish(page, 'horn'); await reel(page);
  await landed(page);
  expect((await snapshot(page)).hornCalls).toBe(1);
  await page.evaluate(() => window.__FISHING_QA__.release());
  await page.waitForFunction(() => { const s = window.__FISHING_QA__.snapshot(); return s.bossPending || s.fishes.some((f) => f.id.startsWith('boss-')); }, null, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

// ---------- two players on one device ----------
async function duo(page, kind = 'coop') {
  const errors = await boot(page);
  await page.locator('#duo').click();
  await page.locator(`#pick-${kind}`).click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().twoPlayers);
  return errors;
}
async function fishBoth(page, a = 'goldfish', b = 'clownfish') {
  await page.evaluate(([x, y]) => { window.__FISHING_QA__.arrange(x, [], 0); window.__FISHING_QA__.arrange(y, [], 1, true); }, [a, b]);
  await page.locator('#cast').click(); await page.locator('#cast2').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase === 'reeling'), null, { timeout: 10_000 });
}
async function reelBoth(page) {
  const need = (await snapshot(page)).players.map((p) => p.requiredTaps);
  for (let i = 0; i < Math.max(...need); i++) {
    if (i < need[0]) await page.locator('#reel').click();
    if (i < need[1]) await page.locator('#reel2').click();
    await page.waitForTimeout(95);
  }
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase !== 'reeling'));
}

test('two players: pick the kind of game, two boats with two rod tips and two sets of controls; back to one player', async ({ page }, info) => {
  const errors = await boot(page);
  await expect(page.locator('#cast2')).toBeHidden(); await expect(page.locator('#score-box2')).toBeHidden();
  await page.locator('#duo').click();
  await expect(page.locator('#dialog-title')).toHaveText('เล่น 2 คน');
  await page.locator('#pick-versus').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().twoPlayers);
  const s = await snapshot(page);
  expect(s.match.kind).toBe('versus');
  expect(s.players.map((p) => p.originX)).toEqual([200, 280]);
  expect(s.players.map((p) => p.boat.flipped)).toEqual([false, true]);
  expect(s.players.every((p) => p.boat.visible)).toBe(true);
  for (const id of ['#cast', '#cast2', '#reel', '#reel2', '#score-box', '#score-box2']) await expect(page.locator(id)).toBeVisible();
  await expect(page.locator('#caught-count')).toHaveText('0 / 16');
  await expect(page.locator('#duo')).toHaveAttribute('aria-pressed', 'true');
  // Every control is fully on screen and none overlaps another.
  const boxes = await page.evaluate(() => ['#cast', '#cast2', '#reel', '#reel2'].map((id) => { const b = document.querySelector(id).getBoundingClientRect(); return { id, left: b.left, right: b.right, top: b.top, bottom: b.bottom }; }));
  const view = await page.evaluate(() => [innerWidth, innerHeight]);
  for (const b of boxes) { expect(b.left, b.id).toBeGreaterThanOrEqual(0); expect(b.top, b.id).toBeGreaterThanOrEqual(0); expect(b.right, b.id).toBeLessThanOrEqual(view[0]); expect(b.bottom, b.id).toBeLessThanOrEqual(view[1] + 1); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]; const b = boxes[j];
    expect(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1, `${a.id} and ${b.id} do not overlap`).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('two-players.png') });
  // The sea fills down to the controls (the lanes follow the dock).
  expect(s.view.lanes.at(-1)).toBeLessThan((await page.evaluate(() => window.__FISHING_QA__.scene().view.seabedLine)) + 1);
  await page.locator('#solo').click();
  await page.waitForFunction(() => !window.__FISHING_QA__.snapshot().twoPlayers);
  const back = await snapshot(page);
  expect(back.players).toHaveLength(1); expect(back.players[0].originX).toBe(240);
  await expect(page.locator('#cast2')).toBeHidden(); await expect(page.locator('#reel2')).toBeHidden();
  expect(errors).toEqual([]);
});

test('two players fish at the same time: each catch is scored for its own player and counts towards one shared goal', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await duo(page);
  await fishBoth(page, 'goldfish', 'clownfish');
  const hooked = await snapshot(page);
  expect(hooked.players[0].hook.x).not.toBe(hooked.players[1].hook.x);
  await expect(page.locator('#tap-count')).toContainText('/'); await expect(page.locator('#tap-count2')).toContainText('/');
  await reelBoth(page);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase === 'aim'));
  const done = await snapshot(page);
  expect(done.players.map((p) => p.score)).toEqual([5, 8]);
  expect(done.players[0].catches).toEqual(['goldfish']); expect(done.players[1].catches).toEqual(['clownfish']);
  expect(done.match.catches).toBe(2);
  await expect(page.locator('#score')).toHaveText('5'); await expect(page.locator('#score2')).toHaveText('8');
  await expect(page.locator('#caught-count')).toHaveText('2 / 16');
  await page.screenshot({ path: info.outputPath('two-players-caught.png') });
  // Both catches went into the one shared book.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')).collection);
  expect(stored.goldfish).toBe(1); expect(stored.clownfish).toBe(1);
  expect(errors).toEqual([]);
});

test('a tap on the left half of the sea casts player 1, the right half player 2', async ({ page }) => {
  const errors = await duo(page);
  const box = await page.locator('#sea').boundingBox();
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.45);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players[0].phase !== 'aim');
  expect((await snapshot(page)).players[1].phase, 'the left half did not cast player 2').toBe('aim');
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.45);
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players[1].phase !== 'aim');
  // Both hooks are away now, each from its own boat.
  const s = await snapshot(page);
  expect(s.players.map((p) => p.phase)).not.toContain('aim');
  expect(errors).toEqual([]);
});

test('two fingers at once: each player can cast and reel with their own hand at the same moment', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop' || info.project.name === 'webkit-tablet', 'needs real multi-touch');
  test.setTimeout(90_000); const errors = await duo(page);
  const client = await page.context().newCDPSession(page);
  const centre = async (id) => { const b = await page.locator(id).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  await page.evaluate(() => { window.__FISHING_QA__.arrange('goldfish', [], 0); window.__FISHING_QA__.arrange('clownfish', [], 1, true); });
  const castPoints = [await centre('#cast'), await centre('#cast2')];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: castPoints });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase !== 'aim'), null, { timeout: 5000 });
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase === 'reeling'), null, { timeout: 10_000 });
  const reelPoints = [await centre('#reel'), await centre('#reel2')];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: reelPoints.map((p, i) => ({ ...p, id: i })) });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s = await snapshot(page);
  expect(s.players.map((p) => p.taps), 'both reels got their tap from the same two-finger press').toEqual([1, 1]);
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
  expect(errors).toEqual([]);
});

test('bonus stages take turns: the player who completes the map plays it, the other player waits and then carries on', async ({ page }, info) => {
  test.setTimeout(90_000); const errors = await duo(page);
  await page.evaluate(() => { window.__FISHING_QA__.setMaps(3, 0); window.__FISHING_QA__.setBonusTurn(1, 0); window.__FISHING_QA__.arrange('map', [], 0); });
  await page.locator('#cast').click();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players[0].phase === 'reeling');
  const taps = (await snapshot(page)).players[0].requiredTaps;
  for (let i = 0; i < taps; i++) { await page.locator('#reel').click(); await page.waitForTimeout(95); }
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players[0].bonus > 0);
  const during = await snapshot(page);
  expect(during.players[1].waiting).toBe(true); expect(during.players[0].waiting).toBe(false);
  await expect(page.locator('#cast2')).toBeDisabled(); await expect(page.locator('#cast2')).toContainText('รอเพื่อน');
  await expect(page.locator('#phase-text2')).toContainText('รอเพื่อน');
  await page.screenshot({ path: info.outputPath('two-players-waiting.png') });
  // The waiting player's hook stands still.
  const angle = during.players[1].angle; await page.waitForTimeout(500);
  expect((await snapshot(page)).players[1].angle).toBe(angle);
  // Rain over: both play again.
  await page.evaluate(() => window.__FISHING_QA__.setPower('bonus', 0.4, 0));
  await page.waitForFunction(() => !window.__FISHING_QA__.snapshot().players[1].waiting, null, { timeout: 8000 });
  await expect(page.locator('#cast2')).toBeEnabled();
  await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players[1].angle !== undefined);
  expect(errors).toEqual([]);
});

test('two players: the trip ends for both, the dialog shows a team score (co-op) or a winner (race) and the wheel does not change the records', async ({ page }, info) => {
  test.setTimeout(90_000);
  for (const kind of ['coop', 'versus']) {
    const errors = await duo(page, kind);
    await fishBoth(page, 'goldfish', 'clownfish'); await reelBoth(page);
    await page.waitForFunction(() => window.__FISHING_QA__.snapshot().players.every((p) => p.phase === 'aim'));
    await page.evaluate(() => { window.__FISHING_QA__.finishTrip(['goldfish'], 0); window.__FISHING_QA__.finishTrip(['turtle'], 1); });
    await expect(page.locator('#again')).toBeVisible();
    if (kind === 'coop') {
      await expect(page.locator('#dialog-title')).toHaveText('ทีมนักสำรวจอ่าวสมบัติ!');
      await expect(page.locator('#team-score')).toContainText(String(5 + 123 + 8 + 123));
    } else {
      // Player 1 has 5 + 123, player 2 has 8 + 123: player 2 wins.
      await expect(page.locator('#dialog-title')).toHaveText('ผู้เล่น 2 ชนะ!');
      await expect(page.locator('#duo-score0')).toHaveText(String(5 + 123)); await expect(page.locator('#duo-score1')).toHaveText(String(8 + 123));
      await expect(page.locator('.duo.winner')).toHaveCount(1);
    }
    await page.screenshot({ path: info.outputPath(`two-players-reward-${kind}.png`) });
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
    expect(before.best.relaxed, 'two-player scores are not a personal best').toBe(0);
    expect(before.trips).toBe(1);
    await page.locator('#spin').click();
    await expect(page.locator('#prize')).not.toHaveText('', { timeout: 6000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('tap-tap-fishing-v1')));
    expect(after.best.relaxed).toBe(0);
    await page.locator('#again').click();
    expect((await snapshot(page)).twoPlayers).toBe(true);
    expect(errors).toEqual([]);
    await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForFunction(() => window.__FISHING_QA__?.snapshot().ready);
  }
});

test('the two-player trip-end dialog fits one screen without scrolling at phone sizes too', async ({ page }) => {
  const errors = await duo(page, 'versus');
  for (const [width, height] of [[390, 664], [375, 560], [844, 390], [1024, 768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
    await page.evaluate(() => { window.__FISHING_QA__.finishTrip(['goldfish', 'clownfish', 'turtle', 'shark'], 0); window.__FISHING_QA__.finishTrip(['chest', 'net', 'sardine'], 1); });
    await expect(page.locator('#again')).toBeVisible();
    const fit = await page.evaluate(() => { const modal = document.querySelector('#modal'); const again = document.querySelector('#again').getBoundingClientRect(); return { overflow: modal.scrollHeight - modal.clientHeight, bottom: again.bottom, inner: innerHeight }; });
    expect(fit.overflow, `${width}x${height} no scrolling`).toBeLessThanOrEqual(1);
    expect(fit.bottom, `${width}x${height} play again in view`).toBeLessThanOrEqual(fit.inner);
    await page.locator('#again').click();
  }
  expect(errors).toEqual([]);
});
