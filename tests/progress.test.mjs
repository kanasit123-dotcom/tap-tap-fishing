import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, freshProgress, loadProgress, saveProgress, recordCatch, recordTrip } from '../src/progress.js';

const memory = () => {
  const data = new Map([['little-exam-adventure-v1', 'unchanged'], ['lilly-world-v1', 'unchanged']]);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};
test('saves under a separate key and preserves the older games', () => {
  const s = memory(); const p = freshProgress(); recordCatch(p, 'turtle');
  assert.equal(saveProgress(s, p), true); assert.equal(loadProgress(s).collection.turtle, 1);
  assert.equal(s.data.get('little-exam-adventure-v1'), 'unchanged'); assert.equal(s.data.get('lilly-world-v1'), 'unchanged');
});
test('invalid saves, unknown versions and blocked storage recover without clearing data', () => {
  const s = memory(); s.setItem(STORAGE_KEY, '{'); assert.deepEqual(loadProgress(s), freshProgress());
  assert.equal(s.getItem(STORAGE_KEY), '{');
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 9 })); assert.deepEqual(loadProgress(s), freshProgress());
  assert.equal(saveProgress({ setItem: () => { throw new Error(); } }, freshProgress()), false);
});
test('counts and bests are sanitized, unknown creatures do not enter the book', () => {
  const s = memory(); s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, collection: { goldfish: -3, turtle: 2, whale: 200 }, best: { relaxed: 'bad', arcade: 10 }, trips: 2.5 }));
  const p = loadProgress(s); assert.equal(p.collection.goldfish, 0); assert.equal(p.collection.turtle, 2);
  assert.equal(p.collection.whale, undefined); assert.equal(p.best.relaxed, 0); assert.equal(p.trips, 0);
  recordCatch(p, 'bad'); assert.equal(p.collection.bad, undefined);
});
test('trip completion is idempotent and mode-specific', () => {
  const p = freshProgress(); const r = { phase: 'reeling', mode: 'arcade', score: 80 };
  assert.equal(recordTrip(p, r), false); r.phase = 'complete';
  assert.equal(recordTrip(p, r), true); assert.equal(recordTrip(p, r), false);
  assert.equal(p.trips, 1); assert.equal(p.best.arcade, 80); assert.equal(p.best.relaxed, 0);
});
test('music preference and map pieces persist and are sanitized', () => {
  const s = memory();
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, collection: { goldfish: 3 }, music: false, maps: 3 }));
  const p = loadProgress(s);
  assert.equal(p.music, false); assert.equal(p.maps, 3); assert.equal(p.sound, true); assert.equal(p.collection.goldfish, 3);
  assert.equal(p.collection.crab, 0, 'new creatures start at zero for old saves');
  for (const maps of [-1, 2.5, 'x', 9]) {
    s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, maps }));
    const loaded = loadProgress(s).maps;
    assert.ok(Number.isSafeInteger(loaded) && loaded >= 0 && loaded < 4);
  }
  assert.equal(freshProgress().music, true); assert.equal(freshProgress().maps, 0);
});
test('the pirate/rain turn persists as 0 or 1', () => {
  const s = memory();
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bonusTurn: 1 })); assert.equal(loadProgress(s).bonusTurn, 1);
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bonusTurn: 'x' })); assert.equal(loadProgress(s).bonusTurn, 0);
  assert.equal(freshProgress().bonusTurn, 0);
});
