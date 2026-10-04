import test from 'node:test';
import assert from 'node:assert/strict';
import { FishingRound, WORLD, GOAL } from '../src/model.js';
import { SPECIES } from '../src/species.js';

function tick(round, seconds) { for (let i = 0; i < Math.ceil(seconds * 60); i++) round.tick(1 / 60); }
function catchFish(round, id = 'goldfish', depth = 130) {
  assert.equal(round.cast(), true);
  round.length = depth;
  assert.equal(round.catch(id), true);
}
function land(round, now = 0) {
  const taps = round.requiredTaps;
  for (let i = 0; i < taps; i++) assert.equal(round.reel(now + i * 100), true);
  tick(round, 1);
}

test('starts ready and idle time does not finish relaxed play', () => {
  const r = new FishingRound(); tick(r, 300);
  assert.equal(r.phase, 'aim'); assert.equal(r.remaining, 90); assert.equal(r.score, 0);
  assert.ok(Math.abs(r.angle) <= 0.67);
});
test('casts lock the aim, do not double-cast, and return without a penalty after a miss', () => {
  const r = new FishingRound(); tick(r, 1);
  const angle = r.angle;
  assert.equal(r.cast(), true); assert.equal(r.cast(), false);
  tick(r, 1); assert.equal(r.angle, angle);
  tick(r, 5); assert.equal(r.phase, 'aim'); assert.equal(r.length, WORLD.rest); assert.equal(r.score, 0);
});
test('catch is only allowed during a cast, known species only, once per hook', () => {
  const r = new FishingRound(); assert.equal(r.catch('goldfish'), false);
  r.cast(); assert.equal(r.catch('bad'), false); assert.equal(r.catch('goldfish'), true);
  assert.equal(r.catch('turtle'), false); assert.equal(r.catchId, 'goldfish');
});
test('holding or waiting never reels; every accepted tap moves the target upwards', () => {
  const r = new FishingRound(); catchFish(r); const length = r.length;
  tick(r, 20); assert.equal(r.length, length); assert.equal(r.taps, 0);
  assert.equal(r.reel(0), true); const first = r.targetLength;
  assert.ok(first < length); assert.equal(r.reel(30), false); assert.equal(r.taps, 1);
  assert.equal(r.reel(100), true); assert.ok(r.targetLength < first);
  tick(r, 20); assert.equal(r.taps, 2); assert.equal(r.score, 0);
});
test('points and collection callback happen on landing, exactly once', () => {
  const landed = []; const r = new FishingRound('relaxed', (s) => landed.push(s.id));
  catchFish(r); assert.equal(r.score, 0);
  land(r); assert.equal(r.score, 5); assert.deepEqual(r.catches, ['goldfish']);
  tick(r, 10); assert.deepEqual(landed, ['goldfish']); assert.equal(r.score, 5);
});
test('every species can be reeled to the surface with finite taps, deeper catches cost two more', () => {
  for (const s of SPECIES) {
    const r = new FishingRound(); catchFish(r, s.id, 400);
    assert.equal(r.requiredTaps, s.taps + 2); land(r);
    assert.equal(r.score, s.points); assert.deepEqual(r.catches, [s.id]);
  }
});
test('pause freezes the clock, hook, and taps and prevents casting', () => {
  const r = new FishingRound('arcade'); r.pause(); assert.equal(r.cast(), false);
  r.pause(false); catchFish(r); r.pause(); const hook = r.hook; const time = r.remaining;
  tick(r, 10); assert.deepEqual(r.hook, hook); assert.equal(r.remaining, time); assert.equal(r.reel(100), false);
  r.pause(false); assert.equal(r.reel(100), true);
});
test('arcade clock finishes at idle but lets an already-hooked fish land', () => {
  const idle = new FishingRound('arcade'); idle.remaining = 0.01; tick(idle, 0.1); assert.equal(idle.phase, 'complete');
  const r = new FishingRound('arcade'); catchFish(r); r.remaining = 0.01;
  tick(r, 5); assert.equal(r.phase, 'reeling'); assert.equal(r.remaining, 0);
  land(r); tick(r, 3); assert.equal(r.phase, 'complete'); assert.equal(r.score, 5);
});
test('time running out during an empty cast returns the hook and ends', () => {
  const r = new FishingRound('arcade'); r.cast(); r.length = 200; r.remaining = 0.01;
  tick(r, 3); assert.equal(r.phase, 'complete'); assert.equal(r.score, 0);
});
test('eight landed catches complete a relaxed trip without a timer', () => {
  const r = new FishingRound();
  for (let i = 0; i < GOAL; i++) { catchFish(r); land(r); tick(r, 2); }
  assert.equal(r.phase, 'complete'); assert.equal(r.score, 40); assert.equal(r.catches.length, 8);
  assert.equal(r.cast(), false);
});
test('invalid time deltas and tap timestamps do not corrupt state', () => {
  const r = new FishingRound(); catchFish(r);
  for (const n of [NaN, Infinity, -1, 0]) r.tick(n);
  assert.ok(Number.isFinite(r.length)); assert.equal(r.reel(NaN), false); assert.equal(r.reel(Infinity), false);
});
