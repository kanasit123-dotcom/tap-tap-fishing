import test from 'node:test';
import assert from 'node:assert/strict';
import { Spawner, MIN_GAP_PX, RARE_COOLDOWN, SWIM_PACE, BOSS_FIRST, BOSS_EVERY, BOSS_LANE, emptyLane } from '../src/spawner.js';
import { SPECIES, LANE_COUNT, SEABED } from '../src/species.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const zone = (lane) => lane <= 3 ? 'upper' : lane < SEABED ? 'deep' : 'seabed';

// Minimal sea: creatures cross a 600px lane from either side like the Phaser scene, and report room per side.
function simulate({ seconds = 900, mode = 'relaxed', seed = 1, bonusAt = Infinity, span = 600, species = SPECIES } = {}) {
  const spawner = new Spawner({ species, mode, rng: seeded(seed) });
  const swimmers = [];
  const spawns = [];
  let overlaps = 0;
  for (let t = 0; t < seconds; t += 0.1) {
    if (t >= bonusAt && !spawner.bonus) spawner.setBonus(true);
    const lanes = Array.from({ length: LANE_COUNT }, () => emptyLane(span));
    for (const f of swimmers) {
      const lane = lanes[f.lane];
      lane.count++;
      const side = lane.sides[f.dir];
      const gap = f.distance - f.width;
      if (gap < side.tailGap) { side.tailGap = gap; side.tailSpeed = f.speed; }
    }
    for (const order of spawner.tick(0.1, lanes)) {
      spawns.push({ time: t, order });
      for (const m of order.members) swimmers.push({ lane: order.lane, dir: order.dir, speed: order.speed * m.speedMul, group: spawns.length, width: order.species.size, distance: -m.offset });
    }
    for (const f of swimmers) f.distance += f.speed * 0.1;
    // Groups from the same side must not swim through each other while both are on screen.
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      for (const dir of [1, -1]) {
        const row = swimmers.filter((f) => f.lane === lane && f.dir === dir && f.distance > f.width && f.distance < span).sort((a, b) => a.distance - b.distance);
        for (let i = 1; i < row.length; i++) if (row[i].group !== row[i - 1].group && row[i].distance - row[i].width < row[i - 1].distance - 1) overlaps++;
      }
    }
    for (let i = swimmers.length - 1; i >= 0; i--) if (swimmers[i].distance - swimmers[i].width > span + 40) swimmers.splice(i, 1);
  }
  return { spawner, spawns, overlaps };
}

test('arrivals are irregular: random gaps per lane, never a fixed beat', () => {
  const { spawns } = simulate();
  const variation = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const times = spawns.filter((s) => s.order.lane === lane).map((s) => s.time);
    assert.ok(times.length > 25, `lane ${lane} spawned ${times.length}`);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    variation.push(sd / mean);
    // A fixed beat has a coefficient of variation near 0; natural random arrivals sit well above 0.2.
    assert.ok(sd / mean > 0.2, `lane ${lane} gaps vary (cv ${(sd / mean).toFixed(2)})`);
    assert.ok(Math.max(...gaps) > mean * 1.5 && Math.min(...gaps) < mean * 0.75, `lane ${lane} has lulls and bursts`);
  }
  assert.ok(variation.reduce((a, b) => a + b, 0) / variation.length > 0.3);
});

test('every creature in a lane swims the same way all trip, and neighbouring lanes alternate', () => {
  const firsts = new Set();
  for (const seed of [1, 2, 7, 8, 9, 12]) {
    const { spawns } = simulate({ seconds: 300, seed });
    const dirs = Array.from({ length: LANE_COUNT }, (_, lane) => new Set(spawns.filter((s) => s.order.lane === lane).map((s) => s.order.dir)));
    dirs.forEach((set, lane) => assert.equal(set.size, 1, `seed ${seed} lane ${lane} has one direction`));
    const lane = dirs.map((set) => [...set][0]);
    lane.slice(1).forEach((dir, i) => assert.equal(dir, -lane[i], `seed ${seed}: lanes ${i}/${i + 1} swim opposite ways`));
    firsts.add(lane[0]);
  }
  assert.equal(firsts.size, 2, 'the top lane goes left on some trips and right on others');
  // Strays and the treasure rain follow the direction of the lane they are in.
  const rain = simulate({ seconds: 60, seed: 2, bonusAt: 30 }).spawns;
  for (let lane = 0; lane < LANE_COUNT; lane++) assert.equal(new Set(rain.filter((s) => s.order.lane === lane).map((s) => s.order.dir)).size, 1);
});

test('each group swims at its own depth inside the band and wanders slowly; the seabed stays on the sand', () => {
  const { spawns } = simulate({ seconds: 600 });
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const heads = spawns.filter((s) => s.order.lane === lane && !s.order.boss).map((s) => s.order.members[0]);
    const depths = heads.map((m) => m.dy);
    if (lane === SEABED) { assert.ok(depths.every((dy) => dy >= 0 && dy <= 0.12) && heads.every((m) => m.wander === 0), 'seabed things stay on the sand'); continue; }
    const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
    const sd = Math.sqrt(depths.reduce((a, b) => a + (b - mean) ** 2, 0) / depths.length);
    assert.ok(sd > 0.06, `lane ${lane}: depth spread ${sd.toFixed(2)} of the lane spacing`);
    // Depth + wander + school spread stay well inside half a lane, so neighbouring rows never mix.
    assert.ok(depths.every((dy) => Math.abs(dy) <= 0.14 + 1e-9));
    assert.ok(heads.every((m) => m.wander >= 0.03 && m.wander <= 0.08 && m.wanderRate > 0 && m.wanderRate < 0.5));
    const reach = Math.max(...spawns.filter((s) => s.order.lane === lane).flatMap((s) => s.order.members.map((m) => Math.abs(m.dy) + m.wander)));
    assert.ok(reach < 0.36, `lane ${lane}: creatures reach ${reach.toFixed(2)} of the spacing from the lane centre`);
  }
});

test('lanes mix their own species with the odd stray from a neighbouring lane, and rarely repeat a species', () => {
  // Long enough that even the rare power-ups (weight 4, 35 s cooldown) show up.
  const { spawns } = simulate({ seconds: 1800 });
  const sizes = new Set();
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const here = spawns.filter((s) => s.order.lane === lane);
    for (const { order } of here) {
      const home = order.species.lane;
      assert.ok(home === lane || (order.species.kind === 'animal' && Math.abs(home - lane) === 1 && zone(home) === zone(lane) && zone(lane) !== 'seabed'), `${order.species.id} in lane ${lane}`);
    }
    const own = here.filter((s) => s.order.species.lane === lane).length / here.length;
    assert.ok(own > 0.6, `lane ${lane}: ${(own * 100).toFixed(0)}% own species`);
    const repeats = here.slice(1).filter((s, i) => s.order.species.id === here[i].order.species.id).length / (here.length - 1);
    // The species that just arrived never comes straight back while another candidate exists.
    assert.ok(repeats < 0.03, `lane ${lane}: same species twice in a row ${(repeats * 100).toFixed(0)}%`);
  }
  for (const { order } of spawns) {
    const [min, max] = order.species.group;
    assert.ok(order.members.length >= min && order.members.length <= max + 3);
    assert.ok(order.speed > 0 && order.speed <= order.species.speed * SWIM_PACE * 1.25 + 1e-9, order.species.id);
    if (order.species.id === 'sardine') sizes.add(order.members.length);
  }
  assert.ok(sizes.size >= 2, 'sardine schools come in different sizes');
  // On average groups swim at the species speed times the overall pace (a few are slowed to avoid overtaking).
  const ratios = spawns.map(({ order }) => order.speed / (order.species.speed * SWIM_PACE));
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  assert.ok(mean > 0.78 && mean < 1.05, `average speed ratio ${mean.toFixed(3)}`);
  assert.ok(spawns.some((s) => s.order.lane === 1 && s.order.species.lane === 0), 'shallow fish sometimes stray a lane deeper');
  const seen = new Set(spawns.map((s) => s.order.species.id));
  for (const s of SPECIES.filter((x) => !x.arcadeOnly && !x.rare && !x.boss)) assert.ok(seen.has(s.id), `${s.id} appears`);
});

test('a faster group never swims through the slower group ahead of it', () => {
  const { overlaps } = simulate({ seconds: 600, seed: 3 });
  assert.equal(overlaps, 0);
  const spawner = new Spawner({ species: SPECIES, rng: seeded(9) });
  spawner.wait.fill(0);
  const blocked = Array.from({ length: LANE_COUNT }, () => ({ count: 2, span: 600, sides: { 1: { tailGap: MIN_GAP_PX - 1, tailSpeed: 10 }, [-1]: { tailGap: MIN_GAP_PX - 1, tailSpeed: 10 } } }));
  assert.deepEqual(spawner.tick(0.1, blocked), [], 'no spawn while the lane entrance is busy');
  const clear = Array.from({ length: LANE_COUNT }, () => emptyLane());
  for (const order of spawner.tick(10, clear)) assert.equal(order.dir, spawner.dir[order.lane], 'groups use their lane direction');
});

test('special treasures respect cooldowns and the arcade-only pocket watch', () => {
  const relaxed = simulate({ seconds: 1500, seed: 5 }).spawns;
  assert.ok(!relaxed.some((s) => s.order.species.id === 'watch'));
  const arcade = simulate({ seconds: 3000, seed: 5, mode: 'arcade' }).spawns;
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
  const jackpots = arcade.filter((s) => s.order.species.rare).length / 50;
  assert.ok(jackpots > 0 && jackpots < 0.25, `rare jackpots appear now and then (${jackpots.toFixed(2)}/min)`);
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

test('creatures still waiting for artwork leave their slot empty instead of crowding the lane', () => {
  const original = new Set(['goldfish', 'clownfish', 'bluefish', 'angelfish', 'pufferfish', 'turtle', 'octopus', 'chest', 'seal', 'shark', 'anglerfish', 'giant-squid']);
  const some = SPECIES.filter((s) => original.has(s.id));
  const few = simulate({ seconds: 1500, seed: 8, species: some }).spawns;
  const all = simulate({ seconds: 1500, seed: 8 }).spawns;
  assert.ok(few.every((s) => original.has(s.order.species.id)));
  const perMinute = (list, id) => list.filter((s) => s.order.species.id === id).length / 25;
  assert.ok(perMinute(few, 'chest') > 0.05 && perMinute(few, 'chest') < 1.5, `chests stay special (${perMinute(few, 'chest')}/min)`);
  assert.ok(few.filter((s) => s.order.lane === 6).length < all.filter((s) => s.order.lane === 6).length / 3);
  // With every artwork in place, treasure and map pieces arrive regularly but jackpots stay rare.
  assert.ok(perMinute(all, 'map') > 0.3 && perMinute(all, 'map') < 1.2, `maps ${perMinute(all, 'map')}/min`);
  assert.ok(perMinute(all, 'chest') > 0.15, `chests ${perMinute(all, 'chest')}/min`);
  assert.ok(perMinute(all, 'crown') + perMinute(all, 'lobster-king') < 0.4);
});

test('a boss crosses the middle every two to three minutes, never during the treasure rain, and only with artwork', () => {
  const { spawns } = simulate({ seconds: 900, seed: 6 });
  const bosses = spawns.filter((s) => s.order.boss);
  assert.ok(bosses.length >= 4 && bosses.length <= 7, `${bosses.length} bosses in 15 minutes`);
  assert.ok(bosses[0].time >= BOSS_FIRST[0] - 0.11);
  bosses.slice(1).forEach((b, i) => assert.ok(b.time - bosses[i].time >= BOSS_EVERY[0] - 0.11));
  for (const b of bosses) {
    assert.equal(b.order.lane, BOSS_LANE); assert.ok(b.order.species.boss); assert.equal(b.order.members.length, 1);
  }
  bosses.slice(1).forEach((b, i) => assert.notEqual(b.order.species.id, bosses[i].order.species.id, 'a different boss each time'));
  assert.ok(!spawns.some((s) => !s.order.boss && s.order.species.boss), 'bosses never come in the normal mix');
  const rain = simulate({ seconds: 400, seed: 6, bonusAt: 0 }).spawns;
  assert.equal(rain.filter((s) => s.order.boss).length, 0);
  const noArt = simulate({ seconds: 400, seed: 6, species: SPECIES.filter((s) => !s.boss) }).spawns;
  assert.equal(noArt.filter((s) => s.order.boss).length, 0);
});
