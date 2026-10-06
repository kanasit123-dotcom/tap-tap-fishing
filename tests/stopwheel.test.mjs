import test from 'node:test';
import assert from 'node:assert/strict';
import { StopWheel, STOP_SEGMENTS, SEGMENT_DEGREES, STOP_SPINS, STOP_SPEEDS, STOP_SLIDE, STOP_TIMEOUT, STOP_SHOW, segmentAt, settleAngle, wrapDegrees } from '../src/stopwheel.js';

const run = (wheel, seconds, step = 1 / 60) => { const results = []; for (let t = 0; t < seconds; t += step) { const r = wheel.tick(step); if (r) results.push(r); } return results; };

test('the pointer picks the prize under it as the wheel turns clockwise', () => {
  assert.equal(STOP_SEGMENTS.length * SEGMENT_DEGREES, 360);
  assert.equal(segmentAt(0), 0);
  // After a quarter turn clockwise, the prize that was a quarter turn counter-clockwise of the pointer is under it.
  assert.equal(segmentAt(SEGMENT_DEGREES * 1.5), STOP_SEGMENTS.length - 2);
  assert.equal(segmentAt(-SEGMENT_DEGREES * 3.5), 3);
  assert.equal(segmentAt(360 * 7 + 10), segmentAt(10));
  assert.equal(wrapDegrees(-10), 350);
  assert.equal(STOP_SEGMENTS.filter((s) => s.jackpot).length, 1);
  assert.ok(STOP_SEGMENTS.find((s) => s.jackpot).points >= 2 * Math.max(...STOP_SEGMENTS.filter((s) => !s.jackpot).map((s) => s.points)));
});

test('a tap stops the wheel at a predictable place and it settles evenly', () => {
  const wheel = new StopWheel(() => 0.25);
  run(wheel, 1.7);
  assert.equal(wheel.state, 'spinning');
  const at = wheel.angle;
  assert.equal(wheel.stop(), true); assert.equal(wheel.stop(), false, 'one tap per spin');
  const results = run(wheel, STOP_SLIDE + 0.1);
  assert.equal(results.length, 1);
  assert.ok(Math.abs(wheel.angle - settleAngle(at, STOP_SPEEDS[0])) < 1e-6, 'the wheel rests where the formula says');
  assert.equal(results[0].index, segmentAt(settleAngle(at, STOP_SPEEDS[0])));
  assert.equal(results[0].points, STOP_SEGMENTS[results[0].index].points);
  assert.equal(wheel.total, results[0].points);
});

test('the wheel never goes backwards and slows to a halt while settling', () => {
  const wheel = new StopWheel(() => 0.5);
  run(wheel, 0.5); wheel.stop();
  let last = wheel.angle; let lastStep = Infinity;
  for (let i = 0; i < 40 && wheel.state === 'sliding'; i++) {
    wheel.tick(0.01);
    const step = wheel.angle - last;
    assert.ok(step >= -1e-9, 'no reversing');
    assert.ok(step <= lastStep + 1e-9, 'each step is no longer than the one before');
    last = wheel.angle; lastStep = step;
  }
});

test('three spins, each faster; an unstopped spin stops itself, and the stage then finishes', () => {
  assert.equal(STOP_SPINS, 3);
  assert.ok(STOP_SPEEDS.every((s, i) => i === 0 || s > STOP_SPEEDS[i - 1]), 'faster every spin');
  const wheel = new StopWheel(() => 0.1);
  // Spin 1: the player does nothing.
  const first = run(wheel, STOP_TIMEOUT + STOP_SLIDE + 0.2);
  assert.equal(first.length, 1, 'it stopped by itself');
  assert.equal(wheel.state, 'show');
  run(wheel, STOP_SHOW + 0.05);
  assert.equal(wheel.spin, 1); assert.equal(wheel.speed, STOP_SPEEDS[1]); assert.equal(wheel.state, 'spinning');
  // Spins 2 and 3: tapped after a moment.
  for (let spin = 1; spin < STOP_SPINS; spin++) {
    run(wheel, 0.9); assert.equal(wheel.stop(), true);
    assert.equal(run(wheel, STOP_SLIDE + 0.05).length, 1);
    run(wheel, STOP_SHOW + 0.05);
  }
  assert.equal(wheel.done, true);
  assert.equal(wheel.results.length, STOP_SPINS);
  assert.equal(wheel.total, wheel.results.reduce((sum, r) => sum + r.points, 0));
  assert.equal(wheel.stop(), false); assert.equal(wheel.tick(1), null);
});

test('timing matters: taps at different moments land on different prizes, and every prize is reachable', () => {
  const landed = new Set();
  for (let ms = 0; ms < 4000; ms += 17) {
    const wheel = new StopWheel(() => 0);
    run(wheel, ms / 1000, 0.001);
    wheel.stop();
    for (const r of run(wheel, STOP_SLIDE + 0.05, 0.001)) landed.add(r.index);
  }
  assert.equal(landed.size, STOP_SEGMENTS.length, 'a careful player can aim at any prize');
  // The jackpot slice stays open for long enough to hit (wider than a human's timing wobble of about 0.08 s).
  assert.ok(SEGMENT_DEGREES / STOP_SPEEDS.at(-1) > 0.12, `the jackpot passes the pointer for ${(SEGMENT_DEGREES / STOP_SPEEDS.at(-1)).toFixed(2)} s at the last speed`);
});

test('invalid time steps do nothing', () => {
  const wheel = new StopWheel(() => 0.3);
  const before = wheel.angle;
  for (const dt of [NaN, -1, 0]) assert.equal(wheel.tick(dt), null);
  assert.equal(wheel.angle, before);
});
