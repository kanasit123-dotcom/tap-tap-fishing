import test from 'node:test';
import assert from 'node:assert/strict';
import { FishingRound, WORLD, GOAL, BONUS_SECONDS, MAP_PIECES, TIME_BONUS } from '../src/model.js';
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
function catchAndLand(round, id) { catchFish(round, id); land(round); tick(round, 2.2); }

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
  tick(r, 6); assert.equal(r.phase, 'aim'); assert.equal(r.length, WORLD.rest); assert.equal(r.score, 0);
});
test('the hook turns back at the layout floor and side walls', () => {
  const r = new FishingRound(); r.setBounds({ floor: 300, left: 0, right: 480 });
  r.cast(); let deepest = 0;
  for (let i = 0; i < 300 && r.phase === 'casting'; i++) { r.tick(1 / 60); deepest = Math.max(deepest, r.hook.y); }
  assert.equal(r.phase, 'returning'); assert.ok(deepest > 290 && deepest < 306, `turned at ${deepest}`);
  r.setBounds({ floor: NaN, left: 0, right: 480 }); assert.equal(r.bounds.floor, 300);
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
test('every species can be reeled to the surface with its own finite tap count', () => {
  for (const s of SPECIES) {
    const r = new FishingRound('arcade'); catchFish(r, s.id, 400);
    assert.equal(r.requiredTaps, s.taps); land(r);
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
test('a message bottle doubles only the next catch, never itself', () => {
  const r = new FishingRound();
  catchAndLand(r, 'bottle'); assert.equal(r.score, 5); assert.equal(r.doubleNext, true);
  catchAndLand(r, 'turtle'); assert.equal(r.score, 5 + 44); assert.equal(r.landing.multiplier, 2); assert.equal(r.doubleNext, false);
  catchAndLand(r, 'goldfish'); assert.equal(r.score, 5 + 44 + 5);
});
test('a pocket watch adds time in arcade mode and does nothing to relaxed play', () => {
  const arcade = new FishingRound('arcade'); arcade.remaining = 30;
  catchFish(arcade, 'watch'); land(arcade);
  assert.ok(arcade.remaining > 30 + TIME_BONUS - 1.5); assert.equal(arcade.score, 10);
  const relaxed = new FishingRound(); catchAndLand(relaxed, 'watch'); assert.equal(relaxed.remaining, 90);
});
test('four map pieces start the treasure rain, which halves taps and pauses the arcade clock', () => {
  const r = new FishingRound('arcade', () => {}, { maps: 2 });
  assert.equal(r.maps, 2);
  catchAndLand(r, 'map'); assert.equal(r.maps, 3); assert.equal(r.bonus, 0);
  catchFish(r, 'map'); land(r);
  assert.equal(r.maps, 0); assert.equal(r.landing.bonusStarted, true); assert.ok(r.bonus > BONUS_SECONDS - 1.5);
  const clock = r.remaining; tick(r, 3); assert.equal(r.remaining, clock);
  catchFish(r, 'chest'); assert.equal(r.requiredTaps, Math.ceil(16 / 2));
  land(r); tick(r, 2);
  tick(r, BONUS_SECONDS); assert.equal(r.bonus, 0);
  const after = r.remaining; tick(r, 1); assert.ok(r.remaining < after);
  assert.equal(new FishingRound('relaxed', () => {}, { maps: MAP_PIECES + 1 }).maps, 1);
});
test('treasure-rain catches do not end the trip; a goal reached during the rain waits for it to finish', () => {
  const r = new FishingRound('relaxed', () => {}, { maps: 3 });
  for (let i = 0; i < GOAL - 1; i++) catchAndLand(r, 'goldfish');
  catchAndLand(r, 'map');
  assert.equal(r.tripCatches, GOAL); assert.ok(r.bonus > 0); assert.equal(r.phase, 'aim');
  catchAndLand(r, 'coins'); assert.equal(r.tripCatches, GOAL); assert.equal(r.phase, 'aim');
  tick(r, BONUS_SECONDS); assert.equal(r.phase, 'complete');
});
test('invalid time deltas and tap timestamps do not corrupt state', () => {
  const r = new FishingRound(); catchFish(r);
  for (const n of [NaN, Infinity, -1, 0]) r.tick(n);
  assert.ok(Number.isFinite(r.length)); assert.equal(r.reel(NaN), false); assert.equal(r.reel(Infinity), false);
});
