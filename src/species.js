export const ATLASES = {
  creatures: { file: 'sea-creatures.png', width: 1536, height: 1024 },
  deep: { file: 'deep-creatures.png', width: 1254, height: 1254 },
};
export const LANES = [230, 291, 352, 413, 474, 535];
export const SWIM_LOOP = { left: -110, right: 590, width: 700 };

// Source rectangles isolate entire cutouts, including tails outside the old grid.
const catalog = [
  { id: 'goldfish', name: 'ปลาทอง', rect: [30, 123, 315, 277], points: 5, taps: 6, lane: 0, width: 54, height: 45 },
  { id: 'clownfish', name: 'ปลาการ์ตูน', rect: [396, 110, 356, 304], points: 8, taps: 7, lane: 0, width: 58, height: 48 },
  { id: 'bluefish', name: 'ปลาสีน้ำเงิน', rect: [778, 100, 367, 334], points: 12, taps: 9, lane: 1, width: 68, height: 52 },
  { id: 'angelfish', name: 'ปลาเทวดา', rect: [1180, 65, 345, 385], points: 15, taps: 10, lane: 1, width: 62, height: 52 },
  { id: 'pufferfish', name: 'ปลาปักเป้า', rect: [10, 565, 350, 350], points: 18, taps: 11, lane: 2, width: 64, height: 54 },
  { id: 'turtle', name: 'เต่าทะเล', rect: [365, 595, 399, 320], points: 22, taps: 12, lane: 2, width: 92, height: 55 },
  { id: 'octopus', name: 'หมึกน้อย', rect: [777, 560, 385, 382], points: 28, taps: 14, lane: 3, width: 76, height: 56 },
  { id: 'chest', name: 'หีบสมบัติ', rect: [1168, 610, 357, 308], points: 40, taps: 16, lane: 5, width: 90, height: 56 },
  { id: 'seal', name: 'แมวน้ำ', atlas: 'deep', rect: [76, 250, 463, 242], points: 26, taps: 13, lane: 3, width: 107, height: 56 },
  { id: 'shark', name: 'ฉลาม', atlas: 'deep', rect: [725, 198, 461, 313], points: 34, taps: 16, lane: 4, width: 130, height: 58 },
  { id: 'anglerfish', name: 'แองเกลอร์ฟิช', atlas: 'deep', rect: [101, 789, 429, 324], points: 38, taps: 17, lane: 4, width: 104, height: 58 },
  { id: 'giant-squid', name: 'หมึกยักษ์', atlas: 'deep', rect: [712, 818, 465, 264], points: 44, taps: 19, lane: 5, width: 112, height: 58 },
];
export const SPECIES = catalog.map((s) => {
  const scale = Math.min(s.width / s.rect[2], s.height / s.rect[3]);
  return { ...s, atlas: s.atlas ?? 'creatures', width: s.rect[2] * scale, height: s.rect[3] * scale,
    speed: [30, 36, 30, 25, 24, 18][s.lane] };
});
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const directionFor = (species) => species.lane % 2 ? -1 : 1;
export function wrapX(x) {
  return ((x - SWIM_LOOP.left) % SWIM_LOOP.width + SWIM_LOOP.width) % SWIM_LOOP.width + SWIM_LOOP.left;
}
export function spawnX(species) {
  const row = SPECIES.filter((s) => s.lane === species.lane);
  return wrapX(70 + species.lane * 37 + row.indexOf(species) * SWIM_LOOP.width / row.length);
}
