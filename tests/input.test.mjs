import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTapControl, createCrank, CRANK_STEP } from '../src/input.js';

function setup() {
  const button = new EventTarget(); button.disabled = false;
  const surface = new EventTarget(); let count = 0;
  bindTapControl(button, () => count++, surface);
  const fire = (target, type, fields = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, fields); target.dispatchEvent(event); return event;
  };
  return { button, surface, fire, count: () => count };
}

test('one touch activates once, suppresses compatibility events, and holding does not reel', () => {
  const s = setup();
  assert.equal(s.fire(s.surface, 'touchstart', { touches: [{}], targetTouches: [{}] }).defaultPrevented, true);
  s.fire(s.button, 'pointerdown', { pointerType: 'touch', button: 0 });
  s.fire(s.surface, 'touchmove'); s.fire(s.surface, 'touchend');
  s.fire(s.button, 'pointerdown', { pointerType: 'mouse', button: 0 });
  s.fire(s.button, 'click', { detail: 1 }); s.fire(s.button, 'click', { detail: 0 });
  assert.equal(s.count(), 1);
});

test('stationary parent cancels Safari gestures even after the reel becomes disabled', () => {
  const s = setup(); s.button.disabled = true;
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
    assert.equal(s.fire(s.surface, type, { touches: [{}], targetTouches: [{}] }).defaultPrevented, true, type);
  }
  assert.equal(s.count(), 0);
});

test('each new single touch reels once; a second finger does not add a tap', () => {
  const s = setup();
  s.fire(s.surface, 'touchstart', { touches: [{}], targetTouches: [{}] });
  s.fire(s.surface, 'touchstart', { touches: [{}, {}], targetTouches: [{}, {}] });
  s.fire(s.surface, 'touchend');
  s.fire(s.surface, 'touchstart', { touches: [{}], targetTouches: [{}] });
  assert.equal(s.count(), 2);
});

test('mouse, pen and keyboard stay usable without click double-counting or key repeats', () => {
  const s = setup();
  s.fire(s.button, 'pointerdown', { pointerType: 'mouse', button: 0 });
  s.fire(s.button, 'click', { detail: 1 });
  s.fire(s.button, 'pointerdown', { pointerType: 'pen', button: 0 });
  s.fire(s.button, 'click', { detail: 0 });
  assert.equal(s.fire(s.button, 'keydown', { repeat: true, key: 'Enter' }).defaultPrevented, true);
  assert.equal(s.count(), 3);
  s.button.disabled = true;
  s.fire(s.button, 'pointerdown', { pointerType: 'mouse', button: 0 });
  s.fire(s.button, 'click', { detail: 0 });
  assert.equal(s.count(), 3);
});

test('gesture protection does not disable zoom or scrolling on unrelated page surfaces', () => {
  const s = setup(); const header = new EventTarget();
  assert.equal(s.fire(header, 'touchstart', { touches: [{}], targetTouches: [{}] }).defaultPrevented, false);
  assert.equal(s.fire(header, 'gesturestart').defaultPrevented, false);
});

// A finger at `deg` degrees on a circle of radius r around the centre of a 140 px wheel at (0, 0).
const at = (deg, r = 50) => ({ x: 70 + Math.cos(deg * Math.PI / 180) * r, y: 70 + Math.sin(deg * Math.PI / 180) * r });
const box = { left: 0, top: 0, width: 140, height: 140 };

test('cranking: one pull per CRANK_STEP degrees of steady turning, either way round', () => {
  for (const dir of [1, -1]) {
    const crank = createCrank(); crank.begin(at(0), box);
    let steps = 0; let turned = 0;
    for (let a = 10; a <= 720; a += 10) { const r = crank.move(at(dir * a)); steps += r.steps; turned += r.delta; }
    assert.equal(steps, Math.floor(720 / CRANK_STEP)); assert.ok(Math.abs(turned - dir * 720) < 1e-6);
  }
});

test('holding still, wiggling back and forth or circling the hub never pulls', () => {
  const crank = createCrank(); crank.begin(at(0), box);
  let steps = 0;
  for (let i = 0; i < 50; i++) steps += crank.move(at(0)).steps;
  for (let i = 0; i < 40; i++) steps += crank.move(at(i % 2 ? 80 : -20)).steps;
  for (let a = 0; a < 720; a += 10) steps += crank.move(at(a, 8)).steps;
  assert.equal(steps, 0);
});

test('the reel binding pulls once on touch and once per crank step while the finger turns', () => {
  const button = new EventTarget(); button.disabled = false;
  button.getBoundingClientRect = () => box;
  const surface = new EventTarget(); const pulls = []; let rotated = 0;
  bindTapControl(button, (source) => pulls.push(source), surface, { onRotate: (d) => { rotated += d; } });
  const touch = (type, point) => { const e = new Event(type, { cancelable: true }); e.touches = point ? [{ clientX: point.x, clientY: point.y }] : []; e.targetTouches = e.touches; surface.dispatchEvent(e); return e; };
  touch('touchstart', at(0));
  for (let a = 15; a <= 360; a += 15) assert.equal(touch('touchmove', at(a)).defaultPrevented, true);
  touch('touchend');
  assert.deepEqual(pulls, ['tap', ...Array(360 / CRANK_STEP).fill('crank')]); assert.ok(Math.abs(rotated - 360) < 1e-6);
  touch('touchmove', at(30)); assert.equal(pulls.length, 1 + 360 / CRANK_STEP, 'no crank after the finger lifts');
  const cast = new EventTarget(); cast.disabled = false; cast.getBoundingClientRect = () => box;
  const castSurface = new EventTarget(); let casts = 0;
  bindTapControl(cast, () => casts++, castSurface);
  const e = new Event('touchstart', { cancelable: true }); e.touches = [{ clientX: 120, clientY: 70 }]; e.targetTouches = e.touches; castSurface.dispatchEvent(e);
  for (let a = 15; a <= 360; a += 15) { const m = new Event('touchmove', { cancelable: true }); const p = at(a); m.touches = [{ clientX: p.x, clientY: p.y }]; m.targetTouches = m.touches; castSurface.dispatchEvent(m); }
  assert.equal(casts, 1, 'the cast button cannot be cranked');
});

test('two players can hold their own controls at the same time: only fingers on a control count for that control', () => {
  const a = setup(); const b = setup();
  // Player 1's finger is down; player 2's finger lands on another control: the page now has two touches, each control has one.
  a.fire(a.surface, 'touchstart', { touches: [{}], targetTouches: [{}] });
  b.fire(b.surface, 'touchstart', { touches: [{}, {}], targetTouches: [{}] });
  assert.equal(a.count(), 1); assert.equal(b.count(), 1);
  // Two fingers on the SAME control (a pinch) still do not add a tap.
  a.fire(a.surface, 'touchstart', { touches: [{}, {}, {}], targetTouches: [{}, {}] });
  assert.equal(a.count(), 1);
});
