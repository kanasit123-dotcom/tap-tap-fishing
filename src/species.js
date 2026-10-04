export const SPECIES = [
  { id: 'goldfish', name: 'ปลาทอง', frame: 0, points: 5, taps: 6, lane: 0, speed: 32, width: 110 },
  { id: 'clownfish', name: 'ปลาการ์ตูน', frame: 1, points: 8, taps: 7, lane: 0, speed: 42, width: 120 },
  { id: 'bluefish', name: 'ปลาสีน้ำเงิน', frame: 2, points: 12, taps: 9, lane: 1, speed: 48, width: 128 },
  { id: 'angelfish', name: 'ปลาเทวดา', frame: 3, points: 15, taps: 10, lane: 1, speed: 55, width: 120 },
  { id: 'pufferfish', name: 'ปลาปักเป้า', frame: 4, points: 18, taps: 11, lane: 2, speed: 36, width: 116 },
  { id: 'turtle', name: 'เต่าทะเล', frame: 5, points: 22, taps: 12, lane: 2, speed: 25, width: 156 },
  { id: 'octopus', name: 'หมึกน้อย', frame: 6, points: 28, taps: 14, lane: 3, speed: 44, width: 142 },
  { id: 'chest', name: 'หีบสมบัติ', frame: 7, points: 40, taps: 16, lane: 4, speed: 17, width: 130 },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const LANES = [250, 320, 390, 455, 520];
