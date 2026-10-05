// Trip-end lucky wheel, unlockable boat looks and the day/sunset/night cycle. Pure rules, no DOM or Phaser.

// Prizes in wheel order (clockwise from the top). Points go to the finished trip; the rest wait for the next trip.
export const WHEEL = [
  { id: 'p20', label: '+20', points: 20, weight: 3 },
  { id: 'net', label: 'แห', power: 'net', art: 'net', weight: 2 },
  { id: 'p50', label: '+50', points: 50, weight: 2 },
  { id: 'map', label: 'แผนที่', map: true, art: 'map', weight: 2 },
  { id: 'p100', label: '+100', points: 100, weight: 1 },
  { id: 'turbo', label: 'รอกเร็ว', power: 'turbo', art: 'turbo-reel', weight: 2 },
  { id: 'p30', label: '+30', points: 30, weight: 3 },
  { id: 'goldhook', label: 'ตะขอทอง', short: 'ตะขอ', power: 'goldhook', art: 'gold-hook', weight: 2 },
];

export function spinWheel(rng = Math.random) {
  const total = WHEEL.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < WHEEL.length; i++) if ((roll -= WHEEL[i].weight) < 0) return i;
  return WHEEL.length - 1;
}

// Applies a prize after the trip was recorded. Returns a short Thai message.
export function applyPrize(progress, round, prize) {
  if (prize.points) {
    round.score += prize.points;
    progress.best[round.mode] = Math.max(progress.best[round.mode], round.score);
    return `ได้ ${prize.points} คะแนน!`;
  }
  if (prize.map) {
    progress.maps = Math.min(3, progress.maps + 1);
    return 'ได้แผนที่สมบัติ 1 ชิ้น!';
  }
  progress.startPowers = { ...progress.startPowers, [prize.power]: true };
  return `ได้${prize.label} ใช้ได้ตอนออกเรือรอบหน้า!`;
}

// Boat looks unlocked by completing a book section (only creatures that have artwork count).
export const LOOKS = {
  rod: [
    { id: 'classic', name: 'คันเบ็ดดำ' },
    { id: 'bamboo', name: 'คันไม้ไผ่', zone: 'shallow' },
    { id: 'gold', name: 'คันเบ็ดทอง', zone: 'deep' },
  ],
  hook: [
    { id: 'steel', name: 'ตะขอเหล็ก' },
    { id: 'golden', name: 'ตะขอสีทอง', zone: 'treasure' },
  ],
  boat: [
    { id: 'plain', name: 'เรือเรียบๆ' },
    { id: 'pennants', name: 'ธงราว', zone: 'middle' },
    { id: 'lanterns', name: 'ตะเกียง', zone: 'seabed' },
  ],
};
export const defaultLooks = () => ({ rod: 'classic', hook: 'steel', boat: 'plain' });

export function zoneProgress(zone, species, collection) {
  const list = species.filter(zone.match);
  return { found: list.filter((s) => collection[s.id] > 0).length, total: list.length };
}

export function isUnlocked(look, zones, species, collection) {
  if (!look.zone) return true;
  const zone = zones.find((z) => z.id === look.zone);
  if (!zone) return false;
  const { found, total } = zoneProgress(zone, species, collection);
  return total > 0 && found === total;
}

export function sanitizeLooks(raw) {
  const looks = defaultLooks();
  for (const [part, options] of Object.entries(LOOKS)) if (options.some((o) => o.id === raw?.[part])) looks[part] = raw[part];
  return looks;
}

// Each finished trip moves the clock on: day, sunset, night, day ...
export const TIMES = ['day', 'sunset', 'night'];
export const timeOfDay = (trips) => TIMES[(Number.isSafeInteger(trips) && trips > 0 ? trips : 0) % TIMES.length];
export const TIME_NAMES = { day: 'กลางวัน', sunset: 'ยามเย็น', night: 'กลางคืน' };
