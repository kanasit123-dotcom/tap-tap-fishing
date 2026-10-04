import test from 'node:test';
import assert from 'node:assert/strict';
import { Spawner, MIN_GAP_PX, RARE_COOLDOWN } from '../src/spawner.js';
import { SPECIES, LANE_COUNT } from '../src/species.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Minimal sea: creatures move across a 600px crossing like the Phaser scene, and report lane room.
function simulate({ seconds = 900, mode = 'relaxed', seed = 1, bonusAt = Infinity, span = 600, species = SPECIES } = {}) {
  const spawner = new Spawner({ species, mode, rng: seeded(seed) });
  const swimmers = [];
  const spawns = [];
  let overlaps = 0;
  for (let t = 0; t < seconds; t += 0.1) {
    if (t >= bonusAt && !spawner.bonus) spawner.setBonus(true);
    const lanes = Array.from({ length: LANE_COUNT }, () => ({ count: 0, tailGap: Infinity, tailSpeed: 0, span }));
    for (const f of swimmers) {
      const lane = lanes[f.lane];
      lane.count++;
      const gap = f.distance - f.width;
      if (gap < lane.tailGap) { lane.tailGap = gap; lane.tailSpeed = f.speed; }
    }
    for (const order of spawner.tick(0.1, lanes)) {
      spawns.push({ time: t, order });
      for (const m of order.members) swimmers.push({ lane: order.lane, dir: order.dir, speed: order.speed, width: order.species.size, distance: -m.offset, id: order.species.id });
    }
    for (const f of swimmers) f.distance += f.speed * 0.1;
    // Creatures that are both fully on screen must not overlap inside one lane.
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const row = swimmers.filter((f) => f.lane === lane && f.distance > f.width && f.distance < span).sort((a, b) => a.distance - b.distance);
      for (let i = 1; i < row.length; i++) if (row[i].distance - row[i].width < row[i - 1].distance - 1 && row[i].speed !== row[i - 1].speed) overlaps++;
    }
    for (let i = swimmers.length - 1; i >= 0; i--) if (swimmers[i].distance - swimmers[i].width > span + 40) swimmers.splice(i, 1);
  }
  return { spawner, spawns, overlaps };
}

test('arrivals are irregular: random gaps per lane, never a fixed beat', () => {
  const { spawns } = simulate();
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const times = spawns.filter((s) => s.order.lane === lane).map((s) => s.time);
    assert.ok(times.length > 25, `lane ${lane} spawned ${times.length}`);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    assert.ok(sd / mean > 0.28, `lane ${lane} gaps vary (cv ${(sd / mean).toFixed(2)})`);
    assert.ok(Math.max(...gaps) > mean * 1.6 && Math.min(...gaps) < mean * 0.7, `lane ${lane} has lulls and bursts (${Math.min(...gaps).toFixed(1)} .. ${Math.max(...gaps).toFixed(1)}, mean ${mean.toFixed(1)})`);
  }
});

test('lanes only receive their own species, in varied school sizes and speeds', () => {
  const { spawns } = simulate();
  const sizes = new Set();
  for (const { order } of spawns) {
    assert.equal(order.species.lane, order.lane);
    const [min, max] = order.species.group;
    assert.ok(order.members.length >= min && order.members.length <= max + 3);
    assert.ok(order.speed > 0 && order.speed <= order.species.speed * 1.2 + 1e-9, order.species.id);
    if (order.species.id === 'sardine') sizes.add(order.members.length);
  }
  assert.ok(sizes.size >= 3, 'sardine schools come in different sizes');
  const seen = new Set(spawns.map((s) => s.order.species.id));
  for (const s of SPECIES.filter((x) => !x.arcadeOnly && !x.rare)) assert.ok(seen.has(s.id), `${s.id} appears`);
});

test('a faster group never swims through the slower group ahead of it', () => {
  const { overlaps } = simulate({ seconds: 600, seed: 3 });
  assert.equal(overlaps, 0);
  const spawner = new Spawner({ species: SPECIES, rng: seeded(9) });
  spawner.wait.fill(0);
  const blocked = spawner.tick(0.1, Array.from({ length: LANE_COUNT }, () => ({ count: 1, tailGap: MIN_GAP_PX - 1, tailSpeed: 10, span: 600 })));
  assert.deepEqual(blocked, [], 'no spawn until the entrance is clear');
});

test('special treasures respect cooldowns and the arcade-only pocket watch', () => {
  const relaxed = simulate({ seconds: 1500, seed: 5 }).spawns;
  assert.ok(!relaxed.some((s) => s.order.species.id === 'watch'));
  const arcade = simulate({ seconds: 1500, seed: 5, mode: 'arcade' }).spawns;
  assert.ok(arcade.some((s) => s.order.species.id === 'watch'));
  for (const spawns of [relaxed, arcade]) {
    for (const id of ['map', 'bottle', 'watch']) {
      const times = spawns.filter((s) => s.order.species.id === id).map((s) => s.time);
      const cooldown = SPECIES.find((s) => s.id === id).cooldown;
      times.slice(1).forEach((t, i) => assert.ok(t - times[i] >= cooldown - 0.11, `${id} cooldown`));
    }
    const rare = spawns.filter((s) => s.order.species.rare).map((s) => s.time);
    rare.slice(1).forEach((t, i) => assert.ok(t - rare[i] >= RARE_COOLDOWN - 0.11));
  }
  assert.ok(arcade.some((s) => s.order.species.rare), 'rare jackpots do appear eventually');
});

test('the sea alternates calm, normal and rush waves', () => {
  const spawner = new Spawner({ species: SPECIES, rng: seeded(11) });
  const kinds = new Set();
  for (let t = 0; t < 400; t += 0.5) { spawner.tick(0.5, []); kinds.add(spawner.wave.kind); }
  assert.deepEqual([...kinds].sort(), ['calm', 'normal', 'rush']);
});

test('the treasure rain fills every lane with gold fish and treasure, quickly', () => {
  const { spawns } = simulate({ seconds: 60, seed: 2, bonusAt: 30 });
  const rain = spawns.filter((s) => s.time >= 30);
  assert.ok(rain.length > 25, `${rain.length} treasures in 30 s`);
  assert.ok(rain.every((s) => s.order.species.bonus));
  assert.equal(new Set(rain.map((s) => s.order.lane)).size, LANE_COUNT);
});

test('a lane changes direction only while it is empty', () => {
  const spawner = new Spawner({ species: SPECIES, rng: seeded(4) });
  const busy = Array.from({ length: LANE_COUNT }, () => ({ count: 2, tailGap: 500, tailSpeed: 20, span: 600 }));
  const start = [...spawner.dir];
  for (let i = 0; i < 400; i++) spawner.tick(0.5, busy);
  assert.deepEqual(spawner.dir, start);
  const empty = Array.from({ length: LANE_COUNT }, () => ({ count: 0, tailGap: Infinity, tailSpeed: 0, span: 600 }));
  const flips = new Set();
  for (let i = 0; i < 400; i++) { spawner.tick(0.5, empty); flips.add(spawner.dir.join()); }
  assert.ok(flips.size > 1);
});

test('creatures still waiting for artwork leave their slot empty instead of crowding the lane', () => {
  const legacy = SPECIES.filter((s) => s.legacy);
  const few = simulate({ seconds: 1500, seed: 8, species: legacy }).spawns;
  const all = simulate({ seconds: 1500, seed: 8 }).spawns;
  assert.ok(few.every((s) => s.order.species.legacy));
  const perMinute = (list, id) => list.filter((s) => s.order.species.id === id).length / 25;
  assert.ok(perMinute(few, 'chest') > 0.2 && perMinute(few, 'chest') < 1.5, `chests stay special (${perMinute(few, 'chest')}/min)`);
  assert.ok(few.filter((s) => s.order.lane === 6).length < all.filter((s) => s.order.lane === 6).length / 3);
  // With every artwork in place, treasure and map pieces arrive regularly but jackpots stay rare.
  assert.ok(perMinute(all, 'map') > 0.3 && perMinute(all, 'map') < 1.2, `maps ${perMinute(all, 'map')}/min`);
  assert.ok(perMinute(all, 'chest') > 0.2);
  assert.ok(perMinute(all, 'crown') + perMinute(all, 'lobster-king') < 0.4);
});
