// Daily missions: three small goals that change every day (the date picks them, so a family sees the same three).
// Finishing one gives a power for the next trip; finishing all three gives a star and a map piece. Pure rules, no DOM.
export const MISSION_COUNT = 3;
export const REWARD_POWERS = ['net', 'turbo', 'goldhook'];   // mission 1, 2, 3 (then round again)

const pad = (n) => String(n).padStart(2, '0');
// Local calendar date, e.g. 2026-10-06.
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function yesterdayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const isAnimal = (s) => s.kind === 'animal';
// Each kind: how a mission of it is made (goal, text) and what in a landing counts towards it.
export const KINDS = {
  species: {
    make: (rng, pool) => { const s = pool.common[Math.floor(rng() * pool.common.length)]; return s && { species: s.id, goal: 2 + Math.floor(rng() * 2) }; },
    text: (m, byId) => `จับ${byId[m.species]?.name ?? 'ปลา'} ${m.goal} ตัว`,
    count: (m, landing) => landing.all.filter((s) => s.id === m.species).length,
  },
  count: {
    make: (rng) => ({ goal: 12 + 2 * Math.floor(rng() * 5) }),
    text: (m) => `จับสัตว์ทะเลให้ได้ ${m.goal} ตัว`,
    count: (m, landing) => landing.all.filter(isAnimal).length,
  },
  score: {
    make: (rng) => ({ goal: [200, 250, 300, 400][Math.floor(rng() * 4)] }),
    text: (m) => `ทำคะแนนให้ได้ ${m.goal} คะแนน`,
    count: (m, landing) => landing.points,
  },
  deep: {
    make: (rng, pool) => pool.deep && { goal: 3 + Math.floor(rng() * 2) },
    text: (m) => `จับสัตว์ทะเลลึก ${m.goal} ตัว`,
    count: (m, landing) => landing.all.filter((s) => isAnimal(s) && !s.boss && (s.lane === 4 || s.lane === 5)).length,
  },
  treasure: {
    make: (rng) => ({ goal: 2 + Math.floor(rng() * 2) }),
    text: (m) => `จับสมบัติหรือไอเทม ${m.goal} ชิ้น`,
    count: (m, landing) => landing.all.filter((s) => s.kind === 'item').length,
  },
  fever: {
    make: () => ({ goal: 1 }),
    text: () => 'จับติดกัน 3 ตัวจนเข้า FEVER 1 ครั้ง',
    count: (m, landing) => landing.feverStarted ? 1 : 0,
  },
  map: {
    make: (rng) => ({ goal: 1 + Math.floor(rng() * 2) }),
    text: (m) => `เก็บแผนที่สมบัติ ${m.goal} ชิ้น`,
    count: (m, landing) => landing.all.filter((s) => s.effect === 'map').length,
  },
  boss: {
    make: (rng, pool) => pool.boss && { goal: 1 },
    text: () => 'จับปลายักษ์ 1 ตัว',
    count: (m, landing) => landing.all.filter((s) => s.boss).length,
  },
};
// Two "generic" kinds never come together; a day of three small mixed goals is nicer.
const GENERIC = ['count', 'score'];

// species: the creatures that can appear (with artwork). Returns three missions for that date.
export function makeMissions(key, species) {
  const rng = seeded(hash(key));
  const pool = {
    common: species.filter((s) => isAnimal(s) && !s.boss && !s.special && s.lane <= 3 && s.weight >= 12 && !s.arcadeOnly),
    deep: species.some((s) => isAnimal(s) && !s.boss && (s.lane === 4 || s.lane === 5)),
    boss: species.some((s) => s.boss),
  };
  const order = Object.keys(KINDS).map((kind) => ({ kind, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.kind);
  const missions = [];
  let generic = 0;
  for (const kind of order) {
    if (missions.length === MISSION_COUNT) break;
    if (GENERIC.includes(kind) && generic) continue;
    const made = KINDS[kind].make(rng, pool);
    if (!made) continue;
    if (GENERIC.includes(kind)) generic++;
    missions.push({ kind, ...made, progress: 0, done: false });
  }
  return missions;
}

export const freshDaily = (key, species) => ({ date: key, missions: makeMissions(key, species), seen: false, allDone: false });

// Today's missions: kept while the date is the same, made again on a new day.
export function ensureToday(daily, key, species) {
  return daily?.date === key && daily.missions?.length ? daily : freshDaily(key, species);
}

export const missionText = (mission, byId) => (KINDS[mission.kind]?.text(mission, byId) ?? '');

// A landing counts towards the missions. Returns { done: [missions finished by this landing], all: true when this finished the last one }.
export function recordLanding(daily, landing) {
  const done = [];
  for (const mission of daily.missions) {
    if (mission.done) continue;
    mission.progress = Math.min(mission.goal, mission.progress + (KINDS[mission.kind]?.count(mission, landing) ?? 0));
    if (mission.progress >= mission.goal) { mission.done = true; done.push(mission); }
  }
  const all = !daily.allDone && daily.missions.every((m) => m.done);
  if (all) daily.allDone = true;
  return { done, all };
}

// Power for the next trip given for finishing a mission (by its place in the day).
export const rewardPower = (daily, mission) => REWARD_POWERS[daily.missions.indexOf(mission) % REWARD_POWERS.length];

// Streak of days with all missions done. Call when a day's missions are all done; today may be called twice safely.
export function bumpStreak(streak, key) {
  if (streak.last === key) return streak;
  const days = streak.last === yesterdayKey(key) ? streak.days + 1 : 1;
  return { days, last: key };
}
// What to show: a streak that was not continued yesterday or today is over.
export const shownStreak = (streak, key) => streak.last === key || streak.last === yesterdayKey(key) ? streak.days : 0;
