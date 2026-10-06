import test from 'node:test';
import assert from 'node:assert/strict';
import { tugLevel } from '../src/species.js';
import { FishingRound, BONUS_KINDS, WORLD, GOAL, BONUS_SECONDS, MAP_PIECES, TIME_BONUS, COMBO_FOR_FEVER, FEVER_SECONDS, TURBO_CATCHES, POWER_SECONDS, PIRATE_SECONDS, PIRATE_RELOAD, PIRATE_HIT, PIRATE_DEFEAT } from '../src/model.js';
import { SPECIES } from '../src/species.js';
import { STOP_SPINS, STOP_SHOW, STOP_SLIDE } from '../src/stopwheel.js';

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
test('after a catch or a miss the swing carries on from the angle it was cast at', () => {
  const untilAim = (r) => { for (let i = 0; i < 1200 && r.phase !== 'aim'; i++) r.tick(1 / 60); };
  const r = new FishingRound(); tick(r, 1.3);
  const angle = r.angle; const direction = Math.sign(Math.cos(r.swingTime * 1.12));
  catchFish(r);
  for (let i = 0; i < r.requiredTaps; i++) r.reel(i * 100);
  untilAim(r);
  assert.ok(Math.abs(r.angle - angle) < 0.03, `resumed at ${r.angle.toFixed(3)} (cast at ${angle.toFixed(3)})`);
  const before = r.angle; r.tick(1 / 30);
  assert.equal(Math.sign(r.angle - before), direction, 'and keeps swinging the same way');
  const miss = new FishingRound(); tick(miss, 0.8); const cast = miss.angle;
  miss.cast(); r.tick(1 / 60);
  for (let i = 0; i < 1200 && miss.phase === 'aim'; i++) miss.tick(1 / 60);
  untilAim(miss);
  assert.ok(Math.abs(miss.angle - cast) < 0.03, `after a miss ${miss.angle.toFixed(3)} vs ${cast.toFixed(3)}`);
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
    if (s.prizes) assert.ok(s.prizes.some(([points]) => points === r.score), `${s.id} paid ${r.score}`); else assert.equal(r.score, s.points);
    assert.deepEqual(r.catches, [s.id]);
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
test('ten landed catches complete a relaxed trip without a timer', () => {
  assert.equal(GOAL, 10);
  const r = new FishingRound();
  let points = 0;
  for (let i = 0; i < GOAL; i++) { catchFish(r); land(r); points += r.landing.points; tick(r, 2); }
  // Ten in a row also earns a fever, so some catches count double.
  assert.equal(r.phase, 'complete'); assert.equal(r.score, points); assert.ok(points > 40); assert.equal(r.catches.length, 10);
  assert.equal(r.cast(), false);
});
test('arcade has no catch limit: the trip goes on past the relaxed goal and only the clock ends it', () => {
  const r = new FishingRound('arcade'); r.remaining = 400;
  for (let i = 0; i < GOAL + 4; i++) { catchFish(r); land(r); tick(r, 2); }
  assert.equal(r.tripCatches, GOAL + 4); assert.equal(r.goalReached, false); assert.equal(r.phase, 'aim');
  assert.equal(r.cast(), true);
  r.remaining = 0.01; tick(r, 8);
  assert.equal(r.phase, 'complete');
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
  const r = new FishingRound('arcade', () => {}, { maps: 2, bonusTurn: 1 });
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
  const r = new FishingRound('relaxed', () => {}, { maps: 3, bonusTurn: 1 });
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

test('three catches in a row start a fever that doubles points for a while', () => {
  const r = new FishingRound();
  catchAndLand(r, 'goldfish'); catchAndLand(r, 'goldfish');
  assert.equal(r.combo, 2); assert.equal(r.fever, 0);
  catchFish(r, 'goldfish'); land(r);
  assert.equal(r.landing.feverStarted, true); assert.equal(r.landing.multiplier, 1, 'the catch that starts it is not doubled');
  assert.ok(r.fever > FEVER_SECONDS - 1.5); assert.equal(r.combo, 0);
  tick(r, 2);
  catchAndLand(r, 'turtle'); assert.equal(r.landing.multiplier, 2); assert.equal(r.landing.points, 44);
  assert.equal(r.score, 5 * COMBO_FOR_FEVER + 44);
  tick(r, FEVER_SECONDS); assert.equal(r.fever, 0);
  catchAndLand(r, 'turtle'); assert.equal(r.landing.multiplier, 1);
});
test('a miss or an old boot breaks the combo; the bottle stacks with fever', () => {
  const r = new FishingRound();
  catchAndLand(r, 'goldfish'); catchAndLand(r, 'goldfish');
  r.cast(); tick(r, 8); assert.equal(r.phase, 'aim'); assert.equal(r.combo, 0, 'an empty cast resets');
  catchAndLand(r, 'goldfish'); catchAndLand(r, 'boot'); assert.equal(r.combo, 0, 'the boot resets');
  const f = new FishingRound();
  catchAndLand(f, 'goldfish'); catchAndLand(f, 'goldfish'); catchAndLand(f, 'bottle');
  assert.ok(f.fever > 0 && f.doubleNext);
  catchAndLand(f, 'turtle'); assert.equal(f.landing.multiplier, 4);
});

test('a net scoops up to two neighbours with the hooked creature, once', () => {
  const r = new FishingRound();
  catchAndLand(r, 'net'); assert.equal(r.netCharges, 1); assert.deepEqual(r.landing.powers, ['net']);
  const n = new FishingRound(); catchAndLand(n, 'net');
  assert.equal(n.cast(), true); n.length = 130;
  assert.equal(n.catch('goldfish', ['clownfish', 'turtle', 'shark']), true);
  assert.deepEqual(n.extraIds, ['clownfish', 'turtle']); assert.equal(n.netCharges, 0);
  assert.equal(n.requiredTaps, 12, 'the toughest creature in the net sets the taps');
  land(n);
  assert.equal(n.landing.points, 5 + 8 + 22); assert.deepEqual(n.catches.slice(-3), ['goldfish', 'clownfish', 'turtle']);
  assert.equal(n.tripCatches, 4);
  tick(n, 2); n.cast(); n.length = 130; n.catch('goldfish', ['clownfish']);
  assert.deepEqual(n.extraIds, [], 'no net left');
});
test('the turbo reel speeds up the next three catches and halves their taps', () => {
  const r = new FishingRound();
  catchAndLand(r, 'turbo-reel'); assert.equal(r.turbo, TURBO_CATCHES);
  r.cast(); const before = r.length; r.tick(0.1); assert.ok(r.length - before > 245 * 0.1 * 1.5, 'the line drops faster');
  r.length = 130; r.catch('shark'); assert.equal(r.requiredTaps, 8);
  land(r); tick(r, 2);
  catchAndLand(r, 'shark'); catchAndLand(r, 'shark');
  assert.equal(r.turbo, 0);
  catchFish(r, 'shark'); assert.equal(r.requiredTaps, 16);
});
test('golden hook and spyglass run for twenty seconds, paused with the game', () => {
  const r = new FishingRound();
  catchAndLand(r, 'gold-hook'); catchAndLand(r, 'spyglass');
  assert.ok(r.goldHook > POWER_SECONDS - 7 && r.spyglass > POWER_SECONDS - 4);
  r.pause(); const g = r.goldHook; tick(r, 5); assert.equal(r.goldHook, g); r.pause(false);
  tick(r, POWER_SECONDS); assert.equal(r.goldHook, 0); assert.equal(r.spyglass, 0);
});
test('completed maps take turns: the pirate battle, the treasure rain, the stop-the-wheel stage', () => {
  const r = new FishingRound('arcade', () => {}, { maps: 3 });
  catchFish(r, 'map'); land(r);
  assert.equal(r.landing.bonusKind, 'pirate'); assert.equal(r.bonus, 0); assert.equal(r.bonusTurn, 1);
  tick(r, 2); assert.equal(r.phase, 'pirate'); assert.ok(r.pirate.time > PIRATE_SECONDS - 3 && r.pirate.time <= PIRATE_SECONDS);
  const clock = r.remaining; const angle = r.angle; tick(r, 1);
  assert.equal(r.remaining, clock, 'the arcade clock waits'); assert.notEqual(r.angle, angle, 'the cannon swings');
  assert.equal(r.cast(), false, 'no casting during the battle');
  r.maps = 3; r.pirate = null; r.phase = 'aim';
  catchFish(r, 'map'); land(r); assert.equal(r.landing.bonusKind, 'rain'); assert.ok(r.bonus > 0);
  assert.equal(r.bonusTurn, 2); r.bonus = 0; r.phase = 'aim'; r.maps = 3;
  catchFish(r, 'map'); land(r); assert.equal(r.landing.bonusKind, 'wheel'); assert.equal(r.bonusTurn, 0);
  assert.deepEqual(BONUS_KINDS, ['pirate', 'rain', 'wheel']);
});
test('stop-the-wheel stage: three taps, points added as each spin lands, the arcade clock waits, then back to fishing', () => {
  const r = new FishingRound('arcade', () => {}, { maps: 3, bonusTurn: 2, rng: () => 0.3 });
  catchFish(r, 'map'); land(r);
  assert.equal(r.landing.bonusKind, 'wheel'); assert.equal(r.phase, 'celebrate');
  tick(r, 2); assert.equal(r.phase, 'wheel'); assert.ok(r.stopWheel);
  const clock = r.remaining; const start = r.score;
  assert.equal(r.cast(), false, 'no casting during the stage');
  tick(r, 1); assert.equal(r.remaining, clock, 'the arcade clock waits');
  for (let spin = 0; spin < STOP_SPINS; spin++) {
    tick(r, 0.6); assert.equal(r.stopTheWheel(), true); assert.equal(r.stopTheWheel(), false);
    const before = r.score; const wheel = r.stopWheel; tick(r, STOP_SLIDE + 0.05);
    assert.equal(r.score - before, wheel.results.at(-1).points, 'points land when the wheel rests');
    tick(r, STOP_SHOW + 0.05);
  }
  assert.equal(r.phase, 'aim'); assert.equal(r.stopWheel, null);
  assert.equal(r.wheelResult.results.length, STOP_SPINS); assert.equal(r.score - start, r.wheelResult.total);
  assert.equal(r.stopTheWheel(), false, 'nothing to stop any more');
  assert.equal(r.cast(), true);
});
test('a stop-the-wheel stage that gets no taps still ends by itself, and a finished trip completes after it', () => {
  const r = new FishingRound('relaxed', () => {}, { maps: 3, bonusTurn: 2 });
  for (let i = 0; i < GOAL - 1; i++) catchAndLand(r, 'goldfish');
  r.maps = 3; catchFish(r, 'map'); land(r); tick(r, 2);
  assert.equal(r.tripCatches, GOAL); assert.equal(r.phase, 'wheel');
  tick(r, 60); assert.equal(r.phase, 'complete'); assert.equal(r.wheelResult.results.length, STOP_SPINS);
  r.pause(); r.phase = 'wheel'; r.stopWheel = null; assert.equal(r.stopTheWheel(), false);
});
test('pirate battle: unlimited shots for 30 seconds with a reload, streak and sinking points, then back to fishing', () => {
  const r = new FishingRound('relaxed', () => {}, { maps: 3 });
  catchFish(r, 'map'); land(r); tick(r, 2);
  const start = r.score;
  assert.equal(r.fire(), true); assert.equal(r.fire(), false, 'reloading');
  tick(r, PIRATE_RELOAD + 0.05); assert.equal(r.fire(), true, 'a second ball while the first is still flying'); assert.equal(r.pirate.flying, 2);
  assert.equal(r.resolveShot({ hit: true, kind: 'medium' }).points, PIRATE_HIT.medium);
  assert.equal(r.resolveShot({ hit: true, kind: 'medium', sunk: true }).points, Math.round((PIRATE_HIT.medium + PIRATE_DEFEAT.medium) * 1.5));
  assert.equal(r.resolveShot({ hit: true }), null, 'no ball left in the air');
  tick(r, PIRATE_RELOAD + 0.05); r.fire();
  assert.equal(r.resolveShot({ hit: true, kind: 'small', sunk: true }).points, (PIRATE_HIT.small + PIRATE_DEFEAT.small) * 2);
  tick(r, PIRATE_RELOAD + 0.05); r.fire(); assert.equal(r.resolveShot({ hit: false }).points, 0); assert.equal(r.pirate.streak, 0);
  assert.equal(r.score - start, r.pirate.loot);
  // Many more shots than the old ten, all allowed within the half minute.
  let fired = 4;
  while (r.pirate.time > 1) { tick(r, PIRATE_RELOAD + 0.02); if (r.fire()) { fired++; r.resolveShot({ hit: false }); } }
  assert.ok(fired > 30, `${fired} shots in 30 s`);
  // Time up with a ball still flying: the battle waits for it, then ends and fishing resumes.
  tick(r, PIRATE_RELOAD + 0.02); assert.equal(r.fire(), true);
  tick(r, 2); assert.equal(r.pirate.time, 0); assert.equal(r.phase, 'pirate'); assert.equal(r.fire(), false, 'no new shots after the time is up');
  const last = r.resolveShot({ hit: true, kind: 'large' });
  assert.equal(last.ended, true); assert.equal(r.pirate, null); assert.equal(r.phase, 'aim');
  assert.equal(r.resolveShot({ hit: true }), null);
  const idle = new FishingRound('relaxed', () => {}, { maps: 3 });
  catchFish(idle, 'map'); land(idle); tick(idle, 2); tick(idle, PIRATE_SECONDS + 1);
  assert.equal(idle.phase, 'aim', 'a battle without a single shot still ends by itself');
});

test('the treasure chest pays a surprise prize: only listed amounts, each one turns up, the average beats a plain catch', () => {
  const chest = SPECIES.find((x) => x.id === 'chest');
  let a = 11; const rng = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const seen = new Map(); let total = 0; const N = 600;
  for (let i = 0; i < N; i++) {
    const r = new FishingRound('relaxed', () => {}, { rng }); catchAndLand(r, 'chest');
    seen.set(r.score, (seen.get(r.score) ?? 0) + 1); total += r.score;
    assert.equal(r.landing.base, r.score); assert.ok(chest.prizes.some(([p]) => p === r.score));
  }
  assert.deepEqual([...seen.keys()].sort((x, y) => x - y), chest.prizes.map(([p]) => p).sort((x, y) => x - y));
  assert.ok(seen.get(30) > seen.get(100) * 2, 'the big prize is the rarest');
  assert.ok(total / N > 35 && total / N < 60, `average ${(total / N).toFixed(1)}`);
  const doubled = new FishingRound('relaxed', () => {}, { rng: () => 0 }); doubled.doubleNext = true; catchAndLand(doubled, 'chest');
  assert.equal(doubled.landing.points, 60, 'the bottle doubles the drawn prize');
});
test('heavy fish fight back: tug level grows with the taps they need, bosses are always the heaviest', () => {
  for (const x of SPECIES) {
    const level = tugLevel(x);
    if (x.boss) assert.equal(level, 2, x.id); else if (x.taps >= 20) assert.equal(level, 2, x.id); else if (x.taps >= 14) assert.equal(level, 1, x.id); else assert.equal(level, 0, x.id);
  }
  assert.equal(tugLevel(SPECIES.find((x) => x.id === 'goldfish')), 0);
  assert.equal(tugLevel(SPECIES.find((x) => x.id === 'shark')), 1);
  assert.equal(tugLevel(SPECIES.find((x) => x.id === 'whale-shark')), 2);
});

test('the fog horn counts blows and reports the power; it is worth little and never ends the combo', () => {
  const r = new FishingRound(); assert.equal(r.hornCalls, 0);
  catchAndLand(r, 'horn');
  assert.equal(r.hornCalls, 1); assert.deepEqual(r.landing.powers, ['horn']); assert.equal(r.combo, 1);
  catchAndLand(r, 'horn'); assert.equal(r.hornCalls, 2);
});
