import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, difficultyOf, sanitizeDifficulty, scaledTaps } from '../src/difficulty.js';
import { FishingRound, ROUND_SECONDS, WORLD } from '../src/model.js';
import { Spawner, emptyLane } from '../src/spawner.js';
import { SPECIES, LANE_COUNT } from '../src/species.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hookFish(round, id) { round.cast(); round.length = 130; assert.equal(round.catch(id), true); return round.requiredTaps; }

test('three levels from gentle to hard; anything unknown is normal', () => {
  assert.deepEqual(Object.keys(DIFFICULTIES), ['easy', 'normal', 'hard']);
  const [easy, normal, hard] = ['easy', 'normal', 'hard'].map(difficultyOf);
  assert.ok(easy.taps < normal.taps && normal.taps < hard.taps);
  assert.ok(easy.fishSpeed < normal.fishSpeed && normal.fishSpeed < hard.fishSpeed);
  assert.ok(easy.swing < normal.swing && normal.swing < hard.swing);
  assert.ok(easy.seconds > normal.seconds && normal.seconds > hard.seconds);
  assert.equal(normal.seconds, ROUND_SECONDS); assert.equal(normal.taps, 1); assert.equal(normal.fishSpeed, 1); assert.equal(normal.swing, 1);
  for (const bad of [undefined, null, 'extreme', 3, {}]) { assert.equal(difficultyOf(bad), normal); assert.equal(sanitizeDifficulty(bad), 'normal'); }
  assert.equal(sanitizeDifficulty('hard'), 'hard');
});

test('taps: normal is exactly the species number, easy needs fewer, hard more, never fewer than 3', () => {
  for (const s of SPECIES) {
    assert.equal(scaledTaps(s.taps, difficultyOf('normal')), s.taps);
    assert.ok(scaledTaps(s.taps, difficultyOf('easy')) <= s.taps && scaledTaps(s.taps, difficultyOf('easy')) >= 3, s.id);
    assert.ok(scaledTaps(s.taps, difficultyOf('hard')) >= s.taps, s.id);
  }
  const goldfish = SPECIES.find((s) => s.id === 'goldfish');
  assert.equal(scaledTaps(goldfish.taps, difficultyOf('easy')), 4); assert.equal(scaledTaps(goldfish.taps, difficultyOf('hard')), 8);
  const easy = new FishingRound('relaxed', () => {}, { difficulty: 'easy' });
  const normal = new FishingRound('relaxed', () => {}, { difficulty: 'normal' });
  const hard = new FishingRound('relaxed', () => {}, { difficulty: 'hard' });
  assert.deepEqual([hookFish(easy, 'goldfish'), hookFish(normal, 'goldfish'), hookFish(hard, 'goldfish')], [4, 6, 8]);
  // The treasure rain and the turbo reel still halve whatever the level says.
  const turbo = new FishingRound('relaxed', () => {}, { difficulty: 'hard', startPowers: { turbo: true } });
  assert.equal(hookFish(turbo, 'goldfish'), Math.max(3, Math.ceil(8 / 2)));
});

test('the arcade clock and the swing of the hook follow the level', () => {
  assert.deepEqual(['easy', 'normal', 'hard'].map((level) => new FishingRound('arcade', () => {}, { difficulty: level }).remaining), [120, 90, 75]);
  const swung = (level) => { const r = new FishingRound('relaxed', () => {}, { difficulty: level }); let steps = 0; let last = 0; for (let t = 0; t < 12; t += 1 / 60) { r.tick(1 / 60); if (Math.sign(r.angle) !== Math.sign(last) && last !== 0) steps++; last = r.angle; } return steps; };
  const [easy, normal, hard] = ['easy', 'normal', 'hard'].map(swung);
  assert.ok(easy < normal && normal < hard, `swing crossings in 12 s: easy ${easy}, normal ${normal}, hard ${hard}`);
  // The reach of the swing is the same: only its speed changes.
  const r = new FishingRound('relaxed', () => {}, { difficulty: 'hard' }); let max = 0; for (let t = 0; t < 12; t += 1 / 60) { r.tick(1 / 60); max = Math.max(max, Math.abs(r.angle)); }
  assert.ok(max > 0.6 && max <= 0.67 + 1e-9);
  assert.ok(WORLD.rest > 0);
});

test('creatures swim at the speed of the level, and the sea keeps the same number of them', () => {
  const average = (level, key) => {
    const spawner = new Spawner({ species: SPECIES, rng: seeded(5), speedScale: difficultyOf(level).fishSpeed });
    const speeds = []; let orders = 0;
    for (let t = 0; t < 600; t += 0.1) for (const o of spawner.tick(0.1, Array.from({ length: LANE_COUNT }, () => emptyLane()))) { orders++; if (!o.boss) speeds.push(o.speed / (o.species.speed)); }
    return key === 'speed' ? speeds.reduce((a, b) => a + b, 0) / speeds.length : orders;
  };
  const [e, n, h] = ['easy', 'normal', 'hard'].map((level) => average(level, 'speed'));
  assert.ok(e < n && n < h, `speed ratios ${e.toFixed(2)} < ${n.toFixed(2)} < ${h.toFixed(2)}`);
  assert.ok(Math.abs(e / n - 0.85) < 0.06 && Math.abs(h / n - 1.2) < 0.08);
  const counts = ['easy', 'normal', 'hard'].map((level) => average(level, 'orders'));
  // Faster creatures cross sooner, so they also arrive more often (the gaps shrink with the speed): a screen holds about the same number.
  assert.ok(Math.abs(counts[0] / counts[1] - 0.85) < 0.1 && Math.abs(counts[2] / counts[1] - 1.2) < 0.12, counts.join(' '));
  assert.equal(new Spawner({ species: SPECIES, speedScale: NaN }).speedScale, 1);
  // Bosses too.
  const boss = (level) => { const sp = new Spawner({ species: SPECIES, rng: seeded(2), speedScale: difficultyOf(level).fishSpeed }); sp.bossIn = 0; return sp.tick(0.1, Array.from({ length: LANE_COUNT }, () => emptyLane())).find((o) => o.boss); };
  assert.ok(boss('hard').speed > boss('easy').speed);
});
