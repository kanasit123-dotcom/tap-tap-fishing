import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSION_COUNT, KINDS, dateKey, yesterdayKey, makeMissions, freshDaily, ensureToday, missionText, recordLanding, rewardPower, bumpStreak, shownStreak, REWARD_POWERS } from '../src/daily.js';
import { SPECIES, SPECIES_BY_ID } from '../src/species.js';
import { loadProgress, saveProgress, freshProgress, resetProgress, STORAGE_KEY } from '../src/progress.js';

const withArt = SPECIES.filter((s) => s.art);
const landing = (ids, extra = {}) => { const all = ids.map((id) => SPECIES_BY_ID[id]); return { all, species: all[0], points: all.reduce((n, s) => n + s.points, 0), feverStarted: false, ...extra }; };
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('dates are local calendar days and yesterday works across months and years', () => {
  assert.equal(dateKey(new Date(2026, 9, 6, 23, 59)), '2026-10-06');
  assert.equal(dateKey(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
  assert.equal(yesterdayKey('2026-10-06'), '2026-10-05'); assert.equal(yesterdayKey('2026-03-01'), '2026-02-28');
  assert.equal(yesterdayKey('2026-01-01'), '2025-12-31'); assert.equal(yesterdayKey('2024-03-01'), '2024-02-29');
});

test('a day gets three different missions, the same ones every time for that date, and other days differ', () => {
  const a = makeMissions('2026-10-06', withArt);
  assert.equal(a.length, MISSION_COUNT);
  assert.deepEqual(a, makeMissions('2026-10-06', withArt), 'the date decides');
  assert.equal(new Set(a.map((m) => m.kind)).size, MISSION_COUNT, 'three different kinds');
  assert.ok(a.filter((m) => ['count', 'score'].includes(m.kind)).length <= 1, 'at most one generic goal');
  for (const m of a) { assert.ok(m.goal >= 1 && m.progress === 0 && m.done === false); assert.ok(missionText(m, SPECIES_BY_ID).length > 4); }
  const kindsOverMonth = new Set(); const days = new Set();
  for (let d = 1; d <= 60; d++) { const key = dateKey(new Date(2026, 9, d)); const missions = makeMissions(key, withArt); assert.equal(missions.length, 3); days.add(JSON.stringify(missions)); missions.forEach((m) => kindsOverMonth.add(m.kind)); }
  assert.ok(days.size > 40, `${days.size} different days out of 60`);
  assert.ok(kindsOverMonth.size >= 6, [...kindsOverMonth].join());
});

test('missions only ask for what exists: no species mission without common creatures, no boss mission without a boss', () => {
  const noBoss = withArt.filter((s) => !s.boss);
  for (let d = 1; d <= 60; d++) assert.ok(!makeMissions(dateKey(new Date(2026, 9, d)), noBoss).some((m) => m.kind === 'boss'));
  for (let d = 1; d <= 60; d++) for (const m of makeMissions(dateKey(new Date(2026, 9, d)), withArt)) {
    if (m.kind === 'species') { const s = SPECIES_BY_ID[m.species]; assert.ok(s && s.art && s.kind === 'animal' && !s.boss && !s.special && s.lane <= 3, m.species); }
  }
  assert.equal(makeMissions('2026-10-06', []).length, 3, 'even a bare list still makes three simple missions');
});

test('a landing counts towards the right missions, a mission finishes once and rewards a power; all three give the day bonus', () => {
  const daily = { date: '2026-10-06', seen: false, allDone: false, missions: [
    { kind: 'species', species: 'goldfish', goal: 2, progress: 0, done: false },
    { kind: 'score', goal: 100, progress: 0, done: false },
    { kind: 'treasure', goal: 1, progress: 0, done: false },
  ] };
  let r = recordLanding(daily, landing(['goldfish']));
  assert.deepEqual(r, { done: [], all: false }); assert.equal(daily.missions[0].progress, 1); assert.equal(daily.missions[1].progress, 5);
  r = recordLanding(daily, landing(['goldfish', 'chest']));
  assert.equal(r.done.length, 2, 'the species mission and the treasure mission both finish with this landing');
  assert.equal(daily.missions[0].done, true); assert.equal(daily.missions[2].done, true, 'the chest is an item'); assert.equal(daily.missions[1].done, false);
  assert.equal(rewardPower(daily, daily.missions[0]), REWARD_POWERS[0]); assert.equal(rewardPower(daily, daily.missions[2]), REWARD_POWERS[2]);
  // Done missions never count again and never "finish" twice.
  assert.deepEqual(recordLanding(daily, landing(['goldfish'])).done, []);
  const last = recordLanding(daily, landing(['crown'], { points: 120 }));
  assert.equal(last.all, true); assert.equal(daily.allDone, true);
  assert.equal(recordLanding(daily, landing(['crown'])).all, false, 'the day bonus is given once');
});

test('every kind of mission can count its own thing (animals, deep animals, fever, maps, giants)', () => {
  const m = (kind, extra = {}) => ({ kind, goal: 9, progress: 0, done: false, ...extra });
  assert.equal(KINDS.count.count(m('count'), landing(['goldfish', 'boot', 'chest'])), 1, 'only animals');
  assert.equal(KINDS.deep.count(m('deep'), landing(['shark', 'goldfish', 'hammerhead'])), 2);
  assert.equal(KINDS.fever.count(m('fever'), landing(['goldfish'], { feverStarted: true })), 1);
  assert.equal(KINDS.fever.count(m('fever'), landing(['goldfish'])), 0);
  assert.equal(KINDS.map.count(m('map'), landing(['map', 'goldfish'])), 1);
  assert.equal(KINDS.boss.count(m('boss'), landing(['boss-whale'])), 1);
  assert.equal(KINDS.species.count(m('species', { species: 'goldfish' }), landing(['goldfish', 'goldfish'])), 2, 'a net can bring two at once');
});

test('missions stay for the day, change on a new day, and a streak grows only with consecutive days', () => {
  const day1 = freshDaily('2026-10-06', withArt);
  assert.equal(ensureToday(day1, '2026-10-06', withArt), day1);
  const day2 = ensureToday(day1, '2026-10-07', withArt);
  assert.notEqual(day2, day1); assert.equal(day2.date, '2026-10-07'); assert.equal(ensureToday(null, '2026-10-07', withArt).missions.length, 3);
  assert.equal(ensureToday({ date: '2026-10-07', missions: [] }, '2026-10-07', withArt).missions.length, 3, 'a broken day is made again');
  let streak = { days: 0, last: null };
  streak = bumpStreak(streak, '2026-10-06'); assert.deepEqual(streak, { days: 1, last: '2026-10-06' });
  assert.equal(bumpStreak(streak, '2026-10-06'), streak, 'twice the same day changes nothing');
  streak = bumpStreak(streak, '2026-10-07'); assert.equal(streak.days, 2);
  streak = bumpStreak(streak, '2026-10-09'); assert.equal(streak.days, 1, 'a missed day starts again');
  assert.equal(shownStreak({ days: 4, last: '2026-10-06' }, '2026-10-07'), 4); assert.equal(shownStreak({ days: 4, last: '2026-10-06' }, '2026-10-06'), 4);
  assert.equal(shownStreak({ days: 4, last: '2026-10-06' }, '2026-10-08'), 0, 'the streak ran out');
});

test('missions, stars, streak and the level are saved and loaded; damaged data means fresh ones', () => {
  const store = memory();
  const progress = freshProgress();
  progress.daily = freshDaily('2026-10-06', withArt); progress.daily.missions[0].progress = 1; progress.difficulty = 'hard'; progress.stars = 3; progress.streak = { days: 2, last: '2026-10-06' };
  assert.equal(saveProgress(store, progress), true);
  const loaded = loadProgress(store);
  assert.deepEqual(loaded.daily, progress.daily); assert.equal(loaded.difficulty, 'hard'); assert.equal(loaded.stars, 3); assert.deepEqual(loaded.streak, { days: 2, last: '2026-10-06' });
  const bad = (patch) => { const s = memory(); s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...patch })); return loadProgress(s); };
  assert.equal(bad({ daily: { date: '2026-10-06', missions: [{ kind: 'nonsense', goal: 2 }] } }).daily, null);
  assert.equal(bad({ daily: { date: 5, missions: [] } }).daily, null);
  assert.equal(bad({ daily: { date: '2026-10-06', missions: [{ kind: 'count', goal: -4 }] } }).daily, null);
  assert.equal(bad({ difficulty: 'impossible' }).difficulty, 'normal');
  assert.deepEqual(bad({ streak: { days: 'x', last: 'yesterday' } }).streak, { days: 0, last: null });
  assert.equal(bad({ stars: -3 }).stars, 0);
  const done = bad({ daily: { date: '2026-10-06', allDone: true, missions: [{ kind: 'count', goal: 5, progress: 2, done: true }] } });
  assert.equal(done.daily.missions[0].done, false, 'a mission cannot be done without its progress');
  assert.equal(done.daily.allDone, false);
});

test('reset all: a clean book, scores, looks, missions and trips; sound, music and the level stay', () => {
  const progress = freshProgress();
  Object.assign(progress, { collection: { goldfish: 4, turtle: 1 }, best: { relaxed: 300, arcade: 120 }, trips: 7, maps: 2, bonusTurn: 2, startPowers: { net: true }, looks: { rod: 'gold', hook: 'golden', boat: 'lanterns' },
    sound: false, music: false, difficulty: 'easy', stars: 5, streak: { days: 3, last: '2026-10-06' }, daily: freshDaily('2026-10-06', withArt) });
  const clean = resetProgress(progress);
  assert.deepEqual({ ...clean, sound: 0, music: 0, difficulty: 0 }, { ...freshProgress(), sound: 0, music: 0, difficulty: 0 });
  assert.equal(clean.sound, false); assert.equal(clean.music, false); assert.equal(clean.difficulty, 'easy');
  assert.notEqual(clean.collection, progress.collection); assert.equal(progress.collection.goldfish, 4, 'the old object is left alone');
  const store = memory(); saveProgress(store, clean);
  assert.equal(Object.values(loadProgress(store).collection).reduce((a, b) => a + b, 0), 0);
});
