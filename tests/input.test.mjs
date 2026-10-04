import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTapControl } from '../src/input.js';

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
  assert.equal(s.fire(s.surface, 'touchstart', { touches: [{}] }).defaultPrevented, true);
  s.fire(s.button, 'pointerdown', { pointerType: 'touch', button: 0 });
  s.fire(s.surface, 'touchmove'); s.fire(s.surface, 'touchend');
  s.fire(s.button, 'pointerdown', { pointerType: 'mouse', button: 0 });
  s.fire(s.button, 'click', { detail: 1 }); s.fire(s.button, 'click', { detail: 0 });
  assert.equal(s.count(), 1);
});

test('stationary parent cancels Safari gestures even after the reel becomes disabled', () => {
  const s = setup(); s.button.disabled = true;
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
    assert.equal(s.fire(s.surface, type, { touches: [{}] }).defaultPrevented, true, type);
  }
  assert.equal(s.count(), 0);
});

test('each new single touch reels once; a second finger does not add a tap', () => {
  const s = setup();
  s.fire(s.surface, 'touchstart', { touches: [{}] });
  s.fire(s.surface, 'touchstart', { touches: [{}, {}] });
  s.fire(s.surface, 'touchend');
  s.fire(s.surface, 'touchstart', { touches: [{}] });
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
  assert.equal(s.fire(header, 'touchstart', { touches: [{}] }).defaultPrevented, false);
  assert.equal(s.fire(header, 'gesturestart').defaultPrevented, false);
});
