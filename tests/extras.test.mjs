import test from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL, spinWheel, applyPrize, LOOKS, isUnlocked, zoneProgress, sanitizeLooks, defaultLooks, timeOfDay } from '../src/extras.js';
import { SPECIES, ZONES } from '../src/species.js';
import { FishingRound, TURBO_CATCHES, POWER_SECONDS } from '../src/model.js';
import { freshProgress, loadProgress, STORAGE_KEY } from '../src/progress.js';

test('the wheel lands on every prize, the big one least often', () => {
  let a = 7;
  const rng = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const counts = WHEEL.map(() => 0);
  for (let i = 0; i < 8000; i++) counts[spinWheel(rng)]++;
  assert.ok(counts.every((c) => c > 0));
  const big = WHEEL.findIndex((p) => p.points === 100);
  assert.equal(Math.min(...counts), counts[big]);
  assert.equal(spinWheel(() => 0), 0); assert.equal(spinWheel(() => 0.99999), WHEEL.length - 1);
});

test('prizes: points raise the finished trip and the best, maps and powers wait for the next trip', () => {
  const progress = freshProgress(); progress.best.relaxed = 30;
  const round = { score: 25, mode: 'relaxed' };
  applyPrize(progress, round, WHEEL.find((p) => p.points === 50));
  assert.equal(round.score, 75); assert.equal(progress.best.relaxed, 75);
  progress.maps = 3; applyPrize(progress, round, WHEEL.find((p) => p.map)); assert.equal(progress.maps, 3, 'never a full map on the wheel');
  progress.maps = 1; applyPrize(progress, round, WHEEL.find((p) => p.map)); assert.equal(progress.maps, 2);
  for (const id of ['net', 'turbo', 'goldhook']) assert.match(applyPrize(progress, round, WHEEL.find((p) => p.id === id)), /รอบหน้า/);
  assert.deepEqual(progress.startPowers, { net: true, turbo: true, goldhook: true });
  const next = new FishingRound('relaxed', () => {}, { startPowers: progress.startPowers });
  assert.equal(next.netCharges, 1); assert.equal(next.turbo, TURBO_CATCHES); assert.equal(next.goldHook, POWER_SECONDS);
});

test('looks unlock when every creature with artwork in their book section has been caught', () => {
  const species = SPECIES.filter((s) => s.art);
  const shallow = ZONES.find((z) => z.id === 'shallow');
  const bamboo = LOOKS.rod.find((l) => l.id === 'bamboo');
  const collection = {};
  assert.equal(isUnlocked(bamboo, ZONES, species, collection), false);
  for (const s of species.filter(shallow.match)) collection[s.id] = 1;
  assert.equal(isUnlocked(bamboo, ZONES, species, collection), true);
  const { found, total } = zoneProgress(shallow, species, collection); assert.equal(found, total);
  assert.equal(isUnlocked(LOOKS.rod[0], ZONES, species, {}), true, 'defaults are always available');
  for (const options of Object.values(LOOKS)) for (const look of options) if (look.zone) assert.ok(ZONES.some((z) => z.id === look.zone), look.id);
});

test('looks, start powers and the clock persist and are sanitized', () => {
  assert.deepEqual(sanitizeLooks({ rod: 'gold', hook: 'rubber', boat: 'lanterns' }), { ...defaultLooks(), rod: 'gold', boat: 'lanterns' });
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  data.set(STORAGE_KEY, JSON.stringify({ version: 1, looks: { rod: 'bamboo' }, startPowers: { net: true, turbo: 'yes', laser: true } }));
  const p = loadProgress(storage);
  assert.equal(p.looks.rod, 'bamboo'); assert.equal(p.looks.hook, 'steel');
  assert.deepEqual(p.startPowers, { net: true });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(timeOfDay), ['day', 'sunset', 'night', 'arctic', 'lagoon', 'wreck', 'day', 'sunset']);
  assert.equal(timeOfDay(-3), 'day');
});
